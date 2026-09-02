/**
 * MÓDULO DE EMPLEADOS
 * ---------------------------------------------------------------
 * Separado de Configuración: la nómina de una empresa se consulta
 * mucho más de lo que se configura, y es la base de la matriz de
 * capacitaciones.
 */
import Link from 'next/link';
import { obtenerPerfil } from '@/lib/sesion';
import { empresaActiva } from '@/lib/empresa-activa';
import { listarEmpleadosConParticipacion } from '@/lib/acciones-ficha';
import { listarEmpleadosRetirados } from '@/lib/acciones-empleados';
import GestorEmpleados from './GestorEmpleados';

export default async function PaginaEmpleados() {
  const perfil = await obtenerPerfil();
  const empresa = await empresaActiva();
  if (!perfil) return null;

  if (!empresa) {
    return (
      <div style={s.vacio}>
        <p style={{ margin: '0 0 14px', fontSize: 14 }}>
          Agrega una empresa para gestionar su personal.
        </p>
        <Link href="/panel/empresas/nueva" style={s.btn}>Agregar empresa</Link>
      </div>
    );
  }

  const [empleados, retirados] = await Promise.all([
    listarEmpleadosConParticipacion(),
    listarEmpleadosRetirados(),
  ]);

  return (
    <>
      <h1 style={s.titulo}>Empleados</h1>
      <p style={s.sub}>
        Personal de <strong>{empresa.nombre}</strong>. Base para validar el
        registro de asistencia y para la matriz de capacitaciones.
      </p>

      {/* Los retirados no se borran: viven en su propia pantalla para
          que el historial siga disponible ante una auditoria. */}
      <Link href="/panel/empleados/retirados" style={s.enlaceRetirados}>
        Empleados retirados
        <span style={s.pastilla}>{retirados.length}</span>
      </Link>

      <GestorEmpleados
        key={`empleados-${empresa.id}`}
        empleados={empleados}
        empresaNombre={empresa.nombre}
        color={empresa.color_primario}
        esAdmin={perfil.rol === 'admin'}
      />
    </>
  );
}

const s: Record<string, React.CSSProperties> = {
  titulo: { fontSize: 22, margin: '0 0 3px', letterSpacing: -0.4 },
  sub: { fontSize: 13, color: 'var(--texto-suave)', margin: '0 0 22px' },
  enlaceRetirados: {
    display: 'inline-flex', alignItems: 'center', gap: 8,
    fontSize: 12.5, color: 'var(--texto)', textDecoration: 'none',
    border: '1px solid var(--borde-fuerte)', background: 'var(--superficie)',
    borderRadius: 6, padding: '7px 12px', marginBottom: 18,
  },
  pastilla: {
    background: 'var(--superficie-3)', color: 'var(--texto-suave)', borderRadius: 8,
    padding: '1px 8px', fontSize: 11, fontWeight: 600,
  },
  vacio: { background: 'var(--superficie)', border: '1px dashed var(--borde-fuerte)', borderRadius: 8, padding: '40px 24px', textAlign: 'center' },
  btn: { background: 'var(--marca)', color: 'var(--sobre-empresa)', padding: '10px 18px', borderRadius: 4, fontSize: 13, fontWeight: 600, textDecoration: 'none' },
};
