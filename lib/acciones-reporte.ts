'use server';

/**
 * ENVÍO DEL REPORTE PDF POR CORREO
 * ---------------------------------------------------------------
 * Genera el PDF en memoria y lo adjunta. El archivo nunca se guarda
 * en disco ni en Storage: se produce bajo demanda, lo que además
 * mantiene el costo de almacenamiento en cero.
 */
import { obtenerPerfil } from './sesion';
import { generarPdfAsistencia } from './pdf/generar';
import { enviarCorreo } from './correo';

export type Resultado = { ok: boolean; mensaje: string };

function correoValido(c: string): boolean {
  return /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]{2,}$/.test(c.trim());
}

export async function enviarReportePorCorreo(
  capacitacionId: string,
  destinatarios: string,
  mensaje: string
): Promise<Resultado> {
  const perfil = await obtenerPerfil();
  if (!perfil) return { ok: false, mensaje: 'Sesión no válida.' };

  // Admite varios correos separados por coma, punto y coma o salto de línea
  const lista = destinatarios
    .split(/[,;\n]+/)
    .map((c) => c.trim())
    .filter(Boolean);

  if (lista.length === 0) {
    return { ok: false, mensaje: 'Indica al menos un correo destinatario.' };
  }

  const invalidos = lista.filter((c) => !correoValido(c));
  if (invalidos.length > 0) {
    return { ok: false, mensaje: `Correo(s) con formato inválido: ${invalidos.join(', ')}` };
  }

  const pdf = await generarPdfAsistencia(capacitacionId);
  if (!pdf.ok) return { ok: false, mensaje: pdf.error };

  const color = perfil.organizacion.color_primario;

  const extra = mensaje.trim()
    ? `<p style="background:#f8fafc;border-left:3px solid ${color};padding:10px 14px;color:#374151;margin:16px 0;">
         ${escapar(mensaje).replace(/\n/g, '<br>')}
       </p>`
    : '';

  const html = `
<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1f2937;max-width:560px;">
  <h2 style="color:${color};margin-bottom:4px;">${escapar(perfil.organizacion.nombre)}</h2>
  <p style="color:#6b7280;margin-top:0;">Reporte de Asistencia a Capacitación</p>
  ${extra}
  <table style="border-collapse:collapse;font-size:13px;margin-top:10px;">
    <tr><td style="padding:3px 12px 3px 0;color:#6b7280;">Código:</td>
        <td>${escapar(pdf.codigo)}</td></tr>
    <tr><td style="padding:3px 12px 3px 0;color:#6b7280;">Tema:</td>
        <td><strong>${escapar(pdf.tema)}</strong></td></tr>
  </table>
  <p style="margin-top:18px;">Se adjunta el reporte en formato PDF con el listado
     de asistentes y sus firmas.</p>
  <p style="font-size:11px;color:#9ca3af;margin-top:24px;border-top:1px solid #e5e7eb;padding-top:12px;">
    ${escapar(perfil.organizacion.nomenclatura ?? '')} ·
    ${escapar(perfil.organizacion.version_doc)} ·
    Generado automáticamente.
  </p>
</div>`.trim();

  const envio = await enviarCorreo({
    para: lista.join(','),
    asunto: `Reporte de asistencia — ${pdf.tema}`,
    registro: { tipo: 'acta', referenciaId: capacitacionId, empresaId: null },
    html,
    adjuntos: [{ filename: pdf.nombreArchivo, content: pdf.buffer }],
  });

  if (!envio.ok) return { ok: false, mensaje: envio.mensaje };

  return {
    ok: true,
    mensaje: `Reporte enviado a ${lista.length} destinatario(s).`,
  };
}

function escapar(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
