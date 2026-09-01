'use client';

/**
 * ACCESOS RÁPIDOS — barra superior
 * ---------------------------------------------------------------
 * Estos cinco son transversales: no pertenecen a ninguna fase del PHVA
 * y se usan desde cualquier módulo. Vivían arriba del menú lateral y le
 * comían la mitad del alto, así que el acordeón de módulos obligaba a
 * subir y bajar todo el tiempo. Aquí ocupan una franja que ya existía.
 *
 * Iconos dibujados a mano (SVG en línea, sin librería) porque los
 * cuadrados geométricos de antes —▦ ▤ ▥ ▧ ◫— eran indistinguibles
 * entre sí: un icono que no se reconoce de un vistazo no es un icono,
 * es un adorno.
 *
 * Bajo 1180 px el texto se oculta y quedan solo los iconos: cinco
 * etiquetas más el selector de empresa no caben, y partir la barra en
 * dos filas devolvería el problema que se vino a resolver.
 *
 * La barra va pintada con el color de la empresa, así que estos botones
 * se dibujan por CONTRASTE: el activo se rellena con el color del texto
 * y escribe en el de la empresa —al revés que el resto—, que es la forma
 * de que se distinga sobre cualquier fondo, claro u oscuro.
 */
import Link from 'next/link';
import { usePathname } from 'next/navigation';

type Acceso = {
  href: string;
  texto: string;
  /** Coincide también con las subrutas: /panel/empleados/[id] sigue activo. */
  activo: (ruta: string) => boolean;
  icono: React.ReactNode;
};

const trazo = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

const ACCESOS: Acceso[] = [
  {
    href: '/panel',
    texto: 'Panel principal',
    activo: (r) => r === '/panel' || r.startsWith('/panel/empresas'),
    icono: (
      <>
        <path d="M2.5 7.5 9 2l6.5 5.5" {...trazo} />
        <path d="M4 7v7.5h10V7" {...trazo} />
      </>
    ),
  },
  {
    href: '/panel/empleados',
    texto: 'Empleados',
    activo: (r) => r.startsWith('/panel/empleados'),
    icono: (
      <>
        <circle cx="7" cy="6" r="2.6" {...trazo} />
        <path d="M2.6 15c0-2.4 2-4 4.4-4s4.4 1.6 4.4 4" {...trazo} />
        <path d="M12.4 4.2a2.4 2.4 0 0 1 0 4.4M13.2 11.4c1.5.5 2.4 1.8 2.4 3.6" {...trazo} />
      </>
    ),
  },
  {
    href: '/panel/calendario',
    texto: 'Calendario',
    activo: (r) => r.startsWith('/panel/calendario'),
    icono: (
      <>
        <rect x="2.4" y="3.6" width="13.2" height="12" rx="1.6" {...trazo} />
        <path d="M2.4 7.2h13.2M6 2.2v2.6M12 2.2v2.6" {...trazo} />
        <circle cx="6.4" cy="10.6" r="1" fill="currentColor" stroke="none" />
        <circle cx="9.9" cy="10.6" r="1" fill="currentColor" stroke="none" />
      </>
    ),
  },
  {
    href: '/panel/reportes',
    texto: 'Reportes',
    activo: (r) => r.startsWith('/panel/reportes') || r.startsWith('/panel/envios'),
    icono: (
      <>
        <path d="M2.6 15.4h12.8" {...trazo} />
        <rect x="3.6" y="9" width="2.8" height="4.6" rx="0.7" {...trazo} />
        <rect x="7.6" y="5.6" width="2.8" height="8" rx="0.7" {...trazo} />
        <rect x="11.6" y="7.6" width="2.8" height="6" rx="0.7" {...trazo} />
      </>
    ),
  },
  {
    href: '/panel/plantillas',
    texto: 'Plantillas',
    activo: (r) => r.startsWith('/panel/plantillas'),
    icono: (
      <>
        <path d="M5.4 2.6h5l3.2 3.2v9.6H5.4z" {...trazo} />
        <path d="M10.2 2.6v3.4h3.4" {...trazo} />
        <path d="M7.4 9.4h4.2M7.4 12h2.8" {...trazo} />
      </>
    ),
  },
];

export default function AccesosRapidos({
  color,
  contraste,
}: {
  color: string;
  contraste: string;
}) {
  const ruta = usePathname();
  const sobreOscuro = contraste === '#ffffff';
  const borde = sobreOscuro ? 'rgba(255,255,255,.38)' : 'rgba(20,38,63,.22)';

  return (
    <nav className="accesos-barra" style={e.barra} aria-label="Accesos rápidos">
      {ACCESOS.map((a) => {
        const activo = a.activo(ruta);
        return (
          <Link
            key={a.href}
            href={a.href}
            title={a.texto}
            aria-current={activo ? 'page' : undefined}
            className="acceso-rapido"
            style={{
              ...e.acceso,
              background: activo ? contraste : 'transparent',
              color: activo ? color : contraste,
              borderColor: activo ? contraste : borde,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"
              style={{ flexShrink: 0 }}>
              {a.icono}
            </svg>
            <span className="acceso-texto">{a.texto}</span>
          </Link>
        );
      })}

      <style>{`
        .acceso-rapido:hover { border-color: currentColor !important; }
        @media (max-width: 1180px) {
          .acceso-texto { display: none; }
          .acceso-rapido { padding-left: 9px !important; padding-right: 9px !important; }
        }
        /* Bajo 900 px el lateral se oculta tras el botón hamburguesa y
           estos accesos vuelven a él: en un celular no caben cinco
           botones más el selector de empresa. La regla vive aquí, con el
           componente, y no en el layout: así se puede comprobar sin
           montar la página entera. */
        /* Lleva !important porque el display:flex va en línea, y un
           estilo en línea le gana a la hoja: sin esto la regla se
           escribe, no da error y no hace nada. */
        @media (max-width: 900px) { .accesos-barra { display: none !important; } }
      `}</style>
    </nav>
  );
}

const e: Record<string, React.CSSProperties> = {
  barra: { display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'nowrap' },
  acceso: {
    display: 'flex', alignItems: 'center', gap: 7,
    padding: '7px 12px', borderRadius: 8,
    borderWidth: 1, borderStyle: 'solid',
    fontSize: 12.5, fontWeight: 600, textDecoration: 'none',
    whiteSpace: 'nowrap', transition: 'border-color .15s ease',
  },
};
