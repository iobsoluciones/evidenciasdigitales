/**
 * LAYOUT DEL PANEL
 * ---------------------------------------------------------------
 * Server Component: obtiene el perfil y la organizacion en el
 * servidor, antes de enviar HTML al navegador.
 *
 * El color de marca de cada organizacion se inyecta como variable CSS,
 * de modo que toda la interfaz se adapta sin condicionales.
 */
import { redirect } from 'next/navigation';
import { obtenerPerfil } from '@/lib/sesion';
import BotonSalir from './BotonSalir';

export default async function LayoutPanel({
  children,
}: {
  children: React.ReactNode;
}) {
  const perfil = await obtenerPerfil();

  // El middleware ya bloquea sin sesion; esto cubre el caso de un
  // usuario autenticado que no quedo vinculado a ninguna organizacion.
  if (!perfil) redirect('/login');

  const org = perfil.organizacion;
  const suspendida = org.estado !== 'activo';
  const vencida = org.fecha_expiracion
    ? new Date(org.fecha_expiracion) < new Date()
    : false;

  return (
    <div style={{ ['--marca' as string]: org.color_primario, minHeight: '100vh', background: '#f1f5f9', fontFamily: "'Segoe UI',Roboto,Arial,sans-serif" }}>
      <header style={{
        background: org.color_primario, color: '#fff', padding: '14px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {org.logo_url && (
            <img src={org.logo_url} alt="" style={{ height: 32, borderRadius: 4 }} />
          )}
          <div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>{org.nombre}</div>
            <div style={{ fontSize: 11, opacity: 0.75 }}>
              Plan {org.plan} · {org.nomenclatura ?? 'sin nomenclatura'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ textAlign: 'right', fontSize: 12 }}>
            <div style={{ fontWeight: 600 }}>{perfil.nombre}</div>
            <div style={{ opacity: 0.75 }}>{perfil.rol}</div>
          </div>
          <BotonSalir />
        </div>
      </header>

      {(suspendida || vencida) && (
        <div style={{
          background: '#fef2f2', color: '#b91c1c', padding: '10px 24px',
          fontSize: 13, borderBottom: '1px solid #fca5a5',
        }}>
          {suspendida
            ? 'El servicio está suspendido. Comunícate con soporte.'
            : `La licencia venció el ${org.fecha_expiracion}. Renuévala para seguir operando.`}
        </div>
      )}

      <main style={{ maxWidth: 1100, margin: '0 auto', padding: 24 }}>
        {children}
      </main>
    </div>
  );
}
