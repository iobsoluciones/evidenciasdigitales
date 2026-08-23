/**
 * GENERADOR DEL INFORME DE EVALUACIÓN
 * Reúne los datos y produce el PDF. Igual que el acta: se genera bajo
 * demanda y no se almacena.
 */
import { renderToBuffer } from '@react-pdf/renderer';
import { crearClienteServidor } from '../supabase/servidor';
import { obtenerPerfil } from '../sesion';
import { InformeEvaluacion, type DatosInforme, type CampoEncabezado } from './InformeEvaluacion';

export type ResultadoInforme =
  | { ok: true; buffer: Buffer; nombreArchivo: string }
  | { ok: false; error: string };

async function descargarUrl(url: string): Promise<Buffer | null> {
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    return Buffer.from(await r.arrayBuffer());
  } catch { return null; }
}

export async function generarInformeEvaluacion(
  capacitacionId: string
): Promise<ResultadoInforme> {
  const perfil = await obtenerPerfil();
  if (!perfil) return { ok: false, error: 'Sesión no válida.' };

  const supabase = await crearClienteServidor();

  const { data: cap } = await supabase
    .from('v_capacitaciones_resumen')
    .select('*')
    .eq('id', capacitacionId)
    .maybeSingle();

  if (!cap) return { ok: false, error: 'Capacitación no encontrada.' };

  const { data: ev } = await supabase
    .from('evaluaciones')
    .select('titulo, puntaje_minimo')
    .eq('capacitacion_id', capacitacionId)
    .maybeSingle();

  if (!ev) return { ok: false, error: 'Esta capacitación no tiene evaluación.' };

  const { data: est } = await supabase.rpc('estadisticas_evaluacion', {
    p_capacitacion_id: capacitacionId,
  });

  const e = (est ?? {}) as {
    evaluados: number; promedio: number | null;
    aprobados: number; reprobados: number;
    archivadas: number; conReintento: number;
    porSubtema: DatosInforme['porSubtema'];
    porPregunta: DatosInforme['porPregunta'];
  };

  const { data: parts } = await supabase
    .from('participantes')
    .select('nombres, area, puntaje_evaluacion, aprobo')
    .eq('capacitacion_id', capacitacionId)
    .order('puntaje_evaluacion', { ascending: false, nullsFirst: false });

  const logo = perfil.organizacion.logo_url
    ? await descargarUrl(perfil.organizacion.logo_url)
    : null;

  // Campos extra: los congelados en la capacitación, o los actuales
  const extra = (cap.campos_encabezado ?? perfil.organizacion.campos_encabezado ?? []) as CampoEncabezado[];

  const datos: DatosInforme = {
    organizacion: perfil.organizacion.nombre,
    nomenclatura: cap.nomenclatura ?? perfil.organizacion.nomenclatura ?? '—',
    versionDoc: cap.version_doc ?? perfil.organizacion.version_doc ?? 'V1',
    colorPrimario: perfil.organizacion.color_primario || '#1e3a8a',
    logo,
    camposExtra: Array.isArray(extra) ? extra : [],

    codigo: cap.codigo,
    tema: cap.tema,
    instructor: cap.instructor,
    fecha: new Date(cap.fecha_inicio).toLocaleString('es-CO', {
      dateStyle: 'medium', timeStyle: 'short',
    }),
    tituloEvaluacion: ev.titulo,
    puntajeMinimo: ev.puntaje_minimo,

    evaluados: e.evaluados ?? 0,
    promedio: Number(e.promedio ?? 0),
    aprobados: e.aprobados ?? 0,
    reprobados: e.reprobados ?? 0,
    archivadas: e.archivadas ?? 0,
    conReintento: e.conReintento ?? 0,

    porSubtema: e.porSubtema ?? [],
    porPregunta: e.porPregunta ?? [],
    participantes: (parts ?? []).map((p) => ({
      nombres: p.nombres,
      area: p.area,
      puntaje: p.puntaje_evaluacion,
      aprobo: p.aprobo,
    })),

    generadoEl: new Date().toLocaleString('es-CO', {
      dateStyle: 'short', timeStyle: 'short',
    }),
  };

  const buffer = await renderToBuffer(<InformeEvaluacion d={datos} />);
  const fecha = new Date().toISOString().slice(0, 10).replace(/-/g, '');

  return {
    ok: true,
    buffer,
    nombreArchivo: `Informe_Evaluacion_${cap.codigo}_${fecha}.pdf`,
  };
}
