/**
 * GENERADOR DEL ACTA DE CONFORMACIÓN
 * Usa detalle_comite(): la misma fuente que la pantalla y el organigrama.
 */
import { renderToBuffer } from '@react-pdf/renderer';
import { crearClienteServidor } from '../supabase/servidor';
import {
  ActaComite, type DatosActaComite,
  type CampoEncabezado, type IntegrantePdf,
} from './ActaComite';
import type { EncabezadoConfig } from './EncabezadoDoc';

export type ResultadoActaComite =
  | { ok: true; buffer: Buffer; nombreArchivo: string; titulo: string; empresa: string }
  | { ok: false; error: string };

const TIPOS: Record<string, { nombre: string; norma: string }> = {
  copasst: { nombre: 'COPASST', norma: 'la Resolución 2013 de 1986' },
  vigia: { nombre: 'Vigía en SST', norma: 'el Decreto 1295 de 1994, art. 35' },
  convivencia: {
    nombre: 'Comité de Convivencia Laboral',
    norma: 'la Resolución 652 de 2012, modificada por la 1356 de 2012',
  },
  brigada: {
    nombre: 'Brigada de emergencia',
    norma: 'el Decreto 1072 de 2015, art. 2.2.4.6.25',
  },
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

export async function generarActaComite(comiteId: string): Promise<ResultadoActaComite> {
  const supabase = await crearClienteServidor();

  const { data, error } = await supabase.rpc('detalle_comite', { p_comite: comiteId });
  if (error) return { ok: false, error: error.message };

  const d = data as {
    ok: boolean; error?: string;
    comite?: Record<string, unknown>;
    miembros?: Array<{
      nombre: string; identificacion: string | null; cargo_empresa: string | null;
      parte: string; suplente: boolean; rol: string; frente: string | null;
      firma_url: string | null; firmado_en: string | null; activo: boolean;
    }>;
    validacion?: {
      conforme: boolean; fallas: string[];
      requerido: { trabajadores: number; nota: string };
    };
    empresa?: Record<string, unknown>;
  };

  if (!d.ok || !d.comite) return { ok: false, error: d.error ?? 'Comité no encontrado.' };

  const c = d.comite;
  const em = d.empresa ?? {};
  const tipo = TIPOS[String(c.tipo)] ?? { nombre: String(c.tipo), norma: 'la norma aplicable' };

  const logo = em.logo_url ? await descargarUrl(String(em.logo_url)) : null;

  // Solo los activos firman: quien salió sigue en el acta original, no
  // en esta.
  const activos = (d.miembros ?? []).filter((m) => m.activo);
  const firmas = await Promise.all(
    activos.map((m) => descargarFirma(supabase, m.firma_url))
  );

  const fecha = (v: unknown) =>
    v ? new Date(String(v) + 'T12:00:00').toLocaleDateString('es-CO', {
      day: '2-digit', month: 'long', year: 'numeric',
    }) : '—';

  const fechaCorta = (v: unknown) =>
    v ? new Date(String(v)).toLocaleDateString('es-CO', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    }) : null;

  const integrantes: IntegrantePdf[] = activos.map((m, i) => ({
    nombre: m.nombre,
    identificacion: m.identificacion,
    cargo: m.cargo_empresa,
    parte: m.parte,
    suplente: m.suplente,
    rol: m.rol,
    frente: m.frente,
    firma: firmas[i],
    fecha: fechaCorta(m.firmado_en),
  }));

  const datos: DatosActaComite = {
    empresa: String(em.nombre ?? ''),
    nit: (em.nit as string) ?? null,
    direccion: (em.direccion as string) ?? null,
    logo,

    codigo: String(c.codigo),
    titulo: String(c.titulo_doc ?? 'ACTA DE CONFORMACIÓN'),
    nomenclatura: String(c.nomenclatura ?? '—'),
    versionDoc: String(c.version_doc ?? 'V1'),
    colorPrimario: String(em.color_primario ?? '#14263F'),
    camposExtra: (c.campos_encabezado ?? []) as CampoEncabezado[],
    encabezadoConfig: (c.encabezado_config ?? null) as EncabezadoConfig | null,

    tipoComite: tipo.nombre,
    norma: tipo.norma,
    fechaConformacion: fecha(c.fecha_conformacion),
    periodo: `${fecha(c.periodo_inicio)} a ${fecha(c.periodo_fin)}`,
    lugar: (c.acta_lugar as string) ?? null,
    formaEleccion: (c.acta_forma_eleccion as string) ?? null,
    observaciones: (c.observaciones as string) ?? null,

    trabajadores: d.validacion?.requerido?.trabajadores ?? 0,
    exigido: d.validacion?.requerido?.nota ?? '—',
    conforme: d.validacion?.conforme ?? false,
    fallas: d.validacion?.fallas ?? [],

    integrantes,
    cerrada: c.acta_estado === 'cerrada',

    generadoEl: new Date().toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' }),
  };

  const buffer = await renderToBuffer(<ActaComite d={datos} />);

  return {
    ok: true,
    buffer,
    nombreArchivo: `Acta_${tipo.nombre.replace(/\s+/g, '_')}_${datos.codigo}.pdf`,
    titulo: `${datos.titulo} — ${tipo.nombre}`,
    empresa: datos.empresa,
  };
}
