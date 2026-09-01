/**
 * BANDEJA DE PENDIENTES
 * ---------------------------------------------------------------
 * Encabeza el panel. Antes lo primero que se veía era el directorio de
 * empresas, y un consultor ya sabe cuáles son las suyas: lo que no sabe
 * al abrir la aplicación es qué tiene que hacer hoy.
 *
 * Cada línea lleva a donde se resuelve. La severidad va en color y en
 * texto —no solo en color— para que se entienda igual impresa o por
 * alguien que no distinga los tonos.
 *
 * Los pendientes se agrupan en UNA TARJETA POR SEVERIDAD. En una lista
 * corrida los críticos y los medios se leen con el mismo peso aunque
 * estén ordenados: el ojo recorre la lista entera. Separados, lo urgente
 * ocupa su propio bloque y se puede contar de un vistazo —«tres críticos»
 * es una frase que se ve, no que se deduce.
 *
 * Cada tarjeta dice qué SIGNIFICA su severidad. «Crítico» a secas no
 * explica por qué un examen vencido pesa más que una inspección
 * atrasada, y esa es justo la pregunta que se hace quien abre el panel.
 */
import Link from 'next/link';
import { conAlfa } from '@/lib/color';
import type { Pendientes as Datos, Severidad, Semaforo } from '@/lib/acciones-pendientes';

const TONOS: Record<Severidad, {
  fondo: string; color: string; borde: string; texto: string; que: string;
}> = {
  critico: {
    fondo: '#FDF2F2', color: '#9B1C1C', borde: '#9B1C1C', texto: 'Crítico',
    que: 'Plazo de ley encima o gente expuesta hoy',
  },
  alto: {
    fondo: '#FFF7ED', color: '#9A3412', borde: '#9A3412', texto: 'Alto',
    que: 'Vencido o a punto de vencer',
  },
  medio: {
    fondo: '#F9F6E7', color: '#7C6407', borde: '#B08900', texto: 'Medio',
    que: 'Conviene resolverlo este mes',
  },
};

const ORDEN: Severidad[] = ['critico', 'alto', 'medio'];

function plazo(dias: number): string {
  if (dias === 0) return '';
  if (dias < 0) return `Vencido hace ${Math.abs(dias)} d`;
  return `Faltan ${dias} d`;
}

const CRITERIOS: Record<string, { t: string; fondo: string; color: string }> = {
  critico: { t: 'Crítico', fondo: '#FDF2F2', color: '#9B1C1C' },
  moderadamente_aceptable: { t: 'Moderadamente aceptable', fondo: '#FFF7ED', color: '#9A3412' },
  aceptable: { t: 'Aceptable', fondo: '#E6F4EA', color: '#1E6B3A' },
};

/** El semáforo va junto a los pendientes: uno dice cómo está el sistema
 *  y el otro qué hacer para moverlo. Separarlos obligaría a mirar dos
 *  pantallas para la misma pregunta. */
function Semaforo({ s: sem }: { s: Semaforo }) {
  if (!sem.hay || sem.porcentaje === undefined) return null;
  const c = CRITERIOS[sem.criterio ?? 'critico'];
  return (
    <Link href="/panel/autoevaluacion" style={{ ...s.semaforo, background: c.fondo, color: c.color }}>
      <span style={s.semCifra}>{sem.porcentaje}%</span>
      <span style={s.semTexto}>
        {c.t}
        <span style={s.semAnio}>
          Autoevaluación {sem.anio}
          {sem.estado === 'borrador' ? ` · ${sem.pendientes} sin evaluar` : ''}
        </span>
      </span>
    </Link>
  );
}

export default function Pendientes({
  datos,
  semaforo,
  empresa,
  color,
}: {
  datos: Datos;
  semaforo: Semaforo;
  empresa: string;
  color: string;
}) {
  const { items, resumen } = datos;

  if (resumen.total === 0) {
    return (
      <section style={{ ...s.caja, borderLeft: `4px solid #1E6B3A` }}>
        <div style={s.cabecera}>
          <h2 style={s.titulo}>Nada pendiente en {empresa}</h2>
          <Semaforo s={semaforo} />
        </div>
        <p style={s.vacio}>
          No hay accidentes sin investigar, acciones vencidas, exámenes por vencer
          ni inspecciones atrasadas. El sistema está al día.
        </p>
      </section>
    );
  }

  // Una severidad sin pendientes no pinta tarjeta: un bloque vacío
  // ocuparía el mismo sitio que uno con trabajo dentro.
  const grupos = ORDEN
    .map((sev) => ({ sev, suyos: items.filter((i) => i.severidad === sev) }))
    .filter((g) => g.suyos.length > 0);

  return (
    <section style={{ ...s.caja, borderLeft: `4px solid ${resumen.criticos > 0 ? '#9B1C1C' : color}` }}>
      <div style={s.cabecera}>
        <div>
          <h2 style={s.titulo}>Qué hay que hacer en {empresa}</h2>
          <p style={s.sub}>
            {resumen.total} pendiente{resumen.total !== 1 ? 's' : ''}
            {resumen.criticos > 0 && `, ${resumen.criticos} crítico${resumen.criticos !== 1 ? 's' : ''}`}
          </p>
        </div>
        {/* Los contadores por severidad se fueron a la cabecera de cada
            tarjeta: repetirlos aquí sería decir dos veces lo mismo. */}
        <Semaforo s={semaforo} />
      </div>

      <div style={s.rejilla}>
        {grupos.map(({ sev, suyos }) => {
          const t = TONOS[sev];
          return (
            <div
              key={sev}
              style={{ ...s.grupo, background: t.fondo, borderColor: conAlfa(t.color, 0.22) }}
            >
              <div style={s.grupoCabecera}>
                <span style={{ ...s.grupoCifra, color: t.color }}>{suyos.length}</span>
                <span style={s.grupoTextos}>
                  <span style={{ ...s.grupoTitulo, color: t.color }}>{t.texto}</span>
                  <span style={s.grupoQue}>{t.que}</span>
                </span>
              </div>

              <ul style={s.lista}>
                {suyos.map((i, n) => (
                  <li key={n}>
                    <Link href={i.ruta} style={{ ...s.item, borderLeftColor: t.borde }}>
                      <span style={s.cuerpo}>
                        <span style={s.itemTitulo}>{i.titulo}</span>
                        <span style={s.itemDetalle}>
                          {i.modulo} · {i.detalle}
                        </span>
                      </span>
                      {i.dias !== 0 && (
                        <span style={{ ...s.dias, color: i.dias < 0 ? '#9B1C1C' : '#5B6470' }}>
                          {plazo(i.dias)}
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}

const s: Record<string, React.CSSProperties> = {
  caja: {
    background: '#fff', border: '1px solid #E4E4DF', borderRadius: 12,
    padding: '18px 20px', marginBottom: 22,
  },
  cabecera: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    gap: 14, flexWrap: 'wrap', marginBottom: 14,
  },
  // Las tarjetas se reparten el ancho y se apilan solas por debajo de
  // ~950 px. `align-items: start` evita que una columna con dos
  // pendientes se estire hasta el alto de la que tiene ocho.
  rejilla: {
    display: 'grid', gap: 12, alignItems: 'start',
    // `min(290px, 100%)`: sin el min(), en un móvil la columna se queda
    // en 290 px dentro de un hueco de 287 y la tarjeta se sale del borde.
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(290px, 100%), 1fr))',
  },
  grupo: {
    borderWidth: 1, borderStyle: 'solid', borderRadius: 10,
    padding: '12px 13px 13px',
  },
  grupoCabecera: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 },
  grupoCifra: {
    fontSize: 24, fontWeight: 700, lineHeight: 1,
    fontVariantNumeric: 'tabular-nums',
  },
  grupoTextos: { display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 },
  grupoTitulo: {
    fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: .6,
  },
  grupoQue: { fontSize: 11, color: '#6B7480', lineHeight: 1.35 },
  titulo: { fontSize: 17, fontWeight: 700, color: '#14263F', margin: 0 },
  sub: { fontSize: 12.5, color: '#5B6470', margin: '3px 0 0' },
  semaforo: {
    display: 'flex', alignItems: 'center', gap: 9, borderRadius: 9,
    padding: '7px 13px', textDecoration: 'none', marginRight: 4,
  },
  semCifra: { fontSize: 21, fontWeight: 700, lineHeight: 1, fontVariantNumeric: 'tabular-nums' },
  semTexto: { display: 'flex', flexDirection: 'column', fontSize: 11.5, fontWeight: 700, lineHeight: 1.35 },
  semAnio: { fontSize: 10, fontWeight: 400, opacity: .85 },
  vacio: { fontSize: 13.5, color: '#5B6470', lineHeight: 1.6, margin: 0, maxWidth: 560 },

  lista: { listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 },
  // Fondo blanco: la fila va DENTRO de una tarjeta ya teñida con el
  // color de su severidad, y sobre ese tinte el gris de antes se perdía.
  item: {
    display: 'flex', alignItems: 'center', gap: 10,
    background: '#fff', borderLeftWidth: 3, borderLeftStyle: 'solid',
    borderRadius: '0 8px 8px 0', padding: '9px 12px',
    textDecoration: 'none', color: 'inherit', flexWrap: 'wrap',
  },
  cuerpo: { display: 'flex', flexDirection: 'column', gap: 2, flex: '1 1 160px', minWidth: 0 },
  itemTitulo: { fontSize: 13.5, fontWeight: 600, color: '#14263F', lineHeight: 1.4 },
  itemDetalle: { fontSize: 11.5, color: '#8A929C', lineHeight: 1.4 },
  dias: {
    fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
    fontVariantNumeric: 'tabular-nums', flexShrink: 0,
  },
};
