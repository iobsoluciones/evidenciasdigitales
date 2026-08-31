'use client';

/**
 * FICHA DEL CONTRATISTA
 * ---------------------------------------------------------------
 * Tres partes: los datos del contrato, los soportes que hay que
 * exigirle —cada uno con SU VIGENCIA— y quiénes entran a planta.
 *
 * Aprobar con un requisito de norma pendiente está bloqueado: si la
 * evaluación se puede firmar con documentos faltantes, la evaluación no
 * significa nada. Se puede aprobar CON CONDICIONES dejando por escrito
 * cuáles, que es la salida honesta.
 */
import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  guardarContratista, responderRequisito, guardarPersona, eliminarPersona,
  type Contratista, type RequisitoContratista, type PersonaContratista,
  type Concepto, type EstadoContratista, type EstadoRequisito,
} from '@/lib/acciones-contratistas';

const RIESGOS = [
  { v: 1, t: 'I — mínimo' }, { v: 2, t: 'II — bajo' }, { v: 3, t: 'III — medio' },
  { v: 4, t: 'IV — alto' }, { v: 5, t: 'V — máximo' },
];

const CONCEPTOS: { v: Concepto; t: string; fondo: string; color: string }[] = [
  { v: 'sin_evaluar', t: 'Sin evaluar', fondo: '#F0F0EC', color: '#5B6470' },
  { v: 'aprobado', t: 'Aprobado', fondo: '#E6F4EA', color: '#1E6B3A' },
  { v: 'aprobado_con_condiciones', t: 'Con condiciones', fondo: '#FEF3C7', color: '#92400E' },
  { v: 'rechazado', t: 'Rechazado', fondo: '#FDF2F2', color: '#9B1C1C' },
];

const ESTADOS: { v: EstadoContratista; t: string }[] = [
  { v: 'activo', t: 'Activo' },
  { v: 'suspendido', t: 'Suspendido' },
  { v: 'terminado', t: 'Terminado' },
];

const VACIO_PERSONA = {
  id: undefined as string | undefined,
  nombre: '', identificacion: '', cargo: '', arl: '',
  examenVence: '', induccion: false, fechaInduccion: '', observaciones: '',
};

export default function EditorContratista({
  contratista,
  requisitos,
  personal,
  color,
}: {
  contratista: Contratista;
  requisitos: RequisitoContratista[];
  personal: PersonaContratista[];
  color: string;
}) {
  const router = useRouter();
  const [pendiente, startTransition] = useTransition();
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);
  const [hecho, setHecho] = useState(false);
  const [editandoReq, setEditandoReq] = useState<{
    id: string; texto: string; estado: EstadoRequisito;
    vence: string; observacion: string;
  } | null>(null);
  const [formP, setFormP] = useState<typeof VACIO_PERSONA | null>(null);

  const [form, setForm] = useState({
    nombre: contratista.nombre,
    objeto: contratista.objeto,
    nit: contratista.nit ?? '',
    actividad: contratista.actividad ?? '',
    arl: contratista.arl ?? '',
    claseRiesgo: contratista.clase_riesgo,
    contacto: contratista.contacto ?? '',
    telefono: contratista.telefono ?? '',
    correo: contratista.correo ?? '',
    inicio: contratista.fecha_inicio ?? '',
    fin: contratista.fecha_fin ?? '',
    estado: contratista.estado,
    concepto: contratista.concepto,
    fechaEvaluacion: contratista.fecha_evaluacion ?? '',
    observaciones: contratista.observaciones ?? '',
  });

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

  function guardar() {
    setAviso(null);
    startTransition(async () => {
      const r = await guardarContratista(contratista.id, form);
      setAviso({ tipo: r.ok ? 'ok' : 'error', texto: r.mensaje });
      if (r.ok) {
        setHecho(true);
        setTimeout(() => setHecho(false), 2600);
        router.refresh();
      }
    });
  }

  const pendientes = requisitos.filter((r) => r.obligatorio && r.estado === 'pendiente').length;
  const vencidos = requisitos.filter((r) => r.vencido).length;
  const conc = CONCEPTOS.find((c) => c.v === form.concepto)!;

  return (
    <>
      {aviso && (
        <div role="status" aria-live="polite" style={{
          ...s.aviso,
          background: aviso.tipo === 'ok' ? '#E6F4EA' : '#FDF2F2',
          color: aviso.tipo === 'ok' ? '#1E6B3A' : '#9B1C1C',
          border: `1px solid ${aviso.tipo === 'ok' ? '#BFE3CB' : '#F3C7C7'}`,
        }}>{aviso.texto}</div>
      )}

      {(pendientes > 0 || vencidos > 0) && contratista.estado === 'activo' && (
        <div style={s.alerta}>
          {pendientes > 0 && (
            <>Faltan <strong>{pendientes}</strong> soporte(s) que exige la norma. </>
          )}
          {vencidos > 0 && (
            <><strong>{vencidos}</strong> soporte(s) entregados ya vencieron: pídelos otra vez. </>
          )}
          Mientras tanto este contratista no debería estar trabajando.
        </div>
      )}

      {/* ---------- Datos del contrato ---------- */}
      <section style={s.bloque}>
        <div style={s.h3}>El contrato</div>
        <div style={s.fila}>
          <Campo etiqueta="Razón social" ancho={240}>
            <input value={form.nombre} style={s.input}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
          </Campo>
          <Campo etiqueta="NIT" ancho={140}>
            <input value={form.nit} style={s.input}
              onChange={(e) => setForm({ ...form, nit: e.target.value })} />
          </Campo>
          <Campo etiqueta="ARL" ancho={150}>
            <input value={form.arl} style={s.input}
              onChange={(e) => setForm({ ...form, arl: e.target.value })} />
          </Campo>
          <Campo etiqueta="Clase de riesgo" ancho={150}>
            <select value={form.claseRiesgo ?? ''} style={s.input}
              onChange={(e) => setForm({
                ...form, claseRiesgo: e.target.value ? Number(e.target.value) : null,
              })}>
              <option value="">—</option>
              {RIESGOS.map((r) => <option key={r.v} value={r.v}>{r.t}</option>)}
            </select>
          </Campo>
        </div>

        <Campo etiqueta="Qué se contrató" ancho={9999}>
          <input value={form.objeto} style={s.input}
            onChange={(e) => setForm({ ...form, objeto: e.target.value })} />
        </Campo>
        <Campo etiqueta="Actividad económica" ancho={9999}>
          <input value={form.actividad} style={s.input}
            onChange={(e) => setForm({ ...form, actividad: e.target.value })} />
        </Campo>

        <div style={s.fila}>
          <Campo etiqueta="Contacto" ancho={180}>
            <input value={form.contacto} style={s.input}
              onChange={(e) => setForm({ ...form, contacto: e.target.value })} />
          </Campo>
          <Campo etiqueta="Teléfono" ancho={150}>
            <input value={form.telefono} style={s.input}
              onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
          </Campo>
          <Campo etiqueta="Correo" ancho={200}>
            <input value={form.correo} type="email" style={s.input}
              onChange={(e) => setForm({ ...form, correo: e.target.value })} />
          </Campo>
        </div>

        <div style={s.fila}>
          <Campo etiqueta="Inicio" ancho={150}>
            <input type="date" value={form.inicio} style={s.input}
              onChange={(e) => setForm({ ...form, inicio: e.target.value })} />
          </Campo>
          <Campo etiqueta="Fin" ancho={150}>
            <input type="date" value={form.fin} style={s.input}
              onChange={(e) => setForm({ ...form, fin: e.target.value })} />
          </Campo>
          <Campo etiqueta="Estado" ancho={150}>
            <select value={form.estado} style={s.input}
              onChange={(e) => setForm({
                ...form, estado: e.target.value as EstadoContratista,
              })}>
              {ESTADOS.map((x) => <option key={x.v} value={x.v}>{x.t}</option>)}
            </select>
          </Campo>
        </div>

        <div style={s.subtitulo}>Concepto de la evaluación</div>
        <div style={s.opciones}>
          {CONCEPTOS.map((c) => (
            <button key={c.v} type="button"
              onClick={() => setForm({ ...form, concepto: c.v })}
              style={{
                ...s.opcion,
                ...(form.concepto === c.v
                  ? { background: c.fondo, color: c.color, borderColor: c.color, fontWeight: 700 }
                  : {}),
              }}>
              {c.t}
            </button>
          ))}
        </div>

        <div style={s.fila}>
          <Campo etiqueta="Fecha de la evaluación" ancho={180}>
            <input type="date" value={form.fechaEvaluacion} style={s.input}
              onChange={(e) => setForm({ ...form, fechaEvaluacion: e.target.value })} />
          </Campo>
        </div>
        <Campo etiqueta="Observaciones" ancho={9999}
          ayuda={
            conc.v === 'aprobado_con_condiciones' || conc.v === 'rechazado'
              ? 'Obligatorio con este concepto: sin motivo escrito no sirve de soporte.'
              : undefined
          }>
          <textarea rows={2} value={form.observaciones}
            style={{ ...s.input, resize: 'vertical' }}
            onChange={(e) => setForm({ ...form, observaciones: e.target.value })} />
        </Campo>

        <div style={s.acciones}>
          <button type="button" onClick={guardar} disabled={pendiente}
            style={{
              ...s.botonLleno,
              background: hecho ? '#1E6B3A' : pendiente ? '#cbd5e1' : color,
            }}>
            {hecho ? '✓ Guardado' : pendiente ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </section>

      {/* ---------- Soportes ---------- */}
      <section style={s.bloque}>
        <div style={s.h3}>
          Soportes exigidos
          {(pendientes > 0 || vencidos > 0) && (
            <span style={s.contador}>
              {pendientes > 0 && `${pendientes} de norma sin entregar`}
              {pendientes > 0 && vencidos > 0 && ' · '}
              {vencidos > 0 && `${vencidos} vencido(s)`}
            </span>
          )}
        </div>
        <p style={s.nota}>
          Al marcar un soporte como entregado, pon <strong>hasta cuándo vale</strong>.
          Sin vigencia, un documento entregado una vez parece válido para siempre.
        </p>

        {requisitos.map((r) => (
          <div key={r.id} style={s.requisito}>
            <div style={s.reqCab}>
              <span style={{
                ...s.etiqueta,
                background: r.obligatorio ? '#FDF2F2' : '#F0F0EC',
                color: r.obligatorio ? '#9B1C1C' : '#5B6470',
              }}>
                {r.obligatorio ? 'NORMA' : 'CRITERIO TÉCNICO'}
              </span>
              <span style={s.reqTexto}>{r.texto}</span>
              <span style={{
                ...s.chip,
                background: r.vencido ? '#FDF2F2'
                  : r.estado === 'entregado' ? '#E6F4EA'
                  : r.estado === 'no_aplica' ? '#F0F0EC' : '#FEF3C7',
                color: r.vencido ? '#9B1C1C'
                  : r.estado === 'entregado' ? '#1E6B3A'
                  : r.estado === 'no_aplica' ? '#5B6470' : '#92400E',
              }}>
                {r.vencido ? 'Vencido'
                  : r.estado === 'entregado' ? 'Entregado'
                  : r.estado === 'no_aplica' ? 'No aplica' : 'Pendiente'}
              </span>
              <button type="button" style={s.botonMini}
                onClick={() => setEditandoReq({
                  id: r.id, texto: r.texto, estado: r.estado,
                  vence: r.fecha_vence ?? '', observacion: r.observacion ?? '',
                })}>
                Actualizar
              </button>
            </div>
            <div style={s.reqPie}>
              {r.fundamento}
              {r.fecha_vence && ` · vigente hasta ${new Date(r.fecha_vence + 'T12:00:00')
                .toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' })}`}
              {r.observacion && ` · ${r.observacion}`}
            </div>
          </div>
        ))}

        {editandoReq && (
          <div style={s.subBloque}>
            <div style={s.h4}>{editandoReq.texto}</div>
            <div style={s.opciones}>
              {([
                { v: 'entregado' as EstadoRequisito, t: 'Entregado' },
                { v: 'pendiente' as EstadoRequisito, t: 'Pendiente' },
                { v: 'no_aplica' as EstadoRequisito, t: 'No aplica' },
              ]).map((x) => (
                <button key={x.v} type="button"
                  onClick={() => setEditandoReq({ ...editandoReq, estado: x.v })}
                  style={{
                    ...s.opcion,
                    ...(editandoReq.estado === x.v
                      ? { borderColor: color, background: `${color}12`, fontWeight: 700 }
                      : {}),
                  }}>
                  {x.t}
                </button>
              ))}
            </div>
            {editandoReq.estado === 'entregado' && (
              <Campo etiqueta="Vigente hasta" ancho={200}
                ayuda="Cuando pase esta fecha, vuelve a aparecer como pendiente.">
                <input type="date" value={editandoReq.vence} style={s.input}
                  onChange={(e) => setEditandoReq({ ...editandoReq, vence: e.target.value })} />
              </Campo>
            )}
            <Campo etiqueta="Observación" ancho={9999}
              ayuda={editandoReq.estado === 'no_aplica'
                ? 'Obligatoria: sin justificación vale lo mismo que no pedirlo.'
                : undefined}>
              <input value={editandoReq.observacion} style={s.input}
                onChange={(e) => setEditandoReq({ ...editandoReq, observacion: e.target.value })} />
            </Campo>
            <div style={s.acciones}>
              <button type="button" style={s.botonPlano} onClick={() => setEditandoReq(null)}>
                Cancelar
              </button>
              <button type="button" disabled={pendiente}
                style={{ ...s.botonLleno, background: color }}
                onClick={() => {
                  correr(() => responderRequisito(
                    editandoReq.id, editandoReq.estado, editandoReq.vence,
                    editandoReq.observacion, contratista.id));
                  setEditandoReq(null);
                }}>
                Guardar
              </button>
            </div>
          </div>
        )}
      </section>

      {/* ---------- Personal ---------- */}
      <section style={s.bloque}>
        <div style={s.h3}>Personal que entra a planta</div>
        <p style={s.nota}>
          Quiénes son, con su aptitud médica y su inducción. Un contratista con
          doce personas adentro y sin registro de quiénes son es el vacío que
          este módulo cierra.
        </p>

        {personal.length === 0 && (
          <p style={s.vacio}>Sin personal registrado.</p>
        )}

        {personal.map((p) => (
          <div key={p.id} style={s.persona}>
            <div style={{ flex: '1 1 200px', minWidth: 0 }}>
              <div style={s.personaNombre}>{p.nombre}</div>
              <div style={s.personaMeta}>
                {p.cargo ?? 'sin cargo'}
                {p.identificacion ? ` · C.C. ${p.identificacion}` : ''}
                {p.arl ? ` · ${p.arl}` : ''}
              </div>
            </div>

            {p.examen_vence && (
              <span style={{
                ...s.chip,
                background: p.examen_vencido ? '#FDF2F2' : '#E6F4EA',
                color: p.examen_vencido ? '#9B1C1C' : '#1E6B3A',
              }}>
                {p.examen_vencido ? 'Examen vencido' : 'Examen vigente'}
              </span>
            )}
            <span style={{
              ...s.chip,
              background: p.induccion_recibida ? '#E6F4EA' : '#FEF3C7',
              color: p.induccion_recibida ? '#1E6B3A' : '#92400E',
            }}>
              {p.induccion_recibida ? 'Con inducción' : 'Sin inducción'}
            </span>

            <div style={s.accionesPersona}>
              <button type="button" style={s.botonMini}
                onClick={() => setFormP({
                  id: p.id, nombre: p.nombre,
                  identificacion: p.identificacion ?? '', cargo: p.cargo ?? '',
                  arl: p.arl ?? '', examenVence: p.examen_vence ?? '',
                  induccion: p.induccion_recibida,
                  fechaInduccion: p.fecha_induccion ?? '',
                  observaciones: p.observaciones ?? '',
                })}>
                Editar
              </button>
              <button type="button" style={{ ...s.botonMini, color: '#9B1C1C' }}
                disabled={pendiente}
                onClick={() => correr(() => eliminarPersona(p.id, contratista.id))}>
                Quitar
              </button>
            </div>
          </div>
        ))}

        {!formP && (
          <button type="button" style={{ ...s.botonSec, marginTop: 10 }}
            onClick={() => setFormP({ ...VACIO_PERSONA })}>
            + Agregar persona
          </button>
        )}

        {formP && (
          <div style={s.subBloque}>
            <div style={s.h4}>{formP.id ? 'Editar persona' : 'Nueva persona'}</div>
            <div style={s.fila}>
              <Campo etiqueta="Nombre" ancho={220}>
                <input value={formP.nombre} style={s.input}
                  onChange={(e) => setFormP({ ...formP, nombre: e.target.value })} />
              </Campo>
              <Campo etiqueta="Identificación" ancho={150}>
                <input value={formP.identificacion} style={s.input}
                  onChange={(e) => setFormP({ ...formP, identificacion: e.target.value })} />
              </Campo>
              <Campo etiqueta="Cargo" ancho={170}>
                <input value={formP.cargo} style={s.input}
                  onChange={(e) => setFormP({ ...formP, cargo: e.target.value })} />
              </Campo>
              <Campo etiqueta="ARL" ancho={150}>
                <input value={formP.arl} style={s.input}
                  onChange={(e) => setFormP({ ...formP, arl: e.target.value })} />
              </Campo>
            </div>
            <div style={s.fila}>
              <Campo etiqueta="Examen médico vigente hasta" ancho={210}>
                <input type="date" value={formP.examenVence} style={s.input}
                  onChange={(e) => setFormP({ ...formP, examenVence: e.target.value })} />
              </Campo>
              <Campo etiqueta="Fecha de la inducción" ancho={180}>
                <input type="date" value={formP.fechaInduccion} style={s.input}
                  onChange={(e) => setFormP({ ...formP, fechaInduccion: e.target.value })} />
              </Campo>
            </div>
            <label style={s.check}>
              <input type="checkbox" checked={formP.induccion}
                onChange={(e) => setFormP({ ...formP, induccion: e.target.checked })} />
              Recibió la inducción en SST y en los peligros de esta empresa
            </label>
            <Campo etiqueta="Observaciones" ancho={9999}>
              <input value={formP.observaciones} style={s.input}
                onChange={(e) => setFormP({ ...formP, observaciones: e.target.value })} />
            </Campo>
            <div style={s.acciones}>
              <button type="button" style={s.botonPlano} onClick={() => setFormP(null)}>
                Cancelar
              </button>
              <button type="button" disabled={pendiente}
                style={{ ...s.botonLleno, background: color }}
                onClick={() => {
                  correr(() => guardarPersona(contratista.id, formP));
                  setFormP(null);
                }}>
                Guardar
              </button>
            </div>
          </div>
        )}
      </section>
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
    padding: '11px 15px', borderRadius: 9, fontSize: 13,
    boxShadow: '0 6px 20px rgba(20,38,63,.16)',
  },
  alerta: {
    background: '#FDF2F2', border: '1px solid #F3C7C7', borderRadius: 10,
    padding: '12px 15px', fontSize: 13, color: '#9B1C1C',
    lineHeight: 1.6, marginBottom: 14,
  },

  bloque: {
    background: '#fff', border: '1px solid #E4E4DF', borderRadius: 12,
    padding: '15px 17px', marginBottom: 14,
  },
  subBloque: {
    background: '#FAFAF8', border: '1px solid #E4E4DF', borderRadius: 10,
    padding: '13px 15px', marginTop: 10,
  },
  h3: {
    fontSize: 14, fontWeight: 700, color: '#14263F', marginBottom: 10,
    display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap',
  },
  h4: { fontSize: 13, fontWeight: 700, color: '#14263F', marginBottom: 8 },
  contador: { fontSize: 11.5, fontWeight: 600, color: '#92400E' },
  nota: { fontSize: 12, color: '#5B6470', lineHeight: 1.6, margin: '0 0 12px', maxWidth: 640 },
  vacio: { fontSize: 12.5, color: '#9CA3AF', fontStyle: 'italic', margin: '0 0 8px' },
  subtitulo: {
    fontSize: 11, fontWeight: 700, color: '#8A929C', letterSpacing: .5,
    textTransform: 'uppercase', margin: '12px 0 8px',
  },

  fila: { display: 'flex', gap: 12, flexWrap: 'wrap' },
  label: { display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5, color: '#14263F' },
  input: {
    width: '100%', padding: '8px 11px', border: '1px solid #E4E4DF',
    borderRadius: 8, fontSize: 13, boxSizing: 'border-box',
    fontFamily: 'inherit', background: '#fff', color: '#14263F',
  },
  ayuda: { fontSize: 11.5, color: '#8A929C', margin: '4px 0 0', lineHeight: 1.5 },
  check: {
    display: 'flex', alignItems: 'center', gap: 8,
    fontSize: 13, color: '#14263F', cursor: 'pointer', margin: '2px 0 10px',
  },

  opciones: { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 },
  opcion: {
    background: '#fff', border: '1px solid #E4E4DF', borderRadius: 8,
    padding: '7px 16px', fontSize: 12.5, color: '#5B6470', cursor: 'pointer',
  },

  requisito: { padding: '10px 0', borderTop: '1px solid #F0F0EC' },
  reqCab: { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' },
  etiqueta: {
    fontSize: 9.5, fontWeight: 700, letterSpacing: .3,
    padding: '2px 7px', borderRadius: 4, whiteSpace: 'nowrap',
  },
  reqTexto: { fontSize: 12.5, color: '#14263F', flex: '1 1 240px', lineHeight: 1.45 },
  reqPie: { fontSize: 11, color: '#8A929C', marginTop: 4, lineHeight: 1.45 },

  persona: {
    display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap',
    padding: '10px 0', borderTop: '1px solid #F0F0EC',
  },
  personaNombre: { fontSize: 13, fontWeight: 700, color: '#14263F' },
  personaMeta: { fontSize: 11.5, color: '#8A929C', marginTop: 2 },
  accionesPersona: { display: 'flex', gap: 4, flexWrap: 'wrap' },
  chip: {
    fontSize: 10.5, fontWeight: 700, padding: '3px 10px',
    borderRadius: 20, whiteSpace: 'nowrap',
  },

  acciones: { display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 10 },
  botonPlano: {
    background: 'none', border: 'none', color: '#5B6470',
    fontSize: 12.5, fontWeight: 600, cursor: 'pointer', padding: '8px 12px',
  },
  botonSec: {
    background: '#fff', border: '1px solid #E4E4DF', borderRadius: 8,
    padding: '9px 16px', fontSize: 13, fontWeight: 600,
    color: '#14263F', cursor: 'pointer',
  },
  botonLleno: {
    color: '#fff', border: 'none', padding: '9px 20px', borderRadius: 8,
    fontSize: 13, fontWeight: 600, cursor: 'pointer',
  },
  botonMini: {
    background: '#fff', border: '1px solid #E4E4DF', borderRadius: 7,
    padding: '5px 11px', fontSize: 11.5, fontWeight: 600,
    color: '#14263F', cursor: 'pointer', whiteSpace: 'nowrap',
  },
};
