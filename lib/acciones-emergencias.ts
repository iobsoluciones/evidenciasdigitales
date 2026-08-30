'use server';

/**
 * EMERGENCIAS — análisis de amenazas y simulacros
 * ---------------------------------------------------------------
 * Estándares 5.1.1 y 5.1.2 · Dec. 1072 de 2015, art. 2.2.4.6.25.
 *
 * El análisis usa la METODOLOGÍA DE COLORES (guía FOPAE, Res. 004/09),
 * que es la que espera ver un auditor en Colombia. Su trampa está en la
 * escala: el número mide la VULNERABILIDAD, no el control. «Sí, existe»
 * puntúa 0.0 y «No existe» puntúa 1.0, así que la suma se lee
 * 0.0-1.0 baja (verde) · 1.1-2.0 media (amarillo) · 2.1-3.0 alta (rojo).
 * Invertirlo pintaría de verde justo lo que está mal, y por eso la
 * pantalla dice el valor de cada opción en voz alta.
 *
 * El simulacro es la evidencia: sin acta firmada, tener el plan escrito
 * no prueba nada. Las firmas se piden por enlace (regla §5.21), porque
 * los evaluadores están repartidos y uno suele ser el asesor de la ARL.
 */
import { revalidatePath } from 'next/cache';
import { crearClienteServidor } from './supabase/servidor';
import { empresaActiva } from './empresa-activa';
import { urlBase } from './url-base';

export type Origen = 'natural' | 'tecnologico' | 'social';
export type Fuente = 'interna' | 'externa';
export type Calificacion = 'posible' | 'probable' | 'inminente';
export type Color = 'verde' | 'amarillo' | 'rojo';
export type Nivel = 'bajo' | 'medio' | 'alto';

export type Amenaza = {
  id: string;
  amenaza: string;
  origen: Origen;
  fuente: Fuente;
  descripcion: string | null;
  calificacion: Calificacion;
  p_organizacion: number; p_capacitacion: number; p_dotacion: number;
  r_materiales: number; r_edificacion: number; r_equipos: number;
  s_servicios: number; s_alternos: number; s_recuperacion: number;
  observaciones: string | null;
  orden: number;
  evaluada: boolean;
  v_personas: number; v_recursos: number; v_sistemas: number;
  rombos_rojos: number; rombos_amarillos: number;
  nivel_riesgo: Nivel | null;
  color_amenaza: Color; color_personas: Color;
  color_recursos: Color; color_sistemas: Color;
};

export type ResumenAmenazas = {
  total: number; sin_evaluar: number;
  alto: number; medio: number; bajo: number;
};

export type TipoSimulacro =
  | 'evacuacion' | 'incendio' | 'sismo' | 'primeros_auxilios' | 'derrame' | 'otro';

export type RolEvaluador =
  | 'coordinador' | 'evaluador' | 'brigadista' | 'observador_arl';

export type Evaluador = {
  id: string;
  empleado_id: string | null;
  nombre: string;
  cargo: string | null;
  correo: string | null;
  rol: RolEvaluador;
  firmado: boolean;
  firma_url: string | null;
  firmado_en: string | null;
  tiene_token: boolean;
};

export type SimulacroResumen = {
  id: string; codigo: string; fecha: string; tipo: TipoSimulacro;
  estado: 'borrador' | 'cerrado';
  participantes: number; evacuados: number;
  tiempo_evacuacion_seg: number | null;
  evaluadores: number; sin_firmar: number;
};

export type Simulacro = {
  id: string; codigo: string; fecha: string; tipo: TipoSimulacro;
  amenaza_id: string | null;
  alcance: string | null; punto_encuentro: string | null;
  hora_inicio: string | null; tiempo_evacuacion_seg: number | null;
  participantes: number; evacuados: number;
  aciertos: string | null; oportunidades: string | null; observaciones: string | null;
  estado: 'borrador' | 'cerrado'; fecha_cierre: string | null;
  nomenclatura: string | null; version_doc: string | null; titulo_doc: string | null;
};

export type Res = { ok: boolean; mensaje: string; id?: string; enlace?: string };

/* ================================================================
   Amenazas
   ================================================================ */

export async function listarAmenazas(): Promise<{
  items: Amenaza[]; resumen: ResumenAmenazas;
}> {
  const vacio = { total: 0, sin_evaluar: 0, alto: 0, medio: 0, bajo: 0 };
  const empresa = await empresaActiva();
  if (!empresa) return { items: [], resumen: vacio };

  const supabase = await crearClienteServidor();
  const { data } = await supabase.rpc('listar_amenazas', { p_empresa: empresa.id });
  const d = (data ?? {}) as { items?: Amenaza[]; resumen?: ResumenAmenazas };
  return { items: d.items ?? [], resumen: d.resumen ?? vacio };
}

export async function sembrarAmenazas(): Promise<Res> {
  const empresa = await empresaActiva();
  if (!empresa) return { ok: false, mensaje: 'No hay empresa seleccionada.' };

  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc('sembrar_amenazas', { p_empresa: empresa.id });
  if (error) return { ok: false, mensaje: error.message };

  const r = data as { ok: boolean; error?: string; creadas?: number };
  if (!r.ok) return { ok: false, mensaje: r.error ?? 'No se pudo sembrar.' };

  revalidatePath('/panel/emergencias');
  revalidatePath('/panel');
  return {
    ok: true,
    mensaje: r.creadas
      ? `${r.creadas} amenaza(s) agregadas. Ahora califícalas una a una.`
      : 'Ya estaban todas las amenazas de la lista.',
  };
}

export async function guardarAmenaza(datos: {
  id?: string;
  amenaza: string; origen: Origen; fuente: Fuente;
  descripcion: string; calificacion: Calificacion;
  personas: number[]; recursos: number[]; sistemas: number[];
  observaciones: string;
}): Promise<Res> {
  const empresa = await empresaActiva();
  if (!empresa) return { ok: false, mensaje: 'No hay empresa seleccionada.' };

  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc('guardar_amenaza', {
    p_empresa: empresa.id,
    p_amenaza: datos.amenaza,
    p_origen: datos.origen,
    p_fuente: datos.fuente,
    p_descripcion: datos.descripcion || null,
    p_calificacion: datos.calificacion,
    p_personas: datos.personas,
    p_recursos: datos.recursos,
    p_sistemas: datos.sistemas,
    p_observaciones: datos.observaciones || null,
    p_id: datos.id ?? null,
  });
  if (error) return { ok: false, mensaje: error.message };

  const r = data as { ok: boolean; error?: string; id?: string };
  if (!r.ok) return { ok: false, mensaje: r.error ?? 'No se pudo guardar.' };

  revalidatePath('/panel/emergencias');
  revalidatePath('/panel');
  return { ok: true, mensaje: 'Amenaza calificada.', id: r.id };
}

export async function eliminarAmenaza(id: string): Promise<Res> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc('eliminar_amenaza', { p_id: id });
  if (error) return { ok: false, mensaje: error.message };

  const r = data as { ok: boolean; error?: string };
  if (!r.ok) return { ok: false, mensaje: r.error ?? 'No se pudo eliminar.' };

  revalidatePath('/panel/emergencias');
  return { ok: true, mensaje: 'Amenaza eliminada.' };
}

/** Envía el análisis por correo con el PDF adjunto. */
export async function enviarAnalisisAmenazas(
  destinatarios: string, mensaje: string
): Promise<Res> {
  const empresa = await empresaActiva();
  if (!empresa) return { ok: false, mensaje: 'No hay empresa seleccionada.' };

  const lista = destinatarios.split(/[,;\n]+/).map((c) => c.trim()).filter(Boolean);
  if (lista.length === 0) return { ok: false, mensaje: 'Indica al menos un correo.' };

  const invalidos = lista.filter((c) => !/^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]{2,}$/.test(c));
  if (invalidos.length > 0) {
    return { ok: false, mensaje: `Correo(s) inválido(s): ${invalidos.join(', ')}` };
  }

  const { generarAnalisisAmenazas } = await import('./pdf/generarAnalisisAmenazas');
  const pdf = await generarAnalisisAmenazas(empresa.id);
  if (!pdf.ok) return { ok: false, mensaje: pdf.error };

  const { enviarCorreo } = await import('./correo');
  const extra = mensaje.trim()
    ? `<p style="background:#F7F7F4;border-left:3px solid #14263F;padding:10px 14px;color:#374151;margin:16px 0;">
         ${mensaje.replace(/</g, '&lt;').replace(/\n/g, '<br>')}
       </p>` : '';

  const envio = await enviarCorreo({
    para: lista.join(','),
    asunto: `${pdf.titulo} — ${pdf.empresa}`,
    html: `
<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#14263F;max-width:560px;">
  <h2 style="margin-bottom:4px;">${pdf.titulo}</h2>
  <p style="color:#5B6470;margin-top:0;">${pdf.empresa}</p>
  ${extra}
  <p>Adjunto el análisis de amenazas y vulnerabilidad por la metodología de
     colores, con el nivel de riesgo de cada amenaza.</p>
  <p style="font-size:11px;color:#8A929C;margin-top:24px;border-top:1px solid #E4E4DF;padding-top:12px;">
    Es el anexo técnico del plan de prevención, preparación y respuesta ante
    emergencias (estándar 5.1.1).
  </p>
</div>`.trim(),
    adjuntos: [{ filename: pdf.nombreArchivo, content: pdf.buffer }],
    registro: { tipo: 'otro' },
  });

  if (!envio.ok) return { ok: false, mensaje: envio.mensaje };
  return { ok: true, mensaje: `Análisis enviado a ${lista.length} destinatario(s).` };
}

/* ================================================================
   Simulacros
   ================================================================ */

export async function listarSimulacros(): Promise<SimulacroResumen[]> {
  const empresa = await empresaActiva();
  if (!empresa) return [];

  const supabase = await crearClienteServidor();
  const { data } = await supabase.rpc('listar_simulacros', { p_empresa: empresa.id });
  return (data ?? []) as SimulacroResumen[];
}

export async function obtenerSimulacro(id: string): Promise<{
  ok: boolean; error?: string;
  simulacro?: Simulacro; amenaza?: string | null;
  evaluadores?: Evaluador[]; empresa?: Record<string, unknown>;
}> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc('detalle_simulacro', { p_id: id });
  if (error) return { ok: false, error: error.message };
  return (data ?? { ok: false, error: 'No encontrado.' }) as {
    ok: boolean; error?: string;
    simulacro?: Simulacro; amenaza?: string | null;
    evaluadores?: Evaluador[]; empresa?: Record<string, unknown>;
  };
}

export async function crearSimulacro(
  fecha: string, tipo: TipoSimulacro, amenazaId: string
): Promise<Res> {
  const empresa = await empresaActiva();
  if (!empresa) return { ok: false, mensaje: 'No hay empresa seleccionada.' };
  if (!fecha) return { ok: false, mensaje: 'Indica la fecha del simulacro.' };

  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc('crear_simulacro', {
    p_empresa: empresa.id, p_fecha: fecha, p_tipo: tipo,
    p_amenaza: amenazaId || null,
  });
  if (error) return { ok: false, mensaje: error.message };

  const r = data as { ok: boolean; error?: string; id?: string };
  if (!r.ok) return { ok: false, mensaje: r.error ?? 'No se pudo crear.' };

  revalidatePath('/panel/emergencias/simulacros');
  revalidatePath('/panel');
  return { ok: true, mensaje: 'Simulacro creado.', id: r.id };
}

export async function guardarSimulacro(
  id: string,
  datos: {
    fecha: string; tipo: TipoSimulacro; amenazaId: string;
    alcance: string; puntoEncuentro: string; horaInicio: string;
    tiempoSegundos: number | null; participantes: number; evacuados: number;
    aciertos: string; oportunidades: string; observaciones: string;
  }
): Promise<Res> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc('guardar_simulacro', {
    p_id: id,
    p_fecha: datos.fecha || null,
    p_tipo: datos.tipo,
    p_amenaza: datos.amenazaId || null,
    p_alcance: datos.alcance || null,
    p_punto: datos.puntoEncuentro || null,
    p_hora: datos.horaInicio || null,
    p_tiempo: datos.tiempoSegundos,
    p_participantes: datos.participantes,
    p_evacuados: datos.evacuados,
    p_aciertos: datos.aciertos || null,
    p_oportunidades: datos.oportunidades || null,
    p_observaciones: datos.observaciones || null,
  });
  if (error) return { ok: false, mensaje: error.message };

  const r = data as { ok: boolean; error?: string };
  if (!r.ok) return { ok: false, mensaje: r.error ?? 'No se pudo guardar.' };

  revalidatePath(`/panel/emergencias/simulacros/${id}`);
  return { ok: true, mensaje: 'Simulacro guardado.' };
}

export async function guardarEvaluador(
  simulacroId: string,
  datos: {
    id?: string; empleadoId: string | null; nombre: string;
    cargo: string; correo: string; rol: RolEvaluador;
  }
): Promise<Res> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc('guardar_evaluador_simulacro', {
    p_simulacro: simulacroId,
    p_nombre: datos.nombre || null,
    p_cargo: datos.cargo || null,
    p_correo: datos.correo || null,
    p_rol: datos.rol,
    p_empleado: datos.empleadoId || null,
    p_id: datos.id ?? null,
  });
  if (error) return { ok: false, mensaje: error.message };

  const r = data as { ok: boolean; error?: string; id?: string };
  if (!r.ok) return { ok: false, mensaje: r.error ?? 'No se pudo guardar.' };

  revalidatePath(`/panel/emergencias/simulacros/${simulacroId}`);
  return { ok: true, mensaje: 'Evaluador guardado.', id: r.id };
}

export async function eliminarEvaluador(id: string, simulacroId: string): Promise<Res> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc('eliminar_evaluador_simulacro', { p_id: id });
  if (error) return { ok: false, mensaje: error.message };

  const r = data as { ok: boolean; error?: string };
  if (!r.ok) return { ok: false, mensaje: r.error ?? 'No se pudo quitar.' };

  revalidatePath(`/panel/emergencias/simulacros/${simulacroId}`);
  return { ok: true, mensaje: 'Evaluador retirado.' };
}

export async function cerrarSimulacro(id: string): Promise<Res> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc('cerrar_simulacro', { p_id: id });
  if (error) return { ok: false, mensaje: error.message };

  const r = data as { ok: boolean; error?: string };
  if (!r.ok) return { ok: false, mensaje: r.error ?? 'No se pudo cerrar.' };

  revalidatePath(`/panel/emergencias/simulacros/${id}`);
  revalidatePath('/panel/emergencias/simulacros');
  revalidatePath('/panel');
  return { ok: true, mensaje: 'Acta cerrada. Ya es la evidencia del estándar 5.1.1.' };
}

/**
 * Genera el enlace de firma y lo envía. El enlace se devuelve SIEMPRE,
 * aunque el envío falle o no haya correo: en planta la mitad de las
 * veces se resuelve por WhatsApp.
 */
export async function enviarEnlaceFirmaSimulacro(
  evaluadorId: string, simulacroId: string
): Promise<Res> {
  const supabase = await crearClienteServidor();

  const { data: ev, error: errE } = await supabase
    .from('simulacro_evaluadores')
    .select('nombre, correo, rol, firma_url')
    .eq('id', evaluadorId)
    .maybeSingle();

  if (errE) return { ok: false, mensaje: errE.message };
  if (!ev) return { ok: false, mensaje: 'Evaluador no encontrado.' };
  if (ev.firma_url) return { ok: false, mensaje: 'Este evaluador ya firmó.' };

  const { data, error } = await supabase.rpc('generar_token_firma_simulacro', {
    p_evaluador: evaluadorId,
  });
  if (error) return { ok: false, mensaje: error.message };

  const t = data as { ok: boolean; error?: string; token?: string };
  if (!t.ok || !t.token) return { ok: false, mensaje: t.error ?? 'No se pudo generar el enlace.' };

  const enlace = `${await urlBase()}/s/${t.token}`;

  if (!ev.correo) {
    return {
      ok: false, enlace,
      mensaje: 'Sin correo registrado: copia el enlace y envíalo por otro medio.',
    };
  }

  const detalle = await obtenerSimulacro(simulacroId);
  const sim = (detalle.simulacro ?? {}) as Record<string, unknown>;
  const empresa = (detalle.empresa ?? {}) as Record<string, unknown>;

  const esc = (v: unknown) =>
    String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const fecha = sim.fecha
    ? new Date(String(sim.fecha) + 'T12:00:00').toLocaleDateString('es-CO', {
        day: '2-digit', month: 'long', year: 'numeric',
      })
    : '';

  const { enviarCorreo } = await import('./correo');
  const envio = await enviarCorreo({
    para: ev.correo,
    asunto: `Firma requerida — acta de simulacro ${esc(sim.codigo)}`,
    html: `
<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#14263F;max-width:560px;">
  <p>Buen día, ${esc(ev.nombre)}.</p>
  <p>
    Usted participó como evaluador del simulacro realizado en
    <strong>${esc(empresa.nombre)}</strong>. Se requiere su firma para cerrar el
    acta, que es la evidencia del estándar 5.1.1.
  </p>

  <table style="width:100%;border-collapse:collapse;background:#F7F7F4;border:1px solid #E4E4DF;margin:16px 0;">
    <tr><td style="padding:8px 12px;color:#5B6470;width:130px;">Consecutivo</td>
        <td style="padding:8px 12px;"><strong>${esc(sim.codigo)}</strong></td></tr>
    <tr><td style="padding:8px 12px;color:#5B6470;">Fecha</td>
        <td style="padding:8px 12px;">${esc(fecha)}</td></tr>
    ${sim.alcance ? `<tr><td style="padding:8px 12px;color:#5B6470;">Alcance</td>
        <td style="padding:8px 12px;">${esc(sim.alcance)}</td></tr>` : ''}
    ${sim.participantes ? `<tr><td style="padding:8px 12px;color:#5B6470;">Participantes</td>
        <td style="padding:8px 12px;">${esc(sim.participantes)}</td></tr>` : ''}
  </table>

  <p style="margin:24px 0;">
    <a href="${enlace}"
       style="background:#14263F;color:#fff;padding:12px 26px;border-radius:8px;
              text-decoration:none;font-weight:600;display:inline-block;">
      Revisar y firmar
    </a>
  </p>

  <p style="font-size:11px;color:#8A929C;border-top:1px solid #E4E4DF;padding-top:12px;">
    El enlace es personal y deja de funcionar apenas usted firme.
  </p>
</div>`.trim(),
    registro: { tipo: 'otro' },
  });

  if (!envio.ok) return { ok: false, enlace, mensaje: envio.mensaje };

  revalidatePath(`/panel/emergencias/simulacros/${simulacroId}`);
  return { ok: true, enlace, mensaje: `Enlace enviado a ${ev.correo}.` };
}

/** Para copiarlo a mano cuando no hay correo. */
export async function obtenerEnlaceFirmaSimulacro(evaluadorId: string): Promise<Res> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc('generar_token_firma_simulacro', {
    p_evaluador: evaluadorId,
  });
  if (error) return { ok: false, mensaje: error.message };

  const t = data as { ok: boolean; error?: string; token?: string };
  if (!t.ok || !t.token) return { ok: false, mensaje: t.error ?? 'No se pudo generar el enlace.' };

  const url = `${await urlBase()}/s/${t.token}`;
  return { ok: true, mensaje: url, enlace: url };
}

/** Envía el acta cerrada por correo con el PDF adjunto. */
export async function enviarActaSimulacro(
  id: string, destinatarios: string, mensaje: string
): Promise<Res> {
  const lista = destinatarios.split(/[,;\n]+/).map((c) => c.trim()).filter(Boolean);
  if (lista.length === 0) return { ok: false, mensaje: 'Indica al menos un correo.' };

  const invalidos = lista.filter((c) => !/^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]{2,}$/.test(c));
  if (invalidos.length > 0) {
    return { ok: false, mensaje: `Correo(s) inválido(s): ${invalidos.join(', ')}` };
  }

  const { generarActaSimulacro } = await import('./pdf/generarActaSimulacro');
  const pdf = await generarActaSimulacro(id);
  if (!pdf.ok) return { ok: false, mensaje: pdf.error };

  const { enviarCorreo } = await import('./correo');
  const extra = mensaje.trim()
    ? `<p style="background:#F7F7F4;border-left:3px solid #14263F;padding:10px 14px;color:#374151;margin:16px 0;">
         ${mensaje.replace(/</g, '&lt;').replace(/\n/g, '<br>')}
       </p>` : '';

  const envio = await enviarCorreo({
    para: lista.join(','),
    asunto: `${pdf.titulo} — ${pdf.empresa}`,
    html: `
<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#14263F;max-width:560px;">
  <h2 style="margin-bottom:4px;">${pdf.titulo}</h2>
  <p style="color:#5B6470;margin-top:0;">${pdf.empresa}</p>
  ${extra}
  <p>Adjunto el acta del simulacro con los resultados, las oportunidades de
     mejora y las firmas del equipo evaluador.</p>
  <p style="font-size:11px;color:#8A929C;margin-top:24px;border-top:1px solid #E4E4DF;padding-top:12px;">
    Estándar 5.1.1 · Decreto 1072 de 2015, art. 2.2.4.6.25.
  </p>
</div>`.trim(),
    adjuntos: [{ filename: pdf.nombreArchivo, content: pdf.buffer }],
    registro: { tipo: 'otro' },
  });

  if (!envio.ok) return { ok: false, mensaje: envio.mensaje };
  return { ok: true, mensaje: `Acta enviada a ${lista.length} destinatario(s).` };
}
