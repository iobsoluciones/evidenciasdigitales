'use server';

/**
 * EMPRESAS ADMINISTRADAS — Server Actions
 * ---------------------------------------------------------------
 * El aislamiento sigue anclado en org_id: RLS impide tocar empresas
 * de otra cuenta. empresa_id es un filtro dentro de la cuenta, no una
 * frontera de seguridad.
 */
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { crearClienteServidor } from './supabase/servidor';
import { obtenerPerfil } from './sesion';
import { COOKIE_EMPRESA } from './empresa-activa';

export type Resultado = { ok: boolean; mensaje: string; id?: string };

export type DatosEmpresa = {
  nombre: string;
  slug: string;
  nit: string;
  sector: string;
  ciudad: string;
  direccion: string;
  contacto: string;
  correo: string;
  telefono: string;
};

/** Cambia la empresa en contexto. Un año de vigencia: es preferencia, no sesión. */
export async function seleccionarEmpresa(id: string): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_EMPRESA, id, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  });
  revalidatePath('/panel', 'layout');
}

export async function crearEmpresa(datos: DatosEmpresa): Promise<Resultado> {
  const perfil = await obtenerPerfil();
  if (!perfil) return { ok: false, mensaje: 'Sesión no válida.' };

  const slug = datos.slug.trim().toLowerCase();

  if (!datos.nombre.trim()) return { ok: false, mensaje: 'El nombre es obligatorio.' };
  if (!/^[a-z0-9-]{3,40}$/.test(slug)) {
    return {
      ok: false,
      mensaje: 'El identificador solo admite minúsculas, números y guiones (3 a 40 caracteres).',
    };
  }

  const supabase = await crearClienteServidor();

  // El límite lo valida la base según el plan contratado
  const { data: limite } = await supabase.rpc('puede_crear_empresa');
  const lim = limite as { puede: boolean; motivo?: string };
  if (!lim.puede) return { ok: false, mensaje: lim.motivo ?? 'Alcanzaste el límite de tu plan.' };

  const { data, error } = await supabase
    .from('empresas')
    .insert({
      org_id: perfil.organizacion.id,
      slug,
      nombre: datos.nombre.trim().toUpperCase(),
      nit: datos.nit.trim() || null,
      sector: datos.sector.trim().toUpperCase() || null,
      ciudad: datos.ciudad.trim().toUpperCase() || null,
      direccion: datos.direccion.trim().toUpperCase() || null,
      contacto: datos.contacto.trim().toUpperCase() || null,
      correo: datos.correo.trim().toLowerCase() || null,
      telefono: datos.telefono.trim() || null,
      // Nomenclatura inicial a partir del nombre; editable después
      nomenclatura:
        datos.nombre.replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase() +
        '-01-' + new Date().getFullYear(),
    })
    .select('id')
    .single();

  if (error) {
    if (error.code === '23505') {
      return { ok: false, mensaje: 'Ese identificador ya está en uso por otra empresa.' };
    }
    return { ok: false, mensaje: error.message };
  }

  revalidatePath('/panel', 'layout');
  return { ok: true, mensaje: `${datos.nombre} agregada.`, id: data.id };
}

export async function actualizarEmpresa(
  id: string,
  datos: Omit<DatosEmpresa, 'slug'>
): Promise<Resultado> {
  if (!datos.nombre.trim()) return { ok: false, mensaje: 'El nombre es obligatorio.' };

  const supabase = await crearClienteServidor();
  const { error } = await supabase
    .from('empresas')
    .update({
      nombre: datos.nombre.trim().toUpperCase(),
      nit: datos.nit.trim() || null,
      sector: datos.sector.trim().toUpperCase() || null,
      ciudad: datos.ciudad.trim().toUpperCase() || null,
      direccion: datos.direccion.trim().toUpperCase() || null,
      contacto: datos.contacto.trim().toUpperCase() || null,
      correo: datos.correo.trim().toLowerCase() || null,
      telefono: datos.telefono.trim() || null,
    })
    .eq('id', id);

  if (error) return { ok: false, mensaje: error.message };

  revalidatePath('/panel', 'layout');
  return { ok: true, mensaje: 'Empresa actualizada.' };
}

/**
 * Desactiva la empresa en lugar de borrarla.
 * Sus actas siguen existiendo: borrarlas sería destruir evidencia
 * documental que la empresa puede necesitar años después.
 */
export async function desactivarEmpresa(id: string): Promise<Resultado> {
  const supabase = await crearClienteServidor();
  const { error } = await supabase
    .from('empresas')
    .update({ activa: false })
    .eq('id', id);

  if (error) return { ok: false, mensaje: error.message };

  revalidatePath('/panel', 'layout');
  return { ok: true, mensaje: 'Empresa archivada. Sus documentos se conservan.' };
}

/** Configuración documental de una empresa concreta. */
export async function guardarConfiguracionEmpresa(
  id: string,
  datos: {
    titulo_doc: string;
    nomenclatura: string;
    version_doc: string;
    color_primario: string;
  }
): Promise<Resultado> {
  const supabase = await crearClienteServidor();
  const { error } = await supabase
    .from('empresas')
    .update(datos)
    .eq('id', id);

  if (error) return { ok: false, mensaje: error.message };

  revalidatePath('/panel', 'layout');
  return { ok: true, mensaje: 'Configuración guardada. Aplica a las capacitaciones nuevas.' };
}

export async function guardarLogoEmpresa(id: string, url: string | null): Promise<Resultado> {
  const supabase = await crearClienteServidor();
  const { error } = await supabase
    .from('empresas')
    .update({ logo_url: url })
    .eq('id', id);

  if (error) return { ok: false, mensaje: error.message };

  revalidatePath('/panel', 'layout');
  return { ok: true, mensaje: url ? 'Logo actualizado.' : 'Logo eliminado.' };
}

export async function guardarCamposEncabezadoEmpresa(
  id: string,
  campos: Array<{ etiqueta: string; valor: string }>
): Promise<Resultado> {
  if (campos.length > 4) return { ok: false, mensaje: 'Máximo 4 campos en el encabezado.' };

  const supabase = await crearClienteServidor();
  const { error } = await supabase
    .from('empresas')
    .update({ campos_encabezado: campos })
    .eq('id', id);

  if (error) return { ok: false, mensaje: error.message };

  revalidatePath('/panel', 'layout');
  return { ok: true, mensaje: 'Encabezado guardado.' };
}
