/**
 * MIDDLEWARE DE SESION
 * ---------------------------------------------------------------
 * Se ejecuta antes de cada peticion. Hace dos cosas:
 *   1. Refresca el token de Supabase si esta por vencer.
 *   2. Protege las rutas: si no hay sesion, redirige a /login.
 *
 * Sin esto, la sesion se pierde al recargar la pagina.
 *
 * DOS PROTECCIONES CONTRA EL 504 DE VERCEL
 * (MIDDLEWARE_INVOCATION_TIMEOUT, 30-ago-2026):
 *
 *  1. Sin cookie de sesion NO se llama a Supabase. Una peticion anonima
 *     no tiene nada que validar: getUser() devolveria null igual, pero
 *     costando un viaje de red. Esto saca de la ruta critica al visitante
 *     de la portada y, sobre todo, a quien abre /r, /d, /i, /s o /p desde
 *     el celular en planta para firmar.
 *  2. La validacion corre contra un reloj. Si Supabase no responde a
 *     tiempo, el middleware DECIDE en vez de colgarse hasta que Vercel
 *     mate la peticion con un 504: en ruta protegida manda a /login
 *     —falla cerrado— y en ruta publica sigue de largo.
 */
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Rutas que NO requieren sesion iniciada.
 * '/' es la pagina publica de producto y '/registro' el autoservicio.
 *
 * '/api/cron' no lleva sesion porque no lo abre una persona: lo dispara
 * el cron de Vercel. No queda desprotegido — se autentica con
 * CRON_SECRET dentro de la propia ruta, que es la capa que le
 * corresponde. Sin esta linea el middleware lo redirigia a /login y el
 * cron nunca corria.
 */
const RUTAS_PUBLICAS = [
  '/', '/login', '/registro', '/recuperar',
  '/r', '/f', '/d', '/i', '/s', '/p', '/c', '/a', '/m', '/v',
  '/api/cron',
];

/** Margen antes de que Vercel corte la invocacion del middleware. */
const LIMITE_MS = 5000;

/**
 * Supabase guarda la sesion en cookies `sb-<ref>-auth-token`, que se
 * parten en `.0`, `.1`… cuando el token es largo. Sin ninguna de ellas
 * no hay sesion que validar.
 */
function haySesionPosible(request: NextRequest): boolean {
  return request.cookies.getAll().some(
    (c) => c.name.startsWith('sb-') && c.name.includes('auth-token')
  );
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const ruta = request.nextUrl.pathname;
  const esPublica = RUTAS_PUBLICAS.some((p) => ruta === p || ruta.startsWith(p + '/'));

  // Anonimo en ruta publica: no hay nada que preguntarle a Supabase.
  if (!haySesionPosible(request)) {
    if (esPublica) return response;
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // getUser() valida el token contra el servidor. No usar getSession()
  // aqui: lee la cookie sin verificarla, y eso es falsificable.
  //
  // Contra reloj: `null` significa «no pude comprobarlo», que no es lo
  // mismo que «no hay sesion», y por eso se distingue mas abajo.
  const validacion = await Promise.race([
    supabase.auth.getUser().then((r) => r.data.user),
    new Promise<'tiempo_agotado'>((r) => setTimeout(() => r('tiempo_agotado'), LIMITE_MS)),
  ]);

  if (validacion === 'tiempo_agotado') {
    console.error('[middleware] Supabase no respondio en', LIMITE_MS, 'ms para', ruta);
    if (esPublica) return response;
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  const user = validacion;

  // Sin sesion en ruta protegida -> al login
  if (!user && !esPublica) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Con sesion en login, registro o portada -> al panel
  if (user && (ruta === '/login' || ruta === '/registro' || ruta === '/')) {
    const url = request.nextUrl.clone();
    url.pathname = '/panel';
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Aplica a todo excepto archivos estaticos e imagenes.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
