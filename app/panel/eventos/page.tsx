/**
 * EVENTOS — accidentes, incidentes y enfermedades laborales
 * ---------------------------------------------------------------
 * Resolución 1401 de 2007 · Decreto 1072 art. 2.2.4.6.32
 */
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { obtenerPerfil } from '@/lib/sesion';
import { empresaActiva } from '@/lib/empresa-activa';
import { listarEventos } from '@/lib/acciones-eventos';
import VistaEventos from './VistaEventos';

export const dynamic = 'force-dynamic';

export default async function PaginaEventos() {
  const perfil = await obtenerPerfil();
  if (!perfil) redirect('/login');

  const empresa = await empresaActiva();
  const color = empresa?.color_primario ?? '#14263F';

  if (!empresa) {
    return (
      <>
        <h1 style={s.titulo}>Eventos</h1>
        <p style={s.sub}>Agrega una empresa para registrar sus accidentes e incidentes.</p>
      </>
    );
  }

  const eventos = await listarEventos();

  return (
    <>
      <div style={s.cabecera}>
        <div>
          <h1 style={s.titulo}>Accidentes e incidentes</h1>
          <p style={s.sub}>
            {empresa.nombre} · la investigación vence a los 15 días del hecho
          </p>
        </div>
        <Link href="/panel/eventos/nuevo" style={{ ...s.boton, background: color }}>
          Registrar evento
        </Link>
      </div>

      <VistaEventos key={empresa.id} eventos={eventos} color={color} />
    </>
  );
}

const s: Record<string, React.CSSProperties> = {
  cabecera: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
    gap: 16, flexWrap: 'wrap', marginBottom: 18,
  },
  titulo: { fontSize: 23, fontWeight: 700, color: '#14263F', margin: '0 0 4px' },
  sub: { fontSize: 13.5, color: '#5B6470', margin: 0 },
  boton: {
    color: '#fff', padding: '10px 20px', borderRadius: 9, fontSize: 13.5,
    fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap',
  },
};
