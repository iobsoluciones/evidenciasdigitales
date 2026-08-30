/**
 * PLAN ANUAL DE TRABAJO
 * Estándar 2.4.1 de la Resolución 0312 de 2019.
 */
import { redirect } from 'next/navigation';
import { obtenerPerfil } from '@/lib/sesion';
import { empresaActiva } from '@/lib/empresa-activa';
import { listarPlanes, obtenerPlan } from '@/lib/acciones-plan-anual';
import VistaPlanAnual from './VistaPlanAnual';

export const dynamic = 'force-dynamic';

export default async function PaginaPlanAnual({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const perfil = await obtenerPerfil();
  if (!perfil) redirect('/login');

  const empresa = await empresaActiva();
  if (!empresa) {
    return (
      <>
        <h1 style={s.titulo}>Plan anual de trabajo</h1>
        <p style={s.sub}>Agrega una empresa para armar su plan anual.</p>
      </>
    );
  }

  const { id } = await searchParams;
  const planes = await listarPlanes();

  // Por defecto el del año en curso: es el que se está ejecutando.
  const actual = new Date().getFullYear();
  const elegido = id ?? planes.find((p) => p.anio === actual)?.id;
  const detalle = elegido ? await obtenerPlan(elegido) : null;

  return (
    <>
      <h1 style={s.titulo}>Plan anual de trabajo</h1>
      <p style={s.sub}>
        {empresa.nombre} · estándar 2.4.1. Es el primer documento que pide un
        auditor, y sin la firma del empleador es un borrador del consultor, no un
        compromiso de la empresa.
      </p>

      <VistaPlanAnual
        key={elegido ?? 'nuevo'}
        planes={planes}
        plan={detalle?.plan ?? null}
        actividades={detalle?.actividades ?? []}
        avance={detalle?.avance ?? null}
        orgId={perfil.organizacion.id}
        color={empresa.color_primario}
      />
    </>
  );
}

const s: Record<string, React.CSSProperties> = {
  titulo: { fontSize: 23, fontWeight: 700, color: '#14263F', margin: '0 0 4px' },
  sub: { fontSize: 13.5, color: '#5B6470', margin: '0 0 18px', maxWidth: 660, lineHeight: 1.6 },
};
