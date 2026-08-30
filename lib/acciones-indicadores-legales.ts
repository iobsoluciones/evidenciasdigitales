'use server';

/**
 * INDICADORES MÍNIMOS — Resolución 0312 de 2019, art. 30
 * ---------------------------------------------------------------
 * Son seis, con fórmula definida por la norma y obligación de reporte
 * anual. Los indicadores propios de la aplicación (cobertura de
 * capacitación, cumplimiento de inspecciones) son útiles pero no son
 * estos: un auditor pide estos por nombre.
 *
 * La fórmula viaja junto al resultado a propósito. Lo primero que
 * pregunta un auditor no es el número, es cómo se calculó.
 */
import { crearClienteServidor } from './supabase/servidor';
import { empresaActiva } from './empresa-activa';

export type IndicadorLegal = {
  clave: string;
  nombre: string;
  formula: string;
  numerador: number;
  denominador: number;
  valor: number | null;
  unidad: string;
  /** Qué dato falta para poder calcularlo. null si se pudo. */
  falta: string | null;
};

export type BaseIndicadores = {
  promedio_trabajadores: number;
  dias_programados: number;
  meses_con_dato: number;
  accidentes: number;
  mortales: number;
  dias_incapacidad: number;
  el_nuevos: number;
  el_total: number;
};

export type IndicadoresLegales = {
  anio: number;
  base: BaseIndicadores;
  indicadores: IndicadorLegal[];
};

export async function obtenerIndicadoresLegales(
  anio: number
): Promise<IndicadoresLegales | null> {
  const empresa = await empresaActiva();
  if (!empresa) return null;

  const supabase = await crearClienteServidor();
  const { data } = await supabase.rpc('indicadores_legales', {
    p_empresa: empresa.id,
    p_anio: anio,
  });
  return (data ?? null) as IndicadoresLegales | null;
}
