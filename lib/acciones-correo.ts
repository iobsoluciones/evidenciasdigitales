'use server';

/**
 * ENVÍO DEL ENLACE DE FIRMA AL CAPACITADOR
 * ---------------------------------------------------------------
 * Se ejecuta en el servidor: la clave de Resend nunca llega al
 * navegador, y el token se genera aquí, no en el cliente.
 */
import { headers } from 'next/headers';
import { crearClienteServidor } from './supabase/servidor';
import { obtenerPerfil } from './sesion';
import { enviarCorreo, plantillaFirma } from './correo';

export type Resultado = { ok: boolean; mensaje: string };

/** Validación simple pero suficiente de correo. */
function correoValido(c: string): boolean {
  return /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]{2,}$/.test(c.trim());
}

/**
 * Determina la URL base del sitio.
 * Prioriza la variable de entorno (útil en producción) y cae a las
 * cabeceras de la petición, que funcionan igual en localhost.
 */
async function urlBase(): Promise<string> {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  const h = await headers();
  const host = h.get('host') ?? 'localhost:3000';
  const protocolo = host.startsWith('localhost') ? 'http' : 'https';
  return `${protocolo}://${host}`;
}

export async function enviarEnlaceFirma(
  capacitacionId: string,
  correo: string,
  mensaje: string
): Promise<Resultado> {
  const perfil = await obtenerPerfil();
  if (!perfil) return { ok: false, mensaje: 'Sesión no válida.' };

  if (!correo.trim() || !correoValido(correo)) {
    return { ok: false, mensaje: 'El correo del capacitador no es válido.' };
  }

  const supabase = await crearClienteServidor();

  // Datos de la capacitación. RLS impide leer las de otra organización.
  const { data: cap, error: errCap } = await supabase
    .from('capacitaciones')
    .select('id, codigo, tema, instructor, fecha_inicio')
    .eq('id', capacitacionId)
    .maybeSingle();

  if (errCap || !cap) return { ok: false, mensaje: 'Capacitación no encontrada.' };

  // Genera el token si aún no existe (sin forzar: no invalida el anterior)
  const { data: tk, error: errTk } = await supabase.rpc('generar_token_firma', {
    p_id: capacitacionId,
    p_forzar: false,
  });

  if (errTk) return { ok: false, mensaje: 'No se pudo generar el enlace.' };

  const r = tk as { ok: boolean; token?: string; error?: string };
  if (!r.ok || !r.token) {
    return { ok: false, mensaje: r.error ?? 'No se pudo generar el enlace.' };
  }

  const base = await urlBase();
  const url = `${base}/f/${capacitacionId}?token=${r.token}`;

  const fecha = new Date(cap.fecha_inicio).toLocaleDateString('es-CO', {
    dateStyle: 'long',
  });

  const html = plantillaFirma({
    organizacion: perfil.organizacion.nombre,
    instructor: cap.instructor,
    tema: cap.tema,
    codigo: cap.codigo,
    fecha,
    url,
    mensaje,
    color: perfil.organizacion.color_primario,
  });

  const envio = await enviarCorreo({
    para: correo.trim(),
    asunto: `Firma requerida — ${cap.tema}`,
    html,
  });

  if (!envio.ok) return { ok: false, mensaje: envio.mensaje };

  return { ok: true, mensaje: `Enlace enviado a ${correo.trim()}.` };
}
