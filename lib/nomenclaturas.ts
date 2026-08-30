/**
 * NOMENCLATURA POR TIPO DE DOCUMENTO
 * ---------------------------------------------------------------
 * Antes había UNA nomenclatura por empresa para todo. En un SG-SST
 * real cada formato tiene su propio código de control documental y su
 * propia versión, y avanzan a ritmos distintos: la lista de asistencia
 * puede ir por la V3 mientras el acta de entrega sigue en la V1.
 *
 * Módulo puro (sin 'use server'): lo importan tanto componentes de
 * servidor como Server Actions.
 */

export type TipoDocumento =
  | 'capacitacion'
  | 'entrega'
  | 'devolucion'
  | 'inspeccion'
  | 'investigacion'
  | 'plan_anual'
  | 'autoevaluacion'
  | 'comite'
  | 'emergencias'
  | 'simulacro'
  | 'reporte';

export type Nomenclatura = { nomenclatura: string; version: string };
export type MapaNomenclaturas = Partial<Record<TipoDocumento, Nomenclatura>>;

/** Orden y etiquetas de la pantalla de configuración. */
export const TIPOS_DOCUMENTO: {
  tipo: TipoDocumento;
  etiqueta: string;
  detalle: string;
}[] = [
  {
    tipo: 'capacitacion',
    etiqueta: 'Acta de capacitación',
    detalle: 'Lista de asistencia y acta de la sesión.',
  },
  {
    tipo: 'entrega',
    etiqueta: 'Acta de entrega',
    detalle: 'Entrega de dotación y equipos, con firma de quien recibe.',
  },
  {
    tipo: 'devolucion',
    etiqueta: 'Acta de devolución',
    detalle: 'Devolución de un equipo retornable, con su estado.',
  },
  {
    tipo: 'inspeccion',
    etiqueta: 'Informe de inspección',
    detalle: 'Informe con veredicto, hallazgos y evidencia.',
  },
  {
    tipo: 'investigacion',
    etiqueta: 'Informe de investigación',
    detalle: 'Investigación de accidentes, incidentes y enfermedades laborales.',
  },
  {
    tipo: 'plan_anual',
    etiqueta: 'Plan anual de trabajo',
    detalle: 'Plan anual del SG-SST, firmado por el empleador.',
  },
  {
    tipo: 'autoevaluacion',
    etiqueta: 'Autoevaluación de estándares',
    detalle: 'Autoevaluación anual de la Resolución 0312.',
  },
  {
    tipo: 'comite',
    etiqueta: 'Actas de comités',
    detalle: 'COPASST, Vigía en SST y Comité de Convivencia Laboral.',
  },
  {
    tipo: 'emergencias',
    etiqueta: 'Análisis de amenazas',
    detalle: 'Anexo técnico del plan de emergencias, por metodología de colores.',
  },
  {
    tipo: 'simulacro',
    etiqueta: 'Acta de simulacro',
    detalle: 'Resultados del simulacro, con las firmas del equipo evaluador.',
  },
  {
    tipo: 'reporte',
    etiqueta: 'Reportes',
    detalle: 'Cronograma, reporte ejecutivo y libros de Excel.',
  },
];

/**
 * Resuelve qué nomenclatura mostrar.
 *
 * Misma regla que el encabezado (§5.14 del CLAUDE.md): lo congelado
 * manda SOLO si el documento ya se emitió. Mientras siga siendo un
 * borrador se muestra lo vigente de la empresa, porque un borrador aún
 * no es un documento y no tiene por qué llevar una identificación
 * antigua.
 */
export function resolverNomenclatura(
  congelada: { nomenclatura?: string | null; version?: string | null } | null,
  vigentes: MapaNomenclaturas | null | undefined,
  tipo: TipoDocumento,
  emitido: boolean,
  respaldo?: { nomenclatura?: string | null; version?: string | null } | null
): Nomenclatura {
  if (emitido && congelada?.nomenclatura) {
    return {
      nomenclatura: congelada.nomenclatura,
      version: congelada.version ?? 'V1',
    };
  }

  const vigente = vigentes?.[tipo];
  if (vigente?.nomenclatura) return vigente;

  // Empresas dadas de alta antes de separar por tipo.
  return {
    nomenclatura: respaldo?.nomenclatura ?? '',
    version: respaldo?.version ?? 'V1',
  };
}

/** Normaliza lo que llega de la base, que es jsonb sin garantías. */
export function leerMapa(valor: unknown): MapaNomenclaturas {
  if (!valor || typeof valor !== 'object') return {};
  const bruto = valor as Record<string, unknown>;
  const salida: MapaNomenclaturas = {};

  for (const { tipo } of TIPOS_DOCUMENTO) {
    const item = bruto[tipo];
    if (item && typeof item === 'object') {
      const { nomenclatura, version } = item as Record<string, unknown>;
      salida[tipo] = {
        nomenclatura: typeof nomenclatura === 'string' ? nomenclatura : '',
        version: typeof version === 'string' && version ? version : 'V1',
      };
    }
  }
  return salida;
}
