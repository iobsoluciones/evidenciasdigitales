/**
 * MATRIZ DE CAPACITACIONES
 * Filas: empleados. Columnas: capacitaciones.
 */
import Link from 'next/link';
import { empresaActiva } from '@/lib/empresa-activa';
import { obtenerMatriz } from '@/lib/acciones-convocatoria';
import VistaMatriz from './VistaMatriz';

export default async function PaginaMatriz({
  searchParams,
}: {
  searchParams: Promise<{ desde?: string; hasta?: string }>;
}) {
  const { desde, hasta } = await searchParams;
  const empresa = await empresaActiva();

  if (!empresa) {
    return (
      <div style={s.vacio}>
        <p style={{ margin: '0 0 14px', fontSize: 14 }}>
          Agrega una empresa para ver su matriz.
        </p>
        <Link href="/panel/empresas/nueva" style={s.btn}>Agregar empresa</Link>
      </div>
    );
  }

  const matriz = await obtenerMatriz(desde ?? null, hasta ?? null);

  return (
    <>
      <h1 style={s.titulo}>Matriz de capacitaciones</h1>
      <p style={s.sub}>
        <strong>{empresa.nombre}</strong> · quién recibió qué formación y dónde
        quedan huecos.
      </p>

      <VistaMatriz
        key={`matriz-${empresa.id}`}
        matriz={matriz}
        empresaNombre={empresa.nombre}
        color={empresa.color_primario}
      />
    </>
  );
}

const s: Record<string, React.CSSProperties> = {
  titulo: { fontSize: 22, margin: '0 0 3px', letterSpacing: -0.4 },
  sub: { fontSize: 13, color: 'var(--texto-suave)', margin: '0 0 20px' },
  vacio: { background: 'var(--superficie)', border: '1px dashed var(--borde-fuerte)', borderRadius: 8, padding: '40px 24px', textAlign: 'center' },
  btn: { background: 'var(--marca)', color: 'var(--sobre-empresa)', padding: '10px 18px', borderRadius: 4, fontSize: 13, fontWeight: 600, textDecoration: 'none' },
};
