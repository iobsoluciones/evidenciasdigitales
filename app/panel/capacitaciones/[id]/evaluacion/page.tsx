/**
 * EDITOR DE EVALUACIÓN
 * Ruta: /panel/capacitaciones/[id]/evaluacion
 */
import { notFound } from 'next/navigation';
import { crearClienteServidor } from '@/lib/supabase/servidor';
import { obtenerPerfil } from '@/lib/sesion';
import { obtenerEvaluacion, subtemasUsados } from '@/lib/acciones-evaluacion';
import { listarPlantillasEvaluacion } from '@/lib/acciones-plantillas';
import EditorEvaluacion from './EditorEvaluacion';

export default async function PaginaEvaluacion({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await crearClienteServidor();
  const perfil = await obtenerPerfil();

  const { data: cap } = await supabase
    .from('capacitaciones')
    .select('id, codigo, tema')
    .eq('id', id)
    .maybeSingle();

  if (!cap || !perfil) notFound();

  // Tope de preguntas del plan contratado
  const { data: plan } = await supabase
    .from('planes')
    .select('nombre, max_preguntas_evaluacion')
    .eq('codigo', perfil.organizacion.plan)
    .maybeSingle();

  const evaluacion = await obtenerEvaluacion(id);
  const subtemas = await subtemasUsados();
  const banco = await listarPlantillasEvaluacion();

  return (
    <EditorEvaluacion
      capacitacionId={id}
      codigo={cap.codigo}
      tema={cap.tema}
      evaluacion={evaluacion}
      subtemas={subtemas}
      maxPreguntas={plan?.max_preguntas_evaluacion ?? null}
      nombrePlan={plan?.nombre ?? perfil.organizacion.plan}
      color={perfil.organizacion.color_primario}
      banco={banco}
    />
  );
}
