/**
 * EXPORTACIÓN A EXCEL
 * ---------------------------------------------------------------
 * Genera libros .xlsx con SheetJS. Se ejecuta en el servidor: el
 * navegador solo recibe el archivo terminado.
 *
 * Dos exportaciones:
 *   - Una capacitación: datos + sus asistentes
 *   - Todo: capacitaciones y participantes en hojas separadas
 *
 * No hace falta filtrar por organización: RLS lo hace en la base.
 */
import * as XLSX from 'xlsx';
import { crearClienteServidor } from './supabase/servidor';
import { obtenerPerfil } from './sesion';

export type ResultadoExcel =
  | { ok: true; buffer: Buffer; nombreArchivo: string }
  | { ok: false; error: string };

/** Fecha legible para las celdas. */
function fmt(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleString('es-CO', {
    dateStyle: 'short', timeStyle: 'short',
  });
}

/** Convierte el libro en Buffer descargable. */
function aBuffer(wb: XLSX.WorkBook): Buffer {
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

/** Ajusta el ancho de las columnas al contenido más largo. */
function anchos(filas: Record<string, unknown>[]): XLSX.ColInfo[] {
  if (filas.length === 0) return [];
  return Object.keys(filas[0]).map((clave) => {
    const largoDatos = filas.reduce((max, f) => {
      const v = f[clave];
      return Math.max(max, v === null || v === undefined ? 0 : String(v).length);
    }, 0);
    // Entre 10 y 45 caracteres: ni ilegible ni desproporcionado
    return { wch: Math.min(Math.max(clave.length, largoDatos) + 2, 45) };
  });
}

// =====================================================================
// EXPORTACIÓN DE UNA CAPACITACIÓN
// =====================================================================
export async function excelCapacitacion(id: string): Promise<ResultadoExcel> {
  const perfil = await obtenerPerfil();
  if (!perfil) return { ok: false, error: 'Sesión no válida.' };

  const supabase = await crearClienteServidor();

  const { data: cap } = await supabase
    .from('v_capacitaciones_resumen')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (!cap) return { ok: false, error: 'Capacitación no encontrada.' };

  const { data: parts } = await supabase
    .from('participantes')
    .select('nombres, cargo, area, ciudad, identificacion, firma_url, created_at')
    .eq('capacitacion_id', id)
    .order('created_at');

  const lista = parts ?? [];

  // ---------- Hoja 1: datos de la capacitación ----------
  const datos = [
    { Campo: 'Organización', Valor: perfil.organizacion.nombre },
    { Campo: 'Código', Valor: cap.codigo },
    { Campo: 'Tema', Valor: cap.tema },
    { Campo: 'Descripción', Valor: cap.descripcion ?? '' },
    { Campo: 'Instructor', Valor: cap.instructor },
    { Campo: 'Empresa capacitada', Valor: cap.empresa },
    { Campo: 'Fecha inicio', Valor: fmt(cap.fecha_inicio) },
    { Campo: 'Fecha fin', Valor: fmt(cap.fecha_fin) },
    { Campo: 'Estado', Valor: cap.estado },
    { Campo: 'Participantes registrados', Valor: cap.registrados },
    { Campo: 'Participantes esperados', Valor: cap.esperados ?? 'Sin meta' },
    { Campo: 'Participación (%)', Valor: cap.porcentaje_participacion },
    { Campo: 'Instructor firmó', Valor: cap.instructor_firmo ? 'Sí' : 'No' },
    { Campo: 'Nomenclatura', Valor: cap.nomenclatura ?? '' },
    { Campo: 'Versión documento', Valor: cap.version_doc ?? '' },
  ];

  // ---------- Hoja 2: asistentes ----------
  const asistentes = lista.map((p, i) => ({
    '#': i + 1,
    Nombre: p.nombres,
    Cargo: p.cargo,
    Área: p.area,
    Ciudad: p.ciudad,
    Identificación: p.identificacion,
    Firma: p.firma_url ? 'Sí' : 'No',
    'Fecha de registro': fmt(p.created_at),
  }));

  const wb = XLSX.utils.book_new();

  const hDatos = XLSX.utils.json_to_sheet(datos);
  hDatos['!cols'] = anchos(datos);
  XLSX.utils.book_append_sheet(wb, hDatos, 'Datos');

  const hAsist = XLSX.utils.json_to_sheet(
    asistentes.length > 0 ? asistentes : [{ '#': '', Nombre: 'Sin asistentes registrados' }]
  );
  hAsist['!cols'] = anchos(asistentes);
  XLSX.utils.book_append_sheet(wb, hAsist, 'Asistentes');

  const limpio = String(cap.tema).replace(/[^a-zA-Z0-9 _-]/g, '').trim().replace(/\s+/g, '_');
  const fecha = new Date().toISOString().slice(0, 10).replace(/-/g, '');

  return {
    ok: true,
    buffer: aBuffer(wb),
    nombreArchivo: `Asistencia_${limpio || 'Capacitacion'}_${cap.codigo}_${fecha}.xlsx`,
  };
}

// =====================================================================
// EXPORTACIÓN COMPLETA
// =====================================================================
export async function excelTodo(): Promise<ResultadoExcel> {
  const perfil = await obtenerPerfil();
  if (!perfil) return { ok: false, error: 'Sesión no válida.' };

  const supabase = await crearClienteServidor();

  const { data: caps } = await supabase
    .from('v_capacitaciones_resumen')
    .select('*')
    .order('fecha_inicio', { ascending: false });

  const { data: parts } = await supabase
    .from('participantes')
    .select('capacitacion_id, nombres, cargo, area, ciudad, identificacion, firma_url, created_at')
    .order('created_at');

  const listaCaps = caps ?? [];
  const listaParts = parts ?? [];

  // Índice para resolver el código de cada participante sin recorrer
  // el arreglo completo en cada fila
  const indice = new Map(listaCaps.map((c) => [c.id, c]));

  const hojaCaps = listaCaps.map((c) => ({
    Código: c.codigo,
    Tema: c.tema,
    Instructor: c.instructor,
    'Empresa capacitada': c.empresa,
    'Fecha inicio': fmt(c.fecha_inicio),
    'Fecha fin': fmt(c.fecha_fin),
    Estado: c.estado,
    Registrados: c.registrados,
    Esperados: c.esperados ?? '',
    'Participación (%)': c.porcentaje_participacion,
    'Instructor firmó': c.instructor_firmo ? 'Sí' : 'No',
    Nomenclatura: c.nomenclatura ?? '',
    Versión: c.version_doc ?? '',
    Descripción: c.descripcion ?? '',
  }));

  const hojaParts = listaParts.map((p) => {
    const c = indice.get(p.capacitacion_id);
    return {
      'Código capacitación': c?.codigo ?? '',
      Tema: c?.tema ?? '',
      'Fecha capacitación': fmt(c?.fecha_inicio ?? null),
      Nombre: p.nombres,
      Cargo: p.cargo,
      Área: p.area,
      Ciudad: p.ciudad,
      Identificación: p.identificacion,
      Firma: p.firma_url ? 'Sí' : 'No',
      'Fecha de registro': fmt(p.created_at),
    };
  });

  // Resumen por persona: responde "¿quién participa más y quién menos?"
  const porPersona = new Map<string, { nombre: string; total: number }>();
  for (const p of listaParts) {
    const clave = p.identificacion;
    const actual = porPersona.get(clave);
    if (actual) actual.total += 1;
    else porPersona.set(clave, { nombre: p.nombres, total: 1 });
  }

  const hojaPersonas = Array.from(porPersona.entries())
    .map(([identificacion, v]) => ({
      Identificación: identificacion,
      Nombre: v.nombre,
      'Capacitaciones asistidas': v.total,
    }))
    .sort((a, b) => b['Capacitaciones asistidas'] - a['Capacitaciones asistidas']);

  const wb = XLSX.utils.book_new();

  const h1 = XLSX.utils.json_to_sheet(hojaCaps.length ? hojaCaps : [{ Código: 'Sin datos' }]);
  h1['!cols'] = anchos(hojaCaps);
  XLSX.utils.book_append_sheet(wb, h1, 'Capacitaciones');

  const h2 = XLSX.utils.json_to_sheet(hojaParts.length ? hojaParts : [{ Nombre: 'Sin datos' }]);
  h2['!cols'] = anchos(hojaParts);
  XLSX.utils.book_append_sheet(wb, h2, 'Participantes');

  const h3 = XLSX.utils.json_to_sheet(hojaPersonas.length ? hojaPersonas : [{ Nombre: 'Sin datos' }]);
  h3['!cols'] = anchos(hojaPersonas);
  XLSX.utils.book_append_sheet(wb, h3, 'Por persona');

  const org = perfil.organizacion.slug;
  const fecha = new Date().toISOString().slice(0, 10).replace(/-/g, '');

  return {
    ok: true,
    buffer: aBuffer(wb),
    nombreArchivo: `Registros_${org}_${fecha}.xlsx`,
  };
}
