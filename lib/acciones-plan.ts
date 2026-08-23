'use server';

/**
 * PLAN DE ACCIÓN — Server Actions
 * ---------------------------------------------------------------
 * Cada hallazgo de una inspección puede convertirse en una acción con
 * responsable y fecha. Es lo que cierra el ciclo: sin esto, la
 * inspección es un diagnóstico sin tratamiento.
 *
 * El estado 'vencida' se deriva en la lectura (fecha pasada sin cerrar),
 * no se guarda: así nunca queda desactualizado en la base.
 */
import { revalidatePath } from 'next/cache';
import { crearClienteServidor } from './supabase/servidor';
import { empresaActiva } from './empresa-activa';

export type EstadoAccion = 'abierta' | 'en_proceso' | 'cerrada' | 'vencida';
export type Severidad = 'baja' | 'media' | 'alta' | 'critica';
export type TipoAccion = 'correctiva' | 'preventiva' | 'mejora';

export type Accion = {
  id: string;
  codigo: string;
  hallazgo: string;
  accion: string;
  tipo: TipoAccion;
  causa_raiz: string | null;
  responsable: string;
  severidad: Severidad;
  fecha_limite: string;
  fecha_cierre: string | null;
  evidencia_url: string | null;
  verificado_por: string | null;
  estado: 'abierta' | 'en_proceso' | 'cerrada';
  estado_real: EstadoAccion;
  dias: number;
  inspeccion_id: string | null;
  inspeccion_codigo: string | null;
  inspeccion_objeto: string | null;
};

export type Resultado = { ok: boolean; mensaje: string; id?: string };

export async function listarAcciones(): Promise<Accion[]> {
  const empresa = await empresaActiva();
  if (!empresa) return [];
  const supabase = await crearClienteServidor();
  const { data } = await supabase.rpc('listar_acciones', { p_empresa: empresa.id });
  return (data ?? []) as Accion[];
}

export async function crearAccion(datos: {
  hallazgo: string;
  accion: string;
  responsable: string;
  fechaLimite: string;
  tipo?: TipoAccion;
  severidad?: Severidad;
  causaRaiz?: string;
}): Promise<Resultado> {
  const empresa = await empresaActiva();
  if (!empresa) return { ok: false, mensaje: 'No hay empresa seleccionada.' };

  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc('crear_accion', {
    p_empresa: empresa.id,
    p_hallazgo: datos.hallazgo,
    p_accion: datos.accion,
    p_responsable: datos.responsable,
    p_fecha_limite: datos.fechaLimite,
    p_tipo: datos.tipo ?? 'correctiva',
    p_severidad: datos.severidad ?? 'media',
    p_causa_raiz: datos.causaRaiz ?? null,
  });

  if (error) return { ok: false, mensaje: error.message };
  const r = data as { ok: boolean; error?: string; id?: string; codigo?: string };
  if (!r.ok) return { ok: false, mensaje: r.error ?? 'No se pudo crear.' };

  revalidatePath('/panel/acciones');
  return { ok: true, mensaje: `${r.codigo} creada.`, id: r.id };
}

/** Genera acciones desde los hallazgos de una inspección cerrada. */
export async function generarAccionesInspeccion(
  inspeccionId: string,
  responsable?: string,
  diasPlazo = 15
): Promise<Resultado> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc('generar_acciones_inspeccion', {
    p_inspeccion: inspeccionId,
    p_responsable: responsable ?? null,
    p_dias_plazo: diasPlazo,
  });

  if (error) return { ok: false, mensaje: error.message };
  const r = data as { ok: boolean; error?: string; creadas?: number };
  if (!r.ok) return { ok: false, mensaje: r.error ?? 'No se pudo generar.' };

  revalidatePath('/panel/acciones');
  revalidatePath(`/panel/inspecciones/${inspeccionId}`);

  return {
    ok: true,
    mensaje: r.creadas === 0
      ? 'Los hallazgos ya tenían acción registrada.'
      : `${r.creadas} acción(es) creada(s) desde los hallazgos.`,
  };
}

export async function actualizarAccion(
  accionId: string,
  datos: {
    estado: 'abierta' | 'en_proceso' | 'cerrada';
    accion?: string;
    causaRaiz?: string;
    responsable?: string;
    fechaLimite?: string;
    severidad?: Severidad;
    evidencia?: string;
    verificadoPor?: string;
  }
): Promise<Resultado> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc('actualizar_accion', {
    p_accion: accionId,
    p_estado: datos.estado,
    p_accion_texto: datos.accion ?? null,
    p_causa_raiz: datos.causaRaiz ?? null,
    p_responsable: datos.responsable ?? null,
    p_fecha_limite: datos.fechaLimite ?? null,
    p_severidad: datos.severidad ?? null,
    p_evidencia: datos.evidencia ?? null,
    p_verificado_por: datos.verificadoPor ?? null,
  });

  if (error) return { ok: false, mensaje: error.message };
  const r = data as { ok: boolean; error?: string };
  if (!r.ok) return { ok: false, mensaje: r.error ?? 'No se pudo actualizar.' };

  revalidatePath('/panel/acciones');
  return { ok: true, mensaje: datos.estado === 'cerrada' ? 'Acción cerrada.' : 'Acción actualizada.' };
}

export async function eliminarAccion(accionId: string): Promise<Resultado> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc('eliminar_accion', { p_accion: accionId });

  if (error) return { ok: false, mensaje: error.message };
  const r = data as { ok: boolean; error?: string };
  if (!r.ok) return { ok: false, mensaje: r.error ?? 'No se pudo eliminar.' };

  revalidatePath('/panel/acciones');
  return { ok: true, mensaje: 'Acción eliminada.' };
}
