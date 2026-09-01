'use client';

/**
 * EDITOR DEL SIMULACRO
 * ---------------------------------------------------------------
 * Dos mitades: los datos medibles del ejercicio y el equipo evaluador
 * que firma el acta.
 *
 * Las firmas se piden POR ENLACE (regla §5.21): los evaluadores estaban
 * repartidos por la planta durante el ejercicio y uno suele ser el
 * asesor de la ARL, que ni siquiera trabaja aquí. Perseguirlos con un
 * portátil para que firmen en pantalla es exactamente lo que se hacía
 * con el papel.
 *
 * El enlace se muestra SIEMPRE copiable, aunque el correo falle: en
 * planta la mitad de las veces se resuelve por WhatsApp.
 */
import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  guardarSimulacro, guardarEvaluador, eliminarEvaluador, cerrarSimulacro,
  enviarEnlaceFirmaSimulacro, obtenerEnlaceFirmaSimulacro, enviarActaSimulacro,
  type Simulacro, type Evaluador, type TipoSimulacro,
  type RolEvaluador, type Amenaza,
} from '@/lib/acciones-emergencias';

const TIPOS: { v: TipoSimulacro; t: string }[] = [
  { v: 'evacuacion', t: 'Evacuación' },
  { v: 'incendio', t: 'Conato de incendio' },
  { v: 'sismo', t: 'Sismo' },
  { v: 'primeros_auxilios', t: 'Primeros auxilios' },
  { v: 'derrame', t: 'Derrame de químicos' },
  { v: 'otro', t: 'Otro' },
];

const ROLES: { v: RolEvaluador; t: string }[] = [
  { v: 'coordinador', t: 'Coordinador del simulacro' },
  { v: 'evaluador', t: 'Evaluador' },
  { v: 'brigadista', t: 'Brigadista' },
  { v: 'observador_arl', t: 'Observador de la ARL' },
];

const VACIO_EVAL = {
  id: undefined as string | undefined,
  empleadoId: '', nombre: '', cargo: '', correo: '',
  rol: 'evaluador' as RolEvaluador,
};

/** minutos y segundos → segundos, que es como se guarda. */
function aSegundos(min: string, seg: string): number | null {
  const m = Number(min || 0);
  const s = Number(seg || 0);
  if (!min && !seg) return null;
  if (!Number.isFinite(m) || !Number.isFinite(s)) return null;
  return Math.round(m * 60 + s);
}

export default function EditorSimulacro({
  simulacro,
  evaluadores,
  amenazas,
  empleados,
  color,
}: {
  simulacro: Simulacro;
  evaluadores: Evaluador[];
  amenazas: Amenaza[];
  empleados: Array<{ id: string; nombres: string; identificacion: string; cargo: string | null }>;
  color: string;
}) {
  const router = useRouter();
  const [pendiente, startTransition] = useTransition();
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);
  const [hecho, setHecho] = useState(false);
  const [enlace, setEnlace] = useState<{ nombre: string; url: string } | null>(null);
  const [formEval, setFormEval] = useState<typeof VACIO_EVAL | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [correo, setCorreo] = useState({ para: '', mensaje: '' });

  const cerrado = simulacro.estado === 'cerrado';
  const tiempo = simulacro.tiempo_evacuacion_seg;

  const [form, setForm] = useState({
    fecha: simulacro.fecha,
    tipo: simulacro.tipo,
    amenazaId: simulacro.amenaza_id ?? '',
    alcance: simulacro.alcance ?? '',
    puntoEncuentro: simulacro.punto_encuentro ?? '',
    horaInicio: simulacro.hora_inicio?.slice(0, 5) ?? '',
    minutos: tiempo !== null ? String(Math.floor(tiempo / 60)) : '',
    segundos: tiempo !== null ? String(tiempo % 60) : '',
    participantes: String(simulacro.participantes ?? 0),
    evacuados: String(simulacro.evacuados ?? 0),
    aciertos: simulacro.aciertos ?? '',
    oportunidades: simulacro.oportunidades ?? '',
    observaciones: simulacro.observaciones ?? '',
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
      const r = await guardarSimulacro(simulacro.id, {
        fecha: form.fecha,
        tipo: form.tipo,
        amenazaId: form.amenazaId,
        alcance: form.alcance,
        puntoEncuentro: form.puntoEncuentro,
        horaInicio: form.horaInicio,
        tiempoSegundos: aSegundos(form.minutos, form.segundos),
        participantes: Number(form.participantes || 0),
        evacuados: Number(form.evacuados || 0),
        aciertos: form.aciertos,
        oportunidades: form.oportunidades,
        observaciones: form.observaciones,
      });
      setAviso({ tipo: r.ok ? 'ok' : 'error', texto: r.mensaje });
      if (r.ok) {
        setHecho(true);
        setTimeout(() => setHecho(false), 2600);
        router.refresh();
      }
    });
  }

  /** El enlace se guarda en pantalla pase lo que pase con el correo. */
  function pedirFirma(ev: Evaluador) {
    setAviso(null);
    startTransition(async () => {
      const r = await enviarEnlaceFirmaSimulacro(ev.id, simulacro.id);
      if (r.enlace) setEnlace({ nombre: ev.nombre, url: r.enlace });
      setAviso({ tipo: r.ok ? 'ok' : 'error', texto: r.mensaje });
      router.refresh();
    });
  }

  function copiarEnlace(ev: Evaluador) {
    setAviso(null);
    startTransition(async () => {
      const r = await obtenerEnlaceFirmaSimulacro(ev.id);
      if (r.enlace) {
        setEnlace({ nombre: ev.nombre, url: r.enlace });
        setAviso({ tipo: 'ok', texto: 'Enlace generado. Cópialo de abajo.' });
      } else {
        setAviso({ tipo: 'error', texto: r.mensaje });
      }
      router.refresh();
    });
  }

  const faltanFirmas = evaluadores.filter((e) => !e.firmado).length;
  const participantes = Number(form.participantes || 0);
  const evacuados = Number(form.evacuados || 0);
  const cobertura = participantes > 0
    ? Math.round((evacuados / participantes) * 100) : null;

  return (
    <>
      {aviso && (
        <div role="status" aria-live="polite" style={{
          ...s.aviso,
          background: aviso.tipo === 'ok' ? 'var(--bien-fondo)' : 'var(--mal-fondo)',
          color: aviso.tipo === 'ok' ? 'var(--bien)' : 'var(--mal)',
          border: `1px solid ${aviso.tipo === 'ok' ? '#BFE3CB' : '#F3C7C7'}`,
        }}>{aviso.texto}</div>
      )}

      {cerrado && (
        <div style={s.cerrada}>
          <strong>Acta cerrada.</strong> Ya es la evidencia del estándar 5.1.1.
          Descárgala o envíala por correo; para corregir algo habría que
          registrar un simulacro nuevo.
        </div>
      )}

      <div style={s.barra}>
        <a href={`/api/pdf-simulacro/${simulacro.id}`} target="_blank" rel="noopener"
          style={{ ...s.botonSec, textDecoration: 'none' }}>
          Descargar acta
        </a>
        <button type="button" style={s.botonSec} onClick={() => setEnviando(true)}>
          Enviar por correo
        </button>
        {!cerrado && (
          <button type="button" disabled={pendiente || faltanFirmas > 0 || evaluadores.length === 0}
            title={faltanFirmas > 0 ? 'Faltan firmas del equipo evaluador' : undefined}
            style={{
              ...s.botonLleno,
              background: faltanFirmas > 0 || evaluadores.length === 0 ? '#D8DCDF' : color,
              color: faltanFirmas > 0 || evaluadores.length === 0 ? 'var(--texto-tenue)' : '#fff',
              cursor: faltanFirmas > 0 || evaluadores.length === 0 ? 'not-allowed' : 'pointer',
            }}
            onClick={() => correr(() => cerrarSimulacro(simulacro.id))}>
            Cerrar acta
          </button>
        )}
      </div>

      {enviando && (
        <section style={s.bloque}>
          <div style={s.h3}>Enviar el acta</div>
          <label style={s.label}>Destinatarios</label>
          <input value={correo.para} style={s.input}
            placeholder="gerencia@empresa.com"
            onChange={(e) => setCorreo({ ...correo, para: e.target.value })} />
          <p style={s.ayuda}>Separa varios con coma.</p>
          <label style={{ ...s.label, marginTop: 10 }}>Mensaje</label>
          <textarea rows={2} value={correo.mensaje} style={{ ...s.input, resize: 'vertical' }}
            onChange={(e) => setCorreo({ ...correo, mensaje: e.target.value })} />
          <div style={s.acciones}>
            <button type="button" style={s.botonPlano} onClick={() => setEnviando(false)}>
              Cancelar
            </button>
            <button type="button" disabled={pendiente}
              style={{ ...s.botonLleno, background: color }}
              onClick={() => {
                correr(() => enviarActaSimulacro(simulacro.id, correo.para, correo.mensaje));
                setEnviando(false);
              }}>
              Enviar
            </button>
          </div>
        </section>
      )}

      {/* ---------- Datos del ejercicio ---------- */}
      <section style={s.bloque}>
        <div style={s.h3}>El ejercicio</div>

        <div style={s.fila}>
          <Campo etiqueta="Fecha">
            <input type="date" value={form.fecha} style={s.input} disabled={cerrado}
              onChange={(e) => setForm({ ...form, fecha: e.target.value })} />
          </Campo>
          <Campo etiqueta="Hora de inicio">
            <input type="time" value={form.horaInicio} style={s.input} disabled={cerrado}
              onChange={(e) => setForm({ ...form, horaInicio: e.target.value })} />
          </Campo>
          <Campo etiqueta="Tipo">
            <select value={form.tipo} style={s.input} disabled={cerrado}
              onChange={(e) => setForm({ ...form, tipo: e.target.value as TipoSimulacro })}>
              {TIPOS.map((t) => <option key={t.v} value={t.v}>{t.t}</option>)}
            </select>
          </Campo>
          <Campo etiqueta="Amenaza que se simula" ancho={230}>
            <select value={form.amenazaId} style={s.input} disabled={cerrado}
              onChange={(e) => setForm({ ...form, amenazaId: e.target.value })}>
              <option value="">— Sin enlazar —</option>
              {amenazas.map((a) => (
                <option key={a.id} value={a.id}>{a.amenaza}</option>
              ))}
            </select>
          </Campo>
        </div>

        <div style={s.fila}>
          <Campo etiqueta="Alcance" ancho={230}>
            <input value={form.alcance} style={s.input} disabled={cerrado}
              placeholder="Toda la sede / Bodega de producto terminado"
              onChange={(e) => setForm({ ...form, alcance: e.target.value })} />
          </Campo>
          <Campo etiqueta="Punto de encuentro" ancho={230}>
            <input value={form.puntoEncuentro} style={s.input} disabled={cerrado}
              onChange={(e) => setForm({ ...form, puntoEncuentro: e.target.value })} />
          </Campo>
        </div>

        <div style={s.subtitulo}>Resultados</div>
        <div style={s.fila}>
          <Campo etiqueta="Participantes" ancho={130}>
            <input value={form.participantes} style={s.input} inputMode="numeric" disabled={cerrado}
              onChange={(e) => setForm({ ...form, participantes: e.target.value.replace(/\D/g, '') })} />
          </Campo>
          <Campo etiqueta="Evacuados" ancho={130}>
            <input value={form.evacuados} style={s.input} inputMode="numeric" disabled={cerrado}
              onChange={(e) => setForm({ ...form, evacuados: e.target.value.replace(/\D/g, '') })} />
          </Campo>
          <Campo etiqueta="Tiempo de evacuación" ancho={200}>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input value={form.minutos} style={{ ...s.input, textAlign: 'right' }}
                inputMode="numeric" placeholder="0" disabled={cerrado}
                onChange={(e) => setForm({ ...form, minutos: e.target.value.replace(/\D/g, '') })} />
              <span style={s.unidad}>min</span>
              <input value={form.segundos} style={{ ...s.input, textAlign: 'right' }}
                inputMode="numeric" placeholder="0" disabled={cerrado}
                onChange={(e) => setForm({ ...form, segundos: e.target.value.replace(/\D/g, '') })} />
              <span style={s.unidad}>s</span>
            </div>
          </Campo>
          <Campo etiqueta="Cobertura" ancho={120}>
            <div style={{ ...s.calculado, color }}>
              {cobertura === null ? '—' : `${cobertura}%`}
            </div>
          </Campo>
        </div>

        <Campo etiqueta="Aciertos" ancho={9999}>
          <textarea rows={2} value={form.aciertos} style={{ ...s.input, resize: 'vertical' }}
            disabled={cerrado} placeholder="Qué funcionó bien"
            onChange={(e) => setForm({ ...form, aciertos: e.target.value })} />
        </Campo>
        <Campo etiqueta="Oportunidades de mejora" ancho={9999}>
          <textarea rows={3} value={form.oportunidades} style={{ ...s.input, resize: 'vertical' }}
            disabled={cerrado} placeholder="De aquí salen las acciones del plan"
            onChange={(e) => setForm({ ...form, oportunidades: e.target.value })} />
        </Campo>
        <Campo etiqueta="Observaciones" ancho={9999}>
          <textarea rows={2} value={form.observaciones} style={{ ...s.input, resize: 'vertical' }}
            disabled={cerrado}
            onChange={(e) => setForm({ ...form, observaciones: e.target.value })} />
        </Campo>

        {!cerrado && (
          <div style={s.acciones}>
            <button type="button" onClick={guardar} disabled={pendiente}
              style={{
                ...s.botonLleno,
                background: hecho ? 'var(--bien)' : pendiente ? 'var(--borde-fuerte)' : color,
              }}>
              {hecho ? '✓ Guardado' : pendiente ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        )}
      </section>

      {/* ---------- Equipo evaluador ---------- */}
      <section style={s.bloque}>
        <div style={s.h3}>Equipo evaluador</div>
        <p style={s.nota}>
          Son quienes firman el acta. Cada uno recibe su propio enlace: el
          enlace es personal y deja de funcionar apenas firme.
        </p>

        {evaluadores.length === 0 && (
          <p style={s.vacio}>Sin evaluadores. El acta no se puede cerrar sin al menos uno.</p>
        )}

        {evaluadores.map((ev) => (
          <div key={ev.id} style={s.evaluador}>
            <div style={{ flex: '1 1 200px', minWidth: 0 }}>
              <div style={s.evalNombre}>{ev.nombre}</div>
              <div style={s.evalMeta}>
                {ROLES.find((r) => r.v === ev.rol)?.t ?? ev.rol}
                {ev.cargo ? ` · ${ev.cargo}` : ''}
                {ev.correo ? ` · ${ev.correo}` : ' · sin correo'}
              </div>
            </div>

            <span style={{
              ...s.chip,
              background: ev.firmado ? 'var(--bien-fondo)' : 'var(--ambar-fondo)',
              color: ev.firmado ? 'var(--bien)' : 'var(--aviso)',
            }}>
              {ev.firmado ? 'Firmó' : ev.tiene_token ? 'Enlace enviado' : 'Sin firmar'}
            </span>

            {!cerrado && (
              <div style={s.accionesEval}>
                {!ev.firmado && (
                  <>
                    <button type="button" style={s.botonMini} disabled={pendiente}
                      onClick={() => pedirFirma(ev)}>
                      Enviar enlace
                    </button>
                    <button type="button" style={s.botonMini} disabled={pendiente}
                      onClick={() => copiarEnlace(ev)}>
                      Ver enlace
                    </button>
                  </>
                )}
                <button type="button" style={s.botonMini} disabled={pendiente}
                  onClick={() => setFormEval({
                    id: ev.id, empleadoId: ev.empleado_id ?? '',
                    nombre: ev.nombre, cargo: ev.cargo ?? '',
                    correo: ev.correo ?? '', rol: ev.rol,
                  })}>
                  Editar
                </button>
                {!ev.firmado && (
                  <button type="button" style={{ ...s.botonMini, color: 'var(--mal)' }}
                    disabled={pendiente}
                    onClick={() => correr(() => eliminarEvaluador(ev.id, simulacro.id))}>
                    Quitar
                  </button>
                )}
              </div>
            )}
          </div>
        ))}

        {enlace && (
          <div style={s.enlaceCaja}>
            <div style={s.enlaceTitulo}>Enlace de firma de {enlace.nombre}</div>
            <code style={s.enlaceUrl}>{enlace.url}</code>
            <p style={s.ayuda}>
              Cópialo si el correo no llega: sirve por WhatsApp igual de bien.
            </p>
          </div>
        )}

        {!cerrado && !formEval && (
          <button type="button" style={{ ...s.botonSec, marginTop: 10 }}
            onClick={() => setFormEval({ ...VACIO_EVAL })}>
            + Agregar evaluador
          </button>
        )}

        {formEval && (
          <div style={s.subBloque}>
            <div style={s.h4}>{formEval.id ? 'Editar evaluador' : 'Nuevo evaluador'}</div>
            <Campo etiqueta="Empleado" ayuda="Si es externo —la ARL, por ejemplo— déjalo vacío." ancho={9999}>
              <select value={formEval.empleadoId} style={s.input}
                onChange={(e) => setFormEval({ ...formEval, empleadoId: e.target.value })}>
                <option value="">— Persona externa —</option>
                {empleados.map((x) => (
                  <option key={x.id} value={x.id}>{x.nombres} · {x.identificacion}</option>
                ))}
              </select>
            </Campo>
            {!formEval.empleadoId && (
              <div style={s.fila}>
                <Campo etiqueta="Nombre" ancho={200}>
                  <input value={formEval.nombre} style={s.input}
                    onChange={(e) => setFormEval({ ...formEval, nombre: e.target.value })} />
                </Campo>
                <Campo etiqueta="Cargo" ancho={180}>
                  <input value={formEval.cargo} style={s.input}
                    onChange={(e) => setFormEval({ ...formEval, cargo: e.target.value })} />
                </Campo>
              </div>
            )}
            <div style={s.fila}>
              <Campo etiqueta="Correo" ayuda="Aquí llega el enlace de firma." ancho={220}>
                <input value={formEval.correo} style={s.input} type="email"
                  onChange={(e) => setFormEval({ ...formEval, correo: e.target.value })} />
              </Campo>
              <Campo etiqueta="Rol" ancho={200}>
                <select value={formEval.rol} style={s.input}
                  onChange={(e) => setFormEval({ ...formEval, rol: e.target.value as RolEvaluador })}>
                  {ROLES.map((r) => <option key={r.v} value={r.v}>{r.t}</option>)}
                </select>
              </Campo>
            </div>
            <div style={s.acciones}>
              <button type="button" style={s.botonPlano} onClick={() => setFormEval(null)}>
                Cancelar
              </button>
              <button type="button" disabled={pendiente}
                style={{ ...s.botonLleno, background: color }}
                onClick={() => {
                  correr(() => guardarEvaluador(simulacro.id, formEval));
                  setFormEval(null);
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
    padding: '11px 15px', borderRadius: 8, fontSize: 13,
    boxShadow: '0 6px 20px rgba(20,38,63,.16)',
  },
  cerrada: {
    background: 'var(--fondo)', border: '1px solid var(--borde)', borderRadius: 8,
    padding: '12px 15px', fontSize: 13, color: 'var(--texto-suave)',
    lineHeight: 1.6, marginBottom: 12,
  },
  barra: { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 },

  bloque: {
    background: 'var(--superficie)', border: '1px solid var(--borde)', borderRadius: 12,
    padding: '15px 17px', marginBottom: 14,
  },
  subBloque: {
    background: 'var(--superficie-2)', border: '1px solid var(--borde)', borderRadius: 8,
    padding: '13px 15px', marginTop: 10,
  },
  h3: { fontSize: 14, fontWeight: 700, color: 'var(--texto)', marginBottom: 10 },
  h4: { fontSize: 13, fontWeight: 700, color: 'var(--texto)', marginBottom: 8 },
  nota: { fontSize: 12, color: 'var(--texto-suave)', lineHeight: 1.6, margin: '0 0 12px', maxWidth: 620 },
  vacio: { fontSize: 12.5, color: 'var(--texto-tenue)', fontStyle: 'italic', margin: '0 0 8px' },
  subtitulo: {
    fontSize: 11, fontWeight: 700, color: 'var(--texto-tenue)', letterSpacing: .5,
    textTransform: 'uppercase', margin: '10px 0 8px',
  },

  fila: { display: 'flex', gap: 12, flexWrap: 'wrap' },
  label: { display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5, color: 'var(--texto)' },
  input: {
    width: '100%', padding: '8px 11px', border: '1px solid var(--borde)',
    borderRadius: 8, fontSize: 13, boxSizing: 'border-box',
    fontFamily: 'inherit', background: 'var(--superficie)', color: 'var(--texto)',
  },
  unidad: { fontSize: 12, color: 'var(--texto-tenue)' },
  calculado: {
    padding: '8px 11px', border: '1px solid #EDEDE8', borderRadius: 8,
    fontSize: 15, fontWeight: 700, background: 'var(--superficie-2)',
    fontVariantNumeric: 'tabular-nums',
  },
  ayuda: { fontSize: 11.5, color: 'var(--texto-tenue)', margin: '4px 0 0', lineHeight: 1.5 },

  evaluador: {
    display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap',
    padding: '10px 0', borderTop: '1px solid var(--superficie-3)',
  },
  evalNombre: { fontSize: 13, fontWeight: 700, color: 'var(--texto)' },
  evalMeta: { fontSize: 11.5, color: 'var(--texto-tenue)', marginTop: 2, lineHeight: 1.4 },
  chip: {
    fontSize: 10.5, fontWeight: 700, padding: '3px 10px',
    borderRadius: 20, whiteSpace: 'nowrap',
  },
  accionesEval: { display: 'flex', gap: 4, flexWrap: 'wrap' },

  enlaceCaja: {
    background: 'var(--fondo)', border: '1px solid var(--borde)',
    borderRadius: 8, padding: '11px 13px', marginTop: 12,
  },
  enlaceTitulo: { fontSize: 12, fontWeight: 700, color: 'var(--texto)', marginBottom: 5 },
  enlaceUrl: {
    display: 'block', fontFamily: "'Consolas','Courier New',monospace",
    fontSize: 11.5, color: 'var(--texto-suave)', wordBreak: 'break-all', lineHeight: 1.5,
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
