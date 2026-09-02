/**
 * GENERADOR DEL INFORME DE INDICADORES DEL ARTÍCULO 30
 * ---------------------------------------------------------------
 * Lee `indicadores_legales()`, que es la MISMA función que alimenta la
 * pantalla: así el PDF no puede decir una cifra distinta a la que se ve.
 * Recalcular aquí sería crear una segunda verdad.
 *
 * El membrete se toma de lo VIGENTE de la empresa y no de un congelado,
 * porque este informe no es un documento que se emita y se firme: es un
 * cálculo del momento en que se pide. La regla del §5.14 —congelar al
 * emitir— aplica a lo que lleva firma, no a un reporte que se regenera.
 */
import { renderToBuffer } from '@react-pdf/renderer';
import { crearClienteServidor } from '../supabase/servidor';
import {
  InformeIndicadores, type DatosIndicadores,
  type IndicadorPdf, type CampoEncabezado,
} from './InformeIndicadores';
import type { EncabezadoConfig } from './EncabezadoDoc';

export type ResultadoInforme =
  | { ok: true; buffer: Buffer; nombreArchivo: string; titulo: string; empresa: string }
  | { ok: false; error: string };

async function descargarUrl(url: string): Promise<Buffer | null> {
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    return Buffer.from(await r.arrayBuffer());
  } catch { return null; }
}

export async function generarInformeIndicadores(
  empresaId: string,
  anio: number
): Promise<ResultadoInforme> {
  const supabase = await crearClienteServidor();

  const { data: dInd, error } = await supabase.rpc('indicadores_legales', {
    p_empresa: empresaId,
    p_anio: anio,
  });
  if (error) return { ok: false, error: error.message };

  const ind = dInd as {
    anio: number;
    base?: Record<string, number>;
    indicadores?: IndicadorPdf[];
  } | null;

  if (!ind) return { ok: false, error: 'No se pudieron calcular los indicadores.' };

  const { data: em, error: eEmpresa } = await supabase
    .from('empresas')
    .select('nombre, nit, direccion, logo_url, color_primario, campos_encabezado, encabezado_config')
    .eq('id', empresaId)
    .single();

  if (eEmpresa || !em) return { ok: false, error: 'Empresa no encontrada.' };

  // La nomenclatura de este documento es la del tipo «reporte»: cada
  // formato del SG-SST avanza de versión a su ritmo.
  const { data: nom } = await supabase.rpc('nomenclatura_doc', {
    p_empresa: empresaId,
    p_tipo: 'reporte',
  });
  const n = (nom ?? {}) as { nomenclatura?: string; version?: string };

  const logo = em.logo_url ? await descargarUrl(String(em.logo_url)) : null;
  const base = ind.base ?? {};

  const datos: DatosIndicadores = {
    empresa: String(em.nombre ?? ''),
    nit: em.nit ?? null,
    direccion: em.direccion ?? null,
    logo,

    titulo: 'INDICADORES MÍNIMOS DEL SG-SST',
    nomenclatura: n.nomenclatura ?? '—',
    versionDoc: n.version ?? 'V1',
    colorPrimario: String(em.color_primario ?? '#14263F'),
    camposExtra: (em.campos_encabezado ?? []) as CampoEncabezado[],
    encabezadoConfig: (em.encabezado_config ?? null) as EncabezadoConfig | null,

    anio: Number(ind.anio ?? anio),
    indicadores: ind.indicadores ?? [],

    promedioTrabajadores: Number(base.promedio_trabajadores ?? 0),
    mesesConDato: Number(base.meses_con_dato ?? 0),
    diasProgramados: Number(base.dias_programados ?? 0),
    accidentes: Number(base.accidentes ?? 0),
    diasIncapacidad: Number(base.dias_incapacidad ?? 0),
    mortales: Number(base.mortales ?? 0),
    elNuevos: Number(base.el_nuevos ?? 0),
    elTotal: Number(base.el_total ?? 0),
    diasAusenciaMedica: Number(base.dias_ausencia_medica ?? 0),

    generadoEl: new Date().toLocaleString('es-CO', {
      dateStyle: 'short', timeStyle: 'short',
    }),
  };

  const buffer = await renderToBuffer(<InformeIndicadores d={datos} />);
  const limpio = datos.empresa.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_');

  return {
    ok: true,
    buffer,
    nombreArchivo: `Indicadores_art30_${datos.anio}_${limpio}.pdf`,
    titulo: `Indicadores del artículo 30 ${datos.anio}`,
    empresa: datos.empresa,
  };
}
