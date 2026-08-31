/**
 * RENDICIÓN DE CUENTAS POR ENLACE — /c/[token]
 * ---------------------------------------------------------------
 * Ruta pública. Cada responsable escribe su propio informe y firma desde
 * donde esté: el gerente en su oficina, el jefe de planta en la suya.
 * Si el consultor tuviera que perseguirlos con un portátil, el acta
 * terminaría escrita por una sola persona, que es justo lo que la norma
 * no quiere.
 */
import { crearClienteServidor } from '@/lib/supabase/servidor';
import FormularioRendicion from './FormularioRendicion';

export const dynamic = 'force-dynamic';

type Publico = {
  ok: boolean;
  error?: string;
  orgId?: string;
  responsable?: {
    nombre: string; cargo: string | null;
    responsabilidades: string | null; informe: string | null; yaFirmo: boolean;
  };
  rendicion?: {
    codigo: string; anio: number; fecha: string;
    alcance: string | null; cerrada: boolean;
  };
  empresa?: { nombre: string; logo_url: string | null; color: string };
};

export default async function PaginaRendicionPublica({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await crearClienteServidor();

  const { data } = await supabase.rpc('rendicion_publica', { p_token: token });
  const d = (data ?? { ok: false }) as Publico;

  if (!d.ok || !d.responsable || !d.rendicion) {
    return (
      <main style={s.pagina}>
        <div style={s.caja}>
          <h1 style={s.titulo}>Enlace no disponible</h1>
          <p style={s.texto}>
            {d.error ?? 'Este enlace no es válido o la rendición ya se registró.'}
          </p>
        </div>
      </main>
    );
  }

  return (
    <FormularioRendicion
      token={token}
      orgId={d.orgId ?? ''}
      responsable={d.responsable}
      rendicion={d.rendicion}
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
