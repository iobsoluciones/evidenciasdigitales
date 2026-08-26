/**
 * GENERADOR DEL PDF
 * ---------------------------------------------------------------
 * Reúne los datos, descarga las imágenes y produce el archivo.
 *
 * Sobre las imágenes: se descargan como Buffer en el servidor en vez
 * de pasar URLs. El bucket de firmas es privado, así que una URL
 * pública no funcionaría, y las firmadas caducan. Con Buffer el PDF
 * queda autocontenido.
 *
 * Una firma que falle no rompe el reporte: esa celda queda vacía.
 */
import { renderToBuffer } from '@react-pdf/renderer';
import { crearClienteServidor } from '../supabase/servidor';
import { obtenerPerfil } from '../sesion';
import { DocumentoAsistencia, type DatosPdf } from './DocumentoAsistencia';
import type { EncabezadoConfig } from './EncabezadoDoc';

export type ResultadoPdf =
  | { ok: true; buffer: Buffer; nombreArchivo: string; tema: string; codigo: string }
  | { ok: false; error: string };

/** Descarga un archivo de Storage como Buffer. Devuelve null si falla. */
async function descargarDeStorage(
  supabase: Awaited<ReturnType<typeof crearClienteServidor>>,
  bucket: string,
  ruta: string
): Promise<Buffer | null> {
  try {
    const { data, error } = await supabase.storage.from(bucket).download(ruta);
    if (error || !data) return null;
    return Buffer.from(await data.arrayBuffer());
  } catch {
    return null;
  }
}

/** Descarga una imagen desde una URL pública (el logo). */
async function descargarDeUrl(url: string): Promise<Buffer | null> {
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    return Buffer.from(await r.arrayBuffer());
  } catch {
    return null;
  }
}

export async function generarPdfAsistencia(
  capacitacionId: string
): Promise<ResultadoPdf> {
  const perfil = await obtenerPerfil();
  if (!perfil) return { ok: false, error: 'Sesión no válida.' };

  const supabase = await crearClienteServidor();

  // RLS impide leer capacitaciones de otra organización
  const { data: cap } = await supabase
    .from('v_capacitaciones_resumen')
    .select('*')
    .eq('id', capacitacionId)
    .maybeSingle();

  if (!cap) return { ok: false, error: 'Capacitación no encontrada.' };

  const { data: participantes } = await supabase
    .from('participantes')
    .select('nombres, cargo, area, ciudad, identificacion, firma_url')
    .eq('capacitacion_id', capacitacionId)
    .order('created_at', { ascending: true });

  const lista = participantes ?? [];

  // El logo es de la EMPRESA, no de la cuenta del consultor: el acta
  // pertenece al sistema de gestión de ese cliente.
  const { data: empresa } = await supabase
    .from('empresas')
    .select('logo_url, nombre')
    .eq('id', cap.empresa_id)
    .maybeSingle();

  // Descarga de imágenes en paralelo: mucho más rápido que en serie
  const [logo, firmaInstructor, firmaProfesional, ...firmas] = await Promise.all([
    empresa?.logo_url
      ? descargarDeUrl(empresa.logo_url)
      : Promise.resolve(null),
    cap.firma_instructor_url
      ? descargarDeStorage(supabase, 'firmas', cap.firma_instructor_url)
      : Promise.resolve(null),
    // Firma congelada del consultor, si pidió anexarla
    cap.firma_prof_url
      ? descargarDeStorage(supabase, 'firmas', cap.firma_prof_url)
      : Promise.resolve(null),
    ...lista.map((p) =>
      p.firma_url
        ? descargarDeStorage(supabase, 'firmas', p.firma_url)
        : Promise.resolve(null)
    ),
  ]);

  const fmt = (iso: string) =>
    new Date(iso).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' });

  const datos: DatosPdf = {
    organizacion: perfil.organizacion.nombre,
    // CONTROL DOCUMENTAL CONGELADO: se usa el que quedó guardado en la
    // capacitación al crearla, NO el actual de la organización. Así un
    // acta ya emitida conserva su identificación aunque cambie la
    // configuración. El fallback cubre registros anteriores al cambio.
    tituloDoc: cap.titulo_doc || perfil.organizacion.titulo_doc || 'REPORTE DE ASISTENCIA A CAPACITACIÓN',
    nomenclatura: cap.nomenclatura || perfil.organizacion.nomenclatura || '—',
    versionDoc: cap.version_doc || perfil.organizacion.version_doc || 'V1',
    fechaCreacionDoc: String(new Date(cap.created_at).getFullYear()),
    colorPrimario: perfil.organizacion.color_primario || '#1e3a8a',
    logo,
    // Congelados en la capacitacion; si es antigua, los actuales
    camposExtra: (cap.campos_encabezado ?? perfil.organizacion.campos_encabezado ?? []) as Array<{ etiqueta: string; valor: string }>,
    // Congelado al crear la capacitacion, no el vigente de la empresa.
    encabezadoConfig: (cap.encabezado_config ?? null) as EncabezadoConfig | null,

    codigo: cap.codigo,
    tema: cap.tema,
    descripcion: cap.descripcion,
    instructor: cap.instructor,
    fechaInicio: fmt(cap.fecha_inicio),
    fechaFin: fmt(cap.fecha_fin),
    esperados: cap.esperados,
    registrados: cap.registrados,
    porcentaje: Number(cap.porcentaje_participacion),

    participantes: lista.map((p, i) => ({
      nombres: p.nombres,
      cargo: p.cargo,
      area: p.area,
      ciudad: p.ciudad,
      identificacion: p.identificacion,
      firma: firmas[i] ?? null,
    })),

    firmaInstructor,
    firmaProfesional,
    profNombre: cap.firma_prof_nombre ?? null,
    profProfesion: cap.firma_prof_profesion ?? null,
    generadoEl: new Date().toLocaleString('es-CO', {
      dateStyle: 'short', timeStyle: 'short',
    }),
  };

  const buffer = await renderToBuffer(<DocumentoAsistencia d={datos} />);

  const limpio = cap.tema.replace(/[^a-zA-Z0-9 _-]/g, '').trim().replace(/\s+/g, '_');
  const fecha = new Date().toISOString().slice(0, 10).replace(/-/g, '');

  return {
    ok: true,
    buffer,
    nombreArchivo: `Asistencia_${limpio || 'Capacitacion'}_${cap.codigo}_${fecha}.pdf`,
    tema: cap.tema,
    codigo: cap.codigo,
  };
}
