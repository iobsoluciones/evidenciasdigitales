/**
 * REPORTE RÁPIDO DE UN EVENTO
 * Separado de la investigación a propósito: se diligencia el mismo día.
 */
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { obtenerPerfil } from '@/lib/sesion';
import { empresaActiva } from '@/lib/empresa-activa';
import { crearClienteServidor } from '@/lib/supabase/servidor';
import FormularioEvento from './FormularioEvento';

export const dynamic = 'force-dynamic';

export default async function PaginaNuevoEvento() {
  const perfil = await obtenerPerfil();
  if (!perfil) redirect('/login');

  const empresa = await empresaActiva();
  if (!empresa) redirect('/panel/eventos');

  // Solo activos: un retirado no puede sufrir un accidente de trabajo hoy.
  const supabase = await crearClienteServidor();
  const { data } = await supabase
    .from('empleados')
    .select('id, nombres, identificacion, area')
    .eq('empresa_id', empresa.id)
    .is('fecha_retiro', null)
    .order('nombres');

  return (
    <div style={{ maxWidth: 760 }}>
      <Link href="/panel/eventos" style={s.volver}>← Accidentes e incidentes</Link>
      <h1 style={s.titulo}>Registrar un evento</h1>
      <p style={s.sub}>
        Deja constancia ahora con lo que sepas. La investigación se completa
        después: lo que no puede esperar es el registro, porque el plazo corre
        desde el día del hecho.
      </p>

      <FormularioEvento
        empleados={(data ?? []) as Array<{ id: string; nombres: string; identificacion: string; area: string | null }>}
        color={empresa.color_primario}
      />
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  volver: { fontSize: 12.5, color: 'var(--texto-suave)', textDecoration: 'none' },
  titulo: { fontSize: 23, fontWeight: 700, color: 'var(--texto)', margin: '10px 0 4px' },
  sub: { fontSize: 13.5, color: 'var(--texto-suave)', margin: '0 0 20px', lineHeight: 1.6, maxWidth: 560 },
};
