/**
 * FIRMA DEL ACOMPAÑANTE DE LA INSPECCIÓN — /v/[token]
 * ---------------------------------------------------------------
 * Ruta pública. El jefe del área acompaña el recorrido y se va a
 * atender lo suyo; su firma quedaba «para después», que en la práctica
 * es nunca. Firma sobre la inspección ya cerrada y el PDF se regenera.
 */
import { crearClienteServidor } from '@/lib/supabase/servidor';
import FirmaInspeccion from './FirmaInspeccion';

export const dynamic = 'force-dynamic';

type Publico = {
  ok: boolean;
  error?: string;
  orgId?: string;
  inspeccion?: {
    codigo: string; tipo: string; fecha: string;
    objeto: string | null; inspector: string | null; acompanante: string | null;
    puntaje: number | null; cumple: boolean | null;
    cerrada: boolean; yaFirmo: boolean;
  };
  hallazgos?: Array<{
    criterio: string; seccion: string | null;
    critico: boolean; hallazgo: string | null;
  }>;
  empresa?: { nombre: string; logo_url: string | null; color: string };
};

export default async function PaginaFirmaInspeccion({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await crearClienteServidor();

  const { data } = await supabase.rpc('inspeccion_firma_publica', { p_token: token });
  const d = (data ?? { ok: false }) as Publico;

  if (!d.ok || !d.inspeccion) {
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
    <FirmaInspeccion
      token={token}
      orgId={d.orgId ?? ''}
      inspeccion={d.inspeccion}
      hallazgos={d.hallazgos ?? []}
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
