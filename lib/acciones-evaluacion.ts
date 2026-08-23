'use server';

/**
 * EVALUACIONES — Server Actions
 * ---------------------------------------------------------------
 * El cliente formula las preguntas; el sistema califica.
 *
 * La respuesta correcta (`es_correcta`) NUNCA sale hacia el formulario
 * público: la calificación ocurre dentro de la base de datos.
 */
import { revalidatePath } from 'next/cache';
import { crearClienteServidor } from './supabase/servidor';
import { obtenerPerfil } from './sesion';

export type TipoPregunta = 'unica' | 'multiple';

export type Opcion = {
  id?: string;
  texto: string;
  es_correcta: boolean;
};

export type Pregunta = {
  id?: string;
  orden: number;
  enunciado: string;
  tipo: TipoPregunta;
  subtema: string;
  puntaje: number;
  opciones: Opcion[];
};

export type Evaluacion = {
  id: string;
  titulo: string;
  puntaje_minimo: number;
  obligatoria: boolean;
  max_intentos: number;
  preguntas: Pregunta[];
};

export type Resultado = { ok: boolean; mensaje: string; id?: string };

/** Límite de preguntas según el plan contratado. */
async function limitePreguntas(): Promise<number | null> {
  const perfil = await obtenerPerfil();
  if (!perfil) return 0;

  const supabase = await crearClienteServidor();
  const { data } = await supabase
    .from('planes')
    .select('max_preguntas_evaluacion')
    .eq('codigo', perfil.organizacion.plan)
    .maybeSingle();

  return data?.max_preguntas_evaluacion ?? null;   // null = sin tope
}

/** Trae la evaluación de una capacitación, con respuestas correctas
 *  (solo para el panel: aquí sí las necesita quien la administra). */
export async function obtenerEvaluacion(capacitacionId: string): Promise<Evaluacion | null> {
  const supabase = await crearClienteServidor();

  const { data: ev } = await supabase
    .from('evaluaciones')
    .select('id, titulo, puntaje_minimo, obligatoria, max_intentos')
    .eq('capacitacion_id', capacitacionId)
    .maybeSingle();

  if (!ev) return null;

  const { data: preguntas } = await supabase
    .from('preguntas')
    .select('id, orden, enunciado, tipo, subtema, puntaje')
    .eq('evaluacion_id', ev.id)
    .eq('activa', true)
    .order('orden');

  const ids = (preguntas ?? []).map((p) => p.id);
  const { data: opciones } = ids.length
    ? await supabase
        .from('opciones')
        .select('id, pregunta_id, orden, texto, es_correcta')
        .in('pregunta_id', ids)
        .order('orden')
    : { data: [] };

  return {
    ...ev,
    preguntas: (preguntas ?? []).map((p) => ({
      ...p,
      subtema: p.subtema ?? '',
      tipo: p.tipo as TipoPregunta,
      opciones: (opciones ?? [])
        .filter((o) => o.pregunta_id === p.id)
        .map((o) => ({ id: o.id, texto: o.texto, es_correcta: o.es_correcta })),
    })),
  };
}

/**
 * Guarda la evaluación completa.
 * Estrategia: borrar preguntas y reinsertar. Es más simple que
 * reconciliar diferencias, y las respuestas ya registradas no se
 * pierden porque viven en otra tabla con su propio historial.
 */
export async function guardarEvaluacion(
  capacitacionId: string,
  datos: {
    titulo: string;
    puntaje_minimo: number;
    obligatoria: boolean;
    max_intentos: number;
    preguntas: Pregunta[];
  }
): Promise<Resultado> {
  const perfil = await obtenerPerfil();
  if (!perfil) return { ok: false, mensaje: 'Sesión no válida.' };

  // ---------- Validaciones ----------
  const tope = await limitePreguntas();
  if (tope !== null && datos.preguntas.length > tope) {
    return {
      ok: false,
      mensaje: `Tu plan permite hasta ${tope} preguntas. Actualiza el plan para agregar más.`,
    };
  }

  if (datos.preguntas.length === 0) {
    return { ok: false, mensaje: 'Agrega al menos una pregunta.' };
  }

  // El puntaje total de la evaluación es 100: cada pregunta aporta una
  // parte de esos 100 puntos. Validarlo aquí evita evaluaciones cuya
  // calificación no sea comparable entre capacitaciones.
  const suma = datos.preguntas.reduce((t, p) => t + (Number(p.puntaje) || 0), 0);
  if (suma > 100) {
    return {
      ok: false,
      mensaje: `La suma de los puntajes es ${suma} y no puede superar 100. Ajusta el valor de las preguntas.`,
    };
  }
  if (datos.preguntas.some((p) => Number(p.puntaje) <= 0)) {
    return { ok: false, mensaje: 'Cada pregunta debe valer al menos 1 punto.' };
  }

  for (const [i, p] of datos.preguntas.entries()) {
    const n = i + 1;
    if (!p.enunciado.trim()) return { ok: false, mensaje: `La pregunta ${n} no tiene enunciado.` };
    if (p.opciones.length < 2) return { ok: false, mensaje: `La pregunta ${n} necesita al menos dos opciones.` };
    if (p.opciones.some((o) => !o.texto.trim())) {
      return { ok: false, mensaje: `La pregunta ${n} tiene opciones vacías.` };
    }
    const correctas = p.opciones.filter((o) => o.es_correcta).length;
    if (correctas === 0) return { ok: false, mensaje: `Marca la respuesta correcta de la pregunta ${n}.` };
    if (p.tipo === 'unica' && correctas > 1) {
      return { ok: false, mensaje: `La pregunta ${n} es de selección única: marca una sola respuesta.` };
    }
  }

  const supabase = await crearClienteServidor();
  const orgId = perfil.organizacion.id;
  let retiradas = 0;

  // ---------- Evaluación (crear o actualizar) ----------
  const { data: existente } = await supabase
    .from('evaluaciones')
    .select('id')
    .eq('capacitacion_id', capacitacionId)
    .maybeSingle();

  let evalId = existente?.id;

  if (evalId) {
    await supabase
      .from('evaluaciones')
      .update({
        titulo: datos.titulo,
        puntaje_minimo: datos.puntaje_minimo,
        obligatoria: datos.obligatoria,
        max_intentos: datos.max_intentos ?? 1,
      })
      .eq('id', evalId);

    // Las preguntas YA RESPONDIDAS se retiran, no se borran: sus
    // respuestas y las estadísticas históricas se conservan. Solo se
    // eliminan las que nadie contestó.
    const { data: reemplazo } = await supabase.rpc('reemplazar_preguntas', {
      p_evaluacion: evalId,
    });
    const rp = reemplazo as { retiradas: number; borradas: number } | null;
    retiradas = rp?.retiradas ?? 0;
  } else {
    const { data, error } = await supabase
      .from('evaluaciones')
      .insert({
        capacitacion_id: capacitacionId,
        org_id: orgId,
        titulo: datos.titulo,
        puntaje_minimo: datos.puntaje_minimo,
        obligatoria: datos.obligatoria,
        max_intentos: datos.max_intentos ?? 1,
      })
      .select('id')
      .single();

    if (error) return { ok: false, mensaje: error.message };
    evalId = data.id;
  }

  // ---------- Preguntas y opciones ----------
  for (const [i, p] of datos.preguntas.entries()) {
    const { data: preg, error: errP } = await supabase
      .from('preguntas')
      .insert({
        evaluacion_id: evalId,
        org_id: orgId,
        orden: i + 1,
        enunciado: p.enunciado,
        tipo: p.tipo,
        subtema: p.subtema || null,
        puntaje: p.puntaje || 1,
      })
      .select('id')
      .single();

    if (errP) return { ok: false, mensaje: errP.message };

    const { error: errO } = await supabase.from('opciones').insert(
      p.opciones.map((o, j) => ({
        pregunta_id: preg.id,
        org_id: orgId,
        orden: j + 1,
        texto: o.texto,
        es_correcta: o.es_correcta,
      }))
    );

    if (errO) return { ok: false, mensaje: errO.message };
  }

  // Marca la capacitación como evaluada
  await supabase
    .from('capacitaciones')
    .update({ es_evaluada: true })
    .eq('id', capacitacionId);

  revalidatePath(`/panel/capacitaciones/${capacitacionId}`);

  const nota = retiradas > 0
    ? ` ${retiradas} pregunta(s) con respuestas se archivaron para conservar los resultados anteriores.`
    : '';

  return { ok: true, mensaje: 'Evaluación guardada.' + nota, id: evalId };
}

/** Elimina la evaluación y desmarca la capacitación. */
export async function eliminarEvaluacion(capacitacionId: string): Promise<Resultado> {
  const supabase = await crearClienteServidor();

  const { error } = await supabase
    .from('evaluaciones')
    .delete()
    .eq('capacitacion_id', capacitacionId);

  if (error) return { ok: false, mensaje: error.message };

  await supabase
    .from('capacitaciones')
    .update({ es_evaluada: false })
    .eq('id', capacitacionId);

  revalidatePath(`/panel/capacitaciones/${capacitacionId}`);
  return { ok: true, mensaje: 'Evaluación eliminada.' };
}

/** Sugerencias de subtema a partir de los ya usados por la organización. */
export async function subtemasUsados(): Promise<string[]> {
  const supabase = await crearClienteServidor();
  const { data } = await supabase
    .from('preguntas')
    .select('subtema')
    .not('subtema', 'is', null);

  return Array.from(new Set((data ?? []).map((r) => r.subtema as string))).sort();
}
