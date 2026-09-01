'use client';

/**
 * FORMULARIO DE EMPRESA
 * ---------------------------------------------------------------
 * Sirve para alta y edición. Los datos de membrete —nomenclatura,
 * versión, color— pertenecen a la empresa porque el acta es un
 * documento de SU sistema de gestión, no del consultor.
 */
import { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { crearEmpresa, actualizarEmpresa, verificarSlugEmpresa } from '@/lib/acciones-empresas';
import type { Empresa } from '@/lib/empresa-activa';

const SECTORES = [
  'MANUFACTURA', 'CONSTRUCCIÓN', 'SERVICIOS', 'COMERCIO', 'TRANSPORTE',
  'SALUD', 'EDUCACIÓN', 'ALIMENTOS', 'MINERÍA', 'AGROINDUSTRIA', 'OTRO',
];

export default function FormularioEmpresa({ empresa }: { empresa?: Empresa }) {
  const router = useRouter();
  const [pendiente, startTransition] = useTransition();
  const edicion = Boolean(empresa);

  const [f, setF] = useState({
    nombre: empresa?.nombre ?? '',
    slug: empresa?.slug ?? '',
    nit: empresa?.nit ?? '',
    sector: empresa?.sector ?? '',
    ciudad: empresa?.ciudad ?? '',
    direccion: empresa?.direccion ?? '',
    contacto: empresa?.contacto ?? '',
    correo: empresa?.correo ?? '',
    telefono: empresa?.telefono ?? '',
    nomenclatura: empresa?.nomenclatura ?? '',
    version_doc: empresa?.version_doc ?? 'V1',
    color_primario: empresa?.color_primario ?? '#14263F',
  });

  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  /**
   * Estado del identificador publico. Se comprueba contra toda la base
   * mientras se escribe: el slug es unico a nivel global (el enlace
   * /r/{slug} no tiene sesion), asi que puede chocar con la empresa de
   * otro consultor, que RLS no deja ver. Descubrirlo al enviar, con el
   * formulario entero lleno, era la peor forma de enterarse.
   */
  const [slugEstado, setSlugEstado] = useState<
    { estado: 'inicial' | 'verificando' | 'libre' | 'ocupado'; motivo?: string; sugerencia?: string | null }
  >({ estado: 'inicial' });

  useEffect(() => {
    if (edicion) return;                 // en edicion el slug no se toca
    const valor = f.slug.trim();
    if (!valor) { setSlugEstado({ estado: 'inicial' }); return; }

    setSlugEstado({ estado: 'verificando' });

    // Se espera a que deje de teclear para no consultar en cada letra
    const t = setTimeout(async () => {
      const r = await verificarSlugEmpresa(valor);
      setSlugEstado(
        r.libre
          ? { estado: 'libre' }
          : { estado: 'ocupado', motivo: r.motivo, sugerencia: r.sugerencia }
      );
    }, 450);

    return () => clearTimeout(t);
  }, [f.slug, edicion]);

  /** Al escribir el nombre se sugiere el identificador, solo en alta. */
  function alEscribirNombre(v: string) {
    if (edicion) {
      setF((p) => ({ ...p, nombre: v }));
      return;
    }
    const slug = v
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .trim().replace(/\s+/g, '-')
      .slice(0, 40);
    setF((p) => ({ ...p, nombre: v, slug }));
  }

  function guardar() {
    startTransition(async () => {
      const r = edicion
        ? await actualizarEmpresa(empresa!.id, f)
        : await crearEmpresa(f);

      setAviso({ tipo: r.ok ? 'ok' : 'error', texto: r.mensaje });
      if (r.ok) {
        router.refresh();
        if (!edicion) router.push('/panel');
      }
    });
  }

  return (
    <>
      <Link href="/panel/empresas" style={s.volver}>← Empresas</Link>

      <h1 style={s.titulo}>
        {edicion ? empresa!.nombre : 'Agregar empresa'}
      </h1>
      <p style={s.sub}>
        {edicion
          ? 'Los datos de membrete aparecen en las actas de esta empresa.'
          : 'Cada empresa lleva su propio membrete, indicadores y documentos.'}
      </p>

      {/* ---------- Identificación ---------- */}
      <section style={s.card}>
        <h2 style={s.h2}>Identificación</h2>

        <Campo etiqueta="Razón social" valor={f.nombre} onChange={alEscribirNombre} mayus />

        <div>
          <label style={s.label}>Identificador en el enlace público</label>
          <div style={s.slugFila}>
            <span style={s.slugPrefijo}>/r/</span>
            <input
              value={f.slug}
              disabled={edicion}
              onChange={(e) => setF({ ...f, slug: e.target.value.toLowerCase() })}
              style={{
                ...s.input, borderRadius: '0 4px 4px 0', borderLeft: 'none',
                fontFamily: 'ui-monospace,SFMono-Regular,Menlo,monospace',
                background: edicion ? 'var(--superficie-3)' : '#fff',
              }}
            />
          </div>
          {!edicion && slugEstado.estado === 'ocupado' && (
            <p style={{ ...s.ayuda, color: 'var(--mal)' }}>
              {slugEstado.motivo === 'Ya está en uso.'
                ? 'Ese identificador ya lo usa otra empresa. El enlace público es único en todo el sistema.'
                : slugEstado.motivo}
              {slugEstado.sugerencia && (
                <>
                  {' '}
                  <button
                    type="button"
                    onClick={() => setF({ ...f, slug: slugEstado.sugerencia! })}
                    style={s.usarSugerencia}
                  >
                    Usar “{slugEstado.sugerencia}”
                  </button>
                </>
              )}
            </p>
          )}

          {!edicion && slugEstado.estado === 'libre' && (
            <p style={{ ...s.ayuda, color: 'var(--bien)' }}>
              Disponible. El enlace será /r/{f.slug}
            </p>
          )}

          {!edicion && slugEstado.estado === 'verificando' && (
            <p style={s.ayuda}>Comprobando disponibilidad…</p>
          )}

          <p style={s.ayuda}>
            {edicion
              ? 'No se puede cambiar: los códigos QR ya impresos dejarían de funcionar.'
              : 'Aparece en el enlace que escanean los asistentes de esta empresa. Es único en todo el sistema, no solo entre tus empresas.'}
          </p>
        </div>

        <div style={s.dos}>
          <Campo etiqueta="NIT" valor={f.nit} onChange={(v) => setF({ ...f, nit: v })} />
          <div>
            <label style={s.label}>Sector</label>
            <select
              value={f.sector}
              onChange={(e) => setF({ ...f, sector: e.target.value })}
              style={s.input}
            >
              <option value="">Sin especificar</option>
              {SECTORES.map((x) => <option key={x} value={x}>{x}</option>)}
            </select>
          </div>
        </div>

        <Campo etiqueta="Ciudad" valor={f.ciudad} onChange={(v) => setF({ ...f, ciudad: v })} mayus />
        <Campo etiqueta="Dirección" valor={f.direccion}
          onChange={(v) => setF({ ...f, direccion: v })}
          marcador="Calle 100 # 15-20, Bogotá" mayus />
      </section>

      {/* ---------- Contacto ---------- */}
      <section style={s.card}>
        <h2 style={s.h2}>Contacto</h2>
        <Campo etiqueta="Persona de contacto" valor={f.contacto}
          onChange={(v) => setF({ ...f, contacto: v })} mayus />
        <div style={s.dos}>
          <Campo etiqueta="Correo" valor={f.correo} tipo="email"
            onChange={(v) => setF({ ...f, correo: v })} />
          <Campo etiqueta="Teléfono" valor={f.telefono}
            onChange={(v) => setF({ ...f, telefono: v })} />
        </div>
      </section>

      {/* ---------- Membrete ---------- */}
      <section style={s.card}>
        <h2 style={s.h2}>Membrete de los documentos</h2>
        <p style={s.nota}>
          Las actas de esta empresa se emiten con estos datos. El logo se
          carga desde Configuración una vez creada.
        </p>

        <div style={s.dos}>
          <Campo etiqueta="Nomenclatura" valor={f.nomenclatura}
            onChange={(v) => setF({ ...f, nomenclatura: v.toUpperCase() })}
            marcador="SST-CAP-001" mayus />
          <Campo etiqueta="Versión" valor={f.version_doc}
            onChange={(v) => setF({ ...f, version_doc: v.toUpperCase() })} mayus />
        </div>

        <label style={s.label}>Color de marca</label>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <input
            type="color"
            value={f.color_primario}
            onChange={(e) => setF({ ...f, color_primario: e.target.value })}
            style={{ width: 48, height: 36, padding: 2, border: '1px solid var(--borde-fuerte)', borderRadius: 4 }}
          />
          <input
            value={f.color_primario}
            onChange={(e) => setF({ ...f, color_primario: e.target.value })}
            style={{ ...s.input, maxWidth: 130, fontFamily: 'ui-monospace,monospace' }}
          />
          <span style={s.notaColor}>
            Distingue esta empresa en el selector superior.
          </span>
        </div>
      </section>

      {aviso && (
        <div style={{
          ...s.aviso,
          background: aviso.tipo === 'ok' ? 'var(--bien-fondo)' : 'var(--mal-fondo)',
          color: aviso.tipo === 'ok' ? 'var(--bien)' : 'var(--mal)',
        }}>
          {aviso.texto}
        </div>
      )}

      <div style={{ display: 'flex', gap: 10 }}>
        {/* Con el identificador ocupado el alta va a rebotar igual:
            mejor no dejar enviar el formulario entero para nada. */}
        <button
          onClick={guardar}
          disabled={pendiente || (!edicion && slugEstado.estado === 'ocupado')}
          style={{
            ...s.btn,
            opacity: !edicion && slugEstado.estado === 'ocupado' ? 0.5 : 1,
            cursor: !edicion && slugEstado.estado === 'ocupado' ? 'not-allowed' : 'pointer',
          }}
        >
          {pendiente ? 'Guardando…' : edicion ? 'Guardar cambios' : 'Agregar empresa'}
        </button>
        <Link href="/panel/empresas" style={s.btnSec}>Cancelar</Link>
      </div>
    </>
  );
}

function Campo({
  etiqueta, valor, onChange, tipo = 'text', mayus, marcador,
}: {
  etiqueta: string; valor: string; onChange: (v: string) => void;
  tipo?: string; mayus?: boolean; marcador?: string;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={s.label}>{etiqueta}</label>
      <input
        type={tipo}
        value={valor}
        placeholder={marcador}
        onChange={(e) => onChange(e.target.value)}
        style={{ ...s.input, textTransform: mayus ? 'uppercase' : 'none' }}
      />
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  volver: { fontSize: 13, color: 'var(--texto-suave)', textDecoration: 'none' },
  titulo: { fontSize: 22, margin: '12px 0 3px', letterSpacing: -0.4 },
  sub: { fontSize: 13, color: 'var(--texto-suave)', margin: '0 0 22px' },
  card: {
    background: 'var(--superficie)', border: '1px solid var(--borde)', borderRadius: 8,
    padding: 22, marginBottom: 16, maxWidth: 640,
  },
  h2: { fontSize: 14.5, margin: '0 0 4px', fontWeight: 600 },
  nota: { fontSize: 12, color: 'var(--texto-suave)', margin: '0 0 16px' },
  notaColor: { fontSize: 11.5, color: 'var(--texto-tenue)' },
  label: { display: 'block', fontSize: 12, fontWeight: 600, margin: '12px 0 5px' },
  input: {
    width: '100%', padding: '9px 11px', border: '1px solid var(--borde-fuerte)',
    borderRadius: 4, fontSize: 13, boxSizing: 'border-box', fontFamily: 'inherit',
  },
  ayuda: { fontSize: 11, color: 'var(--texto-tenue)', margin: '5px 0 0' },
  dos: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 14 },
  usarSugerencia: {
    background: 'none', border: 'none', padding: 0,
    color: 'var(--texto)', fontWeight: 700, fontSize: 'inherit',
    fontFamily: 'inherit', cursor: 'pointer', textDecoration: 'underline',
  },
  slugFila: { display: 'flex', alignItems: 'stretch' },
  slugPrefijo: {
    background: 'var(--superficie-3)', border: '1px solid var(--borde-fuerte)', borderRight: 'none',
    borderRadius: '4px 0 0 4px', padding: '9px 10px', fontSize: 13, color: 'var(--texto-tenue)',
    fontFamily: 'ui-monospace,SFMono-Regular,Menlo,monospace',
  },
  aviso: { padding: '11px 15px', borderRadius: 6, fontSize: 13, marginBottom: 16, maxWidth: 640 },
  btn: {
    background: 'var(--marca)', color: 'var(--sobre-marca)', border: 'none', padding: '11px 22px',
    borderRadius: 4, fontSize: 13, fontWeight: 600, cursor: 'pointer',
  },
  btnSec: {
    background: 'var(--superficie)', color: 'var(--texto)', border: '1px solid var(--borde-fuerte)',
    padding: '11px 22px', borderRadius: 4, fontSize: 13, fontWeight: 600,
    textDecoration: 'none', display: 'inline-block',
  },
};
