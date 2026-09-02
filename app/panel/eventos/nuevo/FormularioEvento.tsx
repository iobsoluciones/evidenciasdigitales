'use client';

/**
 * REPORTE RÁPIDO DE UN EVENTO
 * ---------------------------------------------------------------
 * Pide lo mínimo. La investigación viene después, con calma; pedirlo
 * todo de una vez es lo que hace que nadie registre nada el día del
 * accidente, que es justo cuando corre el plazo.
 *
 * La fecha por defecto es "ahora" pero es editable hacia atrás: un
 * accidente se suele registrar uno o dos días después.
 */
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { crearEvento, type TipoEvento } from '@/lib/acciones-eventos';

const TIPOS: { v: TipoEvento; t: string; d: string }[] = [
  { v: 'accidente', t: 'Accidente de trabajo', d: 'Hubo lesión. Reportable a la ARL en 2 días hábiles.' },
  { v: 'incidente', t: 'Incidente', d: 'Ocurrió el suceso pero no hubo lesión.' },
  { v: 'casi_accidente', t: 'Casi accidente', d: 'Estuvo a punto de ocurrir. Se investiga para prevenir.' },
  { v: 'enfermedad', t: 'Enfermedad laboral', d: 'Diagnosticada como de origen laboral.' },
];

function ahoraLocal(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export default function FormularioEvento({
  empleados,
  color,
}: {
  empleados: Array<{ id: string; nombres: string; identificacion: string; area: string | null }>;
  color: string;
}) {
  const router = useRouter();
  const [pendiente, startTransition] = useTransition();
  const [error, setError] = useState('');

  const [f, setF] = useState({
    tipo: 'accidente' as TipoEvento,
    empleadoId: '',
    fecha: ahoraLocal(),
    descripcion: '',
    lugar: '',
    parteCuerpo: '',
    mecanismo: '',
    grave: false,
    mortal: false,
  });

  const esAccidente = f.tipo === 'accidente' || f.tipo === 'enfermedad';

  function enviar(ev: React.FormEvent) {
    ev.preventDefault();
    setError('');
    startTransition(async () => {
      const r = await crearEvento({ ...f, empleadoId: f.empleadoId || null });
      if (!r.ok) {
        setError(r.mensaje);
        return;
      }
      router.push(`/panel/eventos/${r.id}`);
      router.refresh();
    });
  }

  return (
    <form onSubmit={enviar}>
      <div style={s.bloque}>
        <h2 style={s.h2}>Qué ocurrió</h2>

        <div style={s.tipos}>
          {TIPOS.map((t) => (
            <button
              type="button"
              key={t.v}
              onClick={() => setF({ ...f, tipo: t.v })}
              style={{
                ...s.tipo,
                ...(f.tipo === t.v
                  ? { borderColor: color, background: 'var(--superficie)', boxShadow: `0 0 0 1px ${color}` }
                  : {}),
              }}
            >
              <span style={{ ...s.tipoT, color: f.tipo === t.v ? color : 'var(--texto)' }}>{t.t}</span>
              <span style={s.tipoD}>{t.d}</span>
            </button>
          ))}
        </div>

        <label style={s.label}>Descripción de lo ocurrido *</label>
        <textarea
          value={f.descripcion}
          onChange={(e) => setF({ ...f, descripcion: e.target.value })}
          rows={4}
          style={{ ...s.input, resize: 'vertical' }}
          placeholder="Qué pasó, cómo y en qué circunstancias. Sin interpretaciones ni culpables: eso es el análisis, viene después."
        />

        <div style={s.fila}>
          <div style={{ flex: '1 1 200px' }}>
            <label style={s.label}>Fecha y hora del evento *</label>
            <input
              type="datetime-local"
              value={f.fecha}
              max={ahoraLocal()}
              onChange={(e) => setF({ ...f, fecha: e.target.value })}
              style={s.input}
            />
            <p style={s.ayuda}>El plazo de 15 días corre desde aquí, no desde hoy.</p>
          </div>
          <div style={{ flex: '1 1 200px' }}>
            <label style={s.label}>Lugar</label>
            <input
              value={f.lugar}
              onChange={(e) => setF({ ...f, lugar: e.target.value })}
              style={s.input}
              placeholder="Bodega 2, escalera de acceso…"
            />
          </div>
        </div>
      </div>

      <div style={s.bloque}>
        <h2 style={s.h2}>A quién le ocurrió</h2>

        <label style={s.label}>Trabajador</label>
        <select
          value={f.empleadoId}
          onChange={(e) => setF({ ...f, empleadoId: e.target.value })}
          style={s.input}
        >
          <option value="">— Sin trabajador identificado —</option>
          {empleados.map((e) => (
            <option key={e.id} value={e.id}>
              {e.nombres} · {e.identificacion}{e.area ? ` · ${e.area}` : ''}
            </option>
          ))}
        </select>
        <p style={s.ayuda}>
          Sus datos se copian al evento: si mañana se corrige la ficha, el registro
          conserva cómo estaba al ocurrir.
        </p>

        {esAccidente && (
          <>
            <div style={s.fila}>
              <div style={{ flex: '1 1 200px' }}>
                <label style={s.label}>Parte del cuerpo afectada</label>
                <input
                  value={f.parteCuerpo}
                  onChange={(e) => setF({ ...f, parteCuerpo: e.target.value })}
                  style={s.input}
                  placeholder="Rodilla derecha"
                />
              </div>
              <div style={{ flex: '1 1 200px' }}>
                <label style={s.label}>Mecanismo</label>
                <input
                  value={f.mecanismo}
                  onChange={(e) => setF({ ...f, mecanismo: e.target.value })}
                  style={s.input}
                  placeholder="Caída, golpe, atrapamiento…"
                />
              </div>
            </div>

            <div style={s.checks}>
              <label style={s.check}>
                <input
                  type="checkbox"
                  checked={f.grave}
                  onChange={(e) => setF({ ...f, grave: e.target.checked })}
                  style={s.casilla}
                />
                Accidente grave
              </label>
              <label style={s.check}>
                <input
                  type="checkbox"
                  checked={f.mortal}
                  onChange={(e) => setF({ ...f, mortal: e.target.checked, grave: e.target.checked || f.grave })}
                  style={s.casilla}
                />
                Accidente mortal
              </label>
            </div>

            {(f.grave || f.mortal) && (
              <div style={s.aviso}>
                Un accidente {f.mortal ? 'mortal' : 'grave'} se reporta a la{' '}
                <strong>ARL, la EPS y la Dirección Territorial del Ministerio del
                Trabajo</strong> dentro de los <strong>2 días hábiles</strong> siguientes.
              </div>
            )}
          </>
        )}
      </div>

      {error && <div style={s.error}>{error}</div>}

      <div style={s.acciones}>
        <button
          type="submit"
          disabled={pendiente}
          style={{ ...s.boton, background: pendiente ? 'var(--borde-fuerte)' : color }}
        >
          {pendiente ? 'Registrando…' : 'Registrar y continuar'}
        </button>
      </div>
    </form>
  );
}

const s: Record<string, React.CSSProperties> = {
  bloque: {
    background: 'var(--superficie)', border: '1px solid var(--borde)', borderRadius: 12,
    padding: '18px 20px', marginBottom: 14,
  },
  h2: { fontSize: 15, fontWeight: 700, color: 'var(--texto)', margin: '0 0 14px' },
  tipos: {
    display: 'grid', gap: 8, marginBottom: 16,
    gridTemplateColumns: 'repeat(auto-fit,minmax(210px,1fr))',
  },
  tipo: {
    textAlign: 'left', background: 'var(--fondo)', border: '1px solid var(--borde)',
    borderRadius: 8, padding: '10px 12px', cursor: 'pointer',
    display: 'flex', flexDirection: 'column', gap: 3,
  },
  tipoT: { fontSize: 13, fontWeight: 700 },
  tipoD: { fontSize: 11, color: 'var(--texto-suave)', lineHeight: 1.45 },
  label: { display: 'block', fontSize: 12.5, fontWeight: 600, margin: '12px 0 5px', color: 'var(--texto)' },
  input: {
    width: '100%', padding: '9px 11px', border: '1px solid var(--borde)',
    borderRadius: 8, fontSize: 13.5, boxSizing: 'border-box',
    fontFamily: 'inherit', background: 'var(--superficie)', color: 'var(--texto)',
  },
  ayuda: { fontSize: 11.5, color: 'var(--texto-suave)', margin: '5px 0 0', lineHeight: 1.5 },
  fila: { display: 'flex', gap: 12, flexWrap: 'wrap' },
  checks: { display: 'flex', gap: 20, marginTop: 14, flexWrap: 'wrap' },
  check: { display: 'flex', alignItems: 'center', fontSize: 13, cursor: 'pointer', color: 'var(--texto)' },
  casilla: { marginRight: 8, width: 15, height: 15 },
  aviso: {
    marginTop: 12, background: 'var(--mal-fondo)', border: '1px solid var(--mal)',
    color: 'var(--mal)', borderRadius: 8, padding: '10px 13px',
    fontSize: 12.5, lineHeight: 1.6,
  },
  error: {
    background: 'var(--mal-fondo)', color: 'var(--mal)', borderRadius: 8,
    padding: '10px 13px', fontSize: 13, marginBottom: 12,
  },
  acciones: { display: 'flex', justifyContent: 'flex-end' },
  boton: {
    color: 'var(--sobre-marca)', border: 'none', padding: '11px 26px', borderRadius: 8,
    fontSize: 14, fontWeight: 600, cursor: 'pointer',
  },
};
