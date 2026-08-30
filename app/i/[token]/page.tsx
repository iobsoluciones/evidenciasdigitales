/**
 * FIRMA REMOTA DE LA INVESTIGACIÓN — /i/[token]
 * ---------------------------------------------------------------
 * Ruta pública. El equipo investigador casi nunca coincide en el mismo
 * sitio: el responsable del SG-SST, el representante del COPASST y el
 * jefe inmediato firman cada uno desde donde esté.
 *
 * La función pública devuelve solo lo necesario para identificar el
 * evento: NO el análisis de causas ni los testigos. Quien tenga el
 * enlace no necesita ver la investigación completa para firmarla.
 */
import { crearClienteServidor } from '@/lib/supabase/servidor';
import FirmaInvestigacion from './FirmaInvestigacion';

export const dynamic = 'force-dynamic';

type Publico = {
  ok: boolean;
  error?: string;
  orgId?: string;
  miembro?: { nombre: string; cargo: string | null; rol: string; yaFirmo: boolean };
  evento?: {
    codigo: string; tipo: string; fecha: string; lugar: string | null;
    descripcion: string; trabajador: string | null; cerrado: boolean;
  };
  empresa?: { nombre: string; logo_url: string | null; color: string };
};

export default async function PaginaFirmaInvestigacion({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await crearClienteServidor();

  const { data } = await supabase.rpc('evento_firma_publica', { p_token: token });
  const d = (data ?? { ok: false }) as Publico;

  if (!d.ok || !d.miembro || !d.evento) {
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
    <FirmaInvestigacion
      token={token}
      orgId={d.orgId ?? ''}
      miembro={d.miembro}
      evento={d.evento}
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
