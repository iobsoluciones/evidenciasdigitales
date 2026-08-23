/**
 * Raiz del sitio: redirige al panel.
 * El middleware se encarga de mandar al login si no hay sesion.
 */
import { redirect } from 'next/navigation';

export default function Inicio() {
  redirect('/panel');
}
