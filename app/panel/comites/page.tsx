/**
 * COMITÉS — COPASST / Vigía y Comité de Convivencia Laboral
 * Estándares 1.1.6 y 1.1.8 de la Resolución 0312.
 */
import { redirect } from 'next/navigation';
import { obtenerPerfil } from '@/lib/sesion';
import { empresaActiva } from '@/lib/empresa-activa';
import { crearClienteServidor } from '@/lib/supabase/servidor';
import { listarComites, obtenerComite } from '@/lib/acciones-comites';
import VistaComites from './VistaComites';

export const dynamic = 'force-dynamic';

export default async function PaginaComites({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const perfil = await obtenerPerfil();
  if (!perfil) redirect('/login');

  const empresa = await empresaActiva();
  if (!empresa) {
    return (
      <>
        <h1 style={s.titulo}>Comités</h1>
        <p style={s.sub}>Agrega una empresa para conformar sus comités.</p>
      </>
    );
  }

  const { id } = await searchParams;
  const comites = await listarComites();
  const elegido = id ?? comites[0]?.id;
  const detalle = elegido ? await obtenerComite(elegido) : null;

  const supabase = await crearClienteServidor();
  const { data: empleados } = await supabase
    .from('empleados')
    .select('id, nombres, identificacion, cargo')
    .eq('empresa_id', empresa.id)
    .is('fecha_retiro', null)
    .order('nombres');

  return (
    <>
      <h1 style={s.titulo}>Comités</h1>
      <p style={s.sub}>
        {empresa.nombre} · COPASST o Vigía en SST y Comité de Convivencia Laboral.
        La aplicación calcula la composición que exige la norma según los
        trabajadores activos y avisa cuando el comité está mal conformado.
      </p>

      <VistaComites
        key={elegido ?? 'nuevo'}
        comites={comites}
        detalle={detalle}
        empleados={(empleados ?? []) as Array<{
          id: string; nombres: string; identificacion: string; cargo: string | null;
        }>}
        orgId={perfil.organizacion.id}
        color={empresa.color_primario}
      />
    </>
  );
}

const s: Record<string, React.CSSProperties> = {
  titulo: { fontSize: 23, fontWeight: 700, color: '#14263F', margin: '0 0 4px' },
  sub: { fontSize: 13.5, color: '#5B6470', margin: '0 0 18px', maxWidth: 700, lineHeight: 1.6 },
};
