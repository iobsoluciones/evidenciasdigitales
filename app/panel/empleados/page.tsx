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
  sub: { fontSize: 13, color: '#5B6470', margin: '0 0 22px' },
  enlaceRetirados: {
    display: 'inline-flex', alignItems: 'center', gap: 8,
    fontSize: 12.5, color: '#14263F', textDecoration: 'none',
    border: '1px solid #DFDFD8', background: '#fff',
    borderRadius: 5, padding: '7px 12px', marginBottom: 18,
  },
  pastilla: {
    background: '#F2F4F7', color: '#5B6470', borderRadius: 10,
    padding: '1px 8px', fontSize: 11, fontWeight: 600,
  },
  vacio: { background: '#fff', border: '1px dashed #DFDFD8', borderRadius: 8, padding: '40px 24px', textAlign: 'center' },
  btn: { background: '#14263F', color: '#fff', padding: '10px 18px', borderRadius: 4, fontSize: 13, fontWeight: 600, textDecoration: 'none' },
};
