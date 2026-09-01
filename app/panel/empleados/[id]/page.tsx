/**
 * FICHA DEL EMPLEADO
 * ---------------------------------------------------------------
 * La pregunta que responde: en qué temas necesita refuerzo ESTA
 * persona. Con eso se puede reforzar el tema concreto en vez de
 * repetirle el curso completo.
 */
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { obtenerFichaEmpleado } from '@/lib/acciones-ficha';
import { empresaActiva } from '@/lib/empresa-activa';
import { BarrasHorizontales, Columnas, Panel } from '@/lib/graficos';

export default async function PaginaFichaEmpleado({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ficha = await obtenerFichaEmpleado(id, 12);
  const empresa = await empresaActiva();

  if (!ficha.ok || !ficha.empleado) notFound();

  const e = ficha.empleado;
  const t = ficha.totales!;
  const color = empresa?.color_primario ?? '#14263F';

  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString('es-CO', { dateStyle: 'medium' });

  // Los subtemas llegan ordenados de menor a mayor acierto: el primero
  // es donde más falla esta persona.
  const debiles = (ficha.porSubtema ?? []).filter((s) => s.aciertos_pct < 70);

  return (
    <>
      <Link href="/panel/empleados" style={s.volver}>← Empleados</Link>

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
      </div>

      {/* ---------- Indicadores ---------- */}
      <div style={s.kpis}>
        <Kpi v={String(t.asistencias)} l="Capacitaciones" color={color} />
        <Kpi v={String(t.evaluadas)} l="Evaluadas" />
        <Kpi
          v={t.promedio !== null ? `${t.promedio}%` : '—'}
          l="Promedio"
          color={t.promedio === null ? undefined : t.promedio >= 70 ? 'var(--bien)' : 'var(--mal)'}
        />
        <Kpi v={String(t.aprobadas)} l="Aprobadas" color="var(--bien)" />
        <Kpi v={String(t.reprobadas)} l="Reprobadas" color={t.reprobadas > 0 ? 'var(--mal)' : undefined} />
        <Kpi v={String(t.conReintento)} l="Con reintento" />
      </div>

      {/* ---------- Dónde reforzar ---------- */}
      {debiles.length > 0 && (
        <section style={s.alerta}>
          <strong style={{ fontSize: 13 }}>Temas por reforzar</strong>
          <p style={s.alertaTexto}>
            Por debajo del 70% de acierto:{' '}
            {debiles.map((d) => `${d.etiqueta} (${d.aciertos_pct}%)`).join(', ')}.
          </p>
        </section>
      )}

      <div style={s.dos}>
        <Panel
          titulo="Capacitaciones por mes"
          descripcion="Asistencias registradas en cada mes."
        >
          <Columnas datos={ficha.porMes ?? []} color={color} />
        </Panel>

        <Panel
          titulo="Desempeño por tema"
          descripcion="De menor a mayor acierto: lo primero es donde reforzar."
        >
          <BarrasHorizontales
            datos={(ficha.porSubtema ?? []).map((x) => ({
              etiqueta: x.etiqueta,
              valor: x.aciertos_pct,
            }))}
            color="#0ea5e9"
            vacio="Aún no ha respondido evaluaciones."
          />
        </Panel>
      </div>

      {/* ---------- Historial ---------- */}
      <section style={s.card}>
        <h2 style={s.h2}>Historial ({ficha.historial?.length ?? 0})</h2>

        {(ficha.historial?.length ?? 0) === 0 ? (
          <p style={s.vacio}>Aún no ha asistido a ninguna capacitación.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
              <thead>
                <tr>
                  {['Código', 'Tema', 'Fecha', 'Instructor', 'Puntaje', 'Estado'].map((h) => (
                    <th key={h} style={s.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ficha.historial!.map((h) => (
                  <tr key={h.id}>
                    <td style={{ ...s.td, ...s.mono }}>
                      <Link href={`/panel/capacitaciones/${h.id}`} style={{ color: 'var(--texto-suave)' }}>
                        {h.codigo}
                      </Link>
                    </td>
                    <td style={s.td}>{h.tema}</td>
                    <td style={s.td}>{fmt(h.fecha)}</td>
                    <td style={s.td}>{h.instructor}</td>
                    <td style={{
                      ...s.td, fontWeight: 600,
                      color: h.puntaje === null ? 'var(--texto-tenue)'
                           : h.puntaje >= 70 ? 'var(--bien)' : 'var(--mal)',
                    }}>
                      {h.puntaje !== null ? `${h.puntaje}%` : '—'}
                      {h.intentos > 1 && (
                        <span style={s.reintento}> · {h.intentos} intentos</span>
                      )}
                    </td>
                    <td style={s.td}>
                      {h.aprobo === null
                        ? <span style={{ color: 'var(--texto-tenue)' }}>Sin evaluar</span>
                        : h.aprobo
                        ? <span style={{ color: 'var(--bien)', fontWeight: 600 }}>Aprobó</span>
                        : <span style={{ color: 'var(--mal)', fontWeight: 600 }}>Reprobó</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
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

const s: Record<string, React.CSSProperties> = {
  volver: { fontSize: 13, color: 'var(--texto-suave)', textDecoration: 'none' },
  cabecera: { marginTop: 12, marginBottom: 18 },
  titulo: { fontSize: 22, margin: '0 0 3px', letterSpacing: -0.4 },
  sub: { fontSize: 13, color: 'var(--texto-suave)', margin: 0 },
  mono: { fontFamily: 'ui-monospace,SFMono-Regular,Menlo,monospace', fontSize: 12 },

  kpis: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(118px,1fr))', gap: 12, marginBottom: 18 },
  kpi: { background: 'var(--superficie)', border: '1px solid var(--borde)', borderRadius: 8, padding: 14, textAlign: 'center' },
  kpiL: { fontSize: 10.5, color: 'var(--texto-tenue)', textTransform: 'uppercase', letterSpacing: .3, marginTop: 2 },

  alerta: {
    background: 'var(--ambar-fondo)', border: '1px solid var(--ambar-fondo)', borderRadius: 8,
    padding: '14px 16px', marginBottom: 18,
  },
  alertaTexto: { fontSize: 12.5, color: 'var(--ambar)', margin: '5px 0 0', lineHeight: 1.5 },

  dos: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(310px,1fr))', gap: 18 },

  card: { background: 'var(--superficie)', border: '1px solid var(--borde)', borderRadius: 8, padding: 20, marginTop: 4 },
  h2: { fontSize: 14.5, margin: '0 0 14px', fontWeight: 600 },
  th: {
    background: 'var(--fondo)', color: 'var(--texto-tenue)', fontSize: 10.5, textTransform: 'uppercase',
    padding: '8px', textAlign: 'left', borderBottom: '1px solid var(--borde)',
  },
  td: { padding: '9px 8px', borderBottom: '1px solid var(--superficie-3)' },
  reintento: { fontSize: 10.5, color: 'var(--ambar)', fontWeight: 400 },
  vacio: { fontSize: 12.5, color: 'var(--texto-tenue)', textAlign: 'center', padding: '24px 0', margin: 0 },
};
