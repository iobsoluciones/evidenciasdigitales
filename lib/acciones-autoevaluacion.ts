'use server';

/**
 * AUTOEVALUACIÓN DE ESTÁNDARES MÍNIMOS
 * ---------------------------------------------------------------
 * Resolución 0312 de 2019, artículos 27 y 28.
 *
 * El puntaje y el criterio se derivan al leer, nunca se almacenan: si
 * se guardaran, cambiar una respuesta dejaría el porcentaje viejo.
 *
 * Regla que más puntos cuesta en una visita: un estándar marcado
 * «no aplica» SIN justificación se puntúa en cero. La base lo exige.
 */
import { revalidatePath } from 'next/cache';
import { crearClienteServidor } from './supabase/servidor';
import { empresaActiva } from './empresa-activa';

export type Resultado_ = 'sin_evaluar' | 'cumple' | 'no_cumple' | 'no_aplica';
export type Criterio = 'critico' | 'moderadamente_aceptable' | 'aceptable';

export type ItemEstandar = {
  id: string;
  codigo: string;
  ciclo: 'planear' | 'hacer' | 'verificar' | 'actuar';
  capitulo: string;
  nombre: string;
  peso: number;
  resultado: Resultado_;
  justificacion: string | null;
  observacion: string | null;
};

export type Puntaje = {
  obtenido: number;
  posible: number;
  porcentaje: number;
  cumple: number;
  no_cumple: number;
  no_aplica: number;
  sin_evaluar: number;
  no_aplica_sin_justificar: number;
};

export type PorCiclo = {
  ciclo: string; obtenido: number; posible: number; porcentaje: number;
};

export type Autoevaluacion = {
  id: string; anio: number; codigo: string; alcance: number;
  estado: 'borrador' | 'cerrada'; fecha_cierre: string | null;
  observaciones: string | null;
  nomenclatura: string | null; version_doc: string | null;
};

export type DetalleAuto = {
  ok: boolean; error?: string;
  autoevaluacion?: Autoevaluacion;
  items?: ItemEstandar[];
  puntaje?: Puntaje;
  por_ciclo?: PorCiclo[];
  criterio?: Criterio;
  requiere_plan?: boolean;
  empresa?: Record<string, unknown>;
};

export type ResumenAuto = {
  id: string; anio: number; codigo: string; alcance: number;
  estado: 'borrador' | 'cerrada'; fecha_cierre: string | null; pendientes: number;
};

export type Res = { ok: boolean; mensaje: string; id?: string };

export async function listarAutoevaluaciones(): Promise<ResumenAuto[]> {
  const empresa = await empresaActiva();
  if (!empresa) return [];

  const supabase = await crearClienteServidor();
  const { data } = await supabase.rpc('listar_autoevaluaciones', { p_empresa: empresa.id });
  return (data ?? []) as ResumenAuto[];
}

export async function obtenerAutoevaluacion(id: string): Promise<DetalleAuto> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc('detalle_autoevaluacion', { p_auto: id });
  if (error) return { ok: false, error: error.message };
  return (data ?? { ok: false, error: 'No encontrada.' }) as DetalleAuto;
}

export async function crearAutoevaluacion(anio: number, alcance: number): Promise<Res> {
  const empresa = await empresaActiva();
  if (!empresa) return { ok: false, mensaje: 'No hay empresa seleccionada.' };

  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc('crear_autoevaluacion', {
    p_empresa: empresa.id, p_anio: anio, p_alcance: alcance,
  });
  if (error) return { ok: false, mensaje: error.message };

  const r = data as { ok: boolean; error?: string; id?: string; estandares?: number };
  if (!r.ok) return { ok: false, mensaje: r.error ?? 'No se pudo crear.' };

  revalidatePath('/panel/autoevaluacion');
  revalidatePath('/panel');
  return { ok: true, mensaje: `Autoevaluación ${anio} creada con ${r.estandares} estándares.`, id: r.id };
}

export async function responderEstandar(
  itemId: string, resultado: Resultado_,
  justificacion = '', observacion = ''
): Promise<Res> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc('responder_estandar', {
    p_item: itemId,
    p_resultado: resultado,
    p_justificacion: justificacion || null,
    p_observacion: observacion || null,
  });
  if (error) return { ok: false, mensaje: error.message };

  const r = data as { ok: boolean; error?: string };
  if (!r.ok) return { ok: false, mensaje: r.error ?? 'No se pudo guardar.' };

  revalidatePath('/panel/autoevaluacion');
  return { ok: true, mensaje: 'Respuesta guardada.' };
}

export async function cerrarAutoevaluacion(id: string, observaciones = ''): Promise<Res> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc('cerrar_autoevaluacion', {
    p_auto: id, p_observaciones: observaciones || null,
  });
  if (error) return { ok: false, mensaje: error.message };

  const r = data as { ok: boolean; error?: string };
  if (!r.ok) return { ok: false, mensaje: r.error ?? 'No se pudo cerrar.' };

  revalidatePath('/panel/autoevaluacion');
  revalidatePath('/panel');
  return { ok: true, mensaje: 'Autoevaluación cerrada.' };
}

/** Cada estándar incumplido se vuelve una acción del plan que ya existe. */
export async function generarPlanMejoramiento(
  id: string, responsable = '', dias = 90
): Promise<Res> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc('generar_plan_mejoramiento', {
    p_auto: id, p_responsable: responsable || null, p_dias: dias,
  });
  if (error) return { ok: false, mensaje: error.message };

  const r = data as { ok: boolean; error?: string; creadas?: number };
  if (!r.ok) return { ok: false, mensaje: r.error ?? 'No se pudo generar.' };

  revalidatePath('/panel/autoevaluacion');
  revalidatePath('/panel/acciones');
  return {
    ok: true,
    mensaje: r.creadas
      ? `${r.creadas} acción(es) de mejora creadas en el plan de acción.`
      : 'No había estándares incumplidos nuevos.',
  };
}
