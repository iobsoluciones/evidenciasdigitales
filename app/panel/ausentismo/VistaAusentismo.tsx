'use client';

/**
 * AUSENTISMO
 * ---------------------------------------------------------------
 * La pantalla separa los DÍAS POR CAUSA MÉDICA del total, porque son
 * dos números distintos y solo el primero entra al indicador del
 * art. 30. Las licencias de ley se registran igual —hacen falta para
 * planear el reemplazo— pero no inflan el indicador.
 *
 * Aquí NO se pide diagnóstico y no debe agregarse: la historia clínica
 * es reservada y la custodia el médico (Res. 2346 de 2007).
 */
import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  guardarAusencia, eliminarAusencia,
  type Ausencia, type ResumenAusentismo, type OrigenAusencia,
} from '@/lib/acciones-ausentismo';

const ORIGENES: { v: OrigenAusencia; t: string; medica: boolean }[] = [
  { v: 'enfermedad_general', t: 'Enfermedad general', medica: true },
  { v: 'accidente_trabajo', t: 'Accidente de trabajo', medica: true },
  { v: 'enfermedad_laboral', t: 'Enfermedad laboral', medica: true },
  { v: 'accidente_comun', t: 'Accidente común', medica: true },
  { v: 'licencia_maternidad', t: 'Licencia de maternidad', medica: false },
  { v: 'licencia_paternidad', t: 'Licencia de paternidad', medica: false },
  { v: 'licencia_luto', t: 'Licencia de luto', medica: false },
  { v: 'permiso_no_remunerado', t: 'Permiso no remunerado', medica: false },
  { v: 'otro', t: 'Otro', medica: false },
];

const VACIO = {
  id: undefined as string | undefined,
  empleadoId: '', origen: 'enfermedad_general' as OrigenAusencia,
  inicio: '', fin: '', prorroga: false,
  entidad: '', numero: '', eventoId: '', observaciones: '',
};

export default function VistaAusentismo({
  anio,
  items,
  resumen,
  empleados,
  eventos,
  color,
}: {
  anio: number;
  items: Ausencia[];
  resumen: ResumenAusentismo;
  empleados: Array<{ id: string; nombres: string; identificacion: string }>;
  eventos: Array<{ id: string; codigo: string; nombres: string | null }>;
  color: string;
}) {
  const router = useRouter();
  const [pendiente, startTransition] = useTransition();
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);
  const [form, setForm] = useState<typeof VACIO | null>(null);

  useEffect(() => {
    if (aviso?.tipo !== 'ok') return;
    const t = setTimeout(() => setAviso(null), 2600);
    return () => clearTimeout(t);
  }, [aviso]);

  const correr = (fn: () => Promise<{ ok: boolean; mensaje: string }>) => {
    setAviso(null);
    startTransition(async () => {
      const r = await fn();
      setAviso({ tipo: r.ok ? 'ok' : 'error', texto: r.mensaje });
      if (r.ok) router.refresh();
    });
  };

  const tasa = resumen.dias_programados > 0
    ? ((resumen.dias_medicos / resumen.dias_programados) * 100).toFixed(2)
    : null;

  const esMedica = ORIGENES.find((o) => o.v === form?.origen)?.medica ?? false;

  return (
    <>
      {aviso && (
        <div role="status" aria-live="polite" style={{
          ...s.aviso,
          background: aviso.tipo === 'ok' ? 'var(--bien-fondo)' : 'var(--mal-fondo)',
          color: aviso.tipo === 'ok' ? 'var(--bien)' : 'var(--mal)',
          border: `1px solid ${aviso.tipo === 'ok' ? 'var(--bien)' : 'var(--mal)'}`,
        }}>{aviso.texto}</div>
      )}

      <div style={s.resumen}>
        <div style={{ ...s.tarjeta, background: 'var(--superficie)', border: '1px solid var(--borde)' }}>
          <span style={{ ...s.tarjetaN, color: 'var(--marca-empresa)' }}>{resumen.dias_medicos}</span>
          <span style={s.tarjetaT}>Días por causa médica</span>
          <span style={s.tarjetaPie}>los que entran al indicador</span>
        </div>
        <div style={{ ...s.tarjeta, background: 'var(--superficie)', border: '1px solid var(--borde)' }}>
          <span style={s.tarjetaN}>{resumen.dias_totales}</span>
          <span style={s.tarjetaT}>Días de ausencia en total</span>
          <span style={s.tarjetaPie}>incluye licencias y permisos</span>
        </div>
        <div style={{ ...s.tarjeta, background: 'var(--superficie)', border: '1px solid var(--borde)' }}>
          <span style={s.tarjetaN}>{resumen.personas}</span>
          <span style={s.tarjetaT}>Personas ausentes</span>
          <span style={s.tarjetaPie}>{resumen.eventos} ausencia(s) registradas</span>
        </div>
        <div style={{ ...s.tarjeta, background: 'var(--fondo)' }}>
          <span style={{ ...s.tarjetaN, color: 'var(--marca-empresa)' }}>{tasa ? `${tasa}%` : '—'}</span>
          <span style={s.tarjetaT}>Ausentismo por causa médica</span>
          <span style={s.tarjetaPie}>
            {tasa
              ? `${resumen.dias_medicos} de ${resumen.dias_programados} días programados`
              : 'Faltan los días programados en horas-hombre'}
          </span>
        </div>
      </div>

      {resumen.por_origen.length > 0 && (
        <div style={s.origenes}>
          {resumen.por_origen.map((o) => {
            const def = ORIGENES.find((x) => x.v === o.origen);
            return (
              <div key={o.origen} style={s.origen}>
                <span style={s.origenNombre}>{def?.t ?? o.origen}</span>
                <span style={{ ...s.origenDias, color: 'var(--marca-empresa)' }}>{o.dias} días</span>
                <span style={s.origenMeta}>
                  {o.eventos} evento(s) · {def?.medica ? 'causa médica' : 'no cuenta al indicador'}
                </span>
              </div>
            );
          })}
        </div>
      )}

      <div style={s.barra}>
        <button type="button" style={{ ...s.botonLleno, background: 'var(--marca)' }}
          onClick={() => setForm({ ...VACIO })}>
          Registrar una ausencia
        </button>
        <a href="/panel/indicadores/legales" style={{ ...s.botonSec, textDecoration: 'none' }}>
          Ver los indicadores del art. 30
        </a>
      </div>

      {form && (
        <section style={s.bloque}>
          <div style={s.h3}>{form.id ? 'Editar la ausencia' : 'Nueva ausencia'}</div>
          <p style={s.nota}>
            No se registra el diagnóstico: la historia clínica es reservada y la
            custodia el médico. Con el origen y los días alcanza para el indicador.
          </p>

          <div style={s.fila}>
            <Campo etiqueta="Trabajador" ancho={250}>
              <select value={form.empleadoId} style={s.input}
                onChange={(e) => setForm({ ...form, empleadoId: e.target.value })}>
                <option value="">— Elige —</option>
                {empleados.map((x) => (
                  <option key={x.id} value={x.id}>{x.nombres} · {x.identificacion}</option>
                ))}
              </select>
            </Campo>
            <Campo etiqueta="Origen" ancho={210}
              ayuda={esMedica ? 'Cuenta en el indicador de ausentismo.' : 'No cuenta en el indicador.'}>
              <select value={form.origen} style={s.input}
                onChange={(e) => setForm({ ...form, origen: e.target.value as OrigenAusencia })}>
                {ORIGENES.map((o) => <option key={o.v} value={o.v}>{o.t}</option>)}
              </select>
            </Campo>
          </div>

          <div style={s.fila}>
            <Campo etiqueta="Desde" ancho={150}>
              <input type="date" value={form.inicio} style={s.input}
                onChange={(e) => setForm({ ...form, inicio: e.target.value })} />
            </Campo>
            <Campo etiqueta="Hasta" ancho={150}>
              <input type="date" value={form.fin} style={s.input}
                onChange={(e) => setForm({ ...form, fin: e.target.value })} />
            </Campo>
            <Campo etiqueta="Días" ancho={90}>
              <div style={{ ...s.calculado, color: 'var(--marca-empresa)' }}>
                {form.inicio && form.fin
                  ? Math.max(
                      0,
                      Math.round(
                        (new Date(form.fin + 'T12:00:00').getTime() -
                          new Date(form.inicio + 'T12:00:00').getTime()) / 86400000
                      ) + 1
                    )
                  : '—'}
              </div>
            </Campo>
            <Campo etiqueta="Entidad" ancho={160} ayuda="EPS o ARL que la expide.">
              <input value={form.entidad} style={s.input}
                onChange={(e) => setForm({ ...form, entidad: e.target.value })} />
            </Campo>
            <Campo etiqueta="N.º de incapacidad" ancho={160}>
              <input value={form.numero} style={s.input}
                onChange={(e) => setForm({ ...form, numero: e.target.value })} />
            </Campo>
          </div>

          {(form.origen === 'accidente_trabajo' || form.origen === 'enfermedad_laboral') && (
            <Campo etiqueta="Evento investigado" ancho={9999}
              ayuda="Enlázala con el accidente o la enfermedad ya registrada, para no contarlos dos veces.">
              <select value={form.eventoId} style={s.input}
                onChange={(e) => setForm({ ...form, eventoId: e.target.value })}>
                <option value="">— Sin enlazar —</option>
                {eventos.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.codigo}{x.nombres ? ` · ${x.nombres}` : ''}
                  </option>
                ))}
              </select>
            </Campo>
          )}

          <label style={s.check}>
            <input type="checkbox" checked={form.prorroga}
              onChange={(e) => setForm({ ...form, prorroga: e.target.checked })} />
            Es prórroga de una incapacidad anterior
          </label>

          <Campo etiqueta="Observaciones" ancho={9999}>
            <textarea rows={2} value={form.observaciones}
              style={{ ...s.input, resize: 'vertical' }}
              onChange={(e) => setForm({ ...form, observaciones: e.target.value })} />
          </Campo>

          <div style={s.acciones}>
            <button type="button" style={s.botonPlano} onClick={() => setForm(null)}>
              Cancelar
            </button>
            <button type="button" disabled={pendiente}
              style={{ ...s.botonLleno, background: 'var(--marca)' }}
              onClick={() => {
                correr(() => guardarAusencia(form));
                setForm(null);
              }}>
              Guardar
            </button>
          </div>
        </section>
      )}

      {items.length === 0 ? (
        <div style={s.bloque}>
          <p style={s.nota}>
            No hay ausencias registradas en {anio}. Sin ellas, el indicador de
            ausentismo del artículo 30 no se puede calcular: se quedaría contando
            solo las incapacidades por accidente, que son una fracción.
          </p>
        </div>
      ) : (
        <div style={s.contenedor}>
          <table style={s.tabla}>
            <thead>
              <tr>
                <th style={{ ...s.th, textAlign: 'left' }}>Trabajador</th>
                <th style={{ ...s.th, textAlign: 'left' }}>Origen</th>
                <th style={s.th}>Desde</th>
                <th style={s.th}>Hasta</th>
                <th style={s.th}>Días</th>
                <th style={s.th}></th>
              </tr>
            </thead>
            <tbody>
              {items.map((a) => {
                const def = ORIGENES.find((o) => o.v === a.origen);
                return (
                  <tr key={a.id}>
                    <td style={s.tdNombre}>
                      <div style={s.nombre}>{a.nombres}</div>
                      {a.area && <div style={s.meta}>{a.area}</div>}
                    </td>
                    <td style={s.td}>
                      <span style={{
                        ...s.chip,
                        background: a.causa_medica ? 'var(--superficie-3)' : 'var(--superficie-3)',
                        color: a.causa_medica ? 'var(--texto-suave)' : 'var(--texto-tenue)',
                      }}>
                        {def?.t ?? a.origen}
                      </span>
                      {a.prorroga && <span style={s.prorroga}>prórroga</span>}
                      {a.evento_codigo && (
                        <div style={s.meta}>Evento {a.evento_codigo}</div>
                      )}
                      {a.entidad && <div style={s.meta}>{a.entidad}</div>}
                    </td>
                    <td style={{ ...s.td, textAlign: 'center', whiteSpace: 'nowrap' }}>
                      {new Date(a.fecha_inicio + 'T12:00:00').toLocaleDateString('es-CO', {
                        day: '2-digit', month: '2-digit', year: '2-digit',
                      })}
                    </td>
                    <td style={{ ...s.td, textAlign: 'center', whiteSpace: 'nowrap' }}>
                      {new Date(a.fecha_fin + 'T12:00:00').toLocaleDateString('es-CO', {
                        day: '2-digit', month: '2-digit', year: '2-digit',
                      })}
                    </td>
                    <td style={{ ...s.td, textAlign: 'center', fontWeight: 700 }}>
                      {a.dias}
                    </td>
                    <td style={{ ...s.td, textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button type="button" style={s.botonMini}
                        onClick={() => setForm({
                          id: a.id, empleadoId: a.empleado_id, origen: a.origen,
                          inicio: a.fecha_inicio, fin: a.fecha_fin,
                          prorroga: a.prorroga, entidad: a.entidad ?? '',
                          numero: a.numero_incapacidad ?? '',
                          eventoId: a.evento_id ?? '',
                          observaciones: a.observaciones ?? '',
                        })}>
                        Editar
                      </button>
                      <button type="button" disabled={pendiente}
                        style={{ ...s.botonMini, color: 'var(--mal)', marginLeft: 4 }}
                        onClick={() => correr(() => eliminarAusencia(a.id))}>
                        Quitar
                      </button>
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

function Campo({
  etiqueta, ayuda, ancho = 170, children,
}: {
  etiqueta: string; ayuda?: string; ancho?: number; children: React.ReactNode;
}) {
  return (
    <div style={{ flex: `1 1 ${ancho}px`, marginBottom: 10 }}>
      <label style={s.label}>{etiqueta}</label>
      {children}
      {ayuda && <p style={s.ayuda}>{ayuda}</p>}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  aviso: {
    position: 'fixed', right: 18, bottom: 18, zIndex: 60, maxWidth: 340,
    padding: '11px 15px', borderRadius: 8, fontSize: 13,
    boxShadow: '0 6px 20px rgba(20,38,63,.16)',
  },

  resumen: {
    display: 'grid', gap: 10, marginBottom: 12,
    gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))',
  },
  tarjeta: {
    borderRadius: 8, padding: '12px 14px',
    display: 'flex', flexDirection: 'column', gap: 2,
  },
  tarjetaN: {
    fontSize: 24, fontWeight: 700, lineHeight: 1.1,
    color: 'var(--texto)', fontVariantNumeric: 'tabular-nums',
  },
  tarjetaT: { fontSize: 12, color: 'var(--texto-suave)' },
  tarjetaPie: { fontSize: 11, color: 'var(--texto-tenue)', lineHeight: 1.4 },

  origenes: {
    display: 'grid', gap: 8, marginBottom: 16,
    gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))',
  },
  origen: {
    background: 'var(--superficie)', border: '1px solid var(--borde)', borderRadius: 8,
    padding: '9px 12px', display: 'flex', flexDirection: 'column', gap: 1,
  },
  origenNombre: { fontSize: 12, color: 'var(--texto)', fontWeight: 600 },
  origenDias: { fontSize: 16, fontWeight: 700, fontVariantNumeric: 'tabular-nums' },
  origenMeta: { fontSize: 10.5, color: 'var(--texto-tenue)' },

  barra: { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 },
  bloque: {
    background: 'var(--superficie)', border: '1px solid var(--borde)', borderRadius: 12,
    padding: '15px 17px', marginBottom: 14,
  },
  h3: { fontSize: 14, fontWeight: 700, color: 'var(--texto)', marginBottom: 10 },
  nota: { fontSize: 12.5, color: 'var(--texto-suave)', lineHeight: 1.65, margin: '0 0 12px', maxWidth: 640 },
  fila: { display: 'flex', gap: 12, flexWrap: 'wrap' },
  label: { display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5, color: 'var(--texto)' },
  input: {
    width: '100%', padding: '8px 11px', border: '1px solid var(--borde)',
    borderRadius: 8, fontSize: 13, boxSizing: 'border-box',
    fontFamily: 'inherit', background: 'var(--superficie)', color: 'var(--texto)',
  },
  calculado: {
    padding: '8px 11px', border: '1px solid #EDEDE8', borderRadius: 8,
    fontSize: 15, fontWeight: 700, background: 'var(--superficie-2)', textAlign: 'center',
    fontVariantNumeric: 'tabular-nums',
  },
  ayuda: { fontSize: 11.5, color: 'var(--texto-tenue)', margin: '4px 0 0', lineHeight: 1.5 },
  check: {
    display: 'flex', alignItems: 'center', gap: 8,
    fontSize: 13, color: 'var(--texto)', cursor: 'pointer', margin: '2px 0 10px',
  },

  contenedor: {
    background: 'var(--superficie)', border: '1px solid var(--borde)',
    borderRadius: 12, overflowX: 'auto',
  },
  tabla: { width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 720 },
  th: {
    textAlign: 'center', padding: '10px', background: 'var(--fondo)', color: 'var(--texto-suave)',
    fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: .4,
    borderBottom: '1px solid var(--borde)', whiteSpace: 'nowrap',
  },
  td: { padding: '10px', borderBottom: '1px solid var(--superficie-3)', verticalAlign: 'top' },
  tdNombre: { padding: '10px 12px', borderBottom: '1px solid var(--superficie-3)', minWidth: 180 },
  nombre: { fontSize: 13, fontWeight: 600, color: 'var(--texto)' },
  meta: { fontSize: 11, color: 'var(--texto-tenue)', marginTop: 2 },
  chip: {
    fontSize: 11, fontWeight: 600, padding: '3px 9px',
    borderRadius: 20, whiteSpace: 'nowrap', display: 'inline-block',
  },
  prorroga: {
    fontSize: 10, fontWeight: 700, color: 'var(--aviso)',
    background: 'var(--ambar-fondo)', padding: '2px 7px', borderRadius: 4, marginLeft: 5,
  },

  acciones: { display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 10 },
  botonPlano: {
    background: 'none', border: 'none', color: 'var(--texto-suave)',
    fontSize: 12.5, fontWeight: 600, cursor: 'pointer', padding: '8px 12px',
  },
  botonSec: {
    background: 'var(--superficie)', border: '1px solid var(--borde)', borderRadius: 8,
    padding: '9px 16px', fontSize: 13, fontWeight: 600,
    color: 'var(--texto)', cursor: 'pointer',
  },
  botonLleno: {
    color: 'var(--sobre-marca)', border: 'none', padding: '9px 20px', borderRadius: 8,
    fontSize: 13, fontWeight: 600, cursor: 'pointer',
  },
  botonMini: {
    background: 'var(--superficie)', border: '1px solid var(--borde)', borderRadius: 7,
    padding: '5px 11px', fontSize: 11.5, fontWeight: 600,
    color: 'var(--texto)', cursor: 'pointer', whiteSpace: 'nowrap',
  },
};
