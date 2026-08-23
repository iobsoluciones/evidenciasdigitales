'use server';

/**
 * CONVOCATORIA Y MATRIZ
 * ---------------------------------------------------------------
 * No todos los empleados son aptos para toda capacitación: trabajo en
 * alturas aplica a unos pocos, inducción a todos. Registrar a quién se
 * convoca es lo que permite saber quién faltó —no solo quién asistió—
 * y es la base de la matriz.
 */
import { revalidatePath } from 'next/cache';
import { crearClienteServidor } from './supabase/servidor';
import { empresaActiva } from './empresa-activa';

export type EmpleadoConvocable = {
  id: string;
  identificacion: string;
  nombres: string;
  area: string;
  cargo: string | null;
  convocado: boolean;
};

/**
 * 'programada' distingue lo que aún no ocurre de una inasistencia
 * real: nadie puede faltar a una capacitación futura.
 */
export type EstadoCelda = 'asistio' | 'falto' | 'programada' | 'no_aplica';

export type CapacitacionMatriz = {
  id: string;
  codigo: string;
  tema: string;
  fecha: string;
  estado: string;
  futura: boolean;
  convocados: number;
  asistieron: number;
};

export type FilaMatriz = {
  id: string;
  identificacion: string;
  nombres: string;
  area: string;
  cargo: string | null;
  celdas: Array<{ capacitacion: string; estado: EstadoCelda; puntaje: number | null }>;
  convocadas: number;
  asistidas: number;
};

export type Matriz = {
  capacitaciones: CapacitacionMatriz[];
  empleados: FilaMatriz[];
};

export type Resultado = { ok: boolean; mensaje: string; convocados?: number };

/** Empleados de la empresa, marcando quién ya está convocado. */
export async function empleadosParaConvocar(
  capacitacionId: string
): Promise<EmpleadoConvocable[]> {
  const supabase = await crearClienteServidor();
  const { data } = await supabase.rpc('empleados_para_convocar', {
    p_capacitacion: capacitacionId,
  });

  const r = data as { ok: boolean; empleados?: EmpleadoConvocable[] } | null;
  return r?.empleados ?? [];
}

/**
 * Reemplaza la convocatoria completa.
 * La base ajusta 'esperados' al número de convocados: la meta de
 * participación deja de escribirse a mano y pasa a derivarse de una
 * decisión real sobre quién debía asistir.
 */
export async function convocarEmpleados(
  capacitacionId: string,
  empleadoIds: string[]
): Promise<Resultado> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc('convocar_empleados', {
    p_capacitacion: capacitacionId,
    p_empleados: empleadoIds,
  });

  if (error) return { ok: false, mensaje: error.message };

  const r = data as { ok: boolean; error?: string; convocados?: number };
  if (!r.ok) return { ok: false, mensaje: r.error ?? 'No se pudo guardar.' };

  revalidatePath(`/panel/capacitaciones/${capacitacionId}`);
  revalidatePath('/panel/matriz');

  return {
    ok: true,
    mensaje: `${r.convocados} empleado(s) convocado(s).`,
    convocados: r.convocados,
  };
}

/** Matriz de la empresa activa. */
export async function obtenerMatriz(
  desde?: string | null,
  hasta?: string | null
): Promise<Matriz> {
  const empresa = await empresaActiva();
  if (!empresa) return { capacitaciones: [], empleados: [] };

  const supabase = await crearClienteServidor();
  const { data } = await supabase.rpc('matriz_capacitaciones', {
    p_empresa: empresa.id,
    p_desde: desde ?? null,
    p_hasta: hasta ?? null,
  });

  return (data ?? { capacitaciones: [], empleados: [] }) as Matriz;
}
