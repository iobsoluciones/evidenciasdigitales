'use server';

/**
 * MATRIZ DE PELIGROS — GTC 45
 * ---------------------------------------------------------------
 * Estándar 4.1.2 de la Resolución 0312.
 *
 * Es la columna vertebral del SG-SST: qué EPP entregar, qué
 * capacitación dictar, qué inspeccionar y qué examen ordenar deberían
 * derivarse del peligro. Sin la matriz los módulos funcionan pero
 * quedan huérfanos, y ante un auditor no hay cómo demostrar por qué
 * esas decisiones y no otras.
 *
 * NP, NR, nivel y aceptabilidad NO se calculan aquí: son columnas
 * generadas en la base. Calcularlas en el cliente permitiría que un
 * cambio de ND dejara el nivel viejo guardado y la matriz mintiera.
 */
import { revalidatePath } from 'next/cache';
import { crearClienteServidor } from './supabase/servidor';
import { empresaActiva } from './empresa-activa';

export type Clasificacion =
  | 'biologico' | 'fisico' | 'quimico' | 'psicosocial'
  | 'biomecanico' | 'condiciones_seguridad' | 'fenomenos_naturales';

export type TipoControl = 'epp' | 'capacitacion' | 'inspeccion';

export type Peligro = {
  id: string;
  codigo: string;
  proceso: string | null;
  zona: string | null;
  actividad: string;
  rutinaria: boolean;
  clasificacion: Clasificacion;
  descripcion: string;
  efectos_posibles: string | null;
  control_fuente: string | null;
  control_medio: string | null;
  control_individuo: string | null;
  nd: number;
  ne: number;
  nc: number;
  np: number;
  nr: number;
  nivel: 'I' | 'II' | 'III' | 'IV';
  aceptabilidad: string;
  num_expuestos: number;
  peor_consecuencia: string | null;
  requisito_legal: string | null;
  m_eliminacion: string | null;
  m_sustitucion: string | null;
  m_ingenieria: string | null;
  m_administrativo: string | null;
  m_epp: string | null;
  controles: number;
};

export type ControlEnlazado = {
  id: string;
  tipo: TipoControl;
  referencia_id: string;
  nota: string | null;
  nombre: string | null;
};

export type ResumenPeligros = {
  total: number;
  nivel_i: number;
  nivel_ii: number;
  nivel_iii: number;
  nivel_iv: number;
  no_aceptables: number;
  sin_controles: number;
  expuestos: number;
};

export type Resultado = {
  ok: boolean; mensaje: string; id?: string; codigo?: string;
  nivel?: string; nr?: number;
};

export async function listarPeligros(): Promise<Peligro[]> {
  const empresa = await empresaActiva();
  if (!empresa) return [];

  const supabase = await crearClienteServidor();
  const { data } = await supabase.rpc('listar_peligros', { p_empresa: empresa.id });
  return (data ?? []) as Peligro[];
}

export async function resumenPeligros(): Promise<ResumenPeligros | null> {
  const empresa = await empresaActiva();
  if (!empresa) return null;

  const supabase = await crearClienteServidor();
  const { data } = await supabase.rpc('resumen_peligros', { p_empresa: empresa.id });
  return (data ?? null) as ResumenPeligros | null;
}

export async function obtenerPeligro(id: string): Promise<{
  ok: boolean; error?: string;
  peligro?: Peligro; controles?: ControlEnlazado[];
}> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc('detalle_peligro', { p_peligro: id });
  if (error) return { ok: false, error: error.message };
  return (data ?? { ok: false, error: 'Peligro no encontrado.' }) as {
    ok: boolean; error?: string; peligro?: Peligro; controles?: ControlEnlazado[];
  };
}

export async function guardarPeligro(datos: {
  id?: string;
  actividad: string;
  descripcion: string;
  clasificacion: Clasificacion;
  nd: number;
  ne: number;
  nc: number;
  proceso: string;
  zona: string;
  rutinaria: boolean;
  efectos: string;
  controlFuente: string;
  controlMedio: string;
  controlIndividuo: string;
  numExpuestos: number;
  peorConsecuencia: string;
  requisitoLegal: string;
  mEliminacion: string;
  mSustitucion: string;
  mIngenieria: string;
  mAdministrativo: string;
  mEpp: string;
}): Promise<Resultado> {
  const empresa = await empresaActiva();
  if (!empresa) return { ok: false, mensaje: 'No hay empresa seleccionada.' };
  if (!datos.actividad?.trim()) return { ok: false, mensaje: 'Describe la actividad.' };
  if (!datos.descripcion?.trim()) return { ok: false, mensaje: 'Describe el peligro.' };

  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc('guardar_peligro', {
    p_empresa: empresa.id,
    p_actividad: datos.actividad,
    p_descripcion: datos.descripcion,
    p_clasificacion: datos.clasificacion,
    p_nd: datos.nd,
    p_ne: datos.ne,
    p_nc: datos.nc,
    p_proceso: datos.proceso || null,
    p_zona: datos.zona || null,
    p_rutinaria: datos.rutinaria,
    p_efectos: datos.efectos || null,
    p_control_fuente: datos.controlFuente || null,
    p_control_medio: datos.controlMedio || null,
    p_control_individuo: datos.controlIndividuo || null,
    p_num_expuestos: datos.numExpuestos || 0,
    p_peor_consecuencia: datos.peorConsecuencia || null,
    p_requisito_legal: datos.requisitoLegal || null,
    p_m_eliminacion: datos.mEliminacion || null,
    p_m_sustitucion: datos.mSustitucion || null,
    p_m_ingenieria: datos.mIngenieria || null,
    p_m_administrativo: datos.mAdministrativo || null,
    p_m_epp: datos.mEpp || null,
    p_id: datos.id ?? null,
  });

  if (error) return { ok: false, mensaje: error.message };
  const r = data as {
    ok: boolean; error?: string; id?: string; codigo?: string;
    nivel?: string; nr?: number;
  };
  if (!r.ok) return { ok: false, mensaje: r.error ?? 'No se pudo guardar el peligro.' };

  revalidatePath('/panel/peligros');
  return {
    ok: true,
    mensaje: `${r.codigo} guardado. Nivel de riesgo ${r.nivel} (NR ${r.nr}).`,
    id: r.id, codigo: r.codigo, nivel: r.nivel, nr: r.nr,
  };
}

export async function eliminarPeligro(id: string): Promise<Resultado> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc('eliminar_peligro', { p_id: id });
  if (error) return { ok: false, mensaje: error.message };

  const r = data as { ok: boolean; error?: string };
  if (!r.ok) return { ok: false, mensaje: r.error ?? 'No se pudo eliminar.' };

  revalidatePath('/panel/peligros');
  return { ok: true, mensaje: 'Peligro eliminado.' };
}

/**
 * Enlaza el peligro con los controles que YA existen en la aplicación.
 * Es lo que convierte cinco módulos sueltos en un sistema: permite
 * responder por qué ese EPP y no otro.
 */
export async function guardarControlesPeligro(
  peligroId: string,
  controles: Array<{ tipo: TipoControl; referencia_id: string; nota?: string }>
): Promise<Resultado> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc('guardar_controles_peligro', {
    p_peligro: peligroId,
    p_controles: controles,
  });

  if (error) return { ok: false, mensaje: error.message };
  const r = data as { ok: boolean; error?: string; controles?: number };
  if (!r.ok) return { ok: false, mensaje: r.error ?? 'No se pudieron guardar los controles.' };

  revalidatePath('/panel/peligros');
  return { ok: true, mensaje: `${r.controles ?? 0} control(es) enlazado(s).` };
}

/** Catálogos para el selector de controles: lo que ya existe en la app. */
export async function opcionesDeControl(): Promise<{
  epp: Array<{ id: string; nombre: string }>;
  capacitacion: Array<{ id: string; nombre: string }>;
  inspeccion: Array<{ id: string; nombre: string }>;
}> {
  const empresa = await empresaActiva();
  const vacio = { epp: [], capacitacion: [], inspeccion: [] };
  if (!empresa) return vacio;

  const supabase = await crearClienteServidor();

  const [art, cap, insp] = await Promise.all([
    supabase.from('articulos').select('id, nombre').eq('empresa_id', empresa.id).order('nombre'),
    supabase.from('plantillas_capacitacion').select('id, nombre').order('nombre'),
    supabase.from('inspeccion_plantillas').select('id, nombre').order('nombre'),
  ]);

  return {
    epp: (art.data ?? []) as Array<{ id: string; nombre: string }>,
    capacitacion: (cap.data ?? []) as Array<{ id: string; nombre: string }>,
    inspeccion: (insp.data ?? []) as Array<{ id: string; nombre: string }>,
  };
}
