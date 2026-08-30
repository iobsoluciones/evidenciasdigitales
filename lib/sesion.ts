/**
 * CONSULTAS DE SESION Y ORGANIZACION
 * ---------------------------------------------------------------
 * Nota clave sobre seguridad: NO hace falta filtrar por org_id en
 * estas consultas. Row Level Security ya lo hace en la base de datos:
 * un "select * from organizaciones" solo devuelve la del usuario.
 * Esa es la razon de haber invertido en RLS antes que en la interfaz.
 */
import { crearClienteServidor } from './supabase/servidor';

export type Organizacion = {
  id: string;
  slug: string;
  nombre: string;
  nomenclatura: string | null;
  titulo_doc: string;
  version_doc: string;
  logo_url: string | null;
  color_primario: string;
  plan: string;
  estado: string;
  fecha_expiracion: string | null;
  campos_encabezado: Array<{ etiqueta: string; valor: string }> | null;
};

export type PerfilUsuario = {
  id: string;
  nombre: string;
  rol: 'admin' | 'operador';
  correo: string;
  /** true si la clave la generó el sistema (registro directo) y aún
   *  no se ha cambiado. El panel bloquea el paso hasta que se cambie. */
  debeCambiarClave: boolean;
  organizacion: Organizacion;
};

/**
 * Devuelve el perfil del usuario autenticado junto con su organizacion.
 * Devuelve null si no hay sesion o si el usuario no esta vinculado
 * a ninguna organizacion (caso que debe tratarse como error de alta).
 */
export async function obtenerPerfil(): Promise<PerfilUsuario | null> {
  const supabase = await crearClienteServidor();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('usuarios')
    .select(`
      id, nombre, rol, debe_cambiar_clave,
      organizaciones (
        id, slug, nombre, nomenclatura, titulo_doc, version_doc,
        logo_url, color_primario, plan, estado, fecha_expiracion,
        campos_encabezado
      )
    `)
    .eq('id', user.id)
    .single();

  if (error || !data || !data.organizaciones) return null;

  return {
    id: data.id,
    nombre: data.nombre,
    rol: data.rol,
    correo: user.email ?? '',
    debeCambiarClave: Boolean(data.debe_cambiar_clave),
    organizacion: data.organizaciones as unknown as Organizacion,
  };
}
