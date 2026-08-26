'use server';

/**
 * PROGRAMACIÓN DE INSPECCIONES — fase 8
 * ---------------------------------------------------------------
 * Las plantillas ya declaraban su periodicidad ("los extintores se
 * revisan cada mes"), pero nadie la usaba: el consultor tenía que
 * acordarse. Aquí esa periodicidad se convierte en un cronograma.
 *
 * El aviso es VISUAL —en el listado y en el calendario—, no por
 * correo: notificar exige que el responsable tenga correo registrado,
 * y hoy la tabla de empleados no lo pide.
 *
 * El estado "vencida" se deriva al leer, como en el plan de acción:
 * una fecha que pasa no debe requerir que alguien actualice la fila.
 */
import { revalidatePath } from 'next/cache';
import { crearClienteServidor } from './supabase/servidor';
import { empresaActiva } from './empresa-activa';

export type EstadoProgramacion =
  | 'pendiente' | 'proxima' | 'vencida' | 'cumplida' | 'cancelada';

export type Programacion = {
  id: string;
  plantilla_id: string;
  nombre: string;
  tipo_objeto: string | null;
  objeto_id: string | null;
  objeto_nombre: string | null;
  responsable: string | null;
  fecha_programada: string;
  periodicidad: string | null;
  notas: string | null;
  estado: string;
  inspeccion_id: string | null;
  /** Días hasta la fecha prevista; negativo si ya pasó. */
  dias: number;
  estado_real: EstadoProgramacion;
};

export type Resultado = { ok: boolean; mensaje: string; id?: string };

export async function listarProgramaciones(
  incluirCerradas = false
): Promise<Programacion[]> {
  const empresa = await empresaActiva();
  if (!empresa) return [];

  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc('listar_programaciones', {
    p_empresa: empresa.id,
    p_incluir_cerradas: incluirCerradas,
  });

  if (error) {
    console.error('listarProgramaciones:', error.message);
    return [];
  }

  return (data ?? []) as Programacion[];
}

export async function programarInspeccion(datos: {
  plantillaId: string;
  fecha: string;
  responsable: string;
  objetoNombre: string;
  periodicidad: string;
  notas: string;
}): Promise<Resultado> {
  const empresa = await empresaActiva();
  if (!empresa) return { ok: false, mensaje: 'No hay empresa seleccionada.' };

  if (!datos.plantillaId) return { ok: false, mensaje: 'Elige la lista de verificación.' };
  if (!datos.fecha) return { ok: false, mensaje: 'Indica la fecha.' };

  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc('programar_inspeccion', {
    p_plantilla: datos.plantillaId,
    p_empresa: empresa.id,
    p_fecha: datos.fecha,
    p_responsable: datos.responsable || null,
    p_tipo_objeto: datos.objetoNombre ? 'area' : null,
    p_objeto_id: null,
    p_objeto_nombre: datos.objetoNombre || null,
    p_periodicidad: datos.periodicidad || null,
    p_notas: datos.notas || null,
  });

  if (error) return { ok: false, mensaje: error.message };

  const r = data as { ok: boolean; error?: string; id?: string };
  if (!r.ok) return { ok: false, mensaje: r.error ?? 'No se pudo programar.' };

  revalidatePath('/panel/inspecciones');
  revalidatePath('/panel/inspecciones/programadas');
  revalidatePath('/panel/calendario');
  return { ok: true, mensaje: 'Inspección programada.', id: r.id };
}

/**
 * Cierra la programación. Si es periódica, la base deja creada la
 * siguiente a partir de la fecha PREVISTA, no de hoy: un retraso no
 * debe correr el cronograma del resto del año.
 */
export async function cumplirProgramacion(
  id: string,
  inspeccionId?: string
): Promise<Resultado> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc('cumplir_programacion', {
    p_programacion: id,
    p_inspeccion: inspeccionId ?? null,
  });

  if (error) return { ok: false, mensaje: error.message };

  const r = data as { ok: boolean; error?: string; siguiente?: string };
  if (!r.ok) return { ok: false, mensaje: r.error ?? 'No se pudo cerrar.' };

  revalidatePath('/panel/inspecciones');
  revalidatePath('/panel/inspecciones/programadas');
  revalidatePath('/panel/calendario');

  return {
    ok: true,
    mensaje: r.siguiente
      ? `Marcada como realizada. La siguiente queda para el ${r.siguiente}.`
      : 'Marcada como realizada.',
  };
}

export async function cancelarProgramacion(id: string): Promise<Resultado> {
  const supabase = await crearClienteServidor();
  const { error } = await supabase
    .from('inspeccion_programaciones')
    .update({ estado: 'cancelada' })
    .eq('id', id);

  if (error) return { ok: false, mensaje: error.message };

  revalidatePath('/panel/inspecciones');
  revalidatePath('/panel/inspecciones/programadas');
  revalidatePath('/panel/calendario');
  return { ok: true, mensaje: 'Programación cancelada.' };
}
