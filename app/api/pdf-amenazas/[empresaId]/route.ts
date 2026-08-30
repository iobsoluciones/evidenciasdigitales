/**
 * ANÁLISIS DE AMENAZAS EN PDF — /api/pdf-amenazas/[empresaId]
 */
import { generarAnalisisAmenazas } from '@/lib/pdf/generarAnalisisAmenazas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ empresaId: string }> }
) {
  const { empresaId } = await params;

  const r = await generarAnalisisAmenazas(empresaId);
  if (!r.ok) return new Response(r.error, { status: 404 });

  return new Response(new Uint8Array(r.buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${r.nombreArchivo}"`,
      'Cache-Control': 'no-store',
    },
  });
}
