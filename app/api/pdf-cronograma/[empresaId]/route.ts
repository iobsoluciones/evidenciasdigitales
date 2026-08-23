/**
 * DESCARGA DEL CRONOGRAMA — /api/pdf-cronograma/[empresaId]
 * empresaId = 'todas' genera el consolidado de la cuenta.
 * Parámetros: ?desde=YYYY-MM-DD&hasta=YYYY-MM-DD
 */
import { generarCronograma } from '@/lib/pdf/generarCronograma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ empresaId: string }> }
) {
  const { empresaId } = await params;
  const url = new URL(request.url);

  const hoy = new Date();
  const desde = url.searchParams.get('desde')
    ?? new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().slice(0, 10);
  const hasta = url.searchParams.get('hasta')
    ?? new Date(hoy.getFullYear(), hoy.getMonth() + 2, 0).toISOString().slice(0, 10);

  const r = await generarCronograma(
    empresaId === 'todas' ? null : empresaId,
    desde,
    hasta
  );

  if (!r.ok) return new Response(r.error, { status: 404 });

  return new Response(new Uint8Array(r.buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${r.nombreArchivo}"`,
      'Cache-Control': 'no-store',
    },
  });
}
