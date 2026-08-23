/**
 * EXPEDIENTE DEL EMPLEADO
 * Formación, dotación y equipos en una sola vista.
 */
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { empresaActiva } from '@/lib/empresa-activa';
import { obtenerExpediente } from '@/lib/acciones-expediente';
import VistaExpediente from './VistaExpediente';

export default async function PaginaExpediente({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const empresa = await empresaActiva();
  const expediente = await obtenerExpediente(id);

  if (!expediente.ok || !expediente.empleado || !empresa) notFound();

  return (
    <>
      <Link href="/panel/empleados" style={{ fontSize: 13, color: '#5B6470', textDecoration: 'none' }}>
        ← Empleados
      </Link>

      <VistaExpediente
        key={`expediente-${id}`}
        expediente={expediente}
        color={empresa.color_primario}
      />
    </>
  );
}
