/**
 * GENERADOR DE LA HOJA DE VIDA
 */
import { renderToBuffer } from '@react-pdf/renderer';
import { crearClienteServidor } from '../supabase/servidor';
import { obtenerPerfil } from '../sesion';
import { HojaDeVida, type DatosPerfil } from './HojaDeVida';

export type ResultadoHoja =
  | { ok: true; buffer: Buffer; nombreArchivo: string; nombre: string }
  | { ok: false; error: string };

async function descargarUrl(url: string): Promise<Buffer | null> {
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    return Buffer.from(await r.arrayBuffer());
  } catch { return null; }
}

export async function generarHojaVida(): Promise<ResultadoHoja> {
  const perfil = await obtenerPerfil();
  if (!perfil) return { ok: false, error: 'Sesión no válida.' };

  const supabase = await crearClienteServidor();

  const { data: p } = await supabase
    .from('perfil_profesional')
    .select('*')
    .maybeSingle();

  if (!p) {
    return { ok: false, error: 'Aún no has completado tu perfil profesional.' };
  }

  const { data: tr } = await supabase.rpc('trayectoria_profesional');

  const foto = p.foto_url ? await descargarUrl(p.foto_url) : null;

  // La firma vive en un bucket privado: hace falta URL firmada
  let firma: Buffer | null = null;
  if (p.firma_url) {
    const ruta = p.firma_url.includes('/firmas/')
      ? p.firma_url.split('/firmas/')[1]
      : p.firma_url;
    const { data: fd } = await supabase.storage
      .from('firmas')
      .createSignedUrl(ruta, 120);
    if (fd?.signedUrl) firma = await descargarUrl(fd.signedUrl);
  }

  const datos: DatosPerfil = {
    nombre: p.nombre,
    titulo: p.titulo,
    profesion: p.profesion,
    tarjetaProfesional: p.tarjeta_profesional,
    licenciaSst: p.licencia_sst,
    vigenciaLicencia: p.vigencia_licencia
      ? new Date(p.vigencia_licencia).toLocaleDateString('es-CO', { dateStyle: 'medium' })
      : null,
    correo: p.correo,
    telefono: p.telefono,
    ciudad: p.ciudad,
    resumen: p.resumen,
    foto,
    firma,

    formacion: (p.formacion ?? []) as DatosPerfil['formacion'],
    experiencia: (p.experiencia ?? []) as DatosPerfil['experiencia'],
    certificaciones: (p.certificaciones ?? []) as DatosPerfil['certificaciones'],

    trayectoria: tr as DatosPerfil['trayectoria'],

    colorPrimario: perfil.organizacion.color_primario || '#14263F',
    generadoEl: new Date().toLocaleDateString('es-CO', { dateStyle: 'medium' }),
  };

  const buffer = await renderToBuffer(<HojaDeVida d={datos} />);
  const limpio = p.nombre.replace(/[^a-zA-Z0-9 ]/g, '').trim().replace(/\s+/g, '_');

  return {
    ok: true,
    buffer,
    nombreArchivo: `Hoja_de_vida_${limpio}.pdf`,
    nombre: p.nombre,
  };
}
