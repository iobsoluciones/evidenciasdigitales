/**
 * GENERADOR DEL ACTA DE ENTREGA
 * Usa detalle_entrega(): la misma fuente que alimenta la pantalla,
 * así el PDF nunca discrepa de lo que se ve.
 */
import { renderToBuffer } from '@react-pdf/renderer';
import { crearClienteServidor } from '../supabase/servidor';
import { ActaEntrega, type DatosActa, type ItemActa, type CampoEncabezado } from './ActaEntrega';

export type ResultadoActa =
  | { ok: true; buffer: Buffer; nombreArchivo: string; codigo: string; nombres: string }
  | { ok: false; error: string };

async function descargarUrl(url: string): Promise<Buffer | null> {
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    return Buffer.from(await r.arrayBuffer());
  } catch { return null; }
}

/** Las firmas viven en un bucket privado: hace falta URL firmada. */
async function descargarFirma(
  supabase: Awaited<ReturnType<typeof crearClienteServidor>>,
  ruta: string | null
): Promise<Buffer | null> {
  if (!ruta) return null;
  const limpia = ruta.includes('/firmas/') ? ruta.split('/firmas/')[1] : ruta;
  const { data } = await supabase.storage.from('firmas').createSignedUrl(limpia, 120);
  if (!data?.signedUrl) return null;
  return descargarUrl(data.signedUrl);
}

export async function generarActaEntrega(entregaId: string): Promise<ResultadoActa> {
  const supabase = await crearClienteServidor();

  const { data, error } = await supabase.rpc('detalle_entrega', { p_entrega: entregaId });
  if (error) return { ok: false, error: error.message };

  const d = data as {
    ok: boolean; error?: string;
    entrega?: Record<string, unknown>;
    items?: ItemActa[];
  };

  if (!d.ok || !d.entrega) return { ok: false, error: d.error ?? 'Entrega no encontrada.' };

  const e = d.entrega;

  // Datos de la empresa para el membrete
  const { data: empresa } = await supabase
    .from('empresas')
    .select('nombre, nit, direccion, logo_url, color_primario')
    .eq('id', e.empresa_id as string)
    .maybeSingle();

  const [logo, firmaRecibe, firmaEntrega] = await Promise.all([
    empresa?.logo_url ? descargarUrl(empresa.logo_url) : Promise.resolve(null),
    descargarFirma(supabase, (e.firma_recibe_url as string) ?? null),
    descargarFirma(supabase, (e.firma_entrega_url as string) ?? null),
  ]);

  const datos: DatosActa = {
    empresa: empresa?.nombre ?? '',
    nit: empresa?.nit ?? null,
    direccion: empresa?.direccion ?? null,
    logo,

    codigo: String(e.codigo),
    titulo: String(e.titulo_doc ?? 'FORMATO DE ENTREGA DE DOTACIÓN'),
    nomenclatura: String(e.nomenclatura ?? '—'),
    versionDoc: String(e.version_doc ?? 'V1'),
    colorPrimario: empresa?.color_primario ?? '#14263F',
    camposExtra: (e.campos_encabezado ?? []) as CampoEncabezado[],

    nombres: String(e.nombres),
    identificacion: String(e.identificacion),
    cargo: (e.cargo as string) ?? null,
    area: (e.area as string) ?? null,
    entregadoPor: String(e.entregado_por),
    observaciones: (e.observaciones as string) ?? null,
    fechaEntrega: new Date(String(e.fecha_entrega))
      .toLocaleString('es-CO', { dateStyle: 'long', timeStyle: 'short' }),

    declaracion: (e.declaracion as string) ?? null,
    items: d.items ?? [],

    firmaRecibe,
    firmaEntrega,

    generadoEl: new Date().toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' }),
  };

  const buffer = await renderToBuffer(<ActaEntrega d={datos} />);
  const limpio = String(e.nombres).replace(/[^a-zA-Z0-9 ]/g, '').trim().replace(/\s+/g, '_');

  return {
    ok: true,
    buffer,
    nombreArchivo: `Entrega_${e.codigo}_${limpio}.pdf`,
    codigo: String(e.codigo),
    nombres: String(e.nombres),
  };
}
