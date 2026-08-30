'use server';

/**
 * AUTOEVALUACIÓN DE ESTÁNDARES MÍNIMOS
 * ---------------------------------------------------------------
 * Resolución 0312 de 2019, artículos 27 y 28.
 *
 * El puntaje y el criterio se derivan al leer, nunca se almacenan: si
 * se guardaran, cambiar una respuesta dejaría el porcentaje viejo.
 *
 * Regla que más puntos cuesta en una visita: un estándar marcado
 * «no aplica» SIN justificación se puntúa en cero. La base lo exige.
 */
import { revalidatePath } from 'next/cache';
import { crearClienteServidor } from './supabase/servidor';
import { empresaActiva } from './empresa-activa';

export type Resultado_ = 'sin_evaluar' | 'cumple' | 'no_cumple' | 'no_aplica';
export type Criterio = 'critico' | 'moderadamente_aceptable' | 'aceptable';

export type ItemEstandar = {
  id: string;
  codigo: string;
  ciclo: 'planear' | 'hacer' | 'verificar' | 'actuar';
  capitulo: string;
  nombre: string;
  peso: number;
  resultado: Resultado_;
  justificacion: string | null;
  observacion: string | null;
};

export type Puntaje = {
  obtenido: number;
  posible: number;
  porcentaje: number;
  cumple: number;
  no_cumple: number;
  no_aplica: number;
  sin_evaluar: number;
  no_aplica_sin_justificar: number;
};

export type PorCiclo = {
  ciclo: string; obtenido: number; posible: number; porcentaje: number;
};

export type Autoevaluacion = {
  id: string; anio: number; codigo: string; alcance: number;
  estado: 'borrador' | 'cerrada'; fecha_cierre: string | null;
  observaciones: string | null;
  nomenclatura: string | null; version_doc: string | null;
};

export type DetalleAuto = {
  ok: boolean; error?: string;
  autoevaluacion?: Autoevaluacion;
  items?: ItemEstandar[];
  puntaje?: Puntaje;
  por_ciclo?: PorCiclo[];
  criterio?: Criterio;
  requiere_plan?: boolean;
  empresa?: Record<string, unknown>;
};

export type ResumenAuto = {
  id: string; anio: number; codigo: string; alcance: number;
  estado: 'borrador' | 'cerrada'; fecha_cierre: string | null; pendientes: number;
};

export type Res = { ok: boolean; mensaje: string; id?: string };

export async function listarAutoevaluaciones(): Promise<ResumenAuto[]> {
  const empresa = await empresaActiva();
  if (!empresa) return [];

  const supabase = await crearClienteServidor();
  const { data } = await supabase.rpc('listar_autoevaluaciones', { p_empresa: empresa.id });
  return (data ?? []) as ResumenAuto[];
}

export async function obtenerAutoevaluacion(id: string): Promise<DetalleAuto> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc('detalle_autoevaluacion', { p_auto: id });
  if (error) return { ok: false, error: error.message };
  return (data ?? { ok: false, error: 'No encontrada.' }) as DetalleAuto;
}

/**
 * Se crea a partir de un CONJUNTO de estándares, que el profesional
 * mantiene en /panel/estandares. Los estándares se copian: si el
 * conjunto cambia después, lo ya evaluado conserva su tabla.
 */
export async function crearAutoevaluacion(anio: number, conjuntoId: string): Promise<Res> {
  const empresa = await empresaActiva();
  if (!empresa) return { ok: false, mensaje: 'No hay empresa seleccionada.' };
  if (!conjuntoId) return { ok: false, mensaje: 'Elige el conjunto de estándares que aplica.' };

  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc('crear_autoevaluacion', {
    p_empresa: empresa.id, p_anio: anio, p_conjunto: conjuntoId,
  });
  if (error) return { ok: false, mensaje: error.message };

  const r = data as { ok: boolean; error?: string; id?: string; estandares?: number };
  if (!r.ok) return { ok: false, mensaje: r.error ?? 'No se pudo crear.' };

  revalidatePath('/panel/autoevaluacion');
  revalidatePath('/panel');
  return { ok: true, mensaje: `Autoevaluación ${anio} creada con ${r.estandares} estándares.`, id: r.id };
}

export async function responderEstandar(
  itemId: string, resultado: Resultado_,
  justificacion = '', observacion = ''
): Promise<Res> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc('responder_estandar', {
    p_item: itemId,
    p_resultado: resultado,
    p_justificacion: justificacion || null,
    p_observacion: observacion || null,
  });
  if (error) return { ok: false, mensaje: error.message };

  const r = data as { ok: boolean; error?: string };
  if (!r.ok) return { ok: false, mensaje: r.error ?? 'No se pudo guardar.' };

  revalidatePath('/panel/autoevaluacion');
  return { ok: true, mensaje: 'Respuesta guardada.' };
}

export async function cerrarAutoevaluacion(id: string, observaciones = ''): Promise<Res> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc('cerrar_autoevaluacion', {
    p_auto: id, p_observaciones: observaciones || null,
  });
  if (error) return { ok: false, mensaje: error.message };

  const r = data as { ok: boolean; error?: string };
  if (!r.ok) return { ok: false, mensaje: r.error ?? 'No se pudo cerrar.' };

  revalidatePath('/panel/autoevaluacion');
  revalidatePath('/panel');
  return { ok: true, mensaje: 'Autoevaluación cerrada.' };
}

/** Cada estándar incumplido se vuelve una acción del plan que ya existe. */
export async function generarPlanMejoramiento(
  id: string, responsable = '', dias = 90
): Promise<Res> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc('generar_plan_mejoramiento', {
    p_auto: id, p_responsable: responsable || null, p_dias: dias,
  });
  if (error) return { ok: false, mensaje: error.message };

  const r = data as { ok: boolean; error?: string; creadas?: number };
  if (!r.ok) return { ok: false, mensaje: r.error ?? 'No se pudo generar.' };

  revalidatePath('/panel/autoevaluacion');
  revalidatePath('/panel/acciones');
  return {
    ok: true,
    mensaje: r.creadas
      ? `${r.creadas} acción(es) de mejora creadas en el plan de acción.`
      : 'No había estándares incumplidos nuevos.',
  };
}

/**
 * Envía el informe por correo con el PDF adjunto.
 *
 * La autoevaluación es el soporte que pide primero un auditor y el que
 * hay que comunicar a la ARL cuando el criterio no es aceptable, así que
 * tiene que poder salir de la aplicación sin pasar por una captura de
 * pantalla.
 */
export async function enviarAutoevaluacion(
  id: string, destinatarios: string, mensaje: string
): Promise<Res> {
  const lista = destinatarios.split(/[,;\n]+/).map((c) => c.trim()).filter(Boolean);
  if (lista.length === 0) return { ok: false, mensaje: 'Indica al menos un correo.' };

  const invalidos = lista.filter((c) => !/^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]{2,}$/.test(c));
  if (invalidos.length > 0) {
    return { ok: false, mensaje: `Correo(s) inválido(s): ${invalidos.join(', ')}` };
  }

  const { generarInformeAutoevaluacion } = await import('./pdf/generarInformeAutoevaluacion');
  const pdf = await generarInformeAutoevaluacion(id);
  if (!pdf.ok) return { ok: false, mensaje: pdf.error };

  const { enviarCorreo } = await import('./correo');
  const extra = mensaje.trim()
    ? `<p style="background:#F7F7F4;border-left:3px solid #14263F;padding:10px 14px;color:#374151;margin:16px 0;">
         ${mensaje.replace(/</g, '&lt;').replace(/\n/g, '<br>')}
       </p>` : '';

  const envio = await enviarCorreo({
    para: lista.join(','),
    asunto: `${pdf.titulo} — ${pdf.empresa}`,
    html: `
<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#14263F;max-width:560px;">
  <h2 style="margin-bottom:4px;">${pdf.titulo}</h2>
  <p style="color:#5B6470;margin-top:0;">${pdf.empresa}</p>
  ${extra}
  <p>Adjunto el informe de autoevaluación de estándares mínimos, con el
     puntaje, el criterio de valoración y el detalle estándar por estándar.</p>
  <p style="font-size:11px;color:#8A929C;margin-top:24px;border-top:1px solid #E4E4DF;padding-top:12px;">
    Resolución 0312 de 2019, artículos 27 y 28.
  </p>
</div>`.trim(),
    adjuntos: [{ filename: pdf.nombreArchivo, content: pdf.buffer }],
    registro: { tipo: 'otro' },
  });

  if (!envio.ok) return { ok: false, mensaje: envio.mensaje };
  return { ok: true, mensaje: `Informe enviado a ${lista.length} destinatario(s).` };
}
