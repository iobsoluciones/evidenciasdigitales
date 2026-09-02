'use client';

/**
 * EMPLEADOS RETIRADOS
 * ---------------------------------------------------------------
 * Al retirar a alguien no se borra: el registro queda aquí con su
 * historial intacto. Una auditoría de la ARL puede preguntar por las
 * capacitaciones de una persona que ya no trabaja en la empresa, y
 * borrarla dejaría el SG-SST sin ese soporte.
 *
 * Desde aquí se reincorpora a quien vuelve a ser contratado: se
 * reactiva SU registro, no se crea uno nuevo, de modo que conserva
 * asistencias, dotación y expediente.
 */
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { reincorporarEmpleado } from '@/lib/acciones-empleados';
import type { EmpleadoRetirado } from '@/lib/acciones-empleados';

/** dd/mm/aaaa; los retirados anteriores a este panel no tienen fecha. */
function fecha(iso: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('es-CO');
}

export default function VistaRetirados({
  retirados,
  color,
  esAdmin,
}: {
  retirados: EmpleadoRetirado[];
  color: string;
  esAdmin: boolean;
}) {
  const router = useRouter();
  const [pendiente, startTransition] = useTransition();
  const [busqueda, setBusqueda] = useState('');
  const [confirmando, setConfirmando] = useState<string | null>(null);
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  const filtrados = retirados.filter((r) => {
    if (!busqueda) return true;
    return `${r.identificacion} ${r.nombres} ${r.cargo ?? ''} ${r.area ?? ''}`
      .toLowerCase().includes(busqueda.toLowerCase());
  });

  function reincorporar(id: string) {
    startTransition(async () => {
      const r = await reincorporarEmpleado(id);
      setAviso({ tipo: r.ok ? 'ok' : 'error', texto: r.mensaje });
      setConfirmando(null);
      if (r.ok) router.refresh();
    });
  }

  return (
    <section style={e.card}>
      <p style={e.intro}>
        Estas personas ya no están activas, pero su historial se conserva como
        soporte ante una auditoría. No participan en capacitaciones ni entregas
        nuevas y no aparecen en la matriz. Si vuelven a ser contratadas,
        reincorpóralas aquí para que recuperen su expediente.
      </p>

      {aviso && (
        <div style={{
          ...e.aviso,
          background: aviso.tipo === 'ok' ? 'var(--bien-fondo)' : 'var(--mal-fondo)',
          color: aviso.tipo === 'ok' ? 'var(--bien)' : 'var(--mal)',
        }}>
          {aviso.texto}
        </div>
      )}

      {retirados.length === 0 ? (
        <p style={e.vacio}>
          No hay empleados retirados en esta empresa.
        </p>
      ) : (
        <>
          <div style={e.barra}>
            <span style={e.conteo}>
              {filtrados.length} de {retirados.length} retirado{retirados.length !== 1 ? 's' : ''}
            </span>
            <input
              value={busqueda}
              onChange={(ev) => setBusqueda(ev.target.value)}
              placeholder="Buscar…"
              style={{ ...e.input, maxWidth: 200 }}
            />
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
              <thead>
                <tr>
                  {['Identificación', 'Nombre', 'Cargo', 'Área', 'Retiro', 'Asist.', 'Prom.', ''].map((h) => (
                    <th key={h} style={e.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtrados.map((em) => (
                  <tr key={em.id}>
                    <td style={{ ...e.td, fontFamily: 'ui-monospace,monospace' }}>{em.identificacion}</td>
                    <td style={e.td}>{em.nombres}</td>
                    <td style={e.td}>{em.cargo ?? '—'}</td>
                    <td style={e.td}>{em.area ?? '—'}</td>
                    <td style={{ ...e.td, whiteSpace: 'nowrap', color: 'var(--texto-suave)' }}>{fecha(em.fecha_retiro)}</td>
                    <td style={{ ...e.td, textAlign: 'center' }}>{em.asistencias}</td>
                    <td style={{
                      ...e.td, textAlign: 'center', fontWeight: 600,
                      color: em.promedio === null ? 'var(--texto-tenue)'
                           : em.promedio >= 70 ? 'var(--bien)' : 'var(--mal)',
                    }}>
                      {em.promedio !== null ? `${em.promedio}%` : '—'}
                    </td>
                    <td style={{ ...e.td, whiteSpace: 'nowrap' }}>
                      <Link href={`/panel/empleados/${em.id}`} style={e.btnVer}>Ver</Link>
                      {esAdmin && (
                        confirmando === em.id ? (
                          <>
                            <button
                              onClick={() => reincorporar(em.id)}
                              disabled={pendiente}
                              style={{ ...e.btnMini, background: color, color: 'var(--superficie)', borderColor: color }}
                            >
                              {pendiente ? 'Un momento…' : 'Confirmar'}
                            </button>
                            <button onClick={() => setConfirmando(null)} style={e.btnMini}>
                              Cancelar
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => { setAviso(null); setConfirmando(em.id); }}
                            disabled={pendiente}
                            style={{ ...e.btnMini, color: 'var(--bien)' }}
                          >
                            Reincorporar
                          </button>
                        )
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}

const e: Record<string, React.CSSProperties> = {
  card: {
    background: 'var(--superficie)', border: '1px solid var(--borde)',
    borderRadius: 8, padding: 20,
  },
  intro: {
    fontSize: 12.5, color: 'var(--texto-suave)', margin: '0 0 16px',
    lineHeight: 1.5, maxWidth: 720,
  },
  aviso: {
    padding: '10px 12px', borderRadius: 6, fontSize: 12.5,
    margin: '0 0 14px',
  },
  barra: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    gap: 10, flexWrap: 'wrap', margin: '0 0 12px',
  },
  conteo: { fontSize: 12, color: 'var(--texto-suave)' },
  input: {
    border: '1px solid var(--borde-fuerte)', borderRadius: 6, padding: '8px 10px',
    fontSize: 13, fontFamily: 'inherit', color: 'var(--texto)', width: '100%',
  },
  th: {
    textAlign: 'left', fontSize: 10.5, letterSpacing: .6,
    textTransform: 'uppercase', color: 'var(--texto-tenue)', fontWeight: 600,
    padding: '0 8px 8px', borderBottom: '1px solid var(--borde)',
  },
  td: {
    padding: '10px 8px', borderBottom: '1px solid #F1F1EC',
    color: 'var(--texto)', verticalAlign: 'middle',
  },
  btnVer: {
    fontSize: 11.5, color: 'var(--texto)', textDecoration: 'none',
    border: '1px solid var(--borde-fuerte)', borderRadius: 4, padding: '4px 9px',
    marginRight: 6, background: 'var(--superficie)', display: 'inline-block',
  },
  btnMini: {
    fontSize: 11.5, color: 'var(--texto)', background: 'var(--superficie)',
    border: '1px solid var(--borde-fuerte)', borderRadius: 4, padding: '4px 9px',
    marginRight: 6, cursor: 'pointer', fontFamily: 'inherit',
  },
  vacio: {
    fontSize: 13, color: 'var(--texto-suave)', textAlign: 'center',
    padding: '28px 0', margin: 0,
  },
};
