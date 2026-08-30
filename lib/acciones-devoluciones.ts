'use server';

/**
 * DOTACIÓN — devoluciones y alertas
 * ---------------------------------------------------------------
 * La devolución se registra POR ITEM, no por entrega completa: alguien
 * puede devolver el portátil y quedarse con el celular de la misma
 * acta. Forzar la devolución en bloque obligaría a inventar entregas
 * parciales que no ocurrieron.
 */
import { revalidatePath } from 'next/cache';
import { crearClienteServidor } from './supabase/servidor';
import { empresaActiva } from './empresa-activa';

export type EstadoFisico = 'nuevo' | 'bueno' | 'regular' | 'malo';
export type DestinoUnidad = 'disponible' | 'mantenimiento' | 'baja' | 'perdido';

export type ItemPorDevolver = {
  id: string;
  estado_entrega: EstadoFisico | null;
  accesorios: string | null;
  entrega_id: string;
  codigo: string;
  nombres: string;
  identificacion: string;
  cargo: string | null;
  area: string | null;
  fecha_entrega: string;
  articulo: string;
  articulo_codigo: string;
  articulo_foto: string | null;
  valor: number | null;
  unidad_id: string;
  placa: string;
  serial: string | null;
  unidad_foto: string | null;
  dias: number;
  empleado_inactivo: boolean;
};

export type Devolucion = {
  id: string;
  estado_entrega: EstadoFisico | null;
  estado_devolucion: EstadoFisico | null;
  fecha_devolucion: string;
  observaciones_devolucion: string | null;
  foto_devolucion_url: string | null;
  recibido_por: string | null;
  /** Código del acta de entrega de la que salió el equipo. */
  codigo: string;
  /** Código propio del acta de devolución, congelado al devolver. */
  devolucion_codigo: string | null;
  devolucion_nomenclatura: string | null;
  devolucion_version: string | null;
  nombres: string;
  fecha_entrega: string;
  articulo: string;
  placa: string;
  dias_uso: number;
  /** Escalones que bajó el estado físico. Positivo = se deterioró. */
  deterioro: number | null;
};

export type Alertas = {
  porVencer: Array<{
    id: string; entrega: string; nombres: string; identificacion: string;
    area: string | null; articulo: string; articulo_codigo: string;
    foto_url: string | null; cantidad: number; talla: string | null;
    fecha_vence: string; dias: number;
  }>;
  bajoMinimo: Array<{
    id: string; codigo: string; nombre: string; categoria: string | null;
    foto_url: string | null; unidad: string; stock_minimo: number; existencia: number;
  }>;
  deRetirados: Array<{
    id: string; entrega: string; nombres: string; identificacion: string;
    articulo: string; placa: string; valor: number | null;
    fecha_entrega: string; dias: number;
  }>;
  garantias: Array<{
    placa: string; articulo: string; garantia_hasta: string; dias: number;
  }>;
  totales: { enUso: number; devueltos: number };
};

export type Resultado = { ok: boolean; mensaje: string };

export async function listarPorDevolver(): Promise<ItemPorDevolver[]> {
  const empresa = await empresaActiva();
  if (!empresa) return [];

  const supabase = await crearClienteServidor();
  const { data } = await supabase.rpc('items_por_devolver', { p_empresa: empresa.id });
  return (data ?? []) as ItemPorDevolver[];
}

export async function listarDevoluciones(): Promise<Devolucion[]> {
  const empresa = await empresaActiva();
  if (!empresa) return [];

  const supabase = await crearClienteServidor();
  const { data } = await supabase.rpc('historial_devoluciones', { p_empresa: empresa.id });
  return (data ?? []) as Devolucion[];
}

/**
 * Registra la devolución de un equipo.
 * El destino de la unidad lo decide quien recibe: vuelve al inventario,
 * pasa a mantenimiento o se da de baja según cómo llegó.
 */
export async function devolverItem(datos: {
  itemId: string;
  estado: EstadoFisico;
  observaciones: string;
  fotoUrl: string | null;
  recibidoPor: string;
  firmaUrl: string | null;
  destino: DestinoUnidad;
}): Promise<Resultado> {
  if (!datos.recibidoPor.trim()) {
    return { ok: false, mensaje: 'Indica quién recibe el equipo.' };
  }

  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc('devolver_item', {
    p_item: datos.itemId,
    p_estado: datos.estado,
    p_observaciones: datos.observaciones,
    p_foto: datos.fotoUrl,
    p_recibido_por: datos.recibidoPor,
    p_firma: datos.firmaUrl,
    p_estado_unidad: datos.destino,
  });

  if (error) return { ok: false, mensaje: error.message };

  const r = data as {
    ok: boolean; error?: string; articulo?: string; placa?: string;
    estado_entrega?: string; estado_devolucion?: string;
  };
  if (!r.ok) return { ok: false, mensaje: r.error ?? 'No se pudo registrar.' };

  revalidatePath('/panel/dotacion');
  revalidatePath('/panel/dotacion/devoluciones');
  revalidatePath('/panel/dotacion/alertas');

  const cambio = r.estado_entrega !== r.estado_devolucion
    ? ` Se entregó ${r.estado_entrega} y volvió ${r.estado_devolucion}.`
    : '';

  return { ok: true, mensaje: `${r.placa} devuelto.${cambio}` };
}

export async function obtenerAlertas(dias = 60): Promise<Alertas> {
  const empresa = await empresaActiva();
  const vacio: Alertas = {
    porVencer: [], bajoMinimo: [], deRetirados: [], garantias: [],
    totales: { enUso: 0, devueltos: 0 },
  };
  if (!empresa) return vacio;

  const supabase = await crearClienteServidor();
  const { data } = await supabase.rpc('alertas_dotacion', {
    p_empresa: empresa.id,
    p_dias: dias,
  });

  return (data ?? vacio) as Alertas;
}
