/**
 * GENERADOR DEL ACTA DE RENDICIÓN DE CUENTAS
 * Usa detalle_rendicion(): la misma fuente que la pantalla.
 */
import { renderToBuffer } from '@react-pdf/renderer';
import { crearClienteServidor } from '../supabase/servidor';
import {
  ActaRendicion, type DatosRendicion,
  type CampoEncabezado, type ResponsablePdf,
} from './ActaRendicion';
import type { EncabezadoConfig } from './EncabezadoDoc';
import { resolverNomenclatura, leerMapa } from '../nomenclaturas';

export type ResultadoRendicion =
  | { ok: true; buffer: Buffer; nombreArchivo: string; titulo: string; empresa: string }
  | { ok: false; error: string };

async function descargarUrl(url: string): Promise<Buffer | null> {
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    return Buffer.from(await r.arrayBuffer());
  } catch { return null; }
}

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

export async function generarActaRendicion(id: string): Promise<ResultadoRendicion> {
  const supabase = await crearClienteServidor();

  const { data, error } = await supabase.rpc('detalle_rendicion', { p_id: id });
  if (error) return { ok: false, error: error.message };

  const d = data as {
    ok: boolean; error?: string;
    rendicion?: Record<string, unknown>;
    responsables?: Array<{
      nombre: string; cargo: string | null;
      responsabilidades: string | null; informe: string | null;
      firma_url: string | null; firmado_en: string | null;
    }>;
    empresa?: Record<string, unknown>;
  };

  if (!d.ok || !d.rendicion) {
    return { ok: false, error: d.error ?? 'Rendición no encontrada.' };
  }

  const r = d.rendicion;
  const em = d.empresa ?? {};
  const cerrada = r.estado === 'cerrada';

  const logo = em.logo_url ? await descargarUrl(String(em.logo_url)) : null;

  const gente = d.responsables ?? [];
  const firmas = await Promise.all(
    gente.map((q) => descargarFirma(supabase, q.firma_url))
  );

  const fechaCorta = (v: unknown) =>
    v ? new Date(String(v)).toLocaleDateString('es-CO', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    }) : null;

  const responsables: ResponsablePdf[] = gente.map((q, i) => ({
    nombre: q.nombre,
    cargo: q.cargo,
    responsabilidades: q.responsabilidades,
    informe: q.informe,
    firma: firmas[i],
    fecha: fechaCorta(q.firmado_en),
  }));

  const doc = resolverNomenclatura(
    { nomenclatura: r.nomenclatura as string, version: r.version_doc as string },
    leerMapa(em.nomenclaturas), 'rendicion', cerrada,
    { nomenclatura: em.nomenclatura as string, version: em.version_doc as string }
  );

  const datos: DatosRendicion = {
    empresa: String(em.nombre ?? ''),
    nit: (em.nit as string) ?? null,
    direccion: (em.direccion as string) ?? null,
    logo,

    codigo: String(r.codigo),
    titulo: String(r.titulo_doc ?? 'ACTA DE RENDICIÓN DE CUENTAS DEL SG-SST'),
    nomenclatura: doc.nomenclatura || '—',
    versionDoc: doc.version || 'V1',
    colorPrimario: String(em.color_primario ?? '#14263F'),
    camposExtra: (r.campos_encabezado ?? []) as CampoEncabezado[],
    encabezadoConfig: (r.encabezado_config ?? null) as EncabezadoConfig | null,

    anio: Number(r.anio),
    fecha: r.fecha
      ? new Date(String(r.fecha) + 'T12:00:00').toLocaleDateString('es-CO', {
          day: '2-digit', month: 'long', year: 'numeric',
        })
      : '—',
    alcance: (r.alcance as string) ?? null,
    logros: (r.logros as string) ?? null,
    dificultades: (r.dificultades as string) ?? null,
    compromisos: (r.compromisos as string) ?? null,

    responsables,
    cerrada,

    generadoEl: new Date().toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' }),
  };

  const buffer = await renderToBuffer(<ActaRendicion d={datos} />);

  return {
    ok: true,
    buffer,
    nombreArchivo: `Rendicion_cuentas_${datos.anio}_${datos.codigo}.pdf`,
    titulo: `${datos.titulo} ${datos.anio}`,
    empresa: datos.empresa,
  };
}
