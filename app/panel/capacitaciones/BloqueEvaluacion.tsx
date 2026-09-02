/**
 * BLOQUE DE EVALUACIÓN EN EL DETALLE
 * ---------------------------------------------------------------
 * Muestra los resultados y, sobre todo, el desempeño POR SUBTEMA:
 * el dato que responde "en qué tema falla más la gente", que es lo
 * que convierte una calificación en información accionable.
 *
 * Los subtemas se ordenan de menor a mayor acierto, así que lo
 * primero que se ve es donde hay que reforzar.
 */
import Link from 'next/link';

type Estadisticas = {
  evaluados: number;
  promedio: number | null;
  aprobados: number;
  reprobados: number;
  porSubtema: Array<{ etiqueta: string; respuestas: number; aciertos: number; aciertos_pct: number }>;
  porPregunta: Array<{ etiqueta: string; subtema: string | null; respuestas: number; aciertos_pct: number }>;
};

export default function BloqueEvaluacion({
  capacitacionId,
  esEvaluada,
  estadisticas,
  color,
  habilitada = true,
}: {
  capacitacionId: string;
  esEvaluada: boolean;
  estadisticas: Estadisticas | null;
  color: string;
  /**
   * Se marca al crear la capacitacion. Sin esa marca no se crea la
   * evaluacion desde aqui: la decision de si lleva evaluacion vive en
   * la ficha, no en este boton.
   */
  habilitada?: boolean;
}) {
  const hayResultados = (estadisticas?.evaluados ?? 0) > 0;

  return (
    <section style={e.card}>
      <div style={e.cabecera}>
        <h2 style={e.h2}>Evaluación</h2>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {hayResultados && (
            <a
              href={`/api/pdf-evaluacion/${capacitacionId}`}
              style={{ ...e.btn, background: 'var(--bien)' }}
            >
              Informe PDF
            </a>
          )}
          {habilitada ? (
            <Link
              href={`/panel/capacitaciones/${capacitacionId}/evaluacion`}
              style={{ ...e.btn, background: 'var(--marca)' }}
            >
              {esEvaluada ? 'Editar evaluación' : 'Crear evaluación'}
            </Link>
          ) : (
            <span
              title="Marca «lleva evaluación» al editar la capacitación"
              style={{ ...e.btn, background: 'var(--borde-fuerte)', cursor: 'not-allowed' }}
            >
              Crear evaluación
            </span>
          )}
        </div>
      </div>

      {!esEvaluada && !habilitada && (
        <p style={e.deshabilitada}>
          Esta capacitación se creó sin evaluación. Si quieres medir el
          aprendizaje, márcala como evaluada al editarla.
        </p>
      )}

      {!esEvaluada && habilitada && (
        <p style={e.vacio}>
          Esta capacitación no tiene evaluación. Créala para medir el
          aprendizaje y detectar en qué temas hay más desconocimiento.
        </p>
      )}

      {esEvaluada && !hayResultados && (
        <p style={e.vacio}>
          La evaluación está configurada. Los resultados aparecerán cuando
          los asistentes la respondan.
        </p>
      )}

      {hayResultados && estadisticas && (
        <>
          <div style={e.kpis}>
            <Kpi v={String(estadisticas.evaluados)} l="Evaluados" />
            <Kpi v={`${estadisticas.promedio ?? 0}%`} l="Promedio" color={color} />
            <Kpi v={String(estadisticas.aprobados)} l="Aprobados" color="var(--bien)" />
            <Kpi v={String(estadisticas.reprobados)} l="Reprobados"
                 color={estadisticas.reprobados > 0 ? 'var(--mal)' : undefined} />
          </div>

          {/* ---------- Por subtema ---------- */}
          <h3 style={e.h3}>Desempeño por subtema</h3>
          <p style={e.nota}>
            Ordenado de menor a mayor acierto: lo primero de la lista es
            donde conviene reforzar.
          </p>

          {estadisticas.porSubtema.length === 0 ? (
            <p style={e.vacio}>
              Las preguntas no tienen subtema asignado. Agrégalo en el editor
              para obtener este análisis.
            </p>
          ) : (
            <div style={{ marginBottom: 20 }}>
              {estadisticas.porSubtema.map((s) => {
                const tono = s.aciertos_pct >= 80 ? 'var(--bien)'
                           : s.aciertos_pct >= 60 ? '#a16207' : 'var(--mal)';
                return (
                  <div key={s.etiqueta} style={e.fila}>
                    <div style={e.etiqueta} title={s.etiqueta}>{s.etiqueta}</div>
                    <div style={e.pista}>
                      <div style={{
                        width: `${Math.max(s.aciertos_pct, 2)}%`,
                        height: '100%', background: tono, borderRadius: 4,
                      }} />
                    </div>
                    <div style={{ ...e.valor, color: tono }}>{s.aciertos_pct}%</div>
                    <div style={e.detalle}>{s.aciertos}/{s.respuestas}</div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ---------- Preguntas con más fallas ---------- */}
          <h3 style={e.h3}>Preguntas con más fallas</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
              <thead>
                <tr>
                  <th style={e.th}>Pregunta</th>
                  <th style={e.th}>Subtema</th>
                  <th style={e.th}>Aciertos</th>
                </tr>
              </thead>
              <tbody>
                {estadisticas.porPregunta.slice(0, 5).map((p, i) => (
                  <tr key={i}>
                    <td style={e.td}>{p.etiqueta}</td>
                    <td style={e.td}>{p.subtema ?? '—'}</td>
                    <td style={{
                      ...e.td, fontWeight: 600,
                      color: p.aciertos_pct >= 60 ? 'var(--bien)' : 'var(--mal)',
                    }}>
                      {p.aciertos_pct}%
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

function Kpi({ v, l, color }: { v: string; l: string; color?: string }) {
  return (
    <div style={e.kpi}>
      <div style={{ fontSize: 20, fontWeight: 700, color: color ?? 'var(--texto)' }}>{v}</div>
      <div style={e.kpiL}>{l}</div>
    </div>
  );
}

const e: Record<string, React.CSSProperties> = {
  card: { background: 'var(--superficie)', borderRadius: 14, padding: 20, marginBottom: 20, boxShadow: '0 6px 18px rgba(0,0,0,.05)' },
  cabecera: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, gap: 12, flexWrap: 'wrap' },
  h2: { fontSize: 15, margin: 0 },
  h3: { fontSize: 12, color: 'var(--texto-suave)', textTransform: 'uppercase', letterSpacing: .4, margin: '18px 0 4px' },
  nota: { fontSize: 11.5, color: 'var(--texto-suave)', margin: '0 0 12px' },
  btn: { color: 'var(--sobre-marca)', padding: '9px 16px', borderRadius: 8, fontSize: 12.5, fontWeight: 600, textDecoration: 'none' },
  vacio: { fontSize: 12.5, color: 'var(--texto-suave)', lineHeight: 1.6, margin: 0 },
  deshabilitada: {
    fontSize: 12, color: 'var(--ambar)', background: 'var(--ambar-fondo)',
    padding: '10px 12px', borderRadius: 6, margin: 0, lineHeight: 1.5,
  },
  kpis: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(110px,1fr))', gap: 12, marginBottom: 6 },
  kpi: { background: 'var(--superficie-3)', borderRadius: 8, padding: 12, textAlign: 'center' },
  kpiL: { fontSize: 10.5, color: 'var(--texto-suave)', textTransform: 'uppercase', letterSpacing: .3, marginTop: 2 },
  fila: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 7 },
  etiqueta: { width: 130, fontSize: 12, color: 'var(--texto-suave)', textAlign: 'right', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flexShrink: 0 },
  pista: { flex: 1, background: 'var(--superficie-3)', borderRadius: 4, height: 18, overflow: 'hidden' },
  valor: { width: 46, fontSize: 12, fontWeight: 600, textAlign: 'right', flexShrink: 0 },
  detalle: { width: 46, fontSize: 11, color: 'var(--texto-tenue)', textAlign: 'right', flexShrink: 0 },
  th: { background: 'var(--superficie-3)', color: 'var(--texto-suave)', fontSize: 10.5, textTransform: 'uppercase', padding: '8px', textAlign: 'left', borderBottom: '1px solid var(--borde)' },
  td: { padding: '8px', borderBottom: '1px solid var(--borde)', lineHeight: 1.4 },
};
