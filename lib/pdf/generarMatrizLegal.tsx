/**
 * GENERADOR DE LA MATRIZ LEGAL
 * Usa listar_matriz_legal(): la misma fuente que la pantalla.
 */
import { renderToBuffer } from '@react-pdf/renderer';
import { crearClienteServidor } from '../supabase/servidor';
import {
  MatrizLegal, type DatosMatriz,
  type CampoEncabezado, type ItemPdf,
} from './MatrizLegal';
import type { EncabezadoConfig } from './EncabezadoDoc';
import { resolverNomenclatura, leerMapa } from '../nomenclaturas';

export type ResultadoMatriz =
  | { ok: true; buffer: Buffer; nombreArchivo: string; titulo: string; empresa: string }
  | { ok: false; error: string };

async function descargarUrl(url: string): Promise<Buffer | null> {
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    return Buffer.from(await r.arrayBuffer());
  } catch { return null; }
}

export async function generarMatrizLegal(empresaId: string): Promise<ResultadoMatriz> {
  const supabase = await crearClienteServidor();

  const { data: empresa, error: errE } = await supabase
    .from('empresas')
    .select('nombre, nit, direccion, logo_url, color_primario, nomenclatura, version_doc, nomenclaturas, campos_encabezado, encabezado_config')
    .eq('id', empresaId)
    .maybeSingle();

  if (errE) return { ok: false, error: errE.message };
  if (!empresa) return { ok: false, error: 'Empresa no encontrada.' };

  const { data, error } = await supabase.rpc('listar_matriz_legal', { p_empresa: empresaId });
  if (error) return { ok: false, error: error.message };

  const d = (data ?? {}) as {
    items?: Array<ItemPdf & { fecha_verificacion: string | null }>;
    resumen?: {
      aplican: number; cumple: number; parcial: number;
      no_cumple: number; sin_evaluar: number;
    };
  };

  const logo = empresa.logo_url ? await descargarUrl(String(empresa.logo_url)) : null;

  // La matriz es un documento VIVO: se actualiza cuando cambia la
  // normativa, así que nunca lleva nomenclatura congelada.
  const doc = resolverNomenclatura(
    null, leerMapa(empresa.nomenclaturas), 'matriz_legal', false,
    { nomenclatura: empresa.nomenclatura, version: empresa.version_doc }
  );

  const items = (d.items ?? []).map((i) => ({
    ...i,
    fecha_verificacion: i.fecha_verificacion
      ? new Date(String(i.fecha_verificacion) + 'T12:00:00').toLocaleDateString('es-CO', {
          day: '2-digit', month: '2-digit', year: 'numeric',
        })
      : null,
  }));

  const datos: DatosMatriz = {
    empresa: String(empresa.nombre ?? ''),
    nit: (empresa.nit as string) ?? null,
    direccion: (empresa.direccion as string) ?? null,
    logo,

    titulo: 'MATRIZ DE REQUISITOS LEGALES',
    nomenclatura: doc.nomenclatura || '—',
    versionDoc: doc.version || 'V1',
    colorPrimario: String(empresa.color_primario ?? '#14263F'),
    camposExtra: (empresa.campos_encabezado ?? []) as CampoEncabezado[],
    encabezadoConfig: (empresa.encabezado_config ?? null) as EncabezadoConfig | null,

    items,
    aplican: d.resumen?.aplican ?? 0,
    cumple: d.resumen?.cumple ?? 0,
    parcial: d.resumen?.parcial ?? 0,
    noCumple: d.resumen?.no_cumple ?? 0,
    sinEvaluar: d.resumen?.sin_evaluar ?? 0,

    generadoEl: new Date().toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' }),
  };

  const buffer = await renderToBuffer(<MatrizLegal d={datos} />);

  return {
    ok: true,
    buffer,
    nombreArchivo: `Matriz_legal_${datos.empresa.replace(/\s+/g, '_')}.pdf`,
    titulo: datos.titulo,
    empresa: datos.empresa,
  };
}
