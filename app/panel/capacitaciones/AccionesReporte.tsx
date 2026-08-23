'use client';

/**
 * ACCIONES DEL REPORTE: descargar PDF y enviarlo por correo
 */
import { useState, useTransition } from 'react';
import { enviarReportePorCorreo } from '@/lib/acciones-reporte';

export default function AccionesReporte({
  capacitacionId,
  color,
}: {
  capacitacionId: string;
  color: string;
}) {
  const [pendiente, startTransition] = useTransition();
  const [abierto, setAbierto] = useState(false);
  const [correos, setCorreos] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  function enviar() {
    if (!correos.trim()) {
      setAviso({ tipo: 'error', texto: 'Escribe al menos un correo.' });
      return;
    }
    startTransition(async () => {
      const r = await enviarReportePorCorreo(capacitacionId, correos, mensaje);
      setAviso({ tipo: r.ok ? 'ok' : 'error', texto: r.mensaje });
      if (r.ok) {
        setCorreos('');
        setMensaje('');
        setAbierto(false);
      }
    });
  }

  return (
    <section style={est.tarjeta}>
      <h2 style={est.h2}>Reporte</h2>

      <div style={est.fila}>
        {/* La descarga es un enlace normal: el navegador se encarga,
            sin bloquear la interfaz mientras se genera el archivo. */}
        <a
          href={`/api/pdf/${capacitacionId}`}
          style={{ ...est.btn, background: color, color: '#fff', textDecoration: 'none' }}
        >
          Descargar PDF
        </a>

        {/* Excel: enlace directo, el navegador gestiona la descarga */}
        <a
          href={`/api/excel/${capacitacionId}`}
          style={{ ...est.btn, background: '#15803d', color: '#fff', textDecoration: 'none' }}
        >
          Descargar Excel
        </a>

        <button onClick={() => setAbierto(!abierto)} style={est.btnSec}>
          {abierto ? 'Cancelar envío' : 'Enviar por correo'}
        </button>
      </div>

      <p style={est.nota}>
        Ambos archivos se generan en el momento: siempre reflejan los datos
        actuales. El Excel trae dos hojas, datos y asistentes.
      </p>

      {abierto && (
        <div style={est.bloque}>
          <label style={est.label}>Destinatarios</label>
          <input
            value={correos}
            onChange={(e) => setCorreos(e.target.value)}
            placeholder="correo1@empresa.com, correo2@empresa.com"
            style={est.input}
          />
          <p style={est.ayuda}>Puedes escribir varios separados por coma.</p>

          <label style={{ ...est.label, marginTop: 12 }}>Mensaje adicional</label>
          <textarea
            value={mensaje}
            onChange={(e) => setMensaje(e.target.value)}
            rows={3}
            placeholder="Opcional"
            style={{ ...est.input, resize: 'vertical' }}
          />

          <button
            onClick={enviar}
            disabled={pendiente}
            style={{
              ...est.btn,
              background: pendiente ? '#cbd5e1' : color,
              color: '#fff',
              marginTop: 12,
              width: '100%',
              cursor: pendiente ? 'not-allowed' : 'pointer',
            }}
          >
            {pendiente ? 'Generando y enviando…' : 'Enviar reporte'}
          </button>
        </div>
      )}

      {aviso && (
        <div style={{
          ...est.aviso,
          background: aviso.tipo === 'ok' ? '#f0fdf4' : '#fef2f2',
          color: aviso.tipo === 'ok' ? '#15803d' : '#b91c1c',
        }}>
          {aviso.texto}
        </div>
      )}
    </section>
  );
}

const est: Record<string, React.CSSProperties> = {
  tarjeta: { background: '#fff', borderRadius: 14, padding: 20, marginBottom: 20, boxShadow: '0 6px 18px rgba(0,0,0,.05)' },
  h2: { fontSize: 15, margin: '0 0 14px' },
  fila: { display: 'flex', gap: 10, flexWrap: 'wrap' },
  btn: { border: 'none', padding: '10px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'inline-block' },
  btnSec: { background: '#f1f5f9', color: '#1f2937', border: '1px solid #cbd5e1', padding: '10px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  nota: { fontSize: 11.5, color: '#6b7280', margin: '10px 0 0' },
  bloque: { marginTop: 16, paddingTop: 16, borderTop: '1px solid #e5e7eb' },
  label: { display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 },
  input: { width: '100%', padding: '9px 10px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 13, boxSizing: 'border-box', fontFamily: 'inherit' },
  ayuda: { fontSize: 11, color: '#6b7280', margin: '4px 0 0' },
  aviso: { marginTop: 14, padding: '10px 14px', borderRadius: 8, fontSize: 13 },
};
