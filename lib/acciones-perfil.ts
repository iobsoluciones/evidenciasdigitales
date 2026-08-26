'use server';

/**
 * PERFIL PROFESIONAL DEL CAPACITADOR
 * ---------------------------------------------------------------
 * Uno por cuenta: es la ficha del consultor, la misma para todas las
 * empresas que atiende. Se envía a clientes como soporte de idoneidad,
 * que es un documento que hoy se arma a mano cada vez.
 *
 * La trayectoria NO se escribe: se calcula del propio sistema. Decir
 * "he capacitado a 340 personas en 18 sesiones" respaldado por actas
 * firmadas pesa distinto que ponerlo en una hoja de vida.
 */
import { revalidatePath } from 'next/cache';
import { crearClienteServidor } from './supabase/servidor';
import { obtenerPerfil } from './sesion';

export type ItemFormacion = { titulo: string; institucion: string; anio: string };
export type ItemExperiencia = {
  cargo: string;
  empresa: string;
  periodo: string;
  detalle: string;
  /** Resultados concretos, uno por línea. Es lo que diferencia un CV
   *  que enumera cargos de uno que demuestra qué logró en ellos. */
  logros: string;
};
export type ItemCertificacion = { nombre: string; entidad: string; vigencia: string };

export type PerfilProfesional = {
  org_id: string;
  nombre: string;
  titulo: string | null;
  profesion: string | null;
  tarjeta_profesional: string | null;
  licencia_sst: string | null;
  vigencia_licencia: string | null;
  correo: string | null;
  telefono: string | null;
  ciudad: string | null;
  resumen: string | null;
  foto_url: string | null;
  firma_url: string | null;
  formacion: ItemFormacion[];
  experiencia: ItemExperiencia[];
  certificaciones: ItemCertificacion[];
};

export type Trayectoria = {
  empresas: number;
  capacitaciones: number;
  personas: number;
  asistencias: number;
  horas: number;
  /** Promedio de los puntajes de evaluación; null si aún no hay ninguna. */
  promedio: number | null;
  desde: string | null;
  temas: string[];
};

export type Resultado = { ok: boolean; mensaje: string };

export async function obtenerPerfilProfesional(): Promise<PerfilProfesional | null> {
  const supabase = await crearClienteServidor();
  const { data } = await supabase.from('perfil_profesional').select('*').maybeSingle();
  return (data ?? null) as PerfilProfesional | null;
}

/** Cifras calculadas del sistema: no son declarativas, son demostrables. */
export async function obtenerTrayectoria(): Promise<Trayectoria | null> {
  const supabase = await crearClienteServidor();
  const { data } = await supabase.rpc('trayectoria_profesional');
  return (data ?? null) as Trayectoria | null;
}

export async function guardarPerfilProfesional(datos: {
  nombre: string;
  titulo: string;
  profesion: string;
  tarjeta_profesional: string;
  licencia_sst: string;
  vigencia_licencia: string;
  correo: string;
  telefono: string;
  ciudad: string;
  resumen: string;
  formacion: ItemFormacion[];
  experiencia: ItemExperiencia[];
  certificaciones: ItemCertificacion[];
}): Promise<Resultado> {
  const perfil = await obtenerPerfil();
  if (!perfil) return { ok: false, mensaje: 'Sesión no válida.' };
  if (!datos.nombre.trim()) return { ok: false, mensaje: 'El nombre es obligatorio.' };

  const supabase = await crearClienteServidor();
  const { error } = await supabase.from('perfil_profesional').upsert(
    {
      org_id: perfil.organizacion.id,
      nombre: datos.nombre.toUpperCase(),
      titulo: datos.titulo || null,
      profesion: datos.profesion || null,
      tarjeta_profesional: datos.tarjeta_profesional || null,
      licencia_sst: datos.licencia_sst || null,
      vigencia_licencia: datos.vigencia_licencia || null,
      correo: datos.correo || null,
      telefono: datos.telefono || null,
      ciudad: datos.ciudad || null,
      resumen: datos.resumen || null,
      formacion: datos.formacion.filter((x) => x.titulo.trim()),
      experiencia: datos.experiencia.filter((x) => x.cargo.trim()),
      certificaciones: datos.certificaciones.filter((x) => x.nombre.trim()),
      actualizado_en: new Date().toISOString(),
    },
    { onConflict: 'org_id' }
  );

  if (error) return { ok: false, mensaje: error.message };

  revalidatePath('/panel/perfil');
  return { ok: true, mensaje: 'Perfil guardado.' };
}

export async function guardarFotoPerfil(url: string | null): Promise<Resultado> {
  const perfil = await obtenerPerfil();
  if (!perfil) return { ok: false, mensaje: 'Sesión no válida.' };

  const supabase = await crearClienteServidor();
  const { error } = await supabase
    .from('perfil_profesional')
    .update({ foto_url: url })
    .eq('org_id', perfil.organizacion.id);

  if (error) return { ok: false, mensaje: error.message };

  revalidatePath('/panel/perfil');
  return { ok: true, mensaje: url ? 'Foto actualizada.' : 'Foto eliminada.' };
}

/**
 * Envía la hoja de vida por correo.
 * Uso típico: un cliente potencial pide soporte de idoneidad antes de
 * contratar. Hoy eso se resuelve buscando un PDF viejo en el escritorio.
 */
export async function enviarHojaVida(
  destinatarios: string,
  mensaje: string
): Promise<Resultado> {
  const { generarHojaVida } = await import('./pdf/generarHojaVida');
  const { enviarCorreo } = await import('./correo');

  const lista = destinatarios.split(/[,;\n]+/).map((c) => c.trim()).filter(Boolean);
  if (lista.length === 0) return { ok: false, mensaje: 'Indica al menos un correo.' };

  const invalidos = lista.filter(
    (c) => !/^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]{2,}$/.test(c)
  );
  if (invalidos.length > 0) {
    return { ok: false, mensaje: `Correo(s) inválido(s): ${invalidos.join(', ')}` };
  }

  const pdf = await generarHojaVida();
  if (!pdf.ok) return { ok: false, mensaje: pdf.error };

  const extra = mensaje.trim()
    ? `<p style="background:#F7F7F4;border-left:3px solid #14263F;padding:10px 14px;color:#374151;margin:16px 0;">
         ${mensaje.replace(/</g, '&lt;').replace(/\n/g, '<br>')}
       </p>` : '';

  const envio = await enviarCorreo({
    para: lista.join(','),
    asunto: `Hoja de vida profesional — ${pdf.nombre}`,
    html: `
<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#14263F;max-width:560px;">
  <h2 style="margin-bottom:4px;">${pdf.nombre}</h2>
  <p style="color:#5B6470;margin-top:0;">Hoja de vida profesional</p>
  ${extra}
  <p>Adjunto encontrará mi hoja de vida con formación, experiencia,
     credenciales vigentes y trayectoria en capacitación.</p>
  <p style="font-size:11px;color:#8A929C;margin-top:24px;border-top:1px solid #E4E4DF;padding-top:12px;">
    Las cifras de trayectoria están respaldadas por actas de asistencia
    con firma digital, disponibles para verificación.
  </p>
</div>`.trim(),
    adjuntos: [{ filename: pdf.nombreArchivo, content: pdf.buffer }],
    registro: { tipo: 'otro' },
  });

  if (!envio.ok) return { ok: false, mensaje: envio.mensaje };
  return { ok: true, mensaje: `Hoja de vida enviada a ${lista.length} destinatario(s).` };
}


/**
 * Guarda la firma del profesional tras subirla al bucket.
 * Se guarda UNA vez y se reutiliza: distinta de la firma del
 * instructor, porque el consultor puede avalar como responsable
 * técnico un acta que dictó otra persona.
 */
export async function guardarFirmaProfesional(url: string | null): Promise<Resultado> {
  const perfil = await obtenerPerfil();
  if (!perfil) return { ok: false, mensaje: 'Sesión no válida.' };

  const supabase = await crearClienteServidor();
  const { error } = await supabase
    .from('perfil_profesional')
    .update({ firma_url: url })
    .eq('org_id', perfil.organizacion.id);

  if (error) return { ok: false, mensaje: error.message };

  revalidatePath('/panel/perfil');
  return {
    ok: true,
    mensaje: url ? 'Firma guardada.' : 'Firma eliminada.',
  };
}
