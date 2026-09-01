/**
 * APROBACIÓN DEL PLAN ANUAL — /a/[token]
 * ---------------------------------------------------------------
 * Ruta pública. Lo que convierte el plan anual en el plan de la empresa
 * es la firma del EMPLEADOR, y el gerente casi nunca está sentado al
 * lado del consultor. Sin este enlace, la firma se conseguía en la
 * pantalla del consultor —o se posponía indefinidamente.
 */
import { crearClienteServidor } from '@/lib/supabase/servidor';
import AprobarPlan from './AprobarPlan';

export const dynamic = 'force-dynamic';

type Publico = {
  ok: boolean;
  error?: string;
  orgId?: string;
  plan?: {
    codigo: string; anio: number;
    objetivo_general: string | null; alcance: string | null;
    recursos_financieros: string | null; recursos_humanos: string | null;
    recursos_tecnicos: string | null; aprobado: boolean;
  };
  actividades?: Array<{
    objetivo: string | null; actividad: string; meta: string | null;
    responsable: string | null; meses: number[] | null;
  }>;
  empresa?: { nombre: string; logo_url: string | null; color: string };
};

export default async function PaginaAprobarPlan({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await crearClienteServidor();

  const { data } = await supabase.rpc('plan_publico', { p_token: token });
  const d = (data ?? { ok: false }) as Publico;

  if (!d.ok || !d.plan) {
    return (
      <main style={s.pagina}>
        <div style={s.caja}>
          <h1 style={s.titulo}>Enlace no disponible</h1>
          <p style={s.texto}>
            {d.error ?? 'Este enlace no es válido o el plan ya fue aprobado.'}
          </p>
        </div>
      </main>
    );
  }

  return (
    <AprobarPlan
      token={token}
      orgId={d.orgId ?? ''}
      plan={d.plan}
      actividades={d.actividades ?? []}
      empresa={d.empresa ?? { nombre: '', logo_url: null, color: '#14263F' }}
    />
  );
}

const s: Record<string, React.CSSProperties> = {
  pagina: {
    minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: '#F7F7F4', padding: 20,
    fontFamily: "'Inter','Segoe UI',Roboto,Arial,sans-serif",
  },
  caja: {
    background: '#fff', border: '1px solid #E4E4DF', borderRadius: 14,
    padding: '30px 28px', maxWidth: 420, textAlign: 'center',
  },
  titulo: { fontSize: 19, fontWeight: 700, color: '#14263F', margin: '0 0 8px' },
  texto: { fontSize: 14, color: '#5B6470', margin: 0, lineHeight: 1.6 },
};
