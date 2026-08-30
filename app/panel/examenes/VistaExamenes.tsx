'use client';

/**
 * EXÁMENES MÉDICOS OCUPACIONALES
 * ---------------------------------------------------------------
 * La lista es de TRABAJADORES, no de exámenes. Un listado de exámenes
 * muestra lo que existe; lo que hace falta saber es a quién le falta,
 * y ese es justo el que no aparecería.
 *
 * Por eso el orden es por urgencia: sin examen, vencidos, por vencer y
 * al día. Y por eso la fila de quien no tiene ninguno se ve distinta.
 *
 * RESERVA MÉDICA: aquí no se escribe ningún diagnóstico. Solo el
 * concepto de aptitud y las restricciones, que es lo que la empresa
 * necesita para no reubicar mal a alguien.
 */
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  guardarExamen, eliminarExamen,
  type FilaExamen, type TipoExamen, type Concepto,
} from '@/lib/acciones-examenes';

const TIPOS: { v: TipoExamen; t: string }[] = [
  { v: 'ingreso', t: 'De ingreso' },
  { v: 'periodico', t: 'Periódico' },
  { v: 'retiro', t: 'De egreso' },
  { v: 'post_incapacidad', t: 'Post incapacidad' },
  { v: 'reubicacion', t: 'Por reubicación' },
];

const CONCEPTOS: { v: Concepto; t: string; fondo: string; color: string }[] = [
  { v: 'apto', t: 'Apto', fondo: '#E6F4EA', color: '#1E6B3A' },
  { v: 'apto_con_restricciones', t: 'Apto con restricciones', fondo: '#FFF7ED', color: '#9A3412' },
  { v: 'no_apto', t: 'No apto', fondo: '#FDF2F2', color: '#9B1C1C' },
  { v: 'aplazado', t: 'Aplazado', fondo: '#F0F0EC', color: '#5B6470' },
];

const VACIO = {
  id: undefined as string | undefined,
  empleadoId: '',
  tipo: 'periodico' as TipoExamen,
  fecha: new Date().toISOString().slice(0, 10),
  fechaVence: '',
  concepto: 'apto' as Concepto,
  entidad: '',
  medico: '',
  licencia: '',
  restricciones: '',
  recomendaciones: '',
};

const fmt = (d: string | null) =>
  d ? new Date(d + 'T12:00:00').toLocaleDateString('es-CO', {
    day: '2-digit', month: 'short', year: 'numeric',
  }) : '—';

export default function VistaExamenes({
  filas,
  color,
}: {
  filas: FilaExamen[];
  color: string;
}) {
  const router = useRouter();
  const [pendiente, startTransition] = useTransition();
  const [buscar, setBuscar] = useState('');
  const [form, setForm] = useState<typeof VACIO | null>(null);
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);
  const [hecho, setHecho] = useState(false);

  const sinExamen = filas.filter((f) => f.sin_examen).length;
  const vencidos = filas.filter((f) => f.vencido).length;
  const porVencer = filas.filter(
    (f) => !f.vencido && f.dias_para_vencer !== null && f.dias_para_vencer <= 60
  ).length;
  const restringidos = filas.filter((f) => f.concepto === 'apto_con_restricciones').length;

  const q = buscar.trim().toLowerCase();
  const lista = filas.filter(
    (f) => !q ||
      f.nombres.toLowerCase().includes(q) ||
      f.identificacion.includes(q) ||
      (f.area ?? '').toLowerCase().includes(q)
  );

  function abrir(f: FilaExamen) {
    setAviso(null);
    setForm({ ...VACIO, empleadoId: f.empleado_id });
  }

  function guardar() {
    if (!form) return;
    setAviso(null);
    startTransition(async () => {
      const r = await guardarExamen(form);
      setAviso({ tipo: r.ok ? 'ok' : 'error', texto: r.mensaje });
      if (r.ok) {
        setHecho(true);
        setTimeout(() => setHecho(false), 2600);
        setForm(null);
        router.refresh();
      }
    });
  }

  function borrar(id: string) {
    startTransition(async () => {
      const r = await eliminarExamen(id);
      setAviso({ tipo: r.ok ? 'ok' : 'error', texto: r.mensaje });
      if (r.ok) router.refresh();
    });
  }

  const nombreDe = (id: string) => filas.find((f) => f.empleado_id === id)?.nombres ?? '';

  return (
    <>
      <div style={s.tarjetas}>
        <Tarjeta n={sinExamen} t="Sin ningún examen" c={sinExamen ? '#9B1C1C' : color} />
        <Tarjeta n={vencidos} t="Vencidos" c={vencidos ? '#9B1C1C' : color} />
        <Tarjeta n={porVencer} t="Vencen en 60 días" c={porVencer ? '#9A3412' : color} />
        <Tarjeta n={restringidos} t="Con restricciones médicas" c={restringidos ? '#9A3412' : color} />
      </div>

      {restringidos > 0 && (
        <div style={s.restricciones}>
          <strong>{restringidos} trabajador(es) con restricciones médicas vigentes.</strong>{' '}
          Revísalas antes de convocar a una capacitación práctica o de entregar
          dotación: es la información que evita una reubicación equivocada.
        </div>
      )}

      <div style={s.controles}>
        <input
          value={buscar}
          onChange={(e) => setBuscar(e.target.value)}
          placeholder="Buscar por nombre, documento o área"
          style={s.buscador}
        />
      </div>

      {aviso && (
        <div style={{
          ...s.aviso,
          background: aviso.tipo === 'ok' ? '#E6F4EA' : '#FDF2F2',
          color: aviso.tipo === 'ok' ? '#1E6B3A' : '#9B1C1C',
        }}>
          {aviso.texto}
        </div>
      )}

      {/* ---------- Formulario ---------- */}
      {form && (
        <section style={s.form}>
          <div style={s.formTitulo}>
            Nuevo examen — {nombreDe(form.empleadoId)}
          </div>
          <p style={s.nota}>
            No escribas diagnósticos. La historia clínica es reservada y la custodia
            el médico: aquí va el <strong>concepto de aptitud</strong> y, si aplica,
            <strong> qué no puede hacer</strong> la persona.
          </p>

          <div style={s.fila}>
            <Campo etiqueta="Tipo">
              <select
                value={form.tipo}
                onChange={(e) => setForm({ ...form, tipo: e.target.value as TipoExamen })}
                style={s.input}
              >
                {TIPOS.map((t) => <option key={t.v} value={t.v}>{t.t}</option>)}
              </select>
            </Campo>
            <Campo etiqueta="Fecha del examen">
              <input
                type="date"
                value={form.fecha}
                max={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setForm({ ...form, fecha: e.target.value })}
                style={s.input}
              />
            </Campo>
            <Campo etiqueta="Vence el" ayuda="Déjalo vacío si no vence.">
              <input
                type="date"
                value={form.fechaVence}
                onChange={(e) => setForm({ ...form, fechaVence: e.target.value })}
                style={s.input}
              />
            </Campo>
          </div>

          <div style={s.fila}>
            <Campo etiqueta="Concepto de aptitud">
              <select
                value={form.concepto}
                onChange={(e) => setForm({ ...form, concepto: e.target.value as Concepto })}
                style={s.input}
              >
                {CONCEPTOS.map((c) => <option key={c.v} value={c.v}>{c.t}</option>)}
              </select>
            </Campo>
            <Campo etiqueta="Entidad o IPS">
              <input
                value={form.entidad}
                onChange={(e) => setForm({ ...form, entidad: e.target.value })}
                style={s.input}
              />
            </Campo>
          </div>

          <div style={s.fila}>
            <Campo etiqueta="Médico evaluador">
              <input
                value={form.medico}
                onChange={(e) => setForm({ ...form, medico: e.target.value })}
                style={s.input}
              />
            </Campo>
            <Campo etiqueta="Licencia SST del médico">
              <input
                value={form.licencia}
                onChange={(e) => setForm({ ...form, licencia: e.target.value })}
                style={s.input}
              />
            </Campo>
          </div>

          {form.concepto === 'apto_con_restricciones' && (
            <Campo etiqueta="Restricciones" ayuda="Qué no puede hacer. Obligatorio con este concepto.">
              <textarea
                value={form.restricciones}
                onChange={(e) => setForm({ ...form, restricciones: e.target.value })}
                rows={2}
                style={{ ...s.input, resize: 'vertical' }}
                placeholder="No manipular cargas superiores a 10 kg…"
              />
            </Campo>
          )}

          <Campo etiqueta="Recomendaciones">
            <textarea
              value={form.recomendaciones}
              onChange={(e) => setForm({ ...form, recomendaciones: e.target.value })}
              rows={2}
              style={{ ...s.input, resize: 'vertical' }}
            />
          </Campo>

          <div style={s.acciones}>
            <button onClick={() => setForm(null)} style={s.botonPlano} type="button">
              Cancelar
            </button>
            <button
              onClick={guardar}
              disabled={pendiente}
              style={{ ...s.botonLleno, background: hecho ? '#1E6B3A' : pendiente ? '#cbd5e1' : color }}
              type="button"
            >
              {hecho ? '✓ Guardado' : pendiente ? 'Guardando…' : 'Guardar examen'}
            </button>
          </div>
        </section>
      )}

      {/* ---------- Listado ---------- */}
      <div style={s.contenedor}>
        <table style={s.tabla}>
          <thead>
            <tr>
              {['Trabajador', 'Último examen', 'Concepto', 'Vence', 'Estado', ''].map((h, i) => (
                <th key={i} style={s.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lista.map((f) => {
              const c = CONCEPTOS.find((x) => x.v === f.concepto);
              return (
                <tr key={f.empleado_id} style={f.sin_examen ? s.filaSin : undefined}>
                  <td style={s.td}>
                    <strong>{f.nombres}</strong>
                    <div style={s.meta}>{f.identificacion}{f.area ? ` · ${f.area}` : ''}</div>
                  </td>
                  <td style={s.td}>
                    {f.sin_examen ? '—' : `${TIPOS.find((t) => t.v === f.tipo)?.t ?? f.tipo}`}
                    {!f.sin_examen && <div style={s.meta}>{fmt(f.fecha)}</div>}
                  </td>
                  <td style={s.td}>
                    {c ? (
                      <span style={{ ...s.chip, background: c.fondo, color: c.color }}>{c.t}</span>
                    ) : '—'}
                    {f.restricciones && <div style={s.restr}>{f.restricciones}</div>}
                  </td>
                  <td style={s.td}>{fmt(f.fecha_vence)}</td>
                  <td style={s.td}>
                    {f.sin_examen ? (
                      <span style={{ ...s.chip, background: '#FDF2F2', color: '#9B1C1C' }}>
                        Sin examen
                      </span>
                    ) : f.vencido ? (
                      <span style={{ ...s.chip, background: '#FDF2F2', color: '#9B1C1C' }}>
                        Vencido
                      </span>
                    ) : f.dias_para_vencer !== null && f.dias_para_vencer <= 60 ? (
                      <span style={{ ...s.chip, background: '#FFF7ED', color: '#9A3412' }}>
                        Faltan {f.dias_para_vencer} d
                      </span>
                    ) : (
                      <span style={{ ...s.chip, background: '#E6F4EA', color: '#1E6B3A' }}>
                        Al día
                      </span>
                    )}
                  </td>
                  <td style={s.td}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button onClick={() => abrir(f)} style={s.botonMini} type="button">
                        Registrar
                      </button>
                      {f.examen_id && (
                        <button
                          onClick={() => borrar(f.examen_id!)}
                          style={{ ...s.botonMini, color: '#9B1C1C' }}
                          type="button"
                        >
                          Borrar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Tarjeta({ n, t, c }: { n: number; t: string; c: string }) {
  return (
    <div style={s.tarjeta}>
      <span style={{ ...s.tarjetaN, color: c }}>{n}</span>
      <span style={s.tarjetaT}>{t}</span>
    </div>
  );
}

function Campo({
  etiqueta, ayuda, children,
}: {
  etiqueta: string; ayuda?: string; children: React.ReactNode;
}) {
  return (
    <div style={{ flex: '1 1 180px', marginBottom: 10 }}>
      <label style={s.label}>{etiqueta}</label>
      {children}
      {ayuda && <p style={s.ayuda}>{ayuda}</p>}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  tarjetas: {
    display: 'grid', gap: 10, marginBottom: 14,
    gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))',
  },
  tarjeta: {
    background: '#fff', border: '1px solid #E4E4DF', borderRadius: 10,
    padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 2,
  },
  tarjetaN: { fontSize: 24, fontWeight: 700, lineHeight: 1.1, fontVariantNumeric: 'tabular-nums' },
  tarjetaT: { fontSize: 11.5, color: '#5B6470', lineHeight: 1.4 },

  restricciones: {
    background: '#FFF7ED', border: '1px solid #FED7AA', color: '#7C2D12',
    borderRadius: 9, padding: '11px 14px', fontSize: 12.5,
    lineHeight: 1.6, marginBottom: 14,
  },
  controles: { display: 'flex', gap: 10, marginBottom: 14 },
  buscador: {
    flex: '1 1 240px', padding: '9px 12px', border: '1px solid #E4E4DF',
    borderRadius: 8, fontSize: 13.5, boxSizing: 'border-box',
  },
  aviso: { padding: '10px 13px', borderRadius: 8, fontSize: 13, marginBottom: 14 },

  form: {
    background: '#fff', border: '1px solid #E4E4DF', borderRadius: 12,
    padding: '16px 18px', marginBottom: 16,
  },
  formTitulo: { fontSize: 15, fontWeight: 700, color: '#14263F', marginBottom: 6 },
  nota: { fontSize: 12.5, color: '#5B6470', lineHeight: 1.6, margin: '0 0 12px' },
  fila: { display: 'flex', gap: 12, flexWrap: 'wrap' },
  label: { display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5, color: '#14263F' },
  input: {
    width: '100%', padding: '8px 11px', border: '1px solid #E4E4DF',
    borderRadius: 8, fontSize: 13, boxSizing: 'border-box',
    fontFamily: 'inherit', background: '#fff', color: '#14263F',
  },
  ayuda: { fontSize: 11, color: '#8A929C', margin: '4px 0 0' },
  acciones: { display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 10 },
  botonPlano: {
    background: 'none', border: 'none', color: '#5B6470',
    fontSize: 12.5, fontWeight: 600, cursor: 'pointer', padding: '8px 12px',
  },
  botonLleno: {
    color: '#fff', border: 'none', padding: '9px 20px', borderRadius: 8,
    fontSize: 13, fontWeight: 600, cursor: 'pointer',
  },

  contenedor: {
    background: '#fff', border: '1px solid #E4E4DF', borderRadius: 10, overflowX: 'auto',
  },
  tabla: { width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 760 },
  th: {
    textAlign: 'left', padding: '10px 12px', background: '#F7F7F4', color: '#5B6470',
    fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: .4,
    borderBottom: '1px solid #E4E4DF', whiteSpace: 'nowrap',
  },
  td: { padding: '10px 12px', borderBottom: '1px solid #F0F0EC', verticalAlign: 'top' },
  filaSin: { background: '#FFFBFA' },
  meta: { fontSize: 11, color: '#8A929C', marginTop: 2 },
  restr: { fontSize: 11, color: '#9A3412', marginTop: 4, lineHeight: 1.45, maxWidth: 220 },
  chip: {
    display: 'inline-block', padding: '3px 9px', borderRadius: 20,
    fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap',
  },
  botonMini: {
    background: '#fff', border: '1px solid #E4E4DF', borderRadius: 7,
    padding: '5px 11px', fontSize: 11.5, fontWeight: 600,
    color: '#14263F', cursor: 'pointer', whiteSpace: 'nowrap',
  },
};
