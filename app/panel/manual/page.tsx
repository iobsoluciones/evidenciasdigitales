/**
 * ÍNDICE DEL MANUAL
 * ---------------------------------------------------------------
 * Un submanual por módulo. Se entra por el que se necesita, no de
 * principio a fin: nadie lee un manual completo, se consulta el
 * capítulo del problema que se tiene delante.
 */
import Link from 'next/link';
import { MANUALES } from './contenido';
import { Flujo, Jerarquia } from './Figuras';

export const metadata = { title: 'Manual de uso' };

export default function PaginaManual() {
  return (
    <div>
      <header style={s.cabecera}>
        <h1 style={s.h1}>Manual de uso</h1>
        <p style={s.bajada}>
          Cómo se usa cada módulo y, sobre todo, por qué se comporta como lo
          hace. Empieza por <strong>Ingreso y primeros pasos</strong> si es tu
          primera vez.
        </p>
      </header>

      <section style={s.mapa}>
        <h2 style={s.h2}>El recorrido de siempre</h2>
        <p style={s.p}>
          Casi todo el trabajo sigue esta secuencia. Los módulos son las piezas
          que la sostienen.
        </p>
        <div style={{ marginTop: 16 }}>
          <Flujo
            pasos={[
              { titulo: 'Das de alta la empresa', detalle: 'Y su personal' },
              { titulo: 'Ejecutas la actividad', detalle: 'Capacitación, entrega o inspección' },
              { titulo: 'Capturas las firmas', detalle: 'Es lo que vuelve prueba el registro' },
              { titulo: 'Emites el documento', detalle: 'PDF o Excel para la ARL' },
            ]}
          />
        </div>
        <div style={{ marginTop: 22, paddingTop: 18, borderTop: '1px solid #E4E4DF' }}>
          <p style={{ ...s.p, marginBottom: 14 }}>
            Y esta es la estructura sobre la que se apoya todo:
          </p>
          <Jerarquia
            raiz="Tu cuenta"
            hijos={['Empresa cliente', 'Empresa cliente']}
            nietos="Empleados"
          />
        </div>
      </section>

      <h2 style={{ ...s.h2, marginTop: 34 }}>Submanuales</h2>
      <div style={s.rejilla}>
        {MANUALES.map((m, i) => (
          <Link key={m.id} href={`/panel/manual/${m.id}`} style={{ ...s.tarjeta, borderTop: `3px solid ${m.color}` }}>
            <span style={{ ...s.numero, color: m.color }}>{String(i + 1).padStart(2, '0')}</span>
            <span style={s.tarjetaTitulo}>{m.titulo}</span>
            <span style={s.tarjetaResumen}>{m.resumen}</span>
            <span style={s.cubre}>
              {m.cubre.map((x) => (
                <span key={x} style={s.chip}>{x}</span>
              ))}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  cabecera: { marginBottom: 26 },
  h1: { fontSize: 25, fontWeight: 700, color: '#14263F', margin: '0 0 6px' },
  bajada: { fontSize: 14.5, color: '#5B6470', margin: 0, lineHeight: 1.65, maxWidth: 660 },
  mapa: {
    background: '#fff', border: '1px solid #E4E4DF', borderRadius: 12,
    padding: '20px 22px',
  },
  h2: { fontSize: 16.5, fontWeight: 700, color: '#14263F', margin: '0 0 6px' },
  p: { fontSize: 13.5, color: '#5B6470', margin: 0, lineHeight: 1.65 },
  rejilla: {
    display: 'grid', gap: 13, marginTop: 16,
    gridTemplateColumns: 'repeat(auto-fill,minmax(258px,1fr))',
  },
  tarjeta: {
    display: 'flex', flexDirection: 'column', gap: 5,
    background: '#fff', border: '1px solid #E4E4DF', borderRadius: 12,
    padding: '15px 17px 16px', textDecoration: 'none', color: 'inherit',
    minHeight: 132,
  },
  numero: { fontSize: 11, fontWeight: 700, letterSpacing: 1 },
  tarjetaTitulo: { fontSize: 15, fontWeight: 700, color: '#14263F', lineHeight: 1.35 },
  tarjetaResumen: { fontSize: 12.5, color: '#5B6470', lineHeight: 1.55, flex: 1 },
  cubre: { display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 6 },
  chip: {
    fontSize: 10, color: '#5B6470', background: '#F7F7F4',
    border: '1px solid #E4E4DF', borderRadius: 20, padding: '2px 8px',
  },
};
