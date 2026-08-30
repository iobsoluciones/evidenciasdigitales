'use client';

/**
 * LISTADO DE EVENTOS
 * ---------------------------------------------------------------
 * La columna que manda es el PLAZO. La Resolución 1401 da 15 días
 * calendario para investigar un accidente, y ese reloj es la única
 * cifra que decide qué se hace hoy. Por eso va en semáforo y ordena
 * la lectura antes que la fecha o el tipo.
 */
import { useState } from 'react';
import Link from 'next/link';
import type { EventoLista } from '@/lib/acciones-eventos';

const TIPOS: Record<string, string> = {
  accidente: 'Accidente',
  incidente: 'Incidente',
  casi_accidente: 'Casi accidente',
  enfermedad: 'Enfermedad laboral',
};

const ESTADOS: Record<string, { texto: string; fondo: string; color: string }> = {
  abierto: { texto: 'Sin investigar', fondo: '#FDF2F2', color: '#9B1C1C' },
  en_investigacion: { texto: 'En investigación', fondo: '#FFF7ED', color: '#9A3412' },
  cerrado: { texto: 'Cerrada', fondo: '#E6F4EA', color: '#1E6B3A' },
};

/** Semáforo del plazo legal. Es la señal principal de la pantalla. */
function plazo(e: EventoLista): { texto: string; fondo: string; color: string } {
  if (e.fecha_cierre) return { texto: 'Cumplido', fondo: '#E6F4EA', color: '#1E6B3A' };
  const d = e.dias_restantes;
  if (d === null) return { texto: '—', fondo: '#F0F0EC', color: '#5B6470' };
  if (d < 0) return { texto: `Vencido hace ${Math.abs(d)} d`, fondo: '#FDF2F2', color: '#9B1C1C' };
  if (d <= 3) return { texto: `Faltan ${d} d`, fondo: '#FDF2F2', color: '#9B1C1C' };
  if (d <= 7) return { texto: `Faltan ${d} d`, fondo: '#FFF7ED', color: '#9A3412' };
  return { texto: `Faltan ${d} d`, fondo: '#E6F4EA', color: '#1E6B3A' };
}

const fmt = (iso: string) =>
  new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });

export default function VistaEventos({
  eventos,
  color,
}: {
  eventos: EventoLista[];
  color: string;
}) {
  const [filtro, setFiltro] = useState<'todos' | 'pendientes' | 'vencidos'>('todos');
  const [buscar, setBuscar] = useState('');

  const vencidos = eventos.filter((e) => e.investigacion_vencida).length;
  const pendientes = eventos.filter((e) => !e.fecha_cierre).length;
  const sinReportarArl = eventos.filter(
    (e) => e.tipo === 'accidente' && !e.reportado_arl
  ).length;

  const q = buscar.trim().toLowerCase();
  const lista = eventos
    .filter((e) =>
      filtro === 'vencidos' ? e.investigacion_vencida
      : filtro === 'pendientes' ? !e.fecha_cierre
      : true
    )
    .filter((e) =>
      !q ||
      e.codigo.toLowerCase().includes(q) ||
      e.descripcion.toLowerCase().includes(q) ||
      (e.nombres ?? '').toLowerCase().includes(q)
    );

  return (
    <>
      <div style={s.tarjetas}>
        <Tarjeta n={eventos.length} t="Eventos registrados" c={color} />
        <Tarjeta n={pendientes} t="Sin cerrar" c={pendientes ? '#9A3412' : color} />
        <Tarjeta n={vencidos} t="Fuera del plazo de 15 días" c={vencidos ? '#9B1C1C' : color} />
        <Tarjeta n={sinReportarArl} t="Accidentes sin reportar a la ARL" c={sinReportarArl ? '#9B1C1C' : color} />
      </div>

      {sinReportarArl > 0 && (
        <div style={s.alerta}>
          Hay <strong>{sinReportarArl} accidente(s) sin marcar como reportados a la ARL</strong>.
          El plazo legal es de <strong>2 días hábiles</strong> desde que ocurre el hecho
          (Decreto 1072, art. 2.2.4.1.7).
        </div>
      )}

      <div style={s.controles}>
        <input
          value={buscar}
          onChange={(ev) => setBuscar(ev.target.value)}
          placeholder="Buscar por código, persona o descripción"
          style={s.buscador}
        />
        <div style={s.filtros}>
          {([
            ['todos', 'Todos'],
            ['pendientes', 'Sin cerrar'],
            ['vencidos', 'Vencidos'],
          ] as const).map(([v, t]) => (
            <button
              key={v}
              onClick={() => setFiltro(v)}
              style={{
                ...s.filtro,
                ...(filtro === v ? { background: color, color: '#fff', borderColor: color } : {}),
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {lista.length === 0 ? (
        <p style={s.vacio}>
          {eventos.length === 0
            ? 'Todavía no hay eventos registrados. Registra el primero cuando ocurra: el plazo de investigación corre desde el día del hecho, no desde el día del registro.'
            : 'Ningún evento coincide con el filtro.'}
        </p>
      ) : (
        <div style={s.contenedor}>
          <table style={s.tabla}>
            <thead>
              <tr>
                {['Código', 'Tipo', 'Persona', 'Fecha', 'Plazo', 'Estado', 'Acciones', ''].map((h, i) => (
                  <th key={i} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lista.map((e) => {
                const p = plazo(e);
                const est = ESTADOS[e.estado] ?? ESTADOS.abierto;
                return (
                  <tr key={e.id}>
                    <td style={s.td}>
                      <span style={s.codigo}>{e.codigo}</span>
                      {(e.mortal || e.grave) && (
                        <div style={s.gravedad}>{e.mortal ? 'MORTAL' : 'GRAVE'}</div>
                      )}
                    </td>
                    <td style={s.td}>{TIPOS[e.tipo] ?? e.tipo}</td>
                    <td style={s.td}>
                      {e.nombres ?? '—'}
                      <div style={s.meta}>{e.area ?? ''}</div>
                    </td>
                    <td style={s.td}>{fmt(e.fecha_evento)}</td>
                    <td style={s.td}>
                      <span style={{ ...s.chip, background: p.fondo, color: p.color }}>{p.texto}</span>
                    </td>
                    <td style={s.td}>
                      <span style={{ ...s.chip, background: est.fondo, color: est.color }}>{est.texto}</span>
                    </td>
                    <td style={s.td}>
                      {e.acciones > 0 ? `${e.acciones}` : '—'}
                      <div style={s.meta}>
                        {e.causas_basicas > 0 ? `${e.causas_basicas} causa(s)` : 'sin causas'}
                      </div>
                    </td>
                    <td style={s.td}>
                      <Link href={`/panel/eventos/${e.id}`} style={s.enlace}>
                        {e.fecha_cierre ? 'Ver' : 'Investigar'}
                      </Link>
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

function Tarjeta({ n, t, c }: { n: number; t: string; c: string }) {
  return (
    <div style={s.tarjeta}>
      <span style={{ ...s.tarjetaN, color: c }}>{n}</span>
      <span style={s.tarjetaT}>{t}</span>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  tarjetas: {
    display: 'grid', gap: 10, marginBottom: 16,
    gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))',
  },
  tarjeta: {
    background: '#fff', border: '1px solid #E4E4DF', borderRadius: 10,
    padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 2,
  },
  tarjetaN: { fontSize: 24, fontWeight: 700, lineHeight: 1.1, fontVariantNumeric: 'tabular-nums' },
  tarjetaT: { fontSize: 11.5, color: '#5B6470', lineHeight: 1.4 },

  alerta: {
    background: '#FDF2F2', border: '1px solid #F5C6C6', color: '#9B1C1C',
    borderRadius: 9, padding: '11px 14px', fontSize: 13, lineHeight: 1.6,
    marginBottom: 16,
  },

  controles: {
    display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center',
  },
  buscador: {
    flex: '1 1 240px', padding: '9px 12px', border: '1px solid #E4E4DF',
    borderRadius: 8, fontSize: 13.5, boxSizing: 'border-box',
  },
  filtros: { display: 'flex', gap: 6 },
  filtro: {
    border: '1px solid #E4E4DF', background: '#fff', color: '#5B6470',
    padding: '8px 14px', borderRadius: 8, fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
  },

  vacio: {
    fontSize: 13.5, color: '#5B6470', lineHeight: 1.65, background: '#fff',
    border: '1px solid #E4E4DF', borderRadius: 10, padding: '18px 20px', maxWidth: 620,
  },
  contenedor: {
    background: '#fff', border: '1px solid #E4E4DF', borderRadius: 10, overflowX: 'auto',
  },
  tabla: { width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 820 },
  th: {
    textAlign: 'left', padding: '10px 12px', background: '#F7F7F4', color: '#5B6470',
    fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: .4,
    borderBottom: '1px solid #E4E4DF', whiteSpace: 'nowrap',
  },
  td: { padding: '10px 12px', borderBottom: '1px solid #F0F0EC', verticalAlign: 'top' },
  codigo: { fontFamily: "'Consolas','Courier New',monospace", fontWeight: 600 },
  gravedad: {
    fontSize: 9.5, fontWeight: 700, color: '#9B1C1C', letterSpacing: .5, marginTop: 3,
  },
  meta: { fontSize: 11, color: '#8A929C', marginTop: 2 },
  chip: {
    display: 'inline-block', padding: '3px 9px', borderRadius: 20,
    fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap',
  },
  enlace: {
    display: 'inline-block', border: '1px solid #E4E4DF', borderRadius: 7,
    padding: '5px 13px', fontSize: 12, fontWeight: 600,
    color: '#14263F', textDecoration: 'none', whiteSpace: 'nowrap',
  },
};
