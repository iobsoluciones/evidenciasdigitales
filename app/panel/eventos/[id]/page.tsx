/**
 * DETALLE E INVESTIGACIÓN DE UN EVENTO
 */
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { obtenerPerfil } from '@/lib/sesion';
import { obtenerEvento } from '@/lib/acciones-eventos';
import Investigacion from './Investigacion';

export const dynamic = 'force-dynamic';

const TIPOS: Record<string, string> = {
  accidente: 'Accidente de trabajo',
  incidente: 'Incidente',
  casi_accidente: 'Casi accidente',
  enfermedad: 'Enfermedad laboral',
};

export default async function PaginaEvento({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const perfil = await obtenerPerfil();
  if (!perfil) redirect('/login');

  const d = await obtenerEvento(id);
  if (!d.ok || !d.evento) notFound();

  const ev = d.evento as Record<string, unknown>;
  const inv = (d.investigacion ?? {}) as Record<string, unknown>;
  const empresa = (d.empresa ?? {}) as Record<string, unknown>;
  const color = String(empresa.color_primario ?? '#14263F');
  const cerrada = Boolean(inv.fecha_cierre);

  // El plazo se deriva al leer, nunca se almacena.
  const dias = Math.floor(
    (Date.now() - new Date(String(ev.fecha_evento)).getTime()) / 86400000
  );
  const restan = 15 - dias;

  const fecha = new Date(String(ev.fecha_evento)).toLocaleString('es-CO', {
    dateStyle: 'long', timeStyle: 'short',
  });

  return (
    <div style={{ maxWidth: 820 }}>
      <Link href="/panel/eventos" style={s.volver}>← Accidentes e incidentes</Link>

      <div style={s.cabecera}>
        <div>
          <div style={s.codigo}>{String(ev.codigo)}</div>
          <h1 style={s.titulo}>{TIPOS[String(ev.tipo)] ?? String(ev.tipo)}</h1>
          <p style={s.sub}>{fecha}{ev.lugar ? ` · ${String(ev.lugar)}` : ''}</p>
        </div>

        <div style={s.derecha}>
          {cerrada ? (
            <span style={{ ...s.chip, background: 'var(--bien-fondo)', color: 'var(--bien)' }}>
              Investigación cerrada
            </span>
          ) : (
            <span style={{
              ...s.chip,
              background: restan < 0 ? 'var(--mal-fondo)' : restan <= 7 ? 'var(--aviso-fondo)' : 'var(--bien-fondo)',
              color: restan < 0 ? 'var(--mal)' : restan <= 7 ? 'var(--aviso)' : 'var(--bien)',
            }}>
              {restan < 0
                ? `Plazo vencido hace ${Math.abs(restan)} días`
                : `Faltan ${restan} días del plazo legal`}
            </span>
          )}
          {cerrada && (
            <a href={`/api/pdf-investigacion/${id}`} style={s.pdf} target="_blank" rel="noopener">
              Descargar informe
            </a>
          )}
        </div>
      </div>

      <section style={s.resumen}>
        <Dato e="Persona" v={String(ev.nombres ?? 'Sin identificar')} />
        <Dato e="Identificación" v={String(ev.identificacion ?? '—')} />
        <Dato e="Área" v={String(ev.area ?? '—')} />
        <Dato e="Parte afectada" v={String(ev.parte_cuerpo ?? '—')} />
        <Dato e="Mecanismo" v={String(ev.mecanismo ?? '—')} />
        <Dato e="Gravedad" v={ev.mortal ? 'Mortal' : ev.grave ? 'Grave' : 'Leve'} />
      </section>

      <section style={s.descripcion}>
        <div style={s.descTitulo}>Descripción del hecho</div>
        {String(ev.descripcion)}
      </section>

      <Investigacion key={id} detalle={d} color={color} />
    </div>
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
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    gap: 16, flexWrap: 'wrap', margin: '10px 0 16px',
  },
  codigo: {
    fontFamily: "'Consolas','Courier New',monospace", fontSize: 12,
    color: 'var(--texto-suave)', fontWeight: 600, letterSpacing: .5,
  },
  titulo: { fontSize: 23, fontWeight: 700, color: 'var(--texto)', margin: '4px 0 4px' },
  sub: { fontSize: 13, color: 'var(--texto-suave)', margin: 0 },
  derecha: { display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' },
  chip: {
    display: 'inline-block', padding: '6px 13px', borderRadius: 20,
    fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap',
  },
  pdf: {
    border: '1px solid var(--borde)', background: 'var(--superficie)', color: 'var(--texto)',
    padding: '7px 15px', borderRadius: 8, fontSize: 12.5, fontWeight: 600,
    textDecoration: 'none', whiteSpace: 'nowrap',
  },
  resumen: {
    display: 'grid', gap: 1, background: 'var(--borde)',
    border: '1px solid var(--borde)', borderRadius: 8, overflow: 'hidden',
    gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', marginBottom: 14,
  },
  dato: { background: 'var(--superficie)', padding: '10px 13px', display: 'flex', flexDirection: 'column', gap: 2 },
  datoE: { fontSize: 10.5, color: 'var(--texto-tenue)', textTransform: 'uppercase', letterSpacing: .4 },
  datoV: { fontSize: 13.5, color: 'var(--texto)', fontWeight: 600 },
  descripcion: {
    background: 'var(--superficie)', border: '1px solid var(--borde)', borderRadius: 12,
    padding: '16px 20px', marginBottom: 14, fontSize: 13.5,
    color: 'var(--texto-suave)', lineHeight: 1.65,
  },
  descTitulo: { fontSize: 15, fontWeight: 700, color: 'var(--texto)', marginBottom: 8 },
};
