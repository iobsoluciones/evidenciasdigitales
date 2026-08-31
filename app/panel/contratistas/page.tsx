/**
 * CONTRATISTAS — estándar 2.6.1 · Dec. 1072 art. 2.2.4.6.28
 */
import { redirect } from 'next/navigation';
import { obtenerPerfil } from '@/lib/sesion';
import { empresaActiva } from '@/lib/empresa-activa';
import { listarContratistas } from '@/lib/acciones-contratistas';
import VistaContratistas from './VistaContratistas';

export const dynamic = 'force-dynamic';

export default async function PaginaContratistas() {
  const perfil = await obtenerPerfil();
  if (!perfil) redirect('/login');

  const empresa = await empresaActiva();
  if (!empresa) {
    return (
      <>
        <h1 style={s.titulo}>Contratistas</h1>
        <p style={s.sub}>Agrega una empresa para registrar sus contratistas.</p>
      </>
    );
  }

  const lista = await listarContratistas();

  return (
    <>
      <h1 style={s.titulo}>Contratistas</h1>
      <p style={s.sub}>
        {empresa.nombre} · Estándar 2.6.1. Lo que importa no es tener la ficha
        sino que <strong>los soportes vencen</strong>: una planilla de aportes de
        hace cuatro meses no prueba nada, y la afiliación a la ARL que se
        verificó en enero puede estar cancelada hoy.
      </p>

      <VistaContratistas key={empresa.id} lista={lista} color={empresa.color_primario} />
    </>
  );
}

const s: Record<string, React.CSSProperties> = {
  titulo: { fontSize: 23, fontWeight: 700, color: '#14263F', margin: '0 0 4px' },
  sub: { fontSize: 13.5, color: '#5B6470', margin: '0 0 18px', maxWidth: 720, lineHeight: 1.6 },
};
