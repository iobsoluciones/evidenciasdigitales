/**
 * ENVÍO DE CORREO — Resend
 * ---------------------------------------------------------------
 * Actualizado en Fase 4: admite archivos adjuntos (el reporte PDF).
 *
 * La clave vive solo en el servidor (RESEND_API_KEY, sin el prefijo
 * NEXT_PUBLIC_), así que nunca llega al navegador.
 */
import { Resend } from 'resend';
import { crearClienteServidor } from './supabase/servidor';
import { obtenerPerfil } from './sesion';

/** [MODIFICAR AQUI] Remitente. Debe ser de un dominio verificado en Resend. */
export const REMITENTE = process.env.RESEND_FROM ?? 'onboarding@resend.dev';

/**
 * onboarding@resend.dev es el remitente de PRUEBAS de Resend: la API
 * acepta el envío pero solo entrega al correo del dueño de la cuenta.
 * Cualquier otro destinatario se rechaza con 403.
 *
 * Sin dominio propio no hay forma de salir de este modo, así que lo que
 * toca es decirlo claro en pantalla en vez de dejar que el usuario
 * espere un mensaje que nunca va a llegar.
 */
export const EN_MODO_PRUEBA = REMITENTE.includes('onboarding@resend.dev');

export type ResultadoCorreo = { ok: boolean; mensaje: string };

export type Adjunto = { filename: string; content: Buffer };

/**
 * Metadatos para la bitácora. El correo sale del dominio del sistema,
 * no de la cuenta del consultor: sin registro propio no hay forma de
 * demostrar que un acta se envió.
 */
export type RegistroEnvio = {
  tipo: 'acta' | 'informe_evaluacion' | 'ejecutivo' | 'cronograma' | 'firma' | 'otro';
  referenciaId?: string | null;
  empresaId?: string | null;
};

export async function enviarCorreo(opciones: {
  para: string;
  asunto: string;
  html: string;
  adjuntos?: Adjunto[];
  registro?: RegistroEnvio;
  copiaAlUsuario?: boolean;
}): Promise<ResultadoCorreo> {
  const clave = process.env.RESEND_API_KEY;

  if (!clave) {
    return { ok: false, mensaje: 'Falta configurar RESEND_API_KEY en .env.local' };
  }

  const perfil = await obtenerPerfil();

  try {
    const resend = new Resend(clave);

    const { data, error } = await resend.emails.send({
      from: REMITENTE,
      to: opciones.para.split(',').map((c) => c.trim()),
      // Copia al consultor solo si la pidió: con 15 empresas y envíos
      // diarios, una bandeja llena de copias deja de servir de soporte.
      bcc: opciones.copiaAlUsuario && perfil?.correo ? [perfil.correo] : undefined,
      subject: opciones.asunto,
      html: opciones.html,
      attachments: opciones.adjuntos?.map((a) => ({
        filename: a.filename,
        content: a.content,
      })),
    });

    if (opciones.registro && perfil) {
      await registrarEnvio(perfil, opciones, error ? null : data?.id, error?.message);
    }

    if (error) {
      // El rechazo tipico del modo de pruebas no dice que hacer.
      const esRechazoPrueba =
        EN_MODO_PRUEBA && /own email address|verify a domain|testing emails/i.test(error.message);

      return {
        ok: false,
        mensaje: esRechazoPrueba
          ? `Resend está en modo de pruebas (remitente ${REMITENTE}) y solo entrega al correo ` +
            'dueño de la cuenta. Para escribir a otros destinatarios hay que verificar un ' +
            'dominio propio en Resend y poner RESEND_FROM con ese dominio.'
          : error.message,
      };
    }
    return { ok: true, mensaje: 'Correo enviado correctamente.' };
  } catch (e) {
    const mensaje = e instanceof Error ? e.message : 'Error desconocido al enviar.';
    if (opciones.registro && perfil) {
      await registrarEnvio(perfil, opciones, null, mensaje);
    }
    return { ok: false, mensaje };
  }
}

/**
 * Escribe la bitácora. Un fallo aquí NO debe impedir el envío: es
 * peor perder el correo que perder su registro.
 */
async function registrarEnvio(
  perfil: { id: string; organizacion: { id: string } },
  opciones: { para: string; asunto: string; registro?: RegistroEnvio },
  proveedorId: string | null | undefined,
  error?: string
): Promise<void> {
  try {
    const supabase = await crearClienteServidor();
    await supabase.from('envios').insert({
      org_id: perfil.organizacion.id,
      empresa_id: opciones.registro?.empresaId ?? null,
      tipo: opciones.registro?.tipo ?? 'otro',
      referencia_id: opciones.registro?.referenciaId ?? null,
      destinatarios: opciones.para,
      asunto: opciones.asunto,
      enviado_por: perfil.id,
      estado: error ? 'error' : 'enviado',
      error: error ?? null,
      proveedor_id: proveedorId ?? null,
    });
  } catch {
    // Silencioso a propósito: el correo ya salió.
  }
}

/**
 * Plantilla del correo de solicitud de firma.
 * HTML con estilos en línea: los clientes de correo ignoran las hojas
 * de estilo externas.
 */
export function plantillaFirma(datos: {
  organizacion: string;
  instructor: string;
  tema: string;
  codigo: string;
  fecha: string;
  url: string;
  mensaje?: string;
  color: string;
}): string {
  const extra = datos.mensaje?.trim()
    ? `<p style="background:#f8fafc;border-left:3px solid ${datos.color};padding:10px 14px;color:#374151;margin:16px 0;">
         ${escapar(datos.mensaje).replace(/\n/g, '<br>')}
       </p>`
    : '';

  return `
<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1f2937;max-width:560px;">
  <h2 style="color:${datos.color};margin-bottom:4px;">${escapar(datos.organizacion)}</h2>
  <p style="color:#6b7280;margin-top:0;">Solicitud de firma del capacitador</p>

  ${extra}

  <p>Hola ${escapar(datos.instructor)},</p>

  <p>Para completar el acta de asistencia de la capacitación
     <strong>${escapar(datos.tema)}</strong> (${escapar(datos.codigo)}),
     realizada el ${escapar(datos.fecha)}, por favor registra tu firma
     en el siguiente enlace:</p>

  <p style="margin:26px 0;">
    <a href="${datos.url}"
       style="background:${datos.color};color:#ffffff;padding:13px 24px;
              border-radius:8px;text-decoration:none;font-weight:bold;
              display:inline-block;">
      Registrar mi firma
    </a>
  </p>

  <p style="font-size:12px;color:#6b7280;">
    Si el botón no funciona, copia y pega este enlace en tu navegador:<br>
    <span style="word-break:break-all;color:#3b82f6;">${datos.url}</span>
  </p>

  <p style="font-size:11px;color:#9ca3af;margin-top:26px;border-top:1px solid #e5e7eb;padding-top:14px;">
    Este enlace es personal: no lo compartas. Si se genera uno nuevo,
    este dejará de funcionar.
  </p>
</div>`.trim();
}

function escapar(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
