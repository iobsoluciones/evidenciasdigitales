/**
 * RECORDATORIO DIARIO DE PENDIENTES — /api/cron/recordatorios
 * ---------------------------------------------------------------
 * Lo dispara el cron de Vercel, no una persona, así que no hay sesión:
 * usa la clave de servicio y se protege con CRON_SECRET.
 *
 * Manda UN correo por consultor con lo crítico y lo alto de todas sus
 * empresas. No manda nada cuando no hay pendientes: un recordatorio que
 * llega todos los días diga lo que diga se deja de leer en una semana, y
 * entonces deja de servir justo el día que trae algo urgente.
 *
 * OJO — mientras Resend siga con el remitente de pruebas
 * (onboarding@resend.dev), esto solo llega al correo dueño de la cuenta.
 * Para escribirle a jefes de área o responsables hay que verificar un
 * dominio propio.
 */
import { crearClienteAdmin, hayClaveServicio, FALTA_CLAVE_SERVICIO } from '@/lib/supabase/admin';
import { enviarCorreo, EN_MODO_PRUEBA, REMITENTE } from '@/lib/correo';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type Item = { titulo: string; detalle: string; severidad: string };
type Empresa = { nombre: string; criticos: number; altos: number; items: Item[] };
type Destino = {
  org_id: string; org_nombre: string; correo: string | null; empresas: Empresa[];
};

const esc = (v: unknown) =>
  String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function armarHtml(d: Destino, urlBase: string): string {
  const bloques = d.empresas
    .filter((e) => e.items.length > 0)
    .map((e) => `
  <table style="width:100%;border-collapse:collapse;margin:0 0 18px;">
    <tr>
      <td style="padding:8px 12px;background:#14263F;color:#fff;font-weight:600;font-size:13px;">
        ${esc(e.nombre)}
      </td>
    </tr>
    ${e.items.map((i) => `
    <tr>
      <td style="padding:9px 12px;border-bottom:1px solid #E4E4DF;font-size:13px;">
        <span style="display:inline-block;font-size:10px;font-weight:700;padding:2px 7px;
                     border-radius:4px;margin-right:7px;
                     background:${i.severidad === 'critico' ? '#FDF2F2' : '#FEF3C7'};
                     color:${i.severidad === 'critico' ? '#9B1C1C' : '#92400E'};">
          ${i.severidad === 'critico' ? 'CRÍTICO' : 'ALTO'}
        </span>
        <strong>${esc(i.titulo)}</strong><br>
        <span style="color:#5B6470;font-size:12px;">${esc(i.detalle)}</span>
      </td>
    </tr>`).join('')}
  </table>`)
    .join('');

  const totalCriticos = d.empresas.reduce((n, e) => n + e.criticos, 0);
  const totalAltos = d.empresas.reduce((n, e) => n + e.altos, 0);

  return `
<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#14263F;max-width:600px;">
  <h2 style="margin:0 0 4px;">Pendientes del SG-SST</h2>
  <p style="color:#5B6470;margin:0 0 18px;">
    ${esc(d.org_nombre)} · ${totalCriticos} crítico(s) y ${totalAltos} alto(s)
    en ${d.empresas.filter((e) => e.items.length > 0).length} empresa(s).
  </p>

  ${bloques}

  <p style="margin:22px 0;">
    <a href="${urlBase}/panel"
       style="background:#14263F;color:#fff;padding:12px 26px;border-radius:8px;
              text-decoration:none;font-weight:600;display:inline-block;">
      Abrir la bandeja
    </a>
  </p>

  <p style="font-size:11px;color:#8A929C;border-top:1px solid #E4E4DF;padding-top:12px;">
    Solo se envía cuando hay pendientes críticos o altos. Si no llega nada, no hay nada
    urgente. Puedes desactivarlo desde tu organización.
  </p>
</div>`.trim();
}

export async function GET(request: Request) {
  // El cron de Vercel manda `Authorization: Bearer <CRON_SECRET>`.
  const secreto = process.env.CRON_SECRET;
  if (!secreto) {
    return Response.json(
      { ok: false, error: 'Falta CRON_SECRET en las variables de entorno.' },
      { status: 500 }
    );
  }
  if (request.headers.get('authorization') !== `Bearer ${secreto}`) {
    return Response.json({ ok: false, error: 'No autorizado.' }, { status: 401 });
  }

  if (!hayClaveServicio()) {
    return Response.json({ ok: false, error: FALTA_CLAVE_SERVICIO }, { status: 500 });
  }

  const supabase = crearClienteAdmin();
  const { data, error } = await supabase.rpc('resumen_recordatorios');
  if (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }

  const base = process.env.NEXT_PUBLIC_APP_URL
    ?? new URL(request.url).origin;

  const destinos = (data ?? []) as Destino[];
  const resultado: Array<{ org: string; correo: string | null; estado: string }> = [];

  for (const d of destinos) {
    const conPendientes = d.empresas.filter((e) => e.items.length > 0);

    if (conPendientes.length === 0) {
      resultado.push({ org: d.org_nombre, correo: d.correo, estado: 'sin pendientes' });
      continue;
    }
    if (!d.correo) {
      resultado.push({ org: d.org_nombre, correo: null, estado: 'sin correo' });
      continue;
    }

    const criticos = d.empresas.reduce((n, e) => n + e.criticos, 0);
    const envio = await enviarCorreo({
      para: d.correo,
      asunto: criticos > 0
        ? `${criticos} pendiente(s) crítico(s) en tu SG-SST`
        : 'Pendientes del SG-SST',
      html: armarHtml(d, base),
    });

    resultado.push({
      org: d.org_nombre,
      correo: d.correo,
      estado: envio.ok ? 'enviado' : `error: ${envio.mensaje}`,
    });
  }

  return Response.json({
    ok: true,
    modoPrueba: EN_MODO_PRUEBA,
    remitente: REMITENTE,
    nota: EN_MODO_PRUEBA
      ? 'Resend está en modo de pruebas: solo entrega al correo dueño de la cuenta.'
      : undefined,
    resultado,
  });
}
