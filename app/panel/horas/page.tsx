/**
 * HORAS-HOMBRE TRABAJADAS
 * ---------------------------------------------------------------
 * Pantalla de captura, no de consulta. Existe porque los indicadores
 * mínimos del artículo 30 de la Resolución 0312 necesitan un
 * denominador que hoy no vive en ninguna otra parte del sistema.
 *
 * Se llega desde Indicadores, no desde el menú principal: se
 * diligencia una vez al año, no todos los días.
 */
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { obtenerPerfil } from '@/lib/sesion';
import { empresaActiva } from '@/lib/empresa-activa';
import { listarHorasHombre } from '@/lib/acciones-horas';
import RejillaHoras from './RejillaHoras';

export const dynamic = 'force-dynamic';

export default async function PaginaHoras({
  searchParams,
}: {
  searchParams: Promise<{ anio?: string }>;
}) {
  const perfil = await obtenerPerfil();
  if (!perfil) redirect('/login');

  const empresa = await empresaActiva();
  const { anio: anioParam } = await searchParams;

  const actual = new Date().getFullYear();
  const anio = Number(anioParam) || actual;
  const color = empresa?.color_primario ?? '#14263F';

  if (!empresa) {
    return (
      <>
        <h1 style={s.titulo}>Horas-hombre trabajadas</h1>
        <p style={s.vacio}>
          Agrega una empresa para registrar sus horas-hombre.
        </p>
      </>
    );
  }

  const datos = await listarHorasHombre(anio);
  const anios = [actual + 1, actual, actual - 1, actual - 2];

  return (
    <>
      <Link href="/panel/indicadores" style={s.volver}>← Indicadores</Link>

      <div style={s.cabecera}>
        <div>
          <h1 style={s.titulo}>Horas-hombre trabajadas</h1>
          <p style={s.sub}>
            {empresa.nombre} · es el denominador de los indicadores de
            accidentalidad y ausentismo.
          </p>
        </div>

        <div style={s.anios}>
          {anios.map((a) => (
            <Link
              key={a}
              href={`/panel/horas?anio=${a}`}
              style={{
                ...s.anio,
                ...(a === anio
                  ? { background: color, color: 'var(--sobre-marca)', borderColor: color }
                  : {}),
              }}
            >
              {a}
            </Link>
          ))}
        </div>
      </div>

      <div style={s.nota}>
        <strong>Deja en blanco los meses sin dato.</strong> Un cero significa que
        ese mes no se trabajó; un espacio en blanco significa que todavía no se
        sabe. Confundirlos altera el promedio de trabajadores y con él la
        frecuencia de accidentalidad.
      </div>

      <RejillaHoras key={`${empresa.id}-${anio}`} anio={anio} datos={datos} color={color} />

      <div style={s.pie}>
        <p style={{ margin: 0 }}>
          <strong>Para qué sirve cada dato</strong>
        </p>
        <ul style={s.lista}>
          <li><b>Horas trabajadas:</b> exposición real del personal en el mes.</li>
          <li><b>Trabajadores:</b> promedio del mes. Es el denominador de la
            frecuencia y la severidad de accidentalidad.</li>
          <li><b>Días programados:</b> denominador del ausentismo por causa médica.</li>
        </ul>
      </div>
    </>
  );
}

const s: Record<string, React.CSSProperties> = {
  volver: { fontSize: 12.5, color: 'var(--texto-suave)', textDecoration: 'none' },
  cabecera: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
    gap: 16, flexWrap: 'wrap', margin: '10px 0 16px',
  },
  titulo: { fontSize: 23, fontWeight: 700, color: 'var(--texto)', margin: '0 0 4px' },
  sub: { fontSize: 13.5, color: 'var(--texto-suave)', margin: 0 },
  anios: { display: 'flex', gap: 6, flexWrap: 'wrap' },
  anio: {
    border: '1px solid var(--borde)', background: 'var(--superficie)', color: 'var(--texto-suave)',
    padding: '6px 14px', borderRadius: 8, fontSize: 12.5, fontWeight: 600,
    textDecoration: 'none',
  },
  nota: {
    background: 'var(--aviso-fondo)', border: '1px solid #FED7AA', color: '#7C2D12',
    borderRadius: 8, padding: '11px 14px', fontSize: 13, lineHeight: 1.6,
    marginBottom: 18,
  },
  vacio: { fontSize: 14, color: 'var(--texto-suave)' },
  pie: {
    marginTop: 26, paddingTop: 18, borderTop: '1px solid var(--borde)',
    fontSize: 13, color: 'var(--texto-suave)',
  },
  lista: { margin: '8px 0 0', paddingLeft: 20, lineHeight: 1.7 },
};
