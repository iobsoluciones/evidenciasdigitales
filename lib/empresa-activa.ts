/**
 * EMPRESA ACTIVA — lectura
 * ---------------------------------------------------------------
 * NO lleva 'use server': es un módulo de servidor normal, usado por
 * Server Components. Un archivo con 'use server' solo puede exportar
 * funciones async, y aquí hacen falta un tipo y una constante.
 *
 * La acción de CAMBIAR la empresa vive en acciones-empresas.ts, que
 * sí es 'use server' porque la llama el selector desde el navegador.
 *
 * La cookie guarda solo un id. El acceso real lo sigue controlando
 * RLS: si alguien la manipulara con el id de una empresa ajena, las
 * consultas no devolverían nada.
 */
import { cookies } from 'next/headers';
import { crearClienteServidor } from './supabase/servidor';

export const COOKIE_EMPRESA = 'empresa_activa';

export type Empresa = {
  id: string;
  slug: string;
  nombre: string;
  nit: string | null;
  sector: string | null;
  ciudad: string | null;
  direccion: string | null;
  contacto: string | null;
  correo: string | null;
  telefono: string | null;
  logo_url: string | null;
  titulo_doc: string;
  nomenclatura: string | null;
  version_doc: string;
  color_primario: string;
  campos_encabezado: Array<{ etiqueta: string; valor: string }>;
  /** Diseño del encabezado de sus documentos. {} = estándar. */
  encabezado_config: Record<string, unknown>;
  activa: boolean;
};

/** Empresas de la cuenta. RLS limita a las propias. */
export async function listarEmpresas(): Promise<Empresa[]> {
  const supabase = await crearClienteServidor();
  const { data } = await supabase
    .from('empresas')
    .select('*')
    .eq('activa', true)
    .order('nombre');
  return (data ?? []) as Empresa[];
}

/**
 * Empresa sobre la que se trabaja.
 * Si la cookie apunta a una empresa inexistente o ajena, cae a la
 * primera disponible en vez de fallar.
 */
export async function empresaActiva(): Promise<Empresa | null> {
  const empresas = await listarEmpresas();
  if (empresas.length === 0) return null;

  const almacen = await cookies();
  const id = almacen.get(COOKIE_EMPRESA)?.value;

  return empresas.find((e) => e.id === id) ?? empresas[0];
}
