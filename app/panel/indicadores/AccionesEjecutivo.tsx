'use client';

/**
 * REPORTE EJECUTIVO — descarga y envío
 * ---------------------------------------------------------------
 * El destinatario habitual es gerencia o el COPASST de la empresa,
 * así que el campo se precarga con el contacto registrado en su ficha.
 */
import { useState, useTransition } from 'react';
import { enviarReporteEjecutivo } from '@/lib/acciones-ejecutivo';

const PERIODOS = [
  { meses: 3, texto: 'Últimos 3 meses' },
  { meses: 6, texto: 'Últimos 6 meses' },
  { meses: 12, texto: 'Últimos 12 meses' },
];

export default function AccionesEjecutivo({
  empresaId,
  empresaNombre,
  correoContacto,
  color,
}: {
  empresaId: string;
  empresaNombre: string;
  correoContacto: string | null;
  color: string;
}) {
  const [pendiente, startTransition] = useTransition();
  const [meses, setMeses] = useState(12);
  const [abierto, setAbierto] = useState(false);
  const [correos, setCorreos] = useState(correoContacto ?? '');
  const [mensaje, setMensaje] = useState('');
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  function enviar() {
    if (!correos.trim()) {
      setAviso({ tipo: 'error', texto: 'Escribe al menos un correo.' });
      return;
    }
    startTransition(async () => {
      const r = await enviarReporteEjecutivo(empresaId, correos, mensaje, meses);
      setAviso({ tipo: r.ok ? 'ok' : 'error', texto: r.mensaje });
      if (r.ok) {
        setMensaje('');
        setAbierto(false);
      }
    });
  }

  return (
    <section style={e.card}>
      <div style={e.cabecera}>
        <div>
          <h2 style={e.h2}>Reporte ejecutivo</h2>
          <p style={e.sub}>
            Documento de gestión para presentar a gerencia o al COPASST de{' '}
            {empresaNombre}.
          </p>
        </div>
      </div>

      <div style={e.controles}>
        <select
          value={meses}
          onChange={(ev) => setMeses(Number(ev.target.value))}
          style={e.select}
        >
          {PERIODOS.map((p) => (
            <option key={p.meses} value={p.meses}>{p.texto}</option>
          ))}
        </select>

        {/* Enlace directo: el navegador gestiona la descarga */}
        <a
          href={`/api/pdf-ejecutivo/${empresaId}?meses=${meses}`}
          style={{ ...e.btn, background: 'var(--marca)' }}
        >
          Descargar PDF
        </a>

        <button onClick={() => setAbierto(!abierto)} style={e.btnSec}>
          {abierto ? 'Cancelar envío' : 'Enviar por correo'}
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
          <p style={e.ayuda}>
            {correoContacto
              ? 'Precargado con el contacto de la empresa. Puedes agregar más separados por coma.'
              : 'Varios correos separados por coma.'}
          </p>

          <label style={{ ...e.label, marginTop: 12 }}>Mensaje adicional</label>
          <textarea
            value={mensaje}
            onChange={(ev) => setMensaje(ev.target.value)}
            rows={3}
            placeholder="Opcional"
            style={{ ...e.input, resize: 'vertical' }}
          />

          <button
            onClick={enviar}
            disabled={pendiente}
            style={{
              ...e.btn, background: pendiente ? 'var(--borde-fuerte)' : 'var(--marca)',
              marginTop: 12, width: '100%', border: 'none', cursor: 'pointer',
            }}
          >
            {pendiente ? 'Generando y enviando…' : 'Enviar reporte'}
          </button>
        </div>
      )}

      {aviso && (
        <div style={{
          ...e.aviso,
          background: aviso.tipo === 'ok' ? 'var(--bien-fondo)' : 'var(--mal-fondo)',
          color: aviso.tipo === 'ok' ? 'var(--bien)' : 'var(--mal)',
        }}>
          {aviso.texto}
        </div>
      )}

      <p style={e.nota}>
        Incluye indicadores de participación, evolución mensual, distribución
        por área y ciudad, y el detalle de cada capacitación con su evaluación.
      </p>
    </section>
  );
}

const e: Record<string, React.CSSProperties> = {
  card: {
    background: 'var(--superficie)', border: '1px solid var(--borde)', borderRadius: 8,
    padding: 20, marginBottom: 20,
  },
  cabecera: { marginBottom: 14 },
  h2: { fontSize: 14.5, margin: '0 0 3px', fontWeight: 600 },
  sub: { fontSize: 12, color: 'var(--texto-suave)', margin: 0 },
  controles: { display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' },
  select: {
    padding: '9px 11px', border: '1px solid var(--borde-fuerte)', borderRadius: 4,
    fontSize: 13, fontFamily: 'inherit', background: 'var(--superficie)',
  },
  btn: {
    color: 'var(--sobre-marca)', padding: '10px 18px', borderRadius: 4,
    fontSize: 13, fontWeight: 600, textDecoration: 'none', display: 'inline-block',
  },
  btnSec: {
    background: 'var(--superficie)', color: 'var(--texto)', border: '1px solid var(--borde-fuerte)',
    padding: '10px 18px', borderRadius: 4, fontSize: 13, fontWeight: 600, cursor: 'pointer',
  },
  bloque: { marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--borde)', maxWidth: 520 },
  label: { display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5 },
  input: {
    width: '100%', padding: '9px 11px', border: '1px solid var(--borde-fuerte)',
    borderRadius: 4, fontSize: 13, boxSizing: 'border-box', fontFamily: 'inherit',
  },
  ayuda: { fontSize: 11, color: 'var(--texto-tenue)', margin: '4px 0 0' },
  aviso: { marginTop: 14, padding: '10px 14px', borderRadius: 6, fontSize: 13 },
  nota: { fontSize: 11.5, color: 'var(--texto-tenue)', marginTop: 14, lineHeight: 1.5 },
};
