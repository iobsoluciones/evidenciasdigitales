/**
 * INDICADORES MÍNIMOS DEL ARTÍCULO 30
 * ---------------------------------------------------------------
 * Resolución 0312 de 2019. Son de reporte anual obligatorio y un
 * auditor los pide por nombre.
 *
 * Cada tarjeta muestra el resultado, la operación y la fórmula. Lo
 * primero que pregunta un auditor no es el número: es cómo se calculó.
 * Y cuando falta el denominador se dice cuál falta, en vez de mostrar
 * un cero que se leería como «no hubo accidentes».
 */
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { obtenerPerfil } from '@/lib/sesion';
import { empresaActiva } from '@/lib/empresa-activa';
import { obtenerIndicadoresLegales } from '@/lib/acciones-indicadores-legales';

export const dynamic = 'force-dynamic';

export default async function PaginaIndicadoresLegales({
  searchParams,
}: {
  searchParams: Promise<{ anio?: string }>;
}) {
  const perfil = await obtenerPerfil();
  if (!perfil) redirect('/login');

  const empresa = await empresaActiva();
  const { anio: p } = await searchParams;
  const actual = new Date().getFullYear();
  const anio = Number(p) || actual;
  const color = empresa?.color_primario ?? '#14263F';

  if (!empresa) {
    return <p style={s.sub}>Agrega una empresa para ver sus indicadores.</p>;
  }

  const r = await obtenerIndicadoresLegales(anio);
  const anios = [actual, actual - 1, actual - 2];

  return (
    <>
      <Link href="/panel/indicadores" style={s.volver}>← Indicadores</Link>

      <div style={s.cabecera}>
        <div>
          <h1 style={s.titulo}>Indicadores mínimos</h1>
          <p style={s.sub}>
            {empresa.nombre} · Resolución 0312 de 2019, artículo 30. Son los seis
            que exige la norma.
          </p>
        </div>
        <div style={s.anios}>
          {anios.map((a) => (
            <Link
              key={a}
              href={`/panel/indicadores/legales?anio=${a}`}
              style={{
                ...s.anio,
                ...(a === anio ? { background: 'var(--marca)', color: 'var(--sobre-empresa)', borderColor: 'var(--marca)' } : {}),
              }}
            >
              {a}
            </Link>
          ))}
        </div>
      </div>

      {r && (
        <div style={s.base}>
          <Dato e="Promedio de trabajadores" v={String(r.base.promedio_trabajadores)} />
          <Dato e="Días programados" v={String(r.base.dias_programados)} />
          <Dato e="Accidentes" v={String(r.base.accidentes)} />
          <Dato e="Días de incapacidad" v={String(r.base.dias_incapacidad)} />
          <Dato e="Meses con horas-hombre" v={`${r.base.meses_con_dato} de 12`} />
        </div>
      )}

      {r && r.base.meses_con_dato === 0 && (
        <div style={s.faltaBase}>
          <strong>Faltan las horas-hombre de {anio}.</strong> Cuatro de los seis
          indicadores necesitan el promedio de trabajadores como denominador y no
          se pueden calcular sin él.{' '}
          <Link href={`/panel/horas?anio=${anio}`} style={s.enlaceAviso}>
            Cargarlas ahora
          </Link>
        </div>
      )}

      <div style={s.rejilla}>
        {(r?.indicadores ?? []).map((i) => (
          <article key={i.clave} style={s.tarjeta}>
            <h2 style={s.nombre}>{i.nombre}</h2>

            {i.valor !== null ? (
              <div style={{ ...s.valor, color: 'var(--marca-empresa)' }}>
                {i.valor.toLocaleString('es-CO')}
                <span style={s.unidad}>{i.unidad}</span>
              </div>
            ) : (
              <div style={s.sinDato}>{i.falta ?? 'Sin datos suficientes'}</div>
            )}

            <div style={s.operacion}>
              {i.numerador.toLocaleString('es-CO')} ÷ {i.denominador.toLocaleString('es-CO')}
            </div>

            <p style={s.formula}>{i.formula}</p>
          </article>
        ))}
      </div>
    </>
  );
}

function Dato({ e, v }: { e: string; v: string }) {
  return (
    <div style={s.dato}>
      <span style={s.datoE}>{e}</span>
      <span style={s.datoV}>{v}</span>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  volver: { fontSize: 12.5, color: 'var(--texto-suave)', textDecoration: 'none' },
  cabecera: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
    gap: 16, flexWrap: 'wrap', margin: '10px 0 16px',
  },
  titulo: { fontSize: 23, fontWeight: 700, color: 'var(--texto)', margin: '0 0 4px' },
  sub: { fontSize: 13.5, color: 'var(--texto-suave)', margin: 0, maxWidth: 560, lineHeight: 1.6 },
  anios: { display: 'flex', gap: 6 },
  anio: {
    border: '1px solid var(--borde)', background: 'var(--superficie)', color: 'var(--texto-suave)',
    padding: '6px 14px', borderRadius: 8, fontSize: 12.5, fontWeight: 600,
    textDecoration: 'none',
  },
  base: {
    display: 'grid', gap: 1, background: 'var(--borde)',
    border: '1px solid var(--borde)', borderRadius: 8, overflow: 'hidden',
    gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', marginBottom: 14,
  },
  dato: { background: 'var(--superficie)', padding: '10px 13px', display: 'flex', flexDirection: 'column', gap: 2 },
  datoE: { fontSize: 10.5, color: 'var(--texto-tenue)', textTransform: 'uppercase', letterSpacing: .4 },
  datoV: { fontSize: 15, color: 'var(--texto)', fontWeight: 700, fontVariantNumeric: 'tabular-nums' },

  faltaBase: {
    background: 'var(--aviso-fondo)', border: '1px solid var(--aviso)', color: 'var(--aviso)',
    borderRadius: 8, padding: '11px 14px', fontSize: 13, lineHeight: 1.6, marginBottom: 16,
  },
  enlaceAviso: { color: 'var(--aviso)', fontWeight: 600 },

  rejilla: {
    display: 'grid', gap: 12,
    gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))',
  },
  tarjeta: {
    background: 'var(--superficie)', border: '1px solid var(--borde)', borderRadius: 12,
    padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 6,
  },
  nombre: { fontSize: 13.5, fontWeight: 700, color: 'var(--texto)', margin: 0, lineHeight: 1.35 },
  valor: {
    fontSize: 30, fontWeight: 700, lineHeight: 1.05,
    fontVariantNumeric: 'tabular-nums', display: 'flex', alignItems: 'baseline', gap: 6,
  },
  unidad: { fontSize: 12, fontWeight: 600, color: 'var(--texto-tenue)' },
  sinDato: {
    fontSize: 12.5, color: 'var(--aviso)', background: 'var(--aviso-fondo)',
    borderRadius: 7, padding: '9px 11px', lineHeight: 1.5,
  },
  operacion: {
    fontSize: 12, color: 'var(--texto-suave)',
    fontFamily: "'Consolas','Courier New',monospace", fontVariantNumeric: 'tabular-nums',
  },
  formula: {
    fontSize: 11, color: 'var(--texto-tenue)', lineHeight: 1.55, margin: 0,
    paddingTop: 8, borderTop: '1px solid var(--superficie-3)',
  },
};
