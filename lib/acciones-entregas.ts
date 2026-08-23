'use server';

/**
 * DOTACIÓN — entregas
 * ---------------------------------------------------------------
 * El documento es idéntico para EPP y equipos; lo que cambia es qué
 * pasa al firmar:
 *
 *   consumible → descuenta existencia y calcula fecha de vencimiento
 *   retornable → marca la unidad como asignada
 *
 * Ambas cosas ocurren en la misma transacción que la firma, nunca al
 * crear el borrador: una entrega abandonada a medias no debe dejar
 * el inventario descuadrado.
 */
import { revalidatePath } from 'next/cache';
import { crearClienteServidor } from './supabase/servidor';
import { empresaActiva } from './empresa-activa';

export type UnidadLibre = { id: string; placa: string; serial: string | null };

export type ArticuloEntregable = {
  id: string;
  codigo: string;
  nombre: string;
  tipo: 'consumible' | 'retornable';
  categoria: string | null;
  foto_url: string | null;
  unidad: string;
  requiere_talla: boolean;
  vida_util_dias: number | null;
  existencia: number | null;
  unidades_libres: UnidadLibre[];
};

export type ItemEntrega = {
  articulo: string;
  cantidad: number;
  talla?: string;
  lote?: string;
  unidad?: string;
  estado_entrega?: string;
  accesorios?: string;
};

export type EntregaResumen = {
  id: string;
  codigo: string;
  nombres: string;
  identificacion: string;
  cargo: string | null;
  area: string | null;
  entregado_por: string;
  estado: 'borrador' | 'firmada' | 'anulada';
  fecha_entrega: string;
  items: number;
  sin_devolver: number;
};

export type ItemDetalle = {
  id: string;
  articulo_id: string;
  codigo: string;
  nombre: string;
  tipo: 'consumible' | 'retornable';
  unidad: string;
  foto_url: string | null;
  cantidad: number;
  talla: string | null;
  lote: string | null;
  fecha_vence: string | null;
  placa: string | null;
  serial: string | null;
  estado_entrega: string | null;
  accesorios: string | null;
  fecha_devolucion: string | null;
  estado_devolucion: string | null;
};

export type Entrega = {
  id: string;
  codigo: string;
  nombres: string;
  identificacion: string;
  cargo: string | null;
  area: string | null;
  entregado_por: string;
  observaciones: string | null;
  declaracion: string | null;
  nomenclatura: string | null;
  version_doc: string | null;
  titulo_doc: string | null;
  estado: 'borrador' | 'firmada' | 'anulada';
  fecha_entrega: string;
  firma_recibe_url: string | null;
  firma_entrega_url: string | null;
};

export type DetalleEntrega = {
  ok: boolean;
  error?: string;
  entrega?: Entrega;
  items?: ItemDetalle[];
};

export type Resultado = {
  ok: boolean;
  mensaje: string;
  id?: string;
  codigo?: string;
};

/**
 * Artículos con existencia o unidades libres.
 * Al editar un borrador se pasa su id: las unidades ya elegidas en él
 * siguen apareciendo como disponibles, porque de lo contrario el
 * selector no podría mostrarlas.
 */
export async function listarEntregables(
  entregaId?: string
): Promise<ArticuloEntregable[]> {
  const empresa = await empresaActiva();
  if (!empresa) return [];

  const supabase = await crearClienteServidor();
  const { data } = await supabase.rpc('articulos_entregables_edicion', {
    p_empresa: empresa.id,
    p_entrega: entregaId ?? null,
  });

  return (data ?? []) as ArticuloEntregable[];
}

export async function listarEntregas(): Promise<EntregaResumen[]> {
  const empresa = await empresaActiva();
  if (!empresa) return [];

  const supabase = await crearClienteServidor();
  const { data } = await supabase.rpc('listar_entregas', { p_empresa: empresa.id });

  return (data ?? []) as EntregaResumen[];
}

export async function obtenerEntrega(id: string): Promise<DetalleEntrega> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc('detalle_entrega', { p_entrega: id });

  if (error) return { ok: false, error: error.message };
  return (data ?? { ok: false, error: 'Sin datos.' }) as DetalleEntrega;
}

/** Crea la entrega en borrador. No toca el inventario todavía. */
export async function crearEntrega(datos: {
  empleadoId: string;
  entregadoPor: string;
  observaciones: string;
  items: ItemEntrega[];
}): Promise<Resultado> {
  if (!datos.empleadoId) return { ok: false, mensaje: 'Selecciona a quién se entrega.' };
  if (!datos.entregadoPor.trim()) return { ok: false, mensaje: 'Indica quién entrega.' };
  if (datos.items.length === 0) return { ok: false, mensaje: 'Agrega al menos un artículo.' };

  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc('crear_entrega', {
    p_empleado: datos.empleadoId,
    p_entregado_por: datos.entregadoPor,
    p_observaciones: datos.observaciones,
    p_items: datos.items,
  });

  if (error) return { ok: false, mensaje: error.message };

  const r = data as { ok: boolean; error?: string; id?: string; codigo?: string };
  if (!r.ok) return { ok: false, mensaje: r.error ?? 'No se pudo crear la entrega.' };

  revalidatePath('/panel/dotacion/entregas');
  return { ok: true, mensaje: `Entrega ${r.codigo} creada.`, id: r.id, codigo: r.codigo };
}

/**
 * Firma y aplica. En una sola transacción descuenta existencias, marca
 * unidades como asignadas y calcula las fechas de vencimiento.
 */
export async function firmarEntrega(
  entregaId: string,
  firmaRecibe: string,
  firmaEntrega?: string | null
): Promise<Resultado> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc('firmar_entrega', {
    p_entrega: entregaId,
    p_firma_recibe: firmaRecibe,
    p_firma_entrega: firmaEntrega ?? null,
  });

  if (error) return { ok: false, mensaje: error.message };

  const r = data as { ok: boolean; error?: string; codigo?: string };
  if (!r.ok) return { ok: false, mensaje: r.error ?? 'No se pudo firmar.' };

  revalidatePath('/panel/dotacion');
  revalidatePath('/panel/dotacion/entregas');
  revalidatePath(`/panel/dotacion/entregas/${entregaId}`);

  return { ok: true, mensaje: `Entrega ${r.codigo} firmada.`, codigo: r.codigo };
}

/**
 * Anula una entrega en borrador.
 * Una entrega firmada no se anula: es un documento con valor
 * probatorio. Para revertirla se registra la devolución.
 */
export async function anularBorrador(entregaId: string): Promise<Resultado> {
  const supabase = await crearClienteServidor();

  const { data: ent } = await supabase
    .from('entregas')
    .select('estado')
    .eq('id', entregaId)
    .maybeSingle();

  if (ent?.estado !== 'borrador') {
    return { ok: false, mensaje: 'Solo se pueden eliminar borradores sin firmar.' };
  }

  const { error } = await supabase.from('entregas').delete().eq('id', entregaId);
  if (error) return { ok: false, mensaje: error.message };

  revalidatePath('/panel/dotacion/entregas');
  return { ok: true, mensaje: 'Borrador eliminado.' };
}

/** Empleados de la empresa activa para el selector. */
export async function empleadosParaEntrega(): Promise<Array<{
  id: string; identificacion: string; nombres: string;
  cargo: string | null; area: string | null;
}>> {
  const empresa = await empresaActiva();
  if (!empresa) return [];

  const supabase = await crearClienteServidor();
  const { data } = await supabase
    .from('empleados')
    .select('id, identificacion, nombres, cargo, area')
    .eq('empresa_id', empresa.id)
    .eq('activo', true)
    .order('nombres');

  return data ?? [];
}


/**
 * Actualiza una entrega en borrador.
 * Una entrega firmada no se edita: es un documento con valor
 * probatorio. Para revertirla se registra la devolución.
 */
export async function actualizarEntrega(
  entregaId: string,
  datos: {
    entregadoPor: string;
    observaciones: string;
    items: ItemEntrega[];
  }
): Promise<Resultado> {
  if (!datos.entregadoPor.trim()) return { ok: false, mensaje: 'Indica quién entrega.' };
  if (datos.items.length === 0) return { ok: false, mensaje: 'Agrega al menos un artículo.' };

  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc('actualizar_entrega', {
    p_entrega: entregaId,
    p_entregado_por: datos.entregadoPor,
    p_observaciones: datos.observaciones,
    p_items: datos.items,
  });

  if (error) return { ok: false, mensaje: error.message };

  const r = data as { ok: boolean; error?: string; codigo?: string; items?: number };
  if (!r.ok) return { ok: false, mensaje: r.error ?? 'No se pudo actualizar.' };

  revalidatePath('/panel/dotacion/entregas');
  revalidatePath(`/panel/dotacion/entregas/${entregaId}`);

  return { ok: true, mensaje: `Entrega ${r.codigo} actualizada con ${r.items} elemento(s).` };
}
