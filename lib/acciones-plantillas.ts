'use server';

/**
 * PLANTILLAS — banco de evaluaciones y de capacitaciones
 * ---------------------------------------------------------------
 * Las plantillas pertenecen a la CUENTA, no a la empresa: el banco es
 * conocimiento del consultor y reutilizarlo entre clientes es lo que
 * lo hace valioso.
 *
 * Al aplicar una plantilla se COPIAN las preguntas, no se referencian.
 * Si la plantilla cambiara después, las evaluaciones ya aplicadas
 * cambiarían con ella y los resultados históricos dejarían de tener
 * sentido. Es el mismo principio del control documental congelado.
 */
import { revalidatePath } from 'next/cache';
import { crearClienteServidor } from './supabase/servidor';
import { obtenerPerfil } from './sesion';

export type PlantillaEvaluacion = {
  id: string;
  nombre: string;
  descripcion: string | null;
  puntaje_minimo: number;
  max_intentos: number;
  veces_usada: number;
  preguntas: number;
  subtemas: string[];
  created_at: string;
};

export type PlantillaCapacitacion = {
  id: string;
  nombre: string;
  tema: string;
  descripcion: string | null;
  instructor: string | null;
  duracion_horas: number | null;
  esperados: number | null;
  es_evaluada: boolean;
  validar_empleados: boolean;
  plantilla_evaluacion_id: string | null;
  evaluacion_nombre: string | null;
  veces_usada: number;
  created_at: string;
};

export type Resultado = { ok: boolean; mensaje: string; id?: string };

// ===================== EVALUACIONES =====================

export async function listarPlantillasEvaluacion(): Promise<PlantillaEvaluacion[]> {
  const supabase = await crearClienteServidor();
  const { data } = await supabase.rpc('listar_plantillas_evaluacion');
  return (data ?? []) as PlantillaEvaluacion[];
}

/** Guarda una evaluación existente en el banco. */
export async function guardarPlantillaEvaluacion(
  evaluacionId: string,
  nombre: string,
  descripcion?: string
): Promise<Resultado> {
  if (!nombre.trim()) return { ok: false, mensaje: 'Escribe un nombre para la plantilla.' };

  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc('guardar_plantilla_evaluacion', {
    p_evaluacion: evaluacionId,
    p_nombre: nombre,
    p_descripcion: descripcion ?? null,
  });

  if (error) return { ok: false, mensaje: error.message };

  const r = data as { ok: boolean; error?: string; id?: string; preguntas?: number };
  if (!r.ok) return { ok: false, mensaje: r.error ?? 'No se pudo guardar.' };

  revalidatePath('/panel/plantillas');
  return {
    ok: true,
    mensaje: `Plantilla guardada con ${r.preguntas} pregunta(s).`,
    id: r.id,
  };
}

/** Aplica una plantilla del banco a una capacitación. */
export async function aplicarPlantillaEvaluacion(
  capacitacionId: string,
  plantillaId: string
): Promise<Resultado> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc('aplicar_plantilla_evaluacion', {
    p_capacitacion: capacitacionId,
    p_plantilla: plantillaId,
  });

  if (error) return { ok: false, mensaje: error.message };

  const r = data as { ok: boolean; error?: string; preguntas?: number };
  if (!r.ok) return { ok: false, mensaje: r.error ?? 'No se pudo aplicar.' };

  revalidatePath(`/panel/capacitaciones/${capacitacionId}`);
  revalidatePath(`/panel/capacitaciones/${capacitacionId}/evaluacion`);

  return { ok: true, mensaje: `${r.preguntas} pregunta(s) copiadas. Puedes editarlas.` };
}

export async function eliminarPlantillaEvaluacion(id: string): Promise<Resultado> {
  const supabase = await crearClienteServidor();
  const { error } = await supabase.from('plantillas_evaluacion').delete().eq('id', id);

  if (error) return { ok: false, mensaje: error.message };

  revalidatePath('/panel/plantillas');
  return { ok: true, mensaje: 'Plantilla eliminada.' };
}

// ===================== CAPACITACIONES =====================

export async function listarPlantillasCapacitacion(): Promise<PlantillaCapacitacion[]> {
  const supabase = await crearClienteServidor();
  const { data } = await supabase.rpc('listar_plantillas_capacitacion');
  return (data ?? []) as PlantillaCapacitacion[];
}

/**
 * Guarda una capacitación como plantilla.
 * Si tiene evaluación, la guarda también y las deja ligadas: replicar
 * la capacitación completa en otra empresa pasa a ser un clic.
 */
export async function guardarPlantillaCapacitacion(
  capacitacionId: string,
  nombre: string
): Promise<Resultado> {
  if (!nombre.trim()) return { ok: false, mensaje: 'Escribe un nombre para la plantilla.' };

  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc('guardar_plantilla_capacitacion', {
    p_capacitacion: capacitacionId,
    p_nombre: nombre,
  });

  if (error) return { ok: false, mensaje: error.message };

  const r = data as { ok: boolean; error?: string; id?: string; conEvaluacion?: boolean };
  if (!r.ok) return { ok: false, mensaje: r.error ?? 'No se pudo guardar.' };

  revalidatePath('/panel/plantillas');
  return {
    ok: true,
    mensaje: r.conEvaluacion
      ? 'Plantilla guardada junto con su evaluación.'
      : 'Plantilla guardada.',
    id: r.id,
  };
}

export async function eliminarPlantillaCapacitacion(id: string): Promise<Resultado> {
  const supabase = await crearClienteServidor();
  const { error } = await supabase.from('plantillas_capacitacion').delete().eq('id', id);

  if (error) return { ok: false, mensaje: error.message };

  revalidatePath('/panel/plantillas');
  return { ok: true, mensaje: 'Plantilla eliminada.' };
}

/** Marca el uso tras crear una capacitación desde plantilla. */
export async function marcarUsoPlantilla(plantillaId: string): Promise<void> {
  const supabase = await crearClienteServidor();
  await supabase.rpc('usar_plantilla_capacitacion', { p_plantilla: plantillaId });
}


// ============ CREACIÓN DESDE CERO ============

export type PreguntaPlantilla = {
  id?: string;
  orden: number;
  enunciado: string;
  tipo: 'unica' | 'multiple';
  subtema: string;
  puntaje: number;
  opciones: Array<{ texto: string; es_correcta: boolean }>;
};

export type PlantillaDetalle = {
  id: string;
  nombre: string;
  descripcion: string | null;
  puntaje_minimo: number;
  max_intentos: number;
  preguntas: PreguntaPlantilla[];
};

/** Crea una plantilla de capacitación sin partir de una existente. */
export async function crearPlantillaCapacitacion(datos: {
  nombre: string;
  tema: string;
  descripcion: string;
  instructor: string;
  duracion_horas: string;
  esperados: string;
  es_evaluada: boolean;
  validar_empleados: boolean;
}): Promise<Resultado> {
  const perfil = await obtenerPerfil();
  if (!perfil) return { ok: false, mensaje: 'Sesión no válida.' };
  if (!datos.nombre.trim()) return { ok: false, mensaje: 'Escribe un nombre.' };
  if (!datos.tema.trim()) return { ok: false, mensaje: 'Escribe el tema.' };

  const supabase = await crearClienteServidor();
  const { data, error } = await supabase
    .from('plantillas_capacitacion')
    .insert({
      org_id: perfil.organizacion.id,
      nombre: datos.nombre.toUpperCase(),
      tema: datos.tema.toUpperCase(),
      descripcion: datos.descripcion.toUpperCase() || null,
      instructor: datos.instructor.toUpperCase() || null,
      duracion_horas: datos.duracion_horas ? Number(datos.duracion_horas) : 2,
      esperados: datos.esperados ? Number(datos.esperados) : null,
      es_evaluada: datos.es_evaluada,
      validar_empleados: datos.validar_empleados,
    })
    .select('id')
    .single();

  if (error) return { ok: false, mensaje: error.message };

  revalidatePath('/panel/plantillas');
  return { ok: true, mensaje: 'Plantilla creada.', id: data.id };
}

/** Crea una plantilla de evaluación vacía, lista para editar. */
export async function crearPlantillaEvaluacionVacia(
  nombre: string,
  descripcion: string
): Promise<Resultado> {
  if (!nombre.trim()) return { ok: false, mensaje: 'Escribe un nombre.' };

  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc('crear_plantilla_evaluacion', {
    p_nombre: nombre,
    p_descripcion: descripcion || null,
    p_puntaje_minimo: 70,
    p_max_intentos: 1,
  });

  if (error) return { ok: false, mensaje: error.message };

  const r = data as { ok: boolean; id?: string };
  if (!r.ok) return { ok: false, mensaje: 'No se pudo crear.' };

  revalidatePath('/panel/plantillas');
  return { ok: true, mensaje: 'Plantilla creada. Agrega sus preguntas.', id: r.id };
}

/** Contenido completo de una plantilla, para editarla. */
export async function obtenerPlantillaDetalle(id: string): Promise<PlantillaDetalle | null> {
  const supabase = await crearClienteServidor();
  const { data } = await supabase.rpc('plantilla_evaluacion_detalle', { p_id: id });
  return (data ?? null) as PlantillaDetalle | null;
}

/**
 * Guarda las preguntas de una plantilla.
 * Aquí sí se reemplazan por completo: una plantilla no tiene respuestas
 * asociadas, así que no hay historial que preservar.
 */
export async function guardarPreguntasPlantilla(
  plantillaId: string,
  datos: {
    nombre: string;
    descripcion: string;
    puntaje_minimo: number;
    max_intentos: number;
    preguntas: PreguntaPlantilla[];
  }
): Promise<Resultado> {
  const perfil = await obtenerPerfil();
  if (!perfil) return { ok: false, mensaje: 'Sesión no válida.' };

  const suma = datos.preguntas.reduce((t, p) => t + (Number(p.puntaje) || 0), 0);
  if (suma > 100) {
    return { ok: false, mensaje: `La suma de puntajes es ${suma} y no puede superar 100.` };
  }

  for (const [i, p] of datos.preguntas.entries()) {
    const n = i + 1;
    if (!p.enunciado.trim()) return { ok: false, mensaje: `La pregunta ${n} no tiene enunciado.` };
    if (p.opciones.length < 2) return { ok: false, mensaje: `La pregunta ${n} necesita dos opciones.` };
    if (p.opciones.some((o) => !o.texto.trim())) {
      return { ok: false, mensaje: `La pregunta ${n} tiene opciones vacías.` };
    }
    const correctas = p.opciones.filter((o) => o.es_correcta).length;
    if (correctas === 0) return { ok: false, mensaje: `Marca la respuesta correcta de la pregunta ${n}.` };
    if (p.tipo === 'unica' && correctas > 1) {
      return { ok: false, mensaje: `La pregunta ${n} es de selección única.` };
    }
  }

  const supabase = await crearClienteServidor();
  const orgId = perfil.organizacion.id;

  await supabase
    .from('plantillas_evaluacion')
    .update({
      nombre: datos.nombre.toUpperCase(),
      descripcion: datos.descripcion || null,
      puntaje_minimo: datos.puntaje_minimo,
      max_intentos: datos.max_intentos,
    })
    .eq('id', plantillaId);

  await supabase.rpc('reemplazar_preguntas_plantilla', { p_plantilla: plantillaId });

  for (const [i, p] of datos.preguntas.entries()) {
    const { data: preg, error } = await supabase
      .from('plantilla_preguntas')
      .insert({
        plantilla_id: plantillaId,
        org_id: orgId,
        orden: i + 1,
        enunciado: p.enunciado.toUpperCase(),
        tipo: p.tipo,
        subtema: p.subtema.toUpperCase() || null,
        puntaje: p.puntaje || 1,
      })
      .select('id')
      .single();

    if (error) return { ok: false, mensaje: error.message };

    const { error: errOpc } = await supabase.from('plantilla_opciones').insert(
      p.opciones.map((o, j) => ({
        pregunta_id: preg.id,
        org_id: orgId,
        orden: j + 1,
        texto: o.texto.toUpperCase(),
        es_correcta: o.es_correcta,
      }))
    );

    if (errOpc) return { ok: false, mensaje: errOpc.message };
  }

  revalidatePath('/panel/plantillas');
  return { ok: true, mensaje: 'Plantilla guardada.' };
}
