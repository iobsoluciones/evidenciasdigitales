'use server';

/**
 * PLAN ANUAL DE TRABAJO
 * ---------------------------------------------------------------
 * Estándar 2.4.1 de la Res. 0312 · Decreto 1072 art. 2.2.4.6.8.
 *
 * Es el primer documento que pide cualquier auditor. Lleva objetivos,
 * metas, responsables, recursos, cronograma y —lo que de verdad lo
 * convierte en plan— la FIRMA DEL EMPLEADOR. Sin esa firma es un
 * borrador del consultor, no un compromiso de la empresa.
 *
 * El avance se calcula al leer: una actividad programada para marzo que
 * en agosto sigue sin ejecutarse está atrasada, y eso cambia con el
 * paso del tiempo sin que nadie toque el registro.
 */
import { revalidatePath } from 'next/cache';
import { crearClienteServidor } from './supabase/servidor';
import { empresaActiva } from './empresa-activa';

export type EstadoActividad = 'pendiente' | 'en_curso' | 'cumplida' | 'no_aplica';

export type Actividad = {
  id: string;
  orden: number;
  objetivo: string | null;
  actividad: string;
  meta: string | null;
  indicador: string | null;
  responsable: string | null;
  recursos: string | null;
  meses_programados: number[];
  meses_ejecutados: number[];
  estado: EstadoActividad;
  atrasada: boolean;
};

export type Plan = {
  id: string;
  anio: number;
  codigo: string;
  estado: 'borrador' | 'aprobado';
  objetivo_general: string | null;
  alcance: string | null;
  recursos_financieros: string | null;
  recursos_humanos: string | null;
  recursos_tecnicos: string | null;
  nombre_empleador: string | null;
  cargo_empleador: string | null;
  firma_empleador_url: string | null;
  fecha_aprobacion: string | null;
  nomenclatura: string | null;
  version_doc: string | null;
};

export type Avance = {
  actividades: number;
  cumplidas: number;
  en_curso: number;
  no_aplica: number;
  porcentaje: number;
  programados: number;
  ejecutados: number;
};

export type PlanResumen = {
  id: string;
  anio: number;
  codigo: string;
  estado: 'borrador' | 'aprobado';
  fecha_aprobacion: string | null;
  nombre_empleador: string | null;
  actividades: number;
  cumplidas: number;
};

export type Resultado = { ok: boolean; mensaje: string; id?: string };

export async function listarPlanes(): Promise<PlanResumen[]> {
  const empresa = await empresaActiva();
  if (!empresa) return [];

  const supabase = await crearClienteServidor();
  const { data } = await supabase.rpc('listar_planes_anuales', { p_empresa: empresa.id });
  return (data ?? []) as PlanResumen[];
}

export async function obtenerPlan(id: string): Promise<{
  ok: boolean; error?: string;
  plan?: Plan; actividades?: Actividad[]; avance?: Avance;
  empresa?: Record<string, unknown>;
}> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc('detalle_plan_anual', { p_plan: id });
  if (error) return { ok: false, error: error.message };
  return (data ?? { ok: false, error: 'Plan no encontrado.' }) as {
    ok: boolean; error?: string;
    plan?: Plan; actividades?: Actividad[]; avance?: Avance;
    empresa?: Record<string, unknown>;
  };
}

export async function crearPlan(anio: number): Promise<Resultado> {
  const empresa = await empresaActiva();
  if (!empresa) return { ok: false, mensaje: 'No hay empresa seleccionada.' };

  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc('crear_plan_anual', {
    p_empresa: empresa.id,
    p_anio: anio,
  });
  if (error) return { ok: false, mensaje: error.message };

  const r = data as { ok: boolean; error?: string; id?: string };
  if (!r.ok) return { ok: false, mensaje: r.error ?? 'No se pudo crear el plan.' };

  revalidatePath('/panel/plan-anual');
  revalidatePath('/panel');
  return { ok: true, mensaje: `Plan anual ${anio} creado.`, id: r.id };
}

export async function guardarPlan(
  id: string,
  datos: {
    objetivo: string; alcance: string;
    financieros: string; humanos: string; tecnicos: string;
  }
): Promise<Resultado> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc('guardar_plan_anual', {
    p_plan: id,
    p_objetivo: datos.objetivo || null,
    p_alcance: datos.alcance || null,
    p_fin: datos.financieros || null,
    p_hum: datos.humanos || null,
    p_tec: datos.tecnicos || null,
  });
  if (error) return { ok: false, mensaje: error.message };

  const r = data as { ok: boolean; error?: string };
  if (!r.ok) return { ok: false, mensaje: r.error ?? 'No se pudo guardar.' };

  revalidatePath('/panel/plan-anual');
  return { ok: true, mensaje: 'Plan guardado.' };
}

export async function guardarActividad(
  planId: string,
  datos: {
    id?: string;
    actividad: string; objetivo: string; meta: string; indicador: string;
    responsable: string; recursos: string;
    meses: number[]; ejecutados: number[]; estado: EstadoActividad;
  }
): Promise<Resultado> {
  if (!datos.actividad?.trim()) return { ok: false, mensaje: 'Describe la actividad.' };

  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc('guardar_actividad_plan', {
    p_plan: planId,
    p_actividad: datos.actividad,
    p_objetivo: datos.objetivo || null,
    p_meta: datos.meta || null,
    p_indicador: datos.indicador || null,
    p_responsable: datos.responsable || null,
    p_recursos: datos.recursos || null,
    p_meses: datos.meses,
    p_estado: datos.estado,
    p_ejecutados: datos.ejecutados,
    p_id: datos.id ?? null,
  });
  if (error) return { ok: false, mensaje: error.message };

  const r = data as { ok: boolean; error?: string; id?: string };
  if (!r.ok) return { ok: false, mensaje: r.error ?? 'No se pudo guardar la actividad.' };

  revalidatePath('/panel/plan-anual');
  revalidatePath('/panel');
  return { ok: true, mensaje: 'Actividad guardada.', id: r.id };
}

export async function eliminarActividad(id: string): Promise<Resultado> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc('eliminar_actividad_plan', { p_id: id });
  if (error) return { ok: false, mensaje: error.message };

  const r = data as { ok: boolean; error?: string };
  if (!r.ok) return { ok: false, mensaje: r.error ?? 'No se pudo eliminar.' };

  revalidatePath('/panel/plan-anual');
  return { ok: true, mensaje: 'Actividad eliminada.' };
}

/** Aprobar es firmar. Sin firma del empleador el plan no vale. */
export async function aprobarPlan(
  id: string,
  nombre: string,
  cargo: string,
  firmaUrl: string
): Promise<Resultado> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc('aprobar_plan_anual', {
    p_plan: id,
    p_nombre: nombre,
    p_cargo: cargo,
    p_firma: firmaUrl,
  });
  if (error) return { ok: false, mensaje: error.message };

  const r = data as { ok: boolean; error?: string };
  if (!r.ok) return { ok: false, mensaje: r.error ?? 'No se pudo aprobar el plan.' };

  revalidatePath('/panel/plan-anual');
  revalidatePath('/panel');
  return { ok: true, mensaje: 'Plan anual aprobado y firmado.' };
}
