'use server';

/**
 * COMITÉS — COPASST / Vigía y Comité de Convivencia Laboral
 * ---------------------------------------------------------------
 * Res. 2013 de 1986 · Res. 652 de 2012 modificada por la 1356 de 2012.
 * Estándares 1.1.6 y 1.1.8.
 *
 * Lo que le da valor no es dibujar el organigrama: es que la aplicación
 * ya sabe cuántos trabajadores activos tiene cada empresa, así que
 * calcula la composición que exige la norma y avisa cuando el comité
 * está mal conformado. Es un hallazgo que hoy nadie detecta hasta la
 * visita del Ministerio.
 *
 * OJO: la norma habla de TRABAJADORES DE LA EMPRESA. Si el cliente
 * tiene contratistas el número puede diferir del de empleados
 * registrados, así que el sistema PROPONE y el consultor confirma.
 *
 * La BRIGADA DE EMERGENCIA vive aquí porque se conforma igual —un grupo
 * de personas nombradas por un periodo, con un acta y un organigrama—,
 * pero se valida distinto: el Decreto 1072 (art. 2.2.4.6.25, num. 9) no
 * fija número ni paridad, exige conformarla, capacitarla y dotarla
 * «acorde con su nivel de riesgo». Por eso lo que la aplicación calcula
 * para la brigada son RECOMENDACIONES separadas de las fallas: mezclarlas
 * sería presentar como exigencia legal algo que es criterio técnico.
 */
import { revalidatePath } from 'next/cache';
import { crearClienteServidor } from './supabase/servidor';
import { empresaActiva } from './empresa-activa';

export type TipoComite = 'copasst' | 'vigia' | 'convivencia' | 'brigada';
export type Parte = 'empleador' | 'trabajadores' | 'brigada';
export type RolComite =
  | 'presidente' | 'secretario' | 'integrante'   // COPASST y convivencia
  | 'jefe' | 'brigadista';                       // brigada de emergencia
/** Frentes de la brigada. Null en los demás comités. */
export type Frente = 'primeros_auxilios' | 'incendios' | 'evacuacion';

export type Miembro = {
  id: string;
  empleado_id: string | null;
  nombre: string;
  identificacion: string | null;
  cargo_empresa: string | null;
  foto_url: string | null;
  parte: Parte;
  suplente: boolean;
  rol: RolComite;
  frente: Frente | null;
  activo: boolean;
  motivo_salida: string | null;
};

export type Validacion = {
  ok: boolean;
  /** Solo cuentan las fallas: las recomendaciones no reprueban. */
  conforme: boolean;
  fallas: string[];
  recomendaciones: string[];
  requerido: {
    trabajadores: number; tipo_correcto: string;
    principales: number; suplentes: number; sugeridos: number;
    norma: string; nota: string;
  };
  actual: {
    empleador_principales: number; empleador_suplentes: number;
    trabajadores_principales: number; trabajadores_suplentes: number;
    presidente: number; secretario: number;
    total: number; jefe: number;
    primeros_auxilios: number; incendios: number; evacuacion: number;
  };
};

export type ComiteResumen = {
  id: string; tipo: TipoComite; codigo: string; estado: string;
  periodo_inicio: string; periodo_fin: string; fecha_conformacion: string | null;
  vencido: boolean; dias_restantes: number;
  integrantes: number; conforme: boolean;
};

export type Comite = {
  id: string; tipo: TipoComite; codigo: string; estado: string;
  periodo_inicio: string; periodo_fin: string; fecha_conformacion: string | null;
  acta_conformacion: string | null; observaciones: string | null;
  nomenclatura: string | null; version_doc: string | null; titulo_doc: string | null;
};

export type Res = { ok: boolean; mensaje: string; id?: string };

export async function listarComites(): Promise<ComiteResumen[]> {
  const empresa = await empresaActiva();
  if (!empresa) return [];

  const supabase = await crearClienteServidor();
  const { data } = await supabase.rpc('listar_comites', { p_empresa: empresa.id });
  return (data ?? []) as ComiteResumen[];
}

export async function obtenerComite(id: string): Promise<{
  ok: boolean; error?: string;
  comite?: Comite; miembros?: Miembro[];
  validacion?: Validacion; empresa?: Record<string, unknown>;
}> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc('detalle_comite', { p_comite: id });
  if (error) return { ok: false, error: error.message };
  return (data ?? { ok: false, error: 'No encontrado.' }) as {
    ok: boolean; error?: string;
    comite?: Comite; miembros?: Miembro[];
    validacion?: Validacion; empresa?: Record<string, unknown>;
  };
}

/** Qué exige la norma según los trabajadores activos de la empresa. */
export async function composicionRequerida(tipo: TipoComite): Promise<Validacion['requerido'] | null> {
  const empresa = await empresaActiva();
  if (!empresa) return null;

  const supabase = await crearClienteServidor();
  const { data } = await supabase.rpc('composicion_requerida', {
    p_empresa: empresa.id, p_tipo: tipo,
  });
  return (data ?? null) as Validacion['requerido'] | null;
}

export async function crearComite(
  tipo: TipoComite, inicio: string, fechaConformacion: string
): Promise<Res> {
  const empresa = await empresaActiva();
  if (!empresa) return { ok: false, mensaje: 'No hay empresa seleccionada.' };
  if (!inicio) return { ok: false, mensaje: 'Indica la fecha de inicio del periodo.' };

  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc('crear_comite', {
    p_empresa: empresa.id, p_tipo: tipo, p_inicio: inicio,
    p_fecha_conformacion: fechaConformacion || null,
  });
  if (error) return { ok: false, mensaje: error.message };

  const r = data as { ok: boolean; error?: string; id?: string };
  if (!r.ok) return { ok: false, mensaje: r.error ?? 'No se pudo conformar.' };

  revalidatePath('/panel/comites');
  revalidatePath('/panel');
  return { ok: true, mensaje: 'Comité conformado. Ahora agrega sus integrantes.', id: r.id };
}

export async function guardarMiembro(
  comiteId: string,
  datos: {
    id?: string; empleadoId: string | null; nombre: string;
    identificacion: string; cargo: string; parte: Parte;
    suplente: boolean; rol: RolComite;
    frente?: Frente | '' | null; fotoUrl?: string | null;
  }
): Promise<Res> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc('guardar_miembro_comite', {
    p_comite: comiteId,
    p_nombre: datos.nombre || null,
    p_parte: datos.parte,
    p_suplente: datos.suplente,
    p_rol: datos.rol,
    p_empleado: datos.empleadoId || null,
    p_identificacion: datos.identificacion || null,
    p_cargo: datos.cargo || null,
    p_foto: datos.fotoUrl ?? null,
    p_id: datos.id ?? null,
    p_frente: datos.frente || null,
  });
  if (error) return { ok: false, mensaje: error.message };

  const r = data as { ok: boolean; error?: string; id?: string };
  if (!r.ok) return { ok: false, mensaje: r.error ?? 'No se pudo guardar.' };

  revalidatePath('/panel/comites');
  revalidatePath('/panel');
  return { ok: true, mensaje: 'Integrante guardado.', id: r.id };
}

/**
 * Con motivo, se INACTIVA en vez de borrarse: el acta de conformación
 * sigue nombrándolo y borrarlo la dejaría mintiendo.
 */
export async function quitarMiembro(id: string, motivo = ''): Promise<Res> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc('eliminar_miembro_comite', {
    p_id: id, p_motivo: motivo || null,
  });
  if (error) return { ok: false, mensaje: error.message };

  const r = data as { ok: boolean; error?: string };
  if (!r.ok) return { ok: false, mensaje: r.error ?? 'No se pudo quitar.' };

  revalidatePath('/panel/comites');
  return { ok: true, mensaje: motivo ? 'Integrante retirado del comité.' : 'Integrante eliminado.' };
}

/** Envía el organigrama por correo, con el PDF adjunto. */
export async function enviarOrganigrama(
  comiteId: string, destinatarios: string, mensaje: string
): Promise<Res> {
  const lista = destinatarios.split(/[,;\n]+/).map((c) => c.trim()).filter(Boolean);
  if (lista.length === 0) return { ok: false, mensaje: 'Indica al menos un correo.' };

  const invalidos = lista.filter((c) => !/^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]{2,}$/.test(c));
  if (invalidos.length > 0) {
    return { ok: false, mensaje: `Correo(s) inválido(s): ${invalidos.join(', ')}` };
  }

  const { generarOrganigrama } = await import('./pdf/generarOrganigrama');
  const pdf = await generarOrganigrama(comiteId);
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
  <p>Adjunto el organigrama del comité con sus integrantes, la parte que
     representa cada uno y su rol.</p>
  <p style="font-size:11px;color:#8A929C;margin-top:24px;border-top:1px solid #E4E4DF;padding-top:12px;">
    Documento de cartelera: está pensado para imprimirse y publicarse.
  </p>
</div>`.trim(),
    adjuntos: [{ filename: pdf.nombreArchivo, content: pdf.buffer }],
    registro: { tipo: 'otro' },
  });

  if (!envio.ok) return { ok: false, mensaje: envio.mensaje };
  return { ok: true, mensaje: `Organigrama enviado a ${lista.length} destinatario(s).` };
}
