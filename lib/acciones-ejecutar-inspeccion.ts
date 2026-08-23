'use server';

/**
 * INSPECCIONES — ejecución
 * ---------------------------------------------------------------
 * Al crear la inspección se COPIAN los criterios de la plantilla. Si
 * la lista cambia después, la inspección ya hecha conserva aquellos
 * con los que realmente se evaluó.
 *
 * El veredicto NO es el puntaje: un criterio crítico incumplido
 * reprueba la inspección completa aunque saque 92%. Hay cosas que no
 * se compensan con otras.
 */
import { revalidatePath } from 'next/cache';
import { crearClienteServidor } from './supabase/servidor';
import { empresaActiva } from './empresa-activa';

export type ResultadoCriterio = 'cumple' | 'no_cumple' | 'no_aplica';

export type InspeccionResumen = {
  id: string;
  codigo: string;
  nombre: string;
  tipo: string;
  norma: string | null;
  objeto_nombre: string | null;
  inspector: string;
  fecha: string;
  puntaje: number | null;
  cumple: boolean | null;
  estado: 'borrador' | 'cerrada' | 'anulada';
  criterios: number;
  respondidos: number;
  hallazgos: number;
};

export type RespuestaCriterio = {
  id: string;
  orden: number;
  seccion: string | null;
  criterio: string;
  ayuda: string | null;
  tipo_respuesta: string;
  peso: number;
  critico: boolean;
  resultado: ResultadoCriterio | null;
  valor: number | null;
  hallazgo: string | null;
  foto_url: string | null;
};

export type Inspeccion = {
  id: string;
  codigo: string;
  nombre: string;
  tipo: string;
  norma: string | null;
  tipo_objeto: string | null;
  objeto_nombre: string | null;
  inspector: string;
  acompanante: string | null;
  fecha: string;
  puntaje: number | null;
  cumple: boolean | null;
  observaciones: string | null;
  nomenclatura: string | null;
  version_doc: string | null;
  titulo_doc: string | null;
  estado: 'borrador' | 'cerrada' | 'anulada';
  firma_inspector_url: string | null;
  firma_acompanante_url: string | null;
};

export type DetalleInspeccion = {
  ok: boolean;
  error?: string;
  inspeccion?: Inspeccion;
  respuestas?: RespuestaCriterio[];
  resumen?: {
    total: number; respondidos: number;
    cumple: number; no_cumple: number; no_aplica: number;
    criticos_fallidos: number;
  };
};

export type Resultado = {
  ok: boolean;
  mensaje: string;
  id?: string;
  codigo?: string;
  puntaje?: number;
  cumple?: boolean;
};

export async function listarInspecciones(): Promise<InspeccionResumen[]> {
  const empresa = await empresaActiva();
  if (!empresa) return [];

  const supabase = await crearClienteServidor();
  const { data } = await supabase.rpc('listar_inspecciones', { p_empresa: empresa.id });
  return (data ?? []) as InspeccionResumen[];
}

export async function obtenerInspeccion(id: string): Promise<DetalleInspeccion> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc('detalle_inspeccion', { p_inspeccion: id });

  if (error) return { ok: false, error: error.message };
  return (data ?? { ok: false, error: 'Sin datos.' }) as DetalleInspeccion;
}

export async function crearInspeccion(datos: {
  plantillaId: string;
  inspector: string;
  acompanante: string;
  tipoObjeto: string;
  objetoId: string | null;
  objetoNombre: string;
}): Promise<Resultado> {
  const empresa = await empresaActiva();
  if (!empresa) return { ok: false, mensaje: 'No hay empresa seleccionada.' };
  if (!datos.plantillaId) return { ok: false, mensaje: 'Elige una lista de verificación.' };
  if (!datos.inspector.trim()) return { ok: false, mensaje: 'Indica quién inspecciona.' };

  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc('crear_inspeccion', {
    p_plantilla: datos.plantillaId,
    p_empresa: empresa.id,
    p_inspector: datos.inspector,
    p_acompanante: datos.acompanante || null,
    p_tipo_objeto: datos.tipoObjeto || null,
    p_objeto_id: datos.objetoId,
    p_objeto_nombre: datos.objetoNombre || null,
  });

  if (error) return { ok: false, mensaje: error.message };

  const r = data as { ok: boolean; error?: string; id?: string; codigo?: string; criterios?: number };
  if (!r.ok) return { ok: false, mensaje: r.error ?? 'No se pudo crear.' };

  revalidatePath('/panel/inspecciones');
  return {
    ok: true,
    mensaje: `${r.codigo} creada con ${r.criterios} criterio(s).`,
    id: r.id,
    codigo: r.codigo,
  };
}

/** Guarda un criterio. Se llama al responder, sin botón de por medio. */
export async function responderCriterio(datos: {
  respuestaId: string;
  resultado: ResultadoCriterio;
  hallazgo?: string;
  fotoUrl?: string | null;
  valor?: number | null;
}): Promise<Resultado> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc('guardar_respuesta_inspeccion', {
    p_respuesta: datos.respuestaId,
    p_resultado: datos.resultado,
    p_hallazgo: datos.hallazgo ?? null,
    p_foto: datos.fotoUrl ?? null,
    p_valor: datos.valor ?? null,
  });

  if (error) return { ok: false, mensaje: error.message };

  const r = data as { ok: boolean; error?: string };
  if (!r.ok) return { ok: false, mensaje: r.error ?? 'No se pudo guardar.' };

  return { ok: true, mensaje: 'Guardado.' };
}

/**
 * Cierra la inspección y calcula el veredicto.
 * Exige que todos los criterios estén respondidos: una inspección a
 * medias no prueba nada.
 */
export async function cerrarInspeccion(
  inspeccionId: string,
  datos: {
    observaciones: string;
    firmaInspector: string | null;
    firmaAcompanante: string | null;
  }
): Promise<Resultado> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc('cerrar_inspeccion', {
    p_inspeccion: inspeccionId,
    p_observaciones: datos.observaciones || null,
    p_firma_inspector: datos.firmaInspector,
    p_firma_acompanante: datos.firmaAcompanante,
  });

  if (error) return { ok: false, mensaje: error.message };

  const r = data as {
    ok: boolean; error?: string; codigo?: string;
    puntaje?: number; cumple?: boolean; criticos?: number; hallazgos?: number;
  };
  if (!r.ok) return { ok: false, mensaje: r.error ?? 'No se pudo cerrar.' };

  revalidatePath('/panel/inspecciones');
  revalidatePath(`/panel/inspecciones/${inspeccionId}`);

  const veredicto = r.cumple
    ? `Cumple con ${r.puntaje}%.`
    : `No cumple: ${r.criticos} criterio(s) crítico(s) incumplidos, pese al ${r.puntaje}%.`;

  return { ok: true, mensaje: veredicto, puntaje: r.puntaje, cumple: r.cumple };
}

/** Elimina un borrador. Una inspección cerrada no se borra. */
export async function eliminarBorradorInspeccion(id: string): Promise<Resultado> {
  const supabase = await crearClienteServidor();

  const { data: insp } = await supabase
    .from('inspecciones')
    .select('estado')
    .eq('id', id)
    .maybeSingle();

  if (insp?.estado !== 'borrador') {
    return { ok: false, mensaje: 'Solo se eliminan inspecciones sin cerrar.' };
  }

  const { error } = await supabase.from('inspecciones').delete().eq('id', id);
  if (error) return { ok: false, mensaje: error.message };

  revalidatePath('/panel/inspecciones');
  return { ok: true, mensaje: 'Borrador eliminado.' };
}

/** Unidades del inventario, para inspecciones de tipo equipo. */
export async function unidadesParaInspeccion(): Promise<Array<{
  id: string; placa: string; serial: string | null; articulo: string;
}>> {
  const empresa = await empresaActiva();
  if (!empresa) return [];

  const supabase = await crearClienteServidor();
  const { data } = await supabase
    .from('articulo_unidades')
    .select('id, placa, serial, articulos(nombre)')
    .eq('empresa_id', empresa.id)
    .eq('activo', true)
    .order('placa');

  return (data ?? []).map((u) => {
    const art = u.articulos as unknown as { nombre: string } | null;
    return {
      id: u.id as string,
      placa: u.placa as string,
      serial: (u.serial as string) ?? null,
      articulo: art?.nombre ?? '',
    };
  });
}
