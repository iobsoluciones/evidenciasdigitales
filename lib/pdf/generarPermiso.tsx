/**
 * GENERADOR DEL PERMISO DE TRABAJO
 * Usa detalle_permiso(): la misma fuente que la pantalla.
 */
import { renderToBuffer } from '@react-pdf/renderer';
import { crearClienteServidor } from '../supabase/servidor';
import {
  PermisoTrabajo, type DatosPermiso,
  type CampoEncabezado, type RequisitoPdf, type PersonaPdf,
} from './PermisoTrabajo';
import type { EncabezadoConfig } from './EncabezadoDoc';
import { resolverNomenclatura, leerMapa } from '../nomenclaturas';

export type ResultadoPermiso =
  | { ok: true; buffer: Buffer; nombreArchivo: string; titulo: string; empresa: string }
  | { ok: false; error: string };

const TIPOS: Record<string, string> = {
  alturas: 'Trabajo en alturas',
  espacios_confinados: 'Espacios confinados',
  trabajo_caliente: 'Trabajo en caliente',
  energias: 'Energías peligrosas (bloqueo y etiquetado)',
  izaje: 'Izaje de cargas',
  excavacion: 'Excavación',
};

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

export async function generarPermiso(id: string): Promise<ResultadoPermiso> {
  const supabase = await crearClienteServidor();

  const { data, error } = await supabase.rpc('detalle_permiso', { p_id: id });
  if (error) return { ok: false, error: error.message };

  const d = data as {
    ok: boolean; error?: string;
    permiso?: Record<string, unknown>;
    requisitos?: RequisitoPdf[];
    participantes?: Array<{
      nombre: string; identificacion: string | null; cargo: string | null;
      rol: string; apto: boolean | null; aptitud_detalle: string | null;
      firma_url: string | null; firmado_en: string | null;
    }>;
    empresa?: Record<string, unknown>;
  };

  if (!d.ok || !d.permiso) {
    return { ok: false, error: d.error ?? 'Permiso no encontrado.' };
  }

  const p = d.permiso;
  const em = d.empresa ?? {};
  const emitido = p.estado !== 'borrador';

  const logo = em.logo_url ? await descargarUrl(String(em.logo_url)) : null;

  const gente = d.participantes ?? [];
  const firmas = await Promise.all(
    gente.map((q) => descargarFirma(supabase, q.firma_url))
  );

  const fechaCorta = (v: unknown) =>
    v ? new Date(String(v)).toLocaleDateString('es-CO', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    }) : null;

  const personas: PersonaPdf[] = gente.map((q, i) => ({
    nombre: q.nombre,
    identificacion: q.identificacion,
    cargo: q.cargo,
    rol: q.rol,
    apto: q.apto,
    aptitudDetalle: q.aptitud_detalle,
    firma: firmas[i],
    fecha: fechaCorta(q.firmado_en),
  }));

  const doc = resolverNomenclatura(
    { nomenclatura: p.nomenclatura as string, version: p.version_doc as string },
    leerMapa(em.nomenclaturas), 'permiso', emitido,
    { nomenclatura: em.nomenclatura as string, version: em.version_doc as string }
  );

  const hora = (v: unknown) => String(v ?? '').slice(0, 5);
  const vencido = p.vencido === true;

  const ESTADOS: Record<string, string> = {
    borrador: 'BORRADOR',
    autorizado: 'AUTORIZADO',
    cerrado: 'CERRADO',
    cancelado: 'CANCELADO',
  };

  const detalleEstado = vencido
    ? 'La franja horaria terminó: este permiso ya no autoriza la tarea.'
    : p.estado === 'borrador'
      ? 'Sin autorizar: no habilita ninguna tarea todavía.'
      : p.estado === 'autorizado'
        ? `Autoriza la tarea únicamente entre ${hora(p.hora_inicio)} y ${hora(p.hora_fin)} del día indicado.`
        : p.estado === 'cerrado'
          ? 'Tarea terminada y área verificada.'
          : 'Permiso cancelado.';

  const datos: DatosPermiso = {
    empresa: String(em.nombre ?? ''),
    nit: (em.nit as string) ?? null,
    direccion: (em.direccion as string) ?? null,
    logo,

    codigo: String(p.codigo),
    titulo: String(p.titulo_doc ?? 'PERMISO DE TRABAJO DE ALTO RIESGO'),
    nomenclatura: doc.nomenclatura || '—',
    versionDoc: doc.version || 'V1',
    colorPrimario: String(em.color_primario ?? '#14263F'),
    camposExtra: (p.campos_encabezado ?? []) as CampoEncabezado[],
    encabezadoConfig: (p.encabezado_config ?? null) as EncabezadoConfig | null,

    tipo: TIPOS[String(p.tipo)] ?? String(p.tipo),
    fecha: p.fecha
      ? new Date(String(p.fecha) + 'T12:00:00').toLocaleDateString('es-CO', {
          day: '2-digit', month: 'long', year: 'numeric',
        })
      : '—',
    horario: `${hora(p.hora_inicio)} a ${hora(p.hora_fin)}`,
    lugar: (p.lugar as string) ?? null,
    descripcion: String(p.descripcion ?? ''),
    ejecutor: p.ejecutor === 'contratista'
      ? `Contratista: ${p.contratista ?? 'sin nombre'}`
      : 'Personal propio',
    altura: p.altura_m ? `${p.altura_m} m` : null,
    medicion: (p.medicion_atmosfera as string) ?? null,

    estado: ESTADOS[String(p.estado)] ?? String(p.estado).toUpperCase(),
    estadoDetalle: detalleEstado,
    vencido,

    requisitos: d.requisitos ?? [],
    personas,

    aptitudJustificacion: (p.aptitud_justificacion as string) ?? null,
    cierre: (p.cierre_observaciones as string) ?? null,
    cancelado: (p.cancelado_motivo as string) ?? null,

    generadoEl: new Date().toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' }),
  };

  const buffer = await renderToBuffer(<PermisoTrabajo d={datos} />);

  return {
    ok: true,
    buffer,
    nombreArchivo: `Permiso_${datos.codigo}.pdf`,
    titulo: `${datos.titulo} ${datos.codigo}`,
    empresa: datos.empresa,
  };
}
