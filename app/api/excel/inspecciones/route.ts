/**
 * DESCARGA DE INSPECCIONES EN EXCEL — /api/excel/inspecciones
 * Tres hojas: Inspecciones, Hallazgos y Plan de acción.
 */
import { generarExcelInspecciones } from '@/lib/excel/generarInspecciones';
import { empresaActiva } from '@/lib/empresa-activa';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TIPO = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export async function GET() {
  const empresa = await empresaActiva();
  if (!empresa) return new Response('No hay empresa seleccionada.', { status: 400 });

  const r = await generarExcelInspecciones(empresa.id, empresa.nombre);
  if (!r.ok) return new Response(r.error, { status: 404 });

  return new Response(new Uint8Array(r.buffer), {
    headers: {
      'Content-Type': TIPO,
      'Content-Disposition': `attachment; filename="${r.nombreArchivo}"`,
      'Cache-Control': 'no-store',
    },
  });
}
