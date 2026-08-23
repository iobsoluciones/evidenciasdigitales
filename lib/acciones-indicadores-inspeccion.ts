'use server';

/**
 * INDICADORES DE INSPECCIONES — Server Actions
 * ---------------------------------------------------------------
 * El indicador de hallazgos recurrentes es el más valioso: si el mismo
 * criterio se incumple tres veces, el problema no es el extintor, es
 * que nadie está atendiendo el hallazgo.
 */
import { crearClienteServidor } from './supabase/servidor';
import { empresaActiva } from './empresa-activa';

export type Indicadores = {
  rango: { desde: string; hasta: string };
  resumen: {
    total: number; cerradas: number; cumplen: number;
    no_cumplen: number; puntaje_promedio: number | null;
  };
  por_tipo: Array<{ tipo: string; total: number; cumplen: number; pct: number }>;
  tendencia: Array<{ mes: string; total: number; cumplen: number; puntaje: number | null }>;
  recurrentes: Array<{ criterio: string; veces: number; critico: boolean; ultima: string }>;
  objetos: Array<{ objeto: string; hallazgos: number; inspecciones: number }>;
  acciones: {
    total: number; abiertas: number; vencidas: number;
    cerradas: number; dias_cierre_promedio: number | null;
  };
};

export async function obtenerIndicadores(
  desde?: string,
  hasta?: string
): Promise<Indicadores | null> {
  const empresa = await empresaActiva();
  if (!empresa) return null;

  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc('indicadores_inspecciones', {
    p_empresa: empresa.id,
    p_desde: desde ?? null,
    p_hasta: hasta ?? null,
  });

  if (error) return null;
  return data as Indicadores;
}
