'use server';

/**
 * BITÁCORA DE ENVÍOS
 * ---------------------------------------------------------------
 * Consulta del historial. La escritura ocurre dentro de enviarCorreo.
 */
import { crearClienteServidor } from './supabase/servidor';
import { empresaActiva } from './empresa-activa';

export type Envio = {
  id: string;
  tipo: string;
  referencia_id: string | null;
  destinatarios: string;
  asunto: string;
  estado: 'enviado' | 'error';
  error: string | null;
  proveedor_id: string | null;
  enviado_en: string;
  empresa_id: string | null;
};

/** Envíos de la empresa activa, o de toda la cuenta si se pide. */
export async function listarEnvios(
  todas = false,
  limite = 100
): Promise<Envio[]> {
  const supabase = await crearClienteServidor();

  let consulta = supabase
    .from('envios')
    .select('id, tipo, referencia_id, destinatarios, asunto, estado, error, proveedor_id, enviado_en, empresa_id')
    .order('enviado_en', { ascending: false })
    .limit(limite);

  if (!todas) {
    const empresa = await empresaActiva();
    if (empresa) consulta = consulta.eq('empresa_id', empresa.id);
  }

  const { data } = await consulta;
  return (data ?? []) as Envio[];
}

/** Envíos de una capacitación concreta. */
export async function enviosDeCapacitacion(capacitacionId: string): Promise<Envio[]> {
  const supabase = await crearClienteServidor();
  const { data } = await supabase
    .from('envios')
    .select('id, tipo, referencia_id, destinatarios, asunto, estado, error, proveedor_id, enviado_en, empresa_id')
    .eq('referencia_id', capacitacionId)
    .order('enviado_en', { ascending: false });

  return (data ?? []) as Envio[];
}
