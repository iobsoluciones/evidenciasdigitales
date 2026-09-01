/**
 * EDITOR DE PREGUNTAS DE UNA PLANTILLA
 */
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { obtenerPerfil } from '@/lib/sesion';
import { obtenerPlantillaDetalle } from '@/lib/acciones-plantillas';
import EditorPreguntasPlantilla from './EditorPreguntasPlantilla';

export default async function PaginaEditarPlantilla({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const perfil = await obtenerPerfil();
  const plantilla = await obtenerPlantillaDetalle(id);

  if (!perfil || !plantilla) notFound();

  return (
    <>
      <Link href="/panel/plantillas" style={s.volver}>← Plantillas</Link>
      <h1 style={s.titulo}>{plantilla.nombre}</h1>
      <p style={s.sub}>Plantilla de evaluación · disponible para todas tus empresas</p>

      <EditorPreguntasPlantilla
        plantilla={plantilla}
        color={perfil.organizacion.color_primario}
      />
    </>
  );
}

const s: Record<string, React.CSSProperties> = {
  volver: { fontSize: 13, color: 'var(--texto-suave)', textDecoration: 'none' },
  titulo: { fontSize: 22, margin: '12px 0 3px', letterSpacing: -0.4 },
  sub: { fontSize: 13, color: 'var(--texto-suave)', margin: '0 0 22px' },
};
