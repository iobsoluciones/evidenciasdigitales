'use client';

/**
 * INDICADORES DE INSPECCIONES
 * ---------------------------------------------------------------
 * Lo que ninguna hoja de cálculo produce: los hallazgos recurrentes.
 * Ese bloque va destacado porque es el que revela problemas de fondo,
 * no incidentes aislados.
 */
import Link from 'next/link';
import { BarrasHorizontales, Columnas, Panel } from '@/lib/graficos';
import type { Indicadores } from '@/lib/acciones-indicadores-inspeccion';

const TIPOS: Record<string, string> = {
  planeada: 'Planeadas', area: 'De área', equipo: 'De equipo', auditoria: 'Auditorías',
};

export default function VistaIndicadores({
  datos,
  color,
}: {
  datos: Indicadores;
  color: string;
}) {
  const r = datos.resumen;
  const ac = datos.acciones;

  const pctCumplimiento = r.cerradas > 0
    ? Math.round((r.cumplen / r.cerradas) * 100)
    : null;

  const fmt = (iso: string) =>
    new Date(iso + 'T12:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });

  return (
    <>
      {/* ---------- KPIs ---------- */}
      <div style={e.kpis}>
        <Kpi v={String(r.total)} l="Inspecciones" color={color} />
        <Kpi
          v={pctCumplimiento !== null ? `${pctCumplimiento}%` : '—'}
          l="Cumplimiento"
          color={pctCumplimiento === null ? undefined : pctCumplimiento >= 80 ? 'var(--bien)' : pctCumplimiento >= 50 ? 'var(--ambar)' : 'var(--mal)'}
        />
        <Kpi
          v={r.puntaje_promedio !== null ? `${r.puntaje_promedio}%` : '—'}
          l="Puntaje medio"
        />
        <Kpi v={String(ac.vencidas)} l="Acciones vencidas" color={ac.vencidas > 0 ? 'var(--mal)' : undefined} />
        <Kpi v={String(ac.abiertas)} l="Acciones abiertas" color={ac.abiertas > 0 ? 'var(--info)' : undefined} />
      </div>

      {r.total === 0 ? (
        <div style={e.vacio}>
          <p style={{ margin: '0 0 6px', fontSize: 14, fontWeight: 600 }}>
            Sin inspecciones en el periodo
          </p>
          <p style={{ margin: 0, fontSize: 12.5, color: 'var(--texto-suave)' }}>
            Los indicadores aparecen cuando cierres tu primera inspección.
          </p>
        </div>
      ) : (
        <>
          {/* ---------- Hallazgos recurrentes: lo más valioso ---------- */}
          <Panel
            titulo="Hallazgos recurrentes"
            descripcion="Mismo criterio incumplido dos o más veces. Es lo que revela un problema de fondo, no un incidente aislado."
          >
            {datos.recurrentes.length === 0 ? (
              <p style={e.sinDatos}>
                Ningún criterio se ha incumplido más de una vez. Buena señal.
              </p>
            ) : (
              <div style={e.recurrentes}>
                {datos.recurrentes.map((h, i) => (
                  <div key={i} style={e.recurrente}>
                    <div style={{
                      ...e.vecesBadge,
                      background: h.veces >= 3 ? 'var(--mal-fondo)' : 'var(--ambar-fondo)',
                      color: h.veces >= 3 ? 'var(--mal)' : 'var(--ambar)',
                    }}>
                      {h.veces}×
                    </div>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: 12.5 }}>{h.criterio}</span>
                      {h.critico && <span style={e.critico}>crítico</span>}
                      <div style={e.ultima}>Último: {fmt(h.ultima)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <div style={e.dos}>
            {/* ---------- Cumplimiento por tipo ---------- */}
            <Panel titulo="Cumplimiento por tipo">
              <BarrasHorizontales
                color={color}
                vacio="Sin inspecciones cerradas."
                datos={datos.por_tipo.map((t) => ({
                  etiqueta: TIPOS[t.tipo] ?? t.tipo,
                  valor: t.pct,
                }))}
              />
              <p style={e.notaPanel}>Porcentaje de inspecciones que cumplen, por tipo.</p>
            </Panel>

            {/* ---------- Objetos con más hallazgos ---------- */}
            <Panel titulo="Dónde se concentran los hallazgos">
              <BarrasHorizontales
                color="var(--mal)"
                vacio="Sin hallazgos en el periodo."
                datos={datos.objetos.map((o) => ({
                  etiqueta: o.objeto,
                  valor: o.hallazgos,
                }))}
              />
              <p style={e.notaPanel}>Número de incumplimientos por área o equipo.</p>
            </Panel>
          </div>

          {/* ---------- Tendencia mensual ---------- */}
          <Panel
            titulo="Tendencia mensual"
            descripcion="Inspecciones cerradas por mes. La tendencia importa más que el dato de un mes suelto."
          >
            <Columnas
              color={color}
              datos={datos.tendencia.map((t) => ({ mes: t.mes, valor: t.total }))}
            />
          </Panel>

          {/* ---------- Estado del plan de acción ---------- */}
          <Panel titulo="Plan de acción">
            <div style={e.accionesResumen}>
              <ItemAccion n={ac.abiertas} etiqueta="Abiertas" tono="var(--info)" />
              <ItemAccion n={ac.vencidas} etiqueta="Vencidas" tono="var(--mal)" />
              <ItemAccion n={ac.cerradas} etiqueta="Cerradas" tono="var(--bien)" />
              <ItemAccion
                n={ac.dias_cierre_promedio ?? 0}
                etiqueta="Días promedio de cierre"
                tono="var(--texto-suave)"
                sufijo={ac.dias_cierre_promedio !== null ? 'd' : ''}
              />
            </div>
            <Link href="/panel/acciones" style={{ ...e.enlace, color }}>
              Ver el plan de acción completo →
            </Link>
          </Panel>
        </>
      )}
    </>
  );
}

function Kpi({ v, l, color }: { v: string; l: string; color?: string }) {
  return (
    <div style={e.kpi}>
      <div style={{ fontSize: 22, fontWeight: 700, color: color ?? 'var(--texto)' }}>{v}</div>
      <div style={e.kpiL}>{l}</div>
    </div>
  );
}

function ItemAccion({ n, etiqueta, tono, sufijo }: {
  n: number; etiqueta: string; tono: string; sufijo?: string;
}) {
  return (
    <div style={e.itemAccion}>
      <span style={{ fontSize: 20, fontWeight: 700, color: tono }}>
        {n}{sufijo ?? ''}
      </span>
      <span style={e.itemAccionL}>{etiqueta}</span>
    </div>
  );
}

const e: Record<string, React.CSSProperties> = {
  kpis: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))', gap: 12, marginBottom: 18 },
  kpi: {
    background: 'var(--superficie)', borderWidth: 1, borderStyle: 'solid', borderColor: 'var(--borde)',
    borderRadius: 8, padding: 14, textAlign: 'center',
  },
  kpiL: { fontSize: 10.5, color: 'var(--texto-tenue)', textTransform: 'uppercase', letterSpacing: .3, marginTop: 2 },

  vacio: {
    background: 'var(--superficie)', borderWidth: 1, borderStyle: 'dashed', borderColor: 'var(--borde-fuerte)',
    borderRadius: 8, padding: '40px 24px', textAlign: 'center',
  },
  sinDatos: { fontSize: 12.5, color: 'var(--bien)', margin: 0, padding: '6px 0' },

  recurrentes: { display: 'grid', gap: 8 },
  recurrente: {
    display: 'flex', gap: 12, alignItems: 'center',
    padding: '10px 12px', background: 'var(--superficie-2)', borderRadius: 6,
  },
  vecesBadge: {
    minWidth: 40, height: 36, borderRadius: 6, display: 'flex',
    alignItems: 'center', justifyContent: 'center',
    fontSize: 14, fontWeight: 700, flexShrink: 0,
  },
  critico: {
    fontSize: 9, color: 'var(--mal)', marginLeft: 8,
    textTransform: 'uppercase', letterSpacing: .4, fontWeight: 700,
  },
  ultima: { fontSize: 10.5, color: 'var(--texto-tenue)', marginTop: 2 },

  dos: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 0, columnGap: 20 },
  notaPanel: { fontSize: 11, color: 'var(--texto-tenue)', margin: '12px 0 0' },

  accionesResumen: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))',
    gap: 12, marginBottom: 14,
  },
  itemAccion: {
    display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center',
    padding: '12px 8px', background: 'var(--superficie-2)', borderRadius: 6, textAlign: 'center',
  },
  itemAccionL: { fontSize: 10.5, color: 'var(--texto-tenue)', textTransform: 'uppercase', letterSpacing: .3 },
  enlace: { fontSize: 12.5, fontWeight: 600, textDecoration: 'none' },
};
