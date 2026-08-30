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
const MARCA = '#1e3a8a';

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
            background: pendiente ? '#cbd5e1' : MARCA,
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
    background: 'linear-gradient(135deg,#f1f5f9,#e2e8f0)', padding: 20,
    fontFamily: "'Segoe UI',Roboto,Arial,sans-serif",
  },
  tarjeta: {
    width: '100%', maxWidth: 420, background: '#fff', borderRadius: 18,
    boxShadow: '0 10px 30px rgba(0,0,0,.08)', padding: '32px 30px',
  },
  titulo: { fontSize: 21, color: MARCA, margin: '0 0 6px' },
  sub: { fontSize: 13.5, color: '#6b7280', margin: '0 0 20px', lineHeight: 1.6 },
  usuario: {
    display: 'flex', flexDirection: 'column', gap: 2,
    background: '#F7F7F4', border: '1px solid #E4E4DF', borderRadius: 10,
    padding: '10px 13px', marginBottom: 20,
  },
  usuarioEtiqueta: { fontSize: 10.5, color: '#6b7280', textTransform: 'uppercase', letterSpacing: .4 },
  usuarioValor: { fontSize: 14, color: '#14263F', wordBreak: 'break-all' },
  label: { display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: '#1f2937' },
  input: {
    width: '100%', padding: '11px 12px', border: '1px solid #cbd5e1',
    borderRadius: 8, fontSize: 14, boxSizing: 'border-box',
  },
  ayuda: { fontSize: 11, color: '#6b7280', margin: '4px 0 0' },
  error: {
    marginTop: 16, padding: '11px 13px', background: '#fef2f2',
    color: '#dc2626', borderRadius: 8, fontSize: 13, lineHeight: 1.55,
  },
  boton: {
    width: '100%', marginTop: 22, padding: 13, color: '#fff', border: 'none',
    borderRadius: 10, fontSize: 15, fontWeight: 600,
  },
};
