/**
 * PLAN DE ACCIÓN
 * Consolida los hallazgos convertidos en acciones con responsable y
 * fecha. El cierre del ciclo de las inspecciones.
 */
import Link from 'next/link';
import { empresaActiva } from '@/lib/empresa-activa';
import { listarAcciones } from '@/lib/acciones-plan';
import VistaAcciones from './VistaAcciones';

export default async function PaginaAcciones() {
  const empresa = await empresaActiva();

  if (!empresa) {
    return (
      <div style={s.vacio}>
        <p style={{ margin: '0 0 14px', fontSize: 14 }}>
          Agrega una empresa para ver su plan de acción.
        </p>
        <Link href="/panel/empresas/nueva" style={s.btn}>Agregar empresa</Link>
      </div>
    );
  }

  const acciones = await listarAcciones();

  return (
    <>
      <h1 style={s.titulo}>Plan de acción</h1>
      <p style={s.sub}>
        <strong>{empresa.nombre}</strong> · seguimiento de los hallazgos hasta su cierre.
      </p>

      <VistaAcciones
        key={`acciones-${empresa.id}`}
        acciones={acciones}
        color={empresa.color_primario}
      />
    </>
  );
}

const s: Record<string, React.CSSProperties> = {
  titulo: { fontSize: 22, margin: '0 0 3px', letterSpacing: -0.4 },
  sub: { fontSize: 13, color: 'var(--texto-suave)', margin: '0 0 20px' },
  vacio: { background: 'var(--superficie)', border: '1px dashed var(--borde-fuerte)', borderRadius: 8, padding: '40px 24px', textAlign: 'center' },
  btn: { background: 'var(--marca)', color: 'var(--superficie)', padding: '10px 18px', borderRadius: 4, fontSize: 13, fontWeight: 600, textDecoration: 'none' },
};
