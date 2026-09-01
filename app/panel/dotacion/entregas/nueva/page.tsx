/**
 * NUEVA ENTREGA
 */
import Link from 'next/link';
import { obtenerPerfil } from '@/lib/sesion';
import { empresaActiva } from '@/lib/empresa-activa';
import { listarEntregables, empleadosParaEntrega } from '@/lib/acciones-entregas';
import FormularioEntrega from './FormularioEntrega';

export default async function PaginaNuevaEntrega() {
  const perfil = await obtenerPerfil();
  const empresa = await empresaActiva();
  if (!perfil || !empresa) return null;

  const [empleados, entregables] = await Promise.all([
    empleadosParaEntrega(),
    listarEntregables(),
  ]);

  return (
    <>
      <Link href="/panel/dotacion/entregas" style={s.volver}>← Entregas</Link>
      <h1 style={s.titulo}>Nueva entrega</h1>
      <p style={s.sub}>
        El inventario se descuenta al firmar, no ahora.
      </p>

      <FormularioEntrega
        empleados={empleados}
        entregables={entregables}
        nombreConsultor={perfil.nombre}
        color={empresa.color_primario}
      />
    </>
  );
}

const s: Record<string, React.CSSProperties> = {
  volver: { fontSize: 13, color: 'var(--texto-suave)', textDecoration: 'none' },
  titulo: { fontSize: 22, margin: '12px 0 3px', letterSpacing: -0.4 },
  sub: { fontSize: 13, color: 'var(--texto-suave)', margin: '0 0 22px' },
};
