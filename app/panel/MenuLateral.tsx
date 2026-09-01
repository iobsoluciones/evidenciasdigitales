'use client';

/**
 * MENÚ LATERAL — agrupado por PHVA
 * ---------------------------------------------------------------
 * Encabezado: el profesional. Debajo, un acceso permanente al panel
 * principal —cartera de empresas, semáforo y bandeja de pendientes— y
 * luego los módulos, que operan siempre sobre la empresa activa.
 *
 * Los módulos van bajo las cuatro fases del ciclo: PLANEAR, HACER,
 * VERIFICAR, ACTUAR. El beneficio no es estético: **hace evidente lo que
 * falta**. Un consultor que abre PLANEAR y lo ve vacío sabe dónde está
 * débil el sistema sin que nadie se lo explique, y es el mismo lenguaje
 * con el que un auditor recorre el SG-SST.
 *
 * Cada fase tiene su color y su icono, y los módulos cuelgan de una
 * línea de ese color. No es decoración: en un menú de nueve módulos, el
 * color es lo que permite saber en qué parte del ciclo se está sin leer
 * el encabezado. Los colores son los cuatro del PHVA y NO el de la
 * empresa —ese vive en la barra superior— para que no se confundan dos
 * señales distintas.
 *
 * Los nombres repetidos se desambiguaron: había tres «Indicadores» y
 * tres «Matriz» en el menú, y ninguno decía de qué.
 */
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { EVENTO_MENU } from './BotonMenu';
import { paraTexto, aclarar } from '@/lib/color';

type Enlace = { href: string; texto: string };
type Fase = 'planear' | 'hacer' | 'verificar' | 'actuar';
type Modulo = {
  id: string; titulo: string; fase: Fase;
  enlaces: Enlace[]; pronto?: boolean;
};

const trazoFase = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

const FASES: {
  v: Fase; t: string; color: string; fondo: string; icono: React.ReactNode;
}[] = [
  {
    v: 'planear', t: 'Planear', color: 'var(--fase-planear)', fondo: 'var(--fase-planear-fondo)',
    // Documento con líneas: lo que se escribe antes de hacer nada.
    icono: (
      <>
        <path d="M4.2 2.6h6l3.6 3.6v9.2H4.2z" {...trazoFase} />
        <path d="M10.2 2.6v3.6h3.6M6.6 9h4.8M6.6 11.6h3" {...trazoFase} />
      </>
    ),
  },
  {
    v: 'hacer', t: 'Hacer', color: 'var(--fase-hacer)', fondo: 'var(--fase-hacer-fondo)',
    // Engranaje: la operación.
    icono: (
      <>
        <circle cx="9" cy="9" r="2.5" {...trazoFase} />
        <path d="M9 2.4v2M9 13.6v2M2.4 9h2M13.6 9h2M4.4 4.4l1.4 1.4M12.2 12.2l1.4 1.4M13.6 4.4l-1.4 1.4M5.8 12.2l-1.4 1.4" {...trazoFase} />
      </>
    ),
  },
  {
    v: 'verificar', t: 'Verificar', color: 'var(--fase-verificar)', fondo: 'var(--fase-verificar-fondo)',
    // Lupa: mirar lo que se hizo.
    icono: (
      <>
        <circle cx="8" cy="8" r="4.4" {...trazoFase} />
        <path d="M11.4 11.4 15 15M6.2 8l1.4 1.5 2.4-2.6" {...trazoFase} />
      </>
    ),
  },
  {
    v: 'actuar', t: 'Actuar', color: 'var(--fase-actuar)', fondo: 'var(--fase-actuar-fondo)',
    // Flecha que vuelve: la mejora continua cierra el ciclo.
    icono: (
      <>
        <path d="M14.6 9a5.6 5.6 0 1 1-1.7-4" {...trazoFase} />
        <path d="M13.2 1.8v3.4h-3.4" {...trazoFase} />
      </>
    ),
  },
];

const MODULOS: Modulo[] = [
  {
    // Lo que sostiene todo lo demas: sin peligros identificados no se
    // puede justificar por que ese EPP y no otro.
    id: 'planeacion',
    titulo: 'Planeación del sistema',
    fase: 'planear',
    enlaces: [
      { href: '/panel/peligros', texto: 'Matriz de peligros' },
      { href: '/panel/plan-anual', texto: 'Plan anual de trabajo' },
      { href: '/panel/matriz-legal', texto: 'Matriz legal' },
      { href: '/panel/comites', texto: 'Comités y brigada' },
    ],
  },
  {
    id: 'capacitaciones',
    titulo: 'Capacitaciones',
    fase: 'hacer',
    enlaces: [
      { href: '/panel/capacitaciones', texto: 'Listado' },
      { href: '/panel/matriz', texto: 'Matriz de capacitaciones' },
      { href: '/panel/indicadores', texto: 'Indicadores de capacitación' },
    ],
  },
  {
    // EPP y equipos comparten modulo: el acta de entrega es la misma.
    id: 'dotacion',
    titulo: 'Dotación',
    fase: 'hacer',
    enlaces: [
      { href: '/panel/dotacion', texto: 'Inventario' },
      { href: '/panel/dotacion/entregas', texto: 'Entregas' },
      { href: '/panel/dotacion/devoluciones', texto: 'Devoluciones' },
      { href: '/panel/dotacion/matriz', texto: 'Matriz de dotación' },
      { href: '/panel/dotacion/alertas', texto: 'Alertas' },
    ],
  },
  {
    id: 'salud',
    titulo: 'Salud de los trabajadores',
    fase: 'hacer',
    enlaces: [
      { href: '/panel/examenes', texto: 'Exámenes médicos' },
      { href: '/panel/ausentismo', texto: 'Ausentismo' },
      { href: '/panel/horas', texto: 'Horas-hombre' },
    ],
  },
  {
    id: 'emergencias',
    titulo: 'Emergencias',
    fase: 'hacer',
    enlaces: [
      { href: '/panel/emergencias', texto: 'Análisis de amenazas' },
      { href: '/panel/emergencias/simulacros', texto: 'Simulacros' },
    ],
  },
  {
    // El caso de uso mas movil del SG-SST: se diligencia de pie.
    id: 'alto-riesgo',
    titulo: 'Alto riesgo y contratistas',
    fase: 'hacer',
    enlaces: [
      { href: '/panel/permisos', texto: 'Permisos de trabajo' },
      { href: '/panel/contratistas', texto: 'Contratistas' },
    ],
  },
  {
    id: 'inspecciones',
    titulo: 'Inspecciones',
    fase: 'verificar',
    enlaces: [
      { href: '/panel/inspecciones', texto: 'Inspecciones' },
      { href: '/panel/inspecciones/programadas', texto: 'Programación' },
      { href: '/panel/inspecciones/plantillas', texto: 'Listas de verificación' },
      { href: '/panel/inspecciones/indicadores', texto: 'Indicadores de inspección' },
    ],
  },
  {
    // Verificar el sistema completo, no un area: es lo que mira el
    // Ministerio en una visita.
    id: 'evaluacion',
    titulo: 'Evaluación del sistema',
    fase: 'verificar',
    enlaces: [
      { href: '/panel/autoevaluacion', texto: 'Autoevaluación 0312' },
      { href: '/panel/estandares', texto: 'Conjuntos de estándares' },
      { href: '/panel/indicadores/legales', texto: 'Indicadores del art. 30' },
    ],
  },
  {
    // De aqui salen las acciones: un hallazgo sin accion no cerro nada.
    id: 'mejora',
    titulo: 'Mejora',
    fase: 'actuar',
    enlaces: [
      { href: '/panel/eventos', texto: 'Accidentes e incidentes' },
      { href: '/panel/acciones', texto: 'Plan de acción' },
      { href: '/panel/rendicion', texto: 'Rendición de cuentas' },
    ],
  },
];

export default function MenuLateral({
  color,
  profesional,
  rol,
  plan,
}: {
  color: string;
  profesional: string;
  rol: string;
  plan: string;
}) {
  const ruta = usePathname();

  // El color de la empresa se usa aquí como TEXTO sobre la superficie
  // del lateral. En tema claro hay que oscurecerlo —un amarillo sería
  // ilegible— y en tema oscuro hay que aclararlo —un azul marino se
  // perdería—. Se calculan los dos y decide el CSS: el servidor no sabe
  // qué tema tiene guardado el navegador. El color de fondo de los
  // botones sí usa el original, que ahí sí se ve.
  const variablesMarca = {
    '--marca-empresa-claro': paraTexto(color),
    '--marca-empresa-oscuro': aclarar(color),
  } as React.CSSProperties;

  const moduloActivo =
    MODULOS.find((m) => m.enlaces.some((x) => ruta === x.href || ruta.startsWith(x.href + '/')))?.id
    ?? 'capacitaciones';

  const [abierto, setAbierto] = useState<string | null>(moduloActivo);
  const [movil, setMovil] = useState(false);

  // El botón que abre el menú está en la barra superior, fuera de este
  // componente. Se comunica por evento para no tener que subir el
  // estado a un layout que es Server Component.
  useEffect(() => {
    const alternar = () => setMovil((v) => !v);
    window.addEventListener(EVENTO_MENU, alternar);
    return () => window.removeEventListener(EVENTO_MENU, alternar);
  }, []);

  const enCartera = ruta === '/panel' || ruta.startsWith('/panel/empresas');
  const enEmpleados = ruta.startsWith('/panel/empleados');
  const enCalendario = ruta.startsWith('/panel/calendario');
  const enReportes = ruta.startsWith('/panel/reportes') || ruta.startsWith('/panel/envios');
  const enPlantillas = ruta.startsWith('/panel/plantillas');
  const enPerfil = ruta.startsWith('/panel/perfil');
  const enConfig = ruta.startsWith('/panel/configuracion');

  return (
    <>
      <nav
        style={{ ...e.lateral, ...variablesMarca }}
        className={movil ? 'lateral abierto' : 'lateral'}
      >
        {/* ---------- El profesional ---------- */}
        <div style={e.cabecera}>
          <div style={e.nombre}>{profesional}</div>
          <div style={e.meta}>
            <span style={e.etiqueta}>{rol}</span>
            <span style={e.etiqueta}>plan {plan}</span>
          </div>
        </div>

        {/* ---------- Accesos transversales ----------
            En pantalla ancha viven en la barra superior, que es donde
            estorban menos. Aquí quedan SOLO para el móvil, donde la barra
            no tiene sitio y el lateral es el único menú que hay. */}
        <div className="accesos-lateral" style={{ padding: '14px 12px 6px' }}>
          {[
            { href: '/panel', texto: 'Panel principal', activo: enCartera, icono: '\u2302' },
            { href: '/panel/empleados', texto: 'Empleados', activo: enEmpleados, icono: '\u263a' },
            { href: '/panel/calendario', texto: 'Calendario', activo: enCalendario, icono: '\u25a6' },
            { href: '/panel/reportes', texto: 'Reportes', activo: enReportes, icono: '\u2261' },
            { href: '/panel/plantillas', texto: 'Plantillas de capacitación', activo: enPlantillas, icono: '\u25a4' },
          ].map((x, i) => (
            <Link
              key={x.href}
              href={x.href}
              onClick={() => setMovil(false)}
              style={{
                ...e.cartera,
                marginTop: i === 0 ? 0 : 6,
                background: x.activo ? color : 'var(--superficie)',
                color: x.activo ? 'var(--sobre-marca)' : 'var(--texto)',
                borderColor: x.activo ? color : 'var(--borde-fuerte)',
              }}
            >
              <span style={e.iconoCartera} aria-hidden="true">{x.icono}</span>
              {x.texto}
            </Link>
          ))}
        </div>

        {/* ---------- Módulos, agrupados por PHVA ---------- */}
        <div style={e.modulos}>
          {FASES.map((f) => (
            <div key={f.v} style={{ marginBottom: 4 }}>
              <div style={{ ...e.fase, color: f.color }}>
                <span style={{ ...e.faseIcono, background: f.fondo }}>
                  <svg width="14" height="14" viewBox="0 0 18 18" aria-hidden="true">
                    {f.icono}
                  </svg>
                </span>
                {f.t}
              </div>
              <div style={{ ...e.faseCuerpo, borderLeftColor: f.fondo }}>
              {MODULOS.filter((m) => m.fase === f.v).map((m) => {
            const desplegado = abierto === m.id;
            return (
              <div key={m.id} style={{ marginBottom: 2 }}>
                <button
                  onClick={() => setAbierto(desplegado ? null : m.id)}
                  style={{
                    ...e.botonModulo,
                    color: desplegado ? 'var(--marca-empresa)' : 'var(--texto-suave)',
                    fontWeight: desplegado ? 700 : 600,
                  }}
                  aria-expanded={desplegado}
                >
                  <span>{m.titulo}</span>
                  <span style={{ ...e.flecha, transform: desplegado ? 'rotate(90deg)' : 'none' }}>›</span>
                </button>

                {m.pronto && desplegado && <div style={e.pronto}>En construcción</div>}

                {desplegado && (
                  <ul style={e.lista}>
                    {m.enlaces.map((en) => {
                      const activo = ruta === en.href;
                      if (m.pronto) {
                        return <li key={en.href} style={{ ...e.item, ...e.itemInactivo }}>{en.texto}</li>;
                      }
                      return (
                        <li key={en.href}>
                          <Link
                            href={en.href}
                            onClick={() => setMovil(false)}
                            style={{
                              ...e.item,
                              ...(activo
                                ? { color, fontWeight: 600, borderLeftColor: color, background: '#fff' }
                                : {}),
                            }}
                          >
                            {en.texto}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
              })}
              </div>
            </div>
          ))}
        </div>

        {/* Configuración al pie: se consulta poco y no compite con
            lo que se usa a diario. */}
        <div style={e.pie}>
          <Link
            href="/panel/perfil"
            onClick={() => setMovil(false)}
            style={{
              ...e.cartera,
              marginBottom: 6,
              background: enPerfil ? color : '#fff',
              color: enPerfil ? 'var(--sobre-marca)' : 'var(--texto)',
              borderColor: enPerfil ? color : 'var(--borde-fuerte)',
            }}
          >
            <span style={e.iconoCartera} aria-hidden="true">◉</span>
            Mi perfil
          </Link>

          <Link
            href="/panel/configuracion"
            onClick={() => setMovil(false)}
            style={{
              ...e.cartera,
              background: enConfig ? color : '#fff',
              color: enConfig ? 'var(--sobre-marca)' : 'var(--texto)',
              borderColor: enConfig ? color : 'var(--borde-fuerte)',
            }}
          >
            <span style={e.iconoCartera} aria-hidden="true">⚙</span>
            Configuración
          </Link>
        </div>
      </nav>

      {movil && <div onClick={() => setMovil(false)} style={e.velo} className="solo-movil" />}

      <style>{`
        .solo-movil { display: none; }
        .accesos-lateral { display: none; }
        @media (max-width: 900px) {
          .solo-movil { display: flex; }
          .lateral {
            position: fixed; top: 0; left: 0; bottom: 0; z-index: 60;
            transform: translateX(-100%); transition: transform .22s ease;
          }
          .lateral.abierto { transform: translateX(0); }
          .accesos-lateral { display: block; }
        }
      `}</style>
    </>
  );
}

const e: Record<string, React.CSSProperties> = {
  lateral: {
    width: 246, flexShrink: 0, background: 'var(--superficie-2)',
    borderRight: '1px solid var(--borde)', minHeight: '100vh',
    padding: '22px 0', display: 'flex', flexDirection: 'column',
  },
  cabecera: { padding: '0 20px 16px', borderBottom: '1px solid var(--borde)' },
  nombre: { fontSize: 14.5, fontWeight: 700, lineHeight: 1.3, letterSpacing: -0.1, color: 'var(--texto)' },
  meta: { display: 'flex', gap: 6, marginTop: 7, flexWrap: 'wrap' },
  etiqueta: {
    fontSize: 9.5, textTransform: 'uppercase', letterSpacing: .6,
    background: 'var(--superficie-3)', color: 'var(--texto-suave)', padding: '2px 7px', borderRadius: 3,
  },

  cartera: {
    display: 'flex', alignItems: 'center', gap: 9, padding: '10px 12px',
    fontSize: 12.5, fontWeight: 600, textDecoration: 'none',
    borderWidth: 1, borderStyle: 'solid', borderRadius: 6,
  },
  iconoCartera: { fontSize: 12, lineHeight: 1 },

  modulos: { padding: '8px 12px 14px', flex: 1 },
  fase: {
    display: 'flex', alignItems: 'center', gap: 7,
    fontSize: 10, fontWeight: 800, letterSpacing: 1,
    textTransform: 'uppercase', padding: '12px 8px 6px',
  },
  faseIcono: {
    width: 20, height: 20, borderRadius: 6, flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  /* La línea de color ata los módulos a su fase sin repetir el rótulo. */
  faseCuerpo: {
    borderLeftWidth: 2, borderLeftStyle: 'solid',
    marginLeft: 17, paddingLeft: 8,
  },
  pie: { padding: 12, borderTop: '1px solid var(--borde)' },
  botonModulo: {
    width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    background: 'none', border: 'none', padding: '9px 8px', fontSize: 13,
    cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', borderRadius: 6,
  },
  flecha: { fontSize: 15, color: 'var(--texto-tenue)', transition: 'transform .16s ease', lineHeight: 1 },
  pronto: { fontSize: 9.5, textTransform: 'uppercase', letterSpacing: .5, color: 'var(--texto-tenue)', padding: '0 8px 6px' },
  lista: { listStyle: 'none', margin: '2px 0 10px', padding: 0 },
  item: {
    display: 'block', padding: '7px 12px', fontSize: 12.5, color: 'var(--texto-suave)',
    textDecoration: 'none', marginLeft: 8,
    borderLeftWidth: 2, borderLeftStyle: 'solid', borderLeftColor: 'transparent',
  },
  itemInactivo: { color: 'var(--texto-tenue)', cursor: 'default' },

  velo: { position: 'fixed', inset: 0, background: 'rgba(20,38,63,.45)', zIndex: 55 },
};
