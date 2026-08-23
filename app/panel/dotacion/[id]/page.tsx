/**
 * FICHA DEL ARTÍCULO
 * Consumible: existencia e historial de movimientos.
 * Retornable: unidades con placa, estado y foto propia.
 */
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { obtenerPerfil } from '@/lib/sesion';
import { empresaActiva } from '@/lib/empresa-activa';
import { obtenerFichaArticulo } from '@/lib/acciones-dotacion';
import VistaArticulo from './VistaArticulo';

export default async function PaginaArticulo({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const perfil = await obtenerPerfil();
  const empresa = await empresaActiva();
  const ficha = await obtenerFichaArticulo(id);

  if (!ficha.ok || !ficha.articulo || !perfil || !empresa) notFound();

  return (
    <>
      <Link href="/panel/dotacion" style={{ fontSize: 13, color: '#5B6470', textDecoration: 'none' }}>
        ← Dotación
      </Link>

      <VistaArticulo
        key={`articulo-${id}`}
        ficha={ficha}
        orgId={perfil.organizacion.id}
        color={empresa.color_primario}
      />
    </>
  );
}
