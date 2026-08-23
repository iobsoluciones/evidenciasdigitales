'use client';

/**
 * SELECTOR DE EMPRESA
 * ---------------------------------------------------------------
 * Fija el contexto de todo el panel. Al cambiarla se refresca el
 * servidor, no solo la vista: las consultas se rehacen filtradas.
 */
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
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
  const [pendiente, startTransition] = useTransition();
  const [abierto, setAbierto] = useState(false);

  if (empresas.length === 0) return null;

  function cambiar(id: string) {
    setAbierto(false);
    startTransition(async () => {
      await seleccionarEmpresa(id);
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
        <span style={{ ...e.punto, background: activa?.color_primario ?? '#94A3B8' }} />
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
                  background: em.id === activa?.id ? '#F2F4F7' : 'transparent',
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
    background: '#fff', border: '1px solid #DFDFD8', borderRadius: 5,
    padding: '8px 12px', fontSize: 13, cursor: 'pointer',
    fontFamily: 'inherit', color: '#14263F', minWidth: 210,
  },
  punto: { width: 8, height: 8, borderRadius: '50%', flexShrink: 0 },
  nombre: {
    flex: 1, textAlign: 'left', whiteSpace: 'nowrap',
    overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 600,
  },
  flecha: { fontSize: 11, color: '#8A929C', transition: 'transform .15s' },
  velo: { position: 'fixed', inset: 0, zIndex: 40 },
  menu: {
    position: 'absolute', top: 'calc(100% + 5px)', left: 0, zIndex: 50,
    background: '#fff', border: '1px solid #DFDFD8', borderRadius: 6,
    boxShadow: '0 10px 30px rgba(20,38,63,.13)', minWidth: 280,
    maxHeight: 360, overflowY: 'auto', padding: 4,
  },
  encabezadoMenu: {
    fontSize: 10, letterSpacing: .7, textTransform: 'uppercase',
    color: '#8A929C', padding: '8px 10px 6px',
  },
  opcion: {
    display: 'flex', alignItems: 'center', gap: 9, width: '100%',
    border: 'none', padding: '9px 10px', fontSize: 13, cursor: 'pointer',
    fontFamily: 'inherit', color: '#14263F', borderRadius: 4,
  },
  ciudad: { fontSize: 10.5, color: '#8A929C' },
};
