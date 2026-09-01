'use client';

/**
 * CAMBIO DE CONTRASEÑA
 * ---------------------------------------------------------------
 * Se exige la contraseña actual aunque Supabase no lo pida: tener la
 * sesión abierta no prueba que quien está frente al equipo sea el
 * dueño de la cuenta. Verificarla antes evita que un portátil dejado
 * sin bloquear se convierta en un secuestro de la cuenta.
 *
 * La verificación se hace con signInWithPassword contra el mismo
 * correo: si la actual no es correcta, devuelve error y no se toca
 * nada.
 */
import { useState, useTransition } from 'react';
import { crearClienteNavegador } from '@/lib/supabase/cliente';

/** Mínimo propio, por encima del de Supabase (6). */
const MINIMO = 8;

export default function CambiarClave({
  correo,
  color,
}: {
  correo: string;
  color: string;
}) {
  const supabase = crearClienteNavegador();
  const [pendiente, startTransition] = useTransition();
  const [abierto, setAbierto] = useState(false);

  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [repetida, setRepetida] = useState('');
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  function limpiar() {
    setActual('');
    setNueva('');
    setRepetida('');
  }

  function cambiar() {
    if (!actual) {
      setAviso({ tipo: 'error', texto: 'Escribe tu contraseña actual.' });
      return;
    }
    if (nueva.length < MINIMO) {
      setAviso({ tipo: 'error', texto: `La nueva contraseña debe tener al menos ${MINIMO} caracteres.` });
      return;
    }
    if (nueva !== repetida) {
      setAviso({ tipo: 'error', texto: 'La nueva contraseña y su confirmación no coinciden.' });
      return;
    }
    if (nueva === actual) {
      setAviso({ tipo: 'error', texto: 'La nueva contraseña debe ser distinta de la actual.' });
      return;
    }

    startTransition(async () => {
      // 1. Reautenticar: confirma que quien pide el cambio es el dueño.
      const { error: errActual } = await supabase.auth.signInWithPassword({
        email: correo,
        password: actual,
      });

      if (errActual) {
        setAviso({ tipo: 'error', texto: 'La contraseña actual no es correcta.' });
        return;
      }

      // 2. Ya verificado, se cambia.
      const { error } = await supabase.auth.updateUser({ password: nueva });

      if (error) {
        setAviso({ tipo: 'error', texto: error.message });
        return;
      }

      limpiar();
      setAbierto(false);
      setAviso({
        tipo: 'ok',
        texto: 'Contraseña actualizada. Úsala la próxima vez que inicies sesión.',
      });
    });
  }

  return (
    <section style={e.card}>
      <h2 style={e.h2}>Contraseña</h2>
      <p style={e.sub}>
        Acceso a la cuenta <strong>{correo}</strong>.
      </p>

      {aviso && (
        <div style={{
          ...e.aviso,
          background: aviso.tipo === 'ok' ? 'var(--bien-fondo)' : 'var(--mal-fondo)',
          color: aviso.tipo === 'ok' ? 'var(--bien)' : 'var(--mal)',
        }}>
          {aviso.texto}
        </div>
      )}

      {!abierto ? (
        <button
          onClick={() => { setAviso(null); setAbierto(true); }}
          style={{ ...e.btn, background: color }}
        >
          Cambiar contraseña
        </button>
      ) : (
        <div style={e.formulario}>
          <label style={e.label}>Contraseña actual</label>
          <input
            type="password"
            value={actual}
            autoComplete="current-password"
            onChange={(ev) => setActual(ev.target.value)}
            style={e.input}
          />

          <label style={{ ...e.label, marginTop: 12 }}>Nueva contraseña</label>
          <input
            type="password"
            value={nueva}
            autoComplete="new-password"
            onChange={(ev) => setNueva(ev.target.value)}
            placeholder={`Mínimo ${MINIMO} caracteres`}
            style={e.input}
          />

          <label style={{ ...e.label, marginTop: 12 }}>Repite la nueva contraseña</label>
          <input
            type="password"
            value={repetida}
            autoComplete="new-password"
            onChange={(ev) => setRepetida(ev.target.value)}
            style={e.input}
          />

          <div style={e.acciones}>
            <button
              onClick={cambiar}
              disabled={pendiente}
              style={{ ...e.btn, background: pendiente ? 'var(--borde-fuerte)' : color }}
            >
              {pendiente ? 'Guardando…' : 'Guardar contraseña'}
            </button>
            <button
              onClick={() => { setAbierto(false); limpiar(); setAviso(null); }}
              disabled={pendiente}
              style={e.btnSec}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

const e: Record<string, React.CSSProperties> = {
  card: {
    background: 'var(--superficie)', border: '1px solid var(--borde)',
    borderRadius: 8, padding: 20, marginBottom: 18,
  },
  h2: { fontSize: 15, margin: '0 0 3px', fontWeight: 600 },
  sub: { fontSize: 12.5, color: 'var(--texto-suave)', margin: '0 0 16px' },
  aviso: { padding: '10px 12px', borderRadius: 6, fontSize: 12.5, margin: '0 0 14px' },
  formulario: { maxWidth: 360 },
  label: { display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5, color: 'var(--texto)' },
  input: {
    width: '100%', padding: '9px 11px', border: '1px solid var(--borde-fuerte)',
    borderRadius: 4, fontSize: 13, boxSizing: 'border-box', fontFamily: 'inherit',
  },
  acciones: { display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' },
  btn: {
    color: 'var(--sobre-marca)', border: 'none', padding: '9px 16px', borderRadius: 4,
    fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
  },
  btnSec: {
    background: 'var(--superficie)', color: 'var(--texto)', border: '1px solid var(--borde-fuerte)',
    padding: '9px 16px', borderRadius: 4, fontSize: 13, fontWeight: 600,
    cursor: 'pointer', fontFamily: 'inherit',
  },
};
