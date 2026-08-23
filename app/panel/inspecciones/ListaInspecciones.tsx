'use client';

/**
 * LISTADO DE INSPECCIONES
 * Los borradores van primero: son los que requieren acción.
 */
import { useState, useMemo } from 'react';
import Link from 'next/link';
import type { InspeccionResumen } from '@/lib/acciones-ejecutar-inspeccion';

const TIPOS: Record<string, string> = {
  planeada: 'Planeada', area: 'De área',
  equipo: 'De equipo', auditoria: 'Auditoría',
};

export default function ListaInspecciones({
  inspecciones,
  color,
}: {
  inspecciones: InspeccionResumen[];
  color: string;
}) {
  const [busqueda, setBusqueda] = useState('');
  const [soloAbiertas, setSoloAbiertas] = useState(false);

  const lista = useMemo(() => {
    const filtradas = inspecciones.filter((i) => {
      if (soloAbiertas && i.estado !== 'borrador') return false;
      if (!busqueda) return true;
      return `${i.codigo} ${i.nombre} ${i.objeto_nombre ?? ''} ${i.inspector}`
        .toLowerCase().includes(busqueda.toLowerCase());
    });

    return filtradas.sort((a, b) => {
      const pa = a.estado === 'borrador' ? 0 : 1;
      const pb = b.estado === 'borrador' ? 0 : 1;
      return pa - pb;
    });
  }, [inspecciones, busqueda, soloAbiertas]);

  const borradores = inspecciones.filter((i) => i.estado === 'borrador').length;
  const noCumplen = inspecciones.filter((i) => i.cumple === false).length;

  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString('es-CO', { dateStyle: 'medium' });

  if (inspecciones.length === 0) {
    return (
      <div style={e.vacio}>
        <p style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 600 }}>
          Aún no hay inspecciones
        </p>
        <p style={e.explicacion}>
          Necesitas una lista de verificación con criterios. Si no las has
          cargado, empieza por las once listas base.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 16, flexWrap: 'wrap' }}>
          <Link href="/panel/inspecciones/nueva" style={{ ...e.btn, background: color }}>
            Nueva inspección
          </Link>
          <Link href="/panel/inspecciones/plantillas" style={e.btnSec}>
            Ver listas
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <div style={e.controles}>
        <input
          value={busqueda}
          onChange={(x) => setBusqueda(x.target.value)}
          placeholder="Buscar por código, lista o área…"
          style={e.input}
        />
        <label style={e.check}>
          <input
            type="checkbox"
            checked={soloAbiertas}
            onChange={(x) => setSoloAbiertas(x.target.checked)}
            style={{ marginRight: 7 }}
          />
          Solo sin cerrar {borradores > 0 && `(${borradores})`}
        </label>
        <span style={e.conteo}>
          {lista.length} de {inspecciones.length}
          {noCumplen > 0 && (
            <strong style={{ color: '#9B1C1C' }}> · {noCumplen} no cumplen</strong>
          )}
        </span>
      </div>

      <div style={e.contenedor}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
          <thead>
            <tr>
              {['Código', 'Lista', 'Objeto', 'Fecha', 'Avance', 'Resultado', ''].map((h) => (
                <th key={h} style={e.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lista.map((i) => (
              <tr key={i.id}>
                <td style={{ ...e.td, ...e.mono }}>{i.codigo}</td>
                <td style={e.td}>
                  <strong>{i.nombre}</strong>
                  <div style={e.meta}>{TIPOS[i.tipo] ?? i.tipo}</div>
                </td>
                <td style={{ ...e.td, color: '#5B6470' }}>{i.objeto_nombre ?? '—'}</td>
                <td style={{ ...e.td, whiteSpace: 'nowrap' }}>{fmt(i.fecha)}</td>
                <td style={e.td}>
                  {i.respondidos} / {i.criterios}
                  {i.hallazgos > 0 && (
                    <div style={e.hallazgos}>{i.hallazgos} hallazgo(s)</div>
                  )}
                </td>
                <td style={e.td}>
                  {i.estado === 'borrador' ? (
                    <span style={{ ...e.chip, background: '#FEF9C3', color: '#8A6100' }}>
                      Sin cerrar
                    </span>
                  ) : i.cumple ? (
                    <span style={{ ...e.chip, background: '#DCFCE7', color: '#15803D' }}>
                      Cumple · {i.puntaje}%
                    </span>
                  ) : (
                    <span style={{ ...e.chip, background: '#FEE2E2', color: '#9B1C1C' }}>
                      No cumple · {i.puntaje}%
                    </span>
                  )}
                </td>
                <td style={{ ...e.td, whiteSpace: 'nowrap' }}>
                  <Link href={`/panel/inspecciones/${i.id}`} style={e.enlace}>
                    {i.estado === 'borrador' ? 'Continuar' : 'Ver'}
                  </Link>
                  {i.estado === 'cerrada' && (
                    <a href={`/api/pdf-inspeccion/${i.id}`} style={e.enlace}>PDF</a>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {noCumplen > 0 && (
        <p style={e.nota}>
          Una inspección puede sacar buen puntaje y aun así <strong>no cumplir</strong>:
          un criterio crítico incumplido reprueba el conjunto, porque hay cosas
          que no se compensan con otras.
        </p>
      )}
    </>
  );
}

const e: Record<string, React.CSSProperties> = {
  controles: { display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 14 },
  input: {
    padding: '8px 11px', borderWidth: 1, borderStyle: 'solid', borderColor: '#DFDFD8',
    borderRadius: 4, fontSize: 12.5, fontFamily: 'inherit', minWidth: 250,
  },
  check: { display: 'flex', alignItems: 'center', fontSize: 12.5, color: '#5B6470', cursor: 'pointer' },
  conteo: { fontSize: 12, color: '#8A929C', marginLeft: 'auto' },

  contenedor: {
    background: '#fff', borderWidth: 1, borderStyle: 'solid', borderColor: '#E4E4DF',
    borderRadius: 8, overflowX: 'auto',
  },
  th: {
    background: '#F7F7F4', color: '#8A929C', fontSize: 10.5, textTransform: 'uppercase',
    padding: '9px 10px', textAlign: 'left', borderBottom: '1px solid #E4E4DF',
    whiteSpace: 'nowrap',
  },
  td: { padding: '9px 10px', borderBottom: '1px solid #F4F4F0', verticalAlign: 'top' },
  mono: { fontFamily: 'ui-monospace,SFMono-Regular,Menlo,monospace', fontSize: 11.5 },
  meta: { fontSize: 10.5, color: '#A3AAB3', marginTop: 2 },
  hallazgos: { fontSize: 10.5, color: '#9B1C1C', marginTop: 2 },
  chip: { fontSize: 10.5, fontWeight: 600, padding: '3px 9px', borderRadius: 999, whiteSpace: 'nowrap' },
  enlace: { fontSize: 11.5, color: '#14263F', textDecoration: 'underline', marginRight: 10 },

  nota: { fontSize: 11.5, color: '#8A929C', marginTop: 14, lineHeight: 1.6, maxWidth: 680 },
  vacio: {
    background: '#fff', borderWidth: 1, borderStyle: 'dashed', borderColor: '#DFDFD8',
    borderRadius: 8, padding: '40px 24px', textAlign: 'center',
  },
  explicacion: {
    fontSize: 12.5, color: '#5B6470', margin: 0, lineHeight: 1.6,
    maxWidth: 420, marginLeft: 'auto', marginRight: 'auto',
  },
  btn: {
    color: '#fff', padding: '10px 18px', borderRadius: 4, fontSize: 13,
    fontWeight: 600, textDecoration: 'none', display: 'inline-block',
  },
  btnSec: {
    background: '#fff', color: '#14263F',
    borderWidth: 1, borderStyle: 'solid', borderColor: '#DFDFD8',
    padding: '10px 18px', borderRadius: 4, fontSize: 13, fontWeight: 600,
    textDecoration: 'none', display: 'inline-block',
  },
};
