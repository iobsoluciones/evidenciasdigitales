'use client';

/**
 * CONTRATISTAS — listado y alta
 * ---------------------------------------------------------------
 * Lo primero de la lista no es el nombre: es si le faltan soportes o si
 * los que entregó ya vencieron. Un contratista aprobado en enero con la
 * planilla de aportes de enero no está al día en agosto.
 */
import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  crearContratista, type ContratistaResumen, type Concepto,
} from '@/lib/acciones-contratistas';

const CONCEPTOS: Record<Concepto, { t: string; fondo: string; color: string }> = {
  sin_evaluar: { t: 'Sin evaluar', fondo: 'var(--superficie-3)', color: 'var(--texto-suave)' },
  aprobado: { t: 'Aprobado', fondo: 'var(--bien-fondo)', color: 'var(--bien)' },
  aprobado_con_condiciones: { t: 'Con condiciones', fondo: 'var(--ambar-fondo)', color: 'var(--aviso)' },
  rechazado: { t: 'Rechazado', fondo: 'var(--mal-fondo)', color: 'var(--mal)' },
};

/** Clases de riesgo del Dec. 1607 de 2002, en números romanos. */
const RIESGOS = [
  { v: 1, t: 'I — mínimo' },
  { v: 2, t: 'II — bajo' },
  { v: 3, t: 'III — medio' },
  { v: 4, t: 'IV — alto' },
  { v: 5, t: 'V — máximo' },
];

const VACIO = {
  nombre: '', objeto: '', nit: '', arl: '',
  claseRiesgo: null as number | null, inicio: '', fin: '',
};

export default function VistaContratistas({
  lista,
  color,
}: {
  lista: ContratistaResumen[];
  color: string;
}) {
  const router = useRouter();
  const [pendiente, startTransition] = useTransition();
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);
  const [nuevo, setNuevo] = useState<typeof VACIO | null>(null);

  useEffect(() => {
    if (aviso?.tipo !== 'ok') return;
    const t = setTimeout(() => setAviso(null), 2600);
    return () => clearTimeout(t);
  }, [aviso]);

  function crear() {
    if (!nuevo) return;
    setAviso(null);
    startTransition(async () => {
      const r = await crearContratista(nuevo);
      if (!r.ok) { setAviso({ tipo: 'error', texto: r.mensaje }); return; }
      setNuevo(null);
      router.push(`/panel/contratistas/${r.id}`);
    });
  }

  const activos = lista.filter((x) => x.estado === 'activo');
  const conFaltantes = activos.filter((x) => x.pendientes > 0 || x.vencidos > 0).length;

  return (
    <>
      {aviso && (
        <div role="status" aria-live="polite" style={{
          ...s.aviso,
          background: aviso.tipo === 'ok' ? 'var(--bien-fondo)' : 'var(--mal-fondo)',
          color: aviso.tipo === 'ok' ? 'var(--bien)' : 'var(--mal)',
          border: `1px solid ${aviso.tipo === 'ok' ? '#BFE3CB' : '#F3C7C7'}`,
        }}>{aviso.texto}</div>
      )}

      {activos.length > 0 && (
        <div style={s.resumen}>
          <div style={{ ...s.tarjeta, border: '1px solid var(--borde)', background: 'var(--superficie)' }}>
            <span style={{ ...s.tarjetaN, color }}>{activos.length}</span>
            <span style={s.tarjetaT}>Contratistas activos</span>
          </div>
          <div style={{
            ...s.tarjeta,
            background: conFaltantes > 0 ? 'var(--mal-fondo)' : 'var(--bien-fondo)',
          }}>
            <span style={{
              ...s.tarjetaN,
              color: conFaltantes > 0 ? 'var(--mal)' : 'var(--bien)',
            }}>{conFaltantes}</span>
            <span style={{
              ...s.tarjetaT,
              color: conFaltantes > 0 ? 'var(--mal)' : 'var(--bien)',
            }}>
              Con soportes faltantes o vencidos
            </span>
          </div>
          <div style={{ ...s.tarjeta, border: '1px solid var(--borde)', background: 'var(--superficie)' }}>
            <span style={s.tarjetaN}>
              {activos.reduce((n, x) => n + x.personas, 0)}
            </span>
            <span style={s.tarjetaT}>Personas de contratistas en planta</span>
          </div>
        </div>
      )}

      <div style={s.barra}>
        {!nuevo ? (
          <button type="button" style={{ ...s.botonLleno, background: color }}
            onClick={() => setNuevo({ ...VACIO })}>
            Registrar un contratista
          </button>
        ) : (
          <div style={s.bloque}>
            <div style={s.h3}>Nuevo contratista</div>
            <div style={s.fila}>
              <Campo etiqueta="Razón social" ancho={240}>
                <input value={nuevo.nombre} style={s.input}
                  onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })} />
              </Campo>
              <Campo etiqueta="NIT" ancho={150}>
                <input value={nuevo.nit} style={s.input}
                  onChange={(e) => setNuevo({ ...nuevo, nit: e.target.value })} />
              </Campo>
              <Campo etiqueta="ARL" ancho={150}>
                <input value={nuevo.arl} style={s.input}
                  onChange={(e) => setNuevo({ ...nuevo, arl: e.target.value })} />
              </Campo>
              <Campo etiqueta="Clase de riesgo" ancho={140}>
                <select value={nuevo.claseRiesgo ?? ''} style={s.input}
                  onChange={(e) => setNuevo({
                    ...nuevo, claseRiesgo: e.target.value ? Number(e.target.value) : null,
                  })}>
                  <option value="">—</option>
                  {RIESGOS.map((r) => (
                    <option key={r.v} value={r.v}>{r.t}</option>
                  ))}
                </select>
              </Campo>
            </div>
            <Campo etiqueta="Qué se contrató" ancho={9999}>
              <input value={nuevo.objeto} style={s.input}
                placeholder="Mantenimiento de cubiertas y canales"
                onChange={(e) => setNuevo({ ...nuevo, objeto: e.target.value })} />
            </Campo>
            <div style={s.fila}>
              <Campo etiqueta="Inicio del contrato" ancho={170}>
                <input type="date" value={nuevo.inicio} style={s.input}
                  onChange={(e) => setNuevo({ ...nuevo, inicio: e.target.value })} />
              </Campo>
              <Campo etiqueta="Fin del contrato" ancho={170}>
                <input type="date" value={nuevo.fin} style={s.input}
                  onChange={(e) => setNuevo({ ...nuevo, fin: e.target.value })} />
              </Campo>
            </div>
            <p style={s.ayuda}>
              Al crearlo se copia la lista de soportes que hay que exigirle.
            </p>
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
            No hay contratistas registrados. El estándar 2.6.1 pide criterios de
            SST en la selección y la evaluación de contratistas, y el Decreto
            1072 obliga a verificar su afiliación al sistema de riesgos
            laborales antes de que entren.
          </p>
        </div>
      ) : (
        <div style={s.contenedor}>
          <table style={s.tabla}>
            <thead>
              <tr>
                <th style={{ ...s.th, textAlign: 'left' }}>Contratista</th>
                <th style={s.th}>Personas</th>
                <th style={s.th}>Soportes</th>
                <th style={s.th}>Concepto</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((x) => {
                const c = CONCEPTOS[x.concepto];
                return (
                  <tr key={x.id}>
                    <td style={s.tdNombre}>
                      <a href={`/panel/contratistas/${x.id}`} style={s.enlace}>
                        {x.nombre}
                      </a>
                      <div style={s.meta}>{x.objeto}</div>
                      <div style={s.meta}>
                        {x.nit ? `NIT ${x.nit} · ` : ''}
                        {x.arl ?? 'sin ARL registrada'}
                        {x.clase_riesgo ? ` · riesgo ${x.clase_riesgo}` : ''}
                      </div>
                      {x.estado !== 'activo' && (
                        <span style={{ ...s.chip, background: 'var(--superficie-3)', color: 'var(--texto-suave)' }}>
                          {x.estado === 'terminado' ? 'Terminado' : 'Suspendido'}
                        </span>
                      )}
                      {x.contrato_vencido && x.estado === 'activo' && (
                        <span style={{ ...s.chip, background: 'var(--ambar-fondo)', color: 'var(--aviso)' }}>
                          Contrato vencido
                        </span>
                      )}
                    </td>
                    <td style={{ ...s.td, textAlign: 'center' }}>{x.personas}</td>
                    <td style={{ ...s.td, textAlign: 'center' }}>
                      {x.pendientes === 0 && x.vencidos === 0 ? (
                        <span style={{ ...s.chip, background: 'var(--bien-fondo)', color: 'var(--bien)' }}>
                          Al día
                        </span>
                      ) : (
                        <>
                          {x.pendientes > 0 && (
                            <div style={{ ...s.chip, background: 'var(--mal-fondo)', color: 'var(--mal)' }}>
                              {x.pendientes} sin entregar
                            </div>
                          )}
                          {x.vencidos > 0 && (
                            <div style={{
                              ...s.chip, background: 'var(--ambar-fondo)',
                              color: 'var(--aviso)', marginTop: 3,
                            }}>
                              {x.vencidos} vencido(s)
                            </div>
                          )}
                        </>
                      )}
                    </td>
                    <td style={{ ...s.td, textAlign: 'center' }}>
                      <span style={{ ...s.chip, background: c.fondo, color: c.color }}>
                        {c.t}
                      </span>
                    </td>
                  </tr>
                );
              })}
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
    padding: '11px 15px', borderRadius: 8, fontSize: 13,
    boxShadow: '0 6px 20px rgba(20,38,63,.16)',
  },
  resumen: {
    display: 'grid', gap: 10, marginBottom: 14,
    gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))',
  },
  tarjeta: {
    borderRadius: 8, padding: '12px 14px',
    display: 'flex', flexDirection: 'column', gap: 2,
  },
  tarjetaN: {
    fontSize: 22, fontWeight: 700, lineHeight: 1.1,
    color: 'var(--texto)', fontVariantNumeric: 'tabular-nums',
  },
  tarjetaT: { fontSize: 11.5, color: 'var(--texto-suave)' },

  barra: { display: 'flex', marginBottom: 16 },
  bloque: {
    background: 'var(--superficie)', border: '1px solid var(--borde)', borderRadius: 12,
    padding: '15px 17px', marginBottom: 14, width: '100%',
  },
  h3: { fontSize: 14, fontWeight: 700, color: 'var(--texto)', marginBottom: 10 },
  nota: { fontSize: 13, color: 'var(--texto-suave)', lineHeight: 1.65, margin: 0, maxWidth: 660 },
  fila: { display: 'flex', gap: 12, flexWrap: 'wrap' },
  label: { display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5, color: 'var(--texto)' },
  input: {
    width: '100%', padding: '8px 11px', border: '1px solid var(--borde)',
    borderRadius: 8, fontSize: 13, boxSizing: 'border-box',
    fontFamily: 'inherit', background: 'var(--superficie)', color: 'var(--texto)',
  },
  ayuda: { fontSize: 11.5, color: 'var(--texto-tenue)', margin: '2px 0 0', lineHeight: 1.5 },

  contenedor: {
    background: 'var(--superficie)', border: '1px solid var(--borde)',
    borderRadius: 12, overflowX: 'auto',
  },
  tabla: { width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 680 },
  th: {
    textAlign: 'center', padding: '10px', background: 'var(--fondo)', color: 'var(--texto-suave)',
    fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: .4,
    borderBottom: '1px solid var(--borde)', whiteSpace: 'nowrap',
  },
  td: { padding: '10px', borderBottom: '1px solid var(--superficie-3)', verticalAlign: 'top' },
  tdNombre: { padding: '10px 12px', borderBottom: '1px solid var(--superficie-3)', minWidth: 260 },
  enlace: { fontSize: 13, fontWeight: 700, color: 'var(--texto)' },
  meta: { fontSize: 11, color: 'var(--texto-tenue)', marginTop: 2, lineHeight: 1.4 },
  chip: {
    fontSize: 10.5, fontWeight: 700, padding: '3px 10px',
    borderRadius: 20, whiteSpace: 'nowrap', display: 'inline-block', marginTop: 3,
  },

  acciones: { display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 10 },
  botonPlano: {
    background: 'none', border: 'none', color: 'var(--texto-suave)',
    fontSize: 12.5, fontWeight: 600, cursor: 'pointer', padding: '8px 12px',
  },
  botonLleno: {
    color: 'var(--sobre-marca)', border: 'none', padding: '9px 20px', borderRadius: 8,
    fontSize: 13, fontWeight: 600, cursor: 'pointer',
  },
};
