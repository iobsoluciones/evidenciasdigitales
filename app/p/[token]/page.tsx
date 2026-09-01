/**
 * FIRMA REMOTA DEL PERMISO DE ALTO RIESGO — /p/[token]
 * ---------------------------------------------------------------
 * Ruta pública. Quien autoriza el permiso suele estar en otra sede o en
 * la oficina, y la cuadrilla está al pie de la tarea esperando. Sin este
 * enlace, el permiso se firma después —cuando ya se trabajó—, que es
 * exactamente el vicio que el permiso existe para evitar.
 */
import { crearClienteServidor } from '@/lib/supabase/servidor';
import FirmaPermiso from './FirmaPermiso';

export const dynamic = 'force-dynamic';

type Publico = {
  ok: boolean;
  error?: string;
  orgId?: string;
  participante?: { nombre: string; cargo: string | null; rol: string; yaFirmo: boolean };
  permiso?: {
    codigo: string; tipo: string; fecha: string;
    hora_inicio: string; hora_fin: string;
    lugar: string | null; descripcion: string; estado: string;
  };
  requisitos?: Array<{ texto: string; obligatorio: boolean; resultado: string }>;
  empresa?: { nombre: string; logo_url: string | null; color: string };
};

export default async function PaginaFirmaPermiso({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await crearClienteServidor();

  const { data } = await supabase.rpc('permiso_firma_publica', { p_token: token });
  const d = (data ?? { ok: false }) as Publico;

  if (!d.ok || !d.participante || !d.permiso) {
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
    <FirmaPermiso
      token={token}
      orgId={d.orgId ?? ''}
      participante={d.participante}
      permiso={d.permiso}
      requisitos={d.requisitos ?? []}
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
