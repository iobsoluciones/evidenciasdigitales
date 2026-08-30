/**
 * DETALLE DEL SIMULACRO
 * Estándar 5.1.1 · Decreto 1072 de 2015, art. 2.2.4.6.25.
 */
import { redirect, notFound } from 'next/navigation';
import { obtenerPerfil } from '@/lib/sesion';
import { empresaActiva } from '@/lib/empresa-activa';
import { crearClienteServidor } from '@/lib/supabase/servidor';
import { obtenerSimulacro, listarAmenazas } from '@/lib/acciones-emergencias';
import EditorSimulacro from './EditorSimulacro';

export const dynamic = 'force-dynamic';

const TIPOS: Record<string, string> = {
  evacuacion: 'Evacuación',
  incendio: 'Conato de incendio',
  sismo: 'Sismo',
  primeros_auxilios: 'Primeros auxilios',
  derrame: 'Derrame de químicos',
  otro: 'Otro',
};

export default async function PaginaSimulacro({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const perfil = await obtenerPerfil();
  if (!perfil) redirect('/login');

  const { id } = await params;
  const detalle = await obtenerSimulacro(id);
  if (!detalle.ok || !detalle.simulacro) notFound();

  const empresa = await empresaActiva();
  const { items: amenazas } = await listarAmenazas();

  const supabase = await crearClienteServidor();
  const { data: empleados } = await supabase
    .from('empleados')
    .select('id, nombres, identificacion, cargo')
    .eq('empresa_id', empresa?.id ?? '')
    .is('fecha_retiro', null)
    .order('nombres');

  const sim = detalle.simulacro;

  return (
    <>
      <p style={s.migas}>
        <a href="/panel/emergencias/simulacros" style={s.a}>Simulacros</a> · {sim.codigo}
      </p>

      <h1 style={s.titulo}>
        Simulacro de {(TIPOS[sim.tipo] ?? sim.tipo).toLowerCase()}
      </h1>
      <p style={s.sub}>
        {new Date(sim.fecha + 'T12:00:00').toLocaleDateString('es-CO', {
          day: '2-digit', month: 'long', year: 'numeric',
        })}
        {detalle.amenaza ? ` · simula la amenaza «${detalle.amenaza}»` : ''}
      </p>

      <EditorSimulacro
        key={sim.id}
        simulacro={sim}
        evaluadores={detalle.evaluadores ?? []}
        amenazas={amenazas}
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
