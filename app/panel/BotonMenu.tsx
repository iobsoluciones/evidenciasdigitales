'use client';

/**
 * BOTÓN DEL MENÚ (solo móvil)
 * ---------------------------------------------------------------
 * Vive en la barra superior, no en una franja propia. Antes el menú
 * traía su propia barra, que al ser hermana del lateral dentro de un
 * contenedor en fila se convertía en una COLUMNA: ocupaba ancho, el
 * nombre se partía en vertical y el contenido quedaba aplastado contra
 * el borde.
 *
 * Solo avisa; quien abre y cierra es el menú lateral. Así no hay que
 * subir el estado a un layout que es Server Component.
 */
export const EVENTO_MENU = 'rubrica:menu';

export default function BotonMenu({ color }: { color: string }) {
  return (
    <>
      <button
        onClick={() => window.dispatchEvent(new Event(EVENTO_MENU))}
        style={{ ...e.boton, borderColor: color, color }}
        className="boton-menu"
        aria-label="Abrir el menú"
      >
        <span style={{ ...e.linea, background: color }} />
        <span style={{ ...e.linea, background: color }} />
        <span style={{ ...e.linea, background: color }} />
      </button>

      <style>{`
        .boton-menu { display: none; }
        @media (max-width: 900px) { .boton-menu { display: flex; } }
      `}</style>
    </>
  );
}

const e: Record<string, React.CSSProperties> = {
  boton: {
    background: 'var(--superficie)', borderWidth: 1, borderStyle: 'solid', borderRadius: 8,
    padding: '9px 11px', cursor: 'pointer',
    flexDirection: 'column', gap: 4, alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  linea: { width: 17, height: 2, borderRadius: 2, display: 'block' },
};
