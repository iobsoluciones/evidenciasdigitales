'use client';

/**
 * NOMENCLATURA POR TIPO DE DOCUMENTO
 * ---------------------------------------------------------------
 * Una casilla por formato. Antes había una sola para todos, que es
 * justo lo que un auditor no acepta: el acta de capacitación y el acta
 * de entrega son formatos distintos del SG-SST y cada uno lleva su
 * código y su versión, que además avanzan por separado.
 *
 * Lo que se cambia aquí solo afecta a lo que se emita después. Lo ya
 * emitido conserva su código, y conviene decirlo en la pantalla: es la
 * duda que aparece siempre al subir una versión.
 */
import { useState, useTransition } from 'react';
import { guardarNomenclaturas } from '@/lib/acciones-empresas';
import { TIPOS_DOCUMENTO, leerMapa } from '@/lib/nomenclaturas';
import type { MapaNomenclaturas } from '@/lib/nomenclaturas';

export default function NomenclaturasDoc({
  empresaId,
  actuales,
  respaldo,
  color,
  esAdmin,
}: {
  empresaId: string;
  actuales: Record<string, unknown>;
  /** Lo que tenía la empresa cuando había una sola nomenclatura. */
  respaldo: { nomenclatura: string; version: string };
  color: string;
  esAdmin: boolean;
}) {
  const [pendiente, startTransition] = useTransition();
  const [editando, setEditando] = useState(false);
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  const inicial = completar(leerMapa(actuales), respaldo);
  const [f, setF] = useState(inicial);

  function completar(
    mapa: MapaNomenclaturas,
    base: { nomenclatura: string; version: string }
  ) {
    const salida: Record<string, { nomenclatura: string; version: string }> = {};
    for (const { tipo } of TIPOS_DOCUMENTO) {
      salida[tipo] = {
        nomenclatura: mapa[tipo]?.nomenclatura || base.nomenclatura || '',
        version: mapa[tipo]?.version || base.version || 'V1',
      };
    }
    return salida;
  }

  function cambiar(tipo: string, campo: 'nomenclatura' | 'version', valor: string) {
    setF((p) => ({ ...p, [tipo]: { ...p[tipo], [campo]: valor.toUpperCase() } }));
  }

  function guardar() {
    setAviso(null);
    startTransition(async () => {
      const r = await guardarNomenclaturas(empresaId, f);
      setAviso({ tipo: r.ok ? 'ok' : 'error', texto: r.mensaje });
      if (r.ok) setEditando(false);
    });
  }

  function cancelar() {
    setF(inicial);
    setEditando(false);
    setAviso(null);
  }

  return (
    <section style={s.tarjeta}>
      <div style={s.cabecera}>
        <div>
          <h2 style={s.h2}>Nomenclatura por documento</h2>
          <p style={s.sub}>
            Cada formato lleva su propio código y su propia versión.
          </p>
        </div>
        {esAdmin && !editando && (
          <button onClick={() => setEditando(true)} style={{ ...s.boton, borderColor: color, color }}>
            Editar
          </button>
        )}
      </div>

      <div style={s.lista}>
        {TIPOS_DOCUMENTO.map(({ tipo, etiqueta, detalle }) => (
          <div key={tipo} style={s.fila}>
            <div style={s.izquierda}>
              <span style={s.etiqueta}>{etiqueta}</span>
              <span style={s.detalle}>{detalle}</span>
            </div>

            {editando ? (
              <div style={s.campos}>
                <input
                  value={f[tipo].nomenclatura}
                  onChange={(e) => cambiar(tipo, 'nomenclatura', e.target.value)}
                  placeholder="FT-SST-001"
                  style={{ ...s.input, flex: '2 1 130px' }}
                />
                <input
                  value={f[tipo].version}
                  onChange={(e) => cambiar(tipo, 'version', e.target.value)}
                  placeholder="V1"
                  style={{ ...s.input, flex: '1 1 60px', maxWidth: 80 }}
                />
              </div>
            ) : (
              <div style={s.valores}>
                <span style={s.mono}>{f[tipo].nomenclatura || 'Sin definir'}</span>
                <span style={s.version}>{f[tipo].version}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {editando && (
        <>
          <p style={s.nota}>
            El cambio aplica a los documentos que se emitan de aquí en adelante.
            Las actas y los informes ya emitidos conservan el código y la versión
            con que salieron.
          </p>
          <div style={s.acciones}>
            <button onClick={cancelar} style={s.botonPlano}>Cancelar</button>
            <button
              onClick={guardar}
              disabled={pendiente}
              style={{ ...s.botonLleno, background: pendiente ? 'var(--borde-fuerte)' : color }}
            >
              {pendiente ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </>
      )}

      {aviso && (
        <div style={{
          ...s.aviso,
          background: aviso.tipo === 'ok' ? 'var(--bien-fondo)' : 'var(--mal-fondo)',
          color: aviso.tipo === 'ok' ? 'var(--bien)' : 'var(--mal)',
        }}>
          {aviso.texto}
        </div>
      )}
    </section>
  );
}

const s: Record<string, React.CSSProperties> = {
  tarjeta: {
    background: 'var(--superficie)', border: '1px solid var(--borde)', borderRadius: 12,
    padding: '18px 20px', marginTop: 18,
  },
  cabecera: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    gap: 12, marginBottom: 14,
  },
  h2: { fontSize: 15.5, fontWeight: 700, color: 'var(--texto)', margin: 0 },
  sub: { fontSize: 12.5, color: 'var(--texto-suave)', margin: '3px 0 0' },
  boton: {
    background: 'var(--superficie)', border: '1px solid', padding: '6px 15px',
    borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
  },
  lista: { display: 'flex', flexDirection: 'column' },
  fila: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    gap: 14, padding: '11px 0', borderTop: '1px solid var(--superficie-3)', flexWrap: 'wrap',
  },
  izquierda: { display: 'flex', flexDirection: 'column', gap: 2, flex: '1 1 200px', minWidth: 170 },
  etiqueta: { fontSize: 13.5, fontWeight: 600, color: 'var(--texto)' },
  detalle: { fontSize: 11.5, color: 'var(--texto-suave)', lineHeight: 1.45 },
  campos: { display: 'flex', gap: 7, flex: '1 1 200px', justifyContent: 'flex-end' },
  input: {
    padding: '7px 10px', border: '1px solid var(--borde)', borderRadius: 7,
    fontSize: 12.5, fontFamily: "'Consolas','Courier New',monospace",
    boxSizing: 'border-box', minWidth: 0,
  },
  valores: { display: 'flex', alignItems: 'center', gap: 9 },
  mono: {
    fontFamily: "'Consolas','Courier New',monospace", fontSize: 13,
    color: 'var(--texto)', fontWeight: 600,
  },
  version: {
    fontSize: 11, fontWeight: 700, color: 'var(--texto-suave)', background: 'var(--fondo)',
    border: '1px solid var(--borde)', borderRadius: 20, padding: '2px 9px',
  },
  nota: {
    fontSize: 12, color: 'var(--aviso)', background: 'var(--aviso-fondo)',
    border: '1px solid var(--aviso)', borderRadius: 8, padding: '10px 12px',
    margin: '14px 0 0', lineHeight: 1.55,
  },
  acciones: { display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 },
  botonPlano: {
    background: 'none', border: 'none', color: 'var(--texto-suave)',
    fontSize: 12.5, cursor: 'pointer', padding: '8px 12px',
  },
  botonLleno: {
    color: 'var(--sobre-marca)', border: 'none', padding: '8px 20px', borderRadius: 8,
    fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
  },
  aviso: { marginTop: 12, padding: '9px 12px', borderRadius: 8, fontSize: 12.5 },
};
