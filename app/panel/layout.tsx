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
import BotonTema from './BotonTema';
import BotonMenu from './BotonMenu';
import AccesosRapidos from './AccesosRapidos';
import { contrasteSobre, conAlfa } from '@/lib/color';

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
  //
  // La BARRA SUPERIOR ENTERA se pinta con él. Es la señal más barata que
  // existe contra el error caro: cargarle un accidente o una entrega a
  // la empresa equivocada. El nombre ya estaba en el selector, pero un
  // nombre hay que leerlo; un cambio de color se ve sin querer.
  const marca = activa?.color_primario ?? '#14263F';
  const contraste = contrasteSobre(marca);

  return (
    <div style={{
      ['--marca' as string]: marca,
      display: 'flex',
      minHeight: '100vh',
      background: 'var(--fondo)',
      color: 'var(--texto)',
    }}>
      <MenuLateral
        color={marca}
        profesional={perfil.nombre}
        rol={perfil.rol}
        plan={cuenta.plan}
      />

      <div style={{ flex: 1, minWidth: 0 }}>
        <header style={{
          ...est.barra,
          background: marca,
          color: contraste,
          borderBottomColor: conAlfa(contraste, 0.18),
        }}>
          <BotonMenu color={marca} />
          <SelectorEmpresa empresas={empresas} activa={activa} />
          {/* Los cinco accesos transversales viven aquí, no en el menú:
              arriba se comían la mitad del alto del lateral y obligaban a
              subir y bajar para llegar a los módulos. */}
          <AccesosRapidos color={marca} contraste={contraste} />
          {/* marginLeft:auto y no space-between: sin empresas el selector
              no pinta nada, y entonces Manual y Salir se iban al borde
              izquierdo. Así quedan a la derecha siempre. */}
          <div style={est.acciones}>
            <Link
              href="/panel/manual"
              style={{
                ...est.manual,
                color: contraste,
                borderColor: conAlfa(contraste, 0.45),
              }}
            >
              Manual
            </Link>
            <BotonSalir contraste={contraste} />
            <BotonTema contraste={contraste} />
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
    gap: 12, padding: '11px 26px',
    borderBottomWidth: 1, borderBottomStyle: 'solid',
    flexWrap: 'wrap', transition: 'background .18s ease',
  },
  acciones: { display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' },
  alerta: {
    background: 'var(--mal-fondo)', color: 'var(--mal)', padding: '11px 26px',
    fontSize: 13, borderBottom: '1px solid var(--borde)',
  },
  contenido: { padding: '26px', maxWidth: 1180, overflowX: 'auto' },
  manual: {
    borderWidth: 1, borderStyle: 'solid', background: 'transparent',
    padding: '7px 18px', borderRadius: 8, fontSize: 12, fontWeight: 600,
    textDecoration: 'none', whiteSpace: 'nowrap',
  },
};
