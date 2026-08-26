/**
 * TIPOS Y UTILIDADES COMPARTIDAS
 */

export type EstadoCapacitacion = 'activa' | 'inactiva' | 'cerrada';

export type Capacitacion = {
  id: string;
  org_id: string;
  codigo: string;
  tema: string;
  descripcion: string | null;
  instructor: string;
  empresa: string;
  es_empresa_propia: boolean;
  empresa_id: string;
  empresa_nombre: string;
  empresa_slug: string;
  es_evaluada: boolean;
  /** Marcadas al crear; deciden qué se habilita en el detalle. */
  validar_empleados: boolean;
  incluir_firma_profesional: boolean;
  /** La vista añade si YA existe una evaluación creada. */
  tiene_evaluacion?: boolean;
  /** Control documental congelado al crear el acta (no cambia despues). */
  nomenclatura: string | null;
  version_doc: string | null;
  titulo_doc: string | null;
  fecha_inicio: string;
  fecha_fin: string;
  estado: EstadoCapacitacion;
  esperados: number | null;
  firma_instructor_url: string | null;
  created_at: string;
  registrados: number;
  porcentaje_participacion: number;
  instructor_firmo: boolean;
  en_horario: boolean;
};

export type Participante = {
  id: string;
  nombres: string;
  cargo: string;
  /** Area dentro de la empresa capacitada (antes se llamaba "empresa"). */
  area: string;
  ciudad: string;
  identificacion: string;
  firma_url: string | null;
  created_at: string;
  puntaje_evaluacion: number | null;
  aprobo: boolean | null;
};

/** Fecha legible en formato colombiano. */
export function fmtFecha(iso: string): string {
  return new Date(iso).toLocaleString('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function fmtSoloFecha(iso: string): string {
  return new Date(iso).toLocaleDateString('es-CO', { dateStyle: 'medium' });
}

/** Convierte ISO a value de <input type="datetime-local">. */
export function aDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
}

/** Color del semaforo de participacion. */
export function colorParticipacion(p: number): { fondo: string; texto: string } {
  if (p >= 80) return { fondo: '#dcfce7', texto: '#15803d' };
  if (p >= 50) return { fondo: '#fef9c3', texto: '#a16207' };
  return { fondo: '#fee2e2', texto: '#b91c1c' };
}

export const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

/**
 * Validacion compartida. Se ejecuta en el SERVIDOR dentro de las
 * Server Actions: nunca confiar solo en la validacion del navegador.
 */
export function validarCapacitacion(d: {
  tema: string;
  instructor: string;
  fecha_inicio: string;
  fecha_fin: string;
  esperados?: string | number | null;
}): string | null {
  if (!d.tema?.trim()) return 'El tema es obligatorio.';
  if (!d.instructor?.trim()) return 'El instructor es obligatorio.';
  if (!d.fecha_inicio || !d.fecha_fin) return 'Las fechas son obligatorias.';
  if (new Date(d.fecha_fin) <= new Date(d.fecha_inicio)) {
    return 'La fecha de fin debe ser posterior a la de inicio.';
  }
  if (d.esperados !== null && d.esperados !== undefined && d.esperados !== '') {
    const n = Number(d.esperados);
    if (isNaN(n) || n <= 0) return 'El número de participantes esperados debe ser mayor a cero.';
  }
  return null;
}
