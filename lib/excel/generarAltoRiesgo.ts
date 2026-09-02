/**
 * CONTRATISTAS Y ALTO RIESGO EN EXCEL
 * ---------------------------------------------------------------
 * Dos módulos en un libro porque se auditan juntos: quien entra a hacer
 * un trabajo de alto riesgo casi siempre es un contratista, y las dos
 * preguntas de la visita son las mismas —¿tenía los papeles al día? y
 * ¿tenía permiso vigente?—.
 *
 *   Contratistas — con la fecha en que vence cada evaluación
 *   Permisos     — emitidos, con su vigencia y sus firmas
 *
 * Lo que hace útil la hoja de contratistas no es la ficha sino las
 * columnas de vencimiento: una planilla de aportes de hace cuatro meses
 * no prueba nada, y una afiliación verificada en enero puede estar
 * cancelada hoy.
 */
import * as XLSX from 'xlsx';
import { crearClienteServidor } from '../supabase/servidor';
import { agregarHoja, cerrarLibro, fecha, siNo, type ResultadoExcel } from './hoja';

type Contratista = {
  nombre: string; nit: string | null; objeto: string | null;
  arl: string | null; clase_riesgo: string | null;
  fecha_inicio: string | null; fecha_fin: string | null;
  estado: string; concepto: string | null;
  fecha_evaluacion: string | null;
  pendientes: number | null; vencidos: number | null;
  personas: number | null; contrato_vencido: boolean | null;
};

type Permiso = {
  codigo: string | null; tipo: string; descripcion: string | null;
  lugar: string | null; ejecutor: string | null; contratista: string | null;
  fecha: string; hora_inicio: string | null; hora_fin: string | null;
  estado: string; vencido: boolean | null;
  personas: number | null;
  sin_firmar: number | null; sin_verificar: number | null;
};

const TIPOS_PERMISO: Record<string, string> = {
  alturas: 'TRABAJO EN ALTURAS',
  espacios_confinados: 'ESPACIOS CONFINADOS',
  trabajo_caliente: 'TRABAJO EN CALIENTE',
  electrico: 'RIESGO ELÉCTRICO',
  izaje: 'IZAJE DE CARGAS',
  excavacion: 'EXCAVACIÓN',
};

const ESTADOS_PERMISO: Record<string, string> = {
  borrador: 'BORRADOR', autorizado: 'AUTORIZADO',
  cerrado: 'CERRADO', cancelado: 'CANCELADO',
};

const CONCEPTOS: Record<string, string> = {
  aprobado: 'APROBADO',
  aprobado_con_condiciones: 'APROBADO CON CONDICIONES',
  rechazado: 'RECHAZADO',
};

export async function generarExcelAltoRiesgo(
  empresaId: string,
  empresaNombre: string
): Promise<ResultadoExcel> {
  const supabase = await crearClienteServidor();
  const libro = XLSX.utils.book_new();

  // ---------- Contratistas ----------
  const { data: dCon, error } = await supabase.rpc('listar_contratistas', {
    p_empresa: empresaId,
  });
  if (error) return { ok: false, error: 'No se pudieron leer los contratistas.' };
  const contratistas = (dCon ?? []) as Contratista[];

  agregarHoja(
    libro,
    'Contratistas',
    contratistas.map((c) => ({
      'Contratista': c.nombre,
      'NIT': c.nit ?? '',
      'Objeto del contrato': c.objeto ?? '',
      'ARL': c.arl ?? '',
      'Clase de riesgo': c.clase_riesgo ?? '',
      'Inicio': fecha(c.fecha_inicio),
      'Fin': fecha(c.fecha_fin),
      'Contrato vencido': siNo(c.contrato_vencido),
      'Estado': c.estado?.toUpperCase() ?? '',
      'Concepto': CONCEPTOS[c.concepto ?? ''] ?? (c.concepto ?? ''),
      'Evaluado el': fecha(c.fecha_evaluacion),
      'Requisitos pendientes': c.pendientes ?? 0,
      'Requisitos vencidos': c.vencidos ?? 0,
      'Personas en planta': c.personas ?? 0,
    })),
    [30, 14, 38, 20, 14, 12, 12, 16, 14, 24, 14, 20, 18, 18]
  );

  // ---------- Permisos de alto riesgo ----------
  const { data: dPer } = await supabase.rpc('listar_permisos', { p_empresa: empresaId });
  const permisos = (dPer ?? []) as Permiso[];

  agregarHoja(
    libro,
    'Permisos de alto riesgo',
    permisos.map((p) => ({
      'Código': p.codigo ?? '',
      'Tipo de tarea': TIPOS_PERMISO[p.tipo] ?? p.tipo,
      'Fecha': fecha(p.fecha),
      'Desde': p.hora_inicio ?? '',
      'Hasta': p.hora_fin ?? '',
      'Estado': ESTADOS_PERMISO[p.estado] ?? p.estado,
      // Un permiso vale para una tarea y una franja horaria: fuera de
      // ahí no autoriza nada, y en papel eso no se ve.
      'Vencido': siNo(p.vencido),
      'Lugar': p.lugar ?? '',
      'Descripción': p.descripcion ?? '',
      'Ejecutor': p.ejecutor ?? '',
      'Contratista': p.contratista ?? '',
      'Personas': p.personas ?? 0,
      'Firmas pendientes': p.sin_firmar ?? 0,
      'Requisitos sin verificar': p.sin_verificar ?? 0,
    })),
    [12, 24, 12, 10, 10, 14, 10, 22, 38, 24, 24, 10, 18, 22]
  );

  return cerrarLibro(libro, 'Contratistas_y_alto_riesgo', empresaNombre);
}
