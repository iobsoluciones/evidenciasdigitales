'use server';

/**
 * PLAN ANUAL DE TRABAJO
 * ---------------------------------------------------------------
 * Estándar 2.4.1 de la Res. 0312 · Decreto 1072 art. 2.2.4.6.8.
 *
 * Es el primer documento que pide cualquier auditor. Lleva objetivos,
 * metas, responsables, recursos, cronograma y —lo que de verdad lo
 * convierte en plan— la FIRMA DEL EMPLEADOR. Sin esa firma es un
 * borrador del consultor, no un compromiso de la empresa.
 *
 * El avance se calcula al leer: una actividad programada para marzo que
 * en agosto sigue sin ejecutarse está atrasada, y eso cambia con el
 * paso del tiempo sin que nadie toque el registro.
 */
import { revalidatePath } from 'next/cache';
import { crearClienteServidor } from './supabase/servidor';
import { empresaActiva } from './empresa-activa';

export type EstadoActividad = 'pendiente' | 'en_curso' | 'cumplida' | 'no_aplica';

export type Actividad = {
  id: string;
  orden: number;
  objetivo: string | null;
  actividad: string;
  meta: string | null;
  indicador: string | null;
  responsable: string | null;
  recursos: string | null;
  meses_programados: number[];
  meses_ejecutados: number[];
  estado: EstadoActividad;
  atrasada: boolean;
};

export type Plan = {
  id: string;
  anio: number;
  codigo: string;
  estado: 'borrador' | 'aprobado';
  objetivo_general: string | null;
  alcance: string | null;
  recursos_financieros: string | null;
  recursos_humanos: string | null;
  recursos_tecnicos: string | null;
  nombre_empleador: string | null;
  cargo_empleador: string | null;
  firma_empleador_url: string | null;
  fecha_aprobacion: string | null;
  nomenclatura: string | null;
  version_doc: string | null;
};

export type Avance = {
  actividades: number;
  cumplidas: number;
  en_curso: number;
  no_aplica: number;
  porcentaje: number;
  programados: number;
  ejecutados: number;
};

export type PlanResumen = {
  id: string;
  anio: number;
  codigo: string;
  estado: 'borrador' | 'aprobado';
  fecha_aprobacion: string | null;
  nombre_empleador: string | null;
  actividades: number;
  cumplidas: number;
};

export type Resultado = { ok: boolean; mensaje: string; id?: string; enlace?: string };

export async function listarPlanes(): Promise<PlanResumen[]> {
  const empresa = await empresaActiva();
  if (!empresa) return [];

  const supabase = await crearClienteServidor();
  const { data } = await supabase.rpc('listar_planes_anuales', { p_empresa: empresa.id });
  return (data ?? []) as PlanResumen[];
}

export async function obtenerPlan(id: string): Promise<{
  ok: boolean; error?: string;
  plan?: Plan; actividades?: Actividad[]; avance?: Avance;
  empresa?: Record<string, unknown>;
}> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc('detalle_plan_anual', { p_plan: id });
  if (error) return { ok: false, error: error.message };
  return (data ?? { ok: false, error: 'Plan no encontrado.' }) as {
    ok: boolean; error?: string;
    plan?: Plan; actividades?: Actividad[]; avance?: Avance;
    empresa?: Record<string, unknown>;
  };
}

export async function crearPlan(anio: number): Promise<Resultado> {
  const empresa = await empresaActiva();
  if (!empresa) return { ok: false, mensaje: 'No hay empresa seleccionada.' };

  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc('crear_plan_anual', {
    p_empresa: empresa.id,
    p_anio: anio,
  });
  if (error) return { ok: false, mensaje: error.message };

  const r = data as { ok: boolean; error?: string; id?: string };
  if (!r.ok) return { ok: false, mensaje: r.error ?? 'No se pudo crear el plan.' };

  revalidatePath('/panel/plan-anual');
  revalidatePath('/panel');
  return { ok: true, mensaje: `Plan anual ${anio} creado.`, id: r.id };
}

export async function guardarPlan(
  id: string,
  datos: {
    objetivo: string; alcance: string;
    financieros: string; humanos: string; tecnicos: string;
  }
): Promise<Resultado> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc('guardar_plan_anual', {
    p_plan: id,
    p_objetivo: datos.objetivo || null,
    p_alcance: datos.alcance || null,
    p_fin: datos.financieros || null,
    p_hum: datos.humanos || null,
    p_tec: datos.tecnicos || null,
  });
  if (error) return { ok: false, mensaje: error.message };

  const r = data as { ok: boolean; error?: string };
  if (!r.ok) return { ok: false, mensaje: r.error ?? 'No se pudo guardar.' };

  revalidatePath('/panel/plan-anual');
  return { ok: true, mensaje: 'Plan guardado.' };
}

export async function guardarActividad(
  planId: string,
  datos: {
    id?: string;
    actividad: string; objetivo: string; meta: string; indicador: string;
    responsable: string; recursos: string;
    meses: number[]; ejecutados: number[]; estado: EstadoActividad;
  }
): Promise<Resultado> {
  if (!datos.actividad?.trim()) return { ok: false, mensaje: 'Describe la actividad.' };

  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc('guardar_actividad_plan', {
    p_plan: planId,
    p_actividad: datos.actividad,
    p_objetivo: datos.objetivo || null,
    p_meta: datos.meta || null,
    p_indicador: datos.indicador || null,
    p_responsable: datos.responsable || null,
    p_recursos: datos.recursos || null,
    p_meses: datos.meses,
    p_estado: datos.estado,
    p_ejecutados: datos.ejecutados,
    p_id: datos.id ?? null,
  });
  if (error) return { ok: false, mensaje: error.message };

  const r = data as { ok: boolean; error?: string; id?: string };
  if (!r.ok) return { ok: false, mensaje: r.error ?? 'No se pudo guardar la actividad.' };

  revalidatePath('/panel/plan-anual');
  revalidatePath('/panel');
  return { ok: true, mensaje: 'Actividad guardada.', id: r.id };
}

export async function eliminarActividad(id: string): Promise<Resultado> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc('eliminar_actividad_plan', { p_id: id });
  if (error) return { ok: false, mensaje: error.message };

  const r = data as { ok: boolean; error?: string };
  if (!r.ok) return { ok: false, mensaje: r.error ?? 'No se pudo eliminar.' };

  revalidatePath('/panel/plan-anual');
  return { ok: true, mensaje: 'Actividad eliminada.' };
}

/** Aprobar es firmar. Sin firma del empleador el plan no vale. */
export async function aprobarPlan(
  id: string,
  nombre: string,
  cargo: string,
  firmaUrl: string
): Promise<Resultado> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc('aprobar_plan_anual', {
    p_plan: id,
    p_nombre: nombre,
    p_cargo: cargo,
    p_firma: firmaUrl,
  });
  if (error) return { ok: false, mensaje: error.message };

  const r = data as { ok: boolean; error?: string };
  if (!r.ok) return { ok: false, mensaje: r.error ?? 'No se pudo aprobar el plan.' };

  revalidatePath('/panel/plan-anual');
  revalidatePath('/panel');
  return { ok: true, mensaje: 'Plan anual aprobado y firmado.' };
}

/* ================================================================
   Firma remota y PDF — regla §5.21
   ================================================================
   Lo que convierte el plan en plan es la firma del EMPLEADOR, y el
   gerente casi nunca está sentado al lado del consultor. Hasta ahora
   solo se podía capturar en pantalla, que es el problema que la regla
   vino a resolver.
   ================================================================ */

/** Genera el enlace de aprobación y lo envía al empleador. */
export async function enviarEnlacePlan(
  planId: string, correo: string
): Promise<Resultado> {
  const destino = correo.trim();
  if (destino && !/^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]{2,}$/.test(destino)) {
    return { ok: false, mensaje: 'El correo no es válido.' };
  }

  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc('generar_token_plan', { p_plan: planId });
  if (error) return { ok: false, mensaje: error.message };

  const t = data as { ok: boolean; error?: string; token?: string };
  if (!t.ok || !t.token) return { ok: false, mensaje: t.error ?? 'No se pudo generar el enlace.' };

  const { urlBase } = await import('./url-base');
  const enlace = `${await urlBase()}/a/${t.token}`;

  if (!destino) {
    return {
      ok: false, enlace,
      mensaje: 'Sin correo: copia el enlace y envíalo por otro medio.',
    };
  }

  const detalle = await obtenerPlan(planId);
  const p = (detalle.plan ?? {}) as Record<string, unknown>;
  const empresa = (detalle.empresa ?? {}) as Record<string, unknown>;
  const esc = (v: unknown) =>
    String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const { enviarCorreo } = await import('./correo');
  const envio = await enviarCorreo({
    para: destino,
    asunto: `Aprobación del plan anual de SG-SST ${esc(p.anio)} — ${esc(empresa.nombre)}`,
    html: `
<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#14263F;max-width:560px;">
  <p>Buen día.</p>
  <p>
    El plan anual de trabajo del Sistema de Gestión de SST de
    <strong>${esc(empresa.nombre)}</strong> para ${esc(p.anio)} está listo para su
    aprobación.
  </p>
  <p>
    <strong>La firma del empleador es lo que lo convierte en plan.</strong> Sin ella
    es un borrador del consultor, y es el primer documento que pide un auditor.
  </p>
  <p style="margin:24px 0;">
    <a href="${enlace}"
       style="background:#14263F;color:#fff;padding:12px 26px;border-radius:8px;
              text-decoration:none;font-weight:600;display:inline-block;">
      Revisar y aprobar
    </a>
  </p>
  <p style="font-size:11px;color:#8A929C;border-top:1px solid #E4E4DF;padding-top:12px;">
    En el enlace verá el objetivo, el alcance, los recursos y el cronograma completo
    antes de firmar. El enlace deja de funcionar apenas apruebe.
  </p>
</div>`.trim(),
    registro: { tipo: 'otro' },
  });

  if (!envio.ok) return { ok: false, enlace, mensaje: envio.mensaje };

  revalidatePath('/panel/plan-anual');
  return { ok: true, enlace, mensaje: `Enlace enviado a ${destino}.` };
}

/** Para copiarlo a mano cuando no hay correo. */
export async function obtenerEnlacePlan(planId: string): Promise<Resultado> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc('generar_token_plan', { p_plan: planId });
  if (error) return { ok: false, mensaje: error.message };

  const t = data as { ok: boolean; error?: string; token?: string };
  if (!t.ok || !t.token) return { ok: false, mensaje: t.error ?? 'No se pudo generar el enlace.' };

  const { urlBase } = await import('./url-base');
  const url = `${await urlBase()}/a/${t.token}`;
  return { ok: true, mensaje: url, enlace: url };
}

/** Envía el plan en PDF. */
export async function enviarPlanAnual(
  planId: string, destinatarios: string, mensaje: string
): Promise<Resultado> {
  const lista = destinatarios.split(/[,;\n]+/).map((c) => c.trim()).filter(Boolean);
  if (lista.length === 0) return { ok: false, mensaje: 'Indica al menos un correo.' };

  const invalidos = lista.filter((c) => !/^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]{2,}$/.test(c));
  if (invalidos.length > 0) {
    return { ok: false, mensaje: `Correo(s) inválido(s): ${invalidos.join(', ')}` };
  }

  const { generarPlanAnual } = await import('./pdf/generarPlanAnual');
  const pdf = await generarPlanAnual(planId);
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
  <p>Adjunto el plan anual con el cronograma de las actividades y la firma de
     aprobación del empleador.</p>
  <p style="font-size:11px;color:#8A929C;margin-top:24px;border-top:1px solid #E4E4DF;padding-top:12px;">
    Estándar 2.4.1 · Decreto 1072 de 2015, art. 2.2.4.6.8.
  </p>
</div>`.trim(),
    adjuntos: [{ filename: pdf.nombreArchivo, content: pdf.buffer }],
    registro: { tipo: 'otro' },
  });

  if (!envio.ok) return { ok: false, mensaje: envio.mensaje };
  return { ok: true, mensaje: `Plan enviado a ${lista.length} destinatario(s).` };
}
