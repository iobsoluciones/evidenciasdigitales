'use client';

/**
 * MENÚ LATERAL
 * ---------------------------------------------------------------
 * Encabezado: el profesional. Debajo, un acceso permanente a la
 * gestión de empresas —que es la vista de cartera— y luego los
 * módulos, que operan siempre sobre la empresa activa.
 */
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { EVENTO_MENU } from './BotonMenu';

type Enlace = { href: string; texto: string };
type Modulo = { id: string; titulo: string; enlaces: Enlace[]; pronto?: boolean };

const MODULOS: Modulo[] = [
  {
    id: 'capacitaciones',
    titulo: 'Capacitaciones',
    enlaces: [
      { href: '/panel/indicadores', texto: 'Indicadores' },
      { href: '/panel/capacitaciones', texto: 'Listado' },
      { href: '/panel/empleados', texto: 'Empleados' },
      { href: '/panel/matriz', texto: 'Matriz' },
    ],
  },
  {
    // EPP y equipos comparten módulo: el acta de entrega es la misma.
    // Las entregas y devoluciones llegan en fases posteriores.
    id: 'dotacion',
    titulo: 'Dotación',
    enlaces: [
      { href: '/panel/dotacion', texto: 'Inventario' },
      { href: '/panel/dotacion/entregas', texto: 'Entregas' },
      { href: '/panel/dotacion/devoluciones', texto: 'Devoluciones' },
      { href: '/panel/dotacion/matriz', texto: 'Matriz' },
      { href: '/panel/dotacion/alertas', texto: 'Alertas' },
    ],
  },
  {
    // La matriz de peligros es el PLANEAR del ciclo: de ella deberian
    // derivarse los controles de los demas modulos.
    id: 'peligros',
    titulo: 'Planeación',
    enlaces: [
      { href: '/panel/peligros', texto: 'Matriz de peligros' },
      { href: '/panel/plan-anual', texto: 'Plan anual de trabajo' },
      { href: '/panel/autoevaluacion', texto: 'Autoevaluación 0312' },
    ],
  },
  {
    // Accidentes e incidentes: Res. 1401/2007. Va junto a inspecciones
    // porque ambos terminan en el mismo plan de accion.
    id: 'eventos',
    titulo: 'Salud y accidentalidad',
    enlaces: [
      { href: '/panel/eventos', texto: 'Accidentes e incidentes' },
      { href: '/panel/examenes', texto: 'Exámenes médicos' },
      { href: '/panel/horas', texto: 'Horas-hombre' },
    ],
  },
  {
    id: 'inspecciones',
    titulo: 'Inspecciones',
    enlaces: [
      { href: '/panel/inspecciones', texto: 'Inspecciones' },
      { href: '/panel/inspecciones/plantillas', texto: 'Listas de verificación' },
      { href: '/panel/acciones', texto: 'Plan de acción' },
      { href: '/panel/inspecciones/indicadores', texto: 'Indicadores' },
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
  const enCalendario = ruta.startsWith('/panel/calendario');
  const enReportes = ruta.startsWith('/panel/reportes') || ruta.startsWith('/panel/envios');
  const enPlantillas = ruta.startsWith('/panel/plantillas');
  const enPerfil = ruta.startsWith('/panel/perfil');
  const enConfig = ruta.startsWith('/panel/configuracion');

  return (
    <>
      <nav style={e.lateral} className={movil ? 'lateral abierto' : 'lateral'}>
        {/* ---------- El profesional ---------- */}
        <div style={e.cabecera}>
          <div style={e.nombre}>{profesional}</div>
          <div style={e.meta}>
            <span style={e.etiqueta}>{rol}</span>
            <span style={e.etiqueta}>plan {plan}</span>
          </div>
        </div>

        {/* ---------- Cartera ---------- */}
        <div style={{ padding: '14px 12px 6px' }}>
          <Link
            href="/panel"
            onClick={() => setMovil(false)}
            style={{
              ...e.cartera,
              background: enCartera ? color : '#fff',
              color: enCartera ? '#fff' : '#14263F',
              borderColor: enCartera ? color : '#DFDFD8',
            }}
          >
            <span style={e.iconoCartera} aria-hidden="true">▦</span>
            Gestión de empresas
          </Link>

          <Link
            href="/panel/calendario"
            onClick={() => setMovil(false)}
            style={{
              ...e.cartera,
              marginTop: 6,
              background: enCalendario ? color : '#fff',
              color: enCalendario ? '#fff' : '#14263F',
              borderColor: enCalendario ? color : '#DFDFD8',
            }}
          >
            <span style={e.iconoCartera} aria-hidden="true">▤</span>
            Calendario
          </Link>

          <Link
            href="/panel/reportes"
            onClick={() => setMovil(false)}
            style={{
              ...e.cartera,
              marginTop: 6,
              background: enReportes ? color : '#fff',
              color: enReportes ? '#fff' : '#14263F',
              borderColor: enReportes ? color : '#DFDFD8',
            }}
          >
            <span style={e.iconoCartera} aria-hidden="true">▥</span>
            Reportes
          </Link>

          <Link
            href="/panel/plantillas"
            onClick={() => setMovil(false)}
            style={{
              ...e.cartera,
              marginTop: 6,
              background: enPlantillas ? color : '#fff',
              color: enPlantillas ? '#fff' : '#14263F',
              borderColor: enPlantillas ? color : '#DFDFD8',
            }}
          >
            <span style={e.iconoCartera} aria-hidden="true">▧</span>
            Plantillas
          </Link>
        </div>

        {/* ---------- Módulos ---------- */}
        <div style={e.modulos}>
          {MODULOS.map((m) => {
            const desplegado = abierto === m.id;
            return (
              <div key={m.id} style={{ marginBottom: 2 }}>
                <button
                  onClick={() => setAbierto(desplegado ? null : m.id)}
                  style={{
                    ...e.botonModulo,
                    color: desplegado ? color : '#3C4650',
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
              color: enPerfil ? '#fff' : '#14263F',
              borderColor: enPerfil ? color : '#DFDFD8',
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
              color: enConfig ? '#fff' : '#14263F',
              borderColor: enConfig ? color : '#DFDFD8',
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
        @media (max-width: 900px) {
          .solo-movil { display: flex; }
          .lateral {
            position: fixed; top: 0; left: 0; bottom: 0; z-index: 60;
            transform: translateX(-100%); transition: transform .22s ease;
          }
          .lateral.abierto { transform: translateX(0); }
        }
      `}</style>
    </>
  );
}

const e: Record<string, React.CSSProperties> = {
  lateral: {
    width: 246, flexShrink: 0, background: '#FBFBF9',
    borderRight: '1px solid #E4E4DF', minHeight: '100vh',
    padding: '22px 0', display: 'flex', flexDirection: 'column',
  },
  cabecera: { padding: '0 20px 16px', borderBottom: '1px solid #E4E4DF' },
  nombre: { fontSize: 14.5, fontWeight: 700, lineHeight: 1.3, letterSpacing: -0.1, color: '#14263F' },
  meta: { display: 'flex', gap: 6, marginTop: 7, flexWrap: 'wrap' },
  etiqueta: {
    fontSize: 9.5, textTransform: 'uppercase', letterSpacing: .6,
    background: '#EFEFEA', color: '#5B6470', padding: '2px 7px', borderRadius: 3,
  },

  cartera: {
    display: 'flex', alignItems: 'center', gap: 9, padding: '10px 12px',
    fontSize: 12.5, fontWeight: 600, textDecoration: 'none',
    borderWidth: 1, borderStyle: 'solid', borderRadius: 5,
  },
  iconoCartera: { fontSize: 12, lineHeight: 1 },

  modulos: { padding: '8px 12px 14px', flex: 1 },
  pie: { padding: 12, borderTop: '1px solid #E4E4DF' },
  botonModulo: {
    width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    background: 'none', border: 'none', padding: '9px 8px', fontSize: 13,
    cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', borderRadius: 5,
  },
  flecha: { fontSize: 15, color: '#A3AAB3', transition: 'transform .16s ease', lineHeight: 1 },
  pronto: { fontSize: 9.5, textTransform: 'uppercase', letterSpacing: .5, color: '#8A929C', padding: '0 8px 6px' },
  lista: { listStyle: 'none', margin: '2px 0 10px', padding: 0 },
  item: {
    display: 'block', padding: '7px 12px', fontSize: 12.5, color: '#5B6470',
    textDecoration: 'none', marginLeft: 8,
    borderLeftWidth: 2, borderLeftStyle: 'solid', borderLeftColor: 'transparent',
  },
  itemInactivo: { color: '#B5BBC2', cursor: 'default' },

  velo: { position: 'fixed', inset: 0, background: 'rgba(20,38,63,.45)', zIndex: 55 },
};
