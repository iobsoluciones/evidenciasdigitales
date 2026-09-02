/**
 * DESCARGA DE LOS INDICADORES DEL ART. 30 — /api/pdf-indicadores/[empresa]
 * El año va por consulta (?anio=2026); por omisión, el actual.
 */
import { generarInformeIndicadores } from '@/lib/pdf/generarInformeIndicadores';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  peticion: Request,
  { params }: { params: Promise<{ empresa: string }> }
) {
  const { empresa } = await params;
  const anio = Number(new URL(peticion.url).searchParams.get('anio'))
    || new Date().getFullYear();

  const r = await generarInformeIndicadores(empresa, anio);
  if (!r.ok) return new Response(r.error, { status: 404 });

  return new Response(new Uint8Array(r.buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${r.nombreArchivo}"`,
      'Cache-Control': 'no-store',
    },
  });
}
