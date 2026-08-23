'use server';

/**
 * CARGA MASIVA DE UNIDADES Y TOKEN DE FIRMA REMOTA
 */
import { revalidatePath } from 'next/cache';
import { crearClienteServidor } from './supabase/servidor';
import { obtenerPerfil } from './sesion';
import { empresaActiva } from './empresa-activa';

export type ResultadoCarga = {
  ok: boolean;
  mensaje: string;
  procesadas: number;
  errores: string[];
};

export type ResultadoToken = {
  ok: boolean;
  mensaje: string;
  token?: string;
  enlace?: string;
};

/**
 * Carga varias unidades de un mismo artículo.
 * upsert sobre (empresa_id, placa): volver a subir la planilla
 * actualiza en vez de duplicar.
 */
export async function cargarUnidades(
  articuloId: string,
  filas: Array<{
    placa: string;
    serial: string;
    fecha_compra: string;
    garantia_hasta: string;
    observaciones: string;
  }>
): Promise<ResultadoCarga> {
  const perfil = await obtenerPerfil();
  const empresa = await empresaActiva();
  if (!perfil || !empresa) {
    return { ok: false, mensaje: 'No hay empresa seleccionada.', procesadas: 0, errores: [] };
  }

  const supabase = await crearClienteServidor();

  // El artículo debe ser retornable: los consumibles no tienen unidades
  const { data: art } = await supabase
    .from('articulos')
    .select('tipo, nombre')
    .eq('id', articuloId)
    .maybeSingle();

  if (!art) return { ok: false, mensaje: 'Artículo no encontrado.', procesadas: 0, errores: [] };
  if (art.tipo !== 'retornable') {
    return {
      ok: false,
      mensaje: 'Solo los equipos tienen unidades. Los consumibles se controlan por cantidad.',
      procesadas: 0, errores: [],
    };
  }

  const errores: string[] = [];
  const validas: Array<Record<string, unknown>> = [];
  const vistas = new Set<string>();

  filas.forEach((f, i) => {
    const linea = i + 2;                       // +2: encabezado y base 1
    const placa = f.placa.trim().toUpperCase();

    if (!placa) { errores.push(`Fila ${linea}: placa vacía.`); return; }
    if (vistas.has(placa)) {
      errores.push(`Fila ${linea}: placa ${placa} repetida en el archivo.`);
      return;
    }

    vistas.add(placa);
    validas.push({
      org_id: perfil.organizacion.id,
      empresa_id: empresa.id,
      articulo_id: articuloId,
      placa,
      serial: f.serial.trim().toUpperCase() || null,
      fecha_compra: f.fecha_compra || null,
      garantia_hasta: f.garantia_hasta || null,
      observaciones: f.observaciones.trim() || null,
      activo: true,
    });
  });

  if (validas.length === 0) {
    return {
      ok: false,
      mensaje: 'No se encontró ninguna fila válida.',
      procesadas: 0,
      errores: errores.slice(0, 20),
    };
  }

  const { error } = await supabase
    .from('articulo_unidades')
    .upsert(validas, { onConflict: 'empresa_id,placa' });

  if (error) {
    return {
      ok: false,
      mensaje: 'Error al guardar: ' + error.message,
      procesadas: 0,
      errores: errores.slice(0, 20),
    };
  }

  revalidatePath(`/panel/dotacion/${articuloId}`);
  revalidatePath('/panel/dotacion');

  return {
    ok: true,
    mensaje: `${validas.length} unidad(es) cargada(s).` +
             (errores.length ? ` ${errores.length} fila(s) omitida(s).` : ''),
    procesadas: validas.length,
    errores: errores.slice(0, 20),
  };
}

/**
 * Genera el enlace de firma remota para una entrega en borrador.
 * Se reutiliza si ya existe: regenerarlo invalidaría un enlace que
 * quizá ya se compartió.
 */
export async function generarEnlaceFirma(entregaId: string): Promise<ResultadoToken> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc('generar_token_entrega', {
    p_entrega: entregaId,
  });

  if (error) return { ok: false, mensaje: error.message };

  const r = data as { ok: boolean; error?: string; token?: string; nuevo?: boolean };
  if (!r.ok) return { ok: false, mensaje: r.error ?? 'No se pudo generar el enlace.' };

  revalidatePath(`/panel/dotacion/entregas/${entregaId}`);

  return {
    ok: true,
    mensaje: r.nuevo ? 'Enlace generado.' : 'Enlace vigente recuperado.',
    token: r.token,
    enlace: `/d/${r.token}`,
  };
}
