'use client';

/**
 * EDITOR DE MEMBRETE
 * ---------------------------------------------------------------
 * Título, nomenclatura, versión y color de la empresa. Se edita aquí
 * mismo en vez de mandar al formulario completo, porque la versión es
 * el dato que más cambia: cada revisión del sistema de gestión la
 * incrementa.
 */
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { guardarConfiguracionEmpresa } from '@/lib/acciones-empresas';

export default function EditorMembrete({
  empresaId,
  titulo,
  nomenclatura,
  version,
  color,
  esAdmin,
}: {
  empresaId: string;
  titulo: string;
  nomenclatura: string;
  version: string;
  color: string;
  esAdmin: boolean;
}) {
  const router = useRouter();
  const [pendiente, startTransition] = useTransition();
  const [editando, setEditando] = useState(false);
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  const [f, setF] = useState({
    titulo_doc: titulo,
    nomenclatura,
    version_doc: version,
    color_primario: color,
  });

  function guardar() {
    startTransition(async () => {
      const r = await guardarConfiguracionEmpresa(empresaId, f);
      setAviso({ tipo: r.ok ? 'ok' : 'error', texto: r.mensaje });
      if (r.ok) {
        setEditando(false);
        router.refresh();
      }
    });
  }

  function cancelar() {
    setF({ titulo_doc: titulo, nomenclatura, version_doc: version, color_primario: color });
    setEditando(false);
    setAviso(null);
  }

  return (
    <section style={e.card}>
      <div style={e.cabecera}>
        <h2 style={e.h2}>Membrete</h2>
        {esAdmin && !editando && (
          <button onClick={() => setEditando(true)} style={e.btnEditar}>Editar</button>
        )}
      </div>

      {!editando ? (
        <dl style={{ margin: 0 }}>
          <Fila k="Título del documento" v={f.titulo_doc} />
          <Fila k="Nomenclatura" v={f.nomenclatura || 'Sin definir'} mono />
          <Fila k="Versión" v={f.version_doc} mono />
          <Fila k="Color de marca" v={f.color_primario} color={f.color_primario} mono />
        </dl>
      ) : (
        <>
          <label style={e.label}>Título del documento</label>
          <input
            value={f.titulo_doc}
            onChange={(ev) => setF({ ...f, titulo_doc: ev.target.value.toUpperCase() })}
            style={{ ...e.input, textTransform: 'uppercase' }}
          />

          <div style={e.dos}>
            <div>
              <label style={e.label}>Nomenclatura</label>
              <input
                value={f.nomenclatura}
                placeholder="SST-CAP-001"
                onChange={(ev) => setF({ ...f, nomenclatura: ev.target.value.toUpperCase() })}
                style={{ ...e.input, textTransform: 'uppercase', fontFamily: 'ui-monospace,monospace' }}
              />
            </div>
            <div>
              <label style={e.label}>Versión</label>
              <input
                value={f.version_doc}
                placeholder="V1"
                onChange={(ev) => setF({ ...f, version_doc: ev.target.value.toUpperCase() })}
                style={{ ...e.input, textTransform: 'uppercase', fontFamily: 'ui-monospace,monospace' }}
              />
            </div>
          </div>

          <label style={e.label}>Color de marca</label>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <input
              type="color"
              value={f.color_primario}
              onChange={(ev) => setF({ ...f, color_primario: ev.target.value })}
              style={{ width: 46, height: 34, padding: 2, border: '1px solid var(--borde-fuerte)', borderRadius: 4 }}
            />
            <input
              value={f.color_primario}
              onChange={(ev) => setF({ ...f, color_primario: ev.target.value })}
              style={{ ...e.input, maxWidth: 120, fontFamily: 'ui-monospace,monospace' }}
            />
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
            <button onClick={guardar} disabled={pendiente}
              style={{ ...e.btn, background: pendiente ? 'var(--borde-fuerte)' : f.color_primario }}>
              {pendiente ? 'Guardando…' : 'Guardar membrete'}
            </button>
            <button onClick={cancelar} style={e.btnSec}>Cancelar</button>
          </div>
        </>
      )}

      {aviso && (
        <div style={{
          ...e.aviso,
          background: aviso.tipo === 'ok' ? 'var(--bien-fondo)' : 'var(--mal-fondo)',
          color: aviso.tipo === 'ok' ? 'var(--bien)' : 'var(--mal)',
        }}>
          {aviso.texto}
        </div>
      )}

      <p style={e.legal}>
        Al subir la versión, las actas ya emitidas conservan la suya. El
        cambio aplica a las capacitaciones nuevas.
      </p>
    </section>
  );
}

function Fila({ k, v, mono, color }: { k: string; v: string; mono?: boolean; color?: string }) {
  return (
    <div style={e.fila}>
      <dt style={e.clave}>{k}</dt>
      <dd style={{
        ...e.valor,
        fontFamily: mono ? 'ui-monospace,SFMono-Regular,Menlo,monospace' : 'inherit',
        fontSize: mono ? 12 : 13,
        display: 'flex', alignItems: 'center', gap: 7, justifyContent: 'flex-end',
      }}>
        {color && <span style={{ width: 11, height: 11, borderRadius: 2, background: 'var(--marca)', display: 'inline-block' }} />}
        {v}
      </dd>
    </div>
  );
}

const e: Record<string, React.CSSProperties> = {
  card: {
    background: 'var(--superficie)', border: '1px solid var(--borde)', borderRadius: 8,
    padding: 22, marginBottom: 0,
  },
  cabecera: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  h2: { fontSize: 14.5, margin: 0, fontWeight: 600 },
  btnEditar: {
    background: 'var(--superficie)', border: '1px solid var(--borde-fuerte)', color: 'var(--texto)',
    padding: '6px 14px', borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: 'pointer',
  },
  fila: {
    display: 'flex', justifyContent: 'space-between', gap: 12,
    padding: '8px 0', borderBottom: '1px solid var(--superficie-3)', fontSize: 13,
  },
  clave: { color: 'var(--texto-tenue)', margin: 0 },
  valor: { margin: 0, fontWeight: 600, textAlign: 'right', color: 'var(--texto)' },
  label: { display: 'block', fontSize: 12, fontWeight: 600, margin: '12px 0 5px' },
  input: {
    width: '100%', padding: '9px 11px', border: '1px solid var(--borde-fuerte)',
    borderRadius: 4, fontSize: 13, boxSizing: 'border-box', fontFamily: 'inherit',
  },
  dos: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 14 },
  btn: { color: 'var(--sobre-marca)', border: 'none', padding: '10px 20px', borderRadius: 4, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  btnSec: { background: 'var(--superficie)', color: 'var(--texto)', border: '1px solid var(--borde-fuerte)', padding: '10px 20px', borderRadius: 4, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  aviso: { marginTop: 14, padding: '10px 14px', borderRadius: 6, fontSize: 13 },
  legal: { fontSize: 11, color: 'var(--texto-tenue)', marginTop: 14, lineHeight: 1.5 },
};
