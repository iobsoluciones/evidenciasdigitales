'use client';

/**
 * Boton de cierre de sesion.
 * Va en su propio archivo porque el layout es Server Component y
 * este necesita interaccion del navegador.
 */
import { useRouter } from 'next/navigation';
import { crearClienteNavegador } from '@/lib/supabase/cliente';

export default function BotonSalir({ contraste }: { contraste: string }) {
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
        // La barra lleva el color de la empresa, que puede ser claro u
        // oscuro: el texto se toma del contraste calculado, no fijo.
        background: 'transparent',
        border: `1px solid ${contraste === '#ffffff' ? 'rgba(255,255,255,.45)' : 'rgba(20,38,63,.28)'}`,
        color: contraste, padding: '7px 20px', borderRadius: 8,
        fontSize: 12, fontWeight: 600, cursor: 'pointer',
        fontFamily: 'inherit',
      }}
    >
      Salir
    </button>
  );
}
