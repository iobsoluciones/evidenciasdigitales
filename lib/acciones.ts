'use server';

/**
 * SERVER ACTIONS — Operaciones de escritura
 * ---------------------------------------------------------------
 * Se ejecutan SIEMPRE en el servidor. Las validaciones de aquí no se
 * pueden saltar manipulando el navegador.
 *
 * No hace falta filtrar por org_id: las políticas RLS exigen que
 * coincida con el del usuario, así que un intento de escribir en otra
 * organización lo rechaza la base de datos.
 */

import { revalidatePath } from 'next/cache';
import { crearClienteServidor } from './supabase/servidor';
import { obtenerPerfil } from './sesion';
import { validarCapacitacion } from './tipos';
import { empresaActiva } from './empresa-activa';

export type Resultado = { ok: boolean; mensaje: string; id?: string };

export type DatosCapacitacion = {
  tema: string;
  descripcion: string;
  instructor: string;
  empresa: string;
  esEmpresaPropia: boolean;
  esEvaluada: boolean;
  validarEmpleados: boolean;
  incluirFirmaProfesional: boolean;
  fecha_inicio: string;
  fecha_fin: string;
  esperados: string;
};

/**
 * Crea una capacitación. Nace inactiva: hay que activarla explícitamente.
 *
 * CONTROL DOCUMENTAL CONGELADO: la nomenclatura, la versión y el título
 * se copian aquí desde la configuración de la organización y quedan
 * fijos en el registro. Si mañana cambias la nomenclatura, las actas
 * ya emitidas conservan la suya. Un acta firmada no puede cambiar de
 * identificación documental después: eso rompería la trazabilidad.
 */
export async function crearCapacitacion(datos: DatosCapacitacion): Promise<Resultado> {
  const perfil = await obtenerPerfil();
  if (!perfil) return { ok: false, mensaje: 'Sesión no válida.' };

  // La capacitación pertenece a la empresa sobre la que se trabaja
  const empresa = await empresaActiva();
  if (!empresa) {
    return { ok: false, mensaje: 'Agrega una empresa antes de programar capacitaciones.' };
  }

  const error = validarCapacitacion(datos);
  if (error) return { ok: false, mensaje: error };

  // Si se marca "es mi propia empresa", se usa el nombre de la
  // organización y se evita reescribirlo (y escribirlo distinto).
  const nombreEmpresa = datos.esEmpresaPropia
    ? empresa.nombre
    : datos.empresa.trim();

  if (!nombreEmpresa) {
    return { ok: false, mensaje: 'Indica la empresa capacitada o marca que es la propia.' };
  }

  const supabase = await crearClienteServidor();

  const { data: codigo, error: errCodigo } = await supabase
    .rpc('siguiente_codigo', { p_empresa: empresa.id });

  if (errCodigo) {
    return { ok: false, mensaje: 'No se pudo generar el código: ' + errCodigo.message };
  }

  const { data, error: errIns } = await supabase
    .from('capacitaciones')
    .insert({
      org_id: perfil.organizacion.id,
      empresa_id: empresa.id,
      codigo,
      tema: datos.tema,
      descripcion: datos.descripcion || null,
      instructor: datos.instructor,
      empresa: nombreEmpresa,
      es_empresa_propia: datos.esEmpresaPropia,
      es_evaluada: datos.esEvaluada,
      validar_empleados: datos.validarEmpleados,
      incluir_firma_profesional: datos.incluirFirmaProfesional,
      fecha_inicio: new Date(datos.fecha_inicio).toISOString(),
      fecha_fin: new Date(datos.fecha_fin).toISOString(),
      esperados: datos.esperados ? Number(datos.esperados) : null,
      estado: 'inactiva',
      creado_por: perfil.id,

      // Copia del control documental vigente en este momento
      nomenclatura: perfil.organizacion.nomenclatura,
      version_doc: perfil.organizacion.version_doc,
      titulo_doc: perfil.organizacion.titulo_doc,
      // El diseño del encabezado es de la EMPRESA y se congela aqui:
      // si lo rediseña despues, esta acta conserva el suyo.
      encabezado_config: empresa.encabezado_config ?? {},
    })
    .select('id')
    .single();

  if (errIns) return { ok: false, mensaje: errIns.message };

  revalidatePath('/panel/capacitaciones');
  // El calendario la muestra en cuanto existe: se puede crear desde alli.
  revalidatePath('/panel/calendario');
  return { ok: true, mensaje: `Capacitación ${codigo} creada.`, id: data.id };
}

/**
 * Actualiza una capacitación.
 * NO toca el control documental: sigue siendo el del momento de creación.
 */
export async function actualizarCapacitacion(
  id: string,
  datos: DatosCapacitacion
): Promise<Resultado> {
  const perfil = await obtenerPerfil();
  if (!perfil) return { ok: false, mensaje: 'Sesión no válida.' };

  const error = validarCapacitacion(datos);
  if (error) return { ok: false, mensaje: error };

  const empresa = await empresaActiva();
  if (!empresa) return { ok: false, mensaje: 'No hay empresa seleccionada.' };

  const nombreEmpresa = datos.esEmpresaPropia
    ? empresa.nombre
    : datos.empresa.trim();

  if (!nombreEmpresa) {
    return { ok: false, mensaje: 'Indica la empresa capacitada o marca que es la propia.' };
  }

  const supabase = await crearClienteServidor();
  const { error: errUpd } = await supabase
    .from('capacitaciones')
    .update({
      tema: datos.tema,
      descripcion: datos.descripcion || null,
      instructor: datos.instructor,
      empresa: nombreEmpresa,
      es_empresa_propia: datos.esEmpresaPropia,
      es_evaluada: datos.esEvaluada,
      validar_empleados: datos.validarEmpleados,
      incluir_firma_profesional: datos.incluirFirmaProfesional,
      fecha_inicio: new Date(datos.fecha_inicio).toISOString(),
      fecha_fin: new Date(datos.fecha_fin).toISOString(),
      esperados: datos.esperados ? Number(datos.esperados) : null,
    })
    .eq('id', id);

  if (errUpd) return { ok: false, mensaje: errUpd.message };

  revalidatePath('/panel/capacitaciones');
  revalidatePath(`/panel/capacitaciones/${id}`);
  return { ok: true, mensaje: 'Capacitación actualizada.' };
}

/**
 * Activa una capacitación mediante la función atómica de la base:
 * desactiva las demás y activa esta en una sola transacción, sin
 * chocar con el índice único que garantiza una sola activa.
 */
export async function activarCapacitacion(id: string): Promise<Resultado> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc('activar_capacitacion', { p_id: id });

  if (error) return { ok: false, mensaje: error.message };
  const r = data as { ok: boolean; mensaje?: string; error?: string };
  if (!r.ok) return { ok: false, mensaje: r.error ?? 'No se pudo activar.' };

  revalidatePath('/panel/capacitaciones');
  revalidatePath('/panel');
  return { ok: true, mensaje: 'Capacitación activada.' };
}

export async function cambiarEstado(
  id: string,
  estado: 'inactiva' | 'cerrada'
): Promise<Resultado> {
  const supabase = await crearClienteServidor();

  // CONGELADO AL EMITIR: cerrar es el momento en que el acta deja de
  // poder cambiar, asi que es aqui donde se fija el diseño vigente del
  // encabezado. Fijarlo al crear haria que una capacitacion programada
  // hace semanas saliera con un diseño que ya no se usa.
  const extra: Record<string, unknown> = {};

  if (estado === 'cerrada') {
    const { data: cap } = await supabase
      .from('capacitaciones')
      .select('org_id, incluir_firma_profesional, firma_prof_url, empresas(encabezado_config)')
      .eq('id', id)
      .maybeSingle();

    const cfg = (cap?.empresas as { encabezado_config?: Record<string, unknown> } | null)
      ?.encabezado_config;
    if (cfg && Object.keys(cfg).length > 0) extra.encabezado_config = cfg;

    // La firma del responsable se congela aqui si aun no lo estaba:
    // activar_capacitacion solo la copia en el momento de activar, y
    // la casilla puede marcarse despues.
    if (cap?.incluir_firma_profesional && !cap.firma_prof_url) {
      const { data: prof } = await supabase
        .from('perfil_profesional')
        .select('nombre, profesion, firma_url')
        .eq('org_id', cap.org_id)
        .maybeSingle();

      if (prof?.firma_url) {
        extra.firma_prof_url = prof.firma_url;
        extra.firma_prof_nombre = prof.nombre;
        extra.firma_prof_profesion = prof.profesion;
      }
    }
  }

  const { error } = await supabase
    .from('capacitaciones')
    .update({ estado, ...extra })
    .eq('id', id);

  if (error) return { ok: false, mensaje: error.message };

  revalidatePath('/panel/capacitaciones');
  revalidatePath('/panel');
  return { ok: true, mensaje: `Capacitación marcada como ${estado}.` };
}

/**
 * Motivo por el que una capacitacion NO se puede eliminar, o null si
 * si se puede. Se exporta para que la interfaz explique el bloqueo con
 * las mismas reglas que aplica el servidor.
 */
export async function motivoNoEliminable(id: string): Promise<string | null> {
  const supabase = await crearClienteServidor();

  const { data: cap } = await supabase
    .from('capacitaciones')
    .select('firma_instructor_url')
    .eq('id', id)
    .maybeSingle();

  if (!cap) return 'La capacitación ya no existe.';

  // 1. Registros de asistencia
  const { count } = await supabase
    .from('participantes')
    .select('id', { count: 'exact', head: true })
    .eq('capacitacion_id', id);

  if ((count ?? 0) > 0) {
    return `Tiene ${count} registro(s) de asistencia. Un acta con asistentes es ` +
           'evidencia del SG-SST y no se borra.';
  }

  // 2. Firma del instructor: sin asistentes pero firmada significa que
  //    la capacitacion SI se ejecuto, aunque no se registrara nadie.
  //    La firma del responsable tecnico no cuenta: es una copia que el
  //    sistema hace sola al activar, no un acto de nadie.
  if (cap.firma_instructor_url) {
    return 'El instructor ya firmó: la capacitación se ejecutó aunque no se ' +
           'registrara ningún asistente.';
  }

  return null;
}

/**
 * Elimina una capacitacion sin rastro de ejecucion.
 *
 * Las condiciones se comprueban AQUI y no solo en la interfaz: es la
 * frontera de confianza, y borrar evidencia documental por un boton
 * mal habilitado no tiene vuelta atras.
 */
export async function eliminarCapacitacion(id: string): Promise<Resultado> {
  const motivo = await motivoNoEliminable(id);
  if (motivo) return { ok: false, mensaje: 'No se puede eliminar. ' + motivo };

  const supabase = await crearClienteServidor();
  const { error } = await supabase.from('capacitaciones').delete().eq('id', id);

  if (error) {
    return {
      ok: false,
      mensaje: 'No se pudo eliminar. Solo los administradores pueden hacerlo.',
    };
  }

  revalidatePath('/panel/capacitaciones');
  revalidatePath('/panel/calendario');
  revalidatePath('/panel');
  return { ok: true, mensaje: 'Capacitación eliminada.' };
}

/**
 * Configuración documental de la organización.
 * Afecta solo a las capacitaciones NUEVAS: las existentes conservan
 * el control documental con el que fueron creadas.
 */
export async function guardarConfiguracion(datos: {
  titulo_doc: string;
  nomenclatura: string;
  version_doc: string;
  color_primario: string;
}): Promise<Resultado> {
  const perfil = await obtenerPerfil();
  if (!perfil) return { ok: false, mensaje: 'Sesión no válida.' };
  if (perfil.rol !== 'admin') {
    return { ok: false, mensaje: 'Solo los administradores pueden cambiar la configuración.' };
  }

  const supabase = await crearClienteServidor();
  const { error } = await supabase
    .from('organizaciones')
    .update({
      titulo_doc: datos.titulo_doc,
      nomenclatura: datos.nomenclatura,
      version_doc: datos.version_doc,
      color_primario: datos.color_primario,
    })
    .eq('id', perfil.organizacion.id);

  if (error) return { ok: false, mensaje: error.message };

  revalidatePath('/panel', 'layout');
  return { ok: true, mensaje: 'Configuración guardada. Aplica a las capacitaciones nuevas.' };
}

export async function guardarLogo(url: string): Promise<Resultado> {
  const perfil = await obtenerPerfil();
  if (!perfil) return { ok: false, mensaje: 'Sesión no válida.' };
  if (perfil.rol !== 'admin') {
    return { ok: false, mensaje: 'Solo los administradores pueden cambiar el logo.' };
  }

  const supabase = await crearClienteServidor();
  const { error } = await supabase
    .from('organizaciones')
    .update({ logo_url: url })
    .eq('id', perfil.organizacion.id);

  if (error) return { ok: false, mensaje: error.message };

  revalidatePath('/panel', 'layout');
  return { ok: true, mensaje: 'Logo actualizado.' };
}

export async function quitarLogo(): Promise<Resultado> {
  const perfil = await obtenerPerfil();
  if (!perfil) return { ok: false, mensaje: 'Sesión no válida.' };
  if (perfil.rol !== 'admin') {
    return { ok: false, mensaje: 'Solo los administradores pueden cambiar el logo.' };
  }

  const supabase = await crearClienteServidor();
  const { error } = await supabase
    .from('organizaciones')
    .update({ logo_url: null })
    .eq('id', perfil.organizacion.id);

  if (error) return { ok: false, mensaje: error.message };

  revalidatePath('/panel', 'layout');
  return { ok: true, mensaje: 'Logo eliminado.' };
}


/**
 * Crea una capacitación a partir de una plantilla.
 * Copia tema, descripción, instructor y ajustes; solo cambian las
 * fechas. Si la plantilla trae evaluación, se aplica también: replicar
 * una capacitación completa en otra empresa pasa a ser un paso.
 */
export async function crearDesdePlantilla(
  plantillaId: string,
  fechas: { fecha_inicio: string; fecha_fin: string }
): Promise<Resultado> {
  const perfil = await obtenerPerfil();
  if (!perfil) return { ok: false, mensaje: 'Sesión no válida.' };

  const empresa = await empresaActiva();
  if (!empresa) return { ok: false, mensaje: 'No hay empresa seleccionada.' };

  if (!fechas.fecha_inicio || !fechas.fecha_fin) {
    return { ok: false, mensaje: 'Indica las fechas de la capacitación.' };
  }
  if (new Date(fechas.fecha_fin) <= new Date(fechas.fecha_inicio)) {
    return { ok: false, mensaje: 'La fecha de fin debe ser posterior a la de inicio.' };
  }

  const supabase = await crearClienteServidor();

  const { data: pl } = await supabase
    .from('plantillas_capacitacion')
    .select('*')
    .eq('id', plantillaId)
    .maybeSingle();

  if (!pl) return { ok: false, mensaje: 'Plantilla no encontrada.' };

  const { data: codigo, error: errCodigo } = await supabase
    .rpc('siguiente_codigo', { p_empresa: empresa.id });

  if (errCodigo) return { ok: false, mensaje: 'No se pudo generar el código.' };

  const { data, error } = await supabase
    .from('capacitaciones')
    .insert({
      org_id: perfil.organizacion.id,
      empresa_id: empresa.id,
      codigo,
      tema: pl.tema,
      descripcion: pl.descripcion,
      instructor: pl.instructor ?? '',
      empresa: empresa.nombre,
      es_empresa_propia: true,
      es_evaluada: pl.es_evaluada,
      validar_empleados: pl.validar_empleados,
      esperados: pl.esperados,
      fecha_inicio: new Date(fechas.fecha_inicio).toISOString(),
      fecha_fin: new Date(fechas.fecha_fin).toISOString(),
      estado: 'inactiva',
      creado_por: perfil.id,
      // Membrete de la empresa, congelado en este momento
      nomenclatura: empresa.nomenclatura,
      version_doc: empresa.version_doc,
      titulo_doc: empresa.titulo_doc,
      campos_encabezado: empresa.campos_encabezado ?? [],
      encabezado_config: empresa.encabezado_config ?? {},
    })
    .select('id')
    .single();

  if (error) return { ok: false, mensaje: error.message };

  // Si la plantilla trae evaluación, se aplica a la capacitación nueva
  let conEvaluacion = false;
  if (pl.plantilla_evaluacion_id) {
    const { data: ap } = await supabase.rpc('aplicar_plantilla_evaluacion', {
      p_capacitacion: data.id,
      p_plantilla: pl.plantilla_evaluacion_id,
    });
    conEvaluacion = Boolean((ap as { ok?: boolean } | null)?.ok);
  }

  await supabase.rpc('usar_plantilla_capacitacion', { p_plantilla: plantillaId });

  revalidatePath('/panel/capacitaciones');

  return {
    ok: true,
    id: data.id,
    mensaje: conEvaluacion
      ? `Capacitación ${codigo} creada con su evaluación.`
      : `Capacitación ${codigo} creada.`,
  };
}
