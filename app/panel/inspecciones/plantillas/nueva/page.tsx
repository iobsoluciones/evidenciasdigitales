/**
 * NUEVA LISTA DE VERIFICACIÓN
 */
import Link from 'next/link';
import { empresaActiva } from '@/lib/empresa-activa';
import FormularioPlantillaInspeccion from '../FormularioPlantillaInspeccion';

export default async function PaginaNuevaPlantilla() {
  const empresa = await empresaActiva();

  return (
    <>
      <Link href="/panel/inspecciones/plantillas" style={s.volver}>← Listas</Link>
      <h1 style={s.titulo}>Nueva lista de verificación</h1>
      <p style={s.sub}>
        Al crearla se abre el editor para agregar los criterios.
      </p>

      <FormularioPlantillaInspeccion color={empresa?.color_primario ?? '#14263F'} />
    </>
  );
}

const s: Record<string, React.CSSProperties> = {
  volver: { fontSize: 13, color: '#5B6470', textDecoration: 'none' },
  titulo: { fontSize: 22, margin: '12px 0 3px', letterSpacing: -0.4 },
  sub: { fontSize: 13, color: '#5B6470', margin: '0 0 22px' },
};
