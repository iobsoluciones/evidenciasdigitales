/**
 * EDITAR ENTREGA EN BORRADOR
 * ---------------------------------------------------------------
 * Solo borradores. Una entrega firmada es un documento con valor
 * probatorio: para revertirla se registra la devolución, no se edita.
 */
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { obtenerPerfil } from '@/lib/sesion';
import { empresaActiva } from '@/lib/empresa-activa';
import {
  obtenerEntrega, listarEntregables, empleadosParaEntrega,
} from '@/lib/acciones-entregas';
import FormularioEntrega from '../../nueva/FormularioEntrega';

export default async function PaginaEditarEntrega({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const perfil = await obtenerPerfil();
  const empresa = await empresaActiva();
  const detalle = await obtenerEntrega(id);

  if (!detalle.ok || !detalle.entrega || !perfil || !empresa) {
    redirect('/panel/dotacion/entregas');
  }

  const e = detalle.entrega;

  // Una firmada no se edita: se redirige a su detalle
  if (e.estado !== 'borrador') {
    redirect(`/panel/dotacion/entregas/${id}`);
  }

  const [empleados, entregables] = await Promise.all([
    empleadosParaEntrega(),
    // Se pasa el id: las unidades ya elegidas siguen disponibles
    listarEntregables(id),
  ]);

  return (
    <>
      <Link href={`/panel/dotacion/entregas/${id}`} style={s.volver}>
        ← {e.codigo}
      </Link>

      <h1 style={s.titulo}>Editar entrega</h1>
      <p style={s.sub}>
        Para <strong>{e.nombres}</strong>. Sigue en borrador: el inventario
        se descuenta al firmar.
      </p>

      <FormularioEntrega
        empleados={empleados}
        entregables={entregables}
        nombreConsultor={perfil.nombre}
        color={empresa.color_primario}
        edicion={{
          entregaId: id,
          // El acta lleva los datos copiados; se pasan tal cual para
          // que la revisión los muestre aunque el empleado ya no esté
          // en la nómina activa.
          receptor: {
            nombres: e.nombres,
            identificacion: e.identificacion,
            cargo: e.cargo,
            area: e.area,
          },
          entregadoPor: e.entregado_por,
          observaciones: e.observaciones ?? '',
          items: detalle.items ?? [],
        }}
      />
    </>
  );
}

const s: Record<string, React.CSSProperties> = {
  volver: { fontSize: 13, color: 'var(--texto-suave)', textDecoration: 'none' },
  titulo: { fontSize: 22, margin: '12px 0 3px', letterSpacing: -0.4 },
  sub: { fontSize: 13, color: 'var(--texto-suave)', margin: '0 0 22px' },
};
