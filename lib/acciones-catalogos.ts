'use server';

/**
 * CATÁLOGOS — ciudad, cargo y área
 * ---------------------------------------------------------------
 * Listas maestras por organización. Evitan que el mismo valor se
 * escriba de formas distintas ("BOGOTA", "Bogotá", "bogota"), que es
 * lo que arruina cualquier reporte agrupado.
 *
 * La normalización a mayúsculas la hace un trigger en la base, así
 * que da igual cómo se escriba al agregarlo.
 */
import { revalidatePath } from 'next/cache';
import { crearClienteServidor } from './supabase/servidor';
import { obtenerPerfil } from './sesion';
import { empresaActiva } from './empresa-activa';

export type TipoCatalogo = 'ciudad' | 'cargo' | 'area';

export type ItemCatalogo = {
  id: string;
  tipo: TipoCatalogo;
  valor: string;
  activo: boolean;
};

export type Resultado = { ok: boolean; mensaje: string };

/** Lee los catálogos de la organización, agrupados por tipo. */
export async function listarCatalogos(): Promise<Record<TipoCatalogo, ItemCatalogo[]>> {
  const supabase = await crearClienteServidor();
  const empresa = await empresaActiva();

  if (!empresa) return { ciudad: [], cargo: [], area: [] };

  const { data } = await supabase
    .from('catalogos')
    .select('id, tipo, valor, activo')
    .eq('empresa_id', empresa.id)
    .eq('activo', true)
    .order('valor');

  const items = (data ?? []) as ItemCatalogo[];

  return {
    ciudad: items.filter((i) => i.tipo === 'ciudad'),
    cargo: items.filter((i) => i.tipo === 'cargo'),
    area: items.filter((i) => i.tipo === 'area'),
  };
}

export async function agregarItemCatalogo(
  tipo: TipoCatalogo,
  valor: string
): Promise<Resultado> {
  const perfil = await obtenerPerfil();
  if (!perfil) return { ok: false, mensaje: 'Sesión no válida.' };

  const limpio = valor.trim();
  if (!limpio) return { ok: false, mensaje: 'Escribe un valor.' };
  if (limpio.length > 60) return { ok: false, mensaje: 'El valor es demasiado largo.' };

  const empresa = await empresaActiva();
  if (!empresa) return { ok: false, mensaje: 'No hay empresa seleccionada.' };

  const supabase = await crearClienteServidor();
  const { error } = await supabase
    .from('catalogos')
    .insert({ org_id: perfil.organizacion.id, empresa_id: empresa.id, tipo, valor: limpio });

  if (error) {
    // 23505 = violación de unicidad: el valor ya existe
    if (error.code === '23505') {
      return { ok: false, mensaje: 'Ese valor ya está en la lista.' };
    }
    return { ok: false, mensaje: error.message };
  }

  revalidatePath('/panel/configuracion');
  return { ok: true, mensaje: 'Valor agregado.' };
}

/**
 * Desactiva un valor en vez de borrarlo.
 * Los registros históricos guardan el texto, no una referencia, así que
 * desactivar no altera capacitaciones pasadas: solo deja de ofrecerse.
 */
export async function quitarItemCatalogo(id: string): Promise<Resultado> {
  const supabase = await crearClienteServidor();
  const { error } = await supabase
    .from('catalogos')
    .update({ activo: false })
    .eq('id', id);

  if (error) return { ok: false, mensaje: error.message };

  revalidatePath('/panel/configuracion');
  return { ok: true, mensaje: 'Valor quitado de la lista.' };
}

/** Carga varios valores de una vez, separados por salto de línea o coma. */
export async function agregarVariosItems(
  tipo: TipoCatalogo,
  texto: string
): Promise<Resultado> {
  const perfil = await obtenerPerfil();
  if (!perfil) return { ok: false, mensaje: 'Sesión no válida.' };

  const valores = Array.from(
    new Set(
      texto
        .split(/[\n,;]+/)
        .map((v) => v.trim())
        .filter((v) => v.length > 0 && v.length <= 60)
    )
  );

  if (valores.length === 0) return { ok: false, mensaje: 'No hay valores para agregar.' };

  const empresa = await empresaActiva();
  if (!empresa) return { ok: false, mensaje: 'No hay empresa seleccionada.' };

  const supabase = await crearClienteServidor();
  const { error } = await supabase
    .from('catalogos')
    .upsert(
      valores.map((valor) => ({
        org_id: perfil.organizacion.id, empresa_id: empresa.id, tipo, valor,
      })),
      { onConflict: 'org_id,tipo,valor', ignoreDuplicates: true }
    );

  if (error) return { ok: false, mensaje: error.message };

  revalidatePath('/panel/configuracion');
  return { ok: true, mensaje: `${valores.length} valor(es) procesado(s).` };
}
