'use client';

/**
 * MATRIZ DE DOTACIÓN
 * ---------------------------------------------------------------
 * Filas: empleados. Columnas: elementos. La celda muestra la vigencia
 * de la última entrega, no si alguna vez se entregó.
 *
 * Esa distinción es todo el módulo: un casco entregado hace seis años
 * está vencido, y para efectos de cumplimiento equivale a no haberlo
 * entregado nunca. Una matriz que solo marcara «entregado» daría una
 * conformidad falsa.
 */
import { useState, useMemo } from 'react';
import Link from 'next/link';
import type { MatrizDotacion, EstadoDotacion } from '@/lib/acciones-expediente';

const SIMBOLO: Record<EstadoDotacion, string> = {
  vigente: '✓',
  por_vencer: '!',
  vencido: '✗',
  sin_vencimiento: '•',
  nunca: '·',
};

const TONO: Record<EstadoDotacion, { fondo: string; texto: string }> = {
  vigente: { fondo: 'var(--bien-fondo)', texto: 'var(--bien)' },
  por_vencer: { fondo: 'var(--ambar-fondo)', texto: 'var(--ambar)' },
  vencido: { fondo: 'var(--mal-fondo)', texto: 'var(--mal)' },
  sin_vencimiento: { fondo: 'var(--info-fondo)', texto: 'var(--info)' },
  nunca: { fondo: 'transparent', texto: 'var(--borde-fuerte)' },
};

const ETIQUETA: Record<EstadoDotacion, string> = {
  vigente: 'Vigente',
  por_vencer: 'Vence en menos de 30 días',
  vencido: 'Vencido',
  sin_vencimiento: 'Entregado, sin vencimiento',
  nunca: 'Nunca entregado',
};

export default function VistaMatrizDotacion({
  matriz,
  color,
}: {
  matriz: MatrizDotacion;
  color: string;
}) {
  const [filtroArea, setFiltroArea] = useState('');
  const [soloProblemas, setSoloProblemas] = useState(false);

  const areas = useMemo(
    () => Array.from(new Set(matriz.empleados.map((e) => e.area))).sort(),
    [matriz.empleados]
  );

  const filas = useMemo(() => {
    return matriz.empleados.filter((e) => {
      if (filtroArea && e.area !== filtroArea) return false;
      if (soloProblemas) {
        const hayProblema = e.celdas.some(
          (c) => c.estado === 'vencido' || c.estado === 'por_vencer'
        );
        if (!hayProblema) return false;
      }
      return true;
    });
  }, [matriz.empleados, filtroArea, soloProblemas]);

  const vencidos = matriz.empleados.reduce(
    (t, e) => t + e.celdas.filter((c) => c.estado === 'vencido').length, 0
  );
  const porVencer = matriz.empleados.reduce(
    (t, e) => t + e.celdas.filter((c) => c.estado === 'por_vencer').length, 0
  );

  if (matriz.articulos.length === 0 || matriz.empleados.length === 0) {
    return (
      <div style={s.vacio}>
        <p style={{ margin: '0 0 14px', fontSize: 14 }}>
          {matriz.empleados.length === 0
            ? 'Carga los empleados de la empresa para construir la matriz.'
            : 'No hay elementos de protección registrados en el inventario.'}
        </p>
        <Link
          href={matriz.empleados.length === 0 ? '/panel/empleados' : '/panel/dotacion'}
          style={{ ...s.btn, background: 'var(--marca)' }}
        >
          {matriz.empleados.length === 0 ? 'Ir a Empleados' : 'Ir al inventario'}
        </Link>
      </div>
    );
  }

  return (
    <>
      <div style={s.controles}>
        <select value={filtroArea} onChange={(x) => setFiltroArea(x.target.value)} style={s.select}>
          <option value="">Todas las áreas</option>
          {areas.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>

        <label style={s.check}>
          <input
            type="checkbox"
            checked={soloProblemas}
            onChange={(x) => setSoloProblemas(x.target.checked)}
            style={{ marginRight: 7 }}
          />
          Solo con dotación vencida o por vencer
        </label>

        <span style={s.conteo}>
          {filas.length} de {matriz.empleados.length}
          {vencidos > 0 && <strong style={{ color: 'var(--mal)' }}> · {vencidos} vencidos</strong>}
          {porVencer > 0 && <strong style={{ color: 'var(--ambar)' }}> · {porVencer} por vencer</strong>}
        </span>
      </div>

      <div style={s.leyenda}>
        {(Object.keys(SIMBOLO) as EstadoDotacion[]).map((k) => (
          <span key={k} style={s.leyendaItem}>
            <span style={{
              ...s.marca,
              background: TONO[k].fondo,
              color: TONO[k].texto,
              borderWidth: k === 'nunca' ? 1 : 0,
              borderStyle: 'solid',
              borderColor: 'var(--borde)',
            }}>
              {SIMBOLO[k]}
            </span>
            {ETIQUETA[k]}
          </span>
        ))}
      </div>

      <div style={s.contenedor}>
        <table style={s.tabla}>
          <thead>
            <tr>
              <th style={{ ...s.thFijo, ...s.esquina }}>Empleado</th>
              <th style={s.thArea}>Área</th>
              {matriz.articulos.map((a) => (
                <th key={a.id} style={s.thArt} title={`${a.codigo} · ${a.nombre}`}>
                  <div style={s.rotado}>
                    <Link href={`/panel/dotacion/${a.id}`} style={s.enlaceArt}>
                      {a.nombre.length > 24 ? a.nombre.slice(0, 24) + '…' : a.nombre}
                    </Link>
                  </div>
                  {a.vida_util_dias && (
                    <div style={s.vida}>{Math.round(a.vida_util_dias / 30)}m</div>
                  )}
                </th>
              ))}
              <th style={s.thTotal}>Equipos</th>
            </tr>
          </thead>

          <tbody>
            {filas.map((e) => (
              <tr key={e.id}>
                <td style={s.tdFijo}>
                  <Link href={`/panel/empleados/${e.id}`} style={s.enlaceEmp}>
                    {e.nombres}
                  </Link>
                  <div style={s.cedula}>{e.identificacion}</div>
                </td>
                <td style={s.tdArea}>{e.area}</td>

                {e.celdas.map((c, i) => {
                  const tono = TONO[c.estado];
                  return (
                    <td
                      key={i}
                      style={{ ...s.celda, background: tono.fondo, color: tono.texto }}
                      title={
                        c.estado === 'nunca'
                          ? 'Nunca entregado'
                          : `${ETIQUETA[c.estado]}${c.talla ? ` · talla ${c.talla}` : ''}` +
                            `${c.fecha_vence ? ` · vence ${c.fecha_vence}` : ''}` +
                            `${c.entrega ? ` · acta ${c.entrega}` : ''}`
                      }
                    >
                      {SIMBOLO[c.estado]}
                      {c.dias !== null && c.estado !== 'vigente' && c.estado !== 'nunca' && (
                        <div style={s.dias}>
                          {c.dias < 0 ? `${Math.abs(c.dias)}d` : `${c.dias}d`}
                        </div>
                      )}
                    </td>
                  );
                })}

                <td style={s.tdTotal}>
                  {e.equipos.length > 0 ? (
                    <span title={e.equipos.map((q) => `${q.placa} · ${q.articulo}`).join('\n')}>
                      {e.equipos.length}
                    </span>
                  ) : (
                    <span style={{ color: 'var(--borde-fuerte)' }}>—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>

          <tfoot>
            <tr>
              <td style={{ ...s.tdFijo, ...s.pie }} colSpan={2}>Entregados / vencidos</td>
              {matriz.articulos.map((a) => (
                <td key={a.id} style={{ ...s.celda, ...s.pie }}>
                  {a.entregados}
                  {a.vencidos > 0 && (
                    <span style={{ color: 'var(--mal)' }}>/{a.vencidos}</span>
                  )}
                </td>
              ))}
              <td style={{ ...s.tdTotal, ...s.pie }} />
            </tr>
          </tfoot>
        </table>
      </div>

      <p style={s.nota}>
        La celda muestra la <strong>vigencia de la última entrega</strong>, no si
        alguna vez se entregó. Un elemento vencido equivale, para efectos de
        cumplimiento, a no haberse entregado — por eso se marca en rojo y no en
        verde. Bajo el nombre de cada columna aparece su vida útil en meses.
      </p>
    </>
  );
}

const s: Record<string, React.CSSProperties> = {
  controles: { display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 },
  select: {
    padding: '8px 11px', borderWidth: 1, borderStyle: 'solid', borderColor: 'var(--borde-fuerte)',
    borderRadius: 4, fontSize: 12.5, fontFamily: 'inherit', background: 'var(--superficie)',
  },
  check: { display: 'flex', alignItems: 'center', fontSize: 12.5, color: 'var(--texto-suave)', cursor: 'pointer' },
  conteo: { fontSize: 12, color: 'var(--texto-tenue)', marginLeft: 'auto' },

  leyenda: { display: 'flex', gap: 16, marginBottom: 14, flexWrap: 'wrap' },
  leyendaItem: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: 'var(--texto-suave)' },
  marca: {
    width: 20, height: 20, borderRadius: 3, display: 'inline-flex',
    alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700,
  },

  contenedor: {
    overflowX: 'auto', borderWidth: 1, borderStyle: 'solid', borderColor: 'var(--borde)',
    borderRadius: 8, background: 'var(--superficie)',
  },
  tabla: { borderCollapse: 'separate', borderSpacing: 0, fontSize: 12 },

  thFijo: {
    position: 'sticky', left: 0, zIndex: 3, background: 'var(--fondo)',
    minWidth: 180, textAlign: 'left', padding: '8px 10px', verticalAlign: 'bottom',
    borderBottom: '1px solid var(--borde)', borderRight: '1px solid var(--borde)',
  },
  esquina: { fontSize: 11, color: 'var(--texto-tenue)', textTransform: 'uppercase' },
  thArea: {
    position: 'sticky', left: 180, zIndex: 3, background: 'var(--fondo)',
    minWidth: 110, textAlign: 'left', padding: '8px 10px', verticalAlign: 'bottom',
    fontSize: 11, color: 'var(--texto-tenue)', textTransform: 'uppercase',
    borderBottom: '1px solid var(--borde)', borderRight: '1px solid var(--borde)',
  },
  thArt: {
    background: 'var(--fondo)', padding: '8px 4px', minWidth: 46, maxWidth: 46,
    verticalAlign: 'bottom', borderBottom: '1px solid var(--borde)',
    borderRight: '1px solid var(--superficie-3)',
  },
  rotado: {
    writingMode: 'vertical-rl', transform: 'rotate(180deg)',
    height: 140, fontSize: 10.5, fontWeight: 500,
    whiteSpace: 'nowrap', margin: '0 auto',
  },
  enlaceArt: { color: 'var(--texto)', textDecoration: 'none' },
  vida: {
    fontSize: 8.5, color: 'var(--texto-tenue)', marginTop: 4, textAlign: 'center',
    fontFamily: 'ui-monospace,SFMono-Regular,Menlo,monospace',
  },
  thTotal: {
    background: 'var(--fondo)', padding: '8px 10px', verticalAlign: 'bottom',
    fontSize: 11, color: 'var(--texto-tenue)', textTransform: 'uppercase',
    borderBottom: '1px solid var(--borde)', borderLeft: '1px solid var(--borde)',
  },

  tdFijo: {
    position: 'sticky', left: 0, zIndex: 2, background: 'var(--superficie)',
    padding: '7px 10px', borderBottom: '1px solid var(--superficie-3)',
    borderRight: '1px solid var(--borde)', minWidth: 180,
  },
  enlaceEmp: { color: 'var(--texto)', textDecoration: 'none', fontWeight: 500 },
  cedula: {
    fontSize: 10, color: 'var(--texto-tenue)',
    fontFamily: 'ui-monospace,SFMono-Regular,Menlo,monospace',
  },
  tdArea: {
    position: 'sticky', left: 180, zIndex: 2, background: 'var(--superficie)',
    padding: '7px 10px', fontSize: 11, color: 'var(--texto-suave)',
    borderBottom: '1px solid var(--superficie-3)', borderRight: '1px solid var(--borde)',
    minWidth: 110,
  },
  celda: {
    textAlign: 'center', padding: '7px 3px', fontSize: 13, fontWeight: 700,
    borderBottom: '1px solid var(--superficie-3)', borderRight: '1px solid var(--superficie-3)',
  },
  dias: { fontSize: 7.5, fontWeight: 400, marginTop: 1 },
  tdTotal: {
    textAlign: 'center', padding: '7px 10px', fontWeight: 600,
    borderBottom: '1px solid var(--superficie-3)', borderLeft: '1px solid var(--borde)',
    background: 'var(--superficie-2)',
  },
  pie: { background: 'var(--fondo)', fontWeight: 600, fontSize: 11, borderTop: '1px solid var(--borde)' },

  nota: { fontSize: 11.5, color: 'var(--texto-tenue)', marginTop: 14, lineHeight: 1.65, maxWidth: 720 },
  vacio: {
    background: 'var(--superficie)', borderWidth: 1, borderStyle: 'dashed', borderColor: 'var(--borde-fuerte)',
    borderRadius: 8, padding: '40px 24px', textAlign: 'center',
  },
  btn: {
    color: 'var(--sobre-marca)', padding: '10px 18px', borderRadius: 4,
    fontSize: 13, fontWeight: 600, textDecoration: 'none', display: 'inline-block',
  },
};
