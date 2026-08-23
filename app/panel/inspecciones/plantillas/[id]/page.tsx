/**
 * EDITOR DE UNA LISTA DE VERIFICACIÓN
 */
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { empresaActiva } from '@/lib/empresa-activa';
import { obtenerPlantillaInspeccion } from '@/lib/acciones-inspecciones';
import EditorCriterios from './EditorCriterios';

export default async function PaginaEditarPlantilla({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const empresa = await empresaActiva();
  const detalle = await obtenerPlantillaInspeccion(id);

  if (!detalle.ok || !detalle.plantilla) notFound();

  return (
    <>
      <Link href="/panel/inspecciones/plantillas" style={s.volver}>← Listas</Link>
      <h1 style={s.titulo}>{detalle.plantilla.nombre}</h1>
      <p style={s.sub}>
        {detalle.items?.length ?? 0} criterio(s)
        {detalle.plantilla.norma && <> · {detalle.plantilla.norma}</>}
      </p>

      <EditorCriterios
        key={`criterios-${id}`}
        detalle={detalle}
        color={empresa?.color_primario ?? '#14263F'}
      />
    </>
  );
}

const s: Record<string, React.CSSProperties> = {
  volver: { fontSize: 13, color: '#5B6470', textDecoration: 'none' },
  titulo: { fontSize: 22, margin: '12px 0 3px', letterSpacing: -0.4 },
  sub: { fontSize: 13, color: '#5B6470', margin: '0 0 22px' },
};
