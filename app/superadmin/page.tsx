/**
 * PANEL DEL PROVEEDOR — solo superadmin
 * ---------------------------------------------------------------
 * Administra CUENTAS de consultores. El indicador principal pasó a
 * ser cuántas empresas administra cada uno: es el límite del plan y
 * la medida real de uso.
 *
 * DECISIÓN DE PRIVACIDAD: el superadmin no ve los datos de los
 * clientes. Las políticas de capacitaciones y participantes no lo
 * contemplan a propósito.
 */
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { crearClienteServidor } from '@/lib/supabase/servidor';
import TablaOrganizaciones from './TablaOrganizaciones';

export type OrgResumen = {
  id: string;
  slug: string;
  nombre: string;
  plan: string;
  estado: string;
  fecha_expiracion: string | null;
  created_at: string;
  max_empresas: number | null;
  usuarios: number;
  empresas: number;
  capacitaciones: number;
  participantes: number;
  ultima_actividad: string | null;
};

export default async function PaginaSuperadmin() {
  const supabase = await crearClienteServidor();
  const { data } = await supabase.rpc('resumen_proveedor');

  const r = (data ?? { ok: false }) as {
    ok: boolean;
    organizaciones?: OrgResumen[];
    totales?: {
      organizaciones: number; activas: number; enPrueba: number;
      porVencer: number; empresas: number; ingresoMensual: number;
    };
  };

  if (!r.ok) redirect('/panel');

  const t = r.totales!;
  const cop = (n: number) => '$' + n.toLocaleString('es-CO');

  return (
    <main style={s.pagina}>
      <div style={s.wrap}>
        <div style={s.cabecera}>
          <div>
            <h1 style={s.titulo}>Panel del proveedor</h1>
            <p style={s.sub}>
              Administración de cuentas. No incluye acceso a los datos de los clientes.
            </p>
          </div>
          <Link href="/panel" style={s.volver}>Ir a mi panel →</Link>
        </div>

        <div style={s.kpis}>
          <Kpi v={String(t.organizaciones)} e="Cuentas" />
          <Kpi v={String(t.activas)} e="Activas" />
          <Kpi v={String(t.empresas)} e="Empresas administradas" />
          <Kpi v={String(t.enPrueba)} e="En prueba" />
          <Kpi v={String(t.porVencer)} e="Vencen en 7 días" alerta={t.porVencer > 0} />
          <Kpi v={cop(t.ingresoMensual)} e="Ingreso mensual" />
        </div>

        <TablaOrganizaciones organizaciones={r.organizaciones ?? []} />
      </div>
    </main>
  );
}

function Kpi({ v, e, alerta }: { v: string; e: string; alerta?: boolean }) {
  return (
    <div style={{ ...s.kpi, ...(alerta ? { background: 'var(--mal-fondo)', border: '1px solid var(--mal)' } : {}) }}>
      <div style={{ fontSize: 21, fontWeight: 700, color: alerta ? 'var(--mal)' : 'var(--texto)' }}>{v}</div>
      <div style={s.kpiE}>{e}</div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  pagina: { minHeight: '100vh', background: 'var(--fondo)', padding: 26, color: 'var(--texto)' },
  wrap: { maxWidth: 1240, margin: '0 auto' },
  cabecera: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' },
  titulo: { fontSize: 22, margin: '0 0 3px', letterSpacing: -0.4 },
  sub: { fontSize: 13, color: 'var(--texto-suave)', margin: 0 },
  volver: { fontSize: 13, color: 'var(--texto-suave)', textDecoration: 'none' },
  kpis: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 12, margin: '22px 0' },
  kpi: { background: 'var(--superficie)', border: '1px solid var(--borde)', borderRadius: 8, padding: 15 },
  kpiE: { fontSize: 10.5, color: 'var(--texto-tenue)', textTransform: 'uppercase', letterSpacing: .4, marginTop: 3 },
};
