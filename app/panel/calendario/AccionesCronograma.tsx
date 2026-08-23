'use client';

/**
 * CRONOGRAMA — descarga y envío
 * ---------------------------------------------------------------
 * Usa el mismo rango que muestra el calendario, así el PDF nunca
 * discrepa de lo que se ve en pantalla.
 */
import { useState, useTransition } from 'react';
import { enviarCronograma } from '@/lib/acciones-cronograma';

export default function AccionesCronograma({
  empresaId,
  empresaNombre,
  correoContacto,
  desde,
  hasta,
  verTodas,
  color,
}: {
  empresaId: string | null;
  empresaNombre: string;
  correoContacto: string | null;
  desde: string;
  hasta: string;
  verTodas: boolean;
  color: string;
}) {
  const [pendiente, startTransition] = useTransition();
  const [abierto, setAbierto] = useState(false);
  const [correos, setCorreos] = useState(correoContacto ?? '');
  const [mensaje, setMensaje] = useState('');
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  const destino = verTodas ? 'todas' : empresaId;

  function enviar() {
    if (!correos.trim()) {
      setAviso({ tipo: 'error', texto: 'Escribe al menos un correo.' });
      return;
    }
    startTransition(async () => {
      const r = await enviarCronograma(
        verTodas ? null : empresaId,
        desde, hasta, correos, mensaje
      );
      setAviso({ tipo: r.ok ? 'ok' : 'error', texto: r.mensaje });
      if (r.ok) { setMensaje(''); setAbierto(false); }
    });
  }

  return (
    <section style={e.card}>
      <div style={e.fila}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <h2 style={e.h2}>Cronograma en PDF</h2>
          <p style={e.sub}>
            {verTodas
              ? 'Todas las empresas de la cuenta'
              : empresaNombre} · periodo visible en el calendario
          </p>
        </div>

        <a
          href={`/api/pdf-cronograma/${destino}?desde=${desde}&hasta=${hasta}`}
          style={{ ...e.btn, background: color }}
        >
          Descargar PDF
        </a>

        <button onClick={() => setAbierto(!abierto)} style={e.btnSec}>
          {abierto ? 'Cancelar' : 'Enviar por correo'}
        </button>
      </div>

      {abierto && (
        <div style={e.bloque}>
          <label style={e.label}>Destinatarios</label>
          <input
            value={correos}
            onChange={(ev) => setCorreos(ev.target.value)}
            placeholder="gerencia@empresa.com, copasst@empresa.com"
            style={e.input}
          />
          <label style={{ ...e.label, marginTop: 12 }}>Mensaje adicional</label>
          <textarea
            value={mensaje}
            onChange={(ev) => setMensaje(ev.target.value)}
            rows={2}
            placeholder="Opcional"
            style={{ ...e.input, resize: 'vertical' }}
          />
          <button
            onClick={enviar}
            disabled={pendiente}
            style={{
              ...e.btn, background: pendiente ? '#C5C5BD' : color,
              marginTop: 12, width: '100%', border: 'none', cursor: 'pointer',
            }}
          >
            {pendiente ? 'Generando y enviando…' : 'Enviar cronograma'}
          </button>
        </div>
      )}

      {aviso && (
        <div style={{
          ...e.aviso,
          background: aviso.tipo === 'ok' ? '#F0FDF4' : '#FDF2F2',
          color: aviso.tipo === 'ok' ? '#15803D' : '#9B1C1C',
        }}>
          {aviso.texto}
        </div>
      )}
    </section>
  );
}

const e: Record<string, React.CSSProperties> = {
  card: {
    background: '#fff', border: '1px solid #E4E4DF', borderRadius: 8,
    padding: 18, marginBottom: 18,
  },
  fila: { display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' },
  h2: { fontSize: 14, margin: '0 0 2px', fontWeight: 600 },
  sub: { fontSize: 11.5, color: '#8A929C', margin: 0 },
  btn: {
    color: '#fff', padding: '9px 16px', borderRadius: 4, fontSize: 12.5,
    fontWeight: 600, textDecoration: 'none', display: 'inline-block',
  },
  btnSec: {
    background: '#fff', color: '#14263F', border: '1px solid #DFDFD8',
    padding: '9px 16px', borderRadius: 4, fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
  },
  bloque: { marginTop: 14, paddingTop: 14, borderTop: '1px solid #EFEFEA', maxWidth: 520 },
  label: { display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5 },
  input: {
    width: '100%', padding: '9px 11px', border: '1px solid #DFDFD8',
    borderRadius: 4, fontSize: 13, boxSizing: 'border-box', fontFamily: 'inherit',
  },
  aviso: { marginTop: 12, padding: '10px 14px', borderRadius: 6, fontSize: 13 },
};
