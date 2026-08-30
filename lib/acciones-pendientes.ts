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
