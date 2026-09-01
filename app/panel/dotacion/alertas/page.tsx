/**
 * ALERTAS DE DOTACIÓN
 * Todo lo que requiere acción, en una sola pantalla.
 */
import Link from 'next/link';
import { empresaActiva } from '@/lib/empresa-activa';
import { obtenerAlertas } from '@/lib/acciones-devoluciones';
import VistaAlertas from './VistaAlertas';

export default async function PaginaAlertas({
  searchParams,
}: {
  searchParams: Promise<{ dias?: string }>;
}) {
  const { dias } = await searchParams;
  const empresa = await empresaActiva();

  if (!empresa) {
    return (
      <div style={s.vacio}>
        <p style={{ margin: '0 0 14px', fontSize: 14 }}>
          Agrega una empresa para ver sus alertas.
        </p>
        <Link href="/panel/empresas/nueva" style={s.btn}>Agregar empresa</Link>
      </div>
    );
  }

  const periodo = [30, 60, 90].includes(Number(dias)) ? Number(dias) : 60;
  const alertas = await obtenerAlertas(periodo);

  return (
    <>
      <h1 style={s.titulo}>Alertas</h1>
      <p style={s.sub}>
        Lo que requiere acción en <strong>{empresa.nombre}</strong>: vencimientos,
        existencias bajo mínimo, equipos sin devolver y garantías por expirar.
      </p>

      <VistaAlertas
        key={`alertas-${empresa.id}-${periodo}`}
        alertas={alertas}
        dias={periodo}
        color={empresa.color_primario}
      />
    </>
  );
}

const s: Record<string, React.CSSProperties> = {
  titulo: { fontSize: 22, margin: '0 0 3px', letterSpacing: -0.4 },
  sub: { fontSize: 13, color: 'var(--texto-suave)', margin: '0 0 22px', maxWidth: 640, lineHeight: 1.5 },
  vacio: { background: 'var(--superficie)', border: '1px dashed var(--borde-fuerte)', borderRadius: 8, padding: '40px 24px', textAlign: 'center' },
  btn: { background: 'var(--marca)', color: 'var(--sobre-marca)', padding: '10px 18px', borderRadius: 4, fontSize: 13, fontWeight: 600, textDecoration: 'none' },
};
