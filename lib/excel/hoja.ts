/**
 * PIEZAS COMUNES DE LOS LIBROS DE EXCEL
 * ---------------------------------------------------------------
 * Cada reporte nuevo repetía las mismas cuatro líneas: crear la hoja,
 * fijar anchos, poner el autofiltro y congelar el encabezado. Escrito a
 * mano, el autofiltro se olvida en el tercer libro —y un Excel sin
 * autofiltro obliga a ponerlo a mano cada vez que se abre—.
 *
 * La regla del §5.17 del proyecto vive aquí: un libro se entrega como
 * TABLA PLANA con filtro y encabezado congelado, no como un dibujo con
 * filas de título intercaladas. La rejilla bonita es para la pantalla;
 * el Excel existe para filtrar, ordenar y llevar a una dinámica.
 */
import * as XLSX from 'xlsx';

export type ResultadoExcel =
  | { ok: true; buffer: Buffer; nombreArchivo: string }
  | { ok: false; error: string };

/** Letra de columna de Excel: 0 → A, 26 → AA. */
function columna(i: number): string {
  let s = '';
  let n = i;
  do {
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return s;
}

/**
 * Añade una hoja a partir de un arreglo de objetos. Las claves del
 * primer objeto son los encabezados, así que el orden de las columnas
 * se decide al construir las filas.
 *
 * `anchos` va en caracteres, uno por columna. Lo que sobre o falte se
 * completa con 16, que es un ancho razonable para texto corto.
 */
export function agregarHoja(
  libro: XLSX.WorkBook,
  nombre: string,
  filas: Record<string, string | number>[],
  anchos: number[] = []
): void {
  // Una hoja vacía sigue siendo información: dice que ese apartado no
  // tiene datos. Se escribe con una sola fila explicativa en vez de
  // omitir la hoja, que parecería un error del reporte.
  if (filas.length === 0) {
    const vacia = XLSX.utils.aoa_to_sheet([['Sin registros']]);
    vacia['!cols'] = [{ wch: 30 }];
    XLSX.utils.book_append_sheet(libro, vacia, nombre);
    return;
  }

  const hoja = XLSX.utils.json_to_sheet(filas);
  const columnas = Object.keys(filas[0]).length;

  hoja['!cols'] = Array.from({ length: columnas }, (_, i) => ({
    wch: anchos[i] ?? 16,
  }));
  hoja['!autofilter'] = { ref: `A1:${columna(columnas - 1)}${filas.length + 1}` };
  hoja['!freeze'] = { xSplit: 0, ySplit: 1 };

  // Excel corta el nombre de una hoja a 31 caracteres y revienta con
  // los signos : \ / ? * [ ]. Se limpia aquí y no en cada llamada.
  XLSX.utils.book_append_sheet(libro, hoja, nombre.replace(/[:\\/?*[\]]/g, '').slice(0, 31));
}

/** '2026-09-02' o un timestamp → '2/09/2026'. Vacío si no hay fecha. */
export function fecha(iso: string | null | undefined): string {
  if (!iso) return '';
  return new Date(iso.length <= 10 ? iso + 'T12:00:00' : iso)
    .toLocaleDateString('es-CO');
}

/** true → 'SÍ'. Se escribe en texto y no como booleano para que el
 *  filtro de Excel muestre las dos opciones en español. */
export function siNo(v: boolean | null | undefined): string {
  return v ? 'SÍ' : 'NO';
}

/** Cierra el libro y le pone nombre. El nombre lleva la empresa y la
 *  fecha porque estos archivos acaban todos en la misma carpeta. */
export function cerrarLibro(
  libro: XLSX.WorkBook,
  prefijo: string,
  empresaNombre: string
): ResultadoExcel {
  const limpio = empresaNombre.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_');
  const hoy = new Date().toISOString().slice(0, 10);
  const buffer = XLSX.write(libro, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  return { ok: true, buffer, nombreArchivo: `${prefijo}_${limpio}_${hoy}.xlsx` };
}
