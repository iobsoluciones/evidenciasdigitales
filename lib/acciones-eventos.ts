'use server';

/**
 * EVENTOS — accidentes, incidentes y enfermedades laborales
 * ---------------------------------------------------------------
 * Resolución 1401 de 2007 y Decreto 1072 art. 2.2.4.6.32: todo
 * accidente se investiga dentro de los 15 días siguientes, con un
 * equipo que incluya al responsable con licencia y a un representante
 * del COPASST. El reporte a ARL y EPS vence a los 2 días hábiles.
 *
 * El HECHO y el ANÁLISIS están separados a propósito: el reporte se
 * hace el mismo día, con prisa y con lo mínimo; la investigación viene
 * después. Pedirlo todo junto es lo que hace que nadie registre nada.
 *
 * El plazo de 15 días se calcula al leer, nunca se almacena: así no
 * queda un estado obsoleto en la base.
 */
import { revalidatePath } from 'next/cache';
import { crearClienteServidor } from './supabase/servidor';
import { empresaActiva } from './empresa-activa';
import { urlBase } from './url-base';

export type TipoEvento = 'accidente' | 'incidente' | 'casi_accidente' | 'enfermedad';
export type RolEquipo = 'responsable_sst' | 'copasst' | 'jefe_inmediato' | 'otro';
export type Metodologia = '5_porques' | 'arbol_causas' | 'espina_pescado';

/** Causa con su clasificación. Las básicas son las que generan acciones. */
export type Causa = { descripcion: string; clase: string };

export type EventoLista = {
  id: string;
  codigo: string;
  tipo: TipoEvento;
  estado: 'abierto' | 'en_investigacion' | 'cerrado';
  nombres: string | null;
  identificacion: string | null;
  area: string | null;
  fecha_evento: string;
  descripcion: string;
  lugar: string | null;
  dias_incapacidad: number;
  grave: boolean;
  mortal: boolean;
  reportado_arl: boolean;
  fecha_reporte_arl: string | null;
  fecha_cierre: string | null;
  /** Días que faltan del plazo legal. Negativo = vencido. null = ya cerrada. */
  dias_restantes: number | null;
  investigacion_vencida: boolean;
  causas_basicas: number;
  acciones: number;
};

export type DetalleEvento = {
  ok: boolean;
  error?: string;
  evento?: Record<string, unknown>;
  investigacion?: Record<string, unknown>;
  equipo?: Array<{
    id: string; nombre: string; cargo: string | null; rol: RolEquipo;
    correo: string | null; firma_url: string | null; firmado_en: string | null;
    enlace_activo: boolean;
  }>;
  testigos?: Array<{ id: string; nombre: string; identificacion: string | null; version: string | null }>;
  acciones?: Array<{ id: string; codigo: string; accion: string; responsable: string; fecha_limite: string; estado: string }>;
  empresa?: Record<string, unknown>;
};

export type Resultado = {
  ok: boolean; mensaje: string; id?: string; codigo?: string;
  /** Enlace de firma. Se devuelve aunque el correo falle: el enlace es
   *  el entregable y el correo solo un canal. */
  enlace?: string;
};

export async function listarEventos(): Promise<EventoLista[]> {
  const empresa = await empresaActiva();
  if (!empresa) return [];

  const supabase = await crearClienteServidor();
  const { data } = await supabase.rpc('listar_eventos', { p_empresa: empresa.id });
  return (data ?? []) as EventoLista[];
}

export async function obtenerEvento(id: string): Promise<DetalleEvento> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc('detalle_evento', { p_evento: id });
  if (error) return { ok: false, error: error.message };
  return (data ?? { ok: false, error: 'Evento no encontrado.' }) as DetalleEvento;
}

/** Reporte rápido: lo mínimo para dejar constancia el mismo día. */
export async function crearEvento(datos: {
  tipo: TipoEvento;
  empleadoId: string | null;
  fecha: string;
  descripcion: string;
  lugar: string;
  parteCuerpo: string;
  mecanismo: string;
  grave: boolean;
  mortal: boolean;
}): Promise<Resultado> {
  const empresa = await empresaActiva();
  if (!empresa) return { ok: false, mensaje: 'No hay empresa seleccionada.' };
  if (!datos.descripcion?.trim()) return { ok: false, mensaje: 'Describe lo que ocurrió.' };
  if (!datos.fecha) return { ok: false, mensaje: 'Indica la fecha y hora del evento.' };

  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc('crear_evento', {
    p_empresa: empresa.id,
    p_tipo: datos.tipo,
    p_empleado: datos.empleadoId || null,
    p_fecha: new Date(datos.fecha).toISOString(),
    p_descripcion: datos.descripcion,
    p_lugar: datos.lugar || null,
    p_parte_cuerpo: datos.parteCuerpo || null,
    p_mecanismo: datos.mecanismo || null,
    p_grave: datos.grave,
    p_mortal: datos.mortal,
  });

  if (error) return { ok: false, mensaje: error.message };
  const r = data as { ok: boolean; error?: string; id?: string; codigo?: string };
  if (!r.ok) return { ok: false, mensaje: r.error ?? 'No se pudo registrar el evento.' };

  revalidatePath('/panel/eventos');
  return { ok: true, mensaje: `Evento ${r.codigo} registrado.`, id: r.id, codigo: r.codigo };
}

/** Días de incapacidad y reporte a la ARL: se conocen después del hecho. */
export async function actualizarEvento(
  id: string,
  datos: {
    diasIncapacidad?: number;
    reportadoArl?: boolean;
    fechaReporteArl?: string | null;
    numeroFurat?: string;
  }
): Promise<Resultado> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc('actualizar_evento', {
    p_evento: id,
    p_dias_incapacidad: datos.diasIncapacidad ?? null,
    p_reportado_arl: datos.reportadoArl ?? null,
    p_fecha_reporte_arl: datos.fechaReporteArl ? new Date(datos.fechaReporteArl).toISOString() : null,
    p_numero_furat: datos.numeroFurat ?? null,
  });

  if (error) return { ok: false, mensaje: error.message };
  const r = data as { ok: boolean; error?: string };
  if (!r.ok) return { ok: false, mensaje: r.error ?? 'No se pudo actualizar.' };

  revalidatePath(`/panel/eventos/${id}`);
  revalidatePath('/panel/eventos');
  return { ok: true, mensaje: 'Datos actualizados.' };
}

export async function guardarInvestigacion(
  id: string,
  datos: {
    metodologia: Metodologia;
    causasInmediatas: Causa[];
    causasBasicas: Causa[];
    conclusiones: string;
  }
): Promise<Resultado> {
  const supabase = await crearClienteServidor();
  const limpiar = (cs: Causa[]) =>
    (cs ?? []).filter((c) => c?.descripcion?.trim()).map((c) => ({
      descripcion: c.descripcion.trim(),
      clase: c.clase || 'otro',
    }));

  const { data, error } = await supabase.rpc('guardar_investigacion', {
    p_evento: id,
    p_metodologia: datos.metodologia,
    p_causas_inmediatas: limpiar(datos.causasInmediatas),
    p_causas_basicas: limpiar(datos.causasBasicas),
    p_conclusiones: datos.conclusiones || null,
  });

  if (error) return { ok: false, mensaje: error.message };
  const r = data as { ok: boolean; error?: string };
  if (!r.ok) return { ok: false, mensaje: r.error ?? 'No se pudo guardar.' };

  revalidatePath(`/panel/eventos/${id}`);
  return { ok: true, mensaje: 'Investigación guardada.' };
}

export type EnlaceMiembro = {
  nombre: string;
  correo: string | null;
  enlace: string;
  enviado: boolean;
  detalle: string;
};

export type ResultadoEquipo = Resultado & { enlaces?: EnlaceMiembro[] };

/**
 * Guarda el equipo y, en el mismo paso, genera y envía el enlace de
 * firma a quien todavía no ha firmado.
 *
 * Va junto al guardado y no en un botón aparte porque son el mismo
 * acto: registrar a alguien en el equipo investigador ES pedirle que
 * firme. Un botón separado se olvida.
 *
 * NO se puede borrar e insertar el equipo: eso destruiría las firmas ya
 * capturadas y, peor, invalidaría los enlaces ya enviados. Se actualiza
 * por id, se insertan los nuevos y solo se borran los que se quitaron.
 *
 * Los enlaces se devuelven SIEMPRE, haya o no correo y llegue o no el
 * mensaje: el enlace es el entregable, el correo es solo un canal.
 */
export async function guardarEquipo(
  eventoId: string,
  miembros: Array<{
    id?: string; nombre: string; cargo: string; rol: RolEquipo; correo: string;
  }>
): Promise<ResultadoEquipo> {
  const empresa = await empresaActiva();
  if (!empresa) return { ok: false, mensaje: 'No hay empresa seleccionada.' };

  const supabase = await crearClienteServidor();
  const validos = miembros.filter((m) => m.nombre?.trim());

  const campos = (m: (typeof validos)[number]) => ({
    nombre: m.nombre.trim().toUpperCase(),
    cargo: m.cargo?.trim() || null,
    rol: m.rol,
    correo: m.correo?.trim().toLowerCase() || null,
  });

  // 1. Los que se quitaron de la lista
  const conservar = validos.map((m) => m.id).filter(Boolean) as string[];
  let borrar = supabase.from('evento_equipo').delete().eq('evento_id', eventoId);
  if (conservar.length > 0) borrar = borrar.not('id', 'in', `(${conservar.join(',')})`);
  const { error: errBorrar } = await borrar;
  if (errBorrar) return { ok: false, mensaje: errBorrar.message };

  // 2. Los que ya existían: se actualizan sin tocar firma ni token
  for (const m of validos.filter((x) => x.id)) {
    const { error } = await supabase
      .from('evento_equipo')
      .update(campos(m))
      .eq('id', m.id!);
    if (error) return { ok: false, mensaje: error.message };
  }

  // 3. Los nuevos
  const nuevos = validos.filter((x) => !x.id).map((m) => ({
    evento_id: eventoId,
    org_id: empresa.org_id,
    ...campos(m),
  }));
  if (nuevos.length > 0) {
    const { error } = await supabase.from('evento_equipo').insert(nuevos);
    if (error) return { ok: false, mensaje: error.message };
  }

  // 4. Enlace de firma para quien aún no firmó
  const { data: actuales } = await supabase
    .from('evento_equipo')
    .select('id, nombre, correo, firma_url')
    .eq('evento_id', eventoId)
    .is('firma_url', null);

  const enlaces: EnlaceMiembro[] = [];
  for (const m of actuales ?? []) {
    const r = await enviarEnlaceFirma(m.id as string, eventoId);
    enlaces.push({
      nombre: String(m.nombre),
      correo: (m.correo as string) ?? null,
      enlace: r.enlace ?? '',
      enviado: r.ok,
      detalle: r.mensaje,
    });
  }

  revalidatePath(`/panel/eventos/${eventoId}`);

  const enviados = enlaces.filter((e) => e.enviado).length;
  const mensaje = enlaces.length === 0
    ? 'Equipo guardado. Todos los integrantes ya firmaron.'
    : enviados === enlaces.length
      ? `Equipo guardado y ${enviados} enlace(s) de firma enviado(s).`
      : `Equipo guardado. ${enviados} de ${enlaces.length} enlaces se enviaron por correo; copia los demás a mano.`;

  return { ok: true, mensaje, enlaces };
}

export async function guardarTestigos(
  eventoId: string,
  testigos: Array<{ nombre: string; identificacion: string; version: string }>
): Promise<Resultado> {
  const empresa = await empresaActiva();
  if (!empresa) return { ok: false, mensaje: 'No hay empresa seleccionada.' };

  const supabase = await crearClienteServidor();
  const { error: errBorrar } = await supabase
    .from('evento_testigos')
    .delete()
    .eq('evento_id', eventoId);
  if (errBorrar) return { ok: false, mensaje: errBorrar.message };

  const filas = testigos
    .filter((t) => t.nombre?.trim())
    .map((t) => ({
      evento_id: eventoId,
      org_id: empresa.org_id,
      nombre: t.nombre.trim().toUpperCase(),
      identificacion: t.identificacion?.trim() || null,
      version: t.version?.trim() || null,
    }));

  if (filas.length > 0) {
    const { error } = await supabase.from('evento_testigos').insert(filas);
    if (error) return { ok: false, mensaje: error.message };
  }

  revalidatePath(`/panel/eventos/${eventoId}`);
  return { ok: true, mensaje: 'Testigos guardados.' };
}

/**
 * Cerrar exige al menos una causa básica y la firma del responsable del
 * SG-SST. Lo valida la base, no solo la interfaz: es lo único que
 * impide saltárselo.
 */
export async function cerrarInvestigacion(
  id: string,
  conclusiones: string
): Promise<Resultado> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc('cerrar_investigacion', {
    p_evento: id,
    p_conclusiones: conclusiones || null,
  });

  if (error) return { ok: false, mensaje: error.message };
  const r = data as { ok: boolean; error?: string };
  if (!r.ok) return { ok: false, mensaje: r.error ?? 'No se pudo cerrar.' };

  revalidatePath(`/panel/eventos/${id}`);
  revalidatePath('/panel/eventos');
  return { ok: true, mensaje: 'Investigación cerrada.' };
}

/** Una acción por causa básica, en el plan de acción que ya existe. */
export async function generarAccionesEvento(
  id: string,
  responsable: string,
  diasPlazo = 30
): Promise<Resultado> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc('generar_acciones_evento', {
    p_evento: id,
    p_responsable: responsable || null,
    p_dias_plazo: diasPlazo,
  });

  if (error) return { ok: false, mensaje: error.message };
  const r = data as { ok: boolean; error?: string; creadas?: number };
  if (!r.ok) return { ok: false, mensaje: r.error ?? 'No se pudieron generar las acciones.' };

  revalidatePath(`/panel/eventos/${id}`);
  revalidatePath('/panel/acciones');
  return {
    ok: true,
    mensaje: r.creadas
      ? `${r.creadas} acción(es) creada(s) en el plan de acción.`
      : 'No había causas nuevas: no se creó ninguna acción.',
  };
}

/**
 * ENLACE DE FIRMA REMOTA
 * ---------------------------------------------------------------
 * El responsable del SG-SST, el representante del COPASST y el jefe
 * inmediato casi nunca están en el mismo sitio, y menos el mismo día.
 * Exigir que firmen los tres en una pantalla es la razón por la que
 * una investigación se queda sin cerrar.
 *
 * El correo lleva una descripción BREVE del evento: quien firma tiene
 * que saber qué está firmando antes de abrir el enlace.
 */
export async function enviarEnlaceFirma(
  miembroId: string,
  eventoId: string
): Promise<Resultado> {
  const supabase = await crearClienteServidor();

  const { data: miembro, error: errM } = await supabase
    .from('evento_equipo')
    .select('nombre, correo, rol, firma_url')
    .eq('id', miembroId)
    .maybeSingle();

  if (errM) return { ok: false, mensaje: errM.message };
  if (!miembro) return { ok: false, mensaje: 'Integrante no encontrado.' };
  if (miembro.firma_url) return { ok: false, mensaje: 'Este integrante ya firmó.' };

  // El enlace se genera aunque no haya correo: sirve para enviarlo por
  // WhatsApp, que es como se resuelve en obra la mitad de las veces.
  const { data, error } = await supabase.rpc('generar_token_firma_evento', {
    p_miembro: miembroId,
  });
  if (error) return { ok: false, mensaje: error.message };

  const t = data as { ok: boolean; error?: string; token?: string };
  if (!t.ok || !t.token) return { ok: false, mensaje: t.error ?? 'No se pudo generar el enlace.' };

  const enlaceFirma = `${await urlBase()}/i/${t.token}`;

  if (!miembro.correo) {
    return {
      ok: false,
      enlace: enlaceFirma,
      mensaje: 'Sin correo registrado: copia el enlace y envíalo por otro medio.',
    };
  }

  const detalle = await obtenerEvento(eventoId);
  const ev = (detalle.evento ?? {}) as Record<string, unknown>;
  const empresa = (detalle.empresa ?? {}) as Record<string, unknown>;

  const enlace = enlaceFirma;

  const fecha = ev.fecha_evento
    ? new Date(String(ev.fecha_evento)).toLocaleString('es-CO', { dateStyle: 'long', timeStyle: 'short' })
    : '';

  const esc = (v: unknown) =>
    String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const { enviarCorreo } = await import('./correo');
  const envio = await enviarCorreo({
    para: miembro.correo,
    asunto: `Firma requerida — investigación ${esc(ev.codigo)}`,
    html: `
<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#14263F;max-width:560px;">
  <p>Buen día, ${esc(miembro.nombre)}.</p>
  <p>
    Usted hace parte del equipo que investiga el siguiente evento en
    <strong>${esc(empresa.nombre)}</strong>. Se requiere su firma para cerrar la
    investigación dentro del plazo legal de 15 días.
  </p>

  <table style="width:100%;border-collapse:collapse;background:#F7F7F4;border:1px solid #E4E4DF;margin:16px 0;">
    <tr><td style="padding:8px 12px;color:#5B6470;width:120px;">Consecutivo</td>
        <td style="padding:8px 12px;"><strong>${esc(ev.codigo)}</strong></td></tr>
    <tr><td style="padding:8px 12px;color:#5B6470;">Fecha</td>
        <td style="padding:8px 12px;">${esc(fecha)}</td></tr>
    ${ev.lugar ? `<tr><td style="padding:8px 12px;color:#5B6470;">Lugar</td>
        <td style="padding:8px 12px;">${esc(ev.lugar)}</td></tr>` : ''}
    ${ev.nombres ? `<tr><td style="padding:8px 12px;color:#5B6470;">Trabajador</td>
        <td style="padding:8px 12px;">${esc(ev.nombres)}</td></tr>` : ''}
  </table>

  <p style="background:#fff;border-left:3px solid #14263F;padding:10px 14px;color:#374151;">
    ${esc(ev.descripcion)}
  </p>

  <p style="margin:24px 0;">
    <a href="${enlace}"
       style="background:#14263F;color:#fff;padding:12px 26px;border-radius:8px;
              text-decoration:none;font-weight:600;display:inline-block;">
      Revisar y firmar
    </a>
  </p>

  <p style="font-size:11px;color:#8A929C;border-top:1px solid #E4E4DF;padding-top:12px;">
    El enlace es personal y deja de funcionar apenas usted firme.
    Si no reconoce este evento, ignore este mensaje.
  </p>
</div>`.trim(),
    registro: { tipo: 'otro' },
  });

  if (!envio.ok) return { ok: false, enlace, mensaje: envio.mensaje };

  revalidatePath(`/panel/eventos/${eventoId}`);
  return { ok: true, enlace, mensaje: `Enlace enviado a ${miembro.correo}.` };
}

/** Para copiar el enlace a mano cuando no hay correo (WhatsApp). */
export async function obtenerEnlaceFirma(miembroId: string): Promise<Resultado> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc('generar_token_firma_evento', {
    p_miembro: miembroId,
  });
  if (error) return { ok: false, mensaje: error.message };

  const t = data as { ok: boolean; error?: string; token?: string };
  if (!t.ok || !t.token) return { ok: false, mensaje: t.error ?? 'No se pudo generar el enlace.' };

  const url = `${await urlBase()}/i/${t.token}`;
  return { ok: true, mensaje: url, enlace: url };
}
