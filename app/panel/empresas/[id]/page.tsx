/**
 * EDICIÓN DE EMPRESA
 */
import { notFound } from 'next/navigation';
import { crearClienteServidor } from '@/lib/supabase/servidor';
import type { Empresa } from '@/lib/empresa-activa';
import FormularioEmpresa from '../FormularioEmpresa';

export default async function PaginaEditarEmpresa({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await crearClienteServidor();

  const { data } = await supabase
    .from('empresas')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (!data) notFound();

  return <FormularioEmpresa empresa={data as Empresa} />;
}
