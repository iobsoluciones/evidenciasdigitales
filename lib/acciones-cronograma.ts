'use server';

/**
 * ENVÍO DEL CRONOGRAMA POR CORREO
 */
import { obtenerPerfil } from './sesion';
import { generarCronograma } from './pdf/generarCronograma';
import { enviarCorreo } from './correo';

export type Resultado = { ok: boolean; mensaje: string };

function correoValido(c: string): boolean {
  return /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]{2,}$/.test(c.trim());
}

export async function enviarCronograma(
  empresaId: string | null,
  desde: string,
  hasta: string,
  destinatarios: string,
  mensaje: string
): Promise<Resultado> {
  const perfil = await obtenerPerfil();
  if (!perfil) return { ok: false, mensaje: 'Sesión no válida.' };

  const lista = destinatarios.split(/[,;\n]+/).map((c) => c.trim()).filter(Boolean);
  if (lista.length === 0) return { ok: false, mensaje: 'Indica al menos un correo.' };

  const invalidos = lista.filter((c) => !correoValido(c));
  if (invalidos.length > 0) {
    return { ok: false, mensaje: `Correo(s) inválido(s): ${invalidos.join(', ')}` };
  }

  const pdf = await generarCronograma(empresaId, desde, hasta);
  if (!pdf.ok) return { ok: false, mensaje: pdf.error };

  const extra = mensaje.trim()
    ? `<p style="background:#F7F7F4;border-left:3px solid #14263F;padding:10px 14px;color:#374151;margin:16px 0;">
         ${escapar(mensaje).replace(/\n/g, '<br>')}
       </p>` : '';

  const html = `
<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#14263F;max-width:560px;">
  <h2 style="color:#14263F;margin-bottom:4px;">${escapar(pdf.empresa)}</h2>
  <p style="color:#5B6470;margin-top:0;">Cronograma de capacitaciones</p>
  ${extra}
  <p>Adjuntamos el cronograma con las capacitaciones programadas y realizadas
     en el periodo.</p>
  <p style="font-size:11px;color:#8A929C;margin-top:24px;border-top:1px solid #E4E4DF;padding-top:12px;">
    Elaborado por ${escapar(perfil.nombre)}
  </p>
</div>`.trim();

  const envio = await enviarCorreo({
    para: lista.join(','),
    asunto: `Cronograma de capacitaciones — ${pdf.empresa}`,
    registro: { tipo: 'cronograma', referenciaId: empresaId, empresaId },
    html,
    adjuntos: [{ filename: pdf.nombreArchivo, content: pdf.buffer }],
  });

  if (!envio.ok) return { ok: false, mensaje: envio.mensaje };
  return { ok: true, mensaje: `Cronograma enviado a ${lista.length} destinatario(s).` };
}

function escapar(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
