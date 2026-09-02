'use client';

/**
 * SELECTOR DE EMPRESA
 * ---------------------------------------------------------------
 * Fija el contexto de todo el panel. Al cambiarla se refresca el
 * servidor, no solo la vista: las consultas se rehacen filtradas.
 */
import { useState, useTransition } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { seleccionarEmpresa } from '@/lib/acciones-empresas';
import type { Empresa } from '@/lib/empresa-activa';

export default function SelectorEmpresa({
  empresas,
  activa,
}: {
  empresas: Empresa[];
  activa: Empresa | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [pendiente, startTransition] = useTransition();
  const [abierto, setAbierto] = useState(false);

  if (empresas.length === 0) return null;

  function cambiar(id: string) {
    setAbierto(false);
    startTransition(async () => {
      await seleccionarEmpresa(id);
      // Volver a la raiz del modulo actual (p. ej. /panel/capacitaciones),
      // ya filtrada por la nueva empresa. Evita quedarse en un detalle que
      // pertenece a la empresa anterior.
      const raizModulo = pathname.split('/').slice(0, 3).join('/') || '/panel';
      router.push(raizModulo);
      router.refresh();
    });
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setAbierto(!abierto)}
        disabled={pendiente}
        style={e.boton}
        aria-expanded={abierto}
      >
        <span style={{ ...e.punto, background: activa?.color_primario ?? 'var(--borde-fuerte)' }} />
        <span style={e.nombre}>{activa?.nombre ?? 'Sin empresa'}</span>
        <span style={{ ...e.flecha, transform: abierto ? 'rotate(180deg)' : 'none' }}>⌄</span>
      </button>

      {abierto && (
        <>
          <div onClick={() => setAbierto(false)} style={e.velo} />
          <div style={e.menu}>
            <div style={e.encabezadoMenu}>
              {empresas.length} empresa{empresas.length !== 1 ? 's' : ''} a tu cargo
            </div>
            {empresas.map((em) => (
              <button
                key={em.id}
                onClick={() => cambiar(em.id)}
                style={{
                  ...e.opcion,
                  background: em.id === activa?.id ? 'var(--superficie-3)' : 'transparent',
                  fontWeight: em.id === activa?.id ? 600 : 400,
                }}
              >
                <span style={{ ...e.punto, background: em.color_primario }} />
                <span style={{ flex: 1, textAlign: 'left' }}>{em.nombre}</span>
                {em.ciudad && <span style={e.ciudad}>{em.ciudad}</span>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

const e: Record<string, React.CSSProperties> = {
  boton: {
    display: 'flex', alignItems: 'center', gap: 9,
    background: 'var(--superficie)', border: '1px solid var(--borde-fuerte)', borderRadius: 6,
    padding: '8px 12px', fontSize: 13, cursor: 'pointer',
    fontFamily: 'inherit', color: 'var(--texto)', minWidth: 210,
  },
  punto: { width: 8, height: 8, borderRadius: '50%', flexShrink: 0 },
  nombre: {
    flex: 1, textAlign: 'left', whiteSpace: 'nowrap',
    overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 600,
  },
  flecha: { fontSize: 11, color: 'var(--texto-tenue)', transition: 'transform .15s' },
  velo: { position: 'fixed', inset: 0, zIndex: 40 },
  menu: {
    position: 'absolute', top: 'calc(100% + 5px)', left: 0, zIndex: 50,
    background: 'var(--superficie)', border: '1px solid var(--borde-fuerte)', borderRadius: 6,
    boxShadow: '0 10px 30px rgba(20,38,63,.13)', minWidth: 280,
    maxHeight: 360, overflowY: 'auto', padding: 4,
  },
  encabezadoMenu: {
    fontSize: 10, letterSpacing: .7, textTransform: 'uppercase',
    color: 'var(--texto-tenue)', padding: '8px 10px 6px',
  },
  opcion: {
    display: 'flex', alignItems: 'center', gap: 9, width: '100%',
    border: 'none', padding: '9px 10px', fontSize: 13, cursor: 'pointer',
    fontFamily: 'inherit', color: 'var(--texto)', borderRadius: 4,
  },
  ciudad: { fontSize: 10.5, color: 'var(--texto-tenue)' },
};
