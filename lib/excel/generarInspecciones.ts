/**
 * INSPECCIONES EN EXCEL
 * ---------------------------------------------------------------
 * Tres hojas, cada una respondiendo una pregunta distinta:
 *
 *   Inspecciones  — qué se revisó, cuándo y con qué resultado
 *   Hallazgos     — qué falló, criterio por criterio
 *   Plan de acción— qué se hizo con cada hallazgo y si se cerró
 *
 * Todo en tablas planas con autofiltro: el PDF ya sirve como evidencia
 * firmada, así que lo que se pide de un Excel es poder filtrar, ordenar
 * y cruzar. Nada de filas de título intercaladas.
 */
import * as XLSX from 'xlsx';
import { crearClienteServidor } from '../supabase/servidor';

export type ResultadoExcel =
  | { ok: true; buffer: Buffer; nombreArchivo: string }
  | { ok: false; error: string };

const TIPOS: Record<string, string> = {
  planeada: 'PLANEADA',
  equipo: 'DE EQUIPO',
  area: 'DE ÁREA',
  auditoria: 'AUDITORÍA',
};

const RESULTADOS: Record<string, string> = {
  cumple: 'CUMPLE',
  no_cumple: 'NO CUMPLE',
  no_aplica: 'NO APLICA',
};

const SEVERIDADES: Record<string, string> = {
  baja: 'BAJA', media: 'MEDIA', alta: 'ALTA', critica: 'CRÍTICA',
};

function fecha(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso.length <= 10 ? iso + 'T12:00:00' : iso)
    .toLocaleDateString('es-CO');
}

function fechaHora(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleString('es-CO', {
    dateStyle: 'short', timeStyle: 'short',
  });
}

export async function generarExcelInspecciones(
  empresaId: string,
  empresaNombre: string
): Promise<ResultadoExcel> {
  const supabase = await crearClienteServidor();

  // ---------- Inspecciones ----------
  const { data: inspecciones, error } = await supabase
    .from('inspecciones')
    .select(`id, codigo, nombre, tipo, norma, tipo_objeto, objeto_nombre,
             inspector, acompanante, fecha, puntaje, cumple, estado, observaciones`)
    .eq('empresa_id', empresaId)
    .order('fecha', { ascending: false });

  if (error) return { ok: false, error: error.message };

  const lista = inspecciones ?? [];
  if (lista.length === 0) {
    return { ok: false, error: 'Esta empresa aún no tiene inspecciones registradas.' };
  }

  const libro = XLSX.utils.book_new();

  const hojaInspecciones = lista.map((i) => ({
    'Código': i.codigo,
    'Fecha': fechaHora(i.fecha as string),
    'Lista de verificación': i.nombre,
    'Tipo': TIPOS[i.tipo as string] ?? String(i.tipo).toUpperCase(),
    'Norma': i.norma ?? '',
    'Objeto inspeccionado': i.objeto_nombre ?? '',
    'Inspector': i.inspector,
    'Acompañante': i.acompanante ?? '',
    'Estado': String(i.estado).toUpperCase(),
    // Solo las cerradas tienen veredicto: en borrador el puntaje aún
    // no significa nada y darlo por bueno seria engañoso.
    'Puntaje %': i.estado === 'cerrada' && i.puntaje !== null ? i.puntaje : '',
    'Veredicto': i.estado !== 'cerrada' ? ''
                : i.cumple === null ? 'SIN CRITERIOS APLICABLES'
                : i.cumple ? 'CUMPLE' : 'NO CUMPLE',
    'Observaciones': i.observaciones ?? '',
  }));

  const h1 = XLSX.utils.json_to_sheet(hojaInspecciones);
  h1['!cols'] = [
    { wch: 13 }, { wch: 17 }, { wch: 36 }, { wch: 13 }, { wch: 22 },
    { wch: 24 }, { wch: 22 }, { wch: 22 }, { wch: 11 }, { wch: 10 },
    { wch: 22 }, { wch: 40 },
  ];
  h1['!autofilter'] = { ref: `A1:L${hojaInspecciones.length + 1}` };
  h1['!freeze'] = { xSplit: 0, ySplit: 1 };
  XLSX.utils.book_append_sheet(libro, h1, 'Inspecciones');

  // ---------- Hallazgos ----------
  // Solo los incumplimientos: un Excel con los 121 criterios de cada
  // inspección sería ilegible y no responde a ninguna pregunta.
  const ids = lista.map((i) => i.id as string);
  const { data: respuestas } = await supabase
    .from('inspeccion_respuestas')
    .select('inspeccion_id, orden, seccion, criterio, critico, resultado, hallazgo, foto_url')
    .in('inspeccion_id', ids)
    .eq('resultado', 'no_cumple')
    .order('orden');

  const porId = new Map(lista.map((i) => [i.id as string, i]));

  const hallazgos = (respuestas ?? []).map((r) => {
    const i = porId.get(r.inspeccion_id as string);
    return {
      'Inspección': i?.codigo ?? '',
      'Fecha': fechaHora((i?.fecha as string) ?? null),
      'Objeto': i?.objeto_nombre ?? '',
      'Lista de verificación': i?.nombre ?? '',
      'Sección': r.seccion ?? '',
      '#': r.orden,
      'Criterio': r.criterio,
      'Crítico': r.critico ? 'SÍ' : 'NO',
      'Resultado': RESULTADOS[r.resultado as string] ?? '',
      'Hallazgo': r.hallazgo ?? '',
      'Tiene foto': r.foto_url ? 'SÍ' : 'NO',
    };
  });

  if (hallazgos.length > 0) {
    const h2 = XLSX.utils.json_to_sheet(hallazgos);
    h2['!cols'] = [
      { wch: 13 }, { wch: 17 }, { wch: 22 }, { wch: 30 }, { wch: 22 },
      { wch: 5 }, { wch: 48 }, { wch: 9 }, { wch: 12 }, { wch: 44 }, { wch: 10 },
    ];
    h2['!autofilter'] = { ref: `A1:K${hallazgos.length + 1}` };
    h2['!freeze'] = { xSplit: 0, ySplit: 1 };
    XLSX.utils.book_append_sheet(libro, h2, 'Hallazgos');
  }

  // ---------- Plan de acción ----------
  const { data: acciones } = await supabase
    .from('acciones_correctivas')
    .select(`codigo, hallazgo, accion, tipo, causa_raiz, responsable, severidad,
             fecha_limite, fecha_cierre, verificado_por, estado, inspeccion_id, created_at`)
    .eq('empresa_id', empresaId)
    .order('fecha_limite');

  const hoy = new Date().toISOString().slice(0, 10);

  const plan = (acciones ?? []).map((a) => {
    const insp = a.inspeccion_id ? porId.get(a.inspeccion_id as string) : null;
    const vencida = a.estado !== 'cerrada' && String(a.fecha_limite) < hoy;
    return {
      'Código': a.codigo,
      'Inspección': insp?.codigo ?? 'SIN INSPECCIÓN',
      'Objeto': insp?.objeto_nombre ?? '',
      'Hallazgo': a.hallazgo,
      'Acción': a.accion,
      'Tipo': String(a.tipo).toUpperCase(),
      'Causa raíz': a.causa_raiz ?? '',
      'Responsable': a.responsable,
      'Severidad': SEVERIDADES[a.severidad as string] ?? '',
      'Fecha límite': fecha(a.fecha_limite as string),
      // El estado vencido se deriva al leer, igual que en la pantalla
      'Estado': vencida ? 'VENCIDA' : String(a.estado).toUpperCase().replace('_', ' '),
      'Fecha de cierre': fecha(a.fecha_cierre as string | null),
      'Verificó': a.verificado_por ?? '',
      'Días para cerrar': a.fecha_cierre
        ? Math.round(
            (new Date(String(a.fecha_cierre)).getTime() -
             new Date(String(a.created_at)).getTime()) / 86400000)
        : '',
    };
  });

  if (plan.length > 0) {
    const h3 = XLSX.utils.json_to_sheet(plan);
    h3['!cols'] = [
      { wch: 12 }, { wch: 13 }, { wch: 22 }, { wch: 40 }, { wch: 40 },
      { wch: 12 }, { wch: 30 }, { wch: 24 }, { wch: 11 }, { wch: 13 },
      { wch: 13 }, { wch: 15 }, { wch: 24 }, { wch: 15 },
    ];
    h3['!autofilter'] = { ref: `A1:N${plan.length + 1}` };
    h3['!freeze'] = { xSplit: 0, ySplit: 1 };
    XLSX.utils.book_append_sheet(libro, h3, 'Plan de acción');
  }

  const buffer = XLSX.write(libro, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  const limpio = empresaNombre.replace(/[^a-zA-Z0-9 ]/g, '').trim().replace(/\s+/g, '_');

  return {
    ok: true,
    buffer,
    nombreArchivo: `Inspecciones_${limpio}_${new Date().toISOString().slice(0, 10)}.xlsx`,
  };
}
