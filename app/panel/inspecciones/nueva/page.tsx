/**
 * NUEVA INSPECCIÓN
 */
import Link from 'next/link';
import { obtenerPerfil } from '@/lib/sesion';
import { empresaActiva } from '@/lib/empresa-activa';
import { listarPlantillasInspeccion } from '@/lib/acciones-inspecciones';
import { unidadesParaInspeccion } from '@/lib/acciones-ejecutar-inspeccion';
import FormularioInspeccion from './FormularioInspeccion';

export default async function PaginaNuevaInspeccion() {
  const perfil = await obtenerPerfil();
  const empresa = await empresaActiva();
  if (!perfil || !empresa) return null;

  const [plantillas, unidades] = await Promise.all([
    listarPlantillasInspeccion(),
    unidadesParaInspeccion(),
  ]);

  return (
    <>
      <Link href="/panel/inspecciones" style={s.volver}>← Inspecciones</Link>
      <h1 style={s.titulo}>Nueva inspección</h1>
      <p style={s.sub}>
        Los criterios se copian de la lista: si la modificas después,
        esta inspección conserva los que se usaron.
      </p>

      <FormularioInspeccion
        plantillas={plantillas}
        unidades={unidades}
        inspectorPorDefecto={perfil.nombre}
        color={empresa.color_primario}
      />
    </>
  );
}

const s: Record<string, React.CSSProperties> = {
  volver: { fontSize: 13, color: '#5B6470', textDecoration: 'none' },
  titulo: { fontSize: 22, margin: '12px 0 3px', letterSpacing: -0.4 },
  sub: { fontSize: 13, color: '#5B6470', margin: '0 0 22px', maxWidth: 580, lineHeight: 1.5 },
};
