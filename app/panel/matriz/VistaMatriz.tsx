'use client';

/**
 * MATRIZ DE CAPACITACIONES
 * ---------------------------------------------------------------
 * Filas: empleados. Columnas: capacitaciones. Cada celda cruza ambos.
 *
 * Es el documento que un auditor pide: de un vistazo se ve quién
 * recibió qué formación y dónde hay huecos.
 *
 * La distinción clave está entre «faltó» y «no aplica». Sin la
 * convocatoria solo se sabe quién asistió; con ella se sabe quién
 * DEBÍA asistir y no lo hizo, que es el dato que exige una acción.
 */
import { useState, useMemo } from 'react';
import Link from 'next/link';
import type { Matriz, EstadoCelda } from '@/lib/acciones-convocatoria';

const SIMBOLO: Record<EstadoCelda, string> = {
  asistio: '✓',
  falto: '✗',
  programada: '○',
  no_aplica: '·',
};

const TONO: Record<EstadoCelda, { fondo: string; texto: string }> = {
  asistio: { fondo: 'var(--bien-fondo)', texto: 'var(--bien)' },
  falto: { fondo: 'var(--mal-fondo)', texto: 'var(--mal)' },
  // Ámbar, no rojo: nadie puede faltar a algo que aún no ocurre
  programada: { fondo: 'var(--ambar-fondo)', texto: 'var(--ambar)' },
  no_aplica: { fondo: 'transparent', texto: 'var(--borde-fuerte)' },
};

export default function VistaMatriz({
  matriz,
  empresaNombre,
  color,
}: {
  matriz: Matriz;
  empresaNombre: string;
  color: string;
}) {
  const [filtroArea, setFiltroArea] = useState('');
  const [soloConHuecos, setSoloConHuecos] = useState(false);

  const areas = useMemo(
    () => Array.from(new Set(matriz.empleados.map((e) => e.area))).sort(),
    [matriz.empleados]
  );

  const filas = useMemo(() => {
    return matriz.empleados.filter((e) => {
      if (filtroArea && e.area !== filtroArea) return false;
      if (soloConHuecos && !e.celdas.some((c) => c.estado === 'falto')) return false;
      return true;
    });
  }, [matriz.empleados, filtroArea, soloConHuecos]);

  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit' });

  // Total de inasistencias sobre convocatoria: el hueco real
  const huecos = matriz.empleados.reduce(
    (t, e) => t + e.celdas.filter((c) => c.estado === 'falto').length,
    0
  );

  if (matriz.capacitaciones.length === 0 || matriz.empleados.length === 0) {
    return (
      <div style={s.vacio}>
        <p style={{ margin: 0, fontSize: 14 }}>
          {matriz.empleados.length === 0
            ? 'Carga los empleados de la empresa para construir la matriz.'
            : 'Aún no hay capacitaciones en el periodo.'}
        </p>
        {matriz.empleados.length === 0 && (
          <Link href="/panel/empleados" style={{ ...s.btn, marginTop: 14, background: 'var(--marca)' }}>
            Ir a Empleados
          </Link>
        )}
      </div>
    );
  }

  return (
    <>
      {/* ---------- Controles ---------- */}
      <div style={s.controles}>
        <select
          value={filtroArea}
          onChange={(e) => setFiltroArea(e.target.value)}
          style={s.select}
        >
          <option value="">Todas las áreas</option>
          {areas.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>

        <label style={s.check}>
          <input
            type="checkbox"
            checked={soloConHuecos}
            onChange={(e) => setSoloConHuecos(e.target.checked)}
            style={{ marginRight: 7 }}
          />
          Solo con inasistencias
        </label>

        <span style={s.conteo}>
          {filas.length} de {matriz.empleados.length} empleados ·{' '}
          {matriz.capacitaciones.length} capacitaciones
          {huecos > 0 && <strong style={{ color: 'var(--mal)' }}> · {huecos} inasistencias</strong>}
        </span>
      </div>

      {/* ---------- Leyenda ---------- */}
      <div style={s.leyenda}>
        <Marca estado="asistio" texto="Asistió" />
        <Marca estado="falto" texto="Convocado, no asistió" />
        <Marca estado="programada" texto="Programada" />
        <Marca estado="no_aplica" texto="No convocado" />
      </div>

      {/* ---------- Matriz ---------- */}
      <div style={s.contenedor}>
        <table style={s.tabla}>
          <thead>
            <tr>
              <th style={{ ...s.thFijo, ...s.esquina }}>Empleado</th>
              <th style={s.thArea}>Área</th>
              {matriz.capacitaciones.map((c) => (
                <th key={c.id} style={s.thCap} title={`${c.codigo} · ${c.tema}`}>
                  <div style={s.rotado}>
                    <Link href={`/panel/capacitaciones/${c.id}`} style={s.enlaceCap}>
                      {c.tema.length > 26 ? c.tema.slice(0, 26) + '…' : c.tema}
                    </Link>
                  </div>
                  <div style={{
                    ...s.fechaCap,
                    color: c.futura ? 'var(--ambar)' : 'var(--texto-tenue)',
                    fontWeight: c.futura ? 700 : 400,
                  }}>
                    {fmt(c.fecha)}
                  </div>
                </th>
              ))}
              <th style={s.thTotal}>Total</th>
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
                        c.estado === 'asistio'
                          ? c.puntaje !== null ? `Asistió · ${c.puntaje}%` : 'Asistió'
                          : c.estado === 'falto' ? 'Convocado, no asistió'
                          : c.estado === 'programada' ? 'Convocado · aún no ocurre'
                          : 'No convocado'
                      }
                    >
                      {SIMBOLO[c.estado]}
                      {c.estado === 'asistio' && c.puntaje !== null && (
                        <div style={s.puntaje}>{c.puntaje}%</div>
                      )}
                    </td>
                  );
                })}

                <td style={s.tdTotal}>
                  {e.asistidas}
                  {/* El denominador excluye las programadas: solo cuenta
                      lo que ya debía haber ocurrido. */}
                  {(() => {
                    const exigibles = e.celdas.filter(
                      (c) => c.estado === 'asistio' || c.estado === 'falto'
                    ).length;
                    return exigibles > 0
                      ? <span style={s.deConvocadas}>/{exigibles}</span>
                      : null;
                  })()}
                </td>
              </tr>
            ))}
          </tbody>

          <tfoot>
            <tr>
              <td style={{ ...s.tdFijo, ...s.pie }} colSpan={2}>Asistieron</td>
              {matriz.capacitaciones.map((c) => (
                <td key={c.id} style={{ ...s.celda, ...s.pie }}>
                  {c.asistieron}
                  {c.convocados > 0 && <span style={s.deConvocadas}>/{c.convocados}</span>}
                </td>
              ))}
              <td style={{ ...s.tdTotal, ...s.pie }} />
            </tr>
          </tfoot>
        </table>
      </div>

      <p style={s.nota}>
        Las capacitaciones con fecha futura aparecen como <strong>programadas</strong>:
        nadie puede faltar a algo que todavía no ocurre, así que no cuentan como
        inasistencia ni en el total.
        La columna «Total» muestra asistencias sobre convocatorias ya vencidas. Una
        capacitación sin convocatoria registrada aparece como «no convocado»
        para todos: defínela en el detalle de la capacitación.
      </p>
    </>
  );
}

function Marca({ estado, texto }: { estado: EstadoCelda; texto: string }) {
  const tono = TONO[estado];
  return (
    <span style={s.leyendaItem}>
      <span style={{
        ...s.marca,
        background: tono.fondo, color: tono.texto,
        border: estado === 'no_aplica' ? '1px solid var(--borde)' : 'none',
      }}>
        {SIMBOLO[estado]}
      </span>
      {texto}
    </span>
  );
}

const s: Record<string, React.CSSProperties> = {
  controles: {
    display: 'flex', gap: 14, alignItems: 'center',
    flexWrap: 'wrap', marginBottom: 12,
  },
  select: {
    padding: '8px 11px', border: '1px solid var(--borde-fuerte)', borderRadius: 4,
    fontSize: 12.5, fontFamily: 'inherit', background: 'var(--superficie)',
  },
  check: { display: 'flex', alignItems: 'center', fontSize: 12.5, color: 'var(--texto-suave)', cursor: 'pointer' },
  conteo: { fontSize: 12, color: 'var(--texto-tenue)', marginLeft: 'auto' },

  leyenda: { display: 'flex', gap: 20, marginBottom: 14, flexWrap: 'wrap' },
  leyendaItem: { display: 'flex', alignItems: 'center', gap: 7, fontSize: 11.5, color: 'var(--texto-suave)' },
  marca: {
    width: 20, height: 20, borderRadius: 3, display: 'inline-flex',
    alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700,
  },

  contenedor: {
    overflowX: 'auto', border: '1px solid var(--borde)',
    borderRadius: 8, background: 'var(--superficie)',
  },
  tabla: { borderCollapse: 'separate', borderSpacing: 0, fontSize: 12 },

  thFijo: {
    position: 'sticky', left: 0, zIndex: 3, background: 'var(--fondo)',
    minWidth: 180, textAlign: 'left', padding: '8px 10px',
    borderBottom: '1px solid var(--borde)', borderRight: '1px solid var(--borde)',
  },
  esquina: { verticalAlign: 'bottom', fontSize: 11, color: 'var(--texto-tenue)', textTransform: 'uppercase' },
  thArea: {
    position: 'sticky', left: 180, zIndex: 3, background: 'var(--fondo)',
    minWidth: 110, textAlign: 'left', padding: '8px 10px', verticalAlign: 'bottom',
    fontSize: 11, color: 'var(--texto-tenue)', textTransform: 'uppercase',
    borderBottom: '1px solid var(--borde)', borderRight: '1px solid var(--borde)',
  },
  thCap: {
    background: 'var(--fondo)', padding: '8px 4px', minWidth: 46, maxWidth: 46,
    verticalAlign: 'bottom', borderBottom: '1px solid var(--borde)',
    borderRight: '1px solid var(--superficie-3)',
  },
  rotado: {
    writingMode: 'vertical-rl', transform: 'rotate(180deg)',
    height: 150, fontSize: 10.5, fontWeight: 500,
    whiteSpace: 'nowrap', margin: '0 auto',
  },
  enlaceCap: { color: 'var(--texto)', textDecoration: 'none' },
  fechaCap: {
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
  puntaje: { fontSize: 8, fontWeight: 400, marginTop: 1 },
  tdTotal: {
    textAlign: 'center', padding: '7px 10px', fontWeight: 600,
    borderBottom: '1px solid var(--superficie-3)', borderLeft: '1px solid var(--borde)',
    background: 'var(--superficie-2)',
  },
  deConvocadas: { color: 'var(--texto-tenue)', fontWeight: 400, fontSize: 10.5 },
  pie: { background: 'var(--fondo)', fontWeight: 600, fontSize: 11, borderTop: '1px solid var(--borde)' },

  nota: { fontSize: 11.5, color: 'var(--texto-tenue)', marginTop: 14, lineHeight: 1.6, maxWidth: 700 },
  vacio: {
    background: 'var(--superficie)', border: '1px dashed var(--borde-fuerte)', borderRadius: 8,
    padding: '40px 24px', textAlign: 'center',
  },
  btn: {
    color: 'var(--sobre-marca)', padding: '10px 18px', borderRadius: 4,
    fontSize: 13, fontWeight: 600, textDecoration: 'none', display: 'inline-block',
  },
};
