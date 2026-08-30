/**
 * KARDEX DE DOTACIÓN EN EXCEL
 * ---------------------------------------------------------------
 * Un kardex es un libro de movimientos con SALDO CORRIDO: cada línea
 * muestra entrada, salida y cuánto queda después. Explica cómo se
 * llegó a la existencia actual, no solo cuál es — que es justo lo que
 * pregunta una auditoría.
 *
 * El libro se arma en el servidor con SheetJS y se descarga; no se
 * almacena en ninguna parte.
 */
import * as XLSX from 'xlsx';
import { crearClienteServidor } from '../supabase/servidor';
import { resolverNomenclatura, leerMapa } from '../nomenclaturas';

export type ResultadoKardex =
  | { ok: true; buffer: Buffer; nombreArchivo: string }
  | { ok: false; error: string };

type Articulo = {
  id: string; codigo: string; nombre: string;
  categoria: string | null; unidad: string;
  stock_minimo: number; valor: number | null;
  existencia: number; total_ingresos: number; total_salidas: number;
};

type Movimiento = {
  articulo_id: string; codigo: string; nombre: string; unidad: string;
  fecha: string; tipo: string;
  documento: string | null; tercero: string | null; motivo: string | null;
  entrada: number | null; salida: number | null; saldo: number;
};

type Equipo = {
  codigo: string; nombre: string; categoria: string | null;
  placa: string; serial: string | null; estado: string;
  valor: number | null;
  fecha_compra: string | null; garantia_hasta: string | null;
  asignado_a: string | null; desde: string | null;
};

const TIPOS: Record<string, string> = {
  ingreso: 'INGRESO',
  entrega: 'ENTREGA',
  baja: 'BAJA',
  ajuste: 'AJUSTE',
};

const ESTADOS: Record<string, string> = {
  disponible: 'DISPONIBLE',
  asignado: 'ASIGNADO',
  mantenimiento: 'EN MANTENIMIENTO',
  baja: 'DADO DE BAJA',
  perdido: 'PERDIDO',
};

function fechaHora(iso: string): string {
  return new Date(iso).toLocaleString('es-CO', {
    dateStyle: 'short', timeStyle: 'short',
  });
}

function soloFecha(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso.length <= 10 ? iso + 'T12:00:00' : iso)
    .toLocaleDateString('es-CO');
}

export async function generarKardex(
  empresaId: string,
  articuloId?: string | null,
  desde?: string | null,
  hasta?: string | null
): Promise<ResultadoKardex> {
  const supabase = await crearClienteServidor();

  const { data: empresa } = await supabase
    .from('empresas')
    .select('nombre, nit, nomenclatura, version_doc, nomenclaturas')
    .eq('id', empresaId)
    .maybeSingle();

  if (!empresa) return { ok: false, error: 'Empresa no encontrada.' };

  const { data, error } = await supabase.rpc('kardex_dotacion', {
    p_empresa: empresaId,
    p_articulo: articuloId ?? null,
    p_desde: desde ?? null,
    p_hasta: hasta ?? null,
  });

  if (error) return { ok: false, error: error.message };

  const k = (data ?? {}) as {
    articulos: Articulo[];
    movimientos: Movimiento[];
    equipos: Equipo[];
  };

  const libro = XLSX.utils.book_new();
  const generadoEl = new Date().toLocaleString('es-CO');

  // ---------- Hoja 1: Resumen ----------
  const resumen: Array<Record<string, unknown>> = k.articulos.map((a) => ({
    'Código': a.codigo,
    'Elemento': a.nombre,
    'Categoría': a.categoria ?? '',
    'Unidad': a.unidad,
    'Ingresos': a.total_ingresos,
    'Salidas': a.total_salidas,
    'Existencia': a.existencia,
    'Stock mínimo': a.stock_minimo,
    'Estado': a.existencia <= a.stock_minimo ? 'BAJO MÍNIMO' : 'NORMAL',
    'Valor unitario': a.valor ?? '',
    'Valor existencia': a.valor ? a.valor * a.existencia : '',
  }));

  if (resumen.length > 0) {
    const hoja = XLSX.utils.json_to_sheet(resumen);
    hoja['!cols'] = [
      { wch: 13 }, { wch: 36 }, { wch: 16 }, { wch: 10 },
      { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 13 },
      { wch: 14 }, { wch: 15 }, { wch: 17 },
    ];
    hoja['!autofilter'] = { ref: `A1:K${resumen.length + 1}` };
    XLSX.utils.book_append_sheet(libro, hoja, 'Resumen');
  }

  // ---------- Hoja 2: Kardex ----------
  /**
   * Una tabla plana y cronológica, sin filas de título por elemento ni
   * líneas en blanco entre grupos.
   *
   * Antes se intercalaba una fila "— MOVIMIENTOS —" por artículo, que
   * convertía la hoja en un informe impreso: rompía el autofiltro, el
   * ordenamiento por columna y cualquier tabla dinámica, que es
   * justamente para lo que se exporta a Excel. Agrupar por elemento es
   * ahora cosa del filtro, no del archivo.
   *
   * El saldo sigue siendo el del ELEMENTO tras ese movimiento —así lo
   * calcula la función— y por eso la columna lo dice: en una lista
   * cronológica que mezcla artículos, un "Saldo" a secas se leería
   * como un total del inventario.
   */
  const movimientos = [...k.movimientos].sort(
    (a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
  );

  const kardex = movimientos.map((m) => ({
    'Fecha': fechaHora(m.fecha),
    'Código': m.codigo,
    'Elemento': m.nombre,
    'Tipo': TIPOS[m.tipo] ?? m.tipo.toUpperCase(),
    'Documento': m.documento ?? '',
    'Tercero': m.tercero ?? '',
    'Motivo': m.motivo ?? '',
    'Entrada': m.entrada ?? '',
    'Salida': m.salida ?? '',
    'Saldo del elemento': m.saldo,
  }));

  if (kardex.length > 0) {
    const hoja = XLSX.utils.json_to_sheet(kardex);
    hoja['!cols'] = [
      { wch: 17 }, { wch: 13 }, { wch: 34 }, { wch: 16 },
      { wch: 12 }, { wch: 26 }, { wch: 32 },
      { wch: 10 }, { wch: 10 }, { wch: 17 },
    ];
    hoja['!autofilter'] = { ref: `A1:J${kardex.length + 1}` };
    // Encabezado siempre visible al recorrer meses de movimientos
    hoja['!freeze'] = { xSplit: 0, ySplit: 1 };
    XLSX.utils.book_append_sheet(libro, hoja, 'Kardex');
  }

  // ---------- Hoja 3: Equipos ----------
  if (k.equipos.length > 0) {
    const equipos = k.equipos.map((e) => ({
      'Código': e.codigo,
      'Equipo': e.nombre,
      'Categoría': e.categoria ?? '',
      'Placa': e.placa,
      'Serial': e.serial ?? '',
      'Estado': ESTADOS[e.estado] ?? e.estado.toUpperCase(),
      'Asignado a': e.asignado_a ?? '',
      'Desde': soloFecha(e.desde),
      'Valor': e.valor ?? '',
      'Fecha compra': soloFecha(e.fecha_compra),
      'Garantía hasta': soloFecha(e.garantia_hasta),
    }));

    const hoja = XLSX.utils.json_to_sheet(equipos);
    hoja['!cols'] = [
      { wch: 13 }, { wch: 32 }, { wch: 16 }, { wch: 12 },
      { wch: 16 }, { wch: 18 }, { wch: 26 }, { wch: 12 },
      { wch: 14 }, { wch: 14 }, { wch: 15 },
    ];
    hoja['!autofilter'] = { ref: `A1:K${equipos.length + 1}` };
    XLSX.utils.book_append_sheet(libro, hoja, 'Equipos');
  }

  // ---------- Hoja 4: Portada ----------
  // Al final para que Excel abra en Resumen, pero presente en el libro
  // porque un documento de auditoría necesita saber de dónde salió.
  const periodo = desde || hasta
    ? `${desde ? soloFecha(desde) : 'inicio'} — ${hasta ? soloFecha(hasta) : 'hoy'}`
    : 'Historial completo';

  // El kardex es un reporte: lleva la nomenclatura de ese tipo, no la
  // de las actas.
  const nomRep = resolverNomenclatura(
    null, leerMapa(empresa.nomenclaturas), 'reporte', false,
    { nomenclatura: empresa.nomenclatura, version: empresa.version_doc }
  );

  const portada = [
    { Campo: 'EMPRESA', Valor: empresa.nombre },
    { Campo: 'NIT', Valor: empresa.nit ?? '' },
    { Campo: 'DOCUMENTO', Valor: 'KARDEX DE DOTACIÓN' },
    { Campo: 'NOMENCLATURA', Valor: `${nomRep.nomenclatura} · ${nomRep.version}` },
    { Campo: 'ALCANCE', Valor: articuloId ? 'Un artículo' : 'Todos los artículos' },
    { Campo: 'PERIODO', Valor: periodo },
    { Campo: 'ARTÍCULOS', Valor: String(k.articulos.length) },
    { Campo: 'MOVIMIENTOS', Valor: String(k.movimientos.length) },
    { Campo: 'EQUIPOS', Valor: String(k.equipos.length) },
    { Campo: 'GENERADO EL', Valor: generadoEl },
    { Campo: '', Valor: '' },
    { Campo: 'NOTA', Valor: 'El saldo corrido incluye todo el historial aunque se filtre por fechas.' },
  ];

  const hojaPortada = XLSX.utils.json_to_sheet(portada);
  hojaPortada['!cols'] = [{ wch: 16 }, { wch: 72 }];
  XLSX.utils.book_append_sheet(libro, hojaPortada, 'Información');

  if (libro.SheetNames.length === 0) {
    return { ok: false, error: 'No hay datos para exportar.' };
  }

  const buffer = XLSX.write(libro, { type: 'buffer', bookType: 'xlsx' }) as Buffer;

  const limpio = String(empresa.nombre)
    .replace(/[^a-zA-Z0-9 ]/g, '').trim().replace(/\s+/g, '_');
  const sufijo = articuloId && k.articulos[0]
    ? `_${k.articulos[0].codigo}`
    : articuloId && k.equipos[0]
    ? `_${k.equipos[0].codigo}`
    : '';
  const fecha = new Date().toISOString().slice(0, 10).replace(/-/g, '');

  return {
    ok: true,
    buffer,
    nombreArchivo: `Kardex_${limpio}${sufijo}_${fecha}.xlsx`,
  };
}
