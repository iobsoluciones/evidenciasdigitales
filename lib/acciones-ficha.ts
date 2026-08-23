'use server';

/**
 * FICHA INDIVIDUAL DEL EMPLEADO
 * ---------------------------------------------------------------
 * Responde dos preguntas que la matriz de capacitaciones no puede:
 * cuánto ha participado esta persona, y EN QUÉ TEMAS falla.
 *
 * El desglose por subtema es lo accionable: permite reforzar a alguien
 * en el tema concreto en vez de repetirle el curso completo.
 */
import { crearClienteServidor } from './supabase/servidor';
import { empresaActiva } from './empresa-activa';

export type EmpleadoParticipacion = {
  id: string;
  identificacion: string;
  nombres: string;
  cargo: string | null;
  area: string | null;
  ciudad: string | null;
  activo: boolean;
  asistencias: number;
  promedio: number | null;
  ultima: string | null;
};

export type FichaEmpleado = {
  ok: boolean;
  error?: string;
  empleado?: {
    id: string; identificacion: string; nombres: string;
    cargo: string | null; area: string | null; ciudad: string | null;
  };
  totales?: {
    asistencias: number; evaluadas: number; aprobadas: number;
    reprobadas: number; promedio: number | null; conReintento: number;
  };
  porMes?: Array<{ mes: string; valor: number }>;
  porSubtema?: Array<{
    etiqueta: string; respuestas: number; aciertos: number; aciertos_pct: number;
  }>;
  historial?: Array<{
    id: string; codigo: string; tema: string; fecha: string;
    instructor: string; puntaje: number | null; aprobo: boolean | null; intentos: number;
  }>;
};

/** Empleados de la empresa activa con su participación acumulada. */
export async function listarEmpleadosConParticipacion(): Promise<EmpleadoParticipacion[]> {
  const empresa = await empresaActiva();
  if (!empresa) return [];

  const supabase = await crearClienteServidor();
  const { data } = await supabase.rpc('empleados_con_participacion', {
    p_empresa: empresa.id,
  });

  return (data ?? []) as EmpleadoParticipacion[];
}

/** Ficha completa de un empleado. */
export async function obtenerFichaEmpleado(
  empleadoId: string,
  meses = 12
): Promise<FichaEmpleado> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc('ficha_empleado', {
    p_empleado: empleadoId,
    p_meses: meses,
  });

  if (error) return { ok: false, error: error.message };
  return (data ?? { ok: false, error: 'Sin datos.' }) as FichaEmpleado;
}
