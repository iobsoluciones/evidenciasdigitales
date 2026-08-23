'use client';

/**
 * Boton de cierre de sesion.
 * Va en su propio archivo porque el layout es Server Component y
 * este necesita interaccion del navegador.
 */
import { useRouter } from 'next/navigation';
import { crearClienteNavegador } from '@/lib/supabase/cliente';

export default function BotonSalir() {
  const router = useRouter();
  const supabase = crearClienteNavegador();

  async function salir() {
    await supabase.auth.signOut();
    router.refresh();       // limpia la sesion del lado del servidor
    router.push('/login');
  }

  return (
    <button
      onClick={salir}
      style={{
        background: 'rgba(255,255,255,.15)', border: '1px solid rgba(218, 12, 12, 0.3)',
        color: '#0e0101', padding: '7px 20px', borderRadius: 8,
        fontSize: 12, fontWeight: 600, cursor: 'pointer',
      }}
    >
      Salir
    </button>
  );
}
