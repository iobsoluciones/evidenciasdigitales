/**
 * FIRMA DEL CAPACITADOR — /f/[id]?token=XXX
 * ---------------------------------------------------------------
 * Página sin sesión, protegida por token. La función de la base de
 * datos no devuelve ningún dato si el token no coincide, así que
 * conocer el id de la capacitación no basta para firmar.
 */
import { crearClienteServidor } from '@/lib/supabase/servidor';
import FirmaInstructor from './FirmaInstructor';

type Respuesta = {
  ok: boolean;
  error?: string;
  id?: string;
  org_id?: string;
  codigo?: string;
  tema?: string;
  instructor?: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  org_nombre?: string;
  logo_url?: string | null;
  color_primario?: string;
  ya_firmado?: boolean;
};

export default async function PaginaFirma({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { id } = await params;
  const { token } = await searchParams;

  const supabase = await crearClienteServidor();
  const { data } = await supabase.rpc('capacitacion_para_firma', {
    p_id: id,
    p_token: token ?? '',
  });

  const r = (data ?? { ok: false, error: 'No se pudo validar el enlace.' }) as Respuesta;

  if (!r.ok) {
    return (
      <Marco>
        <h1 style={est.titulo}>Firma del capacitador</h1>
        <div style={est.error}>{r.error}</div>
      </Marco>
    );
  }

  const fmt = (iso: string) =>
    new Date(iso).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' });

  return (
    <Marco color={r.color_primario} logo={r.logo_url}>
      <h1 style={{ ...est.titulo, color: r.color_primario }}>Firma del capacitador</h1>
      <p style={est.sub}>{r.org_nombre}</p>

      <div style={est.ficha}>
        <h2 style={est.tema}>{r.tema}</h2>
        <div style={est.dato}><strong>Código:</strong> {r.codigo}</div>
        <div style={est.dato}><strong>Capacitador:</strong> {r.instructor}</div>
        <div style={est.dato}>
          <strong>Horario:</strong> {fmt(r.fecha_inicio!)} — {fmt(r.fecha_fin!)}
        </div>
      </div>

      {r.ya_firmado && (
        <div style={est.aviso}>
          Esta capacitación ya tiene una firma registrada. Si vuelves a firmar,
          se reemplazará la anterior.
        </div>
      )}

      <FirmaInstructor
        capacitacionId={r.id!}
        orgId={r.org_id!}
        token={token ?? ''}
        color={r.color_primario ?? '#1e3a8a'}
      />
    </Marco>
  );
}

function Marco({
  children, color = '#1e3a8a', logo,
}: {
  children: React.ReactNode; color?: string; logo?: string | null;
}) {
  return (
    <main style={{
      minHeight: '100vh', background: 'linear-gradient(135deg,#f1f5f9,#e2e8f0)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      padding: 20, fontFamily: "'Segoe UI',Roboto,Arial,sans-serif",
    }}>
      <div style={{
        width: '100%', maxWidth: 520, background: '#fff', borderRadius: 18,
        boxShadow: '0 10px 30px rgba(0,0,0,.08)', padding: '28px 26px 32px', marginTop: 24,
      }}>
        {logo && (
          <div style={{ textAlign: 'center', marginBottom: 14 }}>
            <img src={logo} alt="" style={{ maxHeight: 64, maxWidth: '70%' }} />
          </div>
        )}
        {children}
      </div>
    </main>
  );
}

const est: Record<string, React.CSSProperties> = {
  titulo: { fontSize: 21, color: '#1e3a8a', textAlign: 'center', margin: '0 0 2px' },
  sub: { fontSize: 13, color: '#6b7280', textAlign: 'center', margin: '0 0 20px' },
  ficha: { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: 18, marginBottom: 18 },
  tema: { fontSize: 17, margin: '0 0 10px', color: '#1f2937' },
  dato: { fontSize: 13, color: '#6b7280', marginBottom: 4 },
  error: { padding: 14, borderRadius: 10, background: '#fef2f2', color: '#dc2626', fontSize: 14, textAlign: 'center' },
  aviso: { padding: '11px 14px', borderRadius: 8, background: '#fefce8', color: '#a16207', fontSize: 13, marginBottom: 16 },
};
