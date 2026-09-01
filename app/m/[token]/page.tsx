/**
 * FIRMA DEL ACTA DE CONFORMACIÓN — /m/[token]
 * ---------------------------------------------------------------
 * Ruta pública. Los representantes de los trabajadores están en su
 * puesto, no en la oficina del consultor: sin este enlace el acta se
 * firmaba juntando a la gente, que es exactamente lo que se hacía con
 * el papel.
 */
import { crearClienteServidor } from '@/lib/supabase/servidor';
import FirmaComite from './FirmaComite';

export const dynamic = 'force-dynamic';

type Publico = {
  ok: boolean;
  error?: string;
  orgId?: string;
  miembro?: {
    nombre: string; cargo: string | null; parte: string;
    suplente: boolean; rol: string; frente: string | null; yaFirmo: boolean;
  };
  comite?: {
    tipo: string; codigo: string;
    periodo_inicio: string; periodo_fin: string;
    fecha_conformacion: string | null;
    lugar: string | null; forma_eleccion: string | null; cerrada: boolean;
  };
  integrantes?: Array<{
    nombre: string; cargo: string | null;
    parte: string; suplente: boolean; rol: string;
  }>;
  empresa?: { nombre: string; logo_url: string | null; color: string };
};

export default async function PaginaFirmaComite({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await crearClienteServidor();

  const { data } = await supabase.rpc('comite_firma_publica', { p_token: token });
  const d = (data ?? { ok: false }) as Publico;

  if (!d.ok || !d.miembro || !d.comite) {
    return (
      <main style={s.pagina}>
        <div style={s.caja}>
          <h1 style={s.titulo}>Enlace no disponible</h1>
          <p style={s.texto}>
            {d.error ?? 'Este enlace no es válido o la firma ya se registró.'}
          </p>
        </div>
      </main>
    );
  }

  return (
    <FirmaComite
      token={token}
      orgId={d.orgId ?? ''}
      miembro={d.miembro}
      comite={d.comite}
      integrantes={d.integrantes ?? []}
      empresa={d.empresa ?? { nombre: '', logo_url: null, color: 'var(--texto)' }}
    />
  );
}

const s: Record<string, React.CSSProperties> = {
  pagina: {
    minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'var(--fondo)', padding: 20,
  },
  caja: {
    background: 'var(--superficie)', border: '1px solid var(--borde)', borderRadius: 14,
    padding: '30px 28px', maxWidth: 420, textAlign: 'center',
  },
  titulo: { fontSize: 19, fontWeight: 700, color: 'var(--texto)', margin: '0 0 8px' },
  texto: { fontSize: 14, color: 'var(--texto-suave)', margin: 0, lineHeight: 1.6 },
};
