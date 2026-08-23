'use server';

/**
 * DOTACIÓN — catálogo de artículos
 * ---------------------------------------------------------------
 * EPP y equipos comparten módulo porque el documento de entrega es
 * idéntico. El discriminador `tipo` resuelve lo que difiere:
 *
 *   consumible → se controla por cantidad, vence, se repone
 *   retornable → se controla por unidad con serial, se devuelve
 */
import { revalidatePath } from 'next/cache';
import { crearClienteServidor } from './supabase/servidor';
import { obtenerPerfil } from './sesion';
import { empresaActiva } from './empresa-activa';

export type TipoArticulo = 'consumible' | 'retornable';
export type EstadoUnidad = 'disponible' | 'asignado' | 'mantenimiento' | 'baja' | 'perdido';

export type Articulo = {
  id: string;
  codigo: string;
  nombre: string;
  tipo: TipoArticulo;
  categoria: string | null;
  descripcion: string | null;
  foto_url: string | null;
  marca: string | null;
  modelo: string | null;
  norma: string | null;
  valor: number | null;
  unidad: string;
  vida_util_dias: number | null;
  requiere_talla: boolean;
  stock_minimo: number;
  created_at: string;
  /** Solo consumibles */
  existencia: number | null;
  bajo_minimo: boolean;
  /** Solo retornables */
  unidades: number | null;
  disponibles: number | null;
};

export type Unidad = {
  id: string;
  placa: string;
  serial: string | null;
  foto_url: string | null;
  estado: EstadoUnidad;
  fecha_compra: string | null;
  garantia_hasta: string | null;
  observaciones: string | null;
  asignado_a: string | null;
};

export type Movimiento = {
  id: string;
  tipo: string;
  cantidad: number;
  motivo: string | null;
  fecha: string;
};

export type Ficha = {
  ok: boolean;
  error?: string;
  articulo?: Articulo;
  existencia?: number | null;
  unidades?: Unidad[];
  movimientos?: Movimiento[];
};

export type Resultado = { ok: boolean; mensaje: string; id?: string };

export type DatosArticulo = {
  nombre: string;
  tipo: TipoArticulo;
  categoria: string;
  descripcion: string;
  marca: string;
  modelo: string;
  norma: string;
  valor: string;
  unidad: string;
  vida_util_dias: string;
  requiere_talla: boolean;
  stock_minimo: string;
};

/** Categorías sugeridas según el tipo. */
export async function categoriasSugeridas(tipo: TipoArticulo): Promise<string[]> {
  return tipo === 'consumible'
    ? ['CABEZA', 'OJOS Y ROSTRO', 'AUDITIVA', 'RESPIRATORIA', 'MANOS',
       'CUERPO', 'PIES', 'ALTURAS', 'DOTACIÓN']
    : ['CÓMPUTO', 'COMUNICACIONES', 'HERRAMIENTA', 'MEDICIÓN',
       'VEHÍCULO', 'MOBILIARIO', 'OTRO'];
}

/** Catálogo de la empresa activa. Sin tipo, devuelve ambos. */
export async function listarArticulos(tipo?: TipoArticulo): Promise<Articulo[]> {
  const empresa = await empresaActiva();
  if (!empresa) return [];

  const supabase = await crearClienteServidor();
  const { data } = await supabase.rpc('catalogo_articulos', {
    p_empresa: empresa.id,
    p_tipo: tipo ?? null,
  });

  return (data ?? []) as Articulo[];
}

export async function obtenerFichaArticulo(id: string): Promise<Ficha> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc('ficha_articulo', { p_articulo: id });

  if (error) return { ok: false, error: error.message };
  return (data ?? { ok: false, error: 'Sin datos.' }) as Ficha;
}

function validar(d: DatosArticulo): string | null {
  if (!d.nombre.trim()) return 'El nombre del artículo es obligatorio.';
  if (d.tipo === 'consumible') {
    if (d.vida_util_dias && Number(d.vida_util_dias) <= 0) {
      return 'La vida útil debe ser mayor a cero.';
    }
    if (d.stock_minimo && Number(d.stock_minimo) < 0) {
      return 'El stock mínimo no puede ser negativo.';
    }
  }
  return null;
}

export async function crearArticulo(d: DatosArticulo): Promise<Resultado> {
  const perfil = await obtenerPerfil();
  const empresa = await empresaActiva();
  if (!perfil || !empresa) return { ok: false, mensaje: 'No hay empresa seleccionada.' };

  const error = validar(d);
  if (error) return { ok: false, mensaje: error };

  const supabase = await crearClienteServidor();

  const { data: codigo, error: errCodigo } = await supabase
    .rpc('siguiente_codigo_articulo', { p_empresa: empresa.id, p_tipo: d.tipo });

  if (errCodigo) return { ok: false, mensaje: 'No se pudo generar el código.' };

  const { data, error: errIns } = await supabase
    .from('articulos')
    .insert({
      org_id: perfil.organizacion.id,
      empresa_id: empresa.id,
      codigo,
      nombre: d.nombre.trim().toUpperCase(),
      tipo: d.tipo,
      categoria: d.categoria || null,
      descripcion: d.descripcion || null,
      marca: d.marca || null,
      modelo: d.modelo || null,
      norma: d.norma || null,
      valor: d.valor ? Number(d.valor) : null,
      // Los campos de consumible no aplican al retornable
      unidad: d.tipo === 'consumible' ? (d.unidad || 'UNIDAD') : 'UNIDAD',
      vida_util_dias: d.tipo === 'consumible' && d.vida_util_dias
        ? Number(d.vida_util_dias) : null,
      requiere_talla: d.tipo === 'consumible' ? d.requiere_talla : false,
      stock_minimo: d.tipo === 'consumible' && d.stock_minimo
        ? Number(d.stock_minimo) : 0,
    })
    .select('id')
    .single();

  if (errIns) {
    if (errIns.code === '23505') {
      return { ok: false, mensaje: 'Ya existe un artículo con ese código.' };
    }
    return { ok: false, mensaje: errIns.message };
  }

  revalidatePath('/panel/dotacion');
  return { ok: true, mensaje: `${codigo} creado.`, id: data.id };
}

export async function actualizarArticulo(
  id: string,
  d: DatosArticulo
): Promise<Resultado> {
  const error = validar(d);
  if (error) return { ok: false, mensaje: error };

  const supabase = await crearClienteServidor();
  const { error: errUpd } = await supabase
    .from('articulos')
    .update({
      nombre: d.nombre.trim().toUpperCase(),
      categoria: d.categoria || null,
      descripcion: d.descripcion || null,
      marca: d.marca || null,
      modelo: d.modelo || null,
      norma: d.norma || null,
      valor: d.valor ? Number(d.valor) : null,
      unidad: d.tipo === 'consumible' ? (d.unidad || 'UNIDAD') : 'UNIDAD',
      vida_util_dias: d.tipo === 'consumible' && d.vida_util_dias
        ? Number(d.vida_util_dias) : null,
      requiere_talla: d.tipo === 'consumible' ? d.requiere_talla : false,
      stock_minimo: d.tipo === 'consumible' && d.stock_minimo
        ? Number(d.stock_minimo) : 0,
    })
    .eq('id', id);

  if (errUpd) return { ok: false, mensaje: errUpd.message };

  revalidatePath('/panel/dotacion');
  revalidatePath(`/panel/dotacion/${id}`);
  return { ok: true, mensaje: 'Artículo actualizado.' };
}

/** Guarda la foto tras subirla al bucket. */
export async function guardarFotoArticulo(
  id: string,
  url: string | null
): Promise<Resultado> {
  const supabase = await crearClienteServidor();
  const { error } = await supabase
    .from('articulos')
    .update({ foto_url: url })
    .eq('id', id);

  if (error) return { ok: false, mensaje: error.message };

  revalidatePath('/panel/dotacion');
  revalidatePath(`/panel/dotacion/${id}`);
  return { ok: true, mensaje: url ? 'Fotografía guardada.' : 'Fotografía eliminada.' };
}

/**
 * Se desactiva en vez de borrar: las entregas ya firmadas lo
 * referencian y son documentos con valor probatorio.
 */
export async function archivarArticulo(id: string): Promise<Resultado> {
  const supabase = await crearClienteServidor();
  const { error } = await supabase
    .from('articulos')
    .update({ activo: false })
    .eq('id', id);

  if (error) return { ok: false, mensaje: error.message };

  revalidatePath('/panel/dotacion');
  return { ok: true, mensaje: 'Artículo archivado. Sus entregas se conservan.' };
}

/** Ingreso de mercancía. Solo consumibles. */
export async function registrarIngreso(
  articuloId: string,
  cantidad: number,
  motivo: string
): Promise<Resultado> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc('registrar_ingreso', {
    p_articulo: articuloId,
    p_cantidad: cantidad,
    p_motivo: motivo || null,
  });

  if (error) return { ok: false, mensaje: error.message };

  const r = data as { ok: boolean; error?: string; existencia?: number };
  if (!r.ok) return { ok: false, mensaje: r.error ?? 'No se pudo registrar.' };

  revalidatePath('/panel/dotacion');
  revalidatePath(`/panel/dotacion/${articuloId}`);
  return { ok: true, mensaje: `Ingreso registrado. Existencia: ${r.existencia}.` };
}

// ===================== UNIDADES =====================

export async function crearUnidad(datos: {
  articuloId: string;
  placa: string;
  serial: string;
  fecha_compra: string;
  garantia_hasta: string;
  observaciones: string;
}): Promise<Resultado> {
  const perfil = await obtenerPerfil();
  const empresa = await empresaActiva();
  if (!perfil || !empresa) return { ok: false, mensaje: 'No hay empresa seleccionada.' };

  if (!datos.placa.trim()) return { ok: false, mensaje: 'La placa es obligatoria.' };

  const supabase = await crearClienteServidor();
  const { data, error } = await supabase
    .from('articulo_unidades')
    .insert({
      org_id: perfil.organizacion.id,
      empresa_id: empresa.id,
      articulo_id: datos.articuloId,
      placa: datos.placa.trim().toUpperCase(),
      serial: datos.serial.trim().toUpperCase() || null,
      fecha_compra: datos.fecha_compra || null,
      garantia_hasta: datos.garantia_hasta || null,
      observaciones: datos.observaciones || null,
    })
    .select('id')
    .single();

  if (error) {
    if (error.code === '23505') {
      return { ok: false, mensaje: 'Ya existe una unidad con esa placa.' };
    }
    return { ok: false, mensaje: error.message };
  }

  revalidatePath(`/panel/dotacion/${datos.articuloId}`);
  return { ok: true, mensaje: `Unidad ${datos.placa} registrada.`, id: data.id };
}

export async function actualizarUnidad(
  id: string,
  articuloId: string,
  datos: {
    serial: string;
    estado: EstadoUnidad;
    fecha_compra: string;
    garantia_hasta: string;
    observaciones: string;
  }
): Promise<Resultado> {
  const supabase = await crearClienteServidor();
  const { error } = await supabase
    .from('articulo_unidades')
    .update({
      serial: datos.serial.trim().toUpperCase() || null,
      estado: datos.estado,
      fecha_compra: datos.fecha_compra || null,
      garantia_hasta: datos.garantia_hasta || null,
      observaciones: datos.observaciones || null,
    })
    .eq('id', id);

  if (error) return { ok: false, mensaje: error.message };

  revalidatePath(`/panel/dotacion/${articuloId}`);
  return { ok: true, mensaje: 'Unidad actualizada.' };
}

export async function guardarFotoUnidad(
  id: string,
  articuloId: string,
  url: string | null
): Promise<Resultado> {
  const supabase = await crearClienteServidor();
  const { error } = await supabase
    .from('articulo_unidades')
    .update({ foto_url: url })
    .eq('id', id);

  if (error) return { ok: false, mensaje: error.message };

  revalidatePath(`/panel/dotacion/${articuloId}`);
  return { ok: true, mensaje: 'Fotografía guardada.' };
}

export async function archivarUnidad(
  id: string,
  articuloId: string
): Promise<Resultado> {
  const supabase = await crearClienteServidor();
  const { error } = await supabase
    .from('articulo_unidades')
    .update({ activo: false })
    .eq('id', id);

  if (error) return { ok: false, mensaje: error.message };

  revalidatePath(`/panel/dotacion/${articuloId}`);
  return { ok: true, mensaje: 'Unidad dada de baja.' };
}
