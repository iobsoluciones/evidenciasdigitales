/**
 * ACCIDENTALIDAD EN EXCEL
 * ---------------------------------------------------------------
 * El informe de investigación de cada evento ya sale en PDF firmado.
 * Lo que no había era la vista de conjunto: cuántos eventos hubo, de
 * qué tipo, cuántos días se perdieron y —lo que primero mira la ARL—
 * cuáles se reportaron a tiempo y cuáles siguen sin investigar.
 *
 * Dos hojas: el detalle evento por evento y un resumen del año, que es
 * lo que se lleva a la revisión por la dirección.
 *
 * Las dos columnas que justifican el reporte son «Reportado a la ARL» y
 * «Investigación», porque son los dos plazos que la norma pone y los
 * dos hallazgos más fáciles de encontrar en una visita.
 */
import * as XLSX from 'xlsx';
import { crearClienteServidor } from '../supabase/servidor';
import { agregarHoja, cerrarLibro, fecha, siNo, type ResultadoExcel } from './hoja';

type Evento = {
  codigo: string | null; tipo: string;
  nombres: string | null; identificacion: string | null; area: string | null;
  fecha_evento: string; lugar: string | null; descripcion: string | null;
  dias_incapacidad: number | null;
  grave: boolean | null; mortal: boolean | null;
  reportado_arl: boolean | null; fecha_reporte_arl: string | null;
  estado: string; fecha_cierre: string | null;
  dias_restantes: number | null; investigacion_vencida: boolean | null;
  causas_basicas: string | null; acciones: number | null;
};

const TIPOS: Record<string, string> = {
  accidente: 'ACCIDENTE DE TRABAJO',
  incidente: 'INCIDENTE',
  casi_accidente: 'CASI-ACCIDENTE',
  enfermedad_laboral: 'ENFERMEDAD LABORAL',
};

const ESTADOS: Record<string, string> = {
  registrado: 'REGISTRADO',
  en_investigacion: 'EN INVESTIGACIÓN',
  cerrado: 'CERRADO',
};

/** El plazo de la Res. 1401 de 2007 es de 15 días calendario. Se
 *  traduce a palabras para poder filtrar por él. */
function estadoInvestigacion(e: Evento): string {
  if (e.estado === 'cerrado') return 'CERRADA';
  if (e.investigacion_vencida) return 'VENCIDA';
  if (e.dias_restantes !== null) return `QUEDAN ${e.dias_restantes} DÍAS`;
  return 'SIN INICIAR';
}

export async function generarExcelAccidentalidad(
  empresaId: string,
  empresaNombre: string
): Promise<ResultadoExcel> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc('listar_eventos', { p_empresa: empresaId });
  if (error) return { ok: false, error: 'No se pudieron leer los eventos.' };

  const eventos = (data ?? []) as Evento[];
  const libro = XLSX.utils.book_new();

  agregarHoja(
    libro,
    'Eventos',
    eventos.map((e) => ({
      'Código': e.codigo ?? '',
      'Tipo': TIPOS[e.tipo] ?? e.tipo,
      'Fecha': fecha(e.fecha_evento),
      'Trabajador': e.nombres ?? '',
      'Identificación': e.identificacion ?? '',
      'Área': e.area ?? '',
      'Lugar': e.lugar ?? '',
      'Descripción': e.descripcion ?? '',
      'Grave': siNo(e.grave),
      'Mortal': siNo(e.mortal),
      'Días de incapacidad': e.dias_incapacidad ?? 0,
      'Reportado a la ARL': siNo(e.reportado_arl),
      'Fecha de reporte': fecha(e.fecha_reporte_arl),
      'Estado': ESTADOS[e.estado] ?? e.estado,
      'Investigación': estadoInvestigacion(e),
      'Fecha de cierre': fecha(e.fecha_cierre),
      'Causas básicas': e.causas_basicas ?? '',
      'Acciones generadas': e.acciones ?? 0,
    })),
    [12, 22, 12, 26, 14, 16, 20, 40, 8, 8, 18, 18, 16, 18, 20, 14, 36, 16]
  );

  // ---------- Resumen del periodo ----------
  const anio = new Date().getFullYear();
  const delAnio = eventos.filter((e) => e.fecha_evento?.slice(0, 4) === String(anio));
  const cuenta = (t: string) => delAnio.filter((e) => e.tipo === t).length;

  agregarHoja(
    libro,
    `Resumen ${anio}`,
    [
      { 'Concepto': 'Accidentes de trabajo', 'Cantidad': cuenta('accidente') },
      { 'Concepto': 'Incidentes', 'Cantidad': cuenta('incidente') },
      { 'Concepto': 'Casi-accidentes', 'Cantidad': cuenta('casi_accidente') },
      { 'Concepto': 'Enfermedades laborales', 'Cantidad': cuenta('enfermedad_laboral') },
      { 'Concepto': 'Eventos graves', 'Cantidad': delAnio.filter((e) => e.grave).length },
      { 'Concepto': 'Eventos mortales', 'Cantidad': delAnio.filter((e) => e.mortal).length },
      { 'Concepto': 'Días de incapacidad', 'Cantidad': delAnio.reduce((t, e) => t + (e.dias_incapacidad ?? 0), 0) },
      { 'Concepto': 'Sin reportar a la ARL', 'Cantidad': delAnio.filter((e) => !e.reportado_arl).length },
      { 'Concepto': 'Investigaciones vencidas', 'Cantidad': delAnio.filter((e) => e.investigacion_vencida).length },
      { 'Concepto': 'Investigaciones cerradas', 'Cantidad': delAnio.filter((e) => e.estado === 'cerrado').length },
    ],
    [30, 12]
  );

  return cerrarLibro(libro, 'Accidentalidad', empresaNombre);
}
