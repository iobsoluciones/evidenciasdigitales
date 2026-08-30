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
            <span style={{ ...s.chip, background: '#E6F4EA', color: '#1E6B3A' }}>
              Investigación cerrada
            </span>
          ) : (
            <span style={{
              ...s.chip,
              background: restan < 0 ? '#FDF2F2' : restan <= 7 ? '#FFF7ED' : '#E6F4EA',
              color: restan < 0 ? '#9B1C1C' : restan <= 7 ? '#9A3412' : '#1E6B3A',
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
  volver: { fontSize: 12.5, color: '#5B6470', textDecoration: 'none' },
  cabecera: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    gap: 16, flexWrap: 'wrap', margin: '10px 0 16px',
  },
  codigo: {
    fontFamily: "'Consolas','Courier New',monospace", fontSize: 12,
    color: '#5B6470', fontWeight: 600, letterSpacing: .5,
  },
  titulo: { fontSize: 23, fontWeight: 700, color: '#14263F', margin: '4px 0 4px' },
  sub: { fontSize: 13, color: '#5B6470', margin: 0 },
  derecha: { display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' },
  chip: {
    display: 'inline-block', padding: '6px 13px', borderRadius: 20,
    fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap',
  },
  pdf: {
    border: '1px solid #E4E4DF', background: '#fff', color: '#14263F',
    padding: '7px 15px', borderRadius: 8, fontSize: 12.5, fontWeight: 600,
    textDecoration: 'none', whiteSpace: 'nowrap',
  },
  resumen: {
    display: 'grid', gap: 1, background: '#E4E4DF',
    border: '1px solid #E4E4DF', borderRadius: 10, overflow: 'hidden',
    gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', marginBottom: 14,
  },
  dato: { background: '#fff', padding: '10px 13px', display: 'flex', flexDirection: 'column', gap: 2 },
  datoE: { fontSize: 10.5, color: '#8A929C', textTransform: 'uppercase', letterSpacing: .4 },
  datoV: { fontSize: 13.5, color: '#14263F', fontWeight: 600 },
  descripcion: {
    background: '#fff', border: '1px solid #E4E4DF', borderRadius: 12,
    padding: '16px 20px', marginBottom: 14, fontSize: 13.5,
    color: '#374151', lineHeight: 1.65,
  },
  descTitulo: { fontSize: 15, fontWeight: 700, color: '#14263F', marginBottom: 8 },
};
