'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Envio } from '@/lib/acciones-envios';

/**
 * Etiquetas de presentación. Van aquí y no en las acciones porque un
 * archivo con 'use server' solo puede exportar funciones async.
 */
const ETIQUETAS: Record<string, string> = {
  acta: 'Acta de asistencia',
  informe_evaluacion: 'Informe de evaluación',
  ejecutivo: 'Reporte ejecutivo',
  cronograma: 'Cronograma',
  firma: 'Enlace de firma',
  otro: 'Otro',
};

export default function VistaEnvios({
  envios,
  empresaNombre,
  verTodas,
}: {
  envios: Envio[];
  empresaNombre: string;
  verTodas: boolean;
}) {
  const [filtroTipo, setFiltroTipo] = useState('');
  const [soloErrores, setSoloErrores] = useState(false);

  const filtrados = envios.filter((e) => {
    if (filtroTipo && e.tipo !== filtroTipo) return false;
    if (soloErrores && e.estado !== 'error') return false;
    return true;
  });

  const errores = envios.filter((e) => e.estado === 'error').length;

  const fmt = (iso: string) =>
    new Date(iso).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' });

  return (
    <>
      <div style={s.controles}>
        <Link
          href={verTodas ? '/panel/envios' : '/panel/envios?todas=1'}
          style={s.btnSec}
        >
          {verTodas ? `Ver solo ${empresaNombre || 'la empresa activa'}` : 'Ver todas las empresas'}
        </Link>

        <select
          value={filtroTipo}
          onChange={(e) => setFiltroTipo(e.target.value)}
          style={s.select}
        >
          <option value="">Todos los tipos</option>
          {Object.entries(ETIQUETAS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>

        <label style={s.check}>
          <input
            type="checkbox"
            checked={soloErrores}
            onChange={(e) => setSoloErrores(e.target.checked)}
            style={{ marginRight: 7 }}
          />
          Solo errores {errores > 0 && `(${errores})`}
        </label>

        <span style={s.conteo}>{filtrados.length} de {envios.length}</span>
      </div>

      {envios.length === 0 ? (
        <div style={s.vacio}>
          <p style={{ margin: 0, fontSize: 13.5 }}>
            Aún no se han enviado correos desde el sistema.
          </p>
        </div>
      ) : (
        <div style={s.contenedor}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
            <thead>
              <tr>
                {['Fecha', 'Tipo', 'Asunto', 'Destinatarios', 'Estado'].map((h) => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtrados.map((e) => (
                <tr key={e.id}>
                  <td style={{ ...s.td, ...s.mono, whiteSpace: 'nowrap' }}>
                    {fmt(e.enviado_en)}
                  </td>
                  <td style={s.td}>
                    <span style={s.chip}>{ETIQUETAS[e.tipo] ?? e.tipo}</span>
                  </td>
                  <td style={s.td}>
                    {e.referencia_id && e.tipo !== 'ejecutivo' ? (
                      <Link
                        href={`/panel/capacitaciones/${e.referencia_id}`}
                        style={{ color: '#14263F', textDecoration: 'none' }}
                      >
                        {e.asunto}
                      </Link>
                    ) : (
                      e.asunto
                    )}
                  </td>
                  <td style={{ ...s.td, ...s.destinatarios }} title={e.destinatarios}>
                    {e.destinatarios}
                  </td>
                  <td style={s.td}>
                    {e.estado === 'enviado' ? (
                      <span style={{ color: '#15803D', fontWeight: 600 }}>Enviado</span>
                    ) : (
                      <span style={{ color: '#9B1C1C', fontWeight: 600 }} title={e.error ?? ''}>
                        Error
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p style={s.nota}>
        Se registran los últimos 100 envíos. El identificador del proveedor se
        guarda por si hace falta rastrear un mensaje concreto en Resend.
      </p>
    </>
  );
}

const s: Record<string, React.CSSProperties> = {
  controles: { display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 14 },
  btnSec: {
    background: '#fff', color: '#14263F', border: '1px solid #DFDFD8',
    padding: '7px 14px', borderRadius: 4, fontSize: 12.5,
    fontWeight: 600, textDecoration: 'none',
  },
  select: {
    padding: '7px 11px', border: '1px solid #DFDFD8', borderRadius: 4,
    fontSize: 12.5, fontFamily: 'inherit', background: '#fff',
  },
  check: { display: 'flex', alignItems: 'center', fontSize: 12.5, color: '#5B6470', cursor: 'pointer' },
  conteo: { fontSize: 12, color: '#8A929C', marginLeft: 'auto' },

  contenedor: { background: '#fff', border: '1px solid #E4E4DF', borderRadius: 8, overflowX: 'auto' },
  th: {
    background: '#F7F7F4', color: '#8A929C', fontSize: 10.5, textTransform: 'uppercase',
    padding: '9px 10px', textAlign: 'left', borderBottom: '1px solid #E4E4DF',
  },
  td: { padding: '9px 10px', borderBottom: '1px solid #F4F4F0' },
  mono: { fontFamily: 'ui-monospace,SFMono-Regular,Menlo,monospace', fontSize: 11 },
  chip: {
    fontSize: 10.5, background: '#F4F4F0', color: '#5B6470',
    padding: '3px 8px', borderRadius: 3, whiteSpace: 'nowrap',
  },
  destinatarios: {
    maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis',
    whiteSpace: 'nowrap', color: '#5B6470', fontSize: 11.5,
  },
  vacio: {
    background: '#fff', border: '1px dashed #DFDFD8', borderRadius: 8,
    padding: '40px 24px', textAlign: 'center',
  },
  nota: { fontSize: 11.5, color: '#8A929C', marginTop: 14, lineHeight: 1.6 },
};
