/**
 * MATRIZ DE DOTACIÓN
 * Filas: empleados. Columnas: elementos. La celda muestra vigencia.
 */
import Link from 'next/link';
import { empresaActiva } from '@/lib/empresa-activa';
import { obtenerMatrizDotacion } from '@/lib/acciones-expediente';
import VistaMatrizDotacion from './VistaMatrizDotacion';

export default async function PaginaMatrizDotacion() {
  const empresa = await empresaActiva();

  if (!empresa) {
    return (
      <div style={s.vacio}>
        <p style={{ margin: '0 0 14px', fontSize: 14 }}>
          Agrega una empresa para ver su matriz de dotación.
        </p>
        <Link href="/panel/empresas/nueva" style={s.btn}>Agregar empresa</Link>
      </div>
    );
  }

  const matriz = await obtenerMatrizDotacion();

  return (
    <>
      <h1 style={s.titulo}>Matriz de dotación</h1>
      <p style={s.sub}>
        <strong>{empresa.nombre}</strong> · quién tiene qué elemento vigente y
        dónde hay vencimientos.
      </p>

      <VistaMatrizDotacion
        key={`matriz-dotacion-${empresa.id}`}
        matriz={matriz}
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
