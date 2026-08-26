/**
 * MATRICES EN EXCEL — capacitaciones y dotación
 * ---------------------------------------------------------------
 * Cada libro lleva DOS hojas de los mismos datos:
 *
 *   "Matriz"  — la rejilla que se ve en pantalla (empleado × columna),
 *               para imprimir o revisar de un vistazo.
 *   "Detalle" — una fila por cruce, que es lo único con lo que Excel
 *               sabe filtrar, ordenar y hacer tablas dinámicas.
 *
 * Sin la segunda, exportar una matriz a Excel sirve de poco: una
 * rejilla es un dibujo, no una tabla.
 */
import * as XLSX from 'xlsx';
import { crearClienteServidor } from '../supabase/servidor';

export type ResultadoExcel =
  | { ok: true; buffer: Buffer; nombreArchivo: string }
  | { ok: false; error: string };

const ESTADOS_CAP: Record<string, string> = {
  asistio: 'ASISTIÓ',
  falto: 'FALTÓ',
  programada: 'PROGRAMADA',
  no_aplica: 'NO APLICA',
};

/** Valores reales de EstadoDotacion; 'nunca' = nunca se le entregó. */
const ESTADOS_DOT: Record<string, string> = {
  vigente: 'VIGENTE',
  por_vencer: 'POR VENCER',
  vencido: 'VENCIDO',
  sin_vencimiento: 'SIN VENCIMIENTO',
  nunca: 'NUNCA ENTREGADO',
};

function archivo(prefijo: string, empresa: string) {
  const limpio = empresa.replace(/[^a-zA-Z0-9 ]/g, '').trim().replace(/\s+/g, '_');
  return `${prefijo}_${limpio}_${new Date().toISOString().slice(0, 10)}.xlsx`;
}

function fecha(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso.length <= 10 ? iso + 'T12:00:00' : iso)
    .toLocaleDateString('es-CO');
}

/* ===============================================================
   MATRIZ DE CAPACITACIONES
   =============================================================== */
export async function generarExcelMatrizCapacitaciones(
  empresaId: string,
  empresaNombre: string,
  desde: string,
  hasta: string
): Promise<ResultadoExcel> {
  const supabase = await crearClienteServidor();

  const { data, error } = await supabase.rpc('matriz_capacitaciones', {
    p_empresa: empresaId, p_desde: desde, p_hasta: hasta,
  });

  if (error) return { ok: false, error: error.message };

  const m = (data ?? { capacitaciones: [], empleados: [] }) as {
    capacitaciones: Array<{ id: string; codigo: string; tema: string; fecha: string; estado: string }>;
    empleados: Array<{
      identificacion: string; nombres: string; area: string; cargo: string | null;
      celdas: Array<{ capacitacion: string; estado: string; puntaje: number | null }>;
      convocadas: number; asistidas: number;
    }>;
  };

  if (m.empleados.length === 0) {
    return { ok: false, error: 'No hay empleados con capacitaciones en el periodo.' };
  }

  const libro = XLSX.utils.book_new();

  // ---------- Hoja 1: la rejilla ----------
  const rejilla = m.empleados.map((e) => {
    const fila: Record<string, unknown> = {
      'Identificación': e.identificacion,
      'Nombre': e.nombres,
      'Área': e.area,
      'Cargo': e.cargo ?? '',
    };
    for (const c of m.capacitaciones) {
      const celda = e.celdas.find((x) => x.capacitacion === c.id);
      fila[`${c.codigo} · ${c.tema}`] =
        celda ? (ESTADOS_CAP[celda.estado] ?? '') : '';
    }
    fila['Convocadas'] = e.convocadas;
    fila['Asistidas'] = e.asistidas;
    fila['% Cumplimiento'] = e.convocadas > 0
      ? Math.round((e.asistidas / e.convocadas) * 100)
      : '';
    return fila;
  });

  const h1 = XLSX.utils.json_to_sheet(rejilla);
  h1['!cols'] = [
    { wch: 15 }, { wch: 30 }, { wch: 18 }, { wch: 20 },
    ...m.capacitaciones.map(() => ({ wch: 16 })),
    { wch: 12 }, { wch: 11 }, { wch: 15 },
  ];
  h1['!freeze'] = { xSplit: 2, ySplit: 1 };
  XLSX.utils.book_append_sheet(libro, h1, 'Matriz');

  // ---------- Hoja 2: una fila por cruce ----------
  const detalle: Array<Record<string, unknown>> = [];
  for (const e of m.empleados) {
    for (const c of m.capacitaciones) {
      const celda = e.celdas.find((x) => x.capacitacion === c.id);
      if (!celda) continue;
      detalle.push({
        'Identificación': e.identificacion,
        'Nombre': e.nombres,
        'Área': e.area,
        'Cargo': e.cargo ?? '',
        'Código': c.codigo,
        'Capacitación': c.tema,
        'Fecha': fecha(c.fecha),
        'Estado': ESTADOS_CAP[celda.estado] ?? celda.estado,
        'Puntaje': celda.puntaje ?? '',
      });
    }
  }

  if (detalle.length > 0) {
    const h2 = XLSX.utils.json_to_sheet(detalle);
    h2['!cols'] = [
      { wch: 15 }, { wch: 30 }, { wch: 18 }, { wch: 20 },
      { wch: 12 }, { wch: 36 }, { wch: 12 }, { wch: 13 }, { wch: 10 },
    ];
    h2['!autofilter'] = { ref: `A1:I${detalle.length + 1}` };
    h2['!freeze'] = { xSplit: 0, ySplit: 1 };
    XLSX.utils.book_append_sheet(libro, h2, 'Detalle');
  }

  return {
    ok: true,
    buffer: XLSX.write(libro, { type: 'buffer', bookType: 'xlsx' }) as Buffer,
    nombreArchivo: archivo('Matriz_capacitaciones', empresaNombre),
  };
}

/* ===============================================================
   MATRIZ DE DOTACIÓN
   =============================================================== */
export async function generarExcelMatrizDotacion(
  empresaId: string,
  empresaNombre: string
): Promise<ResultadoExcel> {
  const supabase = await crearClienteServidor();

  const { data, error } = await supabase.rpc('matriz_dotacion', { p_empresa: empresaId });
  if (error) return { ok: false, error: error.message };

  const m = (data ?? { articulos: [], empleados: [] }) as {
    articulos: Array<{ id: string; codigo: string; nombre: string }>;
    empleados: Array<{
      identificacion: string; nombres: string; area: string; cargo: string | null;
      celdas: Array<{
        articulo: string; estado: string; fecha_vence: string | null;
        talla: string | null; entrega: string | null; dias: number | null;
      }>;
      equipos: Array<{ placa: string; articulo: string; desde: string }>;
      vencidos: number; faltantes: number;
    }>;
  };

  if (m.empleados.length === 0) {
    return { ok: false, error: 'No hay empleados con dotación registrada.' };
  }

  const libro = XLSX.utils.book_new();

  // ---------- Hoja 1: la rejilla ----------
  const rejilla = m.empleados.map((e) => {
    const fila: Record<string, unknown> = {
      'Identificación': e.identificacion,
      'Nombre': e.nombres,
      'Área': e.area,
      'Cargo': e.cargo ?? '',
    };
    for (const a of m.articulos) {
      const celda = e.celdas.find((x) => x.articulo === a.id);
      fila[`${a.codigo} · ${a.nombre}`] =
        celda ? (ESTADOS_DOT[celda.estado] ?? '') : '';
    }
    fila['Vencidos'] = e.vencidos;
    fila['Faltantes'] = e.faltantes;
    return fila;
  });

  const h1 = XLSX.utils.json_to_sheet(rejilla);
  h1['!cols'] = [
    { wch: 15 }, { wch: 30 }, { wch: 18 }, { wch: 20 },
    ...m.articulos.map(() => ({ wch: 18 })),
    { wch: 11 }, { wch: 11 },
  ];
  h1['!freeze'] = { xSplit: 2, ySplit: 1 };
  XLSX.utils.book_append_sheet(libro, h1, 'Matriz');

  // ---------- Hoja 2: una fila por cruce ----------
  const detalle: Array<Record<string, unknown>> = [];
  for (const e of m.empleados) {
    for (const a of m.articulos) {
      const celda = e.celdas.find((x) => x.articulo === a.id);
      if (!celda) continue;
      detalle.push({
        'Identificación': e.identificacion,
        'Nombre': e.nombres,
        'Área': e.area,
        'Cargo': e.cargo ?? '',
        'Código': a.codigo,
        'Elemento': a.nombre,
        'Estado': ESTADOS_DOT[celda.estado] ?? celda.estado,
        'Talla': celda.talla ?? '',
        'Última entrega': fecha(celda.entrega),
        'Vence': fecha(celda.fecha_vence),
        'Días restantes': celda.dias ?? '',
      });
    }
  }

  if (detalle.length > 0) {
    const h2 = XLSX.utils.json_to_sheet(detalle);
    h2['!cols'] = [
      { wch: 15 }, { wch: 30 }, { wch: 18 }, { wch: 20 },
      { wch: 12 }, { wch: 34 }, { wch: 14 }, { wch: 9 },
      { wch: 15 }, { wch: 12 }, { wch: 14 },
    ];
    h2['!autofilter'] = { ref: `A1:K${detalle.length + 1}` };
    h2['!freeze'] = { xSplit: 0, ySplit: 1 };
    XLSX.utils.book_append_sheet(libro, h2, 'Detalle');
  }

  // ---------- Hoja 3: equipos asignados ----------
  // Los retornables no caben en la rejilla: uno puede tener varios y
  // cada uno con su placa.
  const equipos: Array<Record<string, unknown>> = [];
  for (const e of m.empleados) {
    for (const q of e.equipos) {
      equipos.push({
        'Identificación': e.identificacion,
        'Nombre': e.nombres,
        'Área': e.area,
        'Equipo': q.articulo,
        'Placa': q.placa,
        'Asignado desde': fecha(q.desde),
      });
    }
  }

  if (equipos.length > 0) {
    const h3 = XLSX.utils.json_to_sheet(equipos);
    h3['!cols'] = [
      { wch: 15 }, { wch: 30 }, { wch: 18 }, { wch: 30 }, { wch: 14 }, { wch: 15 },
    ];
    h3['!autofilter'] = { ref: `A1:F${equipos.length + 1}` };
    h3['!freeze'] = { xSplit: 0, ySplit: 1 };
    XLSX.utils.book_append_sheet(libro, h3, 'Equipos asignados');
  }

  return {
    ok: true,
    buffer: XLSX.write(libro, { type: 'buffer', bookType: 'xlsx' }) as Buffer,
    nombreArchivo: archivo('Matriz_dotacion', empresaNombre),
  };
}
