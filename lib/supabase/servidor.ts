/**
 * Cliente de Supabase para el SERVIDOR (Server Components, Route Handlers,
 * Server Actions). Lee y escribe la sesion en las cookies.
 *
 * IMPORTANTE: debe crearse uno nuevo en cada peticion, nunca reutilizar
 * una instancia global, porque cada peticion tiene su propia sesion.
 */
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function crearClienteServidor() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Se ignora cuando se llama desde un Server Component:
            // el middleware ya se encarga de refrescar la sesion.
          }
        },
      },
    }
  );
}
