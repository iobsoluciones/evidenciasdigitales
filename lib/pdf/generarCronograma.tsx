/**
 * GENERADOR DEL CRONOGRAMA
 * Reutiliza la función calendario() de la base: la misma fuente que
 * alimenta la pantalla, así que el PDF nunca discrepa de lo que se ve.
 */
import { renderToBuffer } from '@react-pdf/renderer';
import { crearClienteServidor } from '../supabase/servidor';
import { obtenerPerfil } from '../sesion';
import { Cronograma, type DatosCronograma, type CampoEncabezado } from './Cronograma';
import type { EncabezadoConfig } from './EncabezadoDoc';
import { resolverNomenclatura, leerMapa } from '../nomenclaturas';

export type ResultadoCronograma =
  | { ok: true; buffer: Buffer; nombreArchivo: string; empresa: string }
  | { ok: false; error: string };

async function descargarUrl(url: string): Promise<Buffer | null> {
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    return Buffer.from(await r.arrayBuffer());
  } catch { return null; }
}

export async function generarCronograma(
  empresaId: string | null,
  desde: string,
  hasta: string
): Promise<ResultadoCronograma> {
  const perfil = await obtenerPerfil();
  if (!perfil) return { ok: false, error: 'Sesión no válida.' };

  const supabase = await crearClienteServidor();
  const todasLasEmpresas = !empresaId;

  let empresa: Record<string, unknown> | null = null;
  if (empresaId) {
    const { data } = await supabase
      .from('empresas').select('*').eq('id', empresaId).maybeSingle();
    if (!data) return { ok: false, error: 'Empresa no encontrada.' };
    empresa = data;
  }

  const { data: eventos } = await supabase.rpc('calendario', {
    p_desde: desde,
    p_hasta: hasta,
    p_empresa: empresaId,
  });

  const lista = (eventos ?? []) as Array<Record<string, unknown>>;

  const filas = lista.map((r) => ({
    fecha: new Date(String(r.fecha) + 'T12:00:00').toLocaleDateString('es-CO', {
      day: '2-digit', month: '2-digit', year: '2-digit',
    }),
    hora: (r.hora as string | null)?.slice(0, 5) ?? null,
    titulo: String(r.titulo),
    tipo: String(r.tipo ?? 'otro'),
    origen: (r.es_capacitacion ? 'capacitacion' : 'agenda') as 'capacitacion' | 'agenda',
    codigo: (r.codigo as string | null) ?? null,
    estado: (r.estado as string | null) ?? null,
    empresa: String(r.empresa ?? ''),
    detalle: (r.notas as string | null) ?? null,
  }));

  const logo = empresa?.logo_url
    ? await descargarUrl(String(empresa.logo_url))
    : null;

  const fmt = (iso: string) =>
    new Date(iso + 'T12:00:00').toLocaleDateString('es-CO', { dateStyle: 'medium' });
  const nomRep = todasLasEmpresas
    ? { nomenclatura: '—', version: 'V1' }
    : resolverNomenclatura(null, leerMapa(empresa!.nomenclaturas), 'reporte', false, {
        nomenclatura: String(empresa!.nomenclatura ?? ''),
        version: String(empresa!.version_doc ?? 'V1'),
      });


  const datos: DatosCronograma = {
    empresa: todasLasEmpresas
      ? `${perfil.organizacion.nombre} · todas las empresas`
      : String(empresa!.nombre),
    // Es un reporte, no un acta: lleva la nomenclatura del tipo 'reporte'.
    nomenclatura: todasLasEmpresas ? '—' : nomRep.nomenclatura || '—',
    versionDoc: todasLasEmpresas ? 'V1' : nomRep.version,
    colorPrimario: todasLasEmpresas ? '#14263F' : String(empresa!.color_primario ?? '#14263F'),
    logo,
    camposExtra: todasLasEmpresas
      ? []
      : ((empresa!.campos_encabezado ?? []) as CampoEncabezado[]),
    // Vigente, no congelado: el cronograma se regenera cada vez y no
    // es una evidencia firmada. Con varias empresas no hay un diseño
    // unico posible, asi que se usa el estandar.
    encabezadoConfig: todasLasEmpresas
      ? null
      : ((empresa!.encabezado_config ?? null) as EncabezadoConfig | null),

    periodo: `${fmt(desde)} — ${fmt(hasta)}`,
    elaboradoPor: perfil.nombre,
    todasLasEmpresas,

    programadas: filas.filter((f) => f.origen === 'agenda').length,
    realizadas: filas.filter((f) => f.origen === 'capacitacion').length,

    filas,
    generadoEl: new Date().toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' }),
  };

  const buffer = await renderToBuffer(<Cronograma d={datos} />);
  const limpio = datos.empresa.replace(/[^a-zA-Z0-9 _-]/g, '').trim().replace(/\s+/g, '_');
  const fecha = new Date().toISOString().slice(0, 10).replace(/-/g, '');

  return {
    ok: true,
    buffer,
    nombreArchivo: `Cronograma_${limpio || 'Capacitaciones'}_${fecha}.pdf`,
    empresa: datos.empresa,
  };
}
