'use client';

/**
 * DETALLE DE LA ENTREGA
 * ---------------------------------------------------------------
 * Un borrador se puede firmar o eliminar. Una entrega firmada solo
 * se consulta y se descarga: es un documento con valor probatorio.
 *
 * La firma es el momento en que el inventario se mueve, así que el
 * botón advierte qué va a pasar antes de pulsarlo.
 */
import { useState, useRef, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  firmarEntrega, anularBorrador,
  type DetalleEntrega,
} from '@/lib/acciones-entregas';
import { generarEnlaceFirma } from '@/lib/acciones-unidades';
import { crearClienteNavegador } from '@/lib/supabase/cliente';
import LienzoFirma, { type LienzoFirmaRef } from '@/app/LienzoFirma';

export default function VistaEntrega({
  detalle,
  orgId,
  color,
}: {
  detalle: DetalleEntrega;
  orgId: string;
  color: string;
}) {
  const router = useRouter();
  const supabase = crearClienteNavegador();
  const [pendiente, startTransition] = useTransition();

  const firmaRecibeRef = useRef<LienzoFirmaRef>(null);
  const firmaEntregaRef = useRef<LienzoFirmaRef>(null);

  const [firmando, setFirmando] = useState(false);
  const [enlace, setEnlace] = useState<string | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  const e = detalle.entrega!;
  const items = detalle.items ?? [];
  const esBorrador = e.estado === 'borrador';

  const fmt = (iso: string) =>
    new Date(iso).toLocaleString('es-CO', { dateStyle: 'long', timeStyle: 'short' });

  const fmtFecha = (iso: string) =>
    new Date(iso + 'T12:00:00').toLocaleDateString('es-CO', { dateStyle: 'medium' });

  async function subirFirma(
    ref: React.RefObject<LienzoFirmaRef | null>,
    sufijo: string
  ): Promise<string | null> {
    if (!ref.current?.tieneFirma()) return null;
    const blob = await ref.current.obtenerBlob();
    if (!blob) return null;

    // El primer segmento debe ser org_id: las políticas del bucket lo
    // comparan contra mi_org_id().
    const ruta = `${orgId}/entregas/${e.id}/${sufijo}-${Date.now()}.png`;
    const { error } = await supabase.storage
      .from('firmas')
      .upload(ruta, blob, { contentType: 'image/png', upsert: true });

    return error ? null : ruta;
  }

  async function firmar() {
    if (!firmaRecibeRef.current?.tieneFirma()) {
      setAviso({ tipo: 'error', texto: 'Falta la firma de quien recibe.' });
      return;
    }

    setSubiendo(true);
    const recibe = await subirFirma(firmaRecibeRef, 'recibe');
    const entrega = await subirFirma(firmaEntregaRef, 'entrega');
    setSubiendo(false);

    if (!recibe) {
      setAviso({ tipo: 'error', texto: 'No se pudo guardar la firma.' });
      return;
    }

    startTransition(async () => {
      const r = await firmarEntrega(e.id, recibe, entrega);
      setAviso({ tipo: r.ok ? 'ok' : 'error', texto: r.mensaje });
      if (r.ok) { setFirmando(false); router.refresh(); }
    });
  }

  /** Genera el enlace para que el receptor firme desde su celular. */
  function generarEnlace() {
    startTransition(async () => {
      const r = await generarEnlaceFirma(e.id);
      setAviso({ tipo: r.ok ? 'ok' : 'error', texto: r.mensaje });
      if (r.ok && r.enlace) setEnlace(`${window.location.origin}${r.enlace}`);
    });
  }

  function eliminar() {
    startTransition(async () => {
      const r = await anularBorrador(e.id);
      setAviso({ tipo: r.ok ? 'ok' : 'error', texto: r.mensaje });
      if (r.ok) router.push('/panel/dotacion/entregas');
    });
  }

  const ocupado = pendiente || subiendo;

  return (
    <>
      <div style={s.cabecera}>
        <div>
          <div style={s.codigo}>{e.codigo}</div>
          <h1 style={s.titulo}>{e.nombres}</h1>
          <p style={s.sub}>
            <span style={s.mono}>{e.identificacion}</span>
            {e.cargo && <> · {e.cargo}</>}
            {e.area && <> · {e.area}</>}
          </p>
        </div>

        <span style={{
          ...s.chipEstado,
          background: esBorrador ? 'var(--ambar-fondo)' : 'var(--bien-fondo)',
          color: esBorrador ? 'var(--ambar)' : 'var(--bien)',
        }}>
          {esBorrador ? 'Borrador · sin firmar' : 'Firmada'}
        </span>
      </div>

      {aviso && (
        <div style={{
          ...s.aviso,
          background: aviso.tipo === 'ok' ? 'var(--bien-fondo)' : 'var(--mal-fondo)',
          color: aviso.tipo === 'ok' ? 'var(--bien)' : 'var(--mal)',
        }}>
          {aviso.texto}
        </div>
      )}

      {/* ---------- Datos ---------- */}
      <section style={s.card}>
        <h2 style={s.h2}>Datos de la entrega</h2>
        <dl style={{ margin: 0 }}>
          <Fila k="Entregado por" v={e.entregado_por} />
          <Fila k="Fecha" v={fmt(e.fecha_entrega)} />
          {e.nomenclatura && <Fila k="Nomenclatura" v={`${e.nomenclatura} · ${e.version_doc ?? ''}`} />}
          {e.observaciones && <Fila k="Observaciones" v={e.observaciones} />}
        </dl>
      </section>

      {/* ---------- Elementos ---------- */}
      <section style={s.card}>
        <h2 style={s.h2}>Elementos ({items.length})</h2>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
            <thead>
              <tr>
                {['Elemento', 'Cant.', 'Detalle', 'Vence', 'Estado'].map((h) => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id}>
                  <td style={s.td}>
                    <div style={{ display: 'flex', gap: 9, alignItems: 'center' }}>
                      {it.foto_url && (
                        <img src={it.foto_url} alt="" style={s.miniatura} />
                      )}
                      <div>
                        <strong style={{ fontSize: 12.5 }}>{it.nombre}</strong>
                        <div style={s.codigoItem}>{it.codigo}</div>
                      </div>
                    </div>
                  </td>
                  <td style={s.td}>{it.cantidad} {it.unidad.toLowerCase()}</td>
                  <td style={{ ...s.td, fontSize: 11.5, color: 'var(--texto-suave)' }}>
                    {it.talla && `Talla ${it.talla}`}
                    {it.placa && <span style={s.mono}>{it.placa}</span>}
                    {it.serial && <div style={{ ...s.mono, fontSize: 10 }}>{it.serial}</div>}
                    {it.lote && `Lote ${it.lote}`}
                    {it.accesorios && <div style={{ marginTop: 2 }}>{it.accesorios}</div>}
                    {!it.talla && !it.placa && !it.lote && !it.accesorios && '—'}
                  </td>
                  <td style={s.td}>
                    {it.fecha_vence ? fmtFecha(it.fecha_vence) : '—'}
                  </td>
                  <td style={s.td}>
                    {it.tipo === 'retornable' ? (
                      it.fecha_devolucion
                        ? <span style={{ color: 'var(--bien)', fontWeight: 600 }}>Devuelto</span>
                        : <span style={{ color: 'var(--info)', fontWeight: 600 }}>En uso</span>
                    ) : (
                      <span style={{ color: 'var(--texto-tenue)' }}>
                        {it.estado_entrega?.toUpperCase() ?? 'Consumible'}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ---------- Declaración ---------- */}
      {e.declaracion && (
        <section style={s.card}>
          <h2 style={s.h2}>Declaración</h2>
          <p style={s.declaracion}>{e.declaracion}</p>
          <p style={s.nota}>
            Se configura por empresa. Es lo que prueba que la persona conoce
            el uso del elemento, no solo que lo recibió.
          </p>
        </section>
      )}

      {/* ---------- Firma o descarga ---------- */}
      {esBorrador ? (
        <section style={s.card}>
          <h2 style={s.h2}>Firmar la entrega</h2>
          <p style={s.nota}>
            Al firmar se descuenta la existencia de los consumibles, las
            unidades quedan asignadas y se calculan las fechas de vencimiento.
            Después no se puede deshacer.
          </p>

          {enlace && (
            <div style={s.enlaceCaja}>
              <strong style={{ fontSize: 12.5 }}>Enlace de firma remota</strong>
              <p style={s.notaEnlace}>
                Compártelo con {e.nombres}. Puede firmar desde su celular sin
                cuenta, y el enlace deja de servir al usarse.
              </p>
              <input
                readOnly
                value={enlace}
                onClick={(ev) => (ev.target as HTMLInputElement).select()}
                style={s.campoEnlace}
              />
            </div>
          )}

          {!firmando ? (
            <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
              <button
                onClick={() => setFirmando(true)}
                style={{ ...s.btn, background: 'var(--marca)' }}
              >
                Firmar ahora
              </button>
              <Link href={`/panel/dotacion/entregas/${e.id}/editar`} style={s.btnSecEnlace}>
                Editar elementos
              </Link>
              <button onClick={generarEnlace} disabled={ocupado} style={s.btnSec}>
                Enviar enlace para firmar
              </button>
              <button onClick={eliminar} disabled={ocupado} style={s.btnBorrar}>
                Eliminar borrador
              </button>
            </div>
          ) : (
            <div style={{ marginTop: 16 }}>
              <div style={s.dosFirmas}>
                <div>
                  <label style={s.label}>Firma de quien recibe *</label>
                  <LienzoFirma ref={firmaRecibeRef} color={color} />
                  <p style={s.pieFirma}>{e.nombres}</p>
                </div>
                <div>
                  <label style={s.label}>Firma de quien entrega</label>
                  <LienzoFirma ref={firmaEntregaRef} color={color} />
                  <p style={s.pieFirma}>{e.entregado_por}</p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                <button
                  onClick={firmar}
                  disabled={ocupado}
                  style={{ ...s.btn, background: ocupado ? 'var(--borde-fuerte)' : 'var(--marca)' }}
                >
                  {subiendo ? 'Guardando firmas…' : pendiente ? 'Aplicando…' : 'Confirmar entrega'}
                </button>
                <button onClick={() => setFirmando(false)} style={s.btnSec}>
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </section>
      ) : (
        <section style={s.card}>
          <h2 style={s.h2}>Acta de entrega</h2>
          <p style={s.nota}>
            Documento firmado con el membrete de la empresa, la declaración
            y las firmas de ambas partes.
          </p>
          <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap', alignItems: 'center' }}>
            <a
              href={`/api/pdf-entrega/${e.id}`}
              style={{ ...s.btn, background: 'var(--marca)', display: 'inline-block' }}
            >
              Descargar PDF
            </a>
            <span
              style={s.btnDeshabilitado}
              title="Una entrega firmada no se puede editar"
            >
              Editar elementos
            </span>
          </div>
          <p style={s.nota}>
            El acta ya está firmada y no se puede modificar. Si un elemento
            debe devolverse, se registra como devolución.
          </p>
        </section>
      )}

      <Link href="/panel/dotacion/entregas" style={s.btnSecEnlace}>
        Volver a entregas
      </Link>
    </>
  );
}

function Fila({ k, v }: { k: string; v: string }) {
  return (
    <div style={s.fila}>
      <dt style={s.clave}>{k}</dt>
      <dd style={s.valor}>{v}</dd>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  cabecera: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    gap: 14, flexWrap: 'wrap', marginTop: 12, marginBottom: 18,
  },
  codigo: {
    fontSize: 11, color: 'var(--texto-tenue)', letterSpacing: .5,
    fontFamily: 'ui-monospace,SFMono-Regular,Menlo,monospace',
  },
  titulo: { fontSize: 22, margin: '3px 0', letterSpacing: -0.4 },
  sub: { fontSize: 13, color: 'var(--texto-suave)', margin: 0 },
  mono: { fontFamily: 'ui-monospace,SFMono-Regular,Menlo,monospace', fontSize: 11.5 },
  chipEstado: { fontSize: 11, fontWeight: 600, padding: '5px 12px', borderRadius: 999 },

  card: {
    background: 'var(--superficie)', borderWidth: 1, borderStyle: 'solid', borderColor: 'var(--borde)',
    borderRadius: 8, padding: 20, marginBottom: 16,
  },
  h2: { fontSize: 14.5, margin: '0 0 12px', fontWeight: 600 },
  nota: { fontSize: 11.5, color: 'var(--texto-tenue)', margin: '8px 0 0', lineHeight: 1.6 },

  fila: {
    display: 'flex', justifyContent: 'space-between', gap: 12,
    padding: '7px 0', borderBottom: '1px solid var(--superficie-3)', fontSize: 12.5,
  },
  clave: { color: 'var(--texto-tenue)', margin: 0 },
  valor: { margin: 0, fontWeight: 600, textAlign: 'right', maxWidth: '65%' },

  th: {
    background: 'var(--fondo)', color: 'var(--texto-tenue)', fontSize: 10.5, textTransform: 'uppercase',
    padding: '8px', textAlign: 'left', borderBottom: '1px solid var(--borde)',
  },
  td: { padding: '9px 8px', borderBottom: '1px solid var(--superficie-3)', verticalAlign: 'top' },
  miniatura: { width: 34, height: 34, objectFit: 'contain', background: 'var(--superficie-2)', borderRadius: 3 },
  codigoItem: { fontSize: 10, color: 'var(--texto-tenue)', fontFamily: 'ui-monospace,monospace' },

  declaracion: {
    fontSize: 12.5, lineHeight: 1.7, color: 'var(--texto-suave)', margin: 0,
    padding: 14, background: 'var(--superficie-2)', borderRadius: 6, textAlign: 'justify',
  },

  dosFirmas: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 18 },
  label: { display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 },
  pieFirma: { fontSize: 11, color: 'var(--texto-tenue)', textAlign: 'center', margin: '6px 0 0' },

  aviso: { padding: '10px 14px', borderRadius: 6, fontSize: 13, marginBottom: 16 },
  btn: {
    color: 'var(--sobre-marca)', border: 'none', padding: '11px 22px', borderRadius: 4,
    fontSize: 13, fontWeight: 600, cursor: 'pointer', textDecoration: 'none',
  },
  btnSec: {
    background: 'var(--superficie)', color: 'var(--texto)',
    borderWidth: 1, borderStyle: 'solid', borderColor: 'var(--borde-fuerte)',
    padding: '11px 22px', borderRadius: 4, fontSize: 13, fontWeight: 600, cursor: 'pointer',
  },
  btnBorrar: {
    background: 'var(--superficie)', color: 'var(--mal)',
    borderWidth: 1, borderStyle: 'solid', borderColor: 'var(--mal)',
    padding: '11px 22px', borderRadius: 4, fontSize: 13, fontWeight: 600, cursor: 'pointer',
  },
  enlaceCaja: {
    background: 'var(--info-fondo)', borderWidth: 1, borderStyle: 'solid',
    borderColor: 'var(--info)', borderRadius: 6, padding: 14, marginTop: 14,
  },
  notaEnlace: { fontSize: 11.5, color: 'var(--info)', margin: '4px 0 8px', lineHeight: 1.55 },
  campoEnlace: {
    width: '100%', padding: '8px 10px', fontSize: 11.5,
    borderWidth: 1, borderStyle: 'solid', borderColor: 'var(--info)',
    borderRadius: 4, boxSizing: 'border-box', background: 'var(--superficie)',
    fontFamily: 'ui-monospace,SFMono-Regular,Menlo,monospace',
  },
  btnDeshabilitado: {
    background: 'var(--superficie-3)', color: 'var(--texto-tenue)',
    borderWidth: 1, borderStyle: 'solid', borderColor: 'var(--borde)',
    padding: '11px 22px', borderRadius: 4, fontSize: 13, fontWeight: 600,
    cursor: 'not-allowed', display: 'inline-block',
  },
  btnSecEnlace: {
    background: 'var(--superficie)', color: 'var(--texto)',
    borderWidth: 1, borderStyle: 'solid', borderColor: 'var(--borde-fuerte)',
    padding: '10px 20px', borderRadius: 4, fontSize: 13, fontWeight: 600,
    textDecoration: 'none', display: 'inline-block',
  },
};
