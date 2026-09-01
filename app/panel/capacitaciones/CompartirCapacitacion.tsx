'use client';

/**
 * COMPARTIR: código QR del registro y enlace de firma del capacitador
 * ---------------------------------------------------------------
 * El enlace de firma puede copiarse o enviarse por correo, igual que
 * en el sistema de Apps Script.
 */
import { useState, useTransition } from 'react';
import { crearClienteNavegador } from '@/lib/supabase/cliente';
import { enviarEnlaceFirma } from '@/lib/acciones-correo';

export default function CompartirCapacitacion({
  capacitacionId,
  instructor,
  color,
}: {
  capacitacionId: string;
  instructor: string;
  color: string;
}) {
  const supabase = crearClienteNavegador();
  const [pendiente, startTransition] = useTransition();

  const [urlFirma, setUrlFirma] = useState('');
  const [correo, setCorreo] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  function copiar(texto: string, textoAviso: string) {
    navigator.clipboard.writeText(texto).then(
      () => setAviso({ tipo: 'ok', texto: textoAviso }),
      () => setAviso({ tipo: 'error', texto: 'No se pudo copiar. Selecciónalo manualmente.' })
    );
  }

  function generarEnlaceFirma(forzar = false) {
    startTransition(async () => {
      const { data, error } = await supabase.rpc('generar_token_firma', {
        p_id: capacitacionId,
        p_forzar: forzar,
      });

      if (error) {
        setAviso({ tipo: 'error', texto: error.message });
        return;
      }

      const r = data as { ok: boolean; token?: string; error?: string };
      if (!r.ok) {
        setAviso({ tipo: 'error', texto: r.error ?? 'No se pudo generar el enlace.' });
        return;
      }

      setUrlFirma(`${window.location.origin}/f/${capacitacionId}?token=${r.token}`);
      if (forzar) {
        setAviso({ tipo: 'ok', texto: 'Enlace regenerado. El anterior quedó invalidado.' });
      }
    });
  }

  function enviarPorCorreo() {
    if (!correo.trim()) {
      setAviso({ tipo: 'error', texto: 'Escribe el correo del capacitador.' });
      return;
    }
    startTransition(async () => {
      const r = await enviarEnlaceFirma(capacitacionId, correo, mensaje);
      setAviso({ tipo: r.ok ? 'ok' : 'error', texto: r.mensaje });
      if (r.ok) {
        setCorreo('');
        setMensaje('');
      }
    });
  }

  return (
    <section style={est.tarjeta}>
      {/* El QR y el enlace de registro NO estan aqui: son los mismos
          para todas las capacitaciones de la empresa, asi que viven en
          la cabecera del listado. Lo de esta pantalla es el enlace de
          firma, que si es unico de esta capacitacion. */}
      <h2 style={est.h2}>Firma del capacitador</h2>

      <div>
        <div>

          {!urlFirma ? (
            <>
              <p style={est.nota}>
                Genera un enlace personal para que {instructor} registre su firma.
                Sin ese enlace nadie puede firmar, aunque conozca el código.
              </p>
              <button
                onClick={() => generarEnlaceFirma(false)}
                disabled={pendiente}
                style={{ ...est.btn, background: color, color: 'var(--sobre-marca)' }}
              >
                {pendiente ? 'Generando…' : 'Generar enlace de firma'}
              </button>
            </>
          ) : (
            <>
              <p style={est.url}>{urlFirma}</p>
              <div style={est.fila}>
                <button
                  onClick={() => copiar(urlFirma, 'Enlace de firma copiado.')}
                  style={{ ...est.btn, background: color, color: 'var(--sobre-marca)' }}
                >
                  Copiar
                </button>
                <button
                  onClick={() => generarEnlaceFirma(true)}
                  disabled={pendiente}
                  style={est.btnSec}
                >
                  Generar uno nuevo
                </button>
              </div>

              {/* ---------- Envío por correo ---------- */}
              <div style={est.bloqueCorreo}>
                <label style={est.label}>Enviar por correo</label>
                <input
                  type="email"
                  value={correo}
                  onChange={(e) => setCorreo(e.target.value)}
                  placeholder="capacitador@empresa.com"
                  style={est.input}
                />
                <textarea
                  value={mensaje}
                  onChange={(e) => setMensaje(e.target.value)}
                  placeholder="Mensaje adicional (opcional)"
                  rows={2}
                  style={{ ...est.input, marginTop: 8, resize: 'vertical' }}
                />
                <button
                  onClick={enviarPorCorreo}
                  disabled={pendiente}
                  style={{ ...est.btn, background: color, color: 'var(--sobre-marca)', marginTop: 8, width: '100%' }}
                >
                  {pendiente ? 'Enviando…' : 'Enviar enlace por correo'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {aviso && (
        <div style={{
          ...est.aviso,
          background: aviso.tipo === 'ok' ? 'var(--bien-fondo)' : 'var(--mal-fondo)',
          color: aviso.tipo === 'ok' ? 'var(--bien)' : 'var(--mal)',
        }}>
          {aviso.texto}
        </div>
      )}
    </section>
  );
}

const est: Record<string, React.CSSProperties> = {
  tarjeta: { background: 'var(--superficie)', borderRadius: 14, padding: 20, marginBottom: 20, boxShadow: '0 6px 18px rgba(0,0,0,.05)' },
  h2: { fontSize: 15, margin: '0 0 14px' },
  h3: { fontSize: 12, color: 'var(--texto-suave)', textTransform: 'uppercase', letterSpacing: .4, margin: '0 0 10px' },
  columnas: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(250px,1fr))', gap: 26 },
  cajaQR: { border: '1px dashed var(--borde-fuerte)', borderRadius: 8, padding: 12, background: 'var(--superficie-3)', display: 'flex', justifyContent: 'center', minHeight: 80 },
  nota: { fontSize: 11.5, color: 'var(--texto-suave)', margin: '8px 0' },
  url: { fontSize: 11, color: 'var(--texto-suave)', background: 'var(--superficie-3)', border: '1px solid var(--borde)', borderRadius: 8, padding: 10, wordBreak: 'break-all', margin: '8px 0' },
  fila: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  btn: { border: 'none', padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' },
  btnSec: { background: 'var(--superficie-3)', color: 'var(--texto)', border: '1px solid var(--borde-fuerte)', padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' },
  bloqueCorreo: { marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--borde)' },
  label: { display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 },
  input: { width: '100%', padding: '9px 10px', border: '1px solid var(--borde-fuerte)', borderRadius: 8, fontSize: 13, boxSizing: 'border-box', fontFamily: 'inherit' },
  aviso: { marginTop: 14, padding: '10px 14px', borderRadius: 8, fontSize: 13 },
};
