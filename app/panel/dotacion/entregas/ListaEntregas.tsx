'use client';

/**
 * LISTADO DE ENTREGAS
 * Los borradores van primero: son los que requieren acción.
 */
import { useState, useMemo } from 'react';
import Link from 'next/link';
import type { EntregaResumen } from '@/lib/acciones-entregas';

export default function ListaEntregas({
  entregas,
  color,
}: {
  entregas: EntregaResumen[];
  color: string;
}) {
  const [busqueda, setBusqueda] = useState('');
  const [soloBorradores, setSoloBorradores] = useState(false);

  const lista = useMemo(() => {
    const filtradas = entregas.filter((e) => {
      if (soloBorradores && e.estado !== 'borrador') return false;
      if (!busqueda) return true;
      return `${e.codigo} ${e.nombres} ${e.identificacion} ${e.area ?? ''}`
        .toLowerCase().includes(busqueda.toLowerCase());
    });

    // Los borradores primero: requieren firma
    return filtradas.sort((a, b) => {
      const pa = a.estado === 'borrador' ? 0 : 1;
      const pb = b.estado === 'borrador' ? 0 : 1;
      return pa !== pb ? pa - pb : 0;
    });
  }, [entregas, busqueda, soloBorradores]);

  const borradores = entregas.filter((e) => e.estado === 'borrador').length;
  const sinDevolver = entregas.reduce((t, e) => t + e.sin_devolver, 0);

  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString('es-CO', { dateStyle: 'medium' });

  if (entregas.length === 0) {
    return (
      <div style={e.vacio}>
        <p style={{ margin: '0 0 14px', fontSize: 13.5 }}>
          Aún no hay entregas registradas.
        </p>
        <Link href="/panel/dotacion/entregas/nueva" style={{ ...e.btn, background: color }}>
          Registrar la primera
        </Link>
      </div>
    );
  }

  return (
    <>
      <div style={e.controles}>
        <input
          value={busqueda}
          onChange={(x) => setBusqueda(x.target.value)}
          placeholder="Buscar por acta, nombre o cédula…"
          style={e.input}
        />

        <label style={e.check}>
          <input
            type="checkbox"
            checked={soloBorradores}
            onChange={(x) => setSoloBorradores(x.target.checked)}
            style={{ marginRight: 7 }}
          />
          Solo sin firmar {borradores > 0 && `(${borradores})`}
        </label>

        <span style={e.conteo}>
          {lista.length} de {entregas.length}
          {sinDevolver > 0 && (
            <strong style={{ color: '#0369A1' }}> · {sinDevolver} equipo(s) en uso</strong>
          )}
        </span>
      </div>

      <div style={e.contenedor}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
          <thead>
            <tr>
              {['Acta', 'Recibe', 'Área', 'Fecha', 'Elementos', 'Estado', ''].map((h) => (
                <th key={h} style={e.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lista.map((x) => (
              <tr key={x.id}>
                <td style={{ ...e.td, ...e.mono }}>{x.codigo}</td>
                <td style={e.td}>
                  <strong>{x.nombres}</strong>
                  <div style={e.cedula}>{x.identificacion}</div>
                </td>
                <td style={{ ...e.td, color: '#5B6470' }}>{x.area ?? '—'}</td>
                <td style={{ ...e.td, whiteSpace: 'nowrap' }}>{fmt(x.fecha_entrega)}</td>
                <td style={e.td}>
                  {x.items}
                  {x.sin_devolver > 0 && (
                    <span style={e.enUso}> · {x.sin_devolver} en uso</span>
                  )}
                </td>
                <td style={e.td}>
                  {x.estado === 'borrador' ? (
                    <span style={{ ...e.chip, background: '#FEF9C3', color: '#8A6100' }}>
                      Sin firmar
                    </span>
                  ) : x.estado === 'firmada' ? (
                    <span style={{ ...e.chip, background: '#DCFCE7', color: '#15803D' }}>
                      Firmada
                    </span>
                  ) : (
                    <span style={{ ...e.chip, background: '#F4F4F0', color: '#8A929C' }}>
                      Anulada
                    </span>
                  )}
                </td>
                <td style={{ ...e.td, whiteSpace: 'nowrap' }}>
                  <Link href={`/panel/dotacion/entregas/${x.id}`} style={e.enlace}>
                    {x.estado === 'borrador' ? 'Firmar' : 'Ver'}
                  </Link>
                  {x.estado === 'firmada' && (
                    <a href={`/api/pdf-entrega/${x.id}`} style={e.enlace}>PDF</a>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

const e: Record<string, React.CSSProperties> = {
  controles: { display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 14 },
  input: {
    padding: '8px 11px', borderWidth: 1, borderStyle: 'solid', borderColor: '#DFDFD8',
    borderRadius: 4, fontSize: 12.5, fontFamily: 'inherit', minWidth: 240,
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
  },
  td: { padding: '9px 10px', borderBottom: '1px solid #F4F4F0' },
  mono: { fontFamily: 'ui-monospace,SFMono-Regular,Menlo,monospace', fontSize: 11.5 },
  cedula: {
    fontSize: 10.5, color: '#A3AAB3',
    fontFamily: 'ui-monospace,SFMono-Regular,Menlo,monospace',
  },
  enUso: { fontSize: 10.5, color: '#0369A1' },
  chip: { fontSize: 10.5, fontWeight: 600, padding: '3px 9px', borderRadius: 999, whiteSpace: 'nowrap' },
  enlace: { fontSize: 11.5, color: '#14263F', textDecoration: 'underline', marginRight: 10 },

  vacio: {
    background: '#fff', borderWidth: 1, borderStyle: 'dashed', borderColor: '#DFDFD8',
    borderRadius: 8, padding: '40px 24px', textAlign: 'center',
  },
  btn: {
    color: '#fff', padding: '10px 18px', borderRadius: 4, fontSize: 13,
    fontWeight: 600, textDecoration: 'none', display: 'inline-block',
  },
};
