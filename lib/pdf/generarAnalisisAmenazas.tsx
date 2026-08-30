/**
 * GENERADOR DEL ANÁLISIS DE AMENAZAS
 * Usa listar_amenazas(): la misma fuente que la pantalla, así el PDF no
 * puede mostrar un nivel de riesgo distinto al que se ve en el panel.
 */
import { renderToBuffer } from '@react-pdf/renderer';
import { crearClienteServidor } from '../supabase/servidor';
import {
  AnalisisAmenazas, type DatosAnalisis,
  type CampoEncabezado, type AmenazaPdf,
} from './AnalisisAmenazas';
import type { EncabezadoConfig } from './EncabezadoDoc';
import { resolverNomenclatura, leerMapa } from '../nomenclaturas';

export type ResultadoAnalisis =
  | { ok: true; buffer: Buffer; nombreArchivo: string; titulo: string; empresa: string }
  | { ok: false; error: string };

async function descargarUrl(url: string): Promise<Buffer | null> {
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    return Buffer.from(await r.arrayBuffer());
  } catch { return null; }
}

export async function generarAnalisisAmenazas(empresaId: string): Promise<ResultadoAnalisis> {
  const supabase = await crearClienteServidor();

  const { data: empresa, error: errE } = await supabase
    .from('empresas')
    .select('nombre, nit, direccion, logo_url, color_primario, nomenclatura, version_doc, nomenclaturas, campos_encabezado, encabezado_config')
    .eq('id', empresaId)
    .maybeSingle();

  if (errE) return { ok: false, error: errE.message };
  if (!empresa) return { ok: false, error: 'Empresa no encontrada.' };

  const { data, error } = await supabase.rpc('listar_amenazas', { p_empresa: empresaId });
  if (error) return { ok: false, error: error.message };

  const d = (data ?? {}) as {
    items?: AmenazaPdf[];
    resumen?: { alto: number; medio: number; bajo: number };
  };

  const logo = empresa.logo_url ? await descargarUrl(String(empresa.logo_url)) : null;

  // El análisis es un documento VIVO: se rehace cuando cambian las
  // amenazas, así que nunca lleva nomenclatura congelada — siempre la
  // vigente de la empresa.
  const doc = resolverNomenclatura(
    null, leerMapa(empresa.nomenclaturas), 'emergencias', false,
    { nomenclatura: empresa.nomenclatura, version: empresa.version_doc }
  );

  const datos: DatosAnalisis = {
    empresa: String(empresa.nombre ?? ''),
    nit: (empresa.nit as string) ?? null,
    direccion: (empresa.direccion as string) ?? null,
    logo,

    titulo: 'ANÁLISIS DE AMENAZAS Y VULNERABILIDAD',
    nomenclatura: doc.nomenclatura || '—',
    versionDoc: doc.version || 'V1',
    colorPrimario: String(empresa.color_primario ?? '#14263F'),
    camposExtra: (empresa.campos_encabezado ?? []) as CampoEncabezado[],
    encabezadoConfig: (empresa.encabezado_config ?? null) as EncabezadoConfig | null,

    amenazas: d.items ?? [],
    alto: d.resumen?.alto ?? 0,
    medio: d.resumen?.medio ?? 0,
    bajo: d.resumen?.bajo ?? 0,

    generadoEl: new Date().toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' }),
  };

  const buffer = await renderToBuffer(<AnalisisAmenazas d={datos} />);

  return {
    ok: true,
    buffer,
    nombreArchivo: `Analisis_amenazas_${datos.empresa.replace(/\s+/g, '_')}.pdf`,
    titulo: datos.titulo,
    empresa: datos.empresa,
  };
}
