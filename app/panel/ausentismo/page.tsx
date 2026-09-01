/**
 * AUSENTISMO — Dec. 1072 art. 2.2.4.6.22 · Res. 0312 art. 30
 */
import { redirect } from 'next/navigation';
import { obtenerPerfil } from '@/lib/sesion';
import { empresaActiva } from '@/lib/empresa-activa';
import { crearClienteServidor } from '@/lib/supabase/servidor';
import { listarAusencias } from '@/lib/acciones-ausentismo';
import VistaAusentismo from './VistaAusentismo';

export const dynamic = 'force-dynamic';

export default async function PaginaAusentismo({
  searchParams,
}: {
  searchParams: Promise<{ anio?: string }>;
}) {
  const perfil = await obtenerPerfil();
  if (!perfil) redirect('/login');

  const empresa = await empresaActiva();
  if (!empresa) {
    return (
      <>
        <h1 style={s.titulo}>Ausentismo</h1>
        <p style={s.sub}>Agrega una empresa para registrar sus ausencias.</p>
      </>
    );
  }

  const { anio: anioParam } = await searchParams;
  const actual = new Date().getFullYear();
  const anio = Number(anioParam) || actual;

  const { items, resumen } = await listarAusencias(anio);

  const supabase = await crearClienteServidor();
  const { data: empleados } = await supabase
    .from('empleados')
    .select('id, nombres, identificacion')
    .eq('empresa_id', empresa.id)
    .is('fecha_retiro', null)
    .order('nombres');

  const { data: eventos } = await supabase
    .from('eventos')
    .select('id, codigo, nombres')
    .eq('empresa_id', empresa.id)
    .in('tipo', ['accidente', 'enfermedad'])
    .order('fecha_evento', { ascending: false })
    .limit(60);

  const anios = [actual, actual - 1, actual - 2];

  return (
    <>
      <h1 style={s.titulo}>Ausentismo</h1>
      <p style={s.sub}>
        {empresa.nombre} · Cierra el sexto indicador del artículo 30. Solo las
        ausencias <strong>por causa médica</strong> entran al indicador; las
        licencias de ley se registran igual, porque hacen falta para planear el
        reemplazo, pero no lo inflan.
      </p>

      <div style={s.anios}>
        {anios.map((a) => (
          <a key={a} href={`/panel/ausentismo?anio=${a}`}
            style={{
              ...s.anio,
              background: a === anio ? empresa.color_primario : '#fff',
              color: a === anio ? '#fff' : 'var(--texto-suave)',
              borderColor: a === anio ? empresa.color_primario : 'var(--borde)',
            }}>
            {a}
          </a>
        ))}
      </div>

      <VistaAusentismo
        key={`${empresa.id}-${anio}`}
        anio={anio}
        items={items}
        resumen={resumen}
        empleados={(empleados ?? []) as Array<{
          id: string; nombres: string; identificacion: string;
        }>}
        eventos={(eventos ?? []) as Array<{
          id: string; codigo: string; nombres: string | null;
        }>}
        color={empresa.color_primario}
      />
    </>
  );
}

const s: Record<string, React.CSSProperties> = {
  titulo: { fontSize: 23, fontWeight: 700, color: 'var(--texto)', margin: '0 0 4px' },
  sub: { fontSize: 13.5, color: 'var(--texto-suave)', margin: '0 0 14px', maxWidth: 720, lineHeight: 1.6 },
  anios: { display: 'flex', gap: 6, marginBottom: 16 },
  anio: {
    borderWidth: 1, borderStyle: 'solid', borderRadius: 8,
    padding: '6px 16px', fontSize: 13, fontWeight: 600, textDecoration: 'none',
  },
};
