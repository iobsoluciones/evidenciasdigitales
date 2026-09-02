/**
 * SALUD DE LOS TRABAJADORES EN EXCEL — /api/excel/salud
 * Examenes, ausentismo y horas-hombre. El anio se pasa por consulta.
 */
import { generarExcelSalud } from '@/lib/excel/generarSalud';
import { empresaActiva } from '@/lib/empresa-activa';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TIPO = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export async function GET(peticion: Request) {
  const empresa = await empresaActiva();
  if (!empresa) return new Response('No hay empresa seleccionada.', { status: 400 });

  // El anio manda en ausentismo y en horas-hombre; por omision, el actual.
  const anio = Number(new URL(peticion.url).searchParams.get('anio'))
    || new Date().getFullYear();

  const r = await generarExcelSalud(empresa.id, empresa.nombre, anio);

  if (!r.ok) return new Response(r.error, { status: 404 });

  return new Response(new Uint8Array(r.buffer), {
    headers: {
      'Content-Type': TIPO,
      'Content-Disposition': `attachment; filename="${r.nombreArchivo}"`,
      'Cache-Control': 'no-store',
    },
  });
}
