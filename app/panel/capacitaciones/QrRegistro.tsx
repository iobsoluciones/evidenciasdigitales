'use client';

/**
 * QR Y ENLACE DE REGISTRO — por EMPRESA, no por capacitación
 * ---------------------------------------------------------------
 * El enlace público es /r/{slug de la empresa}: siempre el mismo para
 * todas sus capacitaciones, porque la página pública resuelve sola
 * cuál está activa. Vivía en el detalle de cada capacitación, donde
 * daba a entender que cada una tenía su propio código.
 *
 * Aquí, en la cabecera del listado, se imprime una vez y sirve para
 * toda la empresa.
 */
import { useState, useEffect, useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';

/** Tamaño del QR que se descarga. Grande para que imprima nítido. */
const TAMANO_QR = 512;

export default function QrRegistro({
  slug,
  empresaNombre,
  color,
}: {
  slug: string;
  empresaNombre: string;
  color: string;
}) {
  const contenedorQR = useRef<HTMLDivElement>(null);
  const [abierto, setAbierto] = useState(false);
  const [aviso, setAviso] = useState('');

  // La URL se calcula tras el montaje: durante el render el servidor
  // no conoce el origin y React marcaría un error de hidratación.
  const [url, setUrl] = useState('');
  useEffect(() => {
    setUrl(`${window.location.origin}/r/${slug}`);
  }, [slug]);

  function descargarQR() {
    const canvas = contenedorQR.current?.querySelector('canvas');
    if (!canvas) return;
    const enlace = document.createElement('a');
    enlace.href = canvas.toDataURL('image/png');
    enlace.download = `QR_registro_${slug}.png`;
    enlace.click();
    setAviso('Código QR descargado.');
  }

  function copiar() {
    navigator.clipboard.writeText(url).then(
      () => setAviso('Enlace de registro copiado.'),
      () => setAviso('No se pudo copiar. Selecciónalo manualmente.')
    );
  }

  return (
    <>
      <button
        onClick={() => { setAviso(''); setAbierto(true); }}
        style={e.btn}
        title="Código QR y enlace de registro de asistentes"
      >
        QR de registro
      </button>

      {/* El QR se mantiene montado y oculto: sin canvas en el DOM no
          habría nada que exportar a PNG al pulsar Descargar. */}
      <div ref={contenedorQR} style={{ display: 'none' }}>
        {url && <QRCodeCanvas value={url} size={TAMANO_QR} level="H" fgColor={color} />}
      </div>

      {abierto && (
        <div style={e.velo} onClick={(ev) => { if (ev.target === ev.currentTarget) setAbierto(false); }}>
          <div style={e.modal}>
            <h2 style={e.titulo}>Registro de asistentes</h2>
            <p style={e.sub}>
              Mismo código y enlace para todas las capacitaciones de{' '}
              <strong>{empresaNombre}</strong>. Quien lo escanee se registra en
              la capacitación que esté activa en ese momento.
            </p>

            <div style={e.cajaQR}>
              {url && <QRCodeCanvas value={url} size={180} level="H" fgColor={color} />}
            </div>

            <p style={e.url}>{url || '—'}</p>

            <div style={e.acciones}>
              <button onClick={descargarQR} style={{ ...e.btnPrincipal, background: 'var(--marca)' }}>
                Descargar QR
              </button>
              <button onClick={copiar} style={e.btn}>Copiar enlace</button>
              <button onClick={() => setAbierto(false)} style={e.btn}>Cerrar</button>
            </div>

            {aviso && <p style={e.aviso}>{aviso}</p>}
          </div>
        </div>
      )}
    </>
  );
}

const e: Record<string, React.CSSProperties> = {
  btn: {
    background: 'var(--superficie)', color: 'var(--texto)', border: '1px solid var(--borde-fuerte)',
    padding: '9px 16px', borderRadius: 4, fontSize: 13, fontWeight: 600,
    cursor: 'pointer', fontFamily: 'inherit',
  },
  btnPrincipal: {
    color: 'var(--sobre-marca)', border: 'none', padding: '9px 16px', borderRadius: 4,
    fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
  },
  velo: {
    position: 'fixed', inset: 0, background: 'rgba(20,38,63,.45)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 20, zIndex: 60,
  },
  modal: {
    background: 'var(--superficie)', borderRadius: 8, padding: 24,
    width: '100%', maxWidth: 420, textAlign: 'center',
  },
  titulo: { fontSize: 17, margin: '0 0 6px' },
  sub: { fontSize: 12.5, color: 'var(--texto-suave)', margin: '0 0 18px', lineHeight: 1.5 },
  cajaQR: {
    display: 'inline-flex', padding: 14, background: 'var(--superficie)',
    borderWidth: 1, borderStyle: 'solid', borderColor: 'var(--borde)', borderRadius: 8,
  },
  url: {
    fontSize: 11.5, color: 'var(--texto-suave)', wordBreak: 'break-all',
    fontFamily: 'ui-monospace,monospace', margin: '14px 0 18px',
  },
  acciones: { display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' },
  aviso: { fontSize: 12, color: 'var(--bien)', margin: '14px 0 0' },
};
