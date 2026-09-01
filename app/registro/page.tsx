'use client';

/**
 * REGISTRO AUTOSERVICIO
 * ---------------------------------------------------------------
 * Dos pasos en una sola pantalla:
 *   1. Crear la cuenta en Supabase Auth (signUp)
 *   2. Llamar a crear_organizacion(), que la crea con 14 días de
 *      prueba y vincula al usuario como administrador
 *
 * La función de la base valida el slug, impide duplicados y no deja
 * que un usuario tenga dos organizaciones.
 */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { crearClienteNavegador } from '@/lib/supabase/cliente';


export default function PaginaRegistro() {
  const router = useRouter();
  const supabase = crearClienteNavegador();

  const [f, setF] = useState({
    empresa: '', slug: '', nombre: '', correo: '', clave: '',
  });
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');

  /** Sugiere un identificador a partir del nombre de la empresa. */
  function alEscribirEmpresa(v: string) {
    const sugerido = v
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')  // quita tildes
      .replace(/[^a-z0-9\s-]/g, '')
      .trim().replace(/\s+/g, '-')
      .slice(0, 30);
    setF((p) => ({ ...p, empresa: v, slug: sugerido }));
  }

  async function registrar(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!f.empresa.trim() || !f.nombre.trim() || !f.correo.trim()) {
      setError('Completa todos los campos.');
      return;
    }
    if (f.clave.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (!/^[a-z0-9-]{3,30}$/.test(f.slug)) {
      setError('El identificador solo admite minúsculas, números y guiones (3 a 30 caracteres).');
      return;
    }

    setCargando(true);

    // 1. Crear la cuenta
    const { data: alta, error: errAlta } = await supabase.auth.signUp({
      email: f.correo.trim(),
      password: f.clave,
      options: { data: { nombre: f.nombre.trim() } },
    });

    if (errAlta) {
      setCargando(false);
      setError(
        errAlta.message.includes('already')
          ? 'Ya existe una cuenta con ese correo. Inicia sesión.'
          : 'No se pudo crear la cuenta: ' + errAlta.message
      );
      return;
    }

    // Si el proyecto exige confirmación por correo, aún no hay sesión
    if (!alta.session) {
      setCargando(false);
      setAviso(
        'Te enviamos un correo de confirmación. Ábrelo y vuelve a esta página ' +
        'para terminar de crear tu organización.'
      );
      return;
    }

    // 2. Crear la organización
    const { data, error: errOrg } = await supabase.rpc('crear_organizacion', {
      p_slug: f.slug,
      p_nombre: f.empresa,
      p_nombre_usuario: f.nombre,
    });

    setCargando(false);

    if (errOrg) {
      setError('No se pudo crear la organización: ' + errOrg.message);
      return;
    }

    const r = data as { ok: boolean; error?: string };
    if (!r.ok) {
      setError(r.error ?? 'No se pudo crear la organización.');
      return;
    }

    router.refresh();
    router.push('/panel');
  }

  return (
    <main style={s.pantalla}>
      <div style={s.tarjeta}>
        <Link href="/" style={s.volver}>← Volver</Link>

        <h1 style={s.titulo}>Crea tu cuenta</h1>
        <p style={s.sub}>14 días de prueba. Sin tarjeta de crédito.</p>

        <form onSubmit={registrar}>
          <Campo etiqueta="Nombre de la empresa" valor={f.empresa}
            onChange={alEscribirEmpresa} placeholder="Autosnack SAS" />

          <div>
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
            onChange={(v) => setF({ ...f, correo: v })} placeholder="tu@empresa.com" />

          <Campo etiqueta="Contraseña" valor={f.clave} tipo="password"
            onChange={(v) => setF({ ...f, clave: v })}
            ayuda="Mínimo 8 caracteres." />

          {error && <div style={{ ...s.mensaje, background: 'var(--mal-fondo)', color: 'var(--mal)' }}>{error}</div>}
          {aviso && <div style={{ ...s.mensaje, background: 'var(--bien-fondo)', color: 'var(--bien)' }}>{aviso}</div>}

          <button type="submit" disabled={cargando} style={{
            ...s.boton, background: cargando ? 'var(--borde-fuerte)' : 'var(--marca)',
            cursor: cargando ? 'not-allowed' : 'pointer',
          }}>
            {cargando ? 'Creando…' : 'Crear cuenta'}
          </button>
        </form>

        <p style={s.pie}>
          ¿Ya tienes cuenta? <Link href="/login" style={{ color: 'var(--marca)' }}>Inicia sesión</Link>
        </p>

        {/* Salida para quien no recibe el correo de confirmación.
            Temporal: se retira cuando haya dominio y cuenta de envío. */}
        <div style={s.alterna}>
          ¿No te llega el correo de confirmación?{' '}
          <Link href="/registro/directo" style={{ color: 'var(--marca)', fontWeight: 600 }}>
            Crea tu cuenta sin correo
          </Link>
        </div>

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
  sub: { fontSize: 13, color: 'var(--texto-suave)', margin: '0 0 22px' },
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
  mensaje: { marginTop: 16, padding: '11px 14px', borderRadius: 8, fontSize: 13 },
  boton: {
    width: '100%', marginTop: 20, padding: 14, color: 'var(--sobre-marca)', border: 'none',
    borderRadius: 8, fontSize: 15, fontWeight: 600,
  },
  pie: { fontSize: 13, textAlign: 'center', marginTop: 18, color: 'var(--texto-suave)' },
  alterna: {
    marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--borde)',
    fontSize: 12.5, color: 'var(--texto-suave)', textAlign: 'center', lineHeight: 1.6,
  },
  legal: { fontSize: 10.5, color: 'var(--texto-tenue)', textAlign: 'center', marginTop: 14, lineHeight: 1.5 },
};
