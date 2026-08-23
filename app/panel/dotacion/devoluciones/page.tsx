/**
 * DEVOLUCIONES DE EQUIPOS
 */
import Link from 'next/link';
import { obtenerPerfil } from '@/lib/sesion';
import { empresaActiva } from '@/lib/empresa-activa';
import { listarPorDevolver, listarDevoluciones } from '@/lib/acciones-devoluciones';
import VistaDevoluciones from './VistaDevoluciones';

export default async function PaginaDevoluciones() {
  const perfil = await obtenerPerfil();
  const empresa = await empresaActiva();
  if (!perfil) return null;

  if (!empresa) {
    return (
      <div style={s.vacio}>
        <p style={{ margin: '0 0 14px', fontSize: 14 }}>
          Agrega una empresa para gestionar devoluciones.
        </p>
        <Link href="/panel/empresas/nueva" style={s.btn}>Agregar empresa</Link>
      </div>
    );
  }

  const [pendientes, historial] = await Promise.all([
    listarPorDevolver(),
    listarDevoluciones(),
  ]);

  return (
    <>
      <h1 style={s.titulo}>Devoluciones</h1>
      <p style={s.sub}>
        Equipos entregados en <strong>{empresa.nombre}</strong>. El estado de
        entrega se muestra junto al de devolución: esa comparación es la que
        documenta el deterioro.
      </p>

      <VistaDevoluciones
        key={`devoluciones-${empresa.id}`}
        pendientes={pendientes}
        historial={historial}
        orgId={perfil.organizacion.id}
        nombreConsultor={perfil.nombre}
        color={empresa.color_primario}
      />
    </>
  );
}

const s: Record<string, React.CSSProperties> = {
  titulo: { fontSize: 22, margin: '0 0 3px', letterSpacing: -0.4 },
  sub: { fontSize: 13, color: '#5B6470', margin: '0 0 22px', maxWidth: 640, lineHeight: 1.5 },
  vacio: { background: '#fff', border: '1px dashed #DFDFD8', borderRadius: 8, padding: '40px 24px', textAlign: 'center' },
  btn: { background: '#14263F', color: '#fff', padding: '10px 18px', borderRadius: 4, fontSize: 13, fontWeight: 600, textDecoration: 'none' },
};
