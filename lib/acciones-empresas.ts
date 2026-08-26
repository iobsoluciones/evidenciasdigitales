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
  // Todos los demás son opcionales: si el formulario no envía alguno,
  // se guarda como null en vez de reventar. (Causa del error de 'trim'
  // sobre undefined.)
  nit?: string;
  sector?: string;
  ciudad?: string;
  direccion?: string;
  contacto?: string;
  correo?: string;
  telefono?: string;
};

/**
 * Normaliza un texto opcional del formulario.
 * Tolera undefined/null (campo ausente) y devuelve null si queda vacío.
 * No exportada: en un archivo 'use server' solo los exports deben ser
 * async; los ayudantes internos pueden ser síncronos.
 */
function limpiar(
  valor: string | undefined | null,
  caja: 'alta' | 'baja' | 'igual' = 'igual'
): string | null {
  let t = (valor ?? '').trim();
  if (!t) return null;
  if (caja === 'alta') t = t.toUpperCase();
  else if (caja === 'baja') t = t.toLowerCase();
  return t;
}

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

/**
 * Comprueba si el identificador publico esta libre, mirando TODA la
 * base y no solo las empresas propias.
 *
 * Hace falta una funcion SECURITY DEFINER porque RLS solo deja ver las
 * empresas de la propia organizacion: un slug que ya ocupa otro
 * consultor pareceria libre hasta el momento de insertar. Devuelve
 * ademas una alternativa, para no dejar al usuario adivinando.
 */
export async function verificarSlugEmpresa(
  slug: string
): Promise<{ libre: boolean; sugerencia: string | null; motivo?: string }> {
  const limpio = (slug ?? '').trim().toLowerCase();

  if (!/^[a-z0-9-]{3,40}$/.test(limpio)) {
    return {
      libre: false,
      sugerencia: null,
      motivo: 'Solo minúsculas, números y guiones (3 a 40 caracteres).',
    };
  }

  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc('slug_empresa_libre', { p_slug: limpio });

  if (error) {
    return { libre: false, sugerencia: null, motivo: error.message };
  }

  if (data === true) return { libre: true, sugerencia: null };

  const { data: alterna } = await supabase.rpc('sugerir_slug_empresa', { p_base: limpio });

  return {
    libre: false,
    sugerencia: (alterna as string | null) ?? null,
    motivo: 'Ya está en uso.',
  };
}

export async function crearEmpresa(datos: DatosEmpresa): Promise<Resultado> {
  const perfil = await obtenerPerfil();
  if (!perfil) return { ok: false, mensaje: 'Sesión no válida.' };

  const nombre = (datos.nombre ?? '').trim();
  const slug = (datos.slug ?? '').trim().toLowerCase();

  if (!nombre) return { ok: false, mensaje: 'El nombre es obligatorio.' };
  if (!/^[a-z0-9-]{3,40}$/.test(slug)) {
    return {
      ok: false,
      mensaje: 'El identificador solo admite minúsculas, números y guiones (3 a 40 caracteres).',
    };
  }

  const supabase = await crearClienteServidor();

  // El identificador se comprueba contra TODA la base (ver
  // verificarSlugEmpresa): si lo tiene otra organizacion, RLS no lo
  // deja ver y el insert reventaria con un 23505 sin explicar nada.
  const { data: libre } = await supabase.rpc('slug_empresa_libre', { p_slug: slug });

  if (libre !== true) {
    const { data: alterna } = await supabase.rpc('sugerir_slug_empresa', { p_base: slug });
    return {
      ok: false,
      mensaje: alterna
        ? `El identificador "${slug}" ya está en uso. Puedes usar "${alterna}".`
        : `El identificador "${slug}" ya está en uso. Elige otro.`,
    };
  }

  // El límite lo valida la base según el plan contratado
  const { data: limite } = await supabase.rpc('puede_crear_empresa');
  const lim = limite as { puede: boolean; motivo?: string };
  if (!lim.puede) return { ok: false, mensaje: lim.motivo ?? 'Alcanzaste el límite de tu plan.' };

  const { data, error } = await supabase
    .from('empresas')
    .insert({
      org_id: perfil.organizacion.id,
      slug,
      nombre: nombre.toUpperCase(),
      nit: limpiar(datos.nit),
      sector: limpiar(datos.sector, 'alta'),
      ciudad: limpiar(datos.ciudad, 'alta'),
      direccion: limpiar(datos.direccion, 'alta'),
      contacto: limpiar(datos.contacto, 'alta'),
      correo: limpiar(datos.correo, 'baja'),
      telefono: limpiar(datos.telefono),
      // Nomenclatura inicial a partir del nombre; editable después
      nomenclatura:
        nombre.replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase() +
        '-01-' + new Date().getFullYear(),
    })
    .select('id')
    .single();

  if (error) {
    // Red de seguridad: entre la comprobacion y el insert alguien pudo
    // registrar el mismo slug. La restriccion UNIQUE global es la que
    // de verdad garantiza que no haya dos enlaces publicos iguales.
    if (error.code === '23505') {
      return {
        ok: false,
        mensaje: `El identificador "${slug}" acaba de ser tomado. Elige otro.`,
      };
    }
    return { ok: false, mensaje: error.message };
  }

  revalidatePath('/panel', 'layout');
  return { ok: true, mensaje: `${nombre} agregada.`, id: data.id };
}

export async function actualizarEmpresa(
  id: string,
  datos: Omit<DatosEmpresa, 'slug'>
): Promise<Resultado> {
  const nombre = (datos.nombre ?? '').trim();
  if (!nombre) return { ok: false, mensaje: 'El nombre es obligatorio.' };

  const supabase = await crearClienteServidor();
  const { error } = await supabase
    .from('empresas')
    .update({
      nombre: nombre.toUpperCase(),
      nit: limpiar(datos.nit),
      sector: limpiar(datos.sector, 'alta'),
      ciudad: limpiar(datos.ciudad, 'alta'),
      direccion: limpiar(datos.direccion, 'alta'),
      contacto: limpiar(datos.contacto, 'alta'),
      correo: limpiar(datos.correo, 'baja'),
      telefono: limpiar(datos.telefono),
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

/**
 * Diseño del encabezado de los documentos de una empresa.
 *
 * Solo lo permiten los planes que lo tengan habilitado: el Básico usa
 * el estándar. Se comprueba EN EL SERVIDOR y no solo ocultando la UI,
 * que es lo unico que impide saltarselo.
 *
 * El cambio afecta a los documentos que se emitan a partir de ahora:
 * los ya emitidos llevan su diseño congelado.
 */
export async function guardarDisenoEncabezado(
  id: string,
  config: {
    plantilla: string;
    logo_posicion: string;
    mostrar_nit: boolean;
    mostrar_direccion: boolean;
  }
): Promise<Resultado> {
  const perfil = await obtenerPerfil();
  if (!perfil) return { ok: false, mensaje: 'Sesión no válida.' };

  if (!['linea', 'tabla', 'lateral'].includes(config.plantilla)) {
    return { ok: false, mensaje: 'Plantilla de encabezado no válida.' };
  }
  if (!['izquierda', 'centro', 'derecha'].includes(config.logo_posicion)) {
    return { ok: false, mensaje: 'Posición del logo no válida.' };
  }

  const supabase = await crearClienteServidor();

  const { data: plan } = await supabase
    .from('planes')
    .select('nombre, encabezado_personalizable')
    .eq('codigo', perfil.organizacion.plan)
    .maybeSingle();

  if (!plan?.encabezado_personalizable) {
    return {
      ok: false,
      mensaje: `El plan ${plan?.nombre ?? 'actual'} usa el encabezado estándar. ` +
               'Diseñar el encabezado está disponible desde el plan Pro.',
    };
  }

  const { error } = await supabase
    .from('empresas')
    .update({ encabezado_config: config })
    .eq('id', id);

  if (error) return { ok: false, mensaje: error.message };

  revalidatePath('/panel', 'layout');
  return {
    ok: true,
    mensaje: 'Diseño guardado. Se aplica a los documentos que emitas desde ahora.',
  };
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
