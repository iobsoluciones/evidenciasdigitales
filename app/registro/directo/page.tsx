'use client';

/**
 * REGISTRO DIRECTO (TEMPORAL)
 * ---------------------------------------------------------------
 * Alternativa al registro por correo mientras no haya dominio ni
 * cuenta de envío propias. El servidor crea la cuenta ya confirmada y
 * genera la contraseña; aquí solo se muestra una vez y se obliga a
 * guardarla antes de continuar.
 *
 * No inicia sesión automáticamente a propósito: que el usuario entre
 * escribiendo la contraseña es la forma de comprobar que la guardó.
 */
import { useState, useTransition } from 'react';
import Link from 'next/link';
import { registrarDirecto } from '@/lib/acciones-registro';


export default function PaginaRegistroDirecto() {
  const [pendiente, startTransition] = useTransition();

  const [f, setF] = useState({ empresa: '', slug: '', nombre: '', correo: '' });
  const [error, setError] = useState('');
  const [credencial, setCredencial] = useState<{ correo: string; clave: string } | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [guardada, setGuardada] = useState(false);

  /** Sugiere un identificador a partir del nombre de la empresa. */
  function alEscribirEmpresa(v: string) {
    const sugerido = v
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036F]/g, '')  // quita tildes
      .replace(/[^a-z0-9\s-]/g, '')
      .trim().replace(/\s+/g, '-')
      .slice(0, 30);
    setF((p) => ({ ...p, empresa: v, slug: sugerido }));
  }

  function registrar(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    startTransition(async () => {
      const r = await registrarDirecto(f);
      if (!r.ok) {
        setError(r.mensaje);
        return;
      }
      setCredencial({ correo: r.correo, clave: r.clave });
    });
  }

  async function copiar() {
    if (!credencial) return;
    try {
      await navigator.clipboard.writeText(
        `Usuario: ${credencial.correo}\nContraseña: ${credencial.clave}`
      );
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      setError('No se pudo copiar. Anota la contraseña a mano.');
    }
  }

  // ---- Pantalla 2: la credencial recién creada ----
  if (credencial) {
    return (
      <main style={s.pantalla}>
        <div style={s.tarjeta}>
          <div style={s.exito}>✓</div>
          <h1 style={s.titulo}>Cuenta creada</h1>
          <p style={s.sub}>
            Esta contraseña se muestra <strong>una sola vez</strong>. No se envía por
            correo ni se puede volver a consultar: guárdala antes de continuar.
          </p>

          <div style={s.credencial}>
            <div style={s.credLinea}>
              <span style={s.credEtiqueta}>Usuario</span>
              <span style={s.credValor}>{credencial.correo}</span>
            </div>
            <div style={{ ...s.credLinea, borderBottom: 'none' }}>
              <span style={s.credEtiqueta}>Contraseña</span>
              <span style={{ ...s.credValor, ...s.clave }}>{credencial.clave}</span>
            </div>
          </div>

          <button onClick={copiar} style={s.botonSec}>
            {copiado ? '✓ Copiado' : 'Copiar usuario y contraseña'}
          </button>

          <label style={s.confirmar}>
            <input
              type="checkbox"
              checked={guardada}
              onChange={(e) => setGuardada(e.target.checked)}
              style={{ marginRight: 9, width: 16, height: 16 }}
            />
            Ya guardé la contraseña en un lugar seguro
          </label>

          <Link
            href="/login"
            style={{
              ...s.boton,
              display: 'block', textAlign: 'center', textDecoration: 'none',
              background: guardada ? 'var(--marca)' : 'var(--borde-fuerte)',
              pointerEvents: guardada ? 'auto' : 'none',
            }}
          >
            Ir a ingresar
          </Link>

          <p style={s.nota}>
            Al entrar por primera vez el sistema te pedirá cambiarla por una tuya.
          </p>
        </div>
      </main>
    );
  }

  // ---- Pantalla 1: el formulario ----
  return (
    <main style={s.pantalla}>
      <div style={s.tarjeta}>
        <Link href="/registro" style={s.volver}>← Registro con verificación por correo</Link>

        <h1 style={s.titulo}>Crea tu cuenta sin correo</h1>
        <p style={s.sub}>
          El sistema genera tu contraseña y la muestra en pantalla. 14 días de prueba,
          sin tarjeta de crédito.
        </p>

        <div style={s.aviso}>
          <strong>Método temporal.</strong> Está disponible mientras habilitamos el
          envío de correos. No recibirás ningún mensaje: la contraseña aparece aquí
          y debes guardarla tú.
        </div>

        <form onSubmit={registrar}>
          <Campo etiqueta="Nombre de la empresa" valor={f.empresa}
            onChange={alEscribirEmpresa} placeholder="Autosnack SAS" />

          <div style={{ marginBottom: 14 }}>
            <label style={s.label}>Identificador</label>
            <div style={s.slugFila}>
              <span style={s.slugPrefijo}>/r/</span>
              <input
                value={f.slug}
                onChange={(e) => setF({ ...f, slug: e.target.value.toLowerCase() })}
                style={{ ...s.input, borderRadius: '0 8px 8px 0', borderLeft: 'none' }}
              />
            </div>
            <p style={s.ayuda}>
              Aparece en el enlace que escanean tus asistentes. No se puede cambiar después.
            </p>
          </div>

          <Campo etiqueta="Tu nombre" valor={f.nombre}
            onChange={(v) => setF({ ...f, nombre: v })} placeholder="Iván Ocón" />

          <Campo etiqueta="Correo" valor={f.correo} tipo="email"
            onChange={(v) => setF({ ...f, correo: v })} placeholder="tu@empresa.com"
            ayuda="Es tu usuario para ingresar. No se le enviará ningún mensaje." />

          {error && <div style={s.error}>{error}</div>}

          <button type="submit" disabled={pendiente} style={{
            ...s.boton,
            background: pendiente ? 'var(--borde-fuerte)' : 'var(--marca)',
            cursor: pendiente ? 'not-allowed' : 'pointer',
          }}>
            {pendiente ? 'Creando…' : 'Crear cuenta y generar contraseña'}
          </button>
        </form>

        <p style={s.pie}>
          ¿Ya tienes cuenta? <Link href="/login" style={{ color: 'var(--marca)' }}>Inicia sesión</Link>
        </p>

        <p style={s.legal}>
          Al crear la cuenta aceptas el tratamiento de datos personales conforme
          a la Ley 1581 de 2012.
        </p>
      </div>
    </main>
  );
}

function Campo({
  etiqueta, valor, onChange, tipo = 'text', placeholder, ayuda,
}: {
  etiqueta: string; valor: string; onChange: (v: string) => void;
  tipo?: string; placeholder?: string; ayuda?: string;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={s.label}>{etiqueta}</label>
      <input
        type={tipo}
        value={valor}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        style={s.input}
      />
      {ayuda && <p style={s.ayuda}>{ayuda}</p>}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  pantalla: {
    minHeight: '100vh', display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
    background: 'var(--fondo)', padding: '40px 20px',
  },
  tarjeta: {
    width: '100%', maxWidth: 440, background: 'var(--superficie)', borderRadius: 18,
    boxShadow: '0 10px 30px rgba(0,0,0,.08)', padding: '28px 30px 32px',
  },
  volver: { fontSize: 12.5, color: 'var(--texto-suave)', textDecoration: 'none' },
  titulo: { fontSize: 22, color: 'var(--texto)', margin: '14px 0 2px' },
  sub: { fontSize: 13, color: 'var(--texto-suave)', margin: '0 0 18px', lineHeight: 1.55 },
  aviso: {
    background: 'var(--aviso-fondo)', border: '1px solid var(--aviso)', color: 'var(--aviso)',
    borderRadius: 8, padding: '11px 13px', fontSize: 12.5, lineHeight: 1.55,
    marginBottom: 20,
  },
  label: { display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 },
  input: {
    width: '100%', padding: '11px 12px', border: '1px solid var(--borde-fuerte)',
    borderRadius: 8, fontSize: 14, boxSizing: 'border-box',
  },
  slugFila: { display: 'flex', alignItems: 'stretch' },
  slugPrefijo: {
    background: 'var(--superficie-3)', border: '1px solid var(--borde-fuerte)', borderRight: 'none',
    borderRadius: '8px 0 0 8px', padding: '11px 10px', fontSize: 14, color: 'var(--texto-suave)',
  },
  ayuda: { fontSize: 11, color: 'var(--texto-suave)', margin: '4px 0 0' },
  error: {
    marginTop: 16, padding: '11px 14px', borderRadius: 8, fontSize: 13,
    background: 'var(--mal-fondo)', color: 'var(--mal)',
  },
  boton: {
    width: '100%', marginTop: 20, padding: 14, color: 'var(--sobre-marca)', border: 'none',
    borderRadius: 8, fontSize: 15, fontWeight: 600,
  },
  botonSec: {
    width: '100%', marginTop: 14, padding: 11, background: 'var(--superficie)', color: 'var(--texto)',
    border: '1px solid var(--marca)', borderRadius: 8, fontSize: 13.5,
    fontWeight: 600, cursor: 'pointer',
  },
  pie: { fontSize: 13, textAlign: 'center', marginTop: 18, color: 'var(--texto-suave)' },
  legal: { fontSize: 10.5, color: 'var(--texto-tenue)', textAlign: 'center', marginTop: 14, lineHeight: 1.5 },

  exito: {
    width: 44, height: 44, borderRadius: '50%', background: 'var(--bien-fondo)', color: 'var(--bien)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 24, fontWeight: 700,
  },
  credencial: {
    border: '1px solid var(--borde)', borderRadius: 12, background: 'var(--fondo)',
    padding: '4px 14px', marginTop: 4,
  },
  credLinea: {
    display: 'flex', flexDirection: 'column', gap: 3,
    padding: '11px 0', borderBottom: '1px solid var(--borde)',
  },
  credEtiqueta: { fontSize: 11, color: 'var(--texto-suave)', textTransform: 'uppercase', letterSpacing: .4 },
  credValor: { fontSize: 14.5, color: 'var(--texto)', wordBreak: 'break-all' },
  clave: {
    fontFamily: "'Consolas','Courier New',monospace", fontSize: 19,
    fontWeight: 700, letterSpacing: 1.2,
  },
  confirmar: {
    display: 'flex', alignItems: 'center', fontSize: 13, color: 'var(--texto-suave)',
    margin: '18px 0 0', cursor: 'pointer',
  },
  nota: { fontSize: 11.5, color: 'var(--texto-suave)', textAlign: 'center', marginTop: 12 },
};
