'use server';

/**
 * AGENDA — planeación visual
 * ---------------------------------------------------------------
 * Anotaciones para ver el trimestre antes de comprometer fechas.
 * NO son capacitaciones: cuando llega el momento se crea la
 * capacitación real, con su código y su acta.
 *
 * Mantenerlos separados evita tener veinte capacitaciones a medio
 * hacer compitiendo por el índice de "una sola activa por empresa".
 */
import { revalidatePath } from 'next/cache';
import { crearClienteServidor } from './supabase/servidor';
import { obtenerPerfil } from './sesion';

/**
 * Debe coincidir EXACTAMENTE con el CHECK 'tipo_agenda' de la tabla:
 * capacitacion, inspeccion, entrega, auditoria, otro. Antes decia
 * 'reunion' (que la base rechaza) y omitia 'auditoria' (que el
 * formulario si ofrece), asi que el tipo mentia en ambas direcciones.
 */
export type TipoEvento = 'capacitacion' | 'inspeccion' | 'entrega' | 'auditoria' | 'otro';

/**
 * Evento del calendario. `origen` distingue las tres naturalezas:
 *   'capacitacion' → documento real, no editable desde aquí
 *   'agenda'       → anotación de planeación, editable
 *   'programacion' → inspección programada, se gestiona en su cronograma
 */
export type EventoCalendario = {
  id: string;
  fecha: string;
  hora: string | null;
  titulo: string;
  tipo: TipoEvento;
  detalle: string | null;
  empresa: string;
  empresaId: string;
  color: string;
  origen: 'capacitacion' | 'agenda' | 'programacion';
  codigo: string | null;
  estado: string | null;
};

export type Resultado = { ok: boolean; mensaje: string; id?: string };

/** Eventos del rango. Sin empresaId devuelve los de todas las empresas. */
export async function obtenerCalendario(
  desde: string,
  hasta: string,
  empresaId?: string | null
): Promise<EventoCalendario[]> {
  const supabase = await crearClienteServidor();

  const { data } = await supabase.rpc('calendario', {
    p_desde: desde,
    p_hasta: hasta,
    p_empresa: empresaId ?? null,
  });

  // La función devuelve nombres en snake_case; se adaptan aquí para
  // que el componente trabaje con un único formato.
  return ((data ?? []) as Array<Record<string, unknown>>).map((r) => ({
    id: String(r.id),
    fecha: String(r.fecha),
    hora: (r.hora as string | null)?.slice(0, 5) ?? null,
    titulo: String(r.titulo),
    tipo: (r.tipo as TipoEvento) ?? 'otro',
    detalle: (r.notas as string | null) ?? null,
    empresa: String(r.empresa ?? ''),
    empresaId: String(r.empresa_id ?? ''),
    color: String(r.color ?? '#14263F'),
    origen: r.es_programacion ? 'programacion'
          : r.es_capacitacion ? 'capacitacion' : 'agenda',
    codigo: (r.codigo as string | null) ?? null,
    estado: (r.estado as string | null) ?? null,
  }));
}

export async function crearEvento(datos: {
  titulo: string;
  fecha: string;
  hora: string;
  tipo: TipoEvento;
  notas: string;
  empresaId: string | null;
}): Promise<Resultado> {
  const perfil = await obtenerPerfil();
  if (!perfil) return { ok: false, mensaje: 'Sesión no válida.' };

  if (!datos.titulo.trim()) return { ok: false, mensaje: 'Escribe un título.' };
  if (!datos.fecha) return { ok: false, mensaje: 'Indica la fecha.' };
  if (!datos.empresaId) {
    return { ok: false, mensaje: 'Selecciona una empresa antes de anotar.' };
  }

  const supabase = await crearClienteServidor();
  const { data, error } = await supabase
    .from('agenda')
    .insert({
      org_id: perfil.organizacion.id,
      empresa_id: datos.empresaId,
      titulo: datos.titulo.trim(),
      fecha: datos.fecha,
      hora: datos.hora || null,
      tipo: datos.tipo,
      notas: datos.notas.trim() || null,
    })
    .select('id')
    .single();

  if (error) return { ok: false, mensaje: error.message };

  revalidatePath('/panel/calendario');
  return { ok: true, mensaje: 'Anotación agregada.', id: data.id };
}

export async function actualizarEvento(
  id: string,
  datos: { titulo: string; fecha: string; hora: string; tipo: TipoEvento; notas: string }
): Promise<Resultado> {
  if (!datos.titulo.trim()) return { ok: false, mensaje: 'Escribe un título.' };

  const supabase = await crearClienteServidor();
  const { error } = await supabase
    .from('agenda')
    .update({
      titulo: datos.titulo.trim(),
      fecha: datos.fecha,
      hora: datos.hora || null,
      tipo: datos.tipo,
      notas: datos.notas.trim() || null,
    })
    .eq('id', id);

  if (error) return { ok: false, mensaje: error.message };

  revalidatePath('/panel/calendario');
  return { ok: true, mensaje: 'Anotación actualizada.' };
}

/**
 * Ata la anotacion a la capacitacion real que nacio de ella.
 * La funcion `calendario` ignora las anotaciones con capacitacion_id,
 * de modo que el dia deja de mostrar el plan y la capacitacion a la
 * vez: queda solo el documento real, sin perder el rastro de que
 * aquello se habia planeado.
 */
export async function vincularAnotacion(
  idAgenda: string,
  idCapacitacion: string
): Promise<Resultado> {
  const supabase = await crearClienteServidor();
  const { error } = await supabase
    .from('agenda')
    .update({ capacitacion_id: idCapacitacion })
    .eq('id', idAgenda);

  if (error) return { ok: false, mensaje: error.message };

  revalidatePath('/panel/calendario');
  return { ok: true, mensaje: 'Anotación vinculada.' };
}

export async function eliminarEvento(id: string): Promise<Resultado> {
  const supabase = await crearClienteServidor();
  const { error } = await supabase.from('agenda').delete().eq('id', id);

  if (error) return { ok: false, mensaje: error.message };

  revalidatePath('/panel/calendario');
  return { ok: true, mensaje: 'Anotación eliminada.' };
}
