'use server';

/**
 * BANDEJA DE PENDIENTES
 * ---------------------------------------------------------------
 * Un consultor no abre la aplicación para ver sus empresas: ya sabe
 * cuáles son. La abre para saber qué tiene que hacer hoy.
 *
 * Toda esta información ya la calculaba el sistema, pero repartida en
 * seis pantallas. Reunirla es lo que la vuelve útil: nadie entra a seis
 * sitios cada mañana.
 */
import { crearClienteServidor } from './supabase/servidor';
import { empresaActiva } from './empresa-activa';

export type Severidad = 'critico' | 'alto' | 'medio';

export type Pendiente = {
  tipo: string;
  modulo: string;
  titulo: string;
  detalle: string;
  severidad: Severidad;
  /** Días que faltan. Negativo = vencido. */
  dias: number;
  ruta: string;
};

export type Pendientes = {
  ok: boolean;
  items: Pendiente[];
  resumen: { total: number; criticos: number; altos: number; medios: number };
};

const VACIO: Pendientes = {
  ok: true, items: [],
  resumen: { total: 0, criticos: 0, altos: 0, medios: 0 },
};

export async function obtenerPendientes(): Promise<Pendientes> {
  const empresa = await empresaActiva();
  if (!empresa) return VACIO;

  const supabase = await crearClienteServidor();
  const { data } = await supabase.rpc('pendientes', { p_empresa: empresa.id });
  return (data ?? VACIO) as Pendientes;
}

export type Semaforo = {
  hay: boolean;
  id?: string;
  anio?: number;
  estado?: 'borrador' | 'cerrada';
  porcentaje?: number;
  criterio?: 'critico' | 'moderadamente_aceptable' | 'aceptable';
  pendientes?: number;
};

/**
 * Una sola cifra por empresa: el porcentaje de la autoevaluación.
 * Es el número que el gerente entiende sin formación en SST y el que
 * el consultor usa para justificar su contrato.
 */
export async function obtenerSemaforo(): Promise<Semaforo> {
  const empresa = await empresaActiva();
  if (!empresa) return { hay: false };

  const supabase = await crearClienteServidor();
  const { data } = await supabase.rpc('semaforo_cumplimiento', { p_empresa: empresa.id });
  return (data ?? { hay: false }) as Semaforo;
}
