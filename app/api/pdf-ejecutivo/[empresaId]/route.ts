/**
 * DESCARGA DEL REPORTE EJECUTIVO — /api/pdf-ejecutivo/[empresaId]
 * Admite ?meses=6 para acotar el periodo.
 */
import { generarReporteEjecutivo } from '@/lib/pdf/generarEjecutivo';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ empresaId: string }> }
) {
  const { empresaId } = await params;
  const meses = Number(new URL(request.url).searchParams.get('meses')) || 12;

  const r = await generarReporteEjecutivo(empresaId, meses);
  if (!r.ok) return new Response(r.error, { status: 404 });

  return new Response(new Uint8Array(r.buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${r.nombreArchivo}"`,
      'Cache-Control': 'no-store',
    },
  });
}
