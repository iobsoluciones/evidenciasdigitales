/**
 * FIRMA REMOTA DE ENTREGA — /d/[token]
 * ---------------------------------------------------------------
 * Ruta pública. El receptor confirma qué recibe y firma desde su
 * celular sin tener cuenta: útil cuando la dotación se despacha a
 * otra sede.
 */
import { crearClienteServidor } from '@/lib/supabase/servidor';
import FirmaRemota from './FirmaRemota';

export const dynamic = 'force-dynamic';

export default async function PaginaFirmaRemota({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await crearClienteServidor();

  const { data } = await supabase.rpc('entrega_publica', { p_token: token });
  const e = (data ?? { ok: false }) as {
    ok: boolean; error?: string;
    id?: string; orgId?: string; codigo?: string; nombres?: string; identificacion?: string;
    cargo?: string | null; area?: string | null;
    entregadoPor?: string; observaciones?: string | null;
    declaracion?: string | null;
    empresa?: string; logo?: string | null; color?: string;
    items?: Array<{
      nombre: string; tipo: string; unidad: string; foto_url: string | null;
      cantidad: number; talla: string | null;
      placa: string | null; serial: string | null;
      estado_entrega: string | null; accesorios: string | null;
    }>;
  };

  if (!e.ok) {
    return (
      <main style={s.pagina}>
        <div style={s.caja}>
          <div style={{ fontSize: 34, marginBottom: 10 }}>⚠</div>
          <h1 style={s.titulo}>Enlace no disponible</h1>
          <p style={s.texto}>
            {e.error ?? 'Este enlace no es válido o la entrega ya fue firmada.'}
          </p>
          <p style={s.notaPie}>
            Si crees que es un error, comunícate con quien te lo envió.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main style={s.pagina}>
      <FirmaRemota
        token={token}
        entrega={{
          orgId: e.orgId!,
          codigo: e.codigo!,
          nombres: e.nombres!,
          identificacion: e.identificacion!,
          cargo: e.cargo ?? null,
          area: e.area ?? null,
          entregadoPor: e.entregadoPor!,
          observaciones: e.observaciones ?? null,
          declaracion: e.declaracion ?? null,
          empresa: e.empresa!,
          logo: e.logo ?? null,
          items: e.items ?? [],
        }}
        color={e.color ?? '#14263F'}
      />
    </main>
  );
}

const s: Record<string, React.CSSProperties> = {
  pagina: {
    minHeight: '100vh', background: '#F7F7F4', padding: '24px 16px',
    fontFamily: "'Inter','Segoe UI',Roboto,Arial,sans-serif", color: '#14263F',
  },
  caja: {
    background: '#fff', borderRadius: 12, padding: '40px 26px',
    maxWidth: 460, margin: '40px auto', textAlign: 'center',
    boxShadow: '0 1px 3px rgba(20,38,63,.08)',
  },
  titulo: { fontSize: 19, margin: '0 0 8px' },
  texto: { fontSize: 14, color: '#5B6470', margin: 0, lineHeight: 1.6 },
  notaPie: { fontSize: 12, color: '#8A929C', marginTop: 16 },
};
