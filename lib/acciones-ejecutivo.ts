'use server';

/**
 * ENVÍO DEL REPORTE EJECUTIVO POR CORREO
 * ---------------------------------------------------------------
 * El destinatario habitual es el contacto de la empresa: gerencia,
 * jefe de planta o el COPASST. Por eso el correo se precarga con el
 * contacto registrado en la ficha.
 */
import { crearClienteServidor } from './supabase/servidor';
import { obtenerPerfil } from './sesion';
import { generarReporteEjecutivo } from './pdf/generarEjecutivo';
import { enviarCorreo } from './correo';

export type Resultado = { ok: boolean; mensaje: string };

function correoValido(c: string): boolean {
  return /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]{2,}$/.test(c.trim());
}

export async function enviarReporteEjecutivo(
  empresaId: string,
  destinatarios: string,
  mensaje: string,
  meses = 12
): Promise<Resultado> {
  const perfil = await obtenerPerfil();
  if (!perfil) return { ok: false, mensaje: 'Sesión no válida.' };

  const lista = destinatarios.split(/[,;\n]+/).map((c) => c.trim()).filter(Boolean);
  if (lista.length === 0) return { ok: false, mensaje: 'Indica al menos un correo.' };

  const invalidos = lista.filter((c) => !correoValido(c));
  if (invalidos.length > 0) {
    return { ok: false, mensaje: `Correo(s) inválido(s): ${invalidos.join(', ')}` };
  }

  const pdf = await generarReporteEjecutivo(empresaId, meses);
  if (!pdf.ok) return { ok: false, mensaje: pdf.error };

  const supabase = await crearClienteServidor();
  const { data: empresa } = await supabase
    .from('empresas')
    .select('color_primario, nomenclatura, version_doc')
    .eq('id', empresaId)
    .maybeSingle();

  const color = empresa?.color_primario ?? '#14263F';

  const extra = mensaje.trim()
    ? `<p style="background:#F7F7F4;border-left:3px solid ${color};padding:10px 14px;color:#374151;margin:16px 0;">
         ${escapar(mensaje).replace(/\n/g, '<br>')}
       </p>`
    : '';

  const html = `
<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#14263F;max-width:560px;">
  <h2 style="color:${color};margin-bottom:4px;">${escapar(pdf.empresa)}</h2>
  <p style="color:#5B6470;margin-top:0;">Reporte ejecutivo de capacitación</p>
  ${extra}
  <p>Adjuntamos el reporte ejecutivo del programa de capacitación
     correspondiente a los últimos ${meses} meses.</p>
  <p>Incluye indicadores de participación, evolución mensual, distribución
     por área y ciudad, y el detalle de cada capacitación realizada.</p>
  <p style="font-size:11px;color:#8A929C;margin-top:24px;border-top:1px solid #E4E4DF;padding-top:12px;">
    ${escapar(empresa?.nomenclatura ?? '')} · ${escapar(empresa?.version_doc ?? '')} ·
    Elaborado por ${escapar(perfil.nombre)}
  </p>
</div>`.trim();

  const envio = await enviarCorreo({
    para: lista.join(','),
    asunto: `Reporte ejecutivo de capacitación — ${pdf.empresa}`,
    registro: { tipo: 'ejecutivo', referenciaId: empresaId, empresaId },
    html,
    adjuntos: [{ filename: pdf.nombreArchivo, content: pdf.buffer }],
  });

  if (!envio.ok) return { ok: false, mensaje: envio.mensaje };

  return { ok: true, mensaje: `Reporte enviado a ${lista.length} destinatario(s).` };
}

function escapar(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
