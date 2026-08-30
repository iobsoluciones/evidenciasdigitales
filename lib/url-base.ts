import { headers } from 'next/headers';

/**
 * URL ABSOLUTA DEL SITIO
 * ---------------------------------------------------------------
 * Los enlaces que salen de la aplicación —QR de asistencia, firma
 * remota de una entrega, firma del equipo investigador— tienen que ser
 * absolutos: se pegan en un navegador ajeno o viajan dentro de un
 * correo, donde una ruta relativa no significa nada.
 *
 * No basta con NEXT_PUBLIC_APP_URL. Esa variable se incrusta EN EL
 * BUILD, así que en desarrollo local (donde no está en .env.local) o en
 * un despliegue anterior a haberla configurado queda como cadena vacía,
 * y `${base}/i/${token}` produce "/i/abc". Pegado en la barra de
 * direcciones, el navegador intenta resolver "i" como dominio y falla
 * con DNS_PROBE_POSSIBLE.
 *
 * Por eso se reconstruye de las cabeceras de la petición cuando la
 * variable falta: el servidor siempre sabe por qué host le entraron.
 */
export async function urlBase(): Promise<string> {
  const configurada = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configurada) return configurada.replace(/\/+$/, '');

  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host');
  if (!host) return '';

  // localhost va por http; cualquier otro host, por https.
  const protocolo =
    h.get('x-forwarded-proto') ??
    (host.startsWith('localhost') || host.startsWith('127.0.0.1') ? 'http' : 'https');

  return `${protocolo}://${host}`;
}
