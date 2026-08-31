'use server';

/**
 * RENDICIÓN DE CUENTAS — estándar 2.8.1 · Dec. 1072 art. 2.2.4.6.8 num. 3
 * ---------------------------------------------------------------
 * La norma pide que quienes tienen responsabilidades en el SG-SST rindan
 * cuentas **anualmente y por escrito**. Las dos cosas importan: si el
 * acta la escribe el consultor y los demás solo firman, no hubo
 * rendición de cuentas, hubo una lista de asistencia.
 *
 * Por eso cada responsable escribe SU informe —desde su propio enlace, en
 * la misma pantalla donde firma— y cerrar el acta exige que todos hayan
 * escrito y firmado.
 */
import { revalidatePath } from 'next/cache';
import { crearClienteServidor } from './supabase/servidor';
import { empresaActiva } from './empresa-activa';
import { urlBase } from './url-base';

export type Responsable = {
  id: string;
  empleado_id: string | null;
  nombre: string;
  cargo: string | null;
  correo: string | null;
  responsabilidades: string | null;
  informe: string | null;
  firmado: boolean;
  firma_url: string | null;
  firmado_en: string | null;
  tiene_token: boolean;
};

export type RendicionResumen = {
  id: string; codigo: string; anio: number; fecha: string;
  estado: 'borrador' | 'cerrada';
  responsables: number; sin_firmar: number; sin_informe: number;
};

export type Rendicion = {
  id: string; codigo: string; anio: number; fecha: string;
  alcance: string | null; logros: string | null;
  dificultades: string | null; compromisos: string | null;
  estado: 'borrador' | 'cerrada'; fecha_cierre: string | null;
  nomenclatura: string | null; version_doc: string | null; titulo_doc: string | null;
};

export type Res = { ok: boolean; mensaje: string; id?: string; enlace?: string };

export async function listarRendiciones(): Promise<RendicionResumen[]> {
  const empresa = await empresaActiva();
  if (!empresa) return [];

  const supabase = await crearClienteServidor();
  const { data } = await supabase.rpc('listar_rendiciones', { p_empresa: empresa.id });
  return (data ?? []) as RendicionResumen[];
}

export async function obtenerRendicion(id: string): Promise<{
  ok: boolean; error?: string;
  rendicion?: Rendicion; responsables?: Responsable[];
  empresa?: Record<string, unknown>;
}> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc('detalle_rendicion', { p_id: id });
  if (error) return { ok: false, error: error.message };
  return (data ?? { ok: false, error: 'No encontrada.' }) as {
    ok: boolean; error?: string;
    rendicion?: Rendicion; responsables?: Responsable[];
    empresa?: Record<string, unknown>;
  };
}

export async function crearRendicion(anio: number, fecha: string): Promise<Res> {
  const empresa = await empresaActiva();
  if (!empresa) return { ok: false, mensaje: 'No hay empresa seleccionada.' };

  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc('crear_rendicion', {
    p_empresa: empresa.id, p_anio: anio, p_fecha: fecha,
  });
  if (error) return { ok: false, mensaje: error.message };

  const r = data as { ok: boolean; error?: string; id?: string };
  if (!r.ok) return { ok: false, mensaje: r.error ?? 'No se pudo crear.' };

  revalidatePath('/panel/rendicion');
  revalidatePath('/panel');
  return { ok: true, mensaje: 'Rendición creada.', id: r.id };
}

export async function guardarRendicion(
  id: string,
  datos: { fecha: string; alcance: string; logros: string; dificultades: string; compromisos: string }
): Promise<Res> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc('guardar_rendicion', {
    p_id: id,
    p_fecha: datos.fecha || null,
    p_alcance: datos.alcance || null,
    p_logros: datos.logros || null,
    p_dificultades: datos.dificultades || null,
    p_compromisos: datos.compromisos || null,
  });
  if (error) return { ok: false, mensaje: error.message };

  const r = data as { ok: boolean; error?: string };
  if (!r.ok) return { ok: false, mensaje: r.error ?? 'No se pudo guardar.' };

  revalidatePath(`/panel/rendicion/${id}`);
  return { ok: true, mensaje: 'Rendición guardada.' };
}

export async function guardarResponsable(
  rendicionId: string,
  datos: {
    id?: string; empleadoId: string | null; nombre: string;
    cargo: string; correo: string; responsabilidades: string; informe: string;
  }
): Promise<Res> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc('guardar_responsable_rendicion', {
    p_rendicion: rendicionId,
    p_nombre: datos.nombre || null,
    p_cargo: datos.cargo || null,
    p_correo: datos.correo || null,
    p_responsabilidades: datos.responsabilidades || null,
    p_informe: datos.informe || null,
    p_empleado: datos.empleadoId || null,
    p_id: datos.id ?? null,
  });
  if (error) return { ok: false, mensaje: error.message };

  const r = data as { ok: boolean; error?: string; id?: string };
  if (!r.ok) return { ok: false, mensaje: r.error ?? 'No se pudo guardar.' };

  revalidatePath(`/panel/rendicion/${rendicionId}`);
  return { ok: true, mensaje: 'Responsable guardado.', id: r.id };
}

export async function eliminarResponsable(id: string, rendicionId: string): Promise<Res> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc('eliminar_responsable_rendicion', { p_id: id });
  if (error) return { ok: false, mensaje: error.message };

  const r = data as { ok: boolean; error?: string };
  if (!r.ok) return { ok: false, mensaje: r.error ?? 'No se pudo quitar.' };

  revalidatePath(`/panel/rendicion/${rendicionId}`);
  return { ok: true, mensaje: 'Responsable retirado.' };
}

export async function cerrarRendicion(id: string): Promise<Res> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc('cerrar_rendicion', { p_id: id });
  if (error) return { ok: false, mensaje: error.message };

  const r = data as { ok: boolean; error?: string };
  if (!r.ok) return { ok: false, mensaje: r.error ?? 'No se pudo cerrar.' };

  revalidatePath(`/panel/rendicion/${id}`);
  revalidatePath('/panel/rendicion');
  revalidatePath('/panel');
  return { ok: true, mensaje: 'Acta cerrada.' };
}

/** Genera el enlace para que el responsable escriba y firme, y lo envía. */
export async function enviarEnlaceRendicion(
  responsableId: string, rendicionId: string
): Promise<Res> {
  const supabase = await crearClienteServidor();

  const { data: q, error: errQ } = await supabase
    .from('rendicion_responsables')
    .select('nombre, correo, responsabilidades, firma_url')
    .eq('id', responsableId)
    .maybeSingle();

  if (errQ) return { ok: false, mensaje: errQ.message };
  if (!q) return { ok: false, mensaje: 'Responsable no encontrado.' };
  if (q.firma_url) return { ok: false, mensaje: 'Esta persona ya rindió cuentas.' };

  const { data, error } = await supabase.rpc('generar_token_rendicion', {
    p_responsable: responsableId,
  });
  if (error) return { ok: false, mensaje: error.message };

  const t = data as { ok: boolean; error?: string; token?: string };
  if (!t.ok || !t.token) return { ok: false, mensaje: t.error ?? 'No se pudo generar el enlace.' };

  const enlace = `${await urlBase()}/c/${t.token}`;

  if (!q.correo) {
    return {
      ok: false, enlace,
      mensaje: 'Sin correo registrado: copia el enlace y envíalo por otro medio.',
    };
  }

  const detalle = await obtenerRendicion(rendicionId);
  const r = (detalle.rendicion ?? {}) as Record<string, unknown>;
  const empresa = (detalle.empresa ?? {}) as Record<string, unknown>;

  const esc = (v: unknown) =>
    String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const { enviarCorreo } = await import('./correo');
  const envio = await enviarCorreo({
    para: q.correo,
    asunto: `Rendición de cuentas del SG-SST ${esc(r.anio)} — ${esc(empresa.nombre)}`,
    html: `
<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#14263F;max-width:560px;">
  <p>Buen día, ${esc(q.nombre)}.</p>
  <p>
    Usted tiene responsabilidades asignadas en el Sistema de Gestión de SST de
    <strong>${esc(empresa.nombre)}</strong>. La norma pide que rinda cuentas
    <strong>por escrito</strong> sobre su desempeño una vez al año.
  </p>

  ${q.responsabilidades ? `
  <p style="background:#F7F7F4;border-left:3px solid #14263F;padding:10px 14px;color:#374151;">
    <strong>Sus responsabilidades:</strong><br>${esc(q.responsabilidades)}
  </p>` : ''}

  <p>
    En el enlace escribe usted mismo qué hizo con ellas durante el año y firma.
    No lo escribe nadie por usted: eso es lo que diferencia una rendición de
    cuentas de una lista de asistencia.
  </p>

  <p style="margin:24px 0;">
    <a href="${enlace}"
       style="background:#14263F;color:#fff;padding:12px 26px;border-radius:8px;
              text-decoration:none;font-weight:600;display:inline-block;">
      Rendir cuentas
    </a>
  </p>

  <p style="font-size:11px;color:#8A929C;border-top:1px solid #E4E4DF;padding-top:12px;">
    Estándar 2.8.1. El enlace es personal y deja de funcionar apenas usted firme.
  </p>
</div>`.trim(),
    registro: { tipo: 'otro' },
  });

  if (!envio.ok) return { ok: false, enlace, mensaje: envio.mensaje };

  revalidatePath(`/panel/rendicion/${rendicionId}`);
  return { ok: true, enlace, mensaje: `Enlace enviado a ${q.correo}.` };
}

export async function obtenerEnlaceRendicion(responsableId: string): Promise<Res> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc('generar_token_rendicion', {
    p_responsable: responsableId,
  });
  if (error) return { ok: false, mensaje: error.message };

  const t = data as { ok: boolean; error?: string; token?: string };
  if (!t.ok || !t.token) return { ok: false, mensaje: t.error ?? 'No se pudo generar el enlace.' };

  const url = `${await urlBase()}/c/${t.token}`;
  return { ok: true, mensaje: url, enlace: url };
}

/** Envía el acta cerrada por correo con el PDF adjunto. */
export async function enviarActaRendicion(
  id: string, destinatarios: string, mensaje: string
): Promise<Res> {
  const lista = destinatarios.split(/[,;\n]+/).map((c) => c.trim()).filter(Boolean);
  if (lista.length === 0) return { ok: false, mensaje: 'Indica al menos un correo.' };

  const invalidos = lista.filter((c) => !/^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]{2,}$/.test(c));
  if (invalidos.length > 0) {
    return { ok: false, mensaje: `Correo(s) inválido(s): ${invalidos.join(', ')}` };
  }

  const { generarActaRendicion } = await import('./pdf/generarActaRendicion');
  const pdf = await generarActaRendicion(id);
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
  <p>Adjunto el acta de rendición de cuentas con el informe de cada responsable
     y sus firmas.</p>
  <p style="font-size:11px;color:#8A929C;margin-top:24px;border-top:1px solid #E4E4DF;padding-top:12px;">
    Estándar 2.8.1 · Decreto 1072 de 2015, art. 2.2.4.6.8.
  </p>
</div>`.trim(),
    adjuntos: [{ filename: pdf.nombreArchivo, content: pdf.buffer }],
    registro: { tipo: 'otro' },
  });

  if (!envio.ok) return { ok: false, mensaje: envio.mensaje };
  return { ok: true, mensaje: `Acta enviada a ${lista.length} destinatario(s).` };
}
