/**
 * GENERADOR DEL INFORME DE INSPECCIÓN
 * ---------------------------------------------------------------
 * Usa detalle_inspeccion(): la misma fuente que alimenta la pantalla,
 * así el PDF nunca discrepa de lo que se ve.
 *
 * Dos orígenes de imagen distintos, por diseño:
 *  · las firmas viven en el bucket privado `firmas` → URL firmada
 *  · las fotos de hallazgos viven en `logos` (público) → fetch directo
 */
import { renderToBuffer } from '@react-pdf/renderer';
import { crearClienteServidor } from '../supabase/servidor';
import {
  InformeInspeccion,
  type DatosInforme, type RespuestaInforme, type CampoEncabezado,
  type AccionInforme,
} from './InformeInspeccion';
import { resolverEncabezado } from './resolverEncabezado';

export type ResultadoInforme =
  | { ok: true; buffer: Buffer; nombreArchivo: string; codigo: string }
  | { ok: false; error: string };

async function descargarUrl(url: string): Promise<Buffer | null> {
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    return Buffer.from(await r.arrayBuffer());
  } catch { return null; }
}

/** Las firmas están en bucket privado: hace falta URL firmada. */
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

type RespuestaRPC = {
  orden: number;
  seccion: string | null;
  criterio: string;
  critico: boolean;
  resultado: 'cumple' | 'no_cumple' | 'no_aplica' | null;
  hallazgo: string | null;
  foto_url: string | null;
};

export async function generarInformeInspeccion(
  inspeccionId: string
): Promise<ResultadoInforme> {
  const supabase = await crearClienteServidor();

  const { data, error } = await supabase.rpc('detalle_inspeccion', {
    p_inspeccion: inspeccionId,
  });
  if (error) return { ok: false, error: error.message };

  const d = data as {
    ok: boolean; error?: string;
    inspeccion?: Record<string, unknown>;
    respuestas?: RespuestaRPC[];
    resumen?: {
      total: number; respondidos: number;
      cumple: number; no_cumple: number; no_aplica: number;
      criticos_fallidos: number;
    };
  };

  if (!d.ok || !d.inspeccion) return { ok: false, error: d.error ?? 'Inspección no encontrada.' };

  const i = d.inspeccion;

  if (i.estado !== 'cerrada') {
    return { ok: false, error: 'El informe solo se genera cuando la inspección está cerrada.' };
  }

  // Membrete de la empresa
  const { data: empresa } = await supabase
    .from('empresas')
    .select('nombre, nit, direccion, logo_url, color_primario, encabezado_config')
    .eq('id', i.empresa_id as string)
    .maybeSingle();

  // PLAN DE ACCION: las acciones abiertas desde los hallazgos de esta
  // inspeccion. Se leen directo de la tabla (RLS ya acota por org) en
  // vez de por RPC, porque solo hacen falta seis campos.
  const { data: accionesBD } = await supabase
    .from('acciones_correctivas')
    .select('codigo, hallazgo, accion, responsable, severidad, fecha_limite')
    .eq('inspeccion_id', inspeccionId)
    .order('codigo');

  const acciones: AccionInforme[] = (accionesBD ?? []).map((a) => ({
    codigo: String(a.codigo),
    hallazgo: String(a.hallazgo),
    accion: String(a.accion),
    responsable: String(a.responsable),
    severidad: String(a.severidad),
    // Fecha sola, sin hora: fecha_limite es un date y new Date() lo
    // interpretaria en UTC, corriendo el dia en Colombia.
    fechaLimite: String(a.fecha_limite).split('T')[0],
  }));

  const respuestasRPC = d.respuestas ?? [];

  // Fotos: solo las de los incumplimientos (las demás no tienen)
  const fotos = await Promise.all(
    respuestasRPC.map((r) =>
      r.foto_url && r.resultado === 'no_cumple' ? descargarUrl(r.foto_url) : Promise.resolve(null)
    )
  );

  const [logo, firmaInspector, firmaAcompanante] = await Promise.all([
    empresa?.logo_url ? descargarUrl(empresa.logo_url) : Promise.resolve(null),
    descargarFirma(supabase, (i.firma_inspector_url as string) ?? null),
    descargarFirma(supabase, (i.firma_acompanante_url as string) ?? null),
  ]);

  const respuestas: RespuestaInforme[] = respuestasRPC.map((r, idx) => ({
    orden: r.orden,
    seccion: r.seccion,
    criterio: r.criterio,
    critico: r.critico,
    resultado: r.resultado,
    hallazgo: r.hallazgo,
    foto: fotos[idx],
  }));

  const resumen = d.resumen ?? {
    total: 0, respondidos: 0, cumple: 0, no_cumple: 0, no_aplica: 0, criticos_fallidos: 0,
  };

  const datos: DatosInforme = {
    empresa: empresa?.nombre ?? '',
    nit: empresa?.nit ?? null,
    direccion: empresa?.direccion ?? null,
    logo,

    codigo: String(i.codigo),
    titulo: String(i.titulo_doc ?? 'INFORME DE INSPECCIÓN'),
    nomenclatura: String(i.nomenclatura ?? '—'),
    versionDoc: String(i.version_doc ?? 'V1'),
    colorPrimario: empresa?.color_primario ?? '#14263F',
    camposExtra: (i.campos_encabezado ?? []) as CampoEncabezado[],
    // Ya esta cerrada (se valida arriba), asi que manda el congelado.
    // El vigente solo cubre las inspecciones anteriores a esta funcion,
    // que no llegaron a guardar ninguno.
    encabezadoConfig: resolverEncabezado(
      i.encabezado_config, empresa?.encabezado_config, true),

    nombre: String(i.nombre),
    tipo: String(i.tipo),
    norma: (i.norma as string) ?? null,
    objetoNombre: (i.objeto_nombre as string) ?? null,
    inspector: String(i.inspector),
    acompanante: (i.acompanante as string) ?? null,
    fecha: new Date(String(i.fecha))
      .toLocaleString('es-CO', { dateStyle: 'long', timeStyle: 'short' }),
    observaciones: (i.observaciones as string) ?? null,

    puntaje: Number(i.puntaje ?? 0),
    cumple: Boolean(i.cumple),
    totalAplicables: resumen.total - resumen.no_aplica,
    cumplen: resumen.cumple,
    noAplican: resumen.no_aplica,
    criticosFallidos: resumen.criticos_fallidos,

    respuestas,
    acciones,

    firmaInspector,
    firmaAcompanante,

    generadoEl: new Date().toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' }),
  };

  const buffer = await renderToBuffer(<InformeInspeccion d={datos} />);
  const objeto = datos.objetoNombre
    ? '_' + datos.objetoNombre.replace(/[^a-zA-Z0-9 ]/g, '').trim().replace(/\s+/g, '_')
    : '';

  return {
    ok: true,
    buffer,
    nombreArchivo: `Inspeccion_${datos.codigo}${objeto}.pdf`,
    codigo: datos.codigo,
  };
}
