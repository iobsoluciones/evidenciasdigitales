'use server';

/**
 * CONJUNTOS DE ESTÁNDARES
 * ---------------------------------------------------------------
 * El catálogo de estándares deja de estar sembrado en código y pasa a
 * ser contenido que mantiene el profesional. Una resolución nueva no
 * puede obligar a esperar a que un programador la cargue.
 *
 * Lo que NO se abre a edición: las tablas ND/NE/NC de la GTC 45 y las
 * fórmulas del artículo 30. Ahí el método lo fija la norma, y si cada
 * quien lo ajusta dos matrices dejan de ser comparables.
 *
 * El conjunto de 60 viene precargado porque sus pesos están verificados
 * contra la tabla del artículo 27 y suman 100 exacto. Los de 7 y 21 NO
 * se precargan: no siembro números que no puedo verificar.
 */
import { revalidatePath } from 'next/cache';
import { crearClienteServidor } from './supabase/servidor';

export type Ciclo = 'planear' | 'hacer' | 'verificar' | 'actuar';

export type ConjuntoResumen = {
  id: string;
  nombre: string;
  norma: string | null;
  descripcion: string | null;
  es_sistema: boolean;
  estandares: number;
  peso_total: number;
};

export type ItemConjunto = {
  id: string;
  codigo: string;
  ciclo: Ciclo;
  capitulo: string;
  nombre: string;
  peso: number;
  orden: number;
};

export type FilaImportada = {
  codigo: string;
  ciclo: string;
  capitulo: string;
  nombre: string;
  peso: number | string;
  orden?: number;
};

export type Res = {
  ok: boolean; mensaje: string; id?: string;
  /** Errores por fila del archivo importado. */
  errores?: string[];
};

export async function listarConjuntos(): Promise<ConjuntoResumen[]> {
  const supabase = await crearClienteServidor();
  const { data } = await supabase.rpc('listar_conjuntos_estandares');
  return (data ?? []) as ConjuntoResumen[];
}

export async function obtenerConjunto(id: string): Promise<{
  ok: boolean; error?: string;
  conjunto?: ConjuntoResumen; items?: ItemConjunto[];
}> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc('detalle_conjunto_estandares', {
    p_conjunto: id,
  });
  if (error) return { ok: false, error: error.message };
  return (data ?? { ok: false, error: 'No encontrado.' }) as {
    ok: boolean; error?: string; conjunto?: ConjuntoResumen; items?: ItemConjunto[];
  };
}

export async function crearConjunto(
  nombre: string, norma: string, descripcion: string
): Promise<Res> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc('crear_conjunto_estandares', {
    p_nombre: nombre, p_norma: norma || null, p_descripcion: descripcion || null,
  });
  if (error) return { ok: false, mensaje: error.message };

  const r = data as { ok: boolean; error?: string; id?: string };
  if (!r.ok) return { ok: false, mensaje: r.error ?? 'No se pudo crear.' };

  revalidatePath('/panel/estandares');
  return { ok: true, mensaje: 'Conjunto creado. Ahora importa o agrega sus estándares.', id: r.id };
}

/** Duplicar el del sistema evita transcribir 60 filas para cambiar 10. */
export async function duplicarConjunto(id: string, nombre: string): Promise<Res> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc('duplicar_conjunto_estandares', {
    p_conjunto: id, p_nombre: nombre || null,
  });
  if (error) return { ok: false, mensaje: error.message };

  const r = data as { ok: boolean; error?: string; id?: string; estandares?: number };
  if (!r.ok) return { ok: false, mensaje: r.error ?? 'No se pudo duplicar.' };

  revalidatePath('/panel/estandares');
  return { ok: true, mensaje: `Copia creada con ${r.estandares} estándares.`, id: r.id };
}

/**
 * Importa reemplazando todo el conjunto. Se valida antes de escribir:
 * o entra el archivo completo o no entra nada, con los errores
 * señalados por número de fila.
 */
export async function importarConjunto(
  id: string, filas: FilaImportada[]
): Promise<Res> {
  if (!filas || filas.length === 0) {
    return { ok: false, mensaje: 'El archivo no trae filas.' };
  }

  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc('importar_conjunto_estandares', {
    p_conjunto: id, p_items: filas,
  });
  if (error) return { ok: false, mensaje: error.message };

  const r = data as {
    ok: boolean; error?: string; errores?: string[];
    importados?: number; peso_total?: number;
  };
  if (!r.ok) return { ok: false, mensaje: r.error ?? 'No se pudo importar.', errores: r.errores };

  revalidatePath('/panel/estandares');
  return {
    ok: true,
    mensaje: `${r.importados} estándares importados. Suman ${r.peso_total} puntos.`,
  };
}

export async function eliminarConjunto(id: string): Promise<Res> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc('eliminar_conjunto_estandares', {
    p_conjunto: id,
  });
  if (error) return { ok: false, mensaje: error.message };

  const r = data as { ok: boolean; error?: string };
  if (!r.ok) return { ok: false, mensaje: r.error ?? 'No se pudo eliminar.' };

  revalidatePath('/panel/estandares');
  return { ok: true, mensaje: 'Conjunto eliminado.' };
}
