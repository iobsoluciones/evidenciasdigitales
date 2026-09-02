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
    <main className="ingreso" style={s.pantalla}>
      {/* ---------- Panel de marca ----------
          Un login centrado sobre un degradado es el formulario que trae
          cualquier plantilla; no dice de quién es la aplicación ni qué
          hace. Este panel lo dice en dos líneas, y en móvil se reduce a
          una franja para no robarle sitio al teclado. */}
      <section className="ingreso-marca" style={s.marca} aria-hidden="true">
        <div style={s.marcaCuerpo}>
          <span style={s.marcaNombre}>Rúbrica</span>
          <span style={s.marcaEtiqueta}>SG-SST</span>

          <p className="ingreso-marca-frase" style={s.marcaFrase}>
            Evidencia firmada para el<br />Sistema de Gestión de SST.
          </p>

          {/* La firma dibujada es el único adorno de la pantalla, y es
              literalmente de lo que trata el producto. */}
          <svg viewBox="0 0 200 50" className="ingreso-firma" style={s.firma} role="presentation">
            <path
              d="M6 40c14-2 22-9 26-19 3-8-1-12-5-9-5 4-6 20 1 26 5 4 11 1 15-6
                 4-7 7-16 11-16 3 0 3 5 1 11-2 5-1 8 3 8 6 0 10-6 13-12 3-5 6-9 9-9
                 3 0 4 4 2 9-2 6 0 9 5 9 8 0 14-8 19-15"
              fill="none" stroke="currentColor" strokeWidth="2.2"
              strokeLinecap="round" strokeLinejoin="round" opacity=".55"
            />
          </svg>
        </div>

        <p className="ingreso-marca-pie" style={s.marcaPie}>IOB Soluciones · Bogotá</p>
      </section>

      {/* ---------- Formulario ---------- */}
      <section style={s.panel}>
        <div style={s.caja}>
          <h1 style={s.titulo}>Entrar</h1>
          <p style={s.sub}>Accede con la cuenta de tu consultoría.</p>

          <form onSubmit={iniciarSesion} style={s.form}>
            <div style={s.campo}>
              <label htmlFor="correo" style={s.label}>Correo</label>
              <input
                id="correo"
                type="email"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                style={s.input}
                autoComplete="email"
                autoFocus
                required
              />
            </div>

            <div style={s.campo}>
              <label htmlFor="clave" style={s.label}>Contraseña</label>
              <input
                id="clave"
                type="password"
                value={clave}
                onChange={(e) => setClave(e.target.value)}
                style={s.input}
                autoComplete="current-password"
                required
              />
            </div>

            {/* aria-live: quien usa lector de pantalla se entera del
                error sin tener que ir a buscarlo. */}
            <div aria-live="polite">
              {error && <div role="alert" style={s.error}>{error}</div>}
              {aviso && <div style={s.aviso}>{aviso}</div>}
            </div>

            <button type="submit" disabled={cargando} style={s.boton}>
              {cargando ? 'Entrando…' : 'Entrar'}
            </button>
          </form>

          <div style={s.pieCaja}>
            <button type="button" onClick={recuperarClave} style={s.enlace}>
              Olvidé mi contraseña
            </button>
            <a href="/registro" style={s.enlace}>Crear una cuenta</a>
          </div>
        </div>
      </section>

      <style>{`
        /* El panel de marca ocupa el 44% en escritorio y se convierte en
           una franja en cuanto la pantalla se estrecha: en un móvil, lo
           que tiene que verse es el formulario. */
        @media (max-width: 860px) {
          .ingreso { flex-direction: column !important; }
          .ingreso-marca {
            width: auto !important; min-height: 0 !important;
            padding: 22px 24px !important;
          }
          .ingreso-marca-frase, .ingreso-firma, .ingreso-marca-pie { display: none !important; }
        }
        .ingreso input:focus { border-color: var(--marca-viva); }
        .ingreso button[type='submit']:hover:not(:disabled) { background: var(--marca-viva); }
      `}</style>
    </main>
  );
}

const s: Record<string, React.CSSProperties> = {
  pantalla: { display: 'flex', minHeight: '100vh', background: 'var(--fondo)' },

  marca: {
    width: '44%', maxWidth: 520, flexShrink: 0,
    display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
    background: 'var(--marca-panel)', color: 'var(--superficie)', padding: '46px 44px',
  },
  marcaCuerpo: { marginTop: 'auto', marginBottom: 'auto' },
  marcaNombre: { fontSize: 30, fontWeight: 700, letterSpacing: -0.4 },
  marcaEtiqueta: {
    fontSize: 10, fontWeight: 700, letterSpacing: 1.4, textTransform: 'uppercase',
    border: '1px solid rgba(255,255,255,.35)', borderRadius: 4,
    padding: '2px 7px', marginLeft: 10, verticalAlign: 4,
  },
  marcaFrase: { fontSize: 19, lineHeight: 1.5, margin: '18px 0 0', opacity: .9, maxWidth: 340 },
  firma: { width: 250, height: 64, marginTop: 30, color: 'var(--sobre-marca)' },
  marcaPie: { fontSize: 11.5, opacity: .6, margin: 0, letterSpacing: .3 },

  panel: {
    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '40px 24px',
  },
  caja: { width: '100%', maxWidth: 380 },
  titulo: { fontSize: 26, fontWeight: 700, color: 'var(--texto)', margin: 0, letterSpacing: -0.3 },
  sub: { fontSize: 14, color: 'var(--texto-suave)', margin: '6px 0 26px' },

  form: { display: 'flex', flexDirection: 'column', gap: 15 },
  campo: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 12.5, fontWeight: 600, color: 'var(--texto-suave)' },
  input: {
    width: '100%', padding: '11px 12px', fontSize: 14,
    background: 'var(--superficie)', color: 'var(--texto)',
    border: '1px solid var(--borde-fuerte)', borderRadius: 8,
    transition: 'border-color .15s ease',
  },
  boton: {
    marginTop: 4, padding: '12px 16px',
    background: 'var(--marca)', color: 'var(--superficie)',
    border: 'none', borderRadius: 8, fontSize: 14.5, fontWeight: 600,
    transition: 'background .15s ease',
  },
  pieCaja: {
    display: 'flex', justifyContent: 'space-between', gap: 12,
    marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--borde)',
  },
  enlace: {
    background: 'none', border: 'none', padding: 0,
    color: 'var(--texto-suave)', fontSize: 12.5, textDecoration: 'underline',
    textUnderlineOffset: 3,
  },
  error: {
    padding: '10px 12px', background: 'var(--mal-fondo)', color: 'var(--mal)',
    borderRadius: 8, fontSize: 13, lineHeight: 1.5,
  },
  aviso: {
    padding: '10px 12px', background: 'var(--bien-fondo)', color: 'var(--bien)',
    borderRadius: 8, fontSize: 13, lineHeight: 1.5,
  },
};
