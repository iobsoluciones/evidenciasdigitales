'use server';

/**
 * AUSENTISMO — Dec. 1072 art. 2.2.4.6.22 · Res. 0312 art. 30
 * ---------------------------------------------------------------
 * Cierra el sexto indicador legal. Antes se calculaba con los días de
 * incapacidad de los accidentes, que son una fracción: el grueso del
 * ausentismo es enfermedad general, y sin registrarla el número mentía
 * por defecto.
 *
 * IGUAL QUE EN EXÁMENES MÉDICOS: aquí NO va el diagnóstico. La historia
 * clínica es reservada y la custodia el médico (Res. 2346 de 2007). Se
 * registra el origen y los días, que es lo que el indicador necesita.
 */
import { revalidatePath } from 'next/cache';
import { crearClienteServidor } from './supabase/servidor';
import { empresaActiva } from './empresa-activa';

export type OrigenAusencia =
  | 'enfermedad_general' | 'accidente_trabajo' | 'enfermedad_laboral'
  | 'accidente_comun' | 'licencia_maternidad' | 'licencia_paternidad'
  | 'licencia_luto' | 'permiso_no_remunerado' | 'otro';

export type Ausencia = {
  id: string;
  empleado_id: string;
  nombres: string;
  area: string | null;
  cargo: string | null;
  origen: OrigenAusencia;
  fecha_inicio: string;
  fecha_fin: string;
  dias: number;
  causa_medica: boolean;
  prorroga: boolean;
  entidad: string | null;
  numero_incapacidad: string | null;
  evento_id: string | null;
  evento_codigo: string | null;
  observaciones: string | null;
};

export type ResumenAusentismo = {
  eventos: number;
  dias_totales: number;
  dias_medicos: number;
  personas: number;
  dias_programados: number;
  por_origen: Array<{ origen: OrigenAusencia; eventos: number; dias: number }>;
};

export type Res = { ok: boolean; mensaje: string; id?: string };

export async function listarAusencias(anio: number): Promise<{
  items: Ausencia[]; resumen: ResumenAusentismo;
}> {
  const vacio: ResumenAusentismo = {
    eventos: 0, dias_totales: 0, dias_medicos: 0,
    personas: 0, dias_programados: 0, por_origen: [],
  };
  const empresa = await empresaActiva();
  if (!empresa) return { items: [], resumen: vacio };

  const supabase = await crearClienteServidor();
  const { data } = await supabase.rpc('listar_ausencias', {
    p_empresa: empresa.id, p_anio: anio,
  });
  const d = (data ?? {}) as { items?: Ausencia[]; resumen?: ResumenAusentismo };
  return { items: d.items ?? [], resumen: d.resumen ?? vacio };
}

export async function guardarAusencia(datos: {
  id?: string; empleadoId: string; origen: OrigenAusencia;
  inicio: string; fin: string; prorroga: boolean;
  entidad: string; numero: string; eventoId: string; observaciones: string;
}): Promise<Res> {
  const empresa = await empresaActiva();
  if (!empresa) return { ok: false, mensaje: 'No hay empresa seleccionada.' };

  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc('guardar_ausencia', {
    p_empresa: empresa.id,
    p_empleado: datos.empleadoId || null,
    p_origen: datos.origen,
    p_inicio: datos.inicio || null,
    p_fin: datos.fin || null,
    p_prorroga: datos.prorroga,
    p_entidad: datos.entidad || null,
    p_numero: datos.numero || null,
    p_evento: datos.eventoId || null,
    p_observaciones: datos.observaciones || null,
    p_id: datos.id ?? null,
  });
  if (error) return { ok: false, mensaje: error.message };

  const r = data as { ok: boolean; error?: string; id?: string };
  if (!r.ok) return { ok: false, mensaje: r.error ?? 'No se pudo guardar.' };

  revalidatePath('/panel/ausentismo');
  revalidatePath('/panel/indicadores/legales');
  return { ok: true, mensaje: 'Ausencia registrada.', id: r.id };
}

export async function eliminarAusencia(id: string): Promise<Res> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc('eliminar_ausencia', { p_id: id });
  if (error) return { ok: false, mensaje: error.message };

  const r = data as { ok: boolean; error?: string };
  if (!r.ok) return { ok: false, mensaje: r.error ?? 'No se pudo eliminar.' };

  revalidatePath('/panel/ausentismo');
  revalidatePath('/panel/indicadores/legales');
  return { ok: true, mensaje: 'Ausencia eliminada.' };
}
