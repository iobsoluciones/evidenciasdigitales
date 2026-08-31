'use client';

/**
 * RENDICIÓN DE CUENTAS — listado y creación
 * Una por año: la norma la pide anual, y dos actas del mismo año no
 * significan nada. La base lo impide con una restricción única.
 */
import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { crearRendicion, type RendicionResumen } from '@/lib/acciones-rendicion';

export default function VistaRendiciones({
  lista,
  color,
}: {
  lista: RendicionResumen[];
  color: string;
}) {
  const router = useRouter();
  const [pendiente, startTransition] = useTransition();
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);
  const [nuevo, setNuevo] = useState<{ anio: number; fecha: string } | null>(null);

  useEffect(() => {
    if (aviso?.tipo !== 'ok') return;
    const t = setTimeout(() => setAviso(null), 2600);
    return () => clearTimeout(t);
  }, [aviso]);

  function crear() {
    if (!nuevo) return;
    setAviso(null);
    startTransition(async () => {
      const r = await crearRendicion(nuevo.anio, nuevo.fecha);
      if (!r.ok) { setAviso({ tipo: 'error', texto: r.mensaje }); return; }
      setNuevo(null);
      router.push(`/panel/rendicion/${r.id}`);
    });
  }

  const actual = new Date().getFullYear();

  return (
    <>
      {aviso && (
        <div role="status" aria-live="polite" style={{
          ...s.aviso,
          background: aviso.tipo === 'ok' ? '#E6F4EA' : '#FDF2F2',
          color: aviso.tipo === 'ok' ? '#1E6B3A' : '#9B1C1C',
          border: `1px solid ${aviso.tipo === 'ok' ? '#BFE3CB' : '#F3C7C7'}`,
        }}>{aviso.texto}</div>
      )}

      <div style={s.barra}>
        {!nuevo ? (
          <button type="button" style={{ ...s.botonLleno, background: color }}
            onClick={() => setNuevo({
              anio: actual,
              fecha: new Date().toISOString().slice(0, 10),
            })}>
            Abrir la rendición del año
          </button>
        ) : (
          <div style={s.bloque}>
            <div style={s.h3}>Nueva rendición de cuentas</div>
            <div style={s.fila}>
              <Campo etiqueta="Año que se rinde" ancho={150}>
                <select value={nuevo.anio} style={s.input}
                  onChange={(e) => setNuevo({ ...nuevo, anio: Number(e.target.value) })}>
                  {[actual, actual - 1, actual - 2].map((a) => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </Campo>
              <Campo etiqueta="Fecha del acta" ancho={170}>
                <input type="date" value={nuevo.fecha} style={s.input}
                  onChange={(e) => setNuevo({ ...nuevo, fecha: e.target.value })} />
              </Campo>
            </div>
            <div style={s.acciones}>
              <button type="button" style={s.botonPlano} onClick={() => setNuevo(null)}>
                Cancelar
              </button>
              <button type="button" disabled={pendiente}
                style={{ ...s.botonLleno, background: color }} onClick={crear}>
                {pendiente ? 'Creando…' : 'Crear'}
              </button>
            </div>
          </div>
        )}
      </div>

      {lista.length === 0 ? (
        <div style={s.bloque}>
          <p style={s.nota}>
            No hay rendiciones registradas. El estándar 2.8.1 la pide una vez al
            año, por escrito, de cada quien tenga responsabilidades asignadas en
            el SG-SST: el empleador, el responsable del sistema, los jefes de
            área y el COPASST.
          </p>
        </div>
      ) : (
        <div style={s.contenedor}>
          <table style={s.tabla}>
            <thead>
              <tr>
                <th style={{ ...s.th, textAlign: 'left' }}>Acta</th>
                <th style={s.th}>Responsables</th>
                <th style={s.th}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((x) => (
                <tr key={x.id}>
                  <td style={s.tdNombre}>
                    <a href={`/panel/rendicion/${x.id}`} style={s.enlace}>
                      {x.codigo} · rendición de {x.anio}
                    </a>
                    <div style={s.meta}>
                      {new Date(x.fecha + 'T12:00:00').toLocaleDateString('es-CO', {
                        day: '2-digit', month: 'long', year: 'numeric',
                      })}
                    </div>
                  </td>
                  <td style={{ ...s.td, textAlign: 'center' }}>{x.responsables}</td>
                  <td style={{ ...s.td, textAlign: 'center' }}>
                    {x.estado === 'cerrada' ? (
                      <span style={{ ...s.chip, background: '#E6F4EA', color: '#1E6B3A' }}>
                        Cerrada
                      </span>
                    ) : (
                      <span style={{ ...s.chip, background: '#FEF3C7', color: '#92400E' }}>
                        {x.sin_informe > 0
                          ? `${x.sin_informe} sin escribir`
                          : x.sin_firmar > 0
                            ? `${x.sin_firmar} sin firmar`
                            : 'Lista para cerrar'}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function Campo({
  etiqueta, ancho = 170, children,
}: {
  etiqueta: string; ancho?: number; children: React.ReactNode;
}) {
  return (
    <div style={{ flex: `1 1 ${ancho}px`, marginBottom: 10 }}>
      <label style={s.label}>{etiqueta}</label>
      {children}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  aviso: {
    position: 'fixed', right: 18, bottom: 18, zIndex: 60, maxWidth: 340,
    padding: '11px 15px', borderRadius: 9, fontSize: 13,
    boxShadow: '0 6px 20px rgba(20,38,63,.16)',
  },
  barra: { display: 'flex', marginBottom: 16 },
  bloque: {
    background: '#fff', border: '1px solid #E4E4DF', borderRadius: 12,
    padding: '15px 17px', marginBottom: 14, width: '100%',
  },
  h3: { fontSize: 14, fontWeight: 700, color: '#14263F', marginBottom: 10 },
  nota: { fontSize: 13, color: '#5B6470', lineHeight: 1.65, margin: 0, maxWidth: 660 },
  fila: { display: 'flex', gap: 12, flexWrap: 'wrap' },
  label: { display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5, color: '#14263F' },
  input: {
    width: '100%', padding: '8px 11px', border: '1px solid #E4E4DF',
    borderRadius: 8, fontSize: 13, boxSizing: 'border-box',
    fontFamily: 'inherit', background: '#fff', color: '#14263F',
  },

  contenedor: {
    background: '#fff', border: '1px solid #E4E4DF',
    borderRadius: 12, overflowX: 'auto',
  },
  tabla: { width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 520 },
  th: {
    textAlign: 'center', padding: '10px', background: '#F7F7F4', color: '#5B6470',
    fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: .4,
    borderBottom: '1px solid #E4E4DF', whiteSpace: 'nowrap',
  },
  td: { padding: '10px', borderBottom: '1px solid #F0F0EC' },
  tdNombre: { padding: '10px 12px', borderBottom: '1px solid #F0F0EC', minWidth: 240 },
  enlace: { fontSize: 13, fontWeight: 600, color: '#14263F' },
  meta: { fontSize: 11, color: '#8A929C', marginTop: 2 },
  chip: {
    fontSize: 10.5, fontWeight: 700, padding: '3px 10px',
    borderRadius: 20, whiteSpace: 'nowrap',
  },

  acciones: { display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 10 },
  botonPlano: {
    background: 'none', border: 'none', color: '#5B6470',
    fontSize: 12.5, fontWeight: 600, cursor: 'pointer', padding: '8px 12px',
  },
  botonLleno: {
    color: '#fff', border: 'none', padding: '9px 20px', borderRadius: 8,
    fontSize: 13, fontWeight: 600, cursor: 'pointer',
  },
};
