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

const ESTADOS: Array<{ v: EstadoUnidad; t: string; color: string }> = [
  { v: 'disponible', t: 'Disponible', color: '#15803D' },
  { v: 'asignado', t: 'Asignado', color: '#0369A1' },
  { v: 'mantenimiento', t: 'En mantenimiento', color: '#8A6100' },
  { v: 'baja', t: 'Dado de baja', color: '#5B6470' },
  { v: 'perdido', t: 'Perdido', color: '#9B1C1C' },
];

const UNIDAD_VACIA = {
  placa: '', serial: '', fecha_compra: '', garantia_hasta: '', observaciones: '',
};

export default function VistaArticulo({
  ficha,
  orgId,
  color,
}: {
  ficha: Ficha;
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
          background: aviso.tipo === 'ok' ? '#F0FDF4' : '#FDF2F2',
          color: aviso.tipo === 'ok' ? '#15803D' : '#9B1C1C',
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
              background: a.bajo_minimo ? '#FEE2E2' : '#F0FDF4',
              color: a.bajo_minimo ? '#9B1C1C' : '#15803D',
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
              style={{ ...e.btn, background: pendiente ? '#C5C5BD' : color }}
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
                style={{ ...e.btn, background: pendiente ? '#C5C5BD' : color, marginTop: 12 }}
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
                              style={{ ...e.btnMini, color: '#9B1C1C' }}
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
                    color: m.cantidad > 0 ? '#15803D' : '#9B1C1C',
                  }}>
                    {m.cantidad > 0 ? `+${m.cantidad}` : m.cantidad}
                  </td>
                  <td style={{ ...e.td, color: '#5B6470' }}>{m.motivo ?? '—'}</td>
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
    fontSize: 11, color: '#A3AAB3', letterSpacing: .5,
    fontFamily: 'ui-monospace,SFMono-Regular,Menlo,monospace',
  },
  titulo: { fontSize: 22, margin: '3px 0', letterSpacing: -0.4 },
  sub: { fontSize: 13, color: '#5B6470', margin: 0 },

  dos: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 16, alignItems: 'start' },
  card: {
    background: '#fff', borderWidth: 1, borderStyle: 'solid', borderColor: '#E4E4DF',
    borderRadius: 8, padding: 20, marginBottom: 16,
  },
  h2: { fontSize: 14.5, margin: '0 0 4px', fontWeight: 600 },
  nota: { fontSize: 11.5, color: '#8A929C', margin: '8px 0 0', lineHeight: 1.55 },

  fila: {
    display: 'flex', justifyContent: 'space-between', gap: 12,
    padding: '7px 0', borderBottom: '1px solid #F4F4F0', fontSize: 12.5,
  },
  clave: { color: '#8A929C', margin: 0 },
  valor: { margin: 0, fontWeight: 600, textAlign: 'right' },

  existencia: { marginTop: 14, padding: 14, borderRadius: 6, textAlign: 'center' },

  filaIngreso: { display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginTop: 14 },
  label: { display: 'block', fontSize: 12, fontWeight: 600, margin: '12px 0 5px' },
  input: {
    padding: '9px 11px', borderWidth: 1, borderStyle: 'solid', borderColor: '#DFDFD8',
    borderRadius: 4, fontSize: 13, boxSizing: 'border-box',
    fontFamily: 'inherit', width: '100%',
  },

  cabeceraSeccion: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'flex-start', gap: 12, flexWrap: 'wrap',
  },
  bloque: {
    marginTop: 14, paddingTop: 14, paddingBottom: 14,
    borderTopWidth: 1, borderTopStyle: 'solid', borderTopColor: '#EFEFEA',
    borderBottomWidth: 1, borderBottomStyle: 'solid', borderBottomColor: '#EFEFEA',
    marginBottom: 14, maxWidth: 520,
  },
  dosCampos: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },

  gridUnidades: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(215px,1fr))',
    gap: 12, marginTop: 14,
  },
  tarjetaUnidad: {
    borderWidth: 1, borderStyle: 'solid', borderColor: '#EFEFEA',
    borderRadius: 6, padding: 12,
  },
  cabeceraUnidad: { display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' },
  placa: { fontSize: 13, fontFamily: 'ui-monospace,SFMono-Regular,Menlo,monospace' },
  serial: { fontSize: 10, color: '#A3AAB3', fontFamily: 'ui-monospace,monospace' },
  chipEstado: { fontSize: 9.5, padding: '3px 8px', borderRadius: 999, fontWeight: 600, whiteSpace: 'nowrap' },
  asignado: { fontSize: 11, color: '#0369A1', marginTop: 6 },

  zonaFotoUnidad: {
    height: 90, background: '#FBFBF9', borderRadius: 4, marginTop: 10,
    display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  fotoUnidad: { maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' },
  sinFoto: { fontSize: 10.5, color: '#C5C5BD' },

  accionesUnidad: { display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap', alignItems: 'center' },
  btnMini: {
    background: 'none', border: 'none', color: '#5B6470',
    fontSize: 11, cursor: 'pointer', textDecoration: 'underline', padding: 0,
  },
  selectMini: {
    fontSize: 10.5, padding: '3px 6px', borderWidth: 1, borderStyle: 'solid',
    borderColor: '#DFDFD8', borderRadius: 3, fontFamily: 'inherit', background: '#fff',
  },

  th: {
    background: '#F7F7F4', color: '#8A929C', fontSize: 10.5, textTransform: 'uppercase',
    padding: '8px', textAlign: 'left', borderBottom: '1px solid #E4E4DF',
  },
  td: { padding: '8px', borderBottom: '1px solid #F4F4F0' },
  chip: { fontSize: 10.5, background: '#F4F4F0', color: '#5B6470', padding: '2px 8px', borderRadius: 3 },

  vacio: { fontSize: 12.5, color: '#8A929C', textAlign: 'center', padding: '24px 0', margin: 0 },
  aviso: { padding: '10px 14px', borderRadius: 6, fontSize: 13, marginBottom: 16 },
  btn: {
    color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 4,
    fontSize: 13, fontWeight: 600, cursor: 'pointer',
  },
  btnSec: {
    background: '#fff', color: '#14263F',
    borderWidth: 1, borderStyle: 'solid', borderColor: '#DFDFD8',
    padding: '8px 16px', borderRadius: 4, fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
  },
  btnSecEnlace: {
    background: '#fff', color: '#14263F',
    borderWidth: 1, borderStyle: 'solid', borderColor: '#DFDFD8',
    padding: '10px 20px', borderRadius: 4, fontSize: 13, fontWeight: 600,
    textDecoration: 'none', display: 'inline-block',
  },
};
