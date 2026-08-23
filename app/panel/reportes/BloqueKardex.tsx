'use client';

/**
 * KARDEX — descarga
 * ---------------------------------------------------------------
 * Permite exportar todos los elementos o uno solo. La descarga va por
 * enlace directo, no por acción: el navegador gestiona el archivo y no
 * hay que sostener el buffer en memoria del servidor.
 */
import { useState } from 'react';
import type { ArticuloKardex } from '@/lib/acciones-kardex';

export default function BloqueKardex({
  articulos,
  color,
}: {
  articulos: ArticuloKardex[];
  color: string;
}) {
  const [articulo, setArticulo] = useState('todos');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');

  const consumibles = articulos.filter((a) => a.tipo === 'consumible');
  const retornables = articulos.filter((a) => a.tipo === 'retornable');

  const parametros = new URLSearchParams();
  if (articulo !== 'todos') parametros.set('articulo', articulo);
  if (desde) parametros.set('desde', desde);
  if (hasta) parametros.set('hasta', hasta);

  const enlace = `/api/kardex${parametros.toString() ? `?${parametros}` : ''}`;

  const elegido = articulos.find((a) => a.id === articulo);

  return (
    <section style={e.card}>
      <div style={{ marginBottom: 14 }}>
        <h2 style={e.h2}>Kardex de dotación</h2>
        <p style={e.sub}>
          Libro de movimientos con saldo corrido: cada línea muestra entrada,
          salida y cuánto queda después. Explica cómo se llegó a la existencia
          actual, no solo cuál es.
        </p>
      </div>

      {articulos.length === 0 ? (
        <p style={e.vacio}>
          No hay artículos registrados en el inventario de esta empresa.
        </p>
      ) : (
        <>
          <div style={e.campos}>
            <div style={{ flex: 2, minWidth: 220 }}>
              <label style={e.label}>Alcance</label>
              <select
                value={articulo}
                onChange={(x) => setArticulo(x.target.value)}
                style={e.input}
              >
                <option value="todos">
                  Todos los elementos ({articulos.length})
                </option>
                {consumibles.length > 0 && (
                  <optgroup label="Elementos de protección">
                    {consumibles.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.codigo} · {a.nombre}
                      </option>
                    ))}
                  </optgroup>
                )}
                {retornables.length > 0 && (
                  <optgroup label="Equipos">
                    {retornables.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.codigo} · {a.nombre}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>

            <div style={{ flex: 1, minWidth: 130 }}>
              <label style={e.label}>Desde</label>
              <input
                type="date" value={desde}
                onChange={(x) => setDesde(x.target.value)}
                style={e.input}
              />
            </div>

            <div style={{ flex: 1, minWidth: 130 }}>
              <label style={e.label}>Hasta</label>
              <input
                type="date" value={hasta}
                onChange={(x) => setHasta(x.target.value)}
                style={e.input}
              />
            </div>
          </div>

          <div style={e.acciones}>
            <a href={enlace} style={{ ...e.btn, background: color }}>
              Descargar Excel
            </a>

            {(desde || hasta) && (
              <button
                onClick={() => { setDesde(''); setHasta(''); }}
                style={e.enlace}
              >
                Quitar fechas
              </button>
            )}
          </div>

          <div style={e.detalle}>
            <strong style={{ fontSize: 12 }}>El libro incluye:</strong>
            <ul style={e.lista}>
              <li>
                <strong>Resumen</strong> — existencias, ingresos, salidas y
                valorización
              </li>
              <li>
                <strong>Kardex</strong> — movimientos con saldo corrido
                {elegido && <> de {elegido.nombre}</>}
              </li>
              <li>
                <strong>Equipos</strong> — unidades con estado y quién las tiene
              </li>
              <li><strong>Información</strong> — alcance, periodo y fecha de generación</li>
            </ul>
            <p style={e.nota}>
              El saldo corrido incluye todo el historial aunque filtres por
              fechas: un saldo que arrancara en cero sería falso.
            </p>
          </div>
        </>
      )}
    </section>
  );
}

const e: Record<string, React.CSSProperties> = {
  card: {
    background: '#fff', borderWidth: 1, borderStyle: 'solid', borderColor: '#E4E4DF',
    borderRadius: 8, padding: 20, marginBottom: 18,
  },
  h2: { fontSize: 14.5, margin: '0 0 4px', fontWeight: 600 },
  sub: { fontSize: 12, color: '#5B6470', margin: 0, lineHeight: 1.55, maxWidth: 620 },

  campos: { display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' },
  label: { display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5 },
  input: {
    width: '100%', padding: '9px 11px',
    borderWidth: 1, borderStyle: 'solid', borderColor: '#DFDFD8',
    borderRadius: 4, fontSize: 13, boxSizing: 'border-box',
    fontFamily: 'inherit', background: '#fff',
  },

  acciones: { display: 'flex', gap: 12, alignItems: 'center', marginTop: 16, flexWrap: 'wrap' },
  btn: {
    color: '#fff', padding: '10px 20px', borderRadius: 4, fontSize: 13,
    fontWeight: 600, textDecoration: 'none', display: 'inline-block',
  },
  enlace: {
    background: 'none', border: 'none', color: '#5B6470',
    fontSize: 12, cursor: 'pointer', textDecoration: 'underline',
  },

  detalle: {
    marginTop: 16, paddingTop: 14,
    borderTopWidth: 1, borderTopStyle: 'solid', borderTopColor: '#EFEFEA',
  },
  lista: { margin: '8px 0 0', paddingLeft: 18, fontSize: 12, color: '#5B6470', lineHeight: 1.8 },
  nota: { fontSize: 11.5, color: '#8A929C', margin: '10px 0 0', lineHeight: 1.55 },
  vacio: { fontSize: 12.5, color: '#8A929C', margin: 0 },
};
