/**
 * PERSONAL EN EXCEL
 * ---------------------------------------------------------------
 * La lista de trabajadores es el anexo que acompaña a casi todo lo
 * demás: al plan anual, a la autoevaluación, a la conformación del
 * COPASST —donde el número de trabajadores decide la composición que
 * exige la norma— y al cálculo de cualquier indicador.
 *
 * Dos hojas, activos y retirados, y no una con una columna de estado:
 * quien pide «la lista del personal» quiere la de los que están, y
 * quien audita un retiro quiere ver los que se fueron con su fecha.
 * Separarlas evita que el que llega nuevo filtre mal y cuente de más.
 *
 * Los retirados no se borran nunca: sus actas firmadas siguen
 * nombrándolos, y esa hoja es la que lo demuestra.
 */
import * as XLSX from 'xlsx';
import { crearClienteServidor } from '../supabase/servidor';
import { agregarHoja, cerrarLibro, fecha, type ResultadoExcel } from './hoja';

type Empleado = {
  nombres: string; identificacion: string | null;
  area: string | null; cargo: string | null; ciudad: string | null;
  activo: boolean; fecha_retiro: string | null;
  asistencias: number | null; promedio: number | null;
  ultima: string | null;
};

function filas(lista: Empleado[], conRetiro: boolean) {
  return lista.map((e) => {
    const base: Record<string, string | number> = {
      'Trabajador': e.nombres,
      'Identificación': e.identificacion ?? '',
      'Área': e.area ?? '',
      'Cargo': e.cargo ?? '',
      'Ciudad': e.ciudad ?? '',
      'Capacitaciones asistidas': e.asistencias ?? 0,
      'Última capacitación': fecha(e.ultima),
      'Promedio de evaluación': e.promedio ?? '',
    };
    if (conRetiro) base['Fecha de retiro'] = fecha(e.fecha_retiro);
    return base;
  });
}

export async function generarExcelPersonal(
  empresaId: string,
  empresaNombre: string
): Promise<ResultadoExcel> {
  const supabase = await crearClienteServidor();

  const { data: dTodos, error } = await supabase.rpc('empleados_con_participacion', {
    p_empresa: empresaId,
    p_activos: false,
  });
  if (error) return { ok: false, error: 'No se pudo leer el personal.' };

  const todos = (dTodos ?? []) as Empleado[];
  const activos = todos.filter((e) => e.activo);
  const retirados = todos.filter((e) => !e.activo);

  const libro = XLSX.utils.book_new();
  agregarHoja(libro, 'Activos', filas(activos, false), [28, 14, 18, 22, 16, 22, 18, 20]);
  agregarHoja(libro, 'Retirados', filas(retirados, true), [28, 14, 18, 22, 16, 22, 18, 20, 16]);

  // El conteo de trabajadores activos NO es un adorno: es el número que
  // decide qué composición de COPASST exige la norma y el denominador
  // de los indicadores del artículo 30.
  agregarHoja(
    libro,
    'Resumen',
    [
      { 'Concepto': 'Trabajadores activos', 'Cantidad': activos.length },
      { 'Concepto': 'Trabajadores retirados', 'Cantidad': retirados.length },
      { 'Concepto': 'Total histórico', 'Cantidad': todos.length },
      {
        'Concepto': 'Áreas con personal',
        'Cantidad': new Set(activos.map((e) => e.area ?? '—')).size,
      },
    ],
    [30, 12]
  );

  return cerrarLibro(libro, 'Personal', empresaNombre);
}
