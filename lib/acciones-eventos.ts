'use server';

/**
 * EVENTOS — accidentes, incidentes y enfermedades laborales
 * ---------------------------------------------------------------
 * Resolución 1401 de 2007 y Decreto 1072 art. 2.2.4.6.32: todo
 * accidente se investiga dentro de los 15 días siguientes, con un
 * equipo que incluya al responsable con licencia y a un representante
 * del COPASST. El reporte a ARL y EPS vence a los 2 días hábiles.
 *
 * El HECHO y el ANÁLISIS están separados a propósito: el reporte se
 * hace el mismo día, con prisa y con lo mínimo; la investigación viene
 * después. Pedirlo todo junto es lo que hace que nadie registre nada.
 *
 * El plazo de 15 días se calcula al leer, nunca se almacena: así no
 * queda un estado obsoleto en la base.
 */
import { revalidatePath } from 'next/cache';
import { crearClienteServidor } from './supabase/servidor';
import { empresaActiva } from './empresa-activa';

export type TipoEvento = 'accidente' | 'incidente' | 'casi_accidente' | 'enfermedad';
export type RolEquipo = 'responsable_sst' | 'copasst' | 'jefe_inmediato' | 'otro';
export type Metodologia = '5_porques' | 'arbol_causas' | 'espina_pescado';

/** Causa con su clasificación. Las básicas son las que generan acciones. */
export type Causa = { descripcion: string; clase: string };

export type EventoLista = {
  id: string;
  codigo: string;
  tipo: TipoEvento;
  estado: 'abierto' | 'en_investigacion' | 'cerrado';
  nombres: string | null;
  identificacion: string | null;
  area: string | null;
  fecha_evento: string;
  descripcion: string;
  lugar: string | null;
  dias_incapacidad: number;
  grave: boolean;
  mortal: boolean;
  reportado_arl: boolean;
  fecha_reporte_arl: string | null;
  fecha_cierre: string | null;
  /** Días que faltan del plazo legal. Negativo = vencido. null = ya cerrada. */
  dias_restantes: number | null;
  investigacion_vencida: boolean;
  causas_basicas: number;
  acciones: number;
};

export type DetalleEvento = {
  ok: boolean;
  error?: string;
  evento?: Record<string, unknown>;
  investigacion?: Record<string, unknown>;
  equipo?: Array<{ id: string; nombre: string; cargo: string | null; rol: RolEquipo; firma_url: string | null }>;
  testigos?: Array<{ id: string; nombre: string; identificacion: string | null; version: string | null }>;
  acciones?: Array<{ id: string; codigo: string; accion: string; responsable: string; fecha_limite: string; estado: string }>;
  empresa?: Record<string, unknown>;
};

export type Resultado = { ok: boolean; mensaje: string; id?: string; codigo?: string };

export async function listarEventos(): Promise<EventoLista[]> {
  const empresa = await empresaActiva();
  if (!empresa) return [];

  const supabase = await crearClienteServidor();
  const { data } = await supabase.rpc('listar_eventos', { p_empresa: empresa.id });
  return (data ?? []) as EventoLista[];
}

export async function obtenerEvento(id: string): Promise<DetalleEvento> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc('detalle_evento', { p_evento: id });
  if (error) return { ok: false, error: error.message };
  return (data ?? { ok: false, error: 'Evento no encontrado.' }) as DetalleEvento;
}

/** Reporte rápido: lo mínimo para dejar constancia el mismo día. */
export async function crearEvento(datos: {
  tipo: TipoEvento;
  empleadoId: string | null;
  fecha: string;
  descripcion: string;
  lugar: string;
  parteCuerpo: string;
  mecanismo: string;
  grave: boolean;
  mortal: boolean;
}): Promise<Resultado> {
  const empresa = await empresaActiva();
  if (!empresa) return { ok: false, mensaje: 'No hay empresa seleccionada.' };
  if (!datos.descripcion?.trim()) return { ok: false, mensaje: 'Describe lo que ocurrió.' };
  if (!datos.fecha) return { ok: false, mensaje: 'Indica la fecha y hora del evento.' };

  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc('crear_evento', {
    p_empresa: empresa.id,
    p_tipo: datos.tipo,
    p_empleado: datos.empleadoId || null,
    p_fecha: new Date(datos.fecha).toISOString(),
    p_descripcion: datos.descripcion,
    p_lugar: datos.lugar || null,
    p_parte_cuerpo: datos.parteCuerpo || null,
    p_mecanismo: datos.mecanismo || null,
    p_grave: datos.grave,
    p_mortal: datos.mortal,
  });

  if (error) return { ok: false, mensaje: error.message };
  const r = data as { ok: boolean; error?: string; id?: string; codigo?: string };
  if (!r.ok) return { ok: false, mensaje: r.error ?? 'No se pudo registrar el evento.' };

  revalidatePath('/panel/eventos');
  return { ok: true, mensaje: `Evento ${r.codigo} registrado.`, id: r.id, codigo: r.codigo };
}

/** Días de incapacidad y reporte a la ARL: se conocen después del hecho. */
export async function actualizarEvento(
  id: string,
  datos: {
    diasIncapacidad?: number;
    reportadoArl?: boolean;
    fechaReporteArl?: string | null;
    numeroFurat?: string;
  }
): Promise<Resultado> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc('actualizar_evento', {
    p_evento: id,
    p_dias_incapacidad: datos.diasIncapacidad ?? null,
    p_reportado_arl: datos.reportadoArl ?? null,
    p_fecha_reporte_arl: datos.fechaReporteArl ? new Date(datos.fechaReporteArl).toISOString() : null,
    p_numero_furat: datos.numeroFurat ?? null,
  });

  if (error) return { ok: false, mensaje: error.message };
  const r = data as { ok: boolean; error?: string };
  if (!r.ok) return { ok: false, mensaje: r.error ?? 'No se pudo actualizar.' };

  revalidatePath(`/panel/eventos/${id}`);
  revalidatePath('/panel/eventos');
  return { ok: true, mensaje: 'Datos actualizados.' };
}

export async function guardarInvestigacion(
  id: string,
  datos: {
    metodologia: Metodologia;
    causasInmediatas: Causa[];
    causasBasicas: Causa[];
    conclusiones: string;
  }
): Promise<Resultado> {
  const supabase = await crearClienteServidor();
  const limpiar = (cs: Causa[]) =>
    (cs ?? []).filter((c) => c?.descripcion?.trim()).map((c) => ({
      descripcion: c.descripcion.trim(),
      clase: c.clase || 'otro',
    }));

  const { data, error } = await supabase.rpc('guardar_investigacion', {
    p_evento: id,
    p_metodologia: datos.metodologia,
    p_causas_inmediatas: limpiar(datos.causasInmediatas),
    p_causas_basicas: limpiar(datos.causasBasicas),
    p_conclusiones: datos.conclusiones || null,
  });

  if (error) return { ok: false, mensaje: error.message };
  const r = data as { ok: boolean; error?: string };
  if (!r.ok) return { ok: false, mensaje: r.error ?? 'No se pudo guardar.' };

  revalidatePath(`/panel/eventos/${id}`);
  return { ok: true, mensaje: 'Investigación guardada.' };
}

export async function guardarEquipo(
  eventoId: string,
  miembros: Array<{ nombre: string; cargo: string; rol: RolEquipo; firma_url: string | null }>
): Promise<Resultado> {
  const empresa = await empresaActiva();
  if (!empresa) return { ok: false, mensaje: 'No hay empresa seleccionada.' };

  const supabase = await crearClienteServidor();

  // Se reemplaza el equipo completo: es una lista corta y editarla por
  // partes obligaría a llevar ids en el cliente sin ganar nada.
  const { error: errBorrar } = await supabase
    .from('evento_equipo')
    .delete()
    .eq('evento_id', eventoId);
  if (errBorrar) return { ok: false, mensaje: errBorrar.message };

  const filas = miembros
    .filter((m) => m.nombre?.trim())
    .map((m) => ({
      evento_id: eventoId,
      org_id: empresa.org_id,
      nombre: m.nombre.trim().toUpperCase(),
      cargo: m.cargo?.trim() || null,
      rol: m.rol,
      firma_url: m.firma_url,
    }));

  if (filas.length > 0) {
    const { error } = await supabase.from('evento_equipo').insert(filas);
    if (error) return { ok: false, mensaje: error.message };
  }

  revalidatePath(`/panel/eventos/${eventoId}`);
  return { ok: true, mensaje: 'Equipo investigador guardado.' };
}

export async function guardarTestigos(
  eventoId: string,
  testigos: Array<{ nombre: string; identificacion: string; version: string }>
): Promise<Resultado> {
  const empresa = await empresaActiva();
  if (!empresa) return { ok: false, mensaje: 'No hay empresa seleccionada.' };

  const supabase = await crearClienteServidor();
  const { error: errBorrar } = await supabase
    .from('evento_testigos')
    .delete()
    .eq('evento_id', eventoId);
  if (errBorrar) return { ok: false, mensaje: errBorrar.message };

  const filas = testigos
    .filter((t) => t.nombre?.trim())
    .map((t) => ({
      evento_id: eventoId,
      org_id: empresa.org_id,
      nombre: t.nombre.trim().toUpperCase(),
      identificacion: t.identificacion?.trim() || null,
      version: t.version?.trim() || null,
    }));

  if (filas.length > 0) {
    const { error } = await supabase.from('evento_testigos').insert(filas);
    if (error) return { ok: false, mensaje: error.message };
  }

  revalidatePath(`/panel/eventos/${eventoId}`);
  return { ok: true, mensaje: 'Testigos guardados.' };
}

/**
 * Cerrar exige al menos una causa básica y la firma del responsable del
 * SG-SST. Lo valida la base, no solo la interfaz: es lo único que
 * impide saltárselo.
 */
export async function cerrarInvestigacion(
  id: string,
  conclusiones: string
): Promise<Resultado> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc('cerrar_investigacion', {
    p_evento: id,
    p_conclusiones: conclusiones || null,
  });

  if (error) return { ok: false, mensaje: error.message };
  const r = data as { ok: boolean; error?: string };
  if (!r.ok) return { ok: false, mensaje: r.error ?? 'No se pudo cerrar.' };

  revalidatePath(`/panel/eventos/${id}`);
  revalidatePath('/panel/eventos');
  return { ok: true, mensaje: 'Investigación cerrada.' };
}

/** Una acción por causa básica, en el plan de acción que ya existe. */
export async function generarAccionesEvento(
  id: string,
  responsable: string,
  diasPlazo = 30
): Promise<Resultado> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc('generar_acciones_evento', {
    p_evento: id,
    p_responsable: responsable || null,
    p_dias_plazo: diasPlazo,
  });

  if (error) return { ok: false, mensaje: error.message };
  const r = data as { ok: boolean; error?: string; creadas?: number };
  if (!r.ok) return { ok: false, mensaje: r.error ?? 'No se pudieron generar las acciones.' };

  revalidatePath(`/panel/eventos/${id}`);
  revalidatePath('/panel/acciones');
  return {
    ok: true,
    mensaje: r.creadas
      ? `${r.creadas} acción(es) creada(s) en el plan de acción.`
      : 'No había causas nuevas: no se creó ninguna acción.',
  };
}
