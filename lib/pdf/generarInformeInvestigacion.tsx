/**
 * GENERADOR DEL INFORME DE INVESTIGACIÓN
 * Usa detalle_evento(): la misma fuente que alimenta la pantalla, así
 * el PDF nunca discrepa de lo que se ve.
 */
import { renderToBuffer } from '@react-pdf/renderer';
import { crearClienteServidor } from '../supabase/servidor';
import {
  InformeInvestigacion,
  type DatosInvestigacion,
  type CampoEncabezado,
  type CausaPdf,
  type MiembroPdf,
} from './InformeInvestigacion';
import type { EncabezadoConfig } from './EncabezadoDoc';

export type ResultadoInforme =
  | { ok: true; buffer: Buffer; nombreArchivo: string; codigo: string }
  | { ok: false; error: string };

const TIPOS: Record<string, string> = {
  accidente: 'Accidente de trabajo',
  incidente: 'Incidente',
  casi_accidente: 'Casi accidente',
  enfermedad: 'Enfermedad laboral',
};

const METODOS: Record<string, string> = {
  '5_porques': 'Cinco porqués',
  arbol_causas: 'Árbol de causas',
  espina_pescado: 'Espina de pescado',
};

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

export async function generarInformeInvestigacion(
  eventoId: string
): Promise<ResultadoInforme> {
  const supabase = await crearClienteServidor();

  const { data, error } = await supabase.rpc('detalle_evento', { p_evento: eventoId });
  if (error) return { ok: false, error: error.message };

  const d = data as {
    ok: boolean; error?: string;
    evento?: Record<string, unknown>;
    investigacion?: Record<string, unknown>;
    equipo?: Array<{ nombre: string; cargo: string | null; rol: string; firma_url: string | null }>;
    testigos?: Array<{ nombre: string; identificacion: string | null; version: string | null }>;
    acciones?: Array<{ codigo: string; accion: string; responsable: string; fecha_limite: string }>;
    empresa?: Record<string, unknown>;
  };

  if (!d.ok || !d.evento) return { ok: false, error: d.error ?? 'Evento no encontrado.' };

  const ev = d.evento;
  const inv = d.investigacion ?? {};
  const em = d.empresa ?? {};

  const [logo, ...firmas] = await Promise.all([
    em.logo_url ? descargarUrl(String(em.logo_url)) : Promise.resolve(null),
    ...(d.equipo ?? []).map((m) => descargarFirma(supabase, m.firma_url)),
  ]);

  const equipo: MiembroPdf[] = (d.equipo ?? []).map((m, i) => ({
    nombre: m.nombre,
    cargo: m.cargo,
    rol: m.rol,
    firma: firmas[i] ?? null,
  }));

  const fecha = (iso: unknown) =>
    iso ? new Date(String(iso)).toLocaleString('es-CO', { dateStyle: 'long', timeStyle: 'short' }) : '—';

  const datos: DatosInvestigacion = {
    empresa: String(em.nombre ?? ''),
    nit: (em.nit as string) ?? null,
    direccion: (em.direccion as string) ?? null,
    logo,

    codigo: String(ev.codigo),
    titulo: String(ev.titulo_doc ?? 'INFORME DE INVESTIGACIÓN DE EVENTO'),
    nomenclatura: String(ev.nomenclatura ?? '—'),
    versionDoc: String(ev.version_doc ?? 'V1'),
    colorPrimario: String(em.color_primario ?? '#14263F'),
    camposExtra: (ev.campos_encabezado ?? []) as CampoEncabezado[],
    // Congelado al cerrar la investigación, como el resto de documentos.
    encabezadoConfig: (ev.encabezado_config ?? null) as EncabezadoConfig | null,

    tipo: TIPOS[String(ev.tipo)] ?? String(ev.tipo),
    fechaEvento: fecha(ev.fecha_evento),
    fechaReporte: fecha(ev.fecha_reporte),
    lugar: (ev.lugar as string) ?? null,

    nombres: (ev.nombres as string) ?? null,
    identificacion: (ev.identificacion as string) ?? null,
    cargo: (ev.cargo as string) ?? null,
    area: (ev.area as string) ?? null,

    descripcion: String(ev.descripcion ?? ''),
    parteCuerpo: (ev.parte_cuerpo as string) ?? null,
    mecanismo: (ev.mecanismo as string) ?? null,
    diasIncapacidad: Number(ev.dias_incapacidad ?? 0),
    gravedad: ev.mortal ? 'Mortal' : ev.grave ? 'Grave' : 'Leve',
    reportadoArl: Boolean(ev.reportado_arl),
    numeroFurat: (ev.numero_furat as string) ?? null,

    metodologia: METODOS[String(inv.metodologia)] ?? String(inv.metodologia ?? '—'),
    causasInmediatas: (inv.causas_inmediatas ?? []) as CausaPdf[],
    causasBasicas: (inv.causas_basicas ?? []) as CausaPdf[],
    conclusiones: (inv.conclusiones as string) ?? null,

    testigos: d.testigos ?? [],
    acciones: d.acciones ?? [],
    equipo,

    fechaCierre: (inv.fecha_cierre as string) ?? null,
    generadoEl: new Date().toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' }),
  };

  const buffer = await renderToBuffer(<InformeInvestigacion d={datos} />);

  return {
    ok: true,
    buffer,
    nombreArchivo: `Investigacion_${ev.codigo}.pdf`,
    codigo: String(ev.codigo),
  };
}
