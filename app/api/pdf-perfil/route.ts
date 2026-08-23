/**
 * DESCARGA DE LA HOJA DE VIDA — /api/pdf-perfil
 */
import { generarHojaVida } from '@/lib/pdf/generarHojaVida';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const r = await generarHojaVida();
  if (!r.ok) return new Response(r.error, { status: 404 });

  return new Response(new Uint8Array(r.buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${r.nombreArchivo}"`,
      'Cache-Control': 'no-store',
    },
  });
}
