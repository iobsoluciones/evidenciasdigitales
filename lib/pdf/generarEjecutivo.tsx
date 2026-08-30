/**
 * GENERADOR DEL REPORTE EJECUTIVO
 * ---------------------------------------------------------------
 * Reúne indicadores y detalle de UNA empresa en un periodo.
 * Se genera bajo demanda; no se almacena.
 */
import { renderToBuffer } from '@react-pdf/renderer';
import { crearClienteServidor } from '../supabase/servidor';
import { obtenerPerfil } from '../sesion';
import { ReporteEjecutivo, type DatosEjecutivo, type CampoEncabezado } from './ReporteEjecutivo';
import type { EncabezadoConfig } from './EncabezadoDoc';
import { resolverNomenclatura, leerMapa } from '../nomenclaturas';

export type ResultadoEjecutivo =
  | { ok: true; buffer: Buffer; nombreArchivo: string; empresa: string }
  | { ok: false; error: string };

async function descargarUrl(url: string): Promise<Buffer | null> {
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    return Buffer.from(await r.arrayBuffer());
  } catch { return null; }
}

export async function generarReporteEjecutivo(
  empresaId: string,
  meses = 12
): Promise<ResultadoEjecutivo> {
  const perfil = await obtenerPerfil();
  if (!perfil) return { ok: false, error: 'Sesión no válida.' };

  const supabase = await crearClienteServidor();

  // RLS impide leer empresas de otra cuenta
  const { data: empresa } = await supabase
    .from('empresas')
    .select('*')
    .eq('id', empresaId)
    .maybeSingle();

  if (!empresa) return { ok: false, error: 'Empresa no encontrada.' };

  const { data: rep } = await supabase.rpc('reporte_global', {
    p_meses: meses,
    p_empresa: empresaId,
  });

  const r = (rep ?? {}) as {
    porCiudad: Array<{ etiqueta: string; valor: number }>;
    porArea: Array<{ etiqueta: string; valor: number }>;
    participantesPorMes: Array<{ mes: string; valor: number }>;
    capacitacionesPorMes: Array<{ mes: string; valor: number }>;
    participacionGeneral: {
      porcentaje: number; registrados: number; esperados: number;
      conMeta: number; sinMeta: number;
    } | null;
    totales: { capacitaciones: number; participantes: number };
  };

  // Detalle de capacitaciones del periodo
  const desde = new Date();
  desde.setMonth(desde.getMonth() - (meses - 1));
  desde.setDate(1);

  const { data: caps } = await supabase
    .from('v_capacitaciones_resumen')
    .select('*')
    .eq('empresa_id', empresaId)
    .gte('fecha_inicio', desde.toISOString())
    .order('fecha_inicio', { ascending: false });

  const lista = caps ?? [];

  // Promedio de evaluación por capacitación
  const promedios = new Map<string, number | null>();
  for (const c of lista) {
    if (!c.tiene_evaluacion) continue;
    const { data: est } = await supabase.rpc('estadisticas_evaluacion', {
      p_capacitacion_id: c.id,
    });
    const e = est as { promedio: number | null } | null;
    promedios.set(c.id, e?.promedio ?? null);
  }

  const logo = empresa.logo_url ? await descargarUrl(empresa.logo_url) : null;

  // Une las dos series mensuales en una sola para el gráfico
  const porMes = (r.participantesPorMes ?? []).map((p, i) => ({
    mes: p.mes,
    participantes: p.valor,
    capacitaciones: r.capacitacionesPorMes?.[i]?.valor ?? 0,
  }));

  const fmtFecha = (iso: string) =>
    new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: '2-digit' });

  const pg = r.participacionGeneral;

  const datos: DatosEjecutivo = {
    empresa: empresa.nombre,
    nit: empresa.nit,
    ciudad: empresa.ciudad,
    // Reporte ejecutivo: nomenclatura del tipo 'reporte'.
    nomenclatura: resolverNomenclatura(null, leerMapa(empresa.nomenclaturas), 'reporte', false, {
      nomenclatura: empresa.nomenclatura, version: empresa.version_doc,
    }).nomenclatura || '—',
    versionDoc: empresa.version_doc ?? 'V1',
    colorPrimario: empresa.color_primario ?? '#14263F',
    logo,
    camposExtra: (empresa.campos_encabezado ?? []) as CampoEncabezado[],
    // Vigente: el reporte ejecutivo se regenera, no es evidencia firmada.
    encabezadoConfig: (empresa.encabezado_config ?? null) as EncabezadoConfig | null,

    periodo: `Últimos ${meses} meses · corte ${new Date().toLocaleDateString('es-CO', { dateStyle: 'medium' })}`,
    elaboradoPor: perfil.nombre,

    capacitaciones: r.totales?.capacitaciones ?? 0,
    participantes: r.totales?.participantes ?? 0,
    participacion: Number(pg?.porcentaje ?? 100),
    registrados: pg?.registrados ?? 0,
    esperados: pg?.esperados ?? 0,
    conMeta: pg?.conMeta ?? 0,
    sinMeta: pg?.sinMeta ?? 0,

    porMes,
    porArea: r.porArea ?? [],
    porCiudad: r.porCiudad ?? [],

    detalle: lista.map((c) => ({
      codigo: c.codigo,
      tema: c.tema,
      instructor: c.instructor,
      fecha: fmtFecha(c.fecha_inicio),
      registrados: c.registrados,
      esperados: c.esperados,
      participacion: Number(c.porcentaje_participacion),
      evaluada: Boolean(c.tiene_evaluacion),
      promedio: promedios.get(c.id) ?? null,
    })),

    generadoEl: new Date().toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' }),
  };

  const buffer = await renderToBuffer(<ReporteEjecutivo d={datos} />);
  const limpio = empresa.nombre.replace(/[^a-zA-Z0-9 _-]/g, '').trim().replace(/\s+/g, '_');
  const fecha = new Date().toISOString().slice(0, 10).replace(/-/g, '');

  return {
    ok: true,
    buffer,
    nombreArchivo: `Reporte_Ejecutivo_${limpio}_${fecha}.pdf`,
    empresa: empresa.nombre,
  };
}
