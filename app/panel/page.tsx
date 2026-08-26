/**
 * CARTERA DE EMPRESAS
 * ---------------------------------------------------------------
 * Pantalla de inicio del consultor: una tarjeta por empresa con su
 * estado. Es la vista que responde "¿cómo van mis clientes?" antes
 * de entrar a ninguno.
 */
import Link from 'next/link';
import { crearClienteServidor } from '@/lib/supabase/servidor';
import { obtenerPerfil } from '@/lib/sesion';
import TarjetasEmpresas from './TarjetasEmpresas';

export type EmpresaResumen = {
  id: string;
  slug: string;
  nombre: string;
  ciudad: string | null;
  logo_url: string | null;
  color_primario: string;
  nomenclatura: string | null;
  capacitaciones: number;
  participantes: number;
  empleados: number;
  activas: number;
  ultima: string | null;
  /** Siguiente capacitacion por ocurrir; null si no hay ninguna programada. */
  proxima: string | null;
  participacion: number | null;
};

export default async function PaginaCartera() {
  const supabase = await crearClienteServidor();
  const perfil = await obtenerPerfil();

  const { data } = await supabase.rpc('resumen_empresas');
  const empresas = (data ?? []) as EmpresaResumen[];

  const { data: limite } = await supabase.rpc('puede_crear_empresa');
  const lim = (limite ?? { puede: true }) as {
    puede: boolean; usadas?: number; limite?: number | null; motivo?: string;
  };

  return (
    <TarjetasEmpresas
      empresas={empresas}
      puedeAgregar={lim.puede}
      usadas={lim.usadas ?? empresas.length}
      tope={lim.limite ?? null}
      plan={perfil?.organizacion.plan ?? ''}
    />
  );
}
