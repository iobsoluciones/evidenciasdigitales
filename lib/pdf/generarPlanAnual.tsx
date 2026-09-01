/**
 * GENERADOR DEL PLAN ANUAL
 * Usa detalle_plan_anual(): la misma fuente que la pantalla.
 */
import { renderToBuffer } from '@react-pdf/renderer';
import { crearClienteServidor } from '../supabase/servidor';
import {
  PlanAnual, type DatosPlan,
  type CampoEncabezado, type ActividadPdf,
} from './PlanAnual';
import type { EncabezadoConfig } from './EncabezadoDoc';
import { resolverNomenclatura, leerMapa } from '../nomenclaturas';

export type ResultadoPlan =
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

export async function generarPlanAnual(id: string): Promise<ResultadoPlan> {
  const supabase = await crearClienteServidor();

  const { data, error } = await supabase.rpc('detalle_plan_anual', { p_plan: id });
  if (error) return { ok: false, error: error.message };

  const d = data as {
    ok: boolean; error?: string;
    plan?: Record<string, unknown>;
    actividades?: ActividadPdf[];
    avance?: { porcentaje: number; cumplidas: number; actividades: number };
    empresa?: Record<string, unknown>;
  };

  if (!d.ok || !d.plan) return { ok: false, error: d.error ?? 'Plan no encontrado.' };

  const p = d.plan;
  const em = d.empresa ?? {};
  const aprobado = p.estado === 'aprobado';

  const logo = em.logo_url ? await descargarUrl(String(em.logo_url)) : null;
  const firma = await descargarFirma(supabase, (p.firma_empleador_url as string) ?? null);

  // Se congela al APROBAR (§5.14): mientras es borrador manda lo vigente.
  const doc = resolverNomenclatura(
    { nomenclatura: p.nomenclatura as string, version: p.version_doc as string },
    leerMapa(em.nomenclaturas), 'plan_anual', aprobado,
    { nomenclatura: em.nomenclatura as string, version: em.version_doc as string }
  );

  const datos: DatosPlan = {
    empresa: String(em.nombre ?? ''),
    nit: (em.nit as string) ?? null,
    direccion: (em.direccion as string) ?? null,
    logo,

    codigo: String(p.codigo),
    titulo: String(p.titulo_doc ?? 'PLAN ANUAL DE TRABAJO DEL SG-SST'),
    nomenclatura: doc.nomenclatura || '—',
    versionDoc: doc.version || 'V1',
    colorPrimario: String(em.color_primario ?? '#14263F'),
    camposExtra: (p.campos_encabezado ?? []) as CampoEncabezado[],
    encabezadoConfig: (p.encabezado_config ?? null) as EncabezadoConfig | null,

    anio: Number(p.anio),
    objetivoGeneral: (p.objetivo_general as string) ?? null,
    alcance: (p.alcance as string) ?? null,
    recursosFinancieros: (p.recursos_financieros as string) ?? null,
    recursosHumanos: (p.recursos_humanos as string) ?? null,
    recursosTecnicos: (p.recursos_tecnicos as string) ?? null,

    actividades: d.actividades ?? [],
    porcentaje: d.avance?.porcentaje ?? 0,
    cumplidas: d.avance?.cumplidas ?? 0,
    totalActividades: d.avance?.actividades ?? 0,

    aprobado,
    nombreEmpleador: (p.nombre_empleador as string) ?? null,
    cargoEmpleador: (p.cargo_empleador as string) ?? null,
    fechaAprobacion: p.fecha_aprobacion
      ? new Date(String(p.fecha_aprobacion)).toLocaleDateString('es-CO', {
          day: '2-digit', month: 'long', year: 'numeric',
        })
      : null,
    firmaEmpleador: firma,

    generadoEl: new Date().toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' }),
  };

  const buffer = await renderToBuffer(<PlanAnual d={datos} />);

  return {
    ok: true,
    buffer,
    nombreArchivo: `Plan_anual_${datos.anio}_${datos.codigo}.pdf`,
    titulo: `${datos.titulo} ${datos.anio}`,
    empresa: datos.empresa,
  };
}
