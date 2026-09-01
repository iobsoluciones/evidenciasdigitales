/**
 * REGISTRO PÚBLICO DE ASISTENCIA — /r/[slug]
 * ---------------------------------------------------------------
 * Página SIN sesión: el asistente escanea el QR y llena el formulario.
 *
 * Toda la validación (organización activa, licencia vigente, estado y
 * horario) ocurre dentro de la función SECURITY DEFINER de la base de
 * datos. El rol anónimo no tiene acceso directo a ninguna tabla.
 */
import { crearClienteServidor } from '@/lib/supabase/servidor';
import FormularioRegistro from './FormularioRegistro';

// Esta página nunca debe cachearse: si una capacitación se activa,
// tiene que reflejarse en el instante. force-dynamic lo garantiza en
// producción (Vercel), donde por defecto Next puede cachear rutas.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

type CapPublica = {
  id: string;
  org_id: string;
  codigo: string;
  tema: string;
  descripcion: string | null;
  instructor: string;
  empresa: string;
  fecha_inicio: string;
  fecha_fin: string;
  org_nombre: string;
  logo_url: string | null;
  color_primario: string;
  dentro_horario: boolean;
};

export default async function PaginaRegistro({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await crearClienteServidor();

  const { data, error } = await supabase.rpc('capacitacion_activa_publica', { p_slug: slug });

  // Un error aquí NO es lo mismo que "no hay capacitación activa": suele
  // ser configuración del despliegue (variables de entorno ausentes) o
  // red. Se registra para verlo en los logs de Vercel y se muestra un
  // mensaje distinto, para no confundir al asistente ni al diagnóstico.
  if (error) {
    console.error('[registro-publico] Error al consultar capacitación:', {
      slug, mensaje: error.message, detalle: error,
    });
    return (
      <Marco>
        <h1 style={est.titulo}>Sistema de Registro de Asistencia</h1>
        <div style={est.mensaje}>
          No se pudo consultar la información en este momento. Intenta de nuevo
          en unos minutos.
        </div>
      </Marco>
    );
  }

  const cap = (data?.[0] ?? null) as CapPublica | null;

  if (!cap) {
    return (
      <Marco>
        <h1 style={est.titulo}>Sistema de Registro de Asistencia</h1>
        <div style={est.mensaje}>
          No hay capacitaciones activas en este momento.
        </div>
      </Marco>
    );
  }

  const fmt = (iso: string) =>
    new Date(iso).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' });

  return (
    <Marco color={cap.color_primario} logo={cap.logo_url}>
      <h1 style={{ ...est.titulo, color: cap.color_primario }}>
        Registro de Asistencia
      </h1>
      <p style={est.sub}>{cap.org_nombre}</p>

      <div style={est.ficha}>
        <span style={{ ...est.etiqueta, background: cap.dentro_horario ? 'var(--bien)' : 'var(--texto-suave)' }}>
          {cap.dentro_horario ? 'Capacitación activa' : 'Fuera de horario'}
        </span>
        <h2 style={est.tema}>{cap.tema}</h2>
        <Dato e="Código" v={cap.codigo} />
        <Dato e="Instructor" v={cap.instructor} />
        <Dato e="Horario" v={`${fmt(cap.fecha_inicio)} — ${fmt(cap.fecha_fin)}`} />
        {cap.descripcion && <p style={est.descripcion}>{cap.descripcion}</p>}
      </div>

      {cap.dentro_horario ? (
        <FormularioRegistro
          capacitacionId={cap.id}
          orgId={cap.org_id}
          slug={slug}
          color={cap.color_primario}
        />
      ) : (
        <div style={est.mensaje}>
          La capacitación existe pero está fuera del horario de registro.
        </div>
      )}
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
      minHeight: '100vh', background: 'var(--fondo)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      padding: 20,
    }}>
      <div style={{
        width: '100%', maxWidth: 520, background: 'var(--superficie)', borderRadius: 18,
        boxShadow: '0 10px 30px rgba(0,0,0,.08)', padding: '28px 26px 32px',
        marginTop: 24, ['--marca' as string]: color,
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

function Dato({ e, v }: { e: string; v: string }) {
  return (
    <div style={{ fontSize: 13, color: 'var(--texto-suave)', marginBottom: 4 }}>
      <strong style={{ color: 'var(--texto)' }}>{e}:</strong> {v}
    </div>
  );
}

const est: Record<string, React.CSSProperties> = {
  titulo: { fontSize: 21, color: 'var(--texto)', textAlign: 'center', margin: '0 0 2px' },
  sub: { fontSize: 13, color: 'var(--texto-suave)', textAlign: 'center', margin: '0 0 20px' },
  ficha: { background: 'var(--superficie-3)', border: '1px solid var(--borde)', borderRadius: 12, padding: 18, marginBottom: 20 },
  etiqueta: { display: 'inline-block', color: 'var(--sobre-marca)', fontSize: 11, padding: '3px 10px', borderRadius: 999, textTransform: 'uppercase', marginBottom: 8 },
  tema: { fontSize: 17, margin: '0 0 10px', color: 'var(--texto)' },
  descripcion: { marginTop: 10, paddingTop: 10, borderTop: '1px dashed var(--borde-fuerte)', fontSize: 12, color: 'var(--texto-suave)', lineHeight: 1.5 },
  mensaje: { padding: 14, borderRadius: 8, background: 'var(--mal-fondo)', color: 'var(--mal)', fontSize: 14, textAlign: 'center' },
};
