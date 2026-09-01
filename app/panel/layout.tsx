/**
 * LAYOUT DEL PANEL
 * ---------------------------------------------------------------
 * El menú lateral identifica al PROFESIONAL (es su espacio de
 * trabajo). El selector superior identifica la EMPRESA sobre la que
 * está operando. Son dos ejes distintos y conviene no mezclarlos.
 */
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { obtenerPerfil } from '@/lib/sesion';
import { listarEmpresas, empresaActiva } from '@/lib/empresa-activa';
import MenuLateral from './MenuLateral';
import SelectorEmpresa from './SelectorEmpresa';
import BotonSalir from './BotonSalir';
import BotonMenu from './BotonMenu';
import AccesosRapidos from './AccesosRapidos';

export default async function LayoutPanel({
  children,
}: {
  children: React.ReactNode;
}) {
  const perfil = await obtenerPerfil();
  if (!perfil) redirect('/login');

  // Contraseña generada por el sistema y todavía sin cambiar: no se
  // entra al panel hasta ponerle una propia. La pantalla vive fuera de
  // este layout a propósito, para que el bloqueo no se pueda esquivar
  // navegando a otra ruta del panel.
  if (perfil.debeCambiarClave) redirect('/clave');

  const cuenta = perfil.organizacion;
  const empresas = await listarEmpresas();
  const activa = await empresaActiva();

  const suspendida = cuenta.estado !== 'activo';
  const vencida = cuenta.fecha_expiracion
    ? new Date(cuenta.fecha_expiracion) < new Date()
    : false;

  // El color de marca es el de la empresa activa: recuerda en cuál se
  // está trabajando sin tener que leer.
  const marca = activa?.color_primario ?? '#14263F';

  return (
    <div style={{
      ['--marca' as string]: marca,
      display: 'flex',
      minHeight: '100vh',
      background: '#F7F7F4',
      fontFamily: "'Inter','Segoe UI',Roboto,Arial,sans-serif",
      color: '#14263F',
    }}>
      <MenuLateral
        color={marca}
        profesional={perfil.nombre}
        rol={perfil.rol}
        plan={cuenta.plan}
      />

      <div style={{ flex: 1, minWidth: 0 }}>
        <header style={est.barra}>
          <BotonMenu color={marca} />
          <SelectorEmpresa empresas={empresas} activa={activa} />
          {/* Los cinco accesos transversales viven aquí, no en el menú:
              arriba se comían la mitad del alto del lateral y obligaban a
              subir y bajar para llegar a los módulos. */}
          <AccesosRapidos color={marca} />
          {/* marginLeft:auto y no space-between: sin empresas el selector
              no pinta nada, y entonces Manual y Salir se iban al borde
              izquierdo. Así quedan a la derecha siempre. */}
          <div style={est.acciones}>
            <Link href="/panel/manual" style={est.manual}>Manual</Link>
            <BotonSalir />
          </div>
        </header>

        {(suspendida || vencida) && (
          <div style={est.alerta}>
            {suspendida
              ? 'El servicio está suspendido. Comunícate con soporte para reactivarlo.'
              : `La licencia venció el ${cuenta.fecha_expiracion}. Renuévala para seguir operando.`}
          </div>
        )}

        <main style={est.contenido}>{children}</main>
      </div>
    </div>
  );
}

const est: Record<string, React.CSSProperties> = {
  barra: {
    display: 'flex', alignItems: 'center',
    gap: 12, padding: '11px 26px', borderBottom: '1px solid #E4E4DF',
    background: '#fff', flexWrap: 'wrap',
  },
  acciones: { display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' },
  alerta: {
    background: '#FDF2F2', color: '#9B1C1C', padding: '11px 26px',
    fontSize: 13, borderBottom: '1px solid #F5C6C6',
  },
  contenido: { padding: '26px', maxWidth: 1180, overflowX: 'auto' },
  manual: {
    border: '1px solid #E4E4DF', color: '#5B6470', background: '#fff',
    padding: '7px 18px', borderRadius: 8, fontSize: 12, fontWeight: 600,
    textDecoration: 'none', whiteSpace: 'nowrap',
  },
};
