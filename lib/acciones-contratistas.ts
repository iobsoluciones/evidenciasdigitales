'use server';

/**
 * CONTRATISTAS — estándar 2.6.1 · Dec. 1072 art. 2.2.4.6.28
 * ---------------------------------------------------------------
 * En muchas empresas medianas los contratistas son la mitad de la gente
 * en planta, y hasta ahora la aplicación no sabía que existían.
 *
 * Lo que aporta no es la ficha del contratista sino que **los requisitos
 * vencen**: una planilla de aportes de hace cuatro meses no prueba nada,
 * y la afiliación a la ARL que se verificó en enero puede estar
 * cancelada hoy. Por eso cada soporte lleva su vigencia y el vencimiento
 * entra a la bandeja de pendientes.
 */
import { revalidatePath } from 'next/cache';
import { crearClienteServidor } from './supabase/servidor';
import { empresaActiva } from './empresa-activa';

export type EstadoContratista = 'activo' | 'terminado' | 'suspendido';
export type Concepto =
  | 'sin_evaluar' | 'aprobado' | 'aprobado_con_condiciones' | 'rechazado';
export type EstadoRequisito = 'pendiente' | 'entregado' | 'no_aplica';

export type RequisitoContratista = {
  id: string;
  orden: number;
  texto: string;
  obligatorio: boolean;
  fundamento: string | null;
  estado: EstadoRequisito;
  fecha_vence: string | null;
  vencido: boolean;
  observacion: string | null;
};

export type PersonaContratista = {
  id: string;
  nombre: string;
  identificacion: string | null;
  cargo: string | null;
  arl: string | null;
  examen_vence: string | null;
  examen_vencido: boolean;
  induccion_recibida: boolean;
  fecha_induccion: string | null;
  observaciones: string | null;
  activo: boolean;
};

export type ContratistaResumen = {
  id: string; nombre: string; nit: string | null; objeto: string;
  arl: string | null; clase_riesgo: number | null;
  fecha_inicio: string | null; fecha_fin: string | null;
  estado: EstadoContratista; concepto: Concepto; fecha_evaluacion: string | null;
  personas: number; pendientes: number; vencidos: number;
  contrato_vencido: boolean;
};

export type Contratista = {
  id: string; nombre: string; nit: string | null; objeto: string;
  actividad: string | null; arl: string | null; clase_riesgo: number | null;
  contacto: string | null; telefono: string | null; correo: string | null;
  fecha_inicio: string | null; fecha_fin: string | null;
  estado: EstadoContratista; concepto: Concepto;
  fecha_evaluacion: string | null; observaciones: string | null;
};

export type Res = { ok: boolean; mensaje: string; id?: string };

export async function listarContratistas(): Promise<ContratistaResumen[]> {
  const empresa = await empresaActiva();
  if (!empresa) return [];

  const supabase = await crearClienteServidor();
  const { data } = await supabase.rpc('listar_contratistas', { p_empresa: empresa.id });
  return (data ?? []) as ContratistaResumen[];
}

export async function obtenerContratista(id: string): Promise<{
  ok: boolean; error?: string;
  contratista?: Contratista;
  requisitos?: RequisitoContratista[];
  personal?: PersonaContratista[];
}> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc('detalle_contratista', { p_id: id });
  if (error) return { ok: false, error: error.message };
  return (data ?? { ok: false, error: 'No encontrado.' }) as {
    ok: boolean; error?: string;
    contratista?: Contratista;
    requisitos?: RequisitoContratista[];
    personal?: PersonaContratista[];
  };
}

export async function crearContratista(datos: {
  nombre: string; objeto: string; nit: string; arl: string;
  claseRiesgo: number | null; inicio: string; fin: string;
}): Promise<Res> {
  const empresa = await empresaActiva();
  if (!empresa) return { ok: false, mensaje: 'No hay empresa seleccionada.' };

  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc('crear_contratista', {
    p_empresa: empresa.id,
    p_nombre: datos.nombre,
    p_objeto: datos.objeto,
    p_nit: datos.nit || null,
    p_arl: datos.arl || null,
    p_clase: datos.claseRiesgo,
    p_inicio: datos.inicio || null,
    p_fin: datos.fin || null,
  });
  if (error) return { ok: false, mensaje: error.message };

  const r = data as { ok: boolean; error?: string; id?: string };
  if (!r.ok) return { ok: false, mensaje: r.error ?? 'No se pudo crear.' };

  revalidatePath('/panel/contratistas');
  revalidatePath('/panel');
  return { ok: true, mensaje: 'Contratista registrado. Ahora exígele los soportes.', id: r.id };
}

/** Guarda el formulario completo: lo que llegue vacío se limpia. */
export async function guardarContratista(
  id: string,
  datos: {
    nombre: string; objeto: string; nit: string; actividad: string;
    arl: string; claseRiesgo: number | null; contacto: string;
    telefono: string; correo: string; inicio: string; fin: string;
    estado: EstadoContratista; concepto: Concepto;
    fechaEvaluacion: string; observaciones: string;
  }
): Promise<Res> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc('guardar_contratista', {
    p_id: id,
    p_nombre: datos.nombre,
    p_objeto: datos.objeto,
    p_nit: datos.nit || null,
    p_actividad: datos.actividad || null,
    p_arl: datos.arl || null,
    p_clase: datos.claseRiesgo,
    p_contacto: datos.contacto || null,
    p_telefono: datos.telefono || null,
    p_correo: datos.correo || null,
    p_inicio: datos.inicio || null,
    p_fin: datos.fin || null,
    p_estado: datos.estado,
    p_concepto: datos.concepto,
    p_fecha_evaluacion: datos.fechaEvaluacion || null,
    p_observaciones: datos.observaciones || null,
  });
  if (error) return { ok: false, mensaje: error.message };

  const r = data as { ok: boolean; error?: string };
  if (!r.ok) return { ok: false, mensaje: r.error ?? 'No se pudo guardar.' };

  revalidatePath(`/panel/contratistas/${id}`);
  revalidatePath('/panel/contratistas');
  revalidatePath('/panel');
  return { ok: true, mensaje: 'Contratista guardado.' };
}

export async function eliminarContratista(id: string): Promise<Res> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc('eliminar_contratista', { p_id: id });
  if (error) return { ok: false, mensaje: error.message };

  const r = data as { ok: boolean; error?: string };
  if (!r.ok) return { ok: false, mensaje: r.error ?? 'No se pudo eliminar.' };

  revalidatePath('/panel/contratistas');
  return { ok: true, mensaje: 'Contratista eliminado.' };
}

export async function responderRequisito(
  requisitoId: string, estado: EstadoRequisito,
  vence: string, observacion: string, contratistaId: string
): Promise<Res> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc('responder_requisito_contratista', {
    p_id: requisitoId,
    p_estado: estado,
    p_vence: vence || null,
    p_observacion: observacion || null,
  });
  if (error) return { ok: false, mensaje: error.message };

  const r = data as { ok: boolean; error?: string };
  if (!r.ok) return { ok: false, mensaje: r.error ?? 'No se pudo guardar.' };

  revalidatePath(`/panel/contratistas/${contratistaId}`);
  revalidatePath('/panel');
  return { ok: true, mensaje: 'Soporte actualizado.' };
}

export async function guardarPersona(
  contratistaId: string,
  datos: {
    id?: string; nombre: string; identificacion: string; cargo: string;
    arl: string; examenVence: string; induccion: boolean;
    fechaInduccion: string; observaciones: string;
  }
): Promise<Res> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc('guardar_personal_contratista', {
    p_contratista: contratistaId,
    p_nombre: datos.nombre,
    p_identificacion: datos.identificacion || null,
    p_cargo: datos.cargo || null,
    p_arl: datos.arl || null,
    p_examen_vence: datos.examenVence || null,
    p_induccion: datos.induccion,
    p_fecha_induccion: datos.fechaInduccion || null,
    p_observaciones: datos.observaciones || null,
    p_id: datos.id ?? null,
  });
  if (error) return { ok: false, mensaje: error.message };

  const r = data as { ok: boolean; error?: string; id?: string };
  if (!r.ok) return { ok: false, mensaje: r.error ?? 'No se pudo guardar.' };

  revalidatePath(`/panel/contratistas/${contratistaId}`);
  revalidatePath('/panel');
  return { ok: true, mensaje: 'Persona guardada.', id: r.id };
}

export async function eliminarPersona(id: string, contratistaId: string): Promise<Res> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc('eliminar_personal_contratista', { p_id: id });
  if (error) return { ok: false, mensaje: error.message };

  const r = data as { ok: boolean; error?: string };
  if (!r.ok) return { ok: false, mensaje: r.error ?? 'No se pudo quitar.' };

  revalidatePath(`/panel/contratistas/${contratistaId}`);
  return { ok: true, mensaje: 'Persona retirada.' };
}
