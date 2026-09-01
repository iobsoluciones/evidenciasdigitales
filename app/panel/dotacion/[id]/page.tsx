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
import { inspeccionesDeUnidades } from '@/lib/acciones-inspecciones';
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

  // Historial de inspecciones de cada unidad: es lo que una auditoria
  // de alturas pide junto al de entregas y mantenimientos.
  const inspecciones = await inspeccionesDeUnidades(
    (ficha.unidades ?? []).map((u) => u.id)
  );

  return (
    <>
      <Link href="/panel/dotacion" style={{ fontSize: 13, color: 'var(--texto-suave)', textDecoration: 'none' }}>
        ← Dotación
      </Link>

      <VistaArticulo
        key={`articulo-${id}`}
        ficha={ficha}
        inspecciones={inspecciones}
        orgId={perfil.organizacion.id}
        color={empresa.color_primario}
      />
    </>
  );
}
