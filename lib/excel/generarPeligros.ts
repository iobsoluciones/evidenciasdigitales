/**
 * MATRIZ DE PELIGROS EN EXCEL — GTC 45
 * ---------------------------------------------------------------
 * Es el documento que más se pide y el único módulo grande que no se
 * podía sacar de la aplicación. Y tiene que ser Excel: la matriz de
 * peligros se entrega, se revisa con el COPASST y se compara con la
 * del año pasado, y eso no se hace sobre un PDF.
 *
 * Dos hojas:
 *
 *   Matriz   — una fila por peligro, con la valoración completa y la
 *              jerarquía de controles de la GTC 45.
 *   Resumen  — cuántos peligros hay en cada nivel. Es lo que se mira
 *              primero en una revisión por la dirección.
 *
 * Los números de la valoración (NP, NR, nivel, aceptabilidad) NO se
 * recalculan aquí: son columnas generadas en la base (§5 del proyecto),
 * así que el Excel dice exactamente lo mismo que la pantalla. Volver a
 * calcularlos en el reporte sería abrir la puerta a que un día no
 * coincidan.
 */
import * as XLSX from 'xlsx';
import { crearClienteServidor } from '../supabase/servidor';
import { agregarHoja, cerrarLibro, siNo, type ResultadoExcel } from './hoja';

type Peligro = {
  codigo: string | null;
  proceso: string | null;
  zona: string | null;
  actividad: string | null;
  rutinaria: boolean | null;
  clasificacion: string | null;
  descripcion: string | null;
  efectos_posibles: string | null;
  num_expuestos: number | null;
  control_fuente: string | null;
  control_medio: string | null;
  control_individuo: string | null;
  nd: number | null; ne: number | null; np: number | null;
  nc: number | null; nr: number | null;
  nivel: string | null;
  aceptabilidad: string | null;
  peor_consecuencia: string | null;
  requisito_legal: string | null;
  m_eliminacion: string | null;
  m_sustitucion: string | null;
  m_ingenieria: string | null;
  m_administrativo: string | null;
  m_epp: string | null;
  controles: number | null;
};

const CLASES: Record<string, string> = {
  fisico: 'FÍSICO',
  quimico: 'QUÍMICO',
  biologico: 'BIOLÓGICO',
  biomecanico: 'BIOMECÁNICO',
  psicosocial: 'PSICOSOCIAL',
  condiciones_seguridad: 'CONDICIONES DE SEGURIDAD',
  fenomenos_naturales: 'FENÓMENOS NATURALES',
};

const ORDEN_NIVEL = ['I', 'II', 'III', 'IV'];

export async function generarExcelPeligros(
  empresaId: string,
  empresaNombre: string
): Promise<ResultadoExcel> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc('listar_peligros', { p_empresa: empresaId });

  if (error) return { ok: false, error: 'No se pudo leer la matriz de peligros.' };
  const peligros = (data ?? []) as Peligro[];

  const libro = XLSX.utils.book_new();

  agregarHoja(
    libro,
    'Matriz',
    peligros.map((p) => ({
      'Código': p.codigo ?? '',
      'Proceso': p.proceso ?? '',
      'Zona o lugar': p.zona ?? '',
      'Actividad': p.actividad ?? '',
      'Rutinaria': siNo(p.rutinaria),
      'Clasificación': CLASES[p.clasificacion ?? ''] ?? (p.clasificacion ?? ''),
      'Peligro': p.descripcion ?? '',
      'Efectos posibles': p.efectos_posibles ?? '',
      'Expuestos': p.num_expuestos ?? 0,
      // Controles que YA existen, que es lo que valora la GTC 45 antes
      // de puntuar. Van antes de los números a propósito.
      'Control en la fuente': p.control_fuente ?? '',
      'Control en el medio': p.control_medio ?? '',
      'Control en el individuo': p.control_individuo ?? '',
      'ND': p.nd ?? '',
      'NE': p.ne ?? '',
      'NP (ND×NE)': p.np ?? '',
      'NC': p.nc ?? '',
      'NR (NP×NC)': p.nr ?? '',
      'Nivel': p.nivel ?? '',
      'Aceptabilidad': p.aceptabilidad ?? '',
      'Peor consecuencia': p.peor_consecuencia ?? '',
      'Requisito legal': p.requisito_legal ?? '',
      // Medidas de intervención, en el orden de la jerarquía de
      // controles: eliminar antes que sustituir, y el EPP el último.
      'M. eliminación': p.m_eliminacion ?? '',
      'M. sustitución': p.m_sustitucion ?? '',
      'M. ingeniería': p.m_ingenieria ?? '',
      'M. administrativos': p.m_administrativo ?? '',
      'M. EPP': p.m_epp ?? '',
      'Controles enlazados': p.controles ?? 0,
    })),
    [10, 16, 16, 26, 10, 20, 30, 26, 10, 24, 24, 24,
     6, 6, 12, 6, 12, 8, 16, 22, 22, 20, 20, 20, 20, 20, 12]
  );

  // ---------- Resumen por nivel ----------
  const porNivel = ORDEN_NIVEL.map((n) => {
    const del = peligros.filter((p) => p.nivel === n);
    return {
      'Nivel de riesgo': n,
      'Peligros': del.length,
      'Trabajadores expuestos': del.reduce((t, p) => t + (p.num_expuestos ?? 0), 0),
      'Sin control enlazado': del.filter((p) => (p.controles ?? 0) === 0).length,
    };
  });

  porNivel.push({
    'Nivel de riesgo': 'TOTAL',
    'Peligros': peligros.length,
    'Trabajadores expuestos': peligros.reduce((t, p) => t + (p.num_expuestos ?? 0), 0),
    'Sin control enlazado': peligros.filter((p) => (p.controles ?? 0) === 0).length,
  });

  agregarHoja(libro, 'Resumen', porNivel, [18, 12, 24, 22]);

  return cerrarLibro(libro, 'Matriz_de_peligros', empresaNombre);
}
