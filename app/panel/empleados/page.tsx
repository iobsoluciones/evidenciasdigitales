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

  const empleados = await listarEmpleadosConParticipacion();

  return (
    <>
      <h1 style={s.titulo}>Empleados</h1>
      <p style={s.sub}>
        Personal de <strong>{empresa.nombre}</strong>. Base para validar el
        registro de asistencia y para la matriz de capacitaciones.
      </p>

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
  vacio: { background: '#fff', border: '1px dashed #DFDFD8', borderRadius: 8, padding: '40px 24px', textAlign: 'center' },
  btn: { background: '#14263F', color: '#fff', padding: '10px 18px', borderRadius: 4, fontSize: 13, fontWeight: 600, textDecoration: 'none' },
};
