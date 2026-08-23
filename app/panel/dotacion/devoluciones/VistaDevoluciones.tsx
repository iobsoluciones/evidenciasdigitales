'use client';

/**
 * DEVOLUCIONES
 * ---------------------------------------------------------------
 * El estado de entrega se muestra JUNTO al campo de devolución, no en
 * otra pantalla. Esa comparación es el corazón del control de equipos:
 * un portátil entregado «nuevo» y devuelto «malo» tiene una historia
 * documentada con firmas de ambas partes en dos fechas.
 *
 * Sin eso, la conversación sobre quién responde por el daño es palabra
 * contra palabra.
 */
import { useState, useRef, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  devolverItem,
  type ItemPorDevolver, type Devolucion,
  type EstadoFisico, type DestinoUnidad,
} from '@/lib/acciones-devoluciones';
import { crearClienteNavegador } from '@/lib/supabase/cliente';
import LienzoFirma, { type LienzoFirmaRef } from '@/app/LienzoFirma';

/** Escala física, de mejor a peor. El orden importa: define el deterioro. */
const ESTADOS: Array<{ v: EstadoFisico; t: string; color: string }> = [
  { v: 'nuevo', t: 'Nuevo', color: '#15803D' },
  { v: 'bueno', t: 'Bueno', color: '#15803D' },
  { v: 'regular', t: 'Regular', color: '#8A6100' },
  { v: 'malo', t: 'Malo', color: '#9B1C1C' },
];

const DESTINOS: Array<{ v: DestinoUnidad; t: string; nota: string }> = [
  { v: 'disponible', t: 'Vuelve al inventario', nota: 'Puede entregarse a otra persona' },
  { v: 'mantenimiento', t: 'A mantenimiento', nota: 'No se entrega hasta repararlo' },
  { v: 'baja', t: 'Dar de baja', nota: 'Sale del inventario' },
  { v: 'perdido', t: 'Marcar como perdido', nota: 'No se devolvió' },
];

export default function VistaDevoluciones({
  pendientes,
  historial,
  orgId,
  nombreConsultor,
  color,
}: {
  pendientes: ItemPorDevolver[];
  historial: Devolucion[];
  orgId: string;
  nombreConsultor: string;
  color: string;
}) {
  const router = useRouter();
  const supabase = crearClienteNavegador();
  const [pendiente, startTransition] = useTransition();
  const firmaRef = useRef<LienzoFirmaRef>(null);
  const fotoRef = useRef<HTMLInputElement>(null);

  const [pestana, setPestana] = useState<'pendientes' | 'historial'>('pendientes');
  const [abierto, setAbierto] = useState<string | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  const [f, setF] = useState({
    estado: 'bueno' as EstadoFisico,
    observaciones: '',
    recibidoPor: nombreConsultor,
    destino: 'disponible' as DestinoUnidad,
    fotoUrl: null as string | null,
  });

  function abrir(item: ItemPorDevolver) {
    setAbierto(item.id);
    setF({
      // Se propone el mismo estado de entrega: lo normal es que vuelva
      // igual, y así solo se cambia cuando de verdad hubo deterioro.
      estado: (item.estado_entrega ?? 'bueno') as EstadoFisico,
      observaciones: '',
      recibidoPor: nombreConsultor,
      destino: 'disponible',
      fotoUrl: null,
    });
    setAviso(null);
  }

  /** Comprime y sube la foto del estado de retorno. */
  async function subirFoto(archivo: File) {
    setSubiendo(true);
    try {
      const bitmap = await createImageBitmap(archivo);
      const escala = Math.min(1, 800 / bitmap.width);
      const lienzo = document.createElement('canvas');
      lienzo.width = Math.round(bitmap.width * escala);
      lienzo.height = Math.round(bitmap.height * escala);
      lienzo.getContext('2d')?.drawImage(bitmap, 0, 0, lienzo.width, lienzo.height);

      const blob = await new Promise<Blob | null>((r) =>
        lienzo.toBlob(r, 'image/jpeg', 0.8)
      );
      if (!blob) throw new Error();

      const ruta = `${orgId}/devoluciones/${abierto}-${Date.now()}.jpg`;
      const { error } = await supabase.storage
        .from('logos')
        .upload(ruta, blob, { contentType: 'image/jpeg', upsert: true });
      if (error) throw new Error();

      const { data } = supabase.storage.from('logos').getPublicUrl(ruta);
      setF((p) => ({ ...p, fotoUrl: data.publicUrl }));
      setAviso({ tipo: 'ok', texto: `Fotografía adjunta (${Math.round(blob.size / 1024)} KB).` });
    } catch {
      setAviso({ tipo: 'error', texto: 'No se pudo procesar la imagen.' });
    } finally {
      setSubiendo(false);
      if (fotoRef.current) fotoRef.current.value = '';
    }
  }

  async function registrar(item: ItemPorDevolver) {
    let firmaUrl: string | null = null;

    if (firmaRef.current?.tieneFirma()) {
      const blob = await firmaRef.current.obtenerBlob();
      if (blob) {
        const ruta = `${orgId}/devoluciones/firma-${item.id}-${Date.now()}.png`;
        const { error } = await supabase.storage
          .from('firmas')
          .upload(ruta, blob, { contentType: 'image/png', upsert: true });
        if (!error) firmaUrl = ruta;
      }
    }

    startTransition(async () => {
      const r = await devolverItem({ itemId: item.id, ...f, firmaUrl });
      setAviso({ tipo: r.ok ? 'ok' : 'error', texto: r.mensaje });
      if (r.ok) { setAbierto(null); router.refresh(); }
    });
  }

  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString('es-CO', { dateStyle: 'medium' });

  const ocupado = pendiente || subiendo;
  const conRetirados = pendientes.filter((x) => x.empleado_inactivo).length;

  return (
    <>
      <div style={e.pestanas}>
        <button
          onClick={() => setPestana('pendientes')}
          style={{ ...e.pestana, ...(pestana === 'pendientes' ? { ...e.activa, color, borderBottomColor: color } : {}) }}
        >
          Por devolver ({pendientes.length})
        </button>
        <button
          onClick={() => setPestana('historial')}
          style={{ ...e.pestana, ...(pestana === 'historial' ? { ...e.activa, color, borderBottomColor: color } : {}) }}
        >
          Devueltos ({historial.length})
        </button>
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

      {pestana === 'pendientes' ? (
        pendientes.length === 0 ? (
          <div style={e.vacio}>
            <p style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 600 }}>
              No hay equipos pendientes de devolución
            </p>
            <p style={e.explicacion}>
              Aquí aparecen solo los <strong>equipos</strong> —los que se marcan
              como retornables—. Los elementos de protección se consumen y no
              retornan, así que no generan devolución.
            </p>
            <p style={e.explicacion}>
              Para que aparezca algo, necesitas una entrega <strong>firmada</strong>
              que incluya al menos un equipo.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 16, flexWrap: 'wrap' }}>
              <Link href="/panel/dotacion/entregas/nueva" style={{ ...e.btn, background: color, textDecoration: 'none' }}>
                Nueva entrega
              </Link>
              <Link href="/panel/dotacion?tipo=retornable" style={{ ...e.btnSec, textDecoration: 'none' }}>
                Ver equipos
              </Link>
            </div>
          </div>
        ) : (
          <>
            {conRetirados > 0 && (
              <div style={e.alertaRetirados}>
                <strong>{conRetirados}</strong> equipo(s) están en poder de
                personas que ya no aparecen activas en la nómina. Es el hallazgo
                típico de una auditoría de activos.
              </div>
            )}

            {pendientes.map((it) => (
              <article key={it.id} style={{
                ...e.card,
                borderLeftWidth: 3,
                borderLeftColor: it.empleado_inactivo ? '#9B1C1C' : '#E4E4DF',
              }}>
                <div style={e.cabeceraItem}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={e.codigoItem}>{it.codigo} · {it.articulo_codigo}</div>
                    <h3 style={e.nombreItem}>{it.articulo}</h3>
                    <div style={e.metaItem}>
                      <span style={e.mono}>{it.placa}</span>
                      {it.serial && <> · {it.serial}</>}
                    </div>
                  </div>

                  <div style={e.quien}>
                    <strong style={{ fontSize: 12.5 }}>{it.nombres}</strong>
                    <div style={e.metaItem}>
                      {it.area ?? '—'} · desde {fmt(it.fecha_entrega)}
                    </div>
                    <div style={{
                      ...e.dias,
                      color: it.dias > 365 ? '#9B1C1C' : '#8A929C',
                    }}>
                      {it.dias} día{it.dias === 1 ? '' : 's'} en uso
                    </div>
                    {it.empleado_inactivo && (
                      <span style={e.chipRetirado}>No está en la nómina activa</span>
                    )}
                  </div>

                  {abierto !== it.id && (
                    <button
                      onClick={() => abrir(it)}
                      style={{ ...e.btn, background: color }}
                    >
                      Registrar devolución
                    </button>
                  )}
                </div>

                {abierto === it.id && (
                  <div style={e.formulario}>
                    {/* Comparación: lo entregado frente a lo devuelto */}
                    <div style={e.comparacion}>
                      <div style={e.ladoComparacion}>
                        <span style={e.etiquetaComp}>Se entregó</span>
                        <div style={{
                          ...e.estadoEntregado,
                          color: ESTADOS.find((x) => x.v === it.estado_entrega)?.color ?? '#5B6470',
                        }}>
                          {ESTADOS.find((x) => x.v === it.estado_entrega)?.t ?? 'Sin registrar'}
                        </div>
                        {it.unidad_foto && (
                          <img src={it.unidad_foto} alt="Al entregar" style={e.fotoComp} />
                        )}
                        {it.accesorios && (
                          <div style={e.accesorios}>Con: {it.accesorios}</div>
                        )}
                      </div>

                      <div style={e.flecha}>→</div>

                      <div style={e.ladoComparacion}>
                        <span style={e.etiquetaComp}>Vuelve</span>
                        <div style={e.opcionesEstado}>
                          {ESTADOS.map((x) => (
                            <button
                              key={x.v}
                              onClick={() => setF({ ...f, estado: x.v })}
                              style={{
                                ...e.botonEstado,
                                borderColor: f.estado === x.v ? x.color : '#DFDFD8',
                                background: f.estado === x.v ? x.color + '14' : '#fff',
                                color: f.estado === x.v ? x.color : '#5B6470',
                                fontWeight: f.estado === x.v ? 700 : 500,
                              }}
                            >
                              {x.t}
                            </button>
                          ))}
                        </div>
                        {f.fotoUrl && (
                          <img src={f.fotoUrl} alt="Al devolver" style={e.fotoComp} />
                        )}
                      </div>
                    </div>

                    <div style={e.dos}>
                      <div>
                        <label style={e.label}>Destino del equipo</label>
                        <select
                          value={f.destino}
                          onChange={(x) => setF({ ...f, destino: x.target.value as DestinoUnidad })}
                          style={e.input}
                        >
                          {DESTINOS.map((d) => (
                            <option key={d.v} value={d.v}>{d.t}</option>
                          ))}
                        </select>
                        <p style={e.nota}>
                          {DESTINOS.find((d) => d.v === f.destino)?.nota}
                        </p>
                      </div>

                      <div>
                        <label style={e.label}>Quién recibe</label>
                        <input
                          value={f.recibidoPor}
                          onChange={(x) => setF({ ...f, recibidoPor: x.target.value.toUpperCase() })}
                          style={{ ...e.input, textTransform: 'uppercase' }}
                        />
                      </div>
                    </div>

                    <label style={e.label}>Observaciones</label>
                    <textarea
                      value={f.observaciones}
                      rows={2}
                      onChange={(x) => setF({ ...f, observaciones: x.target.value })}
                      placeholder="Golpes, faltantes, deterioro…"
                      style={{ ...e.input, resize: 'vertical' }}
                    />

                    <div style={e.filaFoto}>
                      <label style={{ ...e.btnSec, cursor: subiendo ? 'not-allowed' : 'pointer' }}>
                        {subiendo ? 'Procesando…' : f.fotoUrl ? 'Cambiar fotografía' : 'Adjuntar fotografía'}
                        <input
                          ref={fotoRef}
                          type="file"
                          accept="image/*"
                          capture="environment"
                          disabled={subiendo}
                          onChange={(x) => {
                            const a = x.target.files?.[0];
                            if (a) subirFoto(a);
                          }}
                          style={{ display: 'none' }}
                        />
                      </label>
                      <span style={e.nota}>
                        Documenta el estado de retorno. Se comprime al subir.
                      </span>
                    </div>

                    <label style={{ ...e.label, marginTop: 14 }}>
                      Firma de quien devuelve (opcional)
                    </label>
                    <LienzoFirma ref={firmaRef} color={color} />

                    <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                      <button
                        onClick={() => registrar(it)}
                        disabled={ocupado}
                        style={{ ...e.btn, background: ocupado ? '#C5C5BD' : color }}
                      >
                        {pendiente ? 'Registrando…' : 'Confirmar devolución'}
                      </button>
                      <button onClick={() => setAbierto(null)} style={e.btnSec}>
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </article>
            ))}
          </>
        )
      ) : historial.length === 0 ? (
        <div style={e.vacio}>
          <p style={{ margin: 0, fontSize: 13.5 }}>Aún no hay devoluciones registradas.</p>
        </div>
      ) : (
        <div style={e.contenedor}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
            <thead>
              <tr>
                {['Equipo', 'Quien lo tenía', 'Uso', 'Entregó', 'Volvió', 'Recibió'].map((h) => (
                  <th key={h} style={e.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {historial.map((d) => {
                const peor = (d.deterioro ?? 0) > 0;
                return (
                  <tr key={d.id}>
                    <td style={e.td}>
                      <strong>{d.articulo}</strong>
                      <div style={e.mono}>{d.placa}</div>
                    </td>
                    <td style={e.td}>
                      {d.nombres}
                      <div style={e.metaItem}>{d.codigo}</div>
                    </td>
                    <td style={e.td}>{d.dias_uso} días</td>
                    <td style={e.td}>
                      {ESTADOS.find((x) => x.v === d.estado_entrega)?.t ?? '—'}
                    </td>
                    <td style={e.td}>
                      <span style={{
                        ...e.chipEstado,
                        background: peor ? '#FEE2E2' : '#F0FDF4',
                        color: peor ? '#9B1C1C' : '#15803D',
                      }}>
                        {ESTADOS.find((x) => x.v === d.estado_devolucion)?.t ?? '—'}
                        {peor && ` ▾${d.deterioro}`}
                      </span>
                      {d.observaciones_devolucion && (
                        <div style={e.obs}>{d.observaciones_devolucion}</div>
                      )}
                    </td>
                    <td style={e.td}>
                      {d.recibido_por ?? '—'}
                      <div style={e.metaItem}>{fmt(d.fecha_devolucion)}</div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

const e: Record<string, React.CSSProperties> = {
  pestanas: { display: 'flex', gap: 4, borderBottom: '1px solid #E4E4DF', marginBottom: 16 },
  pestana: {
    background: 'none', border: 'none', padding: '10px 18px', fontSize: 13,
    cursor: 'pointer', fontFamily: 'inherit', color: '#8A929C',
    borderBottomWidth: 2, borderBottomStyle: 'solid', borderBottomColor: 'transparent',
    marginBottom: -1,
  },
  activa: { fontWeight: 700 },

  card: {
    background: '#fff', borderWidth: 1, borderStyle: 'solid', borderColor: '#E4E4DF',
    borderRadius: 8, padding: 18, marginBottom: 12,
  },
  cabeceraItem: { display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' },
  codigoItem: {
    fontSize: 10, color: '#A3AAB3',
    fontFamily: 'ui-monospace,SFMono-Regular,Menlo,monospace',
  },
  nombreItem: { fontSize: 14, margin: '3px 0 4px', fontWeight: 600 },
  metaItem: { fontSize: 11, color: '#8A929C', marginTop: 2 },
  mono: { fontFamily: 'ui-monospace,SFMono-Regular,Menlo,monospace', fontSize: 11 },
  quien: { minWidth: 190 },
  dias: { fontSize: 11, marginTop: 3 },
  chipRetirado: {
    display: 'inline-block', marginTop: 5, fontSize: 10,
    background: '#FEE2E2', color: '#9B1C1C', padding: '2px 8px',
    borderRadius: 999, fontWeight: 600,
  },

  alertaRetirados: {
    background: '#FDF2F2', color: '#9B1C1C', padding: '12px 15px',
    borderRadius: 6, fontSize: 12.5, marginBottom: 14, lineHeight: 1.6,
  },

  formulario: {
    marginTop: 16, paddingTop: 16,
    borderTopWidth: 1, borderTopStyle: 'solid', borderTopColor: '#EFEFEA',
  },
  comparacion: {
    display: 'flex', gap: 14, alignItems: 'flex-start',
    background: '#FBFBF9', borderRadius: 6, padding: 14, marginBottom: 14,
    flexWrap: 'wrap',
  },
  ladoComparacion: { flex: 1, minWidth: 190 },
  etiquetaComp: {
    fontSize: 10, textTransform: 'uppercase', letterSpacing: .6, color: '#8A929C',
  },
  estadoEntregado: { fontSize: 16, fontWeight: 700, marginTop: 4 },
  flecha: { fontSize: 18, color: '#C5C5BD', alignSelf: 'center' },
  opcionesEstado: { display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 5 },
  botonEstado: {
    borderWidth: 1.5, borderStyle: 'solid', borderRadius: 4,
    padding: '6px 12px', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
  },
  fotoComp: {
    maxHeight: 90, maxWidth: '100%', objectFit: 'contain',
    marginTop: 8, borderRadius: 4, display: 'block',
  },
  accesorios: { fontSize: 11, color: '#5B6470', marginTop: 6 },

  dos: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 14 },
  label: { display: 'block', fontSize: 12, fontWeight: 600, margin: '12px 0 5px' },
  input: {
    width: '100%', padding: '9px 11px', borderWidth: 1, borderStyle: 'solid',
    borderColor: '#DFDFD8', borderRadius: 4, fontSize: 13,
    boxSizing: 'border-box', fontFamily: 'inherit', background: '#fff',
  },
  nota: { fontSize: 11, color: '#8A929C', margin: '4px 0 0', lineHeight: 1.5 },
  filaFoto: { display: 'flex', gap: 12, alignItems: 'center', marginTop: 14, flexWrap: 'wrap' },

  contenedor: {
    background: '#fff', borderWidth: 1, borderStyle: 'solid', borderColor: '#E4E4DF',
    borderRadius: 8, overflowX: 'auto',
  },
  th: {
    background: '#F7F7F4', color: '#8A929C', fontSize: 10.5, textTransform: 'uppercase',
    padding: '9px 10px', textAlign: 'left', borderBottom: '1px solid #E4E4DF',
  },
  td: { padding: '9px 10px', borderBottom: '1px solid #F4F4F0', verticalAlign: 'top' },
  chipEstado: { fontSize: 10.5, fontWeight: 600, padding: '3px 9px', borderRadius: 999 },
  obs: { fontSize: 10.5, color: '#8A929C', marginTop: 3, maxWidth: 200 },

  aviso: { padding: '10px 14px', borderRadius: 6, fontSize: 13, marginBottom: 14 },
  btn: {
    color: '#fff', border: 'none', padding: '10px 18px', borderRadius: 4,
    fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
  },
  btnSec: {
    background: '#fff', color: '#14263F',
    borderWidth: 1, borderStyle: 'solid', borderColor: '#DFDFD8',
    padding: '10px 18px', borderRadius: 4, fontSize: 12.5,
    fontWeight: 600, display: 'inline-block',
  },
  explicacion: {
    fontSize: 12.5, color: '#5B6470', margin: '0 0 8px',
    lineHeight: 1.6, maxWidth: 460, marginLeft: 'auto', marginRight: 'auto',
  },
  vacio: {
    background: '#fff', borderWidth: 1, borderStyle: 'dashed', borderColor: '#DFDFD8',
    borderRadius: 8, padding: '40px 24px', textAlign: 'center',
  },
};
