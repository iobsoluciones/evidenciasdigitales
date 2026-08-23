'use server';

/**
 * MATRIZ DE DOTACIÓN Y EXPEDIENTE DEL EMPLEADO
 * ---------------------------------------------------------------
 * La matriz de dotación se parece a la de capacitaciones, pero mide
 * algo distinto: allí el eje son eventos puntuales; aquí lo que importa
 * es la VIGENCIA. Un casco entregado hace seis años cuenta como no
 * entregado, porque venció.
 *
 * El expediente une los tres módulos —formación, EPP y equipos— en una
 * sola vista por persona. Es lo que hace que el conjunto valga más que
 * la suma de sus partes: ningún módulo por separado responde
 * «¿esta persona está al día?».
 */
import { crearClienteServidor } from './supabase/servidor';
import { empresaActiva } from './empresa-activa';

export type EstadoDotacion =
  | 'vigente' | 'por_vencer' | 'vencido' | 'sin_vencimiento' | 'nunca';

export type ArticuloMatriz = {
  id: string;
  codigo: string;
  nombre: string;
  categoria: string | null;
  unidad: string;
  vida_util_dias: number | null;
  entregados: number;
  vencidos: number;
};

export type CeldaDotacion = {
  articulo: string;
  estado: EstadoDotacion;
  fecha_vence: string | null;
  talla: string | null;
  entrega: string | null;
  dias: number | null;
};

export type FilaDotacion = {
  id: string;
  identificacion: string;
  nombres: string;
  area: string;
  cargo: string | null;
  celdas: CeldaDotacion[];
  equipos: Array<{ placa: string; articulo: string; desde: string }>;
  vencidos: number;
  faltantes: number;
};

export type MatrizDotacion = {
  articulos: ArticuloMatriz[];
  empleados: FilaDotacion[];
};

export type Expediente = {
  ok: boolean;
  error?: string;
  empleado?: {
    id: string; identificacion: string; nombres: string;
    cargo: string | null; area: string | null; ciudad: string | null;
    activo: boolean;
  };
  capacitaciones?: {
    asistidas: number;
    promedio: number | null;
    reprobadas: number;
    ultima: string | null;
    pendientes: number;
    debiles: Array<{ subtema: string; aciertos: number }>;
  };
  dotacion?: Array<{
    articulo: string; codigo: string; foto_url: string | null;
    cantidad: number; talla: string | null;
    fecha_vence: string | null; entrega: string;
    estado: EstadoDotacion; dias: number | null;
  }>;
  equipos?: Array<{
    articulo: string; placa: string; serial: string | null;
    valor: number | null; estado_entrega: string | null;
    desde: string; entrega: string; dias: number;
  }>;
  entregas?: Array<{
    id: string; codigo: string; fecha: string; estado: string; items: number;
  }>;
};

export async function obtenerMatrizDotacion(): Promise<MatrizDotacion> {
  const empresa = await empresaActiva();
  if (!empresa) return { articulos: [], empleados: [] };

  const supabase = await crearClienteServidor();
  const { data } = await supabase.rpc('matriz_dotacion', { p_empresa: empresa.id });

  return (data ?? { articulos: [], empleados: [] }) as MatrizDotacion;
}

export async function obtenerExpediente(empleadoId: string): Promise<Expediente> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc('expediente_empleado', {
    p_empleado: empleadoId,
  });

  if (error) return { ok: false, error: error.message };
  return (data ?? { ok: false, error: 'Sin datos.' }) as Expediente;
}
