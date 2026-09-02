/**
 * SALUD DE LOS TRABAJADORES EN EXCEL
 * ---------------------------------------------------------------
 * Tres hojas que casi siempre se piden juntas en una visita:
 *
 *   Exámenes médicos — quién tiene aptitud vigente y quién no
 *   Ausentismo       — días perdidos, con su origen
 *   Horas-hombre     — el denominador de los indicadores del art. 30
 *
 * REGLA DEL MÓDULO, que también rige aquí: se exporta el CONCEPTO DE
 * APTITUD y las RESTRICCIONES, nunca el diagnóstico. La historia
 * clínica es reservada y la custodia el médico (Res. 2346 de 2007). No
 * hay columna de diagnóstico en la base y no debe aparecer una en el
 * reporte: un Excel se reenvía por correo con mucha más facilidad que
 * una pantalla.
 */
import * as XLSX from 'xlsx';
import { crearClienteServidor } from '../supabase/servidor';
import { agregarHoja, cerrarLibro, fecha, siNo, type ResultadoExcel } from './hoja';

type Examen = {
  nombres: string; identificacion: string | null;
  area: string | null; cargo: string | null;
  examen_id: string | null; tipo: string | null;
  fecha: string | null; fecha_vence: string | null;
  concepto: string | null; restricciones: string | null;
  entidad: string | null;
  dias_para_vencer: number | null;
  vencido: boolean | null; sin_examen: boolean | null;
};

type Ausencia = {
  nombres: string; area: string | null; cargo: string | null;
  origen: string; fecha_inicio: string; fecha_fin: string;
  dias: number; causa_medica: boolean; prorroga: boolean;
  entidad: string | null; numero_incapacidad: string | null;
  evento_codigo: string | null; observaciones: string | null;
};

type Mes = {
  mes: number; horas: number; trabajadores: number;
  dias_programados: number; registrado: boolean;
};

const TIPOS: Record<string, string> = {
  ingreso: 'INGRESO', periodico: 'PERIÓDICO', egreso: 'EGRESO',
  reintegro: 'REINTEGRO', post_incapacidad: 'POST-INCAPACIDAD',
  cambio_ocupacion: 'CAMBIO DE OCUPACIÓN',
};

const CONCEPTOS: Record<string, string> = {
  apto: 'APTO',
  apto_con_restricciones: 'APTO CON RESTRICCIONES',
  no_apto: 'NO APTO',
  aplazado: 'APLAZADO',
};

const ORIGENES: Record<string, string> = {
  enfermedad_general: 'ENFERMEDAD GENERAL',
  accidente_trabajo: 'ACCIDENTE DE TRABAJO',
  enfermedad_laboral: 'ENFERMEDAD LABORAL',
  accidente_comun: 'ACCIDENTE COMÚN',
  licencia_maternidad: 'LICENCIA DE MATERNIDAD',
  licencia_paternidad: 'LICENCIA DE PATERNIDAD',
  licencia_luto: 'LICENCIA DE LUTO',
  permiso_no_remunerado: 'PERMISO NO REMUNERADO',
  otro: 'OTRO',
};

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio',
  'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

/** Estado en palabras. El color no viaja a un Excel filtrable, y
 *  «VENCIDO» se puede filtrar; un relleno rojo no. */
function estadoExamen(e: Examen): string {
  if (e.sin_examen) return 'SIN EXAMEN';
  if (e.vencido) return 'VENCIDO';
  if (e.dias_para_vencer !== null && e.dias_para_vencer <= 60) return 'POR VENCER';
  return 'VIGENTE';
}

export async function generarExcelSalud(
  empresaId: string,
  empresaNombre: string,
  anio: number
): Promise<ResultadoExcel> {
  const supabase = await crearClienteServidor();
  const libro = XLSX.utils.book_new();

  // ---------- Exámenes médicos ----------
  const { data: dExamenes, error } = await supabase.rpc('listar_examenes', {
    p_empresa: empresaId,
  });
  if (error) return { ok: false, error: 'No se pudieron leer los exámenes médicos.' };
  const examenes = (dExamenes ?? []) as Examen[];

  agregarHoja(
    libro,
    'Exámenes médicos',
    examenes.map((e) => ({
      'Trabajador': e.nombres,
      'Identificación': e.identificacion ?? '',
      'Área': e.area ?? '',
      'Cargo': e.cargo ?? '',
      'Estado': estadoExamen(e),
      'Tipo': TIPOS[e.tipo ?? ''] ?? (e.tipo ?? ''),
      'Fecha del examen': fecha(e.fecha),
      'Vence': fecha(e.fecha_vence),
      'Días para vencer': e.dias_para_vencer ?? '',
      'Concepto de aptitud': CONCEPTOS[e.concepto ?? ''] ?? (e.concepto ?? ''),
      'Restricciones': e.restricciones ?? '',
      'Entidad': e.entidad ?? '',
    })),
    [28, 14, 16, 18, 12, 18, 16, 12, 14, 24, 34, 20]
  );

  // ---------- Ausentismo ----------
  const { data: dAus } = await supabase.rpc('listar_ausencias', {
    p_empresa: empresaId,
    p_anio: anio,
  });
  const ausencias = ((dAus as { items?: Ausencia[] } | null)?.items ?? []) as Ausencia[];

  agregarHoja(
    libro,
    `Ausentismo ${anio}`,
    ausencias.map((a) => ({
      'Trabajador': a.nombres,
      'Área': a.area ?? '',
      'Cargo': a.cargo ?? '',
      'Origen': ORIGENES[a.origen] ?? a.origen,
      // Es la columna que decide si la fila entra al indicador del
      // art. 30: las licencias de ley y los permisos no cuentan.
      'Cuenta para el indicador': siNo(a.causa_medica),
      'Desde': fecha(a.fecha_inicio),
      'Hasta': fecha(a.fecha_fin),
      'Días': a.dias,
      'Prórroga': siNo(a.prorroga),
      'Entidad': a.entidad ?? '',
      'N.º incapacidad': a.numero_incapacidad ?? '',
      'Evento asociado': a.evento_codigo ?? '',
      'Observaciones': a.observaciones ?? '',
    })),
    [28, 16, 18, 24, 22, 12, 12, 8, 10, 18, 16, 16, 34]
  );

  // ---------- Horas-hombre ----------
  const { data: dHoras } = await supabase.rpc('listar_horas_hombre', {
    p_empresa: empresaId,
    p_anio: anio,
  });
  const meses = (dHoras ?? []) as Mes[];

  const filasHoras: Record<string, string | number>[] = meses.map((m) => ({
    'Mes': MESES[m.mes - 1] ?? String(m.mes),
    // Un mes sin cargar NO es un mes en cero, y esa diferencia cambia
    // el denominador de todos los indicadores del año.
    'Cargado': siNo(m.registrado),
    'Horas trabajadas': m.registrado ? m.horas : '',
    'Trabajadores': m.registrado ? m.trabajadores : '',
    'Días programados': m.registrado ? m.dias_programados : '',
  }));

  const cargados = meses.filter((m) => m.registrado);
  filasHoras.push({
    'Mes': 'TOTAL',
    'Cargado': `${cargados.length} de 12 meses`,
    'Horas trabajadas': cargados.reduce((t, m) => t + Number(m.horas ?? 0), 0),
    'Trabajadores': cargados.length
      ? Math.round(cargados.reduce((t, m) => t + Number(m.trabajadores ?? 0), 0) / cargados.length)
      : '',
    'Días programados': cargados.reduce((t, m) => t + Number(m.dias_programados ?? 0), 0),
  });

  agregarHoja(libro, `Horas-hombre ${anio}`, filasHoras, [14, 18, 18, 14, 18]);

  return cerrarLibro(libro, 'Salud_de_los_trabajadores', empresaNombre);
}
