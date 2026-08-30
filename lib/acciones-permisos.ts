'use server';

/**
 * PERMISOS DE TRABAJO DE ALTO RIESGO
 * ---------------------------------------------------------------
 * Res. 4272 de 2021 (alturas) · Res. 491 de 2020 (espacios confinados) ·
 * Dec. 1072 art. 2.2.4.6.24.
 *
 * Un permiso no es un formato más: es una autorización que **vence**.
 * Vale para una tarea y una franja horaria, y fuera de ahí no autoriza
 * nada. La vigencia se deriva al leer, nunca se guarda.
 *
 * Lo que aporta frente al papel es el CRUCE: la aplicación ya sabe quién
 * tiene examen médico vigente, así que al autorizar comprueba la aptitud
 * de cada ejecutante y exige constancia escrita si falta. En papel esa
 * comprobación depende de que el supervisor se acuerde.
 */
import { revalidatePath } from 'next/cache';
import { crearClienteServidor } from './supabase/servidor';
import { empresaActiva } from './empresa-activa';
import { urlBase } from './url-base';

export type TipoPermiso =
  | 'alturas' | 'espacios_confinados' | 'trabajo_caliente'
  | 'energias' | 'izaje' | 'excavacion';

export type RolPermiso = 'autoriza' | 'ejecuta' | 'vigia' | 'coordinador_alturas';
export type ResultadoReq = 'sin_verificar' | 'cumple' | 'no_cumple' | 'no_aplica';
export type EstadoPermiso = 'borrador' | 'autorizado' | 'cerrado' | 'cancelado';

export type Requisito = {
  id: string;
  orden: number;
  texto: string;
  /** true = lo exige la norma · false = criterio técnico. */
  obligatorio: boolean;
  fundamento: string | null;
  resultado: ResultadoReq;
  observacion: string | null;
};

export type Aptitud = { apto: boolean | null; detalle: string };

export type Participante = {
  id: string;
  empleado_id: string | null;
  nombre: string;
  identificacion: string | null;
  cargo: string | null;
  correo: string | null;
  rol: RolPermiso;
  /** Congelada al autorizar. */
  apto: boolean | null;
  aptitud_detalle: string | null;
  /** Viva mientras es borrador; null cuando ya se autorizó. */
  aptitud_hoy: Aptitud | null;
  firmado: boolean;
  firma_url: string | null;
  firmado_en: string | null;
  tiene_token: boolean;
};

export type PermisoResumen = {
  id: string; codigo: string; tipo: TipoPermiso;
  fecha: string; hora_inicio: string; hora_fin: string;
  lugar: string | null; descripcion: string;
  estado: EstadoPermiso; ejecutor: string; contratista: string | null;
  vencido: boolean; personas: number; sin_firmar: number; sin_verificar: number;
};

export type Permiso = {
  id: string; codigo: string; tipo: TipoPermiso;
  fecha: string; hora_inicio: string; hora_fin: string;
  lugar: string | null; descripcion: string;
  ejecutor: 'propia' | 'contratista'; contratista: string | null;
  altura_m: number | null; medicion_atmosfera: string | null;
  estado: EstadoPermiso; vencido: boolean;
  autorizado_en: string | null; cerrado_en: string | null;
  cierre_observaciones: string | null; cancelado_motivo: string | null;
  aptitud_justificacion: string | null;
  nomenclatura: string | null; version_doc: string | null; titulo_doc: string | null;
};

export type Res = {
  ok: boolean; mensaje: string; id?: string;
  enlace?: string; requiereJustificacion?: boolean;
};

export async function listarPermisos(): Promise<PermisoResumen[]> {
  const empresa = await empresaActiva();
  if (!empresa) return [];

  const supabase = await crearClienteServidor();
  const { data } = await supabase.rpc('listar_permisos', { p_empresa: empresa.id });
  return (data ?? []) as PermisoResumen[];
}

export async function obtenerPermiso(id: string): Promise<{
  ok: boolean; error?: string;
  permiso?: Permiso; requisitos?: Requisito[];
  participantes?: Participante[]; empresa?: Record<string, unknown>;
}> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc('detalle_permiso', { p_id: id });
  if (error) return { ok: false, error: error.message };
  return (data ?? { ok: false, error: 'No encontrado.' }) as {
    ok: boolean; error?: string;
    permiso?: Permiso; requisitos?: Requisito[];
    participantes?: Participante[]; empresa?: Record<string, unknown>;
  };
}

export async function crearPermiso(datos: {
  tipo: TipoPermiso; fecha: string; horaInicio: string; horaFin: string;
  lugar: string; descripcion: string;
}): Promise<Res> {
  const empresa = await empresaActiva();
  if (!empresa) return { ok: false, mensaje: 'No hay empresa seleccionada.' };

  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc('crear_permiso', {
    p_empresa: empresa.id,
    p_tipo: datos.tipo,
    p_fecha: datos.fecha,
    p_inicio: datos.horaInicio,
    p_fin: datos.horaFin,
    p_lugar: datos.lugar || null,
    p_descripcion: datos.descripcion,
  });
  if (error) return { ok: false, mensaje: error.message };

  const r = data as { ok: boolean; error?: string; id?: string };
  if (!r.ok) return { ok: false, mensaje: r.error ?? 'No se pudo crear.' };

  revalidatePath('/panel/permisos');
  revalidatePath('/panel');
  return { ok: true, mensaje: 'Permiso creado. Verifica los requisitos.', id: r.id };
}

export async function guardarPermiso(
  id: string,
  datos: {
    fecha: string; horaInicio: string; horaFin: string;
    lugar: string; descripcion: string;
    ejecutor: 'propia' | 'contratista'; contratista: string;
    alturaM: number | null; medicion: string;
  }
): Promise<Res> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc('guardar_permiso', {
    p_id: id,
    p_fecha: datos.fecha || null,
    p_inicio: datos.horaInicio || null,
    p_fin: datos.horaFin || null,
    p_lugar: datos.lugar || null,
    p_descripcion: datos.descripcion || null,
    p_ejecutor: datos.ejecutor,
    p_contratista: datos.contratista || null,
    p_altura: datos.alturaM,
    p_medicion: datos.medicion || null,
  });
  if (error) return { ok: false, mensaje: error.message };

  const r = data as { ok: boolean; error?: string };
  if (!r.ok) return { ok: false, mensaje: r.error ?? 'No se pudo guardar.' };

  revalidatePath(`/panel/permisos/${id}`);
  return { ok: true, mensaje: 'Permiso guardado.' };
}

export async function responderRequisito(
  requisitoId: string, resultado: ResultadoReq,
  observacion: string, permisoId: string
): Promise<Res> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc('responder_requisito_permiso', {
    p_id: requisitoId, p_resultado: resultado, p_observacion: observacion || null,
  });
  if (error) return { ok: false, mensaje: error.message };

  const r = data as { ok: boolean; error?: string };
  if (!r.ok) return { ok: false, mensaje: r.error ?? 'No se pudo guardar.' };

  revalidatePath(`/panel/permisos/${permisoId}`);
  return { ok: true, mensaje: 'Verificación registrada.' };
}

export async function guardarParticipante(
  permisoId: string,
  datos: {
    id?: string; empleadoId: string | null; nombre: string;
    identificacion: string; cargo: string; correo: string; rol: RolPermiso;
  }
): Promise<Res> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc('guardar_participante_permiso', {
    p_permiso: permisoId,
    p_nombre: datos.nombre || null,
    p_rol: datos.rol,
    p_empleado: datos.empleadoId || null,
    p_identificacion: datos.identificacion || null,
    p_cargo: datos.cargo || null,
    p_correo: datos.correo || null,
    p_id: datos.id ?? null,
  });
  if (error) return { ok: false, mensaje: error.message };

  const r = data as { ok: boolean; error?: string; id?: string };
  if (!r.ok) return { ok: false, mensaje: r.error ?? 'No se pudo guardar.' };

  revalidatePath(`/panel/permisos/${permisoId}`);
  return { ok: true, mensaje: 'Persona registrada.', id: r.id };
}

export async function eliminarParticipante(id: string, permisoId: string): Promise<Res> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc('eliminar_participante_permiso', { p_id: id });
  if (error) return { ok: false, mensaje: error.message };

  const r = data as { ok: boolean; error?: string };
  if (!r.ok) return { ok: false, mensaje: r.error ?? 'No se pudo quitar.' };

  revalidatePath(`/panel/permisos/${permisoId}`);
  return { ok: true, mensaje: 'Persona retirada del permiso.' };
}

/**
 * Autorizar es EMITIR. Devuelve `requiereJustificacion` cuando alguien
 * no tiene aptitud médica vigente: la pantalla pide la constancia y
 * vuelve a llamar. No se prohíbe del todo porque eso llevaría a
 * trabajar sin permiso, que es peor.
 */
export async function autorizarPermiso(
  id: string, justificacion = ''
): Promise<Res> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc('autorizar_permiso', {
    p_id: id, p_justificacion: justificacion || null,
  });
  if (error) return { ok: false, mensaje: error.message };

  const r = data as {
    ok: boolean; error?: string;
    requiere_justificacion?: boolean; sin_aptitud?: string;
  };
  if (!r.ok) {
    return {
      ok: false,
      mensaje: r.error ?? 'No se pudo autorizar.',
      requiereJustificacion: r.requiere_justificacion === true,
    };
  }

  revalidatePath(`/panel/permisos/${id}`);
  revalidatePath('/panel/permisos');
  revalidatePath('/panel');
  return {
    ok: true,
    mensaje: r.sin_aptitud
      ? `Permiso autorizado con constancia por falta de aptitud de ${r.sin_aptitud}.`
      : 'Permiso autorizado. Ya habilita la tarea dentro de su horario.',
  };
}

export async function cerrarPermiso(id: string, observaciones: string): Promise<Res> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc('cerrar_permiso', {
    p_id: id, p_observaciones: observaciones,
  });
  if (error) return { ok: false, mensaje: error.message };

  const r = data as { ok: boolean; error?: string };
  if (!r.ok) return { ok: false, mensaje: r.error ?? 'No se pudo cerrar.' };

  revalidatePath(`/panel/permisos/${id}`);
  revalidatePath('/panel/permisos');
  revalidatePath('/panel');
  return { ok: true, mensaje: 'Permiso cerrado.' };
}

export async function cancelarPermiso(id: string, motivo: string): Promise<Res> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc('cancelar_permiso', {
    p_id: id, p_motivo: motivo,
  });
  if (error) return { ok: false, mensaje: error.message };

  const r = data as { ok: boolean; error?: string };
  if (!r.ok) return { ok: false, mensaje: r.error ?? 'No se pudo cancelar.' };

  revalidatePath(`/panel/permisos/${id}`);
  revalidatePath('/panel/permisos');
  return { ok: true, mensaje: 'Permiso cancelado.' };
}

/**
 * Genera el enlace de firma y lo envía. El enlace vuelve SIEMPRE, aunque
 * el correo falle: quien autoriza suele estar en otra sede y el resto
 * está al pie de la tarea con el celular en la mano.
 */
export async function enviarEnlaceFirmaPermiso(
  participanteId: string, permisoId: string
): Promise<Res> {
  const supabase = await crearClienteServidor();

  const { data: q, error: errQ } = await supabase
    .from('permiso_participantes')
    .select('nombre, correo, rol, firma_url')
    .eq('id', participanteId)
    .maybeSingle();

  if (errQ) return { ok: false, mensaje: errQ.message };
  if (!q) return { ok: false, mensaje: 'Participante no encontrado.' };
  if (q.firma_url) return { ok: false, mensaje: 'Esta persona ya firmó.' };

  const { data, error } = await supabase.rpc('generar_token_firma_permiso', {
    p_participante: participanteId,
  });
  if (error) return { ok: false, mensaje: error.message };

  const t = data as { ok: boolean; error?: string; token?: string };
  if (!t.ok || !t.token) return { ok: false, mensaje: t.error ?? 'No se pudo generar el enlace.' };

  const enlace = `${await urlBase()}/p/${t.token}`;

  if (!q.correo) {
    return {
      ok: false, enlace,
      mensaje: 'Sin correo registrado: copia el enlace y envíalo por otro medio.',
    };
  }

  const detalle = await obtenerPermiso(permisoId);
  const p = (detalle.permiso ?? {}) as Record<string, unknown>;
  const empresa = (detalle.empresa ?? {}) as Record<string, unknown>;

  const esc = (v: unknown) =>
    String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const fecha = p.fecha
    ? new Date(String(p.fecha) + 'T12:00:00').toLocaleDateString('es-CO', {
        day: '2-digit', month: 'long', year: 'numeric',
      })
    : '';

  const { enviarCorreo } = await import('./correo');
  const envio = await enviarCorreo({
    para: q.correo,
    asunto: `Firma requerida — permiso de trabajo ${esc(p.codigo)}`,
    html: `
<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#14263F;max-width:560px;">
  <p>Buen día, ${esc(q.nombre)}.</p>
  <p>
    Se requiere su firma en un permiso de trabajo de alto riesgo en
    <strong>${esc(empresa.nombre)}</strong>. <strong>El permiso no autoriza la
    tarea hasta que todos hayan firmado.</strong>
  </p>

  <table style="width:100%;border-collapse:collapse;background:#F7F7F4;border:1px solid #E4E4DF;margin:16px 0;">
    <tr><td style="padding:8px 12px;color:#5B6470;width:130px;">Consecutivo</td>
        <td style="padding:8px 12px;"><strong>${esc(p.codigo)}</strong></td></tr>
    <tr><td style="padding:8px 12px;color:#5B6470;">Fecha</td>
        <td style="padding:8px 12px;">${esc(fecha)}</td></tr>
    <tr><td style="padding:8px 12px;color:#5B6470;">Horario</td>
        <td style="padding:8px 12px;">${esc(String(p.hora_inicio ?? '').slice(0, 5))} a ${esc(String(p.hora_fin ?? '').slice(0, 5))}</td></tr>
    ${p.lugar ? `<tr><td style="padding:8px 12px;color:#5B6470;">Lugar</td>
        <td style="padding:8px 12px;">${esc(p.lugar)}</td></tr>` : ''}
  </table>

  <p style="background:#fff;border-left:3px solid #14263F;padding:10px 14px;color:#374151;">
    ${esc(p.descripcion)}
  </p>

  <p style="margin:24px 0;">
    <a href="${enlace}"
       style="background:#14263F;color:#fff;padding:12px 26px;border-radius:8px;
              text-decoration:none;font-weight:600;display:inline-block;">
      Revisar y firmar
    </a>
  </p>

  <p style="font-size:11px;color:#8A929C;border-top:1px solid #E4E4DF;padding-top:12px;">
    En el enlace verá la lista de verificación completa antes de firmar.
    El enlace es personal y deja de funcionar apenas usted firme.
  </p>
</div>`.trim(),
    registro: { tipo: 'otro' },
  });

  if (!envio.ok) return { ok: false, enlace, mensaje: envio.mensaje };

  revalidatePath(`/panel/permisos/${permisoId}`);
  return { ok: true, enlace, mensaje: `Enlace enviado a ${q.correo}.` };
}

/** Para copiarlo a mano cuando no hay correo. */
export async function obtenerEnlaceFirmaPermiso(participanteId: string): Promise<Res> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc('generar_token_firma_permiso', {
    p_participante: participanteId,
  });
  if (error) return { ok: false, mensaje: error.message };

  const t = data as { ok: boolean; error?: string; token?: string };
  if (!t.ok || !t.token) return { ok: false, mensaje: t.error ?? 'No se pudo generar el enlace.' };

  const url = `${await urlBase()}/p/${t.token}`;
  return { ok: true, mensaje: url, enlace: url };
}

/** Envía el permiso en PDF. */
export async function enviarPermiso(
  id: string, destinatarios: string, mensaje: string
): Promise<Res> {
  const lista = destinatarios.split(/[,;\n]+/).map((c) => c.trim()).filter(Boolean);
  if (lista.length === 0) return { ok: false, mensaje: 'Indica al menos un correo.' };

  const invalidos = lista.filter((c) => !/^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]{2,}$/.test(c));
  if (invalidos.length > 0) {
    return { ok: false, mensaje: `Correo(s) inválido(s): ${invalidos.join(', ')}` };
  }

  const { generarPermiso } = await import('./pdf/generarPermiso');
  const pdf = await generarPermiso(id);
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
  <p>Adjunto el permiso de trabajo con su lista de verificación, el personal
     autorizado y las firmas.</p>
  <p style="font-size:11px;color:#8A929C;margin-top:24px;border-top:1px solid #E4E4DF;padding-top:12px;">
    Res. 4272 de 2021 · Res. 491 de 2020 · Dec. 1072 art. 2.2.4.6.24.
  </p>
</div>`.trim(),
    adjuntos: [{ filename: pdf.nombreArchivo, content: pdf.buffer }],
    registro: { tipo: 'otro' },
  });

  if (!envio.ok) return { ok: false, mensaje: envio.mensaje };
  return { ok: true, mensaje: `Permiso enviado a ${lista.length} destinatario(s).` };
}
