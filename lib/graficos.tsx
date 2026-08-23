/**
 * GRÁFICOS EN SVG
 * ---------------------------------------------------------------
 * Sin librerías externas, a propósito: recharts o chart.js pesan
 * cientos de kilobytes y obligan a que el componente corra en el
 * navegador. Estos son Server Components puros — el HTML llega ya
 * dibujado y no suman nada al bundle.
 *
 * Dos formatos:
 *   BarrasHorizontales → categorías con nombres largos (ciudad, área)
 *   Columnas           → series temporales (por mes)
 */

export type Punto = { etiqueta: string; valor: number };

/* =====================================================================
   BARRAS HORIZONTALES
   Se eligen para ciudad y área porque los nombres son largos y en
   vertical se solapan o hay que rotarlos.
   ===================================================================== */
export function BarrasHorizontales({
  datos,
  color,
  vacio = 'Sin datos para mostrar.',
}: {
  datos: Punto[];
  color: string;
  vacio?: string;
}) {
  if (!datos || datos.length === 0) {
    return <p style={est.vacio}>{vacio}</p>;
  }

  const max = Math.max(...datos.map((d) => d.valor), 1);

  return (
    <div>
      {datos.map((d) => {
        const pct = (d.valor / max) * 100;
        return (
          <div key={d.etiqueta} style={est.filaBarra}>
            <div style={est.etiquetaBarra} title={d.etiqueta}>
              {d.etiqueta}
            </div>
            <div style={est.pista}>
              <div
                style={{
                  ...est.barra,
                  width: `${Math.max(pct, 2)}%`,
                  background: color,
                }}
              />
            </div>
            <div style={est.valorBarra}>{d.valor}</div>
          </div>
        );
      })}
    </div>
  );
}

/* =====================================================================
   COLUMNAS (series por mes)
   ===================================================================== */
const MESES_CORTOS = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
];

/** Convierte "2026-03" en "Mar 26". */
function etiquetaMes(iso: string): string {
  const [anio, mes] = iso.split('-');
  return `${MESES_CORTOS[Number(mes) - 1]} ${anio.slice(2)}`;
}

export function Columnas({
  datos,
  color,
  altura = 160,
  vacio = 'Sin datos para mostrar.',
}: {
  datos: Array<{ mes: string; valor: number }>;
  color: string;
  altura?: number;
  vacio?: string;
}) {
  if (!datos || datos.length === 0) {
    return <p style={est.vacio}>{vacio}</p>;
  }

  const max = Math.max(...datos.map((d) => d.valor), 1);
  const hayDatos = datos.some((d) => d.valor > 0);

  return (
    <>
      <div style={{ ...est.zonaColumnas, height: altura }}>
        {datos.map((d) => {
          // Altura mínima de 3 px para que el mes en cero siga siendo
          // visible como referencia, sin fingir que tiene valor.
          const alto = d.valor === 0 ? 3 : Math.max((d.valor / max) * (altura - 26), 6);
          return (
            <div key={d.mes} style={est.columna} title={`${etiquetaMes(d.mes)}: ${d.valor}`}>
              <div style={est.valorColumna}>{d.valor > 0 ? d.valor : ''}</div>
              <div
                style={{
                  ...est.barraColumna,
                  height: alto,
                  background: d.valor === 0 ? '#e5e7eb' : color,
                }}
              />
              <div style={est.etiquetaColumna}>{etiquetaMes(d.mes)}</div>
            </div>
          );
        })}
      </div>
      {!hayDatos && <p style={est.vacio}>{vacio}</p>}
    </>
  );
}

/* =====================================================================
   CONTENEDOR
   ===================================================================== */
export function Panel({
  titulo,
  descripcion,
  children,
}: {
  titulo: string;
  descripcion?: string;
  children: React.ReactNode;
}) {
  return (
    <section style={est.panel}>
      <h3 style={est.titulo}>{titulo}</h3>
      {descripcion && <p style={est.descripcion}>{descripcion}</p>}
      {children}
    </section>
  );
}

const est: Record<string, React.CSSProperties> = {
  panel: {
    background: '#fff', borderRadius: 14, padding: 20,
    boxShadow: '0 6px 18px rgba(0,0,0,.05)', marginBottom: 20,
  },
  titulo: { fontSize: 14, margin: '0 0 2px', color: '#1f2937' },
  descripcion: { fontSize: 11.5, color: '#6b7280', margin: '0 0 16px' },

  filaBarra: { display: 'flex', alignItems: 'center', marginBottom: 7, gap: 10 },
  etiquetaBarra: {
    width: 110, fontSize: 11.5, color: '#374151', textAlign: 'right',
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
    flexShrink: 0,
  },
  pista: { flex: 1, background: '#f1f5f9', borderRadius: 4, height: 18, overflow: 'hidden' },
  barra: { height: '100%', borderRadius: 4, transition: 'width .3s' },
  valorBarra: { width: 32, fontSize: 12, fontWeight: 600, color: '#1f2937', textAlign: 'right', flexShrink: 0 },

  zonaColumnas: {
    display: 'flex', alignItems: 'flex-end', gap: 6,
    borderBottom: '1px solid #e5e7eb', paddingBottom: 0,
  },
  columna: {
    flex: 1, display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'flex-end', height: '100%',
  },
  valorColumna: { fontSize: 10, fontWeight: 600, color: '#1f2937', marginBottom: 3, minHeight: 13 },
  barraColumna: { width: '100%', maxWidth: 42, borderRadius: '4px 4px 0 0' },
  etiquetaColumna: { fontSize: 9.5, color: '#6b7280', marginTop: 5, whiteSpace: 'nowrap' },

  vacio: { fontSize: 12, color: '#9ca3af', textAlign: 'center', padding: '20px 0', margin: 0 },
};
