/**
 * ALTA DE EMPRESA
 */
import { redirect } from 'next/navigation';
import { crearClienteServidor } from '@/lib/supabase/servidor';
import FormularioEmpresa from '../FormularioEmpresa';

export default async function PaginaNuevaEmpresa() {
  const supabase = await crearClienteServidor();

  // Si el plan no lo permite, no tiene sentido mostrar el formulario
  const { data } = await supabase.rpc('puede_crear_empresa');
  const lim = (data ?? { puede: true }) as { puede: boolean };
  if (!lim.puede) redirect('/panel/empresas');

  return <FormularioEmpresa />;
}
