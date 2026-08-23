'use client';

/**
 * NUEVA ENTREGA
 * ---------------------------------------------------------------
 * Asistente de tres pasos. La firma no ocurre aquí: la entrega se
 * crea en borrador y se firma en su detalle, porque el inventario
 * solo debe descontarse cuando alguien firmó de verdad.
 *
 * El selector muestra la existencia junto a cada artículo: quien
 * entrega necesita saber si alcanza antes de comprometerlo.
 */
import { useState, useTransition, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  crearEntrega, actualizarEntrega,
  type ArticuloEntregable, type ItemEntrega, type ItemDetalle,
} from '@/lib/acciones-entregas';

/**
 * Estados físicos. Van aquí y no en las acciones porque un archivo
 * con 'use server' solo puede exportar funciones async.
 */
const ESTADOS_FISICOS = ['nuevo', 'bueno', 'regular', 'malo'] as const;

type Empleado = {
  id: string; identificacion: string; nombres: string;
  cargo: string | null; area: string | null;
};

/** Línea en construcción dentro del formulario. */
type Linea = {
  clave: string;
  articulo: ArticuloEntregable;
  cantidad: number;
  talla: string;
  lote: string;
  unidadId: string;
  estadoEntrega: string;
  accesorios: string;
};

export default function FormularioEntrega({
  empleados,
  entregables,
  nombreConsultor,
  color,
  edicion,
}: {
  empleados: Empleado[];
  entregables: ArticuloEntregable[];
  nombreConsultor: string;
  color: string;
  /** Presente solo al editar un borrador. */
  edicion?: {
    entregaId: string;
    /** Datos copiados en el acta, no una referencia al empleado. */
    receptor: {
      nombres: string;
      identificacion: string;
      cargo: string | null;
      area: string | null;
    };
    entregadoPor: string;
    observaciones: string;
    items: ItemDetalle[];
  };
}) {
  const router = useRouter();
  const [pendiente, startTransition] = useTransition();

  // Al editar se entra directo al paso 2: el empleado no cambia,
  // porque el acta ya lleva sus datos copiados.
  const [paso, setPaso] = useState(edicion ? 2 : 1);
  const [busqueda, setBusqueda] = useState('');
  const [empleadoId, setEmpleadoId] = useState('');
  const [entregadoPor, setEntregadoPor] = useState(
    edicion?.entregadoPor ?? nombreConsultor
  );
  const [observaciones, setObservaciones] = useState(edicion?.observaciones ?? '');

  const [lineas, setLineas] = useState<Linea[]>(() => {
    if (!edicion) return [];
    // Reconstruye las líneas desde los items guardados
    return edicion.items.flatMap((it) => {
      const art = entregables.find((a) => a.id === it.articulo_id);
      if (!art) return [];
      return [{
        clave: it.id,
        articulo: art,
        cantidad: it.cantidad,
        talla: it.talla ?? '',
        lote: it.lote ?? '',
        unidadId: it.placa
          ? (art.unidades_libres.find((u) => u.placa === it.placa)?.id ?? '')
          : '',
        estadoEntrega: it.estado_entrega ?? (art.tipo === 'retornable' ? 'bueno' : ''),
        accesorios: it.accesorios ?? '',
      }];
    });
  });
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  // Al editar, los datos salen del acta —que los tiene copiados—;
  // al crear, del empleado seleccionado.
  const seleccionado = empleados.find((x) => x.id === empleadoId);
  const receptor = edicion?.receptor ?? (seleccionado ? {
    nombres: seleccionado.nombres,
    identificacion: seleccionado.identificacion,
    cargo: seleccionado.cargo,
    area: seleccionado.area,
  } : null);

  const filtrados = useMemo(() => {
    if (!busqueda) return empleados.slice(0, 8);
    const q = busqueda.toLowerCase();
    return empleados
      .filter((x) => `${x.identificacion} ${x.nombres} ${x.area ?? ''}`.toLowerCase().includes(q))
      .slice(0, 8);
  }, [empleados, busqueda]);

  /** Cuánto de este artículo ya está comprometido en el formulario. */
  function comprometido(articuloId: string, exceptoClave?: string): number {
    return lineas
      .filter((l) => l.articulo.id === articuloId && l.clave !== exceptoClave)
      .reduce((t, l) => t + l.cantidad, 0);
  }

  function agregar(a: ArticuloEntregable) {
    setLineas((ls) => [...ls, {
      clave: `${a.id}-${Date.now()}`,
      articulo: a,
      cantidad: 1,
      talla: '',
      lote: '',
      unidadId: a.tipo === 'retornable' ? (a.unidades_libres[0]?.id ?? '') : '',
      estadoEntrega: a.tipo === 'retornable' ? 'bueno' : '',
      accesorios: '',
    }]);
  }

  function actualizar(clave: string, cambios: Partial<Linea>) {
    setLineas((ls) => ls.map((l) => (l.clave === clave ? { ...l, ...cambios } : l)));
  }

  /** Unidades libres que no estén ya elegidas en otra línea. */
  function unidadesDisponibles(l: Linea) {
    const usadas = new Set(
      lineas.filter((x) => x.clave !== l.clave && x.unidadId).map((x) => x.unidadId)
    );
    return l.articulo.unidades_libres.filter((u) => !usadas.has(u.id) || u.id === l.unidadId);
  }

  const errores = useMemo(() => {
    const lista: string[] = [];
    for (const l of lineas) {
      if (l.articulo.tipo === 'consumible') {
        const disponible = l.articulo.existencia ?? 0;
        const total = comprometido(l.articulo.id);
        if (total > disponible) {
          lista.push(`${l.articulo.nombre}: se piden ${total} y hay ${disponible}.`);
        }
        if (l.articulo.requiere_talla && !l.talla.trim()) {
          lista.push(`${l.articulo.nombre}: falta la talla.`);
        }
      } else if (!l.unidadId) {
        lista.push(`${l.articulo.nombre}: elige la unidad a entregar.`);
      }
    }
    return Array.from(new Set(lista));
  }, [lineas]);

  function guardar() {
    if (errores.length > 0) {
      setAviso({ tipo: 'error', texto: 'Corrige los avisos antes de continuar.' });
      return;
    }

    const items: ItemEntrega[] = lineas.map((l) => ({
      articulo: l.articulo.id,
      cantidad: l.cantidad,
      talla: l.talla || undefined,
      lote: l.lote || undefined,
      unidad: l.unidadId || undefined,
      estado_entrega: l.estadoEntrega || undefined,
      accesorios: l.accesorios || undefined,
    }));

    startTransition(async () => {
      if (edicion) {
        const r = await actualizarEntrega(edicion.entregaId, {
          entregadoPor, observaciones, items,
        });
        setAviso({ tipo: r.ok ? 'ok' : 'error', texto: r.mensaje });
        if (r.ok) router.push(`/panel/dotacion/entregas/${edicion.entregaId}`);
      } else {
        const r = await crearEntrega({ empleadoId, entregadoPor, observaciones, items });
        setAviso({ tipo: r.ok ? 'ok' : 'error', texto: r.mensaje });
        if (r.ok && r.id) router.push(`/panel/dotacion/entregas/${r.id}`);
      }
    });
  }

  if (empleados.length === 0) {
    return (
      <div style={e.vacio}>
        <p style={{ margin: '0 0 14px', fontSize: 14 }}>
          No hay empleados cargados en esta empresa.
        </p>
        <Link href="/panel/empleados" style={{ ...e.btn, background: color }}>
          Ir a Empleados
        </Link>
      </div>
    );
  }

  if (entregables.length === 0) {
    return (
      <div style={e.vacio}>
        <p style={{ margin: '0 0 14px', fontSize: 14 }}>
          No hay artículos con existencia ni unidades disponibles.
        </p>
        <Link href="/panel/dotacion" style={{ ...e.btn, background: color }}>
          Ir al inventario
        </Link>
      </div>
    );
  }

  return (
    <>
      <div style={e.pasos}>
        {(edicion
          ? ['—', 'Qué recibe', 'Revisión']
          : ['Quién recibe', 'Qué recibe', 'Revisión']
        ).map((t, i) => (
          edicion && i === 0 ? null : (
          <div
            key={t}
            style={{
              ...e.paso,
              borderBottomColor: paso === i + 1 ? color : '#E4E4DF',
              color: paso === i + 1 ? color : paso > i + 1 ? '#15803D' : '#A3AAB3',
              fontWeight: paso === i + 1 ? 700 : 500,
            }}
          >
            {paso > i + 1 ? '✓ ' : `${i + 1}. `}{t}
          </div>
          )
        ))}
      </div>

      {/* ---------- Paso 1 ---------- */}
      {paso === 1 && (
        <section style={e.card}>
          <h2 style={e.h2}>¿Quién recibe la dotación?</h2>

          <input
            value={busqueda}
            onChange={(x) => setBusqueda(x.target.value)}
            placeholder="Buscar por nombre, cédula o área…"
            style={e.input}
          />

          <div style={e.listaEmpleados}>
            {filtrados.map((x) => (
              <button
                key={x.id}
                onClick={() => setEmpleadoId(x.id)}
                style={{
                  ...e.empleado,
                  borderColor: empleadoId === x.id ? color : '#EFEFEA',
                  background: empleadoId === x.id ? '#F7FBFA' : '#fff',
                }}
              >
                <div>
                  <strong style={{ fontSize: 13 }}>{x.nombres}</strong>
                  <div style={e.metaEmpleado}>
                    <span style={e.mono}>{x.identificacion}</span>
                    {x.cargo && <> · {x.cargo}</>}
                    {x.area && <> · {x.area}</>}
                  </div>
                </div>
                {empleadoId === x.id && <span style={{ color, fontSize: 15 }}>✓</span>}
              </button>
            ))}
            {filtrados.length === 0 && (
              <p style={e.nota}>Ningún empleado coincide con la búsqueda.</p>
            )}
          </div>

          <label style={e.label}>Quién entrega</label>
          <input
            value={entregadoPor}
            onChange={(x) => setEntregadoPor(x.target.value.toUpperCase())}
            style={{ ...e.input, textTransform: 'uppercase' }}
          />

          <button
            onClick={() => setPaso(2)}
            disabled={!empleadoId || !entregadoPor.trim()}
            style={{
              ...e.btn,
              background: !empleadoId || !entregadoPor.trim() ? '#C5C5BD' : color,
              marginTop: 18,
            }}
          >
            Continuar
          </button>
        </section>
      )}

      {/* ---------- Paso 2 ---------- */}
      {paso === 2 && (
        <>
          <section style={e.card}>
            <h2 style={e.h2}>Agregar elementos</h2>
            <p style={e.nota}>
              La existencia mostrada ya descuenta lo que llevas agregado.
            </p>

            <div style={e.gridArticulos}>
              {entregables.map((a) => {
                const usado = comprometido(a.id);
                const restante = a.tipo === 'consumible'
                  ? (a.existencia ?? 0) - usado
                  : a.unidades_libres.length -
                    lineas.filter((l) => l.articulo.id === a.id && l.unidadId).length;
                const agotado = restante <= 0;

                return (
                  <button
                    key={a.id}
                    onClick={() => agregar(a)}
                    disabled={agotado}
                    style={{
                      ...e.tarjetaArt,
                      opacity: agotado ? 0.45 : 1,
                      cursor: agotado ? 'not-allowed' : 'pointer',
                    }}
                  >
                    <div style={e.zonaFoto}>
                      {a.foto_url
                        ? <img src={a.foto_url} alt={a.nombre} style={e.foto} />
                        : <span style={e.sinFoto}>Sin foto</span>}
                    </div>
                    <div style={e.nombreArt}>{a.nombre}</div>
                    <div style={{
                      ...e.disponibles,
                      color: agotado ? '#9B1C1C' : '#15803D',
                    }}>
                      {restante} disponible{restante === 1 ? '' : 's'}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {lineas.length > 0 && (
            <section style={e.card}>
              <h2 style={e.h2}>Elementos agregados ({lineas.length})</h2>

              {lineas.map((l) => (
                <div key={l.clave} style={e.linea}>
                  <div style={e.lineaCabecera}>
                    <strong style={{ fontSize: 12.5 }}>{l.articulo.nombre}</strong>
                    <button
                      onClick={() => setLineas((ls) => ls.filter((x) => x.clave !== l.clave))}
                      style={e.x}
                    >
                      ×
                    </button>
                  </div>

                  <div style={e.camposLinea}>
                    {l.articulo.tipo === 'consumible' ? (
                      <>
                        <div>
                          <label style={e.labelMini}>Cantidad</label>
                          <input
                            type="number" min={1} value={l.cantidad}
                            onChange={(x) => actualizar(l.clave, {
                              cantidad: Math.max(1, Number(x.target.value) || 1),
                            })}
                            style={e.inputMini}
                          />
                        </div>
                        {l.articulo.requiere_talla && (
                          <div>
                            <label style={e.labelMini}>Talla *</label>
                            <input
                              value={l.talla}
                              onChange={(x) => actualizar(l.clave, { talla: x.target.value.toUpperCase() })}
                              placeholder="M, 40…"
                              style={{ ...e.inputMini, textTransform: 'uppercase' }}
                            />
                          </div>
                        )}
                        <div>
                          <label style={e.labelMini}>Lote</label>
                          <input
                            value={l.lote}
                            onChange={(x) => actualizar(l.clave, { lote: x.target.value })}
                            placeholder="Opcional"
                            style={e.inputMini}
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <div style={{ minWidth: 150 }}>
                          <label style={e.labelMini}>Unidad *</label>
                          <select
                            value={l.unidadId}
                            onChange={(x) => actualizar(l.clave, { unidadId: x.target.value })}
                            style={e.inputMini}
                          >
                            <option value="">Elegir…</option>
                            {unidadesDisponibles(l).map((u) => (
                              <option key={u.id} value={u.id}>
                                {u.placa}{u.serial ? ` · ${u.serial}` : ''}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label style={e.labelMini}>Estado</label>
                          <select
                            value={l.estadoEntrega}
                            onChange={(x) => actualizar(l.clave, { estadoEntrega: x.target.value })}
                            style={e.inputMini}
                          >
                            {ESTADOS_FISICOS.map((s) => (
                              <option key={s} value={s}>{s.toUpperCase()}</option>
                            ))}
                          </select>
                        </div>
                        <div style={{ flex: 1, minWidth: 160 }}>
                          <label style={e.labelMini}>Accesorios</label>
                          <input
                            value={l.accesorios}
                            onChange={(x) => actualizar(l.clave, { accesorios: x.target.value })}
                            placeholder="Cargador, estuche…"
                            style={e.inputMini}
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </section>
          )}

          {errores.length > 0 && (
            <div style={e.errores}>
              {errores.map((x, i) => <div key={i}>• {x}</div>)}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10 }}>
            {edicion ? (
              <Link href={`/panel/dotacion/entregas/${edicion.entregaId}`} style={e.btnSecEnlace}>
                Cancelar
              </Link>
            ) : (
              <button onClick={() => setPaso(1)} style={e.btnSec}>Atrás</button>
            )}
            <button
              onClick={() => setPaso(3)}
              disabled={lineas.length === 0 || errores.length > 0}
              style={{
                ...e.btn,
                background: lineas.length === 0 || errores.length > 0 ? '#C5C5BD' : color,
              }}
            >
              Revisar
            </button>
          </div>
        </>
      )}

      {/* ---------- Paso 3 ---------- */}
      {paso === 3 && receptor && (
        <>
          <section style={e.card}>
            <h2 style={e.h2}>Revisión</h2>

            <dl style={{ margin: '0 0 16px' }}>
              <Fila k="Recibe" v={receptor.nombres} />
              <Fila k="Identificación" v={receptor.identificacion} />
              {receptor.cargo && <Fila k="Cargo" v={receptor.cargo} />}
              {receptor.area && <Fila k="Área" v={receptor.area} />}
              <Fila k="Entrega" v={entregadoPor} />
            </dl>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
              <thead>
                <tr>
                  {['Elemento', 'Cant.', 'Detalle'].map((h) => (
                    <th key={h} style={e.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lineas.map((l) => {
                  const u = l.articulo.unidades_libres.find((x) => x.id === l.unidadId);
                  return (
                    <tr key={l.clave}>
                      <td style={e.td}>{l.articulo.nombre}</td>
                      <td style={e.td}>{l.cantidad} {l.articulo.unidad.toLowerCase()}</td>
                      <td style={{ ...e.td, color: '#5B6470', fontSize: 11.5 }}>
                        {l.talla && `Talla ${l.talla}`}
                        {u && `Placa ${u.placa}`}
                        {l.estadoEntrega && ` · ${l.estadoEntrega}`}
                        {l.accesorios && ` · ${l.accesorios}`}
                        {!l.talla && !u && !l.accesorios && '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <label style={e.label}>Observaciones</label>
            <textarea
              value={observaciones}
              rows={2}
              onChange={(x) => setObservaciones(x.target.value)}
              placeholder="Opcional"
              style={{ ...e.input, resize: 'vertical' }}
            />

            <p style={e.nota}>
              {edicion
                ? 'Sigue en borrador: el inventario se descuenta al firmar.'
                : 'Al guardar, la entrega queda en borrador. El inventario se descuenta cuando se firme.'}
            </p>
          </section>

          {aviso && (
            <div style={{
              ...e.avisoCaja,
              background: aviso.tipo === 'ok' ? '#F0FDF4' : '#FDF2F2',
              color: aviso.tipo === 'ok' ? '#15803D' : '#9B1C1C',
            }}>
              {aviso.texto}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setPaso(2)} style={e.btnSec}>Atrás</button>
            <button
              onClick={guardar}
              disabled={pendiente}
              style={{ ...e.btn, background: pendiente ? '#C5C5BD' : color }}
            >
              {pendiente
                ? 'Guardando…'
                : edicion ? 'Guardar cambios' : 'Crear entrega'}
            </button>
          </div>
        </>
      )}
    </>
  );
}

function Fila({ k, v }: { k: string; v: string }) {
  return (
    <div style={e.fila}>
      <dt style={e.clave}>{k}</dt>
      <dd style={e.valor}>{v}</dd>
    </div>
  );
}

const e: Record<string, React.CSSProperties> = {
  pasos: { display: 'flex', gap: 4, marginBottom: 18 },
  paso: {
    flex: 1, padding: '10px 8px', fontSize: 12.5, textAlign: 'center',
    borderBottomWidth: 2, borderBottomStyle: 'solid',
  },

  card: {
    background: '#fff', borderWidth: 1, borderStyle: 'solid', borderColor: '#E4E4DF',
    borderRadius: 8, padding: 20, marginBottom: 16,
  },
  h2: { fontSize: 14.5, margin: '0 0 5px', fontWeight: 600 },
  nota: { fontSize: 11.5, color: '#8A929C', margin: '8px 0 0', lineHeight: 1.55 },

  label: { display: 'block', fontSize: 12, fontWeight: 600, margin: '14px 0 5px' },
  labelMini: { display: 'block', fontSize: 10.5, color: '#8A929C', marginBottom: 3 },
  input: {
    width: '100%', padding: '9px 11px', borderWidth: 1, borderStyle: 'solid',
    borderColor: '#DFDFD8', borderRadius: 4, fontSize: 13,
    boxSizing: 'border-box', fontFamily: 'inherit',
  },
  inputMini: {
    padding: '6px 9px', borderWidth: 1, borderStyle: 'solid', borderColor: '#DFDFD8',
    borderRadius: 4, fontSize: 12, fontFamily: 'inherit',
    boxSizing: 'border-box', width: '100%', background: '#fff',
  },

  listaEmpleados: { display: 'grid', gap: 6, marginTop: 12, marginBottom: 4 },
  empleado: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '10px 12px', borderWidth: 1, borderStyle: 'solid', borderRadius: 5,
    cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
  },
  metaEmpleado: { fontSize: 11, color: '#8A929C', marginTop: 2 },
  mono: { fontFamily: 'ui-monospace,SFMono-Regular,Menlo,monospace' },

  gridArticulos: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(135px,1fr))',
    gap: 10, marginTop: 14,
  },
  tarjetaArt: {
    borderWidth: 1, borderStyle: 'solid', borderColor: '#EFEFEA', borderRadius: 6,
    padding: 8, background: '#fff', fontFamily: 'inherit', textAlign: 'center',
  },
  zonaFoto: {
    height: 62, background: '#FBFBF9', borderRadius: 4, marginBottom: 6,
    display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  foto: { maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' },
  sinFoto: { fontSize: 9.5, color: '#C5C5BD' },
  nombreArt: { fontSize: 11, fontWeight: 600, lineHeight: 1.3, marginBottom: 4 },
  disponibles: { fontSize: 10, fontWeight: 600 },

  linea: {
    borderWidth: 1, borderStyle: 'solid', borderColor: '#EFEFEA',
    borderRadius: 6, padding: 12, marginTop: 10,
  },
  lineaCabecera: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  camposLinea: { display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 8 },
  x: { background: 'none', border: 'none', color: '#9B1C1C', fontSize: 17, cursor: 'pointer', padding: '0 4px' },

  fila: {
    display: 'flex', justifyContent: 'space-between', gap: 12,
    padding: '6px 0', borderBottom: '1px solid #F4F4F0', fontSize: 12.5,
  },
  clave: { color: '#8A929C', margin: 0 },
  valor: { margin: 0, fontWeight: 600, textAlign: 'right' },

  th: {
    background: '#F7F7F4', color: '#8A929C', fontSize: 10.5, textTransform: 'uppercase',
    padding: '8px', textAlign: 'left', borderBottom: '1px solid #E4E4DF',
  },
  td: { padding: '8px', borderBottom: '1px solid #F4F4F0' },

  errores: {
    background: '#FDF2F2', color: '#9B1C1C', padding: '12px 15px',
    borderRadius: 6, fontSize: 12.5, marginBottom: 16, lineHeight: 1.7,
  },
  avisoCaja: { padding: '10px 14px', borderRadius: 6, fontSize: 13, marginBottom: 16 },

  btn: {
    color: '#fff', border: 'none', padding: '11px 22px', borderRadius: 4,
    fontSize: 13, fontWeight: 600, cursor: 'pointer',
  },
  btnSecEnlace: {
    background: '#fff', color: '#14263F',
    borderWidth: 1, borderStyle: 'solid', borderColor: '#DFDFD8',
    padding: '11px 22px', borderRadius: 4, fontSize: 13, fontWeight: 600,
    textDecoration: 'none', display: 'inline-block',
  },
  btnSec: {
    background: '#fff', color: '#14263F',
    borderWidth: 1, borderStyle: 'solid', borderColor: '#DFDFD8',
    padding: '11px 22px', borderRadius: 4, fontSize: 13, fontWeight: 600, cursor: 'pointer',
  },
  vacio: {
    background: '#fff', borderWidth: 1, borderStyle: 'dashed', borderColor: '#DFDFD8',
    borderRadius: 8, padding: '40px 24px', textAlign: 'center',
  },
};
