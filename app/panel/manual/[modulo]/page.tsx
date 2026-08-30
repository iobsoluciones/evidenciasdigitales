/**
 * SUBMANUAL DE UN MÓDULO
 * ---------------------------------------------------------------
 * Se genera de la lista de MANUALES, así que añadir un módulo nuevo
 * al manual es añadir una entrada y su función de contenido.
 */
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MANUALES, fichaDe, ContenidoManual } from '../contenido';

export function generateStaticParams() {
  return MANUALES.map((m) => ({ modulo: m.id }));
}

export default async function PaginaSubmanual({
  params,
}: {
  params: Promise<{ modulo: string }>;
}) {
  const { modulo } = await params;
  const ficha = fichaDe(modulo);
  if (!ficha) notFound();

  const i = MANUALES.findIndex((m) => m.id === modulo);
  const anterior = i > 0 ? MANUALES[i - 1] : null;
  const siguiente = i < MANUALES.length - 1 ? MANUALES[i + 1] : null;

  return (
    <article style={{ maxWidth: 780 }}>
      <Link href="/panel/manual" style={s.volver}>← Manual de uso</Link>

      <header style={{ ...s.cabecera, borderLeft: `4px solid ${ficha.color}` }}>
        <span style={{ ...s.numero, color: ficha.color }}>
          Submanual {String(i + 1).padStart(2, '0')} de {MANUALES.length}
        </span>
        <h1 style={s.h1}>{ficha.titulo}</h1>
        <p style={s.resumen}>{ficha.resumen}</p>
        <div style={s.cubre}>
          {ficha.cubre.map((x) => (
            <span key={x} style={s.chip}>{x}</span>
          ))}
        </div>
      </header>

      <ContenidoManual id={modulo} />

      <nav style={s.navegacion}>
        {anterior ? (
          <Link href={`/panel/manual/${anterior.id}`} style={s.nav}>
            <span style={s.navEtiqueta}>← Anterior</span>
            <span style={s.navTitulo}>{anterior.titulo}</span>
          </Link>
        ) : <span />}
        {siguiente && (
          <Link href={`/panel/manual/${siguiente.id}`} style={{ ...s.nav, textAlign: 'right' }}>
            <span style={s.navEtiqueta}>Siguiente →</span>
            <span style={s.navTitulo}>{siguiente.titulo}</span>
          </Link>
        )}
      </nav>
    </article>
  );
}

const s: Record<string, React.CSSProperties> = {
  volver: { fontSize: 12.5, color: '#5B6470', textDecoration: 'none' },
  cabecera: {
    background: '#fff', border: '1px solid #E4E4DF', borderRadius: 12,
    padding: '18px 22px', marginTop: 12,
  },
  numero: { fontSize: 10.5, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' },
  h1: { fontSize: 24, fontWeight: 700, color: '#14263F', margin: '6px 0 6px' },
  resumen: { fontSize: 14, color: '#5B6470', margin: 0, lineHeight: 1.6 },
  cubre: { display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 12 },
  chip: {
    fontSize: 10, color: '#5B6470', background: '#F7F7F4',
    border: '1px solid #E4E4DF', borderRadius: 20, padding: '2px 8px',
  },
  navegacion: {
    display: 'flex', justifyContent: 'space-between', gap: 14,
    marginTop: 40, paddingTop: 20, borderTop: '1px solid #E4E4DF',
  },
  nav: {
    display: 'flex', flexDirection: 'column', gap: 3,
    textDecoration: 'none', color: 'inherit', maxWidth: '48%',
  },
  navEtiqueta: { fontSize: 11, color: '#5B6470' },
  navTitulo: { fontSize: 13.5, fontWeight: 600, color: '#14263F', lineHeight: 1.4 },
};
