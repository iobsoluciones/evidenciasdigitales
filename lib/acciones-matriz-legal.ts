'use server';

/**
 * MATRIZ LEGAL — estándar 2.7.1 · Dec. 1072 art. 2.2.4.6.8 num. 3
 * ---------------------------------------------------------------
 * Dos capas, por la regla §5.22: al catálogo normativo se le entrega el
 * MÉTODO, no solo el contenido.
 *
 *  1. Un catálogo del sistema que llega hecho, para no arrancar de cero.
 *  2. Encima, el consultor agrega sus propias normas —las del sector de
 *     su cliente— o importa un Excel completo. Cuando el Ministerio
 *     publique algo nuevo no tiene que esperar al programador.
 *
 * La matriz de cada empresa copia la identificación de la norma
 * (plantilla → instancia): corregir el catálogo no cambia sola una
 * matriz que ya se entregó firmada.
 */
import { revalidatePath } from 'next/cache';
import { crearClienteServidor } from './supabase/servidor';
import { empresaActiva } from './empresa-activa';

export type TipoNorma =
  | 'ley' | 'decreto' | 'resolucion' | 'circular' | 'ntc' | 'acuerdo' | 'otro';

export type Cumplimiento =
  | 'no_evaluado' | 'cumple' | 'cumple_parcial' | 'no_cumple';

export type Norma = {
  id: string;
  tipo: TipoNorma;
  numero: string;
  anio: number;
  titulo: string;
  emisor: string | null;
  tema: string | null;
  articulos: string | null;
  enlace: string | null;
  transversal: boolean;
  del_sistema: boolean;
};

export type ItemMatriz = {
  id: string;
  norma_id: string | null;
  tipo: TipoNorma;
  numero: string;
  anio: number;
  titulo: string;
  emisor: string | null;
  tema: string | null;
  articulos: string | null;
  enlace: string | null;
  aplica: boolean;
  cumplimiento: Cumplimiento;
  evidencia: string | null;
  responsable: string | null;
  fecha_verificacion: string | null;
  observaciones: string | null;
  orden: number;
};

export type ResumenMatriz = {
  total: number; aplican: number; no_aplican: number;
  cumple: number; parcial: number; no_cumple: number; sin_evaluar: number;
};

/** Una fila del Excel, ya leída por el navegador. */
export type FilaNorma = {
  tipo: string; numero: string; anio: number | string; titulo: string;
  emisor?: string; tema?: string; articulos?: string;
  enlace?: string; transversal?: string;
};

export type Res = {
  ok: boolean; mensaje: string; id?: string; errores?: string[];
};

export async function listarCatalogo(): Promise<Norma[]> {
  const supabase = await crearClienteServidor();
  const { data } = await supabase.rpc('listar_normas_catalogo');
  return (data ?? []) as Norma[];
}

export async function listarMatriz(): Promise<{
  items: ItemMatriz[]; resumen: ResumenMatriz;
}> {
  const vacio = {
    total: 0, aplican: 0, no_aplican: 0,
    cumple: 0, parcial: 0, no_cumple: 0, sin_evaluar: 0,
  };
  const empresa = await empresaActiva();
  if (!empresa) return { items: [], resumen: vacio };

  const supabase = await crearClienteServidor();
  const { data } = await supabase.rpc('listar_matriz_legal', { p_empresa: empresa.id });
  const d = (data ?? {}) as { items?: ItemMatriz[]; resumen?: ResumenMatriz };
  return { items: d.items ?? [], resumen: d.resumen ?? vacio };
}

export async function sembrarMatriz(): Promise<Res> {
  const empresa = await empresaActiva();
  if (!empresa) return { ok: false, mensaje: 'No hay empresa seleccionada.' };

  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc('sembrar_matriz_legal', {
    p_empresa: empresa.id,
  });
  if (error) return { ok: false, mensaje: error.message };

  const r = data as { ok: boolean; error?: string; creadas?: number };
  if (!r.ok) return { ok: false, mensaje: r.error ?? 'No se pudo cargar.' };

  revalidatePath('/panel/matriz-legal');
  revalidatePath('/panel');
  return {
    ok: true,
    mensaje: r.creadas
      ? `${r.creadas} norma(s) cargadas. Revísalas: la matriz depende del sector y la actividad de cada cliente.`
      : 'Ya estaban todas las normas transversales.',
  };
}

export async function agregarNormaAMatriz(normaId: string): Promise<Res> {
  const empresa = await empresaActiva();
  if (!empresa) return { ok: false, mensaje: 'No hay empresa seleccionada.' };

  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc('agregar_norma_matriz', {
    p_empresa: empresa.id, p_norma: normaId,
  });
  if (error) return { ok: false, mensaje: error.message };

  const r = data as { ok: boolean; error?: string };
  if (!r.ok) return { ok: false, mensaje: r.error ?? 'No se pudo agregar.' };

  revalidatePath('/panel/matriz-legal');
  return { ok: true, mensaje: 'Norma agregada a la matriz.' };
}

export async function guardarItemMatriz(datos: {
  id: string; aplica: boolean; cumplimiento: Cumplimiento;
  evidencia: string; responsable: string; fecha: string; observaciones: string;
}): Promise<Res> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc('guardar_item_matriz', {
    p_id: datos.id,
    p_aplica: datos.aplica,
    p_cumplimiento: datos.cumplimiento,
    p_evidencia: datos.evidencia || null,
    p_responsable: datos.responsable || null,
    p_fecha: datos.fecha || null,
    p_observaciones: datos.observaciones || null,
  });
  if (error) return { ok: false, mensaje: error.message };

  const r = data as { ok: boolean; error?: string };
  if (!r.ok) return { ok: false, mensaje: r.error ?? 'No se pudo guardar.' };

  revalidatePath('/panel/matriz-legal');
  revalidatePath('/panel');
  return { ok: true, mensaje: 'Requisito actualizado.' };
}

export async function eliminarItemMatriz(id: string): Promise<Res> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc('eliminar_item_matriz', { p_id: id });
  if (error) return { ok: false, mensaje: error.message };

  const r = data as { ok: boolean; error?: string };
  if (!r.ok) return { ok: false, mensaje: r.error ?? 'No se pudo quitar.' };

  revalidatePath('/panel/matriz-legal');
  return { ok: true, mensaje: 'Norma retirada de la matriz.' };
}

export async function guardarNorma(datos: {
  id?: string; tipo: TipoNorma; numero: string; anio: number; titulo: string;
  emisor: string; tema: string; articulos: string; enlace: string;
  transversal: boolean;
}): Promise<Res> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc('guardar_norma_catalogo', {
    p_tipo: datos.tipo,
    p_numero: datos.numero,
    p_anio: datos.anio,
    p_titulo: datos.titulo,
    p_emisor: datos.emisor || null,
    p_tema: datos.tema || null,
    p_articulos: datos.articulos || null,
    p_enlace: datos.enlace || null,
    p_transversal: datos.transversal,
    p_id: datos.id ?? null,
  });
  if (error) return { ok: false, mensaje: error.message };

  const r = data as { ok: boolean; error?: string; id?: string };
  if (!r.ok) return { ok: false, mensaje: r.error ?? 'No se pudo guardar.' };

  revalidatePath('/panel/matriz-legal');
  return { ok: true, mensaje: 'Norma guardada en tu catálogo.', id: r.id };
}

export async function eliminarNorma(id: string): Promise<Res> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc('eliminar_norma_catalogo', { p_id: id });
  if (error) return { ok: false, mensaje: error.message };

  const r = data as { ok: boolean; error?: string };
  if (!r.ok) return { ok: false, mensaje: r.error ?? 'No se pudo eliminar.' };

  revalidatePath('/panel/matriz-legal');
  return { ok: true, mensaje: 'Norma eliminada del catálogo.' };
}

/** El navegador lee el Excel; aquí solo llegan las filas ya convertidas. */
export async function importarNormas(filas: FilaNorma[]): Promise<Res> {
  if (filas.length === 0) {
    return { ok: false, mensaje: 'El archivo no tiene filas.' };
  }

  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc('importar_normas', { p_filas: filas });
  if (error) return { ok: false, mensaje: error.message };

  const r = data as {
    ok: boolean; error?: string; errores?: string[]; creadas?: number;
  };
  if (!r.ok) {
    return { ok: false, mensaje: r.error ?? 'No se pudo importar.', errores: r.errores };
  }

  revalidatePath('/panel/matriz-legal');
  return { ok: true, mensaje: `${r.creadas} norma(s) importadas a tu catálogo.` };
}

/** Envía la matriz por correo con el PDF adjunto. */
export async function enviarMatrizLegal(
  destinatarios: string, mensaje: string
): Promise<Res> {
  const empresa = await empresaActiva();
  if (!empresa) return { ok: false, mensaje: 'No hay empresa seleccionada.' };

  const lista = destinatarios.split(/[,;\n]+/).map((c) => c.trim()).filter(Boolean);
  if (lista.length === 0) return { ok: false, mensaje: 'Indica al menos un correo.' };

  const invalidos = lista.filter((c) => !/^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]{2,}$/.test(c));
  if (invalidos.length > 0) {
    return { ok: false, mensaje: `Correo(s) inválido(s): ${invalidos.join(', ')}` };
  }

  const { generarMatrizLegal } = await import('./pdf/generarMatrizLegal');
  const pdf = await generarMatrizLegal(empresa.id);
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
  <p>Adjunto la matriz de requisitos legales con el estado de cumplimiento de
     cada norma y la evidencia que lo respalda.</p>
  <p style="font-size:11px;color:#8A929C;margin-top:24px;border-top:1px solid #E4E4DF;padding-top:12px;">
    Estándar 2.7.1 · Decreto 1072 de 2015, art. 2.2.4.6.8.
  </p>
</div>`.trim(),
    adjuntos: [{ filename: pdf.nombreArchivo, content: pdf.buffer }],
    registro: { tipo: 'otro' },
  });

  if (!envio.ok) return { ok: false, mensaje: envio.mensaje };
  return { ok: true, mensaje: `Matriz enviada a ${lista.length} destinatario(s).` };
}
