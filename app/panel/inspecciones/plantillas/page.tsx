/**
 * BANCO DE LISTAS DE VERIFICACIÓN
 * Pertenecen a la cuenta: una lista de extintores sirve para todos
 * los clientes del consultor.
 */
import { obtenerPerfil } from '@/lib/sesion';
import { empresaActiva } from '@/lib/empresa-activa';
import { listarPlantillasInspeccion } from '@/lib/acciones-inspecciones';
import VistaPlantillasInspeccion from './VistaPlantillasInspeccion';

export default async function PaginaPlantillasInspeccion() {
  const perfil = await obtenerPerfil();
  const empresa = await empresaActiva();
  if (!perfil) return null;

  const plantillas = await listarPlantillasInspeccion();

  return (
    <>
      <h1 style={s.titulo}>Listas de verificación</h1>
      <p style={s.sub}>
        Reutilizables entre todas tus empresas. Las marcadas como
        <strong> base</strong> salen de la normativa colombiana y sirven de
        punto de partida.
      </p>

      <VistaPlantillasInspeccion
        plantillas={plantillas}
        color={empresa?.color_primario ?? '#14263F'}
      />
    </>
  );
}

const s: Record<string, React.CSSProperties> = {
  titulo: { fontSize: 22, margin: '0 0 3px', letterSpacing: -0.4 },
  sub: { fontSize: 13, color: 'var(--texto-suave)', margin: '0 0 22px', maxWidth: 620, lineHeight: 1.5 },
};
