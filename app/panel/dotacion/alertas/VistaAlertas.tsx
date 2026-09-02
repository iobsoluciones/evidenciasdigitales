'use client';

/**
 * ALERTAS DE DOTACIÓN
 * ---------------------------------------------------------------
 * Reúne en un solo lugar todo lo que requiere acción. Sin esto habría
 * que revisar cuatro pantallas para saber qué hacer esta semana.
 *
 * El orden no es casual: primero lo que expone a la empresa
 * legalmente (EPP vencido), después lo patrimonial, y al final lo
 * logístico.
 */
import { useState } from 'react';
import Link from 'next/link';
import type { Alertas } from '@/lib/acciones-devoluciones';

const PERIODOS = [30, 60, 90];

export default function VistaAlertas({
  alertas,
  dias,
  color,
}: {
  alertas: Alertas;
  dias: number;
  color: string;
}) {
  const [seccion, setSeccion] = useState<string | null>(null);

  const fmt = (iso: string) =>
    new Date(iso.length <= 10 ? iso + 'T12:00:00' : iso)
      .toLocaleDateString('es-CO', { dateStyle: 'medium' });

  const total =
    alertas.porVencer.length + alertas.bajoMinimo.length +
    alertas.deRetirados.length + alertas.garantias.length;

  // EPP ya vencido: no es una advertencia, es un incumplimiento
  const vencidos = alertas.porVencer.filter((x) => x.dias < 0);

  return (
    <>
      <div style={e.periodo}>
        <span style={e.etiquetaPeriodo}>Anticipación:</span>
        {PERIODOS.map((d) => (
          <Link
            key={d}
            href={`/panel/dotacion/alertas?dias=${d}`}
            style={{
              ...e.botonPeriodo,
              background: dias === d ? 'var(--marca)' : 'var(--superficie)',
              color: dias === d ? 'var(--sobre-marca)' : 'var(--texto-suave)',
              borderColor: dias === d ? 'var(--marca)' : 'var(--borde-fuerte)',
            }}
          >
            {d} días
          </Link>
        ))}

        <span style={e.resumenTotales}>
          {alertas.totales.enUso} equipo(s) en uso · {alertas.totales.devueltos} devuelto(s)
        </span>
      </div>

      {total === 0 ? (
        <div style={e.sinAlertas}>
          <div style={{ fontSize: 30, marginBottom: 8 }}>✓</div>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--bien)' }}>
            Nada requiere atención
          </p>
          <p style={{ margin: '6px 0 0', fontSize: 12.5, color: 'var(--texto-tenue)' }}>
            Sin vencimientos próximos, existencias bajo mínimo ni equipos sin devolver.
          </p>
        </div>
      ) : (
        <>
          {vencidos.length > 0 && (
            <div style={e.critico}>
              <strong>{vencidos.length} elemento(s) de protección ya vencieron.</strong>{' '}
              Un EPP vencido en uso es un incumplimiento, no una advertencia:
              reponerlo es lo primero.
            </div>
          )}

          <div style={e.resumen}>
            <Contador
              n={alertas.porVencer.length}
              t="Por vencer"
              activo={seccion === 'vencer'}
              onClick={() => setSeccion(seccion === 'vencer' ? null : 'vencer')}
              color={alertas.porVencer.length > 0 ? 'var(--ambar)' : 'var(--texto-tenue)'}
            />
            <Contador
              n={alertas.bajoMinimo.length}
              t="Bajo mínimo"
              activo={seccion === 'stock'}
              onClick={() => setSeccion(seccion === 'stock' ? null : 'stock')}
              color={alertas.bajoMinimo.length > 0 ? 'var(--mal)' : 'var(--texto-tenue)'}
            />
            <Contador
              n={alertas.deRetirados.length}
              t="De retirados"
              activo={seccion === 'retirados'}
              onClick={() => setSeccion(seccion === 'retirados' ? null : 'retirados')}
              color={alertas.deRetirados.length > 0 ? 'var(--mal)' : 'var(--texto-tenue)'}
            />
            <Contador
              n={alertas.garantias.length}
              t="Garantías"
              activo={seccion === 'garantias'}
              onClick={() => setSeccion(seccion === 'garantias' ? null : 'garantias')}
              color={alertas.garantias.length > 0 ? 'var(--info)' : 'var(--texto-tenue)'}
            />
          </div>

          {/* ---------- EPP por vencer ---------- */}
          {(seccion === null || seccion === 'vencer') && alertas.porVencer.length > 0 && (
            <section style={e.card}>
              <h2 style={e.h2}>Elementos por vencer ({alertas.porVencer.length})</h2>
              <p style={e.sub}>
                Ordenados por urgencia. Prepara la reposición antes de la fecha.
              </p>

              <div style={e.contenedor}>
                <table style={e.tabla}>
                  <thead>
                    <tr>
                      {['Persona', 'Área', 'Elemento', 'Cant.', 'Vence', 'Faltan'].map((h) => (
                        <th key={h} style={e.th}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {alertas.porVencer.map((x) => (
                      <tr key={x.id}>
                        <td style={e.td}>
                          <strong>{x.nombres}</strong>
                          <div style={e.mono}>{x.identificacion}</div>
                        </td>
                        <td style={{ ...e.td, color: 'var(--texto-suave)' }}>{x.area ?? '—'}</td>
                        <td style={e.td}>
                          {x.articulo}
                          {x.talla && <span style={e.talla}> · talla {x.talla}</span>}
                        </td>
                        <td style={e.td}>{x.cantidad}</td>
                        <td style={e.td}>{fmt(x.fecha_vence)}</td>
                        <td style={e.td}>
                          <span style={{
                            ...e.chip,
                            background: x.dias < 0 ? 'var(--mal-fondo)' : x.dias <= 30 ? 'var(--ambar-fondo)' : 'var(--superficie-3)',
                            color: x.dias < 0 ? 'var(--mal)' : x.dias <= 30 ? 'var(--ambar)' : 'var(--texto-suave)',
                          }}>
                            {x.dias < 0 ? `Vencido hace ${Math.abs(x.dias)} d` : `${x.dias} días`}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* ---------- Bajo mínimo ---------- */}
          {(seccion === null || seccion === 'stock') && alertas.bajoMinimo.length > 0 && (
            <section style={e.card}>
              <h2 style={e.h2}>Existencias bajo mínimo ({alertas.bajoMinimo.length})</h2>
              <p style={e.sub}>Qué comprar esta semana.</p>

              <div style={e.contenedor}>
                <table style={e.tabla}>
                  <thead>
                    <tr>
                      {['Código', 'Elemento', 'Categoría', 'Existencia', 'Mínimo', ''].map((h) => (
                        <th key={h} style={e.th}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {alertas.bajoMinimo.map((x) => (
                      <tr key={x.id}>
                        <td style={{ ...e.td, ...e.mono }}>{x.codigo}</td>
                        <td style={e.td}><strong>{x.nombre}</strong></td>
                        <td style={{ ...e.td, color: 'var(--texto-suave)' }}>{x.categoria ?? '—'}</td>
                        <td style={{ ...e.td, fontWeight: 700, color: 'var(--mal)' }}>
                          {x.existencia} {x.unidad.toLowerCase()}
                        </td>
                        <td style={{ ...e.td, color: 'var(--texto-tenue)' }}>{x.stock_minimo}</td>
                        <td style={e.td}>
                          <Link href={`/panel/dotacion/${x.id}`} style={e.enlace}>
                            Registrar ingreso
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* ---------- De personas retiradas ---------- */}
          {(seccion === null || seccion === 'retirados') && alertas.deRetirados.length > 0 && (
            <section style={{ ...e.card, borderLeftWidth: 3, borderLeftColor: 'var(--mal)' }}>
              <h2 style={e.h2}>Equipos de personas retiradas ({alertas.deRetirados.length})</h2>
              <p style={e.sub}>
                Están asignados a alguien que ya no aparece activo en la nómina.
                Es el hallazgo típico de una auditoría de activos.
              </p>

              <div style={e.contenedor}>
                <table style={e.tabla}>
                  <thead>
                    <tr>
                      {['Persona', 'Equipo', 'Placa', 'Valor', 'Desde', 'Días'].map((h) => (
                        <th key={h} style={e.th}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {alertas.deRetirados.map((x) => (
                      <tr key={x.id}>
                        <td style={e.td}>
                          <strong>{x.nombres}</strong>
                          <div style={e.mono}>{x.identificacion}</div>
                        </td>
                        <td style={e.td}>{x.articulo}</td>
                        <td style={{ ...e.td, ...e.mono }}>{x.placa}</td>
                        <td style={e.td}>
                          {x.valor ? `$${Number(x.valor).toLocaleString('es-CO')}` : '—'}
                        </td>
                        <td style={e.td}>{fmt(x.fecha_entrega)}</td>
                        <td style={{ ...e.td, color: 'var(--mal)', fontWeight: 600 }}>{x.dias}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <Link href="/panel/dotacion/devoluciones" style={{ ...e.btn, background: 'var(--marca)' }}>
                Ir a devoluciones
              </Link>
            </section>
          )}

          {/* ---------- Garantías ---------- */}
          {(seccion === null || seccion === 'garantias') && alertas.garantias.length > 0 && (
            <section style={e.card}>
              <h2 style={e.h2}>Garantías por expirar ({alertas.garantias.length})</h2>
              <p style={e.sub}>
                Si algún equipo tiene falla pendiente, es el momento de reclamar.
              </p>

              <div style={e.contenedor}>
                <table style={e.tabla}>
                  <thead>
                    <tr>
                      {['Placa', 'Equipo', 'Expira', 'Faltan'].map((h) => (
                        <th key={h} style={e.th}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {alertas.garantias.map((x, i) => (
                      <tr key={i}>
                        <td style={{ ...e.td, ...e.mono }}>{x.placa}</td>
                        <td style={e.td}>{x.articulo}</td>
                        <td style={e.td}>{fmt(x.garantia_hasta)}</td>
                        <td style={e.td}>
                          <span style={{
                            ...e.chip,
                            background: x.dias < 0 ? 'var(--superficie-3)' : 'var(--info-fondo)',
                            color: x.dias < 0 ? 'var(--texto-tenue)' : 'var(--info)',
                          }}>
                            {x.dias < 0 ? 'Expirada' : `${x.dias} días`}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}
    </>
  );
}

function Contador({
  n, t, activo, onClick, color,
}: {
  n: number; t: string; activo: boolean; onClick: () => void; color: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={n === 0}
      style={{
        ...e.contador,
        borderColor: activo ? 'var(--marca)' : 'var(--borde)',
        background: activo ? color + '10' : 'var(--superficie)',
        cursor: n === 0 ? 'default' : 'pointer',
        opacity: n === 0 ? 0.55 : 1,
      }}
    >
      <div style={{ fontSize: 22, fontWeight: 700, color }}>{n}</div>
      <div style={e.contadorTexto}>{t}</div>
    </button>
  );
}

const e: Record<string, React.CSSProperties> = {
  periodo: { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 18 },
  etiquetaPeriodo: { fontSize: 12, color: 'var(--texto-tenue)' },
  botonPeriodo: {
    padding: '6px 14px', borderRadius: 4, fontSize: 12.5, fontWeight: 600,
    textDecoration: 'none', borderWidth: 1, borderStyle: 'solid',
  },
  resumenTotales: { fontSize: 12, color: 'var(--texto-tenue)', marginLeft: 'auto' },

  critico: {
    background: 'var(--mal-fondo)', color: 'var(--mal)', padding: '13px 16px',
    borderRadius: 6, fontSize: 12.5, marginBottom: 16, lineHeight: 1.6,
  },

  resumen: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))',
    gap: 12, marginBottom: 20,
  },
  contador: {
    borderWidth: 1.5, borderStyle: 'solid', borderRadius: 8,
    padding: '14px 10px', textAlign: 'center', fontFamily: 'inherit',
  },
  contadorTexto: {
    fontSize: 10.5, color: 'var(--texto-tenue)', textTransform: 'uppercase',
    letterSpacing: .3, marginTop: 2,
  },

  card: {
    background: 'var(--superficie)', borderWidth: 1, borderStyle: 'solid', borderColor: 'var(--borde)',
    borderRadius: 8, padding: 20, marginBottom: 16,
  },
  h2: { fontSize: 14.5, margin: '0 0 4px', fontWeight: 600 },
  sub: { fontSize: 12, color: 'var(--texto-suave)', margin: '0 0 14px', lineHeight: 1.55, maxWidth: 620 },

  contenedor: { overflowX: 'auto' },
  tabla: { width: '100%', borderCollapse: 'collapse', fontSize: 12.5 },
  th: {
    background: 'var(--fondo)', color: 'var(--texto-tenue)', fontSize: 10.5, textTransform: 'uppercase',
    padding: '9px 10px', textAlign: 'left', borderBottom: '1px solid var(--borde)',
    whiteSpace: 'nowrap',
  },
  td: { padding: '9px 10px', borderBottom: '1px solid var(--superficie-3)', verticalAlign: 'top' },
  mono: {
    fontFamily: 'ui-monospace,SFMono-Regular,Menlo,monospace',
    fontSize: 10.5, color: 'var(--texto-tenue)',
  },
  talla: { fontSize: 11, color: 'var(--texto-tenue)' },
  chip: { fontSize: 10.5, fontWeight: 600, padding: '3px 9px', borderRadius: 999, whiteSpace: 'nowrap' },
  enlace: { fontSize: 11.5, color: 'var(--texto)', textDecoration: 'underline', whiteSpace: 'nowrap' },

  btn: {
    color: 'var(--sobre-marca)', padding: '9px 18px', borderRadius: 4, fontSize: 12.5,
    fontWeight: 600, textDecoration: 'none', display: 'inline-block', marginTop: 14,
  },

  sinAlertas: {
    background: 'var(--superficie)', borderWidth: 1, borderStyle: 'solid', borderColor: 'var(--bien)',
    borderRadius: 8, padding: '40px 24px', textAlign: 'center',
  },
};
