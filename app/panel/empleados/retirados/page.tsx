/**
 * PANEL DE EMPLEADOS RETIRADOS
 * ---------------------------------------------------------------
 * Subpágina de Empleados. Retirar a alguien lo saca de la operación
 * pero no de la base: aquí queda su rastro para auditoría, y desde
 * aquí se reincorpora si vuelve a ser contratado.
 */
import Link from 'next/link';
import { obtenerPerfil } from '@/lib/sesion';
import { empresaActiva } from '@/lib/empresa-activa';
import { listarEmpleadosRetirados } from '@/lib/acciones-empleados';
import VistaRetirados from './VistaRetirados';

export default async function PaginaRetirados() {
  const perfil = await obtenerPerfil();
  const empresa = await empresaActiva();
  if (!perfil) return null;

  if (!empresa) {
    return (
      <div style={s.vacio}>
        <p style={{ margin: '0 0 14px', fontSize: 14 }}>
          Selecciona una empresa para ver su personal retirado.
        </p>
        <Link href="/panel/empleados" style={s.btn}>Ir a Empleados</Link>
      </div>
    );
  }

  const retirados = await listarEmpleadosRetirados();

  return (
    <>
      <Link href="/panel/empleados" style={s.volver}>← Volver a Empleados</Link>

      <h1 style={s.titulo}>Empleados retirados</h1>
      <p style={s.sub}>
        Personal que ya no está activo en <strong>{empresa.nombre}</strong>.
        Su historial se conserva como soporte del SG-SST.
      </p>

      <VistaRetirados
        key={`retirados-${empresa.id}`}
        retirados={retirados}
        color={empresa.color_primario}
        esAdmin={perfil.rol === 'admin'}
      />
    </>
  );
}

const s: Record<string, React.CSSProperties> = {
  volver: { fontSize: 12.5, color: 'var(--texto-suave)', textDecoration: 'none', display: 'inline-block', marginBottom: 10 },
  titulo: { fontSize: 22, margin: '0 0 3px', letterSpacing: -0.4 },
  sub: { fontSize: 13, color: 'var(--texto-suave)', margin: '0 0 22px' },
  vacio: { background: 'var(--superficie)', border: '1px dashed var(--borde-fuerte)', borderRadius: 8, padding: '40px 24px', textAlign: 'center' },
  btn: { background: 'var(--marca)', color: 'var(--sobre-marca)', padding: '10px 18px', borderRadius: 4, fontSize: 13, fontWeight: 600, textDecoration: 'none' },
};
