/**
 * NUEVA PLANTILLA desde cero
 */
import Link from 'next/link';
import { obtenerPerfil } from '@/lib/sesion';
import FormularioPlantilla from '../FormularioPlantilla';

export default async function PaginaNuevaPlantilla({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string }>;
}) {
  const { tipo } = await searchParams;
  const perfil = await obtenerPerfil();
  if (!perfil) return null;

  return (
    <>
      <Link href="/panel/plantillas" style={s.volver}>← Plantillas</Link>
      <h1 style={s.titulo}>Nueva plantilla</h1>
      <p style={s.sub}>
        Se guarda en tu cuenta y queda disponible para todas tus empresas.
      </p>

      <FormularioPlantilla
        tipoInicial={tipo === 'evaluacion' ? 'evaluacion' : 'capacitacion'}
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
