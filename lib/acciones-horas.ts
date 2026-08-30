'use server';

/**
 * HORAS-HOMBRE TRABAJADAS
 * ---------------------------------------------------------------
 * Es el denominador de los indicadores mínimos del artículo 30 de la
 * Resolución 0312. Sin este dato no hay frecuencia ni severidad de
 * accidentalidad, y ambos son de reporte anual obligatorio.
 *
 * Se captura por MES, no por año, porque así lo pide la fórmula: la
 * frecuencia se calcula sobre los trabajadores del mes.
 *
 * Los tres datos son distintos y no se derivan entre sí:
 *   - horas: para la exposición real.
 *   - trabajadores: promedio del mes, que es lo que usan frecuencia y
 *     severidad.
 *   - días programados: denominador del ausentismo.
 */
import { revalidatePath } from 'next/cache';
import { crearClienteServidor } from './supabase/servidor';
import { empresaActiva } from './empresa-activa';

export type MesHoras = {
  mes: number;
  horas: number;
  trabajadores: number;
  dias_programados: number;
  /** false = el mes nunca se ha guardado; se muestra en blanco, no en cero. */
  registrado: boolean;
};

export type TotalesHoras = {
  horas: number;
  dias_programados: number;
  /** Promedio de los meses CON dato, no la suma: así lo entiende la norma. */
  promedio_trabajadores: number;
  meses_con_dato: number;
};

export type Resultado = { ok: boolean; mensaje: string };

export async function listarHorasHombre(anio: number): Promise<MesHoras[]> {
  const empresa = await empresaActiva();
  if (!empresa) return [];

  const supabase = await crearClienteServidor();
  const { data } = await supabase.rpc('listar_horas_hombre', {
    p_empresa: empresa.id,
    p_anio: anio,
  });
  return (data ?? []) as MesHoras[];
}

export async function totalesHorasHombre(
  desde: string,
  hasta: string
): Promise<TotalesHoras | null> {
  const empresa = await empresaActiva();
  if (!empresa) return null;

  const supabase = await crearClienteServidor();
  const { data } = await supabase.rpc('horas_hombre_periodo', {
    p_empresa: empresa.id,
    p_desde: desde,
    p_hasta: hasta,
  });
  return (data ?? null) as TotalesHoras | null;
}

/** Guarda el año completo de una vez: la pantalla es una rejilla. */
export async function guardarAnioHoras(
  anio: number,
  meses: Array<{ mes: number; horas: number; trabajadores: number; dias_programados: number }>
): Promise<Resultado> {
  const empresa = await empresaActiva();
  if (!empresa) return { ok: false, mensaje: 'No hay empresa seleccionada.' };

  const supabase = await crearClienteServidor();

  for (const m of meses) {
    const { data, error } = await supabase.rpc('guardar_horas_hombre', {
      p_empresa: empresa.id,
      p_anio: anio,
      p_mes: m.mes,
      p_horas: Number.isFinite(m.horas) ? m.horas : 0,
      p_trabajadores: Number.isFinite(m.trabajadores) ? m.trabajadores : 0,
      p_dias_programados: Number.isFinite(m.dias_programados) ? m.dias_programados : 0,
    });

    if (error) return { ok: false, mensaje: error.message };

    const r = data as { ok: boolean; error?: string } | null;
    if (!r?.ok) {
      return { ok: false, mensaje: `${NOMBRE_MES[m.mes - 1]}: ${r?.error ?? 'no se pudo guardar.'}` };
    }
  }

  revalidatePath('/panel/indicadores');
  return { ok: true, mensaje: `Horas-hombre de ${anio} guardadas.` };
}

const NOMBRE_MES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];
