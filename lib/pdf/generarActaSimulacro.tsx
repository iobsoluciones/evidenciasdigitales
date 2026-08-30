/**
 * GENERADOR DEL ACTA DE SIMULACRO
 * Usa detalle_simulacro(): la misma fuente que la pantalla.
 */
import { renderToBuffer } from '@react-pdf/renderer';
import { crearClienteServidor } from '../supabase/servidor';
import {
  ActaSimulacro, type DatosActa,
  type CampoEncabezado, type FirmaPdf,
} from './ActaSimulacro';
import type { EncabezadoConfig } from './EncabezadoDoc';
import { resolverNomenclatura, leerMapa } from '../nomenclaturas';

export type ResultadoActa =
  | { ok: true; buffer: Buffer; nombreArchivo: string; titulo: string; empresa: string }
  | { ok: false; error: string };

const TIPOS: Record<string, string> = {
  evacuacion: 'Evacuación',
  incendio: 'Conato de incendio',
  sismo: 'Sismo',
  primeros_auxilios: 'Primeros auxilios',
  derrame: 'Derrame de químicos',
  otro: 'Otro',
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

/** Segundos a «2 min 35 s», que es como se lee un tiempo de evacuación. */
function formatearTiempo(seg: number | null): string {
  if (seg === null || seg === undefined) return '—';
  if (seg < 60) return `${seg} s`;
  const m = Math.floor(seg / 60);
  const s = seg % 60;
  return s === 0 ? `${m} min` : `${m} min ${s} s`;
}

export async function generarActaSimulacro(id: string): Promise<ResultadoActa> {
  const supabase = await crearClienteServidor();

  const { data, error } = await supabase.rpc('detalle_simulacro', { p_id: id });
  if (error) return { ok: false, error: error.message };

  const d = data as {
    ok: boolean; error?: string;
    simulacro?: Record<string, unknown>;
    amenaza?: string | null;
    evaluadores?: Array<{
      nombre: string; cargo: string | null; rol: string;
      firma_url: string | null; firmado_en: string | null;
    }>;
    empresa?: Record<string, unknown>;
  };

  if (!d.ok || !d.simulacro) {
    return { ok: false, error: d.error ?? 'Simulacro no encontrado.' };
  }

  const s = d.simulacro;
  const em = d.empresa ?? {};
  const cerrado = s.estado === 'cerrado';

  const logo = em.logo_url ? await descargarUrl(String(em.logo_url)) : null;

  const evaluadores = d.evaluadores ?? [];
  const firmasBuf = await Promise.all(
    evaluadores.map((q) => descargarFirma(supabase, q.firma_url))
  );

  const fechaCorta = (v: unknown) =>
    v ? new Date(String(v)).toLocaleDateString('es-CO', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    }) : null;

  const firmas: FirmaPdf[] = evaluadores.map((q, i) => ({
    nombre: q.nombre,
    cargo: q.cargo,
    rol: q.rol,
    firma: firmasBuf[i],
    fecha: fechaCorta(q.firmado_en),
  }));

  // Se congela al EMITIR (§5.14): mientras sea borrador se muestra lo
  // vigente de la empresa; una vez cerrada manda lo que quedó estampado.
  const doc = resolverNomenclatura(
    { nomenclatura: s.nomenclatura as string, version: s.version_doc as string },
    leerMapa(em.nomenclaturas), 'simulacro', cerrado,
    { nomenclatura: em.nomenclatura as string, version: em.version_doc as string }
  );

  const participantes = Number(s.participantes ?? 0);
  const evacuados = Number(s.evacuados ?? 0);

  const datos: DatosActa = {
    empresa: String(em.nombre ?? ''),
    nit: (em.nit as string) ?? null,
    direccion: (em.direccion as string) ?? null,
    logo,

    codigo: String(s.codigo),
    titulo: String(s.titulo_doc ?? 'ACTA DE SIMULACRO'),
    nomenclatura: doc.nomenclatura || '—',
    versionDoc: doc.version || 'V1',
    colorPrimario: String(em.color_primario ?? '#14263F'),
    camposExtra: (s.campos_encabezado ?? []) as CampoEncabezado[],
    encabezadoConfig: (s.encabezado_config ?? null) as EncabezadoConfig | null,

    fecha: s.fecha
      ? new Date(String(s.fecha) + 'T12:00:00').toLocaleDateString('es-CO', {
          day: '2-digit', month: 'long', year: 'numeric',
        })
      : '—',
    hora: (s.hora_inicio as string)?.slice(0, 5) ?? '—',
    tipo: TIPOS[String(s.tipo)] ?? String(s.tipo),
    amenaza: d.amenaza ?? null,
    alcance: (s.alcance as string) ?? null,
    puntoEncuentro: (s.punto_encuentro as string) ?? null,

    participantes,
    evacuados,
    tiempo: formatearTiempo(s.tiempo_evacuacion_seg as number | null),
    cobertura: participantes > 0
      ? `${Math.round((evacuados / participantes) * 100)}%`
      : '—',

    aciertos: (s.aciertos as string) ?? null,
    oportunidades: (s.oportunidades as string) ?? null,
    observaciones: (s.observaciones as string) ?? null,

    firmas,
    cerrado,

    generadoEl: new Date().toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' }),
  };

  const buffer = await renderToBuffer(<ActaSimulacro d={datos} />);

  return {
    ok: true,
    buffer,
    nombreArchivo: `Acta_simulacro_${datos.codigo}.pdf`,
    titulo: `${datos.titulo} ${datos.codigo}`,
    empresa: datos.empresa,
  };
}
