'use server';

/**
 * EXÁMENES MÉDICOS OCUPACIONALES
 * ---------------------------------------------------------------
 * Resolución 2346 de 2007 · Estándares 3.1.2 a 3.1.6 de la Res. 0312.
 *
 * RESERVA DE LA HISTORIA CLÍNICA: la aplicación guarda el **concepto de
 * aptitud** y las **restricciones**, nunca el diagnóstico. La historia
 * clínica es reservada y la custodia el médico, no el consultor. No hay
 * campo de diagnóstico y no debe agregarse.
 *
 * Lo que sí hace falta que el sistema sepa es qué NO puede hacer una
 * persona: esa es la información que evita reubicarla mal.
 */
import { revalidatePath } from 'next/cache';
import { crearClienteServidor } from './supabase/servidor';
import { empresaActiva } from './empresa-activa';

export type TipoExamen =
  | 'ingreso' | 'periodico' | 'retiro' | 'post_incapacidad' | 'reubicacion';

export type Concepto =
  | 'apto' | 'apto_con_restricciones' | 'no_apto' | 'aplazado';

export type FilaExamen = {
  empleado_id: string;
  nombres: string;
  identificacion: string;
  cargo: string | null;
  area: string | null;
  examen_id: string | null;
  tipo: TipoExamen | null;
  fecha: string | null;
  fecha_vence: string | null;
  concepto: Concepto | null;
  restricciones: string | null;
  entidad: string | null;
  dias_para_vencer: number | null;
  sin_examen: boolean;
  vencido: boolean;
};

export type ExamenEmpleado = {
  id: string;
  tipo: TipoExamen;
  fecha: string;
  fecha_vence: string | null;
  entidad: string | null;
  medico: string | null;
  licencia_medico: string | null;
  concepto: Concepto;
  restricciones: string | null;
  recomendaciones: string | null;
  soporte_url: string | null;
  dias_para_vencer: number | null;
  vencido: boolean;
};

export type AlertasExamenes = {
  sinExamen: Array<{ empleado_id: string; nombres: string; identificacion: string; cargo: string | null; area: string | null }>;
  vencidos: Array<{ empleado_id: string; nombres: string; area: string | null; fecha_vence: string; dias: number }>;
  porVencer: Array<{ empleado_id: string; nombres: string; area: string | null; fecha_vence: string; dias: number }>;
  conRestricciones: Array<{ empleado_id: string; nombres: string; area: string | null; restricciones: string }>;
};

export type Resultado = { ok: boolean; mensaje: string; id?: string; sinExamen?: boolean };

export async function listarExamenes(): Promise<FilaExamen[]> {
  const empresa = await empresaActiva();
  if (!empresa) return [];

  const supabase = await crearClienteServidor();
  const { data } = await supabase.rpc('listar_examenes', { p_empresa: empresa.id });
  return (data ?? []) as FilaExamen[];
}

export async function examenesDeEmpleado(empleadoId: string): Promise<ExamenEmpleado[]> {
  const supabase = await crearClienteServidor();
  const { data } = await supabase.rpc('examenes_empleado', { p_empleado: empleadoId });
  return (data ?? []) as ExamenEmpleado[];
}

export async function obtenerAlertasExamenes(dias = 60): Promise<AlertasExamenes> {
  const vacio: AlertasExamenes = {
    sinExamen: [], vencidos: [], porVencer: [], conRestricciones: [],
  };
  const empresa = await empresaActiva();
  if (!empresa) return vacio;

  const supabase = await crearClienteServidor();
  const { data } = await supabase.rpc('alertas_examenes', {
    p_empresa: empresa.id,
    p_dias: dias,
  });
  return (data ?? vacio) as AlertasExamenes;
}

export async function guardarExamen(datos: {
  id?: string;
  empleadoId: string;
  tipo: TipoExamen;
  fecha: string;
  fechaVence: string | null;
  concepto: Concepto;
  entidad: string;
  medico: string;
  licencia: string;
  restricciones: string;
  recomendaciones: string;
  soporteUrl?: string | null;
}): Promise<Resultado> {
  if (!datos.empleadoId) return { ok: false, mensaje: 'Selecciona el trabajador.' };
  if (!datos.fecha) return { ok: false, mensaje: 'Indica la fecha del examen.' };

  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc('guardar_examen', {
    p_empleado: datos.empleadoId,
    p_tipo: datos.tipo,
    p_fecha: datos.fecha,
    p_concepto: datos.concepto,
    p_fecha_vence: datos.fechaVence || null,
    p_entidad: datos.entidad || null,
    p_medico: datos.medico || null,
    p_licencia: datos.licencia || null,
    p_restricciones: datos.restricciones || null,
    p_recomendaciones: datos.recomendaciones || null,
    p_soporte: datos.soporteUrl ?? null,
    p_id: datos.id ?? null,
  });

  if (error) return { ok: false, mensaje: error.message };
  const r = data as { ok: boolean; error?: string; id?: string };
  if (!r.ok) return { ok: false, mensaje: r.error ?? 'No se pudo guardar el examen.' };

  revalidatePath('/panel/examenes');
  revalidatePath(`/panel/empleados/${datos.empleadoId}/expediente`);
  return { ok: true, mensaje: 'Examen registrado.', id: r.id };
}

export async function eliminarExamen(id: string): Promise<Resultado> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc('eliminar_examen', { p_id: id });

  if (error) return { ok: false, mensaje: error.message };
  const r = data as { ok: boolean; error?: string };
  if (!r.ok) return { ok: false, mensaje: r.error ?? 'No se pudo eliminar.' };

  revalidatePath('/panel/examenes');
  return { ok: true, mensaje: 'Examen eliminado.' };
}
