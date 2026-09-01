/**
 * DETALLE DE LA ENTREGA
 */
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { obtenerPerfil } from '@/lib/sesion';
import { empresaActiva } from '@/lib/empresa-activa';
import { obtenerEntrega } from '@/lib/acciones-entregas';
import VistaEntrega from './VistaEntrega';

export default async function PaginaEntrega({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const perfil = await obtenerPerfil();
  const empresa = await empresaActiva();
  const detalle = await obtenerEntrega(id);

  if (!detalle.ok || !detalle.entrega || !perfil || !empresa) notFound();

  return (
    <>
      <Link
        href="/panel/dotacion/entregas"
        style={{ fontSize: 13, color: 'var(--texto-suave)', textDecoration: 'none' }}
      >
        ← Entregas
      </Link>

      <VistaEntrega
        key={`entrega-${id}`}
        detalle={detalle}
        orgId={perfil.organizacion.id}
        color={empresa.color_primario}
      />
    </>
  );
}
