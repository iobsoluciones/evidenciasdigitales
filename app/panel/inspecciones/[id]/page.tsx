/**
 * EJECUTAR O CONSULTAR UNA INSPECCIÓN
 */
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { obtenerPerfil } from '@/lib/sesion';
import { empresaActiva } from '@/lib/empresa-activa';
import { obtenerInspeccion } from '@/lib/acciones-ejecutar-inspeccion';
import EjecutarInspeccion from './EjecutarInspeccion';

export default async function PaginaInspeccion({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const perfil = await obtenerPerfil();
  const empresa = await empresaActiva();
  const detalle = await obtenerInspeccion(id);

  if (!detalle.ok || !detalle.inspeccion || !perfil || !empresa) notFound();

  const i = detalle.inspeccion;

  return (
    <>
      <Link href="/panel/inspecciones" style={s.volver}>← Inspecciones</Link>

      <div style={s.cabecera}>
        <div style={s.codigo}>{i.codigo}</div>
        <h1 style={s.titulo}>{i.nombre}</h1>
        <p style={s.sub}>
          {i.objeto_nombre && <>{i.objeto_nombre} · </>}
          {i.inspector}
          {i.norma && <> · {i.norma}</>}
        </p>
      </div>

      <EjecutarInspeccion
        key={`inspeccion-${id}`}
        detalle={detalle}
        orgId={perfil.organizacion.id}
        color={empresa.color_primario}
      />
    </>
  );
}

const s: Record<string, React.CSSProperties> = {
  volver: { fontSize: 13, color: 'var(--texto-suave)', textDecoration: 'none' },
  cabecera: { marginTop: 12, marginBottom: 18 },
  codigo: {
    fontSize: 11, color: 'var(--texto-tenue)', letterSpacing: .5,
    fontFamily: 'ui-monospace,SFMono-Regular,Menlo,monospace',
  },
  titulo: { fontSize: 22, margin: '3px 0', letterSpacing: -0.4 },
  sub: { fontSize: 13, color: 'var(--texto-suave)', margin: 0 },
};
