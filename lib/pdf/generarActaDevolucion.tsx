/**
 * GENERADOR DEL ACTA DE DEVOLUCIÓN
 * Usa detalle_devolucion(): la misma fuente que alimenta la pantalla,
 * así el PDF nunca discrepa de lo que se ve.
 */
import { renderToBuffer } from '@react-pdf/renderer';
import { crearClienteServidor } from '../supabase/servidor';
import {
  ActaDevolucion,
  type DatosActaDevolucion,
  type CampoEncabezado,
} from './ActaDevolucion';
import type { EncabezadoConfig } from './EncabezadoDoc';

export type ResultadoActaDevolucion =
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

export async function generarActaDevolucion(
  itemId: string
): Promise<ResultadoActaDevolucion> {
  const supabase = await crearClienteServidor();

  const { data, error } = await supabase.rpc('detalle_devolucion', { p_item: itemId });
  if (error) return { ok: false, error: error.message };

  const d = data as {
    ok: boolean; error?: string;
    devolucion?: Record<string, unknown>;
  };
  if (!d.ok || !d.devolucion) {
    return { ok: false, error: d.error ?? 'Devolución no encontrada.' };
  }

  const v = d.devolucion;

  const { data: empresa } = await supabase
    .from('empresas')
    .select('nombre, nit, direccion, logo_url, color_primario')
    .eq('id', v.empresa_id as string)
    .maybeSingle();

  const [logo, firmaDevuelve, foto] = await Promise.all([
    empresa?.logo_url ? descargarUrl(empresa.logo_url) : Promise.resolve(null),
    descargarFirma(supabase, (v.firma_devuelve_url as string) ?? null),
    v.foto_url ? descargarUrl(v.foto_url as string) : Promise.resolve(null),
  ]);

  const fecha = (iso: unknown) =>
    new Date(String(iso)).toLocaleString('es-CO', { dateStyle: 'long', timeStyle: 'short' });

  const datos: DatosActaDevolucion = {
    empresa: empresa?.nombre ?? '',
    nit: empresa?.nit ?? null,
    direccion: empresa?.direccion ?? null,
    logo,

    codigo: String(v.codigo),
    titulo: 'FORMATO DE DEVOLUCIÓN DE DOTACIÓN',
    nomenclatura: String(v.nomenclatura ?? '—'),
    versionDoc: String(v.version_doc ?? 'V1'),
    colorPrimario: empresa?.color_primario ?? '#14263F',
    camposExtra: (v.campos_encabezado ?? []) as CampoEncabezado[],
    // Congelado al devolver: la devolución ya ocurrió, no es un borrador.
    encabezadoConfig: (v.encabezado_config ?? null) as EncabezadoConfig | null,

    nombres: String(v.nombres),
    identificacion: String(v.identificacion),
    cargo: (v.cargo as string) ?? null,
    area: (v.area as string) ?? null,

    entregaCodigo: String(v.entrega_codigo),
    fechaEntrega: fecha(v.fecha_entrega),
    fechaDevolucion: fecha(v.fecha_devolucion),
    diasUso: Number(v.dias_uso ?? 0),
    entregadoPor: String(v.entregado_por ?? '—'),
    recibidoPor: String(v.recibido_por ?? '—'),

    articulo: String(v.articulo),
    articuloCodigo: String(v.articulo_codigo),
    placa: (v.placa as string) ?? null,
    serial: (v.serial as string) ?? null,
    accesorios: (v.accesorios as string) ?? null,

    estadoEntrega: (v.estado_entrega as string) ?? null,
    estadoDevolucion: (v.estado_devolucion as string) ?? null,
    destinoUnidad: (v.estado_unidad as string) ?? null,
    observaciones: (v.observaciones as string) ?? null,
    foto,

    firmaDevuelve,

    generadoEl: new Date().toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' }),
  };

  const buffer = await renderToBuffer(<ActaDevolucion d={datos} />);
  const limpio = String(v.nombres).replace(/[^a-zA-Z0-9 ]/g, '').trim().replace(/\s+/g, '_');

  return {
    ok: true,
    buffer,
    nombreArchivo: `Devolucion_${v.codigo}_${limpio}.pdf`,
    codigo: String(v.codigo),
    nombres: String(v.nombres),
  };
}
