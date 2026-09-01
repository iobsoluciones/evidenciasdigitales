'use client';

/**
 * FIRMA REMOTA — vista del receptor
 * ---------------------------------------------------------------
 * Pensada para el celular: quien firma está en una bodega o en otra
 * sede, no frente a un escritorio.
 *
 * Se pide la identificación como confirmación, no como seguridad: el
 * enlace puede reenviarse, y así al menos queda constancia de que
 * quien firmó sabía a nombre de quién iba la entrega.
 */
import { useState, useRef } from 'react';
import { crearClienteNavegador } from '@/lib/supabase/cliente';
import LienzoFirma, { type LienzoFirmaRef } from '@/app/LienzoFirma';

type Item = {
  nombre: string; tipo: string; unidad: string; foto_url: string | null;
  cantidad: number; talla: string | null;
  placa: string | null; serial: string | null;
  estado_entrega: string | null; accesorios: string | null;
};

export default function FirmaRemota({
  token,
  entrega,
  color,
}: {
  token: string;
  entrega: {
    orgId: string;
    codigo: string;
    nombres: string;
    identificacion: string;
    cargo: string | null;
    area: string | null;
    entregadoPor: string;
    observaciones: string | null;
    declaracion: string | null;
    empresa: string;
    logo: string | null;
    items: Item[];
  };
  color: string;
}) {
  const supabase = crearClienteNavegador();
  const firmaRef = useRef<LienzoFirmaRef>(null);

  const [identificacion, setIdentificacion] = useState('');
  const [aceptado, setAceptado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const [listo, setListo] = useState(false);

  async function firmar() {
    setError('');

    if (identificacion.replace(/[^0-9]/g, '') !== entrega.identificacion) {
      setError('La identificación no coincide con la de esta entrega.');
      return;
    }
    if (entrega.declaracion && !aceptado) {
      setError('Debes aceptar la declaración para continuar.');
      return;
    }
    if (!firmaRef.current?.tieneFirma()) {
      setError('Por favor firma en el recuadro.');
      return;
    }

    setEnviando(true);

    const blob = await firmaRef.current.obtenerBlob();
    if (!blob) { setEnviando(false); setError('No se pudo capturar la firma.'); return; }

    // La ruta DEBE empezar por org_id: la política de lectura del
    // bucket lo exige, y sin eso el consultor no podría ver su propia
    // firma al generar el PDF del acta.
    const ruta = `${entrega.orgId}/entregas/${token}-${Date.now()}.png`;
    const { error: errSubida } = await supabase.storage
      .from('firmas')
      .upload(ruta, blob, { contentType: 'image/png', upsert: false });

    if (errSubida) {
      setEnviando(false);
      setError('No se pudo guardar la firma. Intenta de nuevo.');
      return;
    }

    const { data, error: errRpc } = await supabase.rpc('firmar_entrega_publica', {
      p_token: token,
      p_identificacion: identificacion,
      p_firma: ruta,
    });

    setEnviando(false);

    if (errRpc) { setError('Error de conexión. Intenta de nuevo.'); return; }

    const r = data as { ok: boolean; error?: string };
    if (!r.ok) { setError(r.error ?? 'No se pudo registrar la firma.'); return; }

    setListo(true);
  }

  if (listo) {
    return (
      <div style={s.caja}>
        <div style={{
          width: 60, height: 60, borderRadius: '50%', background: 'var(--bien-fondo)',
          color: 'var(--bien)', fontSize: 30, lineHeight: '60px',
          margin: '0 auto 16px', textAlign: 'center',
        }}>
          ✓
        </div>
        <h1 style={{ ...s.titulo, textAlign: 'center' }}>Entrega firmada</h1>
        <p style={{ ...s.texto, textAlign: 'center' }}>
          Quedó registrada el acta <strong>{entrega.codigo}</strong>. Ya puedes
          cerrar esta página.
        </p>
      </div>
    );
  }

  return (
    <div style={s.caja}>
      {/* ---------- Encabezado ---------- */}
      <div style={s.encabezado}>
        {entrega.logo && <img src={entrega.logo} alt="" style={s.logo} />}
        <div style={{ ...s.empresa, color }}>{entrega.empresa}</div>
        <div style={s.subtitulo}>Entrega de dotación · {entrega.codigo}</div>
      </div>

      {/* ---------- Quién recibe ---------- */}
      <div style={s.datos}>
        <Fila k="Recibe" v={entrega.nombres} />
        {entrega.cargo && <Fila k="Cargo" v={entrega.cargo} />}
        {entrega.area && <Fila k="Área" v={entrega.area} />}
        <Fila k="Entrega" v={entrega.entregadoPor} />
      </div>

      {/* ---------- Elementos ---------- */}
      <h2 style={s.h2}>Elementos que recibes</h2>
      <div style={s.items}>
        {entrega.items.map((it, i) => (
          <div key={i} style={s.item}>
            {it.foto_url && <img src={it.foto_url} alt="" style={s.fotoItem} />}
            <div style={{ flex: 1 }}>
              <strong style={{ fontSize: 13.5 }}>{it.nombre}</strong>
              <div style={s.detalleItem}>
                {it.cantidad} {it.unidad.toLowerCase()}
                {it.talla && ` · talla ${it.talla}`}
                {it.placa && ` · placa ${it.placa}`}
                {it.estado_entrega && ` · estado ${it.estado_entrega}`}
              </div>
              {it.accesorios && (
                <div style={s.accesorios}>Incluye: {it.accesorios}</div>
              )}
            </div>
          </div>
        ))}
      </div>

      {entrega.observaciones && (
        <p style={s.observaciones}>{entrega.observaciones}</p>
      )}

      {/* ---------- Declaración ---------- */}
      {entrega.declaracion && (
        <div style={s.declaracion}>
          <p style={s.textoDeclaracion}>{entrega.declaracion}</p>
          <label style={s.aceptar}>
            <input
              type="checkbox"
              checked={aceptado}
              onChange={(x) => setAceptado(x.target.checked)}
              style={{ marginRight: 9, width: 17, height: 17 }}
            />
            He leído y acepto la declaración
          </label>
        </div>
      )}

      {/* ---------- Confirmación ---------- */}
      <label style={s.label}>Confirma tu identificación</label>
      <input
        value={identificacion}
        onChange={(x) => setIdentificacion(x.target.value.replace(/[^0-9]/g, ''))}
        inputMode="numeric"
        placeholder="Solo números"
        style={s.input}
      />

      <label style={{ ...s.label, marginTop: 18 }}>Firma</label>
      <LienzoFirma ref={firmaRef} color={color} />

      {error && <div style={s.error}>{error}</div>}

      <button
        onClick={firmar}
        disabled={enviando}
        style={{
          ...s.boton,
          background: enviando ? 'var(--borde-fuerte)' : color,
          cursor: enviando ? 'not-allowed' : 'pointer',
        }}
      >
        {enviando ? 'Enviando…' : 'Firmar y confirmar recibido'}
      </button>

      <p style={s.notaPie}>
        Al firmar aceptas haber recibido los elementos relacionados.
      </p>
    </div>
  );
}

function Fila({ k, v }: { k: string; v: string }) {
  return (
    <div style={s.fila}>
      <span style={s.clave}>{k}</span>
      <span style={s.valor}>{v}</span>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  caja: {
    background: 'var(--superficie)', borderRadius: 12, padding: 22,
    maxWidth: 520, margin: '0 auto',
    boxShadow: '0 1px 3px rgba(20,38,63,.08)',
  },
  encabezado: {
    textAlign: 'center', paddingBottom: 16, marginBottom: 16,
    borderBottomWidth: 1, borderBottomStyle: 'solid', borderBottomColor: 'var(--borde)',
  },
  logo: { maxHeight: 44, maxWidth: 130, objectFit: 'contain', marginBottom: 10 },
  empresa: { fontSize: 16, fontWeight: 700 },
  subtitulo: { fontSize: 12, color: 'var(--texto-tenue)', marginTop: 3 },

  datos: { marginBottom: 18 },
  fila: {
    display: 'flex', justifyContent: 'space-between', gap: 12,
    padding: '6px 0', borderBottomWidth: 1, borderBottomStyle: 'solid',
    borderBottomColor: 'var(--superficie-3)', fontSize: 13,
  },
  clave: { color: 'var(--texto-tenue)' },
  valor: { fontWeight: 600, textAlign: 'right' },

  h2: { fontSize: 13.5, margin: '0 0 10px', fontWeight: 600 },
  items: { display: 'grid', gap: 8 },
  item: {
    display: 'flex', gap: 10, alignItems: 'center', padding: 10,
    background: 'var(--superficie-2)', borderRadius: 6,
  },
  fotoItem: { width: 44, height: 44, objectFit: 'contain', borderRadius: 4, background: 'var(--superficie)' },
  detalleItem: { fontSize: 11.5, color: 'var(--texto-suave)', marginTop: 2 },
  accesorios: { fontSize: 11, color: 'var(--texto-tenue)', marginTop: 2 },

  observaciones: {
    fontSize: 12.5, color: 'var(--texto-suave)', marginTop: 14,
    padding: 12, background: 'var(--superficie-2)', borderRadius: 6, lineHeight: 1.6,
  },

  declaracion: {
    marginTop: 18, padding: 14, borderRadius: 8,
    background: 'var(--superficie-2)',
    borderWidth: 1, borderStyle: 'solid', borderColor: 'var(--borde)',
  },
  textoDeclaracion: {
    fontSize: 12, lineHeight: 1.7, color: 'var(--texto-suave)',
    margin: '0 0 12px', textAlign: 'justify',
  },
  aceptar: { display: 'flex', alignItems: 'center', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' },

  label: { display: 'block', fontSize: 13, fontWeight: 600, margin: '18px 0 6px' },
  input: {
    width: '100%', padding: '12px', borderWidth: 1, borderStyle: 'solid',
    borderColor: 'var(--borde-fuerte)', borderRadius: 8, fontSize: 15,
    boxSizing: 'border-box', fontFamily: 'inherit',
  },

  error: {
    marginTop: 14, padding: '11px 14px', background: 'var(--mal-fondo)',
    color: 'var(--mal)', borderRadius: 8, fontSize: 13,
  },
  boton: {
    display: 'block', width: '100%', marginTop: 20, padding: 15,
    color: 'var(--sobre-marca)', border: 'none', borderRadius: 8,
    fontSize: 15, fontWeight: 600,
  },
  titulo: { fontSize: 19, margin: '0 0 8px' },
  texto: { fontSize: 14, color: 'var(--texto-suave)', margin: 0, lineHeight: 1.6 },
  notaPie: { fontSize: 11, color: 'var(--texto-tenue)', textAlign: 'center', marginTop: 14 },
};
