/**
 * DESCARGA DE EXCEL DE UNA CAPACITACIÓN — /api/excel/[id]
 *
 * runtime = 'nodejs': SheetJS necesita APIs de Node.
 * La autorización la resuelve RLS dentro del generador.
 */
import { excelCapacitacion } from '@/lib/excel';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TIPO = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const r = await excelCapacitacion(id);

  if (!r.ok) return new Response(r.error, { status: 404 });

  return new Response(new Uint8Array(r.buffer), {
    headers: {
      'Content-Type': TIPO,
      'Content-Disposition': `attachment; filename="${r.nombreArchivo}"`,
      'Cache-Control': 'no-store',
    },
  });
}
