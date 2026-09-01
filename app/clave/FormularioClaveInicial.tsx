'use client';

/**
 * No pide la contraseña actual: el usuario acaba de usarla para
 * entrar, la sesión que sostiene esta pantalla es la prueba. Pedirla
 * otra vez solo añadiría una forma de fallar.
 *
 * Tras cambiarla se llama a marcar_clave_cambiada(), que quita la
 * marca en la base. Si ese paso fallara, el panel volvería a mandar
 * aquí: la contraseña ya sería la nueva, así que se avisa en vez de
 * dejar al usuario dando vueltas.
 */
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { crearClienteNavegador } from '@/lib/supabase/cliente';

const MINIMO = 8;

export default function FormularioClaveInicial({
  correo,
  nombre,
}: {
  correo: string;
  nombre: string;
}) {
  const router = useRouter();
  const supabase = crearClienteNavegador();
  const [pendiente, startTransition] = useTransition();

  const [nueva, setNueva] = useState('');
  const [repetida, setRepetida] = useState('');
  const [error, setError] = useState('');

  function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (nueva.length < MINIMO) {
      setError(`La contraseña debe tener al menos ${MINIMO} caracteres.`);
      return;
    }
    if (nueva !== repetida) {
      setError('Las dos contraseñas no coinciden.');
      return;
    }

    startTransition(async () => {
      const { error: errClave } = await supabase.auth.updateUser({ password: nueva });
      if (errClave) {
        setError(errClave.message);
        return;
      }

      const { data, error: errMarca } = await supabase.rpc('marcar_clave_cambiada');
      const r = data as { ok: boolean } | null;

      if (errMarca || !r?.ok) {
        setError(
          'Tu contraseña ya quedó cambiada, pero no pudimos registrar el cambio. ' +
          'Vuelve a ingresar; si el sistema te trae otra vez aquí, avisa a soporte.'
        );
        return;
      }

      router.refresh();
      router.push('/panel');
    });
  }

  return (
    <main style={s.pantalla}>
      <div style={s.tarjeta}>
        <h1 style={s.titulo}>Crea tu contraseña</h1>
        <p style={s.sub}>
          Hola {nombre}. Entraste con una contraseña que generó el sistema.
          Cámbiala por una tuya para continuar.
        </p>

        <div style={s.usuario}>
          <span style={s.usuarioEtiqueta}>Tu usuario</span>
          <span style={s.usuarioValor}>{correo}</span>
        </div>

        <form onSubmit={guardar}>
          <label style={s.label}>Nueva contraseña</label>
          <input
            type="password"
            value={nueva}
            onChange={(e) => setNueva(e.target.value)}
            style={s.input}
            autoComplete="new-password"
            autoFocus
          />
          <p style={s.ayuda}>Mínimo {MINIMO} caracteres.</p>

          <label style={{ ...s.label, marginTop: 14 }}>Repite la contraseña</label>
          <input
            type="password"
            value={repetida}
            onChange={(e) => setRepetida(e.target.value)}
            style={s.input}
            autoComplete="new-password"
          />

          {error && <div style={s.error}>{error}</div>}

          <button type="submit" disabled={pendiente} style={{
            ...s.boton,
            background: pendiente ? 'var(--borde-fuerte)' : 'var(--marca)',
            cursor: pendiente ? 'not-allowed' : 'pointer',
          }}>
            {pendiente ? 'Guardando…' : 'Guardar y entrar'}
          </button>
        </form>
      </div>
    </main>
  );
}

const s: Record<string, React.CSSProperties> = {
  pantalla: {
    minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'var(--fondo)', padding: 20,
  },
  tarjeta: {
    width: '100%', maxWidth: 420, background: 'var(--superficie)', borderRadius: 18,
    boxShadow: '0 10px 30px rgba(0,0,0,.08)', padding: '32px 30px',
  },
  titulo: { fontSize: 21, color: 'var(--texto)', margin: '0 0 6px' },
  sub: { fontSize: 13.5, color: 'var(--texto-suave)', margin: '0 0 20px', lineHeight: 1.6 },
  usuario: {
    display: 'flex', flexDirection: 'column', gap: 2,
    background: 'var(--fondo)', border: '1px solid var(--borde)', borderRadius: 8,
    padding: '10px 13px', marginBottom: 20,
  },
  usuarioEtiqueta: { fontSize: 10.5, color: 'var(--texto-suave)', textTransform: 'uppercase', letterSpacing: .4 },
  usuarioValor: { fontSize: 14, color: 'var(--texto)', wordBreak: 'break-all' },
  label: { display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--texto)' },
  input: {
    width: '100%', padding: '11px 12px', border: '1px solid var(--borde-fuerte)',
    borderRadius: 8, fontSize: 14, boxSizing: 'border-box',
  },
  ayuda: { fontSize: 11, color: 'var(--texto-suave)', margin: '4px 0 0' },
  error: {
    marginTop: 16, padding: '11px 13px', background: 'var(--mal-fondo)',
    color: 'var(--mal)', borderRadius: 8, fontSize: 13, lineHeight: 1.55,
  },
  boton: {
    width: '100%', marginTop: 22, padding: 13, color: 'var(--sobre-marca)', border: 'none',
    borderRadius: 8, fontSize: 15, fontWeight: 600,
  },
};
