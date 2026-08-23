/**
 * CONVOCATORIA — pantalla propia
 * ---------------------------------------------------------------
 * Se abre desde el listado como una acción más. Tenerla en su propia
 * ruta permite llegar directo desde cualquier sitio sin pasar por el
 * detalle completo de la capacitación.
 */
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { crearClienteServidor } from '@/lib/supabase/servidor';
import { obtenerPerfil } from '@/lib/sesion';
import { empleadosParaConvocar } from '@/lib/acciones-convocatoria';
import Convocatoria from '../Convocatoria';

export default async function PaginaConvocatoria({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await crearClienteServidor();
  const perfil = await obtenerPerfil();

  const { data: cap } = await supabase
    .from('v_capacitaciones_resumen')
    .select('id, codigo, tema, estado, esperados, registrados')
    .eq('id', id)
    .maybeSingle();

  if (!cap || !perfil) notFound();

  const empleados = await empleadosParaConvocar(id);
  const color = perfil.organizacion.color_primario;

  return (
    <>
      <Link href="/panel/capacitaciones" style={s.volver}>← Capacitaciones</Link>

      <h1 style={s.titulo}>Convocatoria</h1>
      <p style={s.sub}>
        <span style={s.mono}>{cap.codigo}</span> · {cap.tema}
      </p>

      {cap.estado !== 'activa' && (
        <div style={s.aviso}>
          Esta capacitación está <strong>{cap.estado}</strong>. Actívala para
          modificar la convocatoria.
        </div>
      )}

      <Convocatoria
        capacitacionId={cap.id}
        empleados={empleados}
        color={color}
        soloLectura={cap.estado !== 'activa'}
      />

      <Link href={`/panel/capacitaciones/${cap.id}`} style={s.enlace}>
        Ver detalle de la capacitación →
      </Link>
    </>
  );
}

const s: Record<string, React.CSSProperties> = {
  volver: { fontSize: 13, color: '#5B6470', textDecoration: 'none' },
  titulo: { fontSize: 22, margin: '12px 0 3px', letterSpacing: -0.4 },
  sub: { fontSize: 13, color: '#5B6470', margin: '0 0 20px' },
  mono: { fontFamily: 'ui-monospace,SFMono-Regular,Menlo,monospace', fontSize: 12 },
  aviso: {
    background: '#FEFCE8', color: '#8A6100', padding: '11px 15px',
    borderRadius: 6, fontSize: 13, marginBottom: 18,
  },
  enlace: { fontSize: 12.5, color: '#5B6470', textDecoration: 'none' },
};
