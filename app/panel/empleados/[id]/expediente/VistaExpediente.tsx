'use client';

/**
 * EXPEDIENTE DEL EMPLEADO
 * ---------------------------------------------------------------
 * Une formación, dotación y equipos en una sola vista.
 *
 * Ningún módulo por separado responde la pregunta que hace un auditor:
 * «¿esta persona está al día?». Capacitaciones sabe si asistió,
 * dotación sabe si recibió el casco, pero solo el cruce dice si está
 * habilitada para el puesto.
 *
 * Por eso lo primero de la pantalla es un veredicto, no una tabla.
 */
import Link from 'next/link';
import type { Expediente, EstadoDotacion } from '@/lib/acciones-expediente';

const TONO: Record<EstadoDotacion, { fondo: string; texto: string; t: string }> = {
  vigente: { fondo: '#DCFCE7', texto: '#15803D', t: 'Vigente' },
  por_vencer: { fondo: '#FEF9C3', texto: '#8A6100', t: 'Por vencer' },
  vencido: { fondo: '#FEE2E2', texto: '#9B1C1C', t: 'Vencido' },
  sin_vencimiento: { fondo: '#F0F9FF', texto: '#0369A1', t: 'Sin vencimiento' },
  nunca: { fondo: '#F4F4F0', texto: '#8A929C', t: 'No entregado' },
};

export default function VistaExpediente({
  expediente,
  color,
}: {
  expediente: Expediente;
  color: string;
}) {
  const e = expediente.empleado!;
  const cap = expediente.capacitaciones!;
  const dotacion = expediente.dotacion ?? [];
  const equipos = expediente.equipos ?? [];
  const entregas = expediente.entregas ?? [];

  const fmt = (iso: string | null) =>
    iso ? new Date(iso.length <= 10 ? iso + 'T12:00:00' : iso)
      .toLocaleDateString('es-CO', { dateStyle: 'medium' }) : '—';

  // El veredicto: qué le falta a esta persona para estar al día
  const vencidos = dotacion.filter((d) => d.estado === 'vencido').length;
  const porVencer = dotacion.filter((d) => d.estado === 'por_vencer').length;
  const pendientes: string[] = [];

  if (vencidos > 0) pendientes.push(`${vencidos} elemento(s) de dotación vencidos`);
  if (cap.pendientes > 0) pendientes.push(`${cap.pendientes} capacitación(es) convocadas sin asistir`);
  if (cap.reprobadas > 0) pendientes.push(`${cap.reprobadas} evaluación(es) reprobadas`);
  if (cap.debiles.length > 0) pendientes.push(`${cap.debiles.length} tema(s) por reforzar`);

  const alDia = pendientes.length === 0 && vencidos === 0;

  return (
    <>
      <div style={s.cabecera}>
        <div>
          <h1 style={s.titulo}>{e.nombres}</h1>
          <p style={s.sub}>
            <span style={s.mono}>{e.identificacion}</span>
            {e.cargo && <> · {e.cargo}</>}
            {e.area && <> · {e.area}</>}
            {e.ciudad && <> · {e.ciudad}</>}
          </p>
        </div>
        {!e.activo && <span style={s.chipInactivo}>Retirado</span>}
      </div>

      {/* ---------- El veredicto ---------- */}
      <section style={{
        ...s.veredicto,
        background: alDia ? '#F0FDF4' : '#FEFCE8',
        borderColor: alDia ? '#BBF7D0' : '#FDE68A',
      }}>
        <div style={{ fontSize: 24 }}>{alDia ? '✓' : '!'}</div>
        <div style={{ flex: 1, minWidth: 220 }}>
          <strong style={{
            fontSize: 14.5,
            color: alDia ? '#15803D' : '#8A6100',
          }}>
            {alDia ? 'Al día' : 'Requiere atención'}
          </strong>
          {pendientes.length > 0 && (
            <ul style={s.listaPendientes}>
              {pendientes.map((p, i) => <li key={i}>{p}</li>)}
            </ul>
          )}
          {alDia && (
            <p style={s.notaVeredicto}>
              Dotación vigente, sin capacitaciones pendientes y sin temas por reforzar.
            </p>
          )}
        </div>
      </section>

      {/* ---------- Indicadores ---------- */}
      <div style={s.kpis}>
        <Kpi v={String(cap.asistidas)} l="Capacitaciones" color={color} />
        <Kpi
          v={cap.promedio !== null ? `${cap.promedio}%` : '—'}
          l="Promedio"
          color={cap.promedio === null ? undefined : cap.promedio >= 70 ? '#15803D' : '#9B1C1C'}
        />
        <Kpi v={String(dotacion.length)} l="Dotación recibida" />
        <Kpi v={String(vencidos)} l="Vencidos" color={vencidos > 0 ? '#9B1C1C' : undefined} />
        <Kpi v={String(equipos.length)} l="Equipos en uso" color={equipos.length > 0 ? '#0369A1' : undefined} />
      </div>

      <div style={s.dos}>
        {/* ---------- Formación ---------- */}
        <section style={s.card}>
          <div style={s.cabeceraSeccion}>
            <h2 style={s.h2}>Formación</h2>
            <Link href={`/panel/empleados/${e.id}`} style={s.enlace}>
              Ver detalle →
            </Link>
          </div>

          <dl style={{ margin: 0 }}>
            <Fila k="Capacitaciones asistidas" v={String(cap.asistidas)} />
            <Fila k="Última" v={fmt(cap.ultima)} />
            <Fila
              k="Convocadas sin asistir"
              v={String(cap.pendientes)}
              alerta={cap.pendientes > 0}
            />
            <Fila
              k="Evaluaciones reprobadas"
              v={String(cap.reprobadas)}
              alerta={cap.reprobadas > 0}
            />
          </dl>

          {cap.debiles.length > 0 && (
            <div style={s.debiles}>
              <strong style={{ fontSize: 12 }}>Temas por reforzar</strong>
              {cap.debiles.map((d, i) => (
                <div key={i} style={s.filaDebil}>
                  <span>{d.subtema}</span>
                  <span style={{ fontWeight: 700, color: '#9B1C1C' }}>{d.aciertos}%</span>
                </div>
              ))}
              <p style={s.notaDebiles}>
                Por debajo del 70% de acierto. Refuerza el tema concreto, no el
                curso completo.
              </p>
            </div>
          )}
        </section>

        {/* ---------- Equipos ---------- */}
        <section style={s.card}>
          <h2 style={s.h2}>Equipos en su poder ({equipos.length})</h2>

          {equipos.length === 0 ? (
            <p style={s.vacio}>Sin equipos asignados.</p>
          ) : (
            <>
              {equipos.map((q, i) => (
                <div key={i} style={s.equipo}>
                  <div style={{ flex: 1 }}>
                    <strong style={{ fontSize: 12.5 }}>{q.articulo}</strong>
                    <div style={s.metaEquipo}>
                      <span style={s.mono}>{q.placa}</span>
                      {q.serial && <> · {q.serial}</>}
                    </div>
                    <div style={s.metaEquipo}>
                      Desde {fmt(q.desde)} · {q.dias} días
                      {q.estado_entrega && ` · entregado ${q.estado_entrega}`}
                    </div>
                  </div>
                  {q.valor && (
                    <span style={s.valor}>
                      ${Number(q.valor).toLocaleString('es-CO')}
                    </span>
                  )}
                </div>
              ))}
              <Link href="/panel/dotacion/devoluciones" style={s.enlace}>
                Registrar devolución →
              </Link>
            </>
          )}
        </section>
      </div>

      {/* ---------- Dotación ---------- */}
      <section style={s.card}>
        <div style={s.cabeceraSeccion}>
          <h2 style={s.h2}>Dotación vigente ({dotacion.length})</h2>
          <Link href="/panel/dotacion/entregas/nueva" style={s.enlace}>
            Nueva entrega →
          </Link>
        </div>

        {dotacion.length === 0 ? (
          <p style={s.vacio}>Sin elementos de protección entregados.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
              <thead>
                <tr>
                  {['Elemento', 'Cant.', 'Talla', 'Vence', 'Estado', 'Acta'].map((h) => (
                    <th key={h} style={s.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dotacion.map((d, i) => {
                  const tono = TONO[d.estado];
                  return (
                    <tr key={i}>
                      <td style={s.td}>
                        <div style={{ display: 'flex', gap: 9, alignItems: 'center' }}>
                          {d.foto_url && <img src={d.foto_url} alt="" style={s.miniatura} />}
                          <div>
                            <strong>{d.articulo}</strong>
                            <div style={s.codigoArt}>{d.codigo}</div>
                          </div>
                        </div>
                      </td>
                      <td style={s.td}>{d.cantidad}</td>
                      <td style={s.td}>{d.talla ?? '—'}</td>
                      <td style={s.td}>{fmt(d.fecha_vence)}</td>
                      <td style={s.td}>
                        <span style={{
                          ...s.chip,
                          background: tono.fondo,
                          color: tono.texto,
                        }}>
                          {tono.t}
                          {d.dias !== null && d.estado !== 'vigente' && (
                            d.dias < 0 ? ` hace ${Math.abs(d.dias)}d` : ` en ${d.dias}d`
                          )}
                        </span>
                      </td>
                      <td style={{ ...s.td, ...s.mono }}>{d.entrega}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {porVencer > 0 && (
          <p style={s.avisoVencer}>
            {porVencer} elemento(s) vencen en menos de 30 días. Prepara la
            reposición antes de la fecha.
          </p>
        )}
      </section>

      {/* ---------- Historial de entregas ---------- */}
      {entregas.length > 0 && (
        <section style={s.card}>
          <h2 style={s.h2}>Actas de entrega ({entregas.length})</h2>
          <div style={s.actas}>
            {entregas.map((a) => (
              <Link key={a.id} href={`/panel/dotacion/entregas/${a.id}`} style={s.acta}>
                <span style={s.mono}>{a.codigo}</span>
                <span style={s.fechaActa}>{fmt(a.fecha)}</span>
                <span style={s.itemsActa}>{a.items} elemento(s)</span>
                {a.estado === 'borrador' && (
                  <span style={{ ...s.chip, background: '#FEF9C3', color: '#8A6100' }}>
                    Sin firmar
                  </span>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}
    </>
  );
}

function Kpi({ v, l, color }: { v: string; l: string; color?: string }) {
  return (
    <div style={s.kpi}>
      <div style={{ fontSize: 21, fontWeight: 700, color: color ?? '#14263F' }}>{v}</div>
      <div style={s.kpiL}>{l}</div>
    </div>
  );
}

function Fila({ k, v, alerta }: { k: string; v: string; alerta?: boolean }) {
  return (
    <div style={s.fila}>
      <dt style={s.clave}>{k}</dt>
      <dd style={{ ...s.valorFila, color: alerta ? '#9B1C1C' : '#14263F' }}>{v}</dd>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  cabecera: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    gap: 14, flexWrap: 'wrap', marginTop: 12, marginBottom: 18,
  },
  titulo: { fontSize: 22, margin: '0 0 3px', letterSpacing: -0.4 },
  sub: { fontSize: 13, color: '#5B6470', margin: 0 },
  mono: { fontFamily: 'ui-monospace,SFMono-Regular,Menlo,monospace', fontSize: 11.5 },
  chipInactivo: {
    fontSize: 11, fontWeight: 600, padding: '5px 12px', borderRadius: 999,
    background: '#FEE2E2', color: '#9B1C1C',
  },

  veredicto: {
    display: 'flex', gap: 14, alignItems: 'flex-start',
    borderWidth: 1, borderStyle: 'solid', borderRadius: 8,
    padding: 18, marginBottom: 18, flexWrap: 'wrap',
  },
  listaPendientes: {
    margin: '6px 0 0', paddingLeft: 18, fontSize: 12.5,
    color: '#8A6100', lineHeight: 1.8,
  },
  notaVeredicto: { fontSize: 12.5, color: '#15803D', margin: '4px 0 0' },

  kpis: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(118px,1fr))', gap: 12, marginBottom: 18 },
  kpi: {
    background: '#fff', borderWidth: 1, borderStyle: 'solid', borderColor: '#E4E4DF',
    borderRadius: 8, padding: 14, textAlign: 'center',
  },
  kpiL: { fontSize: 10.5, color: '#8A929C', textTransform: 'uppercase', letterSpacing: .3, marginTop: 2 },

  dos: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 16, alignItems: 'start' },
  card: {
    background: '#fff', borderWidth: 1, borderStyle: 'solid', borderColor: '#E4E4DF',
    borderRadius: 8, padding: 20, marginBottom: 16,
  },
  cabeceraSeccion: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
    gap: 12, flexWrap: 'wrap', marginBottom: 12,
  },
  h2: { fontSize: 14.5, margin: 0, fontWeight: 600 },
  enlace: { fontSize: 11.5, color: '#5B6470', textDecoration: 'none' },

  fila: {
    display: 'flex', justifyContent: 'space-between', gap: 12,
    padding: '7px 0', borderBottom: '1px solid #F4F4F0', fontSize: 12.5,
  },
  clave: { color: '#8A929C', margin: 0 },
  valorFila: { margin: 0, fontWeight: 600, textAlign: 'right' },

  debiles: {
    marginTop: 14, padding: 12, background: '#FEFCE8', borderRadius: 6,
  },
  filaDebil: {
    display: 'flex', justifyContent: 'space-between',
    fontSize: 12, padding: '4px 0', color: '#8A6100',
  },
  notaDebiles: { fontSize: 11, color: '#8A6100', margin: '6px 0 0', lineHeight: 1.55 },

  equipo: {
    display: 'flex', gap: 10, alignItems: 'flex-start',
    padding: '10px 0', borderBottom: '1px solid #F4F4F0',
  },
  metaEquipo: { fontSize: 11, color: '#8A929C', marginTop: 2 },
  valor: { fontSize: 11.5, fontWeight: 600, color: '#0369A1', whiteSpace: 'nowrap' },

  th: {
    background: '#F7F7F4', color: '#8A929C', fontSize: 10.5, textTransform: 'uppercase',
    padding: '8px', textAlign: 'left', borderBottom: '1px solid #E4E4DF',
  },
  td: { padding: '9px 8px', borderBottom: '1px solid #F4F4F0', verticalAlign: 'middle' },
  miniatura: { width: 32, height: 32, objectFit: 'contain', background: '#FBFBF9', borderRadius: 3 },
  codigoArt: { fontSize: 10, color: '#A3AAB3', fontFamily: 'ui-monospace,monospace' },
  chip: { fontSize: 10.5, fontWeight: 600, padding: '3px 9px', borderRadius: 999, whiteSpace: 'nowrap' },
  avisoVencer: {
    fontSize: 12, color: '#8A6100', marginTop: 12,
    padding: '10px 12px', background: '#FEFCE8', borderRadius: 6,
  },

  actas: { display: 'grid', gap: 6 },
  acta: {
    display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap',
    padding: '9px 12px', background: '#FBFBF9', borderRadius: 5,
    textDecoration: 'none', color: '#14263F', fontSize: 12.5,
  },
  fechaActa: { color: '#5B6470' },
  itemsActa: { color: '#8A929C', fontSize: 11.5, marginLeft: 'auto' },

  vacio: { fontSize: 12.5, color: '#8A929C', margin: 0, padding: '16px 0', textAlign: 'center' },
};
