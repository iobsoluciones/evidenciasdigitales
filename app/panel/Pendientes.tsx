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
 */
import Link from 'next/link';
import type { Pendientes as Datos, Severidad } from '@/lib/acciones-pendientes';

const TONOS: Record<Severidad, { fondo: string; color: string; borde: string; texto: string }> = {
  critico: { fondo: '#FDF2F2', color: '#9B1C1C', borde: '#9B1C1C', texto: 'Crítico' },
  alto: { fondo: '#FFF7ED', color: '#9A3412', borde: '#9A3412', texto: 'Alto' },
  medio: { fondo: '#F9F6E7', color: '#7C6407', borde: '#B08900', texto: 'Medio' },
};

function plazo(dias: number): string {
  if (dias === 0) return '';
  if (dias < 0) return `Vencido hace ${Math.abs(dias)} d`;
  return `Faltan ${dias} d`;
}

export default function Pendientes({
  datos,
  empresa,
  color,
}: {
  datos: Datos;
  empresa: string;
  color: string;
}) {
  const { items, resumen } = datos;

  if (resumen.total === 0) {
    return (
      <section style={{ ...s.caja, borderLeft: `4px solid #1E6B3A` }}>
        <div style={s.cabecera}>
          <h2 style={s.titulo}>Nada pendiente en {empresa}</h2>
        </div>
        <p style={s.vacio}>
          No hay accidentes sin investigar, acciones vencidas, exámenes por vencer
          ni inspecciones atrasadas. El sistema está al día.
        </p>
      </section>
    );
  }

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
        <div style={s.contadores}>
          {(['critico', 'alto', 'medio'] as Severidad[]).map((sev) => {
            const n = sev === 'critico' ? resumen.criticos
              : sev === 'alto' ? resumen.altos : resumen.medios;
            if (n === 0) return null;
            return (
              <span key={sev} style={{ ...s.contador, background: TONOS[sev].fondo, color: TONOS[sev].color }}>
                {n} {TONOS[sev].texto.toLowerCase()}{n !== 1 ? 's' : ''}
              </span>
            );
          })}
        </div>
      </div>

      <ul style={s.lista}>
        {items.map((i, n) => {
          const t = TONOS[i.severidad] ?? TONOS.medio;
          return (
            <li key={n}>
              <Link href={i.ruta} style={{ ...s.item, borderLeftColor: t.borde }}>
                <span style={{ ...s.severidad, background: t.fondo, color: t.color }}>
                  {t.texto}
                </span>
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
          );
        })}
      </ul>
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
  titulo: { fontSize: 17, fontWeight: 700, color: '#14263F', margin: 0 },
  sub: { fontSize: 12.5, color: '#5B6470', margin: '3px 0 0' },
  contadores: { display: 'flex', gap: 6, flexWrap: 'wrap' },
  contador: {
    fontSize: 11, fontWeight: 700, padding: '4px 11px', borderRadius: 20,
    whiteSpace: 'nowrap',
  },
  vacio: { fontSize: 13.5, color: '#5B6470', lineHeight: 1.6, margin: 0, maxWidth: 560 },

  lista: { listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 },
  item: {
    display: 'flex', alignItems: 'center', gap: 12,
    background: '#FBFBF9', borderLeftWidth: 3, borderLeftStyle: 'solid',
    borderRadius: '0 8px 8px 0', padding: '10px 14px',
    textDecoration: 'none', color: 'inherit', flexWrap: 'wrap',
  },
  severidad: {
    fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 4,
    textTransform: 'uppercase', letterSpacing: .4, flexShrink: 0,
  },
  cuerpo: { display: 'flex', flexDirection: 'column', gap: 2, flex: '1 1 240px', minWidth: 0 },
  itemTitulo: { fontSize: 13.5, fontWeight: 600, color: '#14263F', lineHeight: 1.4 },
  itemDetalle: { fontSize: 11.5, color: '#8A929C', lineHeight: 1.4 },
  dias: {
    fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
    fontVariantNumeric: 'tabular-nums', flexShrink: 0,
  },
};
