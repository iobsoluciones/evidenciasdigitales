/**
 * LISTADO DE CAPACITACIONES — filtrado por la empresa activa
 * ---------------------------------------------------------------
 * La consulta filtra por empresa_id, NO por org_id: RLS ya garantiza
 * que solo se vean las de la cuenta, y empresa_id acota a la empresa
 * sobre la que trabaja el consultor.
 *
 * Es la distinción clave del modelo nuevo: org_id es seguridad,
 * empresa_id es contexto de trabajo.
 */
import Link from 'next/link';
import { crearClienteServidor } from '@/lib/supabase/servidor';
import { empresaActiva } from '@/lib/empresa-activa';
import type { Capacitacion } from '@/lib/tipos';
import { listarPlantillasCapacitacion } from '@/lib/acciones-plantillas';
import ListaCapacitaciones from './ListaCapacitaciones';

export default async function PaginaCapacitaciones() {
  const empresa = await empresaActiva();

  if (!empresa) {
    return (
      <div style={vacio}>
        <p style={{ margin: '0 0 14px', fontSize: 14 }}>
          Agrega una empresa antes de programar capacitaciones.
        </p>
        <Link href="/panel/empresas/nueva" style={boton}>Agregar empresa</Link>
      </div>
    );
  }

  const supabase = await crearClienteServidor();
  const plantillas = await listarPlantillasCapacitacion();

  // ¿El consultor ya registró su firma? Determina si la casilla de
  // "anexar mi firma" está disponible.
  const { data: perfilProf } = await supabase
    .from('perfil_profesional')
    .select('firma_url')
    .maybeSingle();
  const { data, error } = await supabase
    .from('v_capacitaciones_resumen')
    .select('*')
    .eq('empresa_id', empresa.id)
    .order('fecha_inicio', { ascending: false });

  if (error) {
    return (
      <div style={{ background: '#FDF2F2', color: '#9B1C1C', padding: 16, borderRadius: 6 }}>
        Error al cargar: {error.message}
      </div>
    );
  }

  return (
    <ListaCapacitaciones
      capacitaciones={(data ?? []) as Capacitacion[]}
      nombreOrganizacion={empresa.nombre}
      empresaSlug={empresa.slug}
      empresaNombre={empresa.nombre}
      color={empresa.color_primario}
      plantillas={plantillas}
      tieneFirmaPropia={Boolean(perfilProf?.firma_url)}
    />
  );
}

const vacio: React.CSSProperties = {
  background: '#fff', border: '1px dashed #DFDFD8', borderRadius: 8,
  padding: '40px 24px', textAlign: 'center',
};
const boton: React.CSSProperties = {
  background: '#14263F', color: '#fff', padding: '10px 18px',
  borderRadius: 4, fontSize: 13, fontWeight: 600, textDecoration: 'none',
};
