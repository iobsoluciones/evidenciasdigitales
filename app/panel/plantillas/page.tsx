/**
 * BANCO DE PLANTILLAS
 * ---------------------------------------------------------------
 * Pertenecen a la cuenta del consultor, no a una empresa: reutilizar
 * el mismo contenido entre clientes es lo que las hace valiosas.
 */
import { obtenerPerfil } from '@/lib/sesion';
import {
  listarPlantillasEvaluacion,
  listarPlantillasCapacitacion,
} from '@/lib/acciones-plantillas';
import Link from 'next/link';
import VistaPlantillas from './VistaPlantillas';

export default async function PaginaPlantillas() {
  const perfil = await obtenerPerfil();
  if (!perfil) return null;

  const [evaluaciones, capacitaciones] = await Promise.all([
    listarPlantillasEvaluacion(),
    listarPlantillasCapacitacion(),
  ]);

  return (
    <>
      <div style={s.cabecera}>
        <div>
          <h1 style={s.titulo}>Plantillas</h1>
          <p style={s.sub}>
            Contenido reutilizable entre todas tus empresas. Créalas aquí
            o guárdalas desde una capacitación ya dictada.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Link href="/panel/plantillas/nueva?tipo=capacitacion" style={s.btn}>
            + Capacitación
          </Link>
          <Link href="/panel/plantillas/nueva?tipo=evaluacion" style={s.btnSec}>
            + Evaluación
          </Link>
        </div>
      </div>

      <VistaPlantillas
        evaluaciones={evaluaciones}
        capacitaciones={capacitaciones}
        color={perfil.organizacion.color_primario}
      />
    </>
  );
}

const s: Record<string, React.CSSProperties> = {
  titulo: { fontSize: 22, margin: '0 0 3px', letterSpacing: -0.4 },
  sub: { fontSize: 13, color: 'var(--texto-suave)', margin: 0, maxWidth: 520 },
  cabecera: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap', marginBottom: 22 },
  btn: { background: 'var(--marca)', color: 'var(--sobre-marca)', padding: '10px 16px', borderRadius: 4, fontSize: 13, fontWeight: 600, textDecoration: 'none' },
  btnSec: { background: 'var(--superficie)', color: 'var(--texto)', border: '1px solid var(--borde-fuerte)', padding: '10px 16px', borderRadius: 4, fontSize: 13, fontWeight: 600, textDecoration: 'none' },
};
