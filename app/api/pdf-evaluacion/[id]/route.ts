/**
 * DESCARGA DEL INFORME DE EVALUACIÓN — /api/pdf-evaluacion/[id]
 * runtime nodejs: @react-pdf necesita APIs de Node.
 */
import { generarInformeEvaluacion } from '@/lib/pdf/generarInforme';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const r = await generarInformeEvaluacion(id);

  if (!r.ok) return new Response(r.error, { status: 404 });

  return new Response(new Uint8Array(r.buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${r.nombreArchivo}"`,
      'Cache-Control': 'no-store',
    },
  });
}
