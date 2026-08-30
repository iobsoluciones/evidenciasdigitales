/**
 * GENERADOR DEL ORGANIGRAMA DEL COMITÉ
 * Usa detalle_comite(): la misma fuente que alimenta la pantalla.
 */
import { renderToBuffer } from '@react-pdf/renderer';
import { crearClienteServidor } from '../supabase/servidor';
import {
  Organigrama, type DatosOrganigrama,
  type CampoEncabezado, type MiembroPdf,
} from './Organigrama';
import type { EncabezadoConfig } from './EncabezadoDoc';

export type ResultadoOrganigrama =
  | { ok: true; buffer: Buffer; nombreArchivo: string; titulo: string; empresa: string }
  | { ok: false; error: string };

const TIPOS: Record<string, { nombre: string; norma: string }> = {
  copasst: {
    nombre: 'COPASST',
    norma: 'Resolución 2013 de 1986',
  },
  vigia: {
    nombre: 'Vigía en SST',
    norma: 'Decreto 1295 de 1994, art. 35',
  },
  convivencia: {
    nombre: 'Comité de Convivencia Laboral',
    norma: 'Resolución 652 de 2012, modificada por la 1356 de 2012',
  },
  brigada: {
    nombre: 'Brigada de emergencia',
    norma: 'Decreto 1072 de 2015, art. 2.2.4.6.25 · Res. 0312 est. 5.1.2',
  },
};

const FRENTES: Array<{ v: string; t: string }> = [
  { v: 'primeros_auxilios', t: 'PRIMEROS AUXILIOS' },
  { v: 'incendios', t: 'CONTROL DE INCENDIOS' },
  { v: 'evacuacion', t: 'EVACUACIÓN Y RESCATE' },
];

async function descargarUrl(url: string): Promise<Buffer | null> {
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    return Buffer.from(await r.arrayBuffer());
  } catch { return null; }
}

export async function generarOrganigrama(comiteId: string): Promise<ResultadoOrganigrama> {
  const supabase = await crearClienteServidor();

  const { data, error } = await supabase.rpc('detalle_comite', { p_comite: comiteId });
  if (error) return { ok: false, error: error.message };

  const d = data as {
    ok: boolean; error?: string;
    comite?: Record<string, unknown>;
    miembros?: Array<{
      nombre: string; identificacion: string | null; cargo_empresa: string | null;
      foto_url: string | null; parte: string; suplente: boolean;
      rol: string; frente: string | null; activo: boolean;
    }>;
    empresa?: Record<string, unknown>;
  };

  if (!d.ok || !d.comite) return { ok: false, error: d.error ?? 'Comité no encontrado.' };

  const c = d.comite;
  const em = d.empresa ?? {};
  // Solo los activos: quien se retiró sigue en el acta pero no en la
  // cartelera, que muestra quién responde HOY.
  const activos = (d.miembros ?? []).filter((m) => m.activo);

  const fotos = await Promise.all(
    activos.map((m) => (m.foto_url ? descargarUrl(m.foto_url) : Promise.resolve(null)))
  );
  const logo = em.logo_url ? await descargarUrl(String(em.logo_url)) : null;

  const aPdf = (m: (typeof activos)[number], i: number): MiembroPdf => ({
    nombre: m.nombre,
    identificacion: m.identificacion,
    cargo: m.cargo_empresa,
    rol: m.rol,
    suplente: m.suplente,
    foto: fotos[i] ?? null,
  });

  const esBrigada = String(c.tipo) === 'brigada';
  const enPdf = activos.map(aPdf);

  // La brigada se agrupa por frente; los demás comités, por parte.
  const columnas = esBrigada
    ? [
        ...FRENTES.map((f) => ({
          titulo: f.t,
          miembros: enPdf.filter((_, i) => activos[i].frente === f.v),
        })),
        {
          titulo: 'SIN FRENTE ASIGNADO',
          miembros: enPdf.filter((_, i) => !activos[i].frente),
        },
      ].filter((col, i) => i < 3 || col.miembros.length > 0)
    : [
        {
          titulo: 'REPRESENTANTES DEL EMPLEADOR',
          miembros: enPdf.filter((_, i) => activos[i].parte === 'empleador'),
        },
        {
          titulo: 'REPRESENTANTES DE LOS TRABAJADORES',
          miembros: enPdf.filter((_, i) => activos[i].parte === 'trabajadores'),
        },
      ];

  const tipo = TIPOS[String(c.tipo)] ?? { nombre: String(c.tipo), norma: '' };
  const fecha = (v: unknown) =>
    v ? new Date(String(v) + 'T12:00:00').toLocaleDateString('es-CO', {
      day: '2-digit', month: 'long', year: 'numeric',
    }) : '—';

  const datos: DatosOrganigrama = {
    empresa: String(em.nombre ?? ''),
    nit: (em.nit as string) ?? null,
    direccion: (em.direccion as string) ?? null,
    logo,

    codigo: String(c.codigo),
    titulo: String(c.titulo_doc ?? `ORGANIGRAMA — ${tipo.nombre.toUpperCase()}`),
    nomenclatura: String(c.nomenclatura ?? '—'),
    versionDoc: String(c.version_doc ?? 'V1'),
    colorPrimario: String(em.color_primario ?? '#14263F'),
    camposExtra: (c.campos_encabezado ?? []) as CampoEncabezado[],
    encabezadoConfig: (c.encabezado_config ?? null) as EncabezadoConfig | null,

    tipoComite: tipo.nombre,
    norma: tipo.norma,
    periodo: `${fecha(c.periodo_inicio)} a ${fecha(c.periodo_fin)}`,
    fechaConformacion: fecha(c.fecha_conformacion),

    columnas,
    porSuplencia: !esBrigada,

    generadoEl: new Date().toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' }),
  };

  const buffer = await renderToBuffer(<Organigrama d={datos} />);

  return {
    ok: true,
    buffer,
    nombreArchivo: `Organigrama_${tipo.nombre.replace(/\s+/g, '_')}_${c.codigo}.pdf`,
    titulo: datos.titulo,
    empresa: datos.empresa,
  };
}
