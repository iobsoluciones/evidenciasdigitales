'use server';

/**
 * Artículos disponibles para el selector del kardex.
 */
import { crearClienteServidor } from './supabase/servidor';
import { empresaActiva } from './empresa-activa';

export type ArticuloKardex = {
  id: string;
  codigo: string;
  nombre: string;
  tipo: 'consumible' | 'retornable';
};

export async function listarArticulosKardex(): Promise<ArticuloKardex[]> {
  const empresa = await empresaActiva();
  if (!empresa) return [];

  const supabase = await crearClienteServidor();
  const { data } = await supabase.rpc('articulos_para_kardex', {
    p_empresa: empresa.id,
  });

  return (data ?? []) as ArticuloKardex[];
}
