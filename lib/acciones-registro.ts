'use server';

/**
 * REGISTRO DIRECTO — MÉTODO TEMPORAL
 * ---------------------------------------------------------------
 * Convive con el registro por confirmación de correo (/registro), que
 * NO se toca. Este existe solo mientras no haya dominio propio ni
 * cuenta de envío: hoy el proyecto tiene la confirmación de correo
 * activada (mailer_autoconfirm = false) y usa el SMTP compartido de
 * Supabase, limitado a unos pocos mensajes por hora y con alta
 * probabilidad de caer en spam. Es decir: quien se registra por correo
 * puede quedarse esperando un mensaje que no llega.
 *
 * Aquí el servidor crea la cuenta ya confirmada y genera la
 * contraseña, que se muestra UNA vez en pantalla. Como no la eligió el
 * usuario, queda marcada con debe_cambiar_clave y el panel obliga a
 * cambiarla antes de dejar trabajar.
 *
 * Por qué hace falta la clave de servicio: crear una cuenta
 * confirmada sin enviar correo es una operación de administración.
 * La alternativa —desactivar la confirmación en el proyecto— dejaría
 * sin verificación también al registro por correo, que es justo lo que
 * hay que conservar.
 *
 * PARA RETIRARLO: borrar este archivo, la carpeta app/registro/directo
 * y el enlace en /registro. La columna y las funciones de base pueden
 * quedarse sin estorbar.
 */
import { randomInt } from 'crypto';
import { crearClienteAdmin, hayClaveServicio, FALTA_CLAVE_SERVICIO } from './supabase/admin';

export type ResultadoRegistro =
  | { ok: true; correo: string; clave: string }
  | { ok: false; mensaje: string };

/**
 * Alfabeto sin caracteres que se confunden al leerlos de una pantalla
 * y teclearlos en otra: 0/O, 1/l/I, 5/S, 8/B. La contraseña se copia a
 * mano más veces de las que uno cree.
 */
const ALFABETO = 'ABCDEFGHJKLMNPQRTUVWXYZabcdefghijkmnpqrstuvwxyz234679';

/** 16 caracteres en 4 grupos: legible en voz alta y de sobra para el mínimo. */
function generarClave(): string {
  const grupo = () =>
    Array.from({ length: 4 }, () => ALFABETO[randomInt(ALFABETO.length)]).join('');
  return [grupo(), grupo(), grupo(), grupo()].join('-');
}

function limpiar(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

/**
 * Crea cuenta + organización en un solo paso, sin enviar ningún correo.
 * Devuelve la contraseña generada: es la única vez que existe fuera de
 * la base, así que la pantalla debe mostrarla antes de continuar.
 */
export async function registrarDirecto(datos: {
  empresa: string;
  slug: string;
  nombre: string;
  correo: string;
}): Promise<ResultadoRegistro> {
  const empresa = limpiar(datos?.empresa);
  const slug = limpiar(datos?.slug).toLowerCase();
  const nombre = limpiar(datos?.nombre);
  const correo = limpiar(datos?.correo).toLowerCase();

  if (!empresa || !nombre || !correo) {
    return { ok: false, mensaje: 'Completa todos los campos.' };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(correo)) {
    return { ok: false, mensaje: 'El correo no tiene un formato válido.' };
  }
  if (!/^[a-z0-9-]{3,30}$/.test(slug)) {
    return {
      ok: false,
      mensaje: 'El identificador solo admite minúsculas, números y guiones (3 a 30 caracteres).',
    };
  }
  if (!hayClaveServicio()) {
    return { ok: false, mensaje: FALTA_CLAVE_SERVICIO };
  }

  const admin = crearClienteAdmin();

  // Se comprueba el identificador ANTES de crear la cuenta. La función
  // de base vuelve a validarlo (es la que manda), pero adelantarlo
  // evita el caso feo de dejar una cuenta huérfana por un slug ocupado.
  const { data: ocupado } = await admin
    .from('organizaciones')
    .select('id')
    .eq('slug', slug)
    .maybeSingle();

  if (ocupado) {
    return { ok: false, mensaje: 'Ese identificador ya está en uso. Prueba con otro.' };
  }

  const clave = generarClave();

  const { data: alta, error: errAlta } = await admin.auth.admin.createUser({
    email: correo,
    password: clave,
    email_confirm: true, // sin esto haría falta el correo que aún no podemos enviar
    user_metadata: { nombre },
  });

  if (errAlta || !alta?.user) {
    const yaExiste =
      errAlta?.message?.includes('already') || errAlta?.message?.includes('registered');
    return {
      ok: false,
      mensaje: yaExiste
        ? 'Ya existe una cuenta con ese correo. Inicia sesión o recupera tu contraseña.'
        : 'No se pudo crear la cuenta: ' + (errAlta?.message ?? 'error desconocido'),
    };
  }

  const { data, error: errOrg } = await admin.rpc('crear_organizacion_directa', {
    p_user_id: alta.user.id,
    p_slug: slug,
    p_nombre: empresa,
    p_nombre_usuario: nombre,
  });

  const r = (data ?? null) as { ok: boolean; error?: string } | null;

  if (errOrg || !r?.ok) {
    // La cuenta quedó creada pero sin organización: no sirve para nada
    // y además bloquea el correo. Se deshace para que pueda reintentar.
    await admin.auth.admin.deleteUser(alta.user.id);
    return {
      ok: false,
      mensaje: r?.error ?? errOrg?.message ?? 'No se pudo crear la organización.',
    };
  }

  return { ok: true, correo, clave };
}
