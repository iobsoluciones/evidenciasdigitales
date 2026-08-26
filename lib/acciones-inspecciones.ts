'use server';

/**
 * INSPECCIONES — banco de plantillas
 * ---------------------------------------------------------------
 * Las plantillas pertenecen a la CUENTA, no a la empresa: una lista de
 * verificación de extintores sirve para todos los clientes.
 *
 * Las precargadas son punto de partida, no dogma. Se editan, se
 * duplican y se adaptan a cada cliente — que es como trabaja de verdad
 * un consultor.
 */
import { revalidatePath } from 'next/cache';
import { crearClienteServidor } from './supabase/servidor';

export type TipoInspeccion = 'planeada' | 'equipo' | 'area' | 'auditoria';
export type TipoRespuesta = 'cumple' | 'numerico' | 'texto';
export type Periodicidad =
  | 'diaria' | 'semanal' | 'mensual' | 'bimestral'
  | 'trimestral' | 'semestral' | 'anual' | 'uso';

export type PlantillaInspeccion = {
  id: string;
  nombre: string;
  tipo: TipoInspeccion;
  descripcion: string | null;
  norma: string | null;
  periodicidad: Periodicidad | null;
  veces_usada: number;
  es_base: boolean;
  created_at: string;
  items: number;
  criticos: number;
  secciones: string[];
};

export type ItemInspeccion = {
  id?: string;
  orden: number;
  seccion: string;
  criterio: string;
  tipo_respuesta: TipoRespuesta;
  peso: number;
  critico: boolean;
  ayuda: string;
};

export type DetallePlantilla = {
  ok: boolean;
  error?: string;
  plantilla?: {
    id: string; nombre: string; tipo: TipoInspeccion;
    descripcion: string | null; norma: string | null;
    periodicidad: Periodicidad | null; es_base: boolean; veces_usada: number;
  };
  items?: ItemInspeccion[];
};

export type Resultado = { ok: boolean; mensaje: string; id?: string };

/** Inspeccion practicada sobre una unidad concreta del inventario. */
export type InspeccionDeUnidad = {
  unidadId: string;
  id: string;
  codigo: string;
  nombre: string;
  fecha: string;
  puntaje: number | null;
  cumple: boolean | null;
  estado: string;
};

/**
 * Historial de inspecciones de un conjunto de unidades.
 *
 * Al crear una inspeccion de equipo ya se guardaba tipo_objeto='unidad'
 * con su objeto_id, pero ese dato no se leia en ninguna parte: la ficha
 * del arnes no mostraba sus inspecciones. Es lo que pide una auditoria
 * de trabajo en alturas, junto al historial de entregas.
 */
export async function inspeccionesDeUnidades(
  unidadIds: string[]
): Promise<InspeccionDeUnidad[]> {
  if (unidadIds.length === 0) return [];

  const supabase = await crearClienteServidor();
  const { data, error } = await supabase
    .from('inspecciones')
    .select('id, codigo, nombre, fecha, puntaje, cumple, estado, objeto_id')
    .eq('tipo_objeto', 'unidad')
    .in('objeto_id', unidadIds)
    .order('fecha', { ascending: false });

  if (error) {
    console.error('inspeccionesDeUnidades:', error.message);
    return [];
  }

  return (data ?? []).map((r) => ({
    unidadId: String(r.objeto_id),
    id: String(r.id),
    codigo: String(r.codigo),
    nombre: String(r.nombre),
    fecha: String(r.fecha),
    puntaje: r.puntaje === null ? null : Number(r.puntaje),
    cumple: r.cumple as boolean | null,
    estado: String(r.estado),
  }));
}

export async function listarPlantillasInspeccion(): Promise<PlantillaInspeccion[]> {
  const supabase = await crearClienteServidor();
  const { data } = await supabase.rpc('listar_plantillas_inspeccion');
  return (data ?? []) as PlantillaInspeccion[];
}

export async function obtenerPlantillaInspeccion(id: string): Promise<DetallePlantilla> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc('detalle_plantilla_inspeccion', {
    p_plantilla: id,
  });

  if (error) return { ok: false, error: error.message };
  return (data ?? { ok: false, error: 'Sin datos.' }) as DetallePlantilla;
}

export async function crearPlantillaInspeccion(datos: {
  nombre: string;
  tipo: TipoInspeccion;
  descripcion: string;
  norma: string;
  periodicidad: string;
}): Promise<Resultado> {
  if (!datos.nombre.trim()) return { ok: false, mensaje: 'Escribe un nombre.' };

  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc('crear_plantilla_inspeccion', {
    p_nombre: datos.nombre,
    p_tipo: datos.tipo,
    p_descripcion: datos.descripcion || null,
    p_norma: datos.norma || null,
    p_periodicidad: datos.periodicidad || null,
  });

  if (error) return { ok: false, mensaje: error.message };

  const r = data as { ok: boolean; error?: string; id?: string };
  if (!r.ok) return { ok: false, mensaje: r.error ?? 'No se pudo crear.' };

  revalidatePath('/panel/inspecciones/plantillas');
  return { ok: true, mensaje: 'Plantilla creada. Ahora agrega los criterios.', id: r.id };
}

/**
 * Reemplaza los criterios de una plantilla.
 * Es seguro borrarlos: las inspecciones ya realizadas copiaron sus
 * criterios al ejecutarse, no los referencian.
 */
export async function guardarItemsInspeccion(
  plantillaId: string,
  datos: {
    nombre: string;
    descripcion: string;
    norma: string;
    periodicidad: string;
    items: ItemInspeccion[];
  }
): Promise<Resultado> {
  if (!datos.nombre.trim()) return { ok: false, mensaje: 'Escribe un nombre.' };

  const validos = datos.items.filter((i) => i.criterio.trim());
  if (validos.length === 0) {
    return { ok: false, mensaje: 'Agrega al menos un criterio.' };
  }

  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc('guardar_items_inspeccion', {
    p_plantilla: plantillaId,
    p_nombre: datos.nombre,
    p_descripcion: datos.descripcion,
    p_norma: datos.norma,
    p_periodicidad: datos.periodicidad,
    p_items: validos,
  });

  if (error) return { ok: false, mensaje: error.message };

  const r = data as { ok: boolean; error?: string; items?: number };
  if (!r.ok) return { ok: false, mensaje: r.error ?? 'No se pudo guardar.' };

  revalidatePath('/panel/inspecciones/plantillas');
  revalidatePath(`/panel/inspecciones/plantillas/${plantillaId}`);

  return { ok: true, mensaje: `Plantilla guardada con ${r.items} criterio(s).` };
}

/**
 * Duplica una plantilla. Útil para adaptar una base a un cliente
 * concreto sin perder la original.
 */
export async function duplicarPlantillaInspeccion(
  id: string,
  nombre?: string
): Promise<Resultado> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc('duplicar_plantilla_inspeccion', {
    p_plantilla: id,
    p_nombre: nombre ?? null,
  });

  if (error) return { ok: false, mensaje: error.message };

  const r = data as { ok: boolean; error?: string; id?: string };
  if (!r.ok) return { ok: false, mensaje: r.error ?? 'No se pudo duplicar.' };

  revalidatePath('/panel/inspecciones/plantillas');
  return { ok: true, mensaje: 'Plantilla duplicada.', id: r.id };
}

/** Se desactiva en vez de borrar: las inspecciones la referencian. */
export async function archivarPlantillaInspeccion(id: string): Promise<Resultado> {
  const supabase = await crearClienteServidor();
  const { error } = await supabase
    .from('inspeccion_plantillas')
    .update({ activa: false })
    .eq('id', id);

  if (error) return { ok: false, mensaje: error.message };

  revalidatePath('/panel/inspecciones/plantillas');
  return { ok: true, mensaje: 'Plantilla archivada.' };
}

/** Carga las once listas base. Repetirlo no duplica. */
export async function sembrarPlantillasBase(): Promise<Resultado> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc('sembrar_plantillas_inspeccion');

  if (error) return { ok: false, mensaje: error.message };

  const r = data as { ok: boolean; error?: string; creadas?: number; total?: number };
  if (!r.ok) return { ok: false, mensaje: r.error ?? 'No se pudo cargar.' };

  revalidatePath('/panel/inspecciones/plantillas');

  return {
    ok: true,
    mensaje: r.creadas === 0
      ? 'Las plantillas base ya estaban cargadas.'
      : `${r.creadas} plantilla(s) base cargadas.`,
  };
}
