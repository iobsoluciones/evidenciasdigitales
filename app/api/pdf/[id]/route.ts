/**
 * DESCARGA DEL PDF — /api/pdf/[id]
 * ---------------------------------------------------------------
 * runtime = 'nodejs' es obligatorio: @react-pdf/renderer necesita
 * APIs de Node que no existen en el runtime Edge.
 *
 * La autorización la resuelve el generador: usa la sesión del usuario
 * y RLS impide leer capacitaciones de otra organización.
 */
import { generarPdfAsistencia } from '@/lib/pdf/generar';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const r = await generarPdfAsistencia(id);

  if (!r.ok) {
    return new Response(r.error, { status: 404 });
  }

  return new Response(new Uint8Array(r.buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${r.nombreArchivo}"`,
      'Cache-Control': 'no-store',
    },
  });
}
