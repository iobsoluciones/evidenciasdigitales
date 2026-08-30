/**
 * MIDDLEWARE DE SESION
 * ---------------------------------------------------------------
 * Se ejecuta antes de cada peticion. Hace dos cosas:
 *   1. Refresca el token de Supabase si esta por vencer.
 *   2. Protege las rutas: si no hay sesion, redirige a /login.
 *
 * Sin esto, la sesion se pierde al recargar la pagina.
 */
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Rutas que NO requieren sesion iniciada.
 * '/' es la pagina publica de producto y '/registro' el autoservicio.
 */
const RUTAS_PUBLICAS = ['/', '/login', '/registro', '/recuperar', '/r', '/f', '/d', '/i', '/s'];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

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
  const { data: { user } } = await supabase.auth.getUser();

  const ruta = request.nextUrl.pathname;
  const esPublica = RUTAS_PUBLICAS.some((p) => ruta === p || ruta.startsWith(p + '/'));

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
