/**
 * Cliente de Supabase para el NAVEGADOR (componentes con "use client").
 *
 * Usa la clave publica: no expone nada sensible porque el acceso real
 * lo controla Row Level Security en la base de datos.
 */
import { createBrowserClient } from '@supabase/ssr';

export function crearClienteNavegador() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
