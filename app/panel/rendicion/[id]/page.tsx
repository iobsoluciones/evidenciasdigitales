/**
 * DETALLE DE LA RENDICIÓN DE CUENTAS
 * Estándar 2.8.1 · Dec. 1072 art. 2.2.4.6.8 num. 3.
 */
import { redirect, notFound } from 'next/navigation';
import { obtenerPerfil } from '@/lib/sesion';
import { empresaActiva } from '@/lib/empresa-activa';
import { crearClienteServidor } from '@/lib/supabase/servidor';
import { obtenerRendicion } from '@/lib/acciones-rendicion';
import EditorRendicion from './EditorRendicion';

export const dynamic = 'force-dynamic';

export default async function PaginaRendicionDetalle({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const perfil = await obtenerPerfil();
  if (!perfil) redirect('/login');

  const { id } = await params;
  const detalle = await obtenerRendicion(id);
  if (!detalle.ok || !detalle.rendicion) notFound();

  const empresa = await empresaActiva();

  const supabase = await crearClienteServidor();
  const { data: empleados } = await supabase
    .from('empleados')
    .select('id, nombres, identificacion')
    .eq('empresa_id', empresa?.id ?? '')
    .is('fecha_retiro', null)
    .order('nombres');

  const r = detalle.rendicion;

  return (
    <>
      <p style={s.migas}>
        <a href="/panel/rendicion" style={s.a}>Rendición de cuentas</a> · {r.codigo}
      </p>

      <h1 style={s.titulo}>Rendición de cuentas {r.anio}</h1>
      <p style={s.sub}>
        {new Date(r.fecha + 'T12:00:00').toLocaleDateString('es-CO', {
          day: '2-digit', month: 'long', year: 'numeric',
        })}
        {' · Estándar 2.8.1'}
      </p>

      <EditorRendicion
        key={r.id}
        rendicion={r}
        responsables={detalle.responsables ?? []}
        empleados={(empleados ?? []) as Array<{
          id: string; nombres: string; identificacion: string;
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
