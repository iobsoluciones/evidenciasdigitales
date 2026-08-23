'use server';

/**
 * EMPLEADOS DE LA EMPRESA
 * ---------------------------------------------------------------
 * Base contra la que se valida al asistente en el registro público.
 * Con esto la capacitación deja de aceptar cualquier cédula.
 *
 * La carga masiva usa upsert por (empresa_id, identificacion): volver
 * a subir la misma plantilla actualiza los datos en vez de duplicar,
 * que es lo que quiere quien mantiene una nómina que cambia.
 */
import { revalidatePath } from 'next/cache';
import { crearClienteServidor } from './supabase/servidor';
import { obtenerPerfil } from './sesion';
import { empresaActiva } from './empresa-activa';

export type Empleado = {
  id: string;
  identificacion: string;
  nombres: string;
  cargo: string | null;
  area: string | null;
  ciudad: string | null;
  activo: boolean;
};

export type Resultado = { ok: boolean; mensaje: string };

export type ResultadoCarga = {
  ok: boolean;
  mensaje: string;
  procesados: number;
  omitidos: number;
  errores: string[];
};

/** Empleados de la empresa activa. */
export async function listarEmpleados(): Promise<Empleado[]> {
  const empresa = await empresaActiva();
  if (!empresa) return [];

  const supabase = await crearClienteServidor();
  const { data } = await supabase
    .from('empleados')
    .select('id, identificacion, nombres, cargo, area, ciudad, activo')
    .eq('empresa_id', empresa.id)
    .eq('activo', true)
    .order('nombres');

  return (data ?? []) as Empleado[];
}

export async function agregarEmpleado(datos: {
  identificacion: string;
  nombres: string;
  cargo: string;
  area: string;
  ciudad: string;
}): Promise<Resultado> {
  const perfil = await obtenerPerfil();
  const empresa = await empresaActiva();
  if (!perfil || !empresa) return { ok: false, mensaje: 'No hay empresa seleccionada.' };

  const id = datos.identificacion.replace(/[^0-9]/g, '');
  if (!id) return { ok: false, mensaje: 'La identificación debe contener solo números.' };
  if (!datos.nombres.trim()) return { ok: false, mensaje: 'El nombre es obligatorio.' };

  const supabase = await crearClienteServidor();
  const { error } = await supabase.from('empleados').insert({
    org_id: perfil.organizacion.id,
    empresa_id: empresa.id,
    identificacion: id,
    nombres: datos.nombres,
    cargo: datos.cargo || null,
    area: datos.area || null,
    ciudad: datos.ciudad || null,
  });

  if (error) {
    if (error.code === '23505') {
      return { ok: false, mensaje: 'Esa identificación ya está registrada en esta empresa.' };
    }
    return { ok: false, mensaje: error.message };
  }

  // Los valores nuevos se suman a las listas maestras
  const nuevos = [
    { tipo: 'cargo', valor: datos.cargo },
    { tipo: 'area', valor: datos.area },
    { tipo: 'ciudad', valor: datos.ciudad },
  ]
    .filter((x) => x.valor.trim())
    .map((x) => ({
      org_id: perfil.organizacion.id,
      empresa_id: empresa.id,
      tipo: x.tipo,
      valor: x.valor.trim().toUpperCase(),
    }));

  if (nuevos.length > 0) {
    await supabase
      .from('catalogos')
      .upsert(nuevos, { onConflict: 'org_id,tipo,valor', ignoreDuplicates: true });
  }

  revalidatePath('/panel/configuracion');
  return { ok: true, mensaje: 'Empleado agregado.' };
}

export async function actualizarEmpleado(
  id: string,
  datos: { nombres: string; cargo: string; area: string; ciudad: string }
): Promise<Resultado> {
  if (!datos.nombres.trim()) return { ok: false, mensaje: 'El nombre es obligatorio.' };

  const supabase = await crearClienteServidor();
  const { error } = await supabase
    .from('empleados')
    .update({
      nombres: datos.nombres,
      cargo: datos.cargo || null,
      area: datos.area || null,
      ciudad: datos.ciudad || null,
    })
    .eq('id', id);

  if (error) return { ok: false, mensaje: error.message };

  revalidatePath('/panel/configuracion');
  return { ok: true, mensaje: 'Empleado actualizado.' };
}

/**
 * Se desactiva en vez de borrar: las asistencias históricas siguen
 * teniendo sentido aunque la persona ya no esté en la empresa.
 */
export async function retirarEmpleado(id: string): Promise<Resultado> {
  const supabase = await crearClienteServidor();
  const { error } = await supabase
    .from('empleados')
    .update({ activo: false })
    .eq('id', id);

  if (error) return { ok: false, mensaje: error.message };

  revalidatePath('/panel/configuracion');
  return { ok: true, mensaje: 'Empleado retirado de la base.' };
}

/**
 * Carga masiva desde la plantilla.
 * El navegador lee el Excel y envía las filas ya convertidas: así no
 * hay que subir el archivo ni procesarlo en el servidor.
 */
export async function cargarEmpleados(
  filas: Array<{
    identificacion: string;
    nombres: string;
    cargo?: string;
    area?: string;
    ciudad?: string;
  }>
): Promise<ResultadoCarga> {
  const perfil = await obtenerPerfil();
  const empresa = await empresaActiva();
  if (!perfil || !empresa) {
    return { ok: false, mensaje: 'No hay empresa seleccionada.', procesados: 0, omitidos: 0, errores: [] };
  }

  const errores: string[] = [];
  const validas: Array<Record<string, unknown>> = [];
  const vistas = new Set<string>();

  filas.forEach((f, i) => {
    const linea = i + 2;   // +2: encabezado y base 1
    const id = String(f.identificacion ?? '').replace(/[^0-9]/g, '');
    const nombre = String(f.nombres ?? '').trim();

    if (!id) { errores.push(`Fila ${linea}: identificación vacía o sin números.`); return; }
    if (!nombre) { errores.push(`Fila ${linea}: nombre vacío.`); return; }
    if (vistas.has(id)) { errores.push(`Fila ${linea}: identificación ${id} repetida en el archivo.`); return; }

    vistas.add(id);
    validas.push({
      org_id: perfil.organizacion.id,
      empresa_id: empresa.id,
      identificacion: id,
      nombres: nombre,
      cargo: String(f.cargo ?? '').trim() || null,
      area: String(f.area ?? '').trim() || null,
      ciudad: String(f.ciudad ?? '').trim() || null,
      activo: true,
    });
  });

  if (validas.length === 0) {
    return {
      ok: false,
      mensaje: 'No se encontró ninguna fila válida.',
      procesados: 0,
      omitidos: errores.length,
      errores: errores.slice(0, 20),
    };
  }

  const supabase = await crearClienteServidor();

  // upsert: volver a subir la plantilla actualiza en vez de duplicar
  const { error } = await supabase
    .from('empleados')
    .upsert(validas, { onConflict: 'empresa_id,identificacion' });

  if (error) {
    return {
      ok: false,
      mensaje: 'Error al guardar: ' + error.message,
      procesados: 0,
      omitidos: filas.length,
      errores: errores.slice(0, 20),
    };
  }

  // COHERENCIA CON LAS LISTAS MAESTRAS: los valores de cargo, area y
  // ciudad que llegan en el archivo se agregan al catalogo. De lo
  // contrario el desplegable del formulario publico no los ofreceria
  // y el asistente tendria que escribirlos a mano, que es justo lo
  // que las listas existen para evitar.
  const catalogo: Array<{ org_id: string; empresa_id: string; tipo: string; valor: string }> = [];
  const agregar = (tipo: string, valor: unknown) => {
    const v = String(valor ?? '').trim().toUpperCase();
    if (!v) return;
    if (catalogo.some((c) => c.tipo === tipo && c.valor === v)) return;
    catalogo.push({
      org_id: perfil.organizacion.id,
      empresa_id: empresa.id,
      tipo, valor: v,
    });
  };

  for (const f of validas) {
    agregar('cargo', f.cargo);
    agregar('area', f.area);
    agregar('ciudad', f.ciudad);
  }

  if (catalogo.length > 0) {
    await supabase
      .from('catalogos')
      .upsert(catalogo, { onConflict: 'org_id,tipo,valor', ignoreDuplicates: true });
  }

  revalidatePath('/panel/configuracion');

  return {
    ok: true,
    mensaje: `${validas.length} empleado(s) cargado(s).` +
             (errores.length ? ` ${errores.length} fila(s) omitida(s).` : ''),
    procesados: validas.length,
    omitidos: errores.length,
    errores: errores.slice(0, 20),
  };
}
