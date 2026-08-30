/**
 * DESCARGA DEL ACTA DE DEVOLUCIÓN — /api/pdf-devolucion/[id]
 * El id es el del ítem de entrega devuelto: la devolución se registra
 * por ítem, no por acta completa.
 */
import { generarActaDevolucion } from '@/lib/pdf/generarActaDevolucion';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const r = await generarActaDevolucion(id);
  if (!r.ok) return new Response(r.error, { status: 404 });

  return new Response(new Uint8Array(r.buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${r.nombreArchivo}"`,
      'Cache-Control': 'no-store',
    },
  });
}
