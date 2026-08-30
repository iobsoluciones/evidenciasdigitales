/**
 * Cliente de Supabase con CLAVE DE SERVICIO.
 *
 * Salta Row Level Security por completo, así que solo puede usarse
 * dentro de Server Actions o Route Handlers. Nunca importar este
 * archivo desde un componente 'use client': la clave viajaría al
 * navegador y quedaría expuesta.
 *
 * Hoy lo usa un único caso: crear la cuenta en el registro directo,
 * que es lo que permite saltarse el correo de confirmación.
 */
import { createClient } from '@supabase/supabase-js';

/** Mensaje único para no repetirlo en cada llamada. */
export const FALTA_CLAVE_SERVICIO =
  'Falta la variable SUPABASE_SERVICE_ROLE_KEY en el servidor. ' +
  'Sin ella el registro directo no puede crear cuentas.';

export function hayClaveServicio(): boolean {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function crearClienteAdmin() {
  const clave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!clave) throw new Error(FALTA_CLAVE_SERVICIO);

  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, clave, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
