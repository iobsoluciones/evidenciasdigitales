/**
 * GENERADOR DEL INFORME DE AUTOEVALUACIÓN
 * Usa detalle_autoevaluacion(): la misma fuente que alimenta la pantalla,
 * así el PDF nunca puede decir un porcentaje distinto al que se ve.
 */
import { renderToBuffer } from '@react-pdf/renderer';
import { crearClienteServidor } from '../supabase/servidor';
import {
  InformeAutoevaluacion, type DatosAutoevaluacion,
  type CampoEncabezado, type ItemPdf, type CicloPdf,
} from './InformeAutoevaluacion';
import type { EncabezadoConfig } from './EncabezadoDoc';

export type ResultadoInforme =
  | { ok: true; buffer: Buffer; nombreArchivo: string; titulo: string; empresa: string }
  | { ok: false; error: string };

const CRITERIOS: Record<string, { t: string; que: string }> = {
  critico: {
    t: 'CRÍTICO',
    que: 'Menos del 60 %. Exige plan de mejoramiento inmediato, envío a la ARL y seguimiento anual por parte del Ministerio del Trabajo.',
  },
  moderadamente_aceptable: {
    t: 'MODERADAMENTE ACEPTABLE',
    que: 'Entre 60 y 85 %. Exige plan de mejoramiento y comunicarlo a la ARL.',
  },
  aceptable: {
    t: 'ACEPTABLE',
    que: 'Más del 85 %. Mantener el sistema y las evidencias al día, y el plan anual del año siguiente.',
  },
};

async function descargarUrl(url: string): Promise<Buffer | null> {
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    return Buffer.from(await r.arrayBuffer());
  } catch { return null; }
}

export async function generarInformeAutoevaluacion(autoId: string): Promise<ResultadoInforme> {
  const supabase = await crearClienteServidor();

  const { data, error } = await supabase.rpc('detalle_autoevaluacion', { p_auto: autoId });
  if (error) return { ok: false, error: error.message };

  const d = data as {
    ok: boolean; error?: string;
    autoevaluacion?: Record<string, unknown>;
    items?: ItemPdf[];
    puntaje?: Record<string, number>;
    por_ciclo?: CicloPdf[];
    criterio?: string;
    empresa?: Record<string, unknown>;
  };

  if (!d.ok || !d.autoevaluacion) {
    return { ok: false, error: d.error ?? 'Autoevaluación no encontrada.' };
  }

  const a = d.autoevaluacion;
  const em = d.empresa ?? {};
  const p = d.puntaje ?? {};
  const crit = CRITERIOS[d.criterio ?? ''] ?? { t: '—', que: '' };

  const logo = em.logo_url ? await descargarUrl(String(em.logo_url)) : null;

  const fecha = (v: unknown) =>
    v ? new Date(String(v)).toLocaleDateString('es-CO', {
      day: '2-digit', month: 'long', year: 'numeric',
    }) : '—';

  const datos: DatosAutoevaluacion = {
    empresa: String(em.nombre ?? ''),
    nit: (em.nit as string) ?? null,
    direccion: (em.direccion as string) ?? null,
    logo,

    codigo: String(a.codigo),
    titulo: String(a.titulo_doc ?? 'AUTOEVALUACIÓN DE ESTÁNDARES MÍNIMOS'),
    nomenclatura: String(a.nomenclatura ?? '—'),
    versionDoc: String(a.version_doc ?? 'V1'),
    colorPrimario: String(em.color_primario ?? '#14263F'),
    camposExtra: (a.campos_encabezado ?? []) as CampoEncabezado[],
    encabezadoConfig: (a.encabezado_config ?? null) as EncabezadoConfig | null,

    anio: Number(a.anio),
    alcance: Number(a.alcance ?? 0),
    estado: a.estado === 'cerrada' ? 'Cerrada' : 'En diligenciamiento',
    fechaCierre: fecha(a.fecha_cierre),
    observaciones: (a.observaciones as string) ?? null,

    porcentaje: Number(p.porcentaje ?? 0),
    obtenido: Number(p.obtenido ?? 0),
    posible: Number(p.posible ?? 0),
    criterio: crit.t,
    queSignifica: crit.que,
    cumple: Number(p.cumple ?? 0),
    noCumple: Number(p.no_cumple ?? 0),
    noAplica: Number(p.no_aplica ?? 0),

    porCiclo: d.por_ciclo ?? [],
    items: d.items ?? [],

    generadoEl: new Date().toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' }),
  };

  const buffer = await renderToBuffer(<InformeAutoevaluacion d={datos} />);

  return {
    ok: true,
    buffer,
    nombreArchivo: `Autoevaluacion_${datos.anio}_${datos.codigo}.pdf`,
    titulo: `${datos.titulo} ${datos.anio}`,
    empresa: datos.empresa,
  };
}
