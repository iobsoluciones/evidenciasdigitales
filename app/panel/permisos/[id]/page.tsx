/**
 * DETALLE DEL PERMISO DE ALTO RIESGO
 * Res. 4272 de 2021 · Res. 491 de 2020 · Dec. 1072 art. 2.2.4.6.24.
 */
import { redirect, notFound } from 'next/navigation';
import { obtenerPerfil } from '@/lib/sesion';
import { empresaActiva } from '@/lib/empresa-activa';
import { crearClienteServidor } from '@/lib/supabase/servidor';
import { obtenerPermiso } from '@/lib/acciones-permisos';
import EditorPermiso from './EditorPermiso';

export const dynamic = 'force-dynamic';

const TIPOS: Record<string, string> = {
  alturas: 'Trabajo en alturas',
  espacios_confinados: 'Espacios confinados',
  trabajo_caliente: 'Trabajo en caliente',
  energias: 'Energías peligrosas',
  izaje: 'Izaje de cargas',
  excavacion: 'Excavación',
};

export default async function PaginaPermiso({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const perfil = await obtenerPerfil();
  if (!perfil) redirect('/login');

  const { id } = await params;
  const detalle = await obtenerPermiso(id);
  if (!detalle.ok || !detalle.permiso) notFound();

  const empresa = await empresaActiva();

  const supabase = await crearClienteServidor();
  const { data: empleados } = await supabase
    .from('empleados')
    .select('id, nombres, identificacion, cargo')
    .eq('empresa_id', empresa?.id ?? '')
    .is('fecha_retiro', null)
    .order('nombres');

  const p = detalle.permiso;

  return (
    <>
      <p style={s.migas}>
        <a href="/panel/permisos" style={s.a}>Permisos</a> · {p.codigo}
      </p>

      <h1 style={s.titulo}>{TIPOS[p.tipo] ?? p.tipo}</h1>
      <p style={s.sub}>
        {new Date(p.fecha + 'T12:00:00').toLocaleDateString('es-CO', {
          day: '2-digit', month: 'long', year: 'numeric',
        })}
        {' · '}
        {p.hora_inicio.slice(0, 5)} a {p.hora_fin.slice(0, 5)}
        {p.lugar ? ` · ${p.lugar}` : ''}
      </p>

      <EditorPermiso
        key={p.id}
        permiso={p}
        requisitos={detalle.requisitos ?? []}
        participantes={detalle.participantes ?? []}
        empleados={(empleados ?? []) as Array<{
          id: string; nombres: string; identificacion: string; cargo: string | null;
        }>}
        color={empresa?.color_primario ?? '#14263F'}
      />
    </>
  );
}

const s: Record<string, React.CSSProperties> = {
  migas: { fontSize: 12.5, color: '#8A929C', margin: '0 0 6px' },
  a: { color: '#14263F', fontWeight: 600 },
  titulo: { fontSize: 23, fontWeight: 700, color: '#14263F', margin: '0 0 4px' },
  sub: { fontSize: 13.5, color: '#5B6470', margin: '0 0 18px', lineHeight: 1.6 },
};
