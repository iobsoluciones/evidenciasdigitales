/**
 * CONTRATISTAS Y ALTO RIESGO EN EXCEL — /api/excel/alto-riesgo
 * Contratistas con sus vencimientos y permisos de trabajo emitidos.
 */
import { generarExcelAltoRiesgo } from '@/lib/excel/generarAltoRiesgo';
import { empresaActiva } from '@/lib/empresa-activa';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TIPO = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export async function GET() {
  const empresa = await empresaActiva();
  if (!empresa) return new Response('No hay empresa seleccionada.', { status: 400 });

  const r = await generarExcelAltoRiesgo(empresa.id, empresa.nombre);

  if (!r.ok) return new Response(r.error, { status: 404 });

  return new Response(new Uint8Array(r.buffer), {
    headers: {
      'Content-Type': TIPO,
      'Content-Disposition': `attachment; filename="${r.nombreArchivo}"`,
      'Cache-Control': 'no-store',
    },
  });
}
