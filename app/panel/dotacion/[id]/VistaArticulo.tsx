'use client';

/**
 * FICHA DEL ARTÍCULO
 * ---------------------------------------------------------------
 * Consumible: existencia, ingreso de mercancía e historial.
 * Retornable: unidades con placa, estado y fotografía propia.
 *
 * La foto de la unidad es distinta de la del artículo: la primera
 * documenta el estado real de ESA unidad —el portátil con el golpe
 * en la tapa—, y su valor aparece al devolverla.
 */
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  registrarIngreso, crearUnidad, actualizarUnidad,
  guardarFotoArticulo, guardarFotoUnidad, archivarUnidad,
  type Ficha, type Unidad, type EstadoUnidad,
} from '@/lib/acciones-dotacion';
import CargaFoto from '../CargaFoto';
import CargaUnidades from './CargaUnidades';
import type { InspeccionDeUnidad } from '@/lib/acciones-inspecciones';

const ESTADOS: Array<{ v: EstadoUnidad; t: string; color: string }> = [
  { v: 'disponible', t: 'Disponible', color: 'var(--bien)' },
  { v: 'asignado', t: 'Asignado', color: 'var(--info)' },
  { v: 'mantenimiento', t: 'En mantenimiento', color: 'var(--ambar)' },
  { v: 'baja', t: 'Dado de baja', color: 'var(--texto-suave)' },
  { v: 'perdido', t: 'Perdido', color: 'var(--mal)' },
];

const UNIDAD_VACIA = {
  placa: '', serial: '', fecha_compra: '', garantia_hasta: '', observaciones: '',
};

export default function VistaArticulo({
  ficha,
  inspecciones,
  orgId,
  color,
}: {
  ficha: Ficha;
  /** Inspecciones practicadas sobre las unidades de este articulo. */
  inspecciones: InspeccionDeUnidad[];
  orgId: string;
  color: string;
}) {
  const router = useRouter();
  const [pendiente, startTransition] = useTransition();

  const a = ficha.articulo!;
  const esConsumible = a.tipo === 'consumible';

  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  // Ingreso de mercancía
  const [ingreso, setIngreso] = useState({ cantidad: '', motivo: '' });

  // Alta de unidad
  const [nuevaUnidad, setNuevaUnidad] = useState(UNIDAD_VACIA);
  const [abriendoUnidad, setAbriendoUnidad] = useState(false);
  const [editandoUnidad, setEditandoUnidad] = useState<string | null>(null);

  function ingresar() {
    const n = Number(ingreso.cantidad);
    if (!n || n <= 0) {
      setAviso({ tipo: 'error', texto: 'Indica una cantidad mayor a cero.' });
      return;
    }
    startTransition(async () => {
      const r = await registrarIngreso(a.id, n, ingreso.motivo);
      setAviso({ tipo: r.ok ? 'ok' : 'error', texto: r.mensaje });
      if (r.ok) { setIngreso({ cantidad: '', motivo: '' }); router.refresh(); }
    });
  }

  function agregarUnidad() {
    startTransition(async () => {
      const r = await crearUnidad({ articuloId: a.id, ...nuevaUnidad });
      setAviso({ tipo: r.ok ? 'ok' : 'error', texto: r.mensaje });
      if (r.ok) { setNuevaUnidad(UNIDAD_VACIA); setAbriendoUnidad(false); router.refresh(); }
    });
  }

  function cambiarEstado(u: Unidad, estado: EstadoUnidad) {
    startTransition(async () => {
      const r = await actualizarUnidad(u.id, a.id, {
        serial: u.serial ?? '',
        estado,
        fecha_compra: u.fecha_compra ?? '',
        garantia_hasta: u.garantia_hasta ?? '',
        observaciones: u.observaciones ?? '',
      });
      setAviso({ tipo: r.ok ? 'ok' : 'error', texto: r.mensaje });
      if (r.ok) router.refresh();
    });
  }

  function darDeBaja(id: string) {
    startTransition(async () => {
      const r = await archivarUnidad(id, a.id);
      setAviso({ tipo: r.ok ? 'ok' : 'error', texto: r.mensaje });
      if (r.ok) router.refresh();
    });
  }

  const fmt = (iso: string) =>
    new Date(iso).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' });

  const unidades = ficha.unidades ?? [];

  // Inspecciones indexadas por unidad, de la mas reciente a la mas
  // antigua (la accion ya las devuelve ordenadas).
  const inspeccionesPorUnidad = new Map<string, InspeccionDeUnidad[]>();
  for (const ins of inspecciones) {
    const lista = inspeccionesPorUnidad.get(ins.unidadId) ?? [];
    lista.push(ins);
    inspeccionesPorUnidad.set(ins.unidadId, lista);
  }

  return (
    <>
      <div style={e.cabecera}>
        <div>
          <div style={e.codigo}>{a.codigo}</div>
          <h1 style={e.titulo}>{a.nombre}</h1>
          <p style={e.sub}>
            {esConsumible ? 'Elemento de protección' : 'Equipo'}
            {a.categoria && <> · {a.categoria}</>}
            {a.marca && <> · {a.marca}</>}
            {a.modelo && <> {a.modelo}</>}
          </p>
        </div>
      </div>

      {aviso && (
        <div style={{
          ...e.aviso,
          background: aviso.tipo === 'ok' ? 'var(--bien-fondo)' : 'var(--mal-fondo)',
          color: aviso.tipo === 'ok' ? 'var(--bien)' : 'var(--mal)',
        }}>
          {aviso.texto}
        </div>
      )}

      <div style={e.dos}>
        {/* ---------- Fotografía ---------- */}
        <section style={e.card}>
          <CargaFoto
            orgId={orgId}
            carpeta={`articulos/${a.id}`}
            fotoActual={a.foto_url}
            onGuardar={(url) => guardarFotoArticulo(a.id, url)}
            etiqueta="Fotografía de referencia"
            alto={190}
          />
        </section>

        {/* ---------- Ficha técnica ---------- */}
        <section style={e.card}>
          <h2 style={e.h2}>Ficha técnica</h2>
          <dl style={{ margin: 0 }}>
            {a.norma && <Fila k="Norma" v={a.norma} />}
            {a.valor !== null && (
              <Fila k="Valor" v={`$${Number(a.valor).toLocaleString('es-CO')}`} />
            )}
            {esConsumible && (
              <>
                <Fila k="Unidad" v={a.unidad} />
                <Fila
                  k="Vida útil"
                  v={a.vida_util_dias ? `${a.vida_util_dias} días` : 'Sin vencimiento'}
                />
                <Fila k="Requiere talla" v={a.requiere_talla ? 'Sí' : 'No'} />
                <Fila k="Stock mínimo" v={String(a.stock_minimo)} />
              </>
            )}
            {a.descripcion && <Fila k="Descripción" v={a.descripcion} />}
          </dl>

          {esConsumible && (
            <div style={{
              ...e.existencia,
              background: a.bajo_minimo ? 'var(--mal-fondo)' : 'var(--bien-fondo)',
              color: a.bajo_minimo ? 'var(--mal)' : 'var(--bien)',
            }}>
              <div style={{ fontSize: 26, fontWeight: 700 }}>{ficha.existencia ?? 0}</div>
              <div style={{ fontSize: 11 }}>
                {a.unidad.toLowerCase()} en existencia
                {a.bajo_minimo && ' · bajo el mínimo'}
              </div>
            </div>
          )}
        </section>
      </div>

      {/* ---------- Consumible: ingreso ---------- */}
      {esConsumible && (
        <section style={e.card}>
          <h2 style={e.h2}>Ingreso de mercancía</h2>
          <p style={e.nota}>
            Cada ingreso queda como movimiento: el inventario es auditable y
            siempre se puede explicar de dónde salió cada unidad.
          </p>

          <div style={e.filaIngreso}>
            <input
              type="number" min={1} value={ingreso.cantidad}
              onChange={(x) => setIngreso({ ...ingreso, cantidad: x.target.value })}
              placeholder="Cantidad"
              style={{ ...e.input, maxWidth: 130 }}
            />
            <input
              value={ingreso.motivo}
              onChange={(x) => setIngreso({ ...ingreso, motivo: x.target.value })}
              placeholder="Motivo — orden de compra, devolución…"
              style={{ ...e.input, flex: 1, minWidth: 200 }}
            />
            <button
              onClick={ingresar}
              disabled={pendiente}
              style={{ ...e.btn, background: pendiente ? 'var(--borde-fuerte)' : color }}
            >
              Registrar
            </button>
          </div>
        </section>
      )}

      {/* ---------- Retornable: unidades ---------- */}
      {!esConsumible && (
        <section style={e.card}>
          <div style={e.cabeceraSeccion}>
            <div>
              <h2 style={e.h2}>Unidades ({unidades.length})</h2>
              <p style={e.nota}>
                Cada unidad tiene placa, serial e historial propio.
              </p>
            </div>
            <button
              onClick={() => setAbriendoUnidad(!abriendoUnidad)}
              style={e.btnSec}
            >
              {abriendoUnidad ? 'Cancelar' : '+ Agregar unidad'}
            </button>
          </div>

          {abriendoUnidad && (
            <div style={e.bloque}>
              <div style={e.dosCampos}>
                <div>
                  <label style={e.label}>Placa interna *</label>
                  <input
                    value={nuevaUnidad.placa}
                    onChange={(x) => setNuevaUnidad({ ...nuevaUnidad, placa: x.target.value.toUpperCase() })}
                    placeholder="EQ-0042"
                    style={{ ...e.input, textTransform: 'uppercase' }}
                  />
                </div>
                <div>
                  <label style={e.label}>Serial</label>
                  <input
                    value={nuevaUnidad.serial}
                    onChange={(x) => setNuevaUnidad({ ...nuevaUnidad, serial: x.target.value.toUpperCase() })}
                    style={{ ...e.input, textTransform: 'uppercase' }}
                  />
                </div>
              </div>

              <div style={e.dosCampos}>
                <div>
                  <label style={e.label}>Fecha de compra</label>
                  <input type="date" value={nuevaUnidad.fecha_compra}
                    onChange={(x) => setNuevaUnidad({ ...nuevaUnidad, fecha_compra: x.target.value })}
                    style={e.input} />
                </div>
                <div>
                  <label style={e.label}>Garantía hasta</label>
                  <input type="date" value={nuevaUnidad.garantia_hasta}
                    onChange={(x) => setNuevaUnidad({ ...nuevaUnidad, garantia_hasta: x.target.value })}
                    style={e.input} />
                </div>
              </div>

              <label style={e.label}>Observaciones</label>
              <input
                value={nuevaUnidad.observaciones}
                onChange={(x) => setNuevaUnidad({ ...nuevaUnidad, observaciones: x.target.value })}
                placeholder="Estado al ingresar, accesorios incluidos…"
                style={e.input}
              />

              <button
                onClick={agregarUnidad}
                disabled={pendiente}
                style={{ ...e.btn, background: pendiente ? 'var(--borde-fuerte)' : color, marginTop: 12 }}
              >
                {pendiente ? 'Guardando…' : 'Registrar unidad'}
              </button>
              <p style={e.nota}>
                La fotografía de cada unidad se agrega desde su tarjeta.
              </p>
            </div>
          )}

          {/* Carga masiva: registrar 80 portátiles uno a uno es inviable */}
          <CargaUnidades
            articuloId={a.id}
            articuloNombre={a.nombre}
            color={color}
          />

          {unidades.length === 0 ? (
            <p style={e.vacio}>
              Sin unidades registradas. Agrega la primera para poder entregarla.
            </p>
          ) : (
            <div style={e.gridUnidades}>
              {unidades.map((u) => {
                const est = ESTADOS.find((x) => x.v === u.estado)!;
                return (
                  <article key={u.id} style={e.tarjetaUnidad}>
                    <div style={e.cabeceraUnidad}>
                      <div>
                        <strong style={e.placa}>{u.placa}</strong>
                        {u.serial && <div style={e.serial}>{u.serial}</div>}
                      </div>
                      <span style={{ ...e.chipEstado, background: est.color + '18', color: est.color }}>
                        {est.t}
                      </span>
                    </div>

                    {u.asignado_a && (
                      <div style={e.asignado}>Con {u.asignado_a}</div>
                    )}

                    {/* Historial de inspecciones de ESTA unidad. Junto al
                        de entregas es lo que sustenta una auditoria de
                        alturas: no basta con haber entregado el arnes,
                        hay que probar que se revisa. */}
                    {(() => {
                      const suyas = inspeccionesPorUnidad.get(u.id) ?? [];
                      if (suyas.length === 0) return null;
                      const ultima = suyas[0];
                      return (
                        <div style={e.inspecciones}>
                          <div style={e.inspeccionesTitulo}>
                            Inspecciones ({suyas.length})
                          </div>
                          {suyas.slice(0, 3).map((ins) => (
                            <Link
                              key={ins.id}
                              href={`/panel/inspecciones/${ins.id}`}
                              style={e.inspeccionFila}
                            >
                              <span style={e.inspeccionFecha}>
                                {new Date(ins.fecha).toLocaleDateString('es-CO')}
                              </span>
                              <span style={e.inspeccionCodigo}>{ins.codigo}</span>
                              {ins.estado === 'cerrada' ? (
                                <span style={{
                                  ...e.inspeccionVeredicto,
                                  color: ins.cumple ? 'var(--bien)' : 'var(--mal)',
                                }}>
                                  {ins.puntaje !== null ? `${ins.puntaje}%` : '—'}
                                  {ins.cumple === false ? ' · NO CUMPLE' : ''}
                                </span>
                              ) : (
                                <span style={{ ...e.inspeccionVeredicto, color: 'var(--ambar)' }}>
                                  Borrador
                                </span>
                              )}
                            </Link>
                          ))}
                          {suyas.length > 3 && (
                            <div style={e.inspeccionMas}>
                              +{suyas.length - 3} anteriores · última{' '}
                              {new Date(ultima.fecha).toLocaleDateString('es-CO')}
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {editandoUnidad === u.id ? (
                      <div style={{ marginTop: 10 }}>
                        <CargaFoto
                          orgId={orgId}
                          carpeta={`unidades/${u.id}`}
                          fotoActual={u.foto_url}
                          onGuardar={(url) => guardarFotoUnidad(u.id, a.id, url)}
                          etiqueta="Estado de esta unidad"
                          alto={140}
                        />
                        <button
                          onClick={() => setEditandoUnidad(null)}
                          style={{ ...e.btnMini, marginTop: 8 }}
                        >
                          Cerrar
                        </button>
                      </div>
                    ) : (
                      <>
                        <div style={e.zonaFotoUnidad}>
                          {u.foto_url
                            ? <img src={u.foto_url} alt={u.placa} style={e.fotoUnidad} />
                            : <span style={e.sinFoto}>Sin fotografía</span>}
                        </div>

                        <div style={e.accionesUnidad}>
                          <button onClick={() => setEditandoUnidad(u.id)} style={e.btnMini}>
                            Fotografía
                          </button>

                          <select
                            value={u.estado}
                            disabled={pendiente || u.estado === 'asignado'}
                            onChange={(x) => cambiarEstado(u, x.target.value as EstadoUnidad)}
                            style={e.selectMini}
                            title={u.estado === 'asignado'
                              ? 'Registra la devolución para cambiar el estado'
                              : 'Cambiar estado'}
                          >
                            {ESTADOS.filter((x) => x.v !== 'asignado').map((x) => (
                              <option key={x.v} value={x.v}>{x.t}</option>
                            ))}
                            {u.estado === 'asignado' && (
                              <option value="asignado">Asignado</option>
                            )}
                          </select>

                          {u.estado !== 'asignado' && (
                            <button
                              onClick={() => darDeBaja(u.id)}
                              disabled={pendiente}
                              style={{ ...e.btnMini, color: 'var(--mal)' }}
                            >
                              Retirar
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* ---------- Historial ---------- */}
      {esConsumible && (ficha.movimientos?.length ?? 0) > 0 && (
        <section style={e.card}>
          <h2 style={e.h2}>Movimientos</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
            <thead>
              <tr>
                {['Fecha', 'Tipo', 'Cantidad', 'Motivo'].map((h) => (
                  <th key={h} style={e.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ficha.movimientos!.map((m) => (
                <tr key={m.id}>
                  <td style={{ ...e.td, whiteSpace: 'nowrap' }}>{fmt(m.fecha)}</td>
                  <td style={e.td}>
                    <span style={e.chip}>{m.tipo}</span>
                  </td>
                  <td style={{
                    ...e.td, fontWeight: 600,
                    color: m.cantidad > 0 ? 'var(--bien)' : 'var(--mal)',
                  }}>
                    {m.cantidad > 0 ? `+${m.cantidad}` : m.cantidad}
                  </td>
                  <td style={{ ...e.td, color: 'var(--texto-suave)' }}>{m.motivo ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <Link href="/panel/dotacion" style={e.btnSecEnlace}>Volver al inventario</Link>
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
  cabecera: { marginTop: 12, marginBottom: 18 },
  codigo: {
    fontSize: 11, color: 'var(--texto-tenue)', letterSpacing: .5,
    fontFamily: 'ui-monospace,SFMono-Regular,Menlo,monospace',
  },
  titulo: { fontSize: 22, margin: '3px 0', letterSpacing: -0.4 },
  sub: { fontSize: 13, color: 'var(--texto-suave)', margin: 0 },

  dos: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 16, alignItems: 'start' },
  card: {
    background: 'var(--superficie)', borderWidth: 1, borderStyle: 'solid', borderColor: 'var(--borde)',
    borderRadius: 8, padding: 20, marginBottom: 16,
  },
  h2: { fontSize: 14.5, margin: '0 0 4px', fontWeight: 600 },
  nota: { fontSize: 11.5, color: 'var(--texto-tenue)', margin: '8px 0 0', lineHeight: 1.55 },

  fila: {
    display: 'flex', justifyContent: 'space-between', gap: 12,
    padding: '7px 0', borderBottom: '1px solid var(--superficie-3)', fontSize: 12.5,
  },
  clave: { color: 'var(--texto-tenue)', margin: 0 },
  valor: { margin: 0, fontWeight: 600, textAlign: 'right' },

  existencia: { marginTop: 14, padding: 14, borderRadius: 6, textAlign: 'center' },

  filaIngreso: { display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginTop: 14 },
  label: { display: 'block', fontSize: 12, fontWeight: 600, margin: '12px 0 5px' },
  input: {
    padding: '9px 11px', borderWidth: 1, borderStyle: 'solid', borderColor: 'var(--borde-fuerte)',
    borderRadius: 4, fontSize: 13, boxSizing: 'border-box',
    fontFamily: 'inherit', width: '100%',
  },

  cabeceraSeccion: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'flex-start', gap: 12, flexWrap: 'wrap',
  },
  bloque: {
    marginTop: 14, paddingTop: 14, paddingBottom: 14,
    borderTopWidth: 1, borderTopStyle: 'solid', borderTopColor: 'var(--borde)',
    borderBottomWidth: 1, borderBottomStyle: 'solid', borderBottomColor: 'var(--borde)',
    marginBottom: 14, maxWidth: 520,
  },
  dosCampos: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },

  gridUnidades: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(215px,1fr))',
    gap: 12, marginTop: 14,
  },
  tarjetaUnidad: {
    borderWidth: 1, borderStyle: 'solid', borderColor: 'var(--borde)',
    borderRadius: 6, padding: 12,
  },
  cabeceraUnidad: { display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' },
  placa: { fontSize: 13, fontFamily: 'ui-monospace,SFMono-Regular,Menlo,monospace' },
  serial: { fontSize: 10, color: 'var(--texto-tenue)', fontFamily: 'ui-monospace,monospace' },
  chipEstado: { fontSize: 9.5, padding: '3px 8px', borderRadius: 999, fontWeight: 600, whiteSpace: 'nowrap' },
  inspecciones: {
    marginTop: 10, paddingTop: 9,
    borderTopWidth: 1, borderTopStyle: 'solid', borderTopColor: 'var(--borde)',
  },
  inspeccionesTitulo: {
    fontSize: 10, letterSpacing: .5, textTransform: 'uppercase',
    color: 'var(--texto-tenue)', fontWeight: 600, marginBottom: 5,
  },
  inspeccionFila: {
    display: 'flex', alignItems: 'baseline', gap: 7,
    fontSize: 11, color: 'var(--texto)', textDecoration: 'none',
    padding: '3px 0',
  },
  inspeccionFecha: { color: 'var(--texto-suave)', whiteSpace: 'nowrap' },
  inspeccionCodigo: {
    fontFamily: 'ui-monospace,monospace', fontSize: 10, color: 'var(--texto-tenue)',
    flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
  },
  inspeccionVeredicto: { fontWeight: 600, whiteSpace: 'nowrap' },
  inspeccionMas: { fontSize: 10.5, color: 'var(--texto-tenue)', marginTop: 4 },
  asignado: { fontSize: 11, color: 'var(--info)', marginTop: 6 },

  zonaFotoUnidad: {
    height: 90, background: 'var(--superficie-2)', borderRadius: 4, marginTop: 10,
    display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  fotoUnidad: { maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' },
  sinFoto: { fontSize: 10.5, color: 'var(--borde-fuerte)' },

  accionesUnidad: { display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap', alignItems: 'center' },
  btnMini: {
    background: 'none', border: 'none', color: 'var(--texto-suave)',
    fontSize: 11, cursor: 'pointer', textDecoration: 'underline', padding: 0,
  },
  selectMini: {
    fontSize: 10.5, padding: '3px 6px', borderWidth: 1, borderStyle: 'solid',
    borderColor: 'var(--borde-fuerte)', borderRadius: 3, fontFamily: 'inherit', background: 'var(--superficie)',
  },

  th: {
    background: 'var(--fondo)', color: 'var(--texto-tenue)', fontSize: 10.5, textTransform: 'uppercase',
    padding: '8px', textAlign: 'left', borderBottom: '1px solid var(--borde)',
  },
  td: { padding: '8px', borderBottom: '1px solid var(--superficie-3)' },
  chip: { fontSize: 10.5, background: 'var(--superficie-3)', color: 'var(--texto-suave)', padding: '2px 8px', borderRadius: 3 },

  vacio: { fontSize: 12.5, color: 'var(--texto-tenue)', textAlign: 'center', padding: '24px 0', margin: 0 },
  aviso: { padding: '10px 14px', borderRadius: 6, fontSize: 13, marginBottom: 16 },
  btn: {
    color: 'var(--sobre-marca)', border: 'none', padding: '10px 20px', borderRadius: 4,
    fontSize: 13, fontWeight: 600, cursor: 'pointer',
  },
  btnSec: {
    background: 'var(--superficie)', color: 'var(--texto)',
    borderWidth: 1, borderStyle: 'solid', borderColor: 'var(--borde-fuerte)',
    padding: '8px 16px', borderRadius: 4, fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
  },
  btnSecEnlace: {
    background: 'var(--superficie)', color: 'var(--texto)',
    borderWidth: 1, borderStyle: 'solid', borderColor: 'var(--borde-fuerte)',
    padding: '10px 20px', borderRadius: 4, fontSize: 13, fontWeight: 600,
    textDecoration: 'none', display: 'inline-block',
  },
};
