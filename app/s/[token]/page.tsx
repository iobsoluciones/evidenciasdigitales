/**
 * FIRMA REMOTA DEL ACTA DE SIMULACRO — /s/[token]
 * ---------------------------------------------------------------
 * Ruta pública. Durante un simulacro los evaluadores están repartidos
 * por la planta, y uno suele ser el asesor de la ARL, que ni siquiera
 * trabaja en la empresa. Cada uno firma desde donde esté.
 *
 * La función pública devuelve solo lo necesario para identificar el
 * ejercicio y sus resultados: nada del resto del SG-SST.
 */
import { crearClienteServidor } from '@/lib/supabase/servidor';
import FirmaSimulacro from './FirmaSimulacro';

export const dynamic = 'force-dynamic';

type Publico = {
  ok: boolean;
  error?: string;
  orgId?: string;
  evaluador?: { nombre: string; cargo: string | null; rol: string; yaFirmo: boolean };
  simulacro?: {
    codigo: string; tipo: string; fecha: string;
    alcance: string | null; punto_encuentro: string | null;
    participantes: number; evacuados: number;
    tiempo: number | null; cerrado: boolean;
  };
  empresa?: { nombre: string; logo_url: string | null; color: string };
};

export default async function PaginaFirmaSimulacro({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await crearClienteServidor();

  const { data } = await supabase.rpc('simulacro_firma_publica', { p_token: token });
  const d = (data ?? { ok: false }) as Publico;

  if (!d.ok || !d.evaluador || !d.simulacro) {
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
    <FirmaSimulacro
      token={token}
      orgId={d.orgId ?? ''}
      evaluador={d.evaluador}
      simulacro={d.simulacro}
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
