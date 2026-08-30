/**
 * CAMBIO OBLIGATORIO DE CONTRASEÑA
 * ---------------------------------------------------------------
 * Pantalla de paso para las cuentas creadas con el registro directo:
 * la contraseña la generó el servidor, así que no es secreta hasta
 * que el usuario pone la suya.
 *
 * Vive fuera de /panel para que el bloqueo no se pueda esquivar
 * navegando a otra ruta: el layout del panel redirige aquí mientras
 * la marca siga puesta.
 */
import { redirect } from 'next/navigation';
import { obtenerPerfil } from '@/lib/sesion';
import FormularioClaveInicial from './FormularioClaveInicial';

export const dynamic = 'force-dynamic';

export default async function PaginaClaveInicial() {
  const perfil = await obtenerPerfil();
  if (!perfil) redirect('/login');

  // Quien ya tiene contraseña propia no tiene nada que hacer aquí.
  if (!perfil.debeCambiarClave) redirect('/panel');

  return <FormularioClaveInicial correo={perfil.correo} nombre={perfil.nombre} />;
}
