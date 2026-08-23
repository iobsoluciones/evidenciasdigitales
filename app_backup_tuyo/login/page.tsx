'use client';

/**
 * PANTALLA DE INICIO DE SESION
 * ---------------------------------------------------------------
 * Es "use client" porque necesita estado e interaccion.
 * Tras un login exitoso usa router.refresh() para que el servidor
 * vuelva a evaluar la sesion; sin ese refresh el middleware seguiria
 * viendo al usuario como no autenticado.
 */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { crearClienteNavegador } from '@/lib/supabase/cliente';

export default function PaginaLogin() {
  const router = useRouter();
  const supabase = crearClienteNavegador();

  const [correo, setCorreo] = useState('');
  const [clave, setClave] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');

  async function iniciarSesion(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setCargando(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: correo.trim(),
      password: clave,
    });

    if (error) {
      // Mensaje generico: no revelar si el correo existe o no
      setError('Correo o contraseña incorrectos.');
      setCargando(false);
      return;
    }

    router.refresh();
    router.push('/panel');
  }

  async function recuperarClave() {
    if (!correo.trim()) {
      setError('Escribe tu correo para enviarte el enlace de recuperación.');
      return;
    }
    setError('');
    const { error } = await supabase.auth.resetPasswordForEmail(correo.trim(), {
      redirectTo: `${window.location.origin}/recuperar`,
    });
    setAviso(error ? '' : 'Si el correo existe, recibirás un enlace en unos minutos.');
    if (error) setError('No se pudo enviar el correo de recuperación.');
  }

  return (
    <main style={s.pantalla}>
      <div style={s.tarjeta}>
        <h1 style={s.titulo}>Sistema de Asistencia</h1>
        <p style={s.sub}>Ingresa con tu cuenta corporativa</p>

        <form onSubmit={iniciarSesion}>
          <label style={s.label}>Correo</label>
          <input
            type="email"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            style={s.input}
            autoComplete="email"
            required
          />

          <label style={s.label}>Contraseña</label>
          <input
            type="password"
            value={clave}
            onChange={(e) => setClave(e.target.value)}
            style={s.input}
            autoComplete="current-password"
            required
          />

          {error && <div style={s.error}>{error}</div>}
          {aviso && <div style={s.aviso}>{aviso}</div>}

          <button type="submit" disabled={cargando} style={{
            ...s.boton,
            ...(cargando ? s.botonOff : {}),
          }}>
            {cargando ? 'Ingresando…' : 'Ingresar'}
          </button>
        </form>

        <button onClick={recuperarClave} style={s.enlace}>
          Olvidé mi contraseña
        </button>
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
    width: '100%', maxWidth: 400, background: '#fff', borderRadius: 18,
    boxShadow: '0 10px 30px rgba(0,0,0,.08)', padding: '34px 30px',
  },
  titulo: { fontSize: 22, color: '#1e3a8a', margin: '0 0 4px', textAlign: 'center' },
  sub: { fontSize: 14, color: '#6b7280', margin: '0 0 24px', textAlign: 'center' },
  label: { display: 'block', fontSize: 13, fontWeight: 600, margin: '14px 0 6px', color: '#1f2937' },
  input: {
    width: '100%', padding: '11px 12px', border: '1px solid #cbd5e1',
    borderRadius: 8, fontSize: 14, boxSizing: 'border-box',
  },
  boton: {
    width: '100%', marginTop: 22, padding: 13, background: '#1e3a8a', color: '#fff',
    border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: 'pointer',
  },
  botonOff: { background: '#cbd5e1', cursor: 'not-allowed' },
  enlace: {
    width: '100%', marginTop: 14, background: 'none', border: 'none',
    color: '#3b82f6', fontSize: 13, cursor: 'pointer',
  },
  error: {
    marginTop: 16, padding: '10px 12px', background: '#fef2f2',
    color: '#dc2626', borderRadius: 8, fontSize: 13,
  },
  aviso: {
    marginTop: 16, padding: '10px 12px', background: '#f0fdf4',
    color: '#16a34a', borderRadius: 8, fontSize: 13,
  },
};
