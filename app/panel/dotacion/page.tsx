/**
 * INVENTARIO DE DOTACIÓN
 * ---------------------------------------------------------------
 * EPP y equipos en un solo módulo: el documento de entrega es el
 * mismo. Las pestañas separan lo que se controla por cantidad de lo
 * que se controla por unidad.
 */
import Link from 'next/link';
import { obtenerPerfil } from '@/lib/sesion';
import { empresaActiva } from '@/lib/empresa-activa';
import { listarArticulos } from '@/lib/acciones-dotacion';
import VistaInventario from './VistaInventario';

export default async function PaginaDotacion() {
  const perfil = await obtenerPerfil();
  const empresa = await empresaActiva();
  if (!perfil) return null;

  if (!empresa) {
    return (
      <div style={s.vacio}>
        <p style={{ margin: '0 0 14px', fontSize: 14 }}>
          Agrega una empresa para gestionar su dotación.
        </p>
        <Link href="/panel/empresas/nueva" style={s.btn}>Agregar empresa</Link>
      </div>
    );
  }

  const articulos = await listarArticulos();

  return (
    <>
      <h1 style={s.titulo}>Dotación</h1>
      <p style={s.sub}>
        Inventario de <strong>{empresa.nombre}</strong>. Elementos de protección
        y equipos comparten módulo porque el acta de entrega es la misma.
      </p>

      <VistaInventario
        key={`inventario-${empresa.id}`}
        articulos={articulos}
        color={empresa.color_primario}
      />
    </>
  );
}

const s: Record<string, React.CSSProperties> = {
  titulo: { fontSize: 22, margin: '0 0 3px', letterSpacing: -0.4 },
  sub: { fontSize: 13, color: '#5B6470', margin: '0 0 22px', maxWidth: 620, lineHeight: 1.5 },
  vacio: { background: '#fff', border: '1px dashed #DFDFD8', borderRadius: 8, padding: '40px 24px', textAlign: 'center' },
  btn: { background: '#14263F', color: '#fff', padding: '10px 18px', borderRadius: 4, fontSize: 13, fontWeight: 600, textDecoration: 'none' },
};
