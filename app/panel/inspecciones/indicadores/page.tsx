/**
 * INDICADORES DE INSPECCIONES
 */
import Link from 'next/link';
import { empresaActiva } from '@/lib/empresa-activa';
import { obtenerIndicadores } from '@/lib/acciones-indicadores-inspeccion';
import VistaIndicadores from './VistaIndicadores';

export default async function PaginaIndicadores() {
  const empresa = await empresaActiva();

  if (!empresa) {
    return (
      <div style={s.vacio}>
        <p style={{ margin: '0 0 14px', fontSize: 14 }}>
          Agrega una empresa para ver sus indicadores.
        </p>
        <Link href="/panel/empresas/nueva" style={s.btn}>Agregar empresa</Link>
      </div>
    );
  }

  const datos = await obtenerIndicadores();
  if (!datos) return null;

  return (
    <>
      <h1 style={s.titulo}>Indicadores de inspección</h1>
      <p style={s.sub}>
        <strong>{empresa.nombre}</strong> · últimos 6 meses.
      </p>

      <VistaIndicadores
        key={`indicadores-${empresa.id}`}
        datos={datos}
        color={empresa.color_primario}
      />
    </>
  );
}

const s: Record<string, React.CSSProperties> = {
  titulo: { fontSize: 22, margin: '0 0 3px', letterSpacing: -0.4 },
  sub: { fontSize: 13, color: 'var(--texto-suave)', margin: '0 0 20px' },
  vacio: { background: 'var(--superficie)', border: '1px dashed var(--borde-fuerte)', borderRadius: 8, padding: '40px 24px', textAlign: 'center' },
  btn: { background: 'var(--marca)', color: 'var(--sobre-marca)', padding: '10px 18px', borderRadius: 4, fontSize: 13, fontWeight: 600, textDecoration: 'none' },
};
