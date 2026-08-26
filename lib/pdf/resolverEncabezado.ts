/**
 * QUÉ ENCABEZADO LLEVA UN DOCUMENTO
 * ---------------------------------------------------------------
 * El diseño se congela, pero NO al crear el registro: al emitirlo.
 *
 * Es el mismo principio de "borrador → firma" que ya rige el
 * inventario: lo que se fija, se fija cuando el documento se convierte
 * en evidencia, no cuando nace el borrador. Congelarlo al crear hacía
 * que una capacitación programada la semana pasada saliera con el
 * encabezado antiguo aunque nunca se hubiera emitido nada, y que los
 * documentos anteriores a esta función no pudieran adoptar ningún
 * diseño jamás.
 *
 * Reglas:
 *   - Documento ya emitido y con diseño guardado → el suyo, intacto.
 *   - Borrador, o registro anterior a esta función → el vigente de la
 *     empresa, que es el que se aplicará cuando se emita.
 */
import type { EncabezadoConfig } from './EncabezadoDoc';

function vacio(c: unknown): boolean {
  return !c || typeof c !== 'object' || Object.keys(c as object).length === 0;
}

export function resolverEncabezado(
  congelado: unknown,
  vigenteEmpresa: unknown,
  emitido: boolean
): EncabezadoConfig | null {
  if (emitido && !vacio(congelado)) return congelado as EncabezadoConfig;
  if (!vacio(vigenteEmpresa)) return vigenteEmpresa as EncabezadoConfig;
  return null;
}
