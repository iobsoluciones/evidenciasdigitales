'use client';

/**
 * EDITOR DE LA RENDICIÓN DE CUENTAS
 * ---------------------------------------------------------------
 * El consultor arma el marco —alcance, logros, dificultades— y asigna a
 * cada responsable lo que le correspondía. Lo que NO escribe es el
 * informe de cada uno: eso llega por el enlace, escrito por su autor.
 *
 * Cerrar exige que todos hayan escrito Y firmado, porque un acta donde
 * los informes los redactó una sola persona no es una rendición de
 * cuentas: es una lista de asistencia con párrafos.
 */
import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  guardarRendicion, guardarResponsable, eliminarResponsable, cerrarRendicion,
  enviarEnlaceRendicion, obtenerEnlaceRendicion, enviarActaRendicion,
  type Rendicion, type Responsable,
} from '@/lib/acciones-rendicion';

const VACIO = {
  id: undefined as string | undefined,
  empleadoId: '', nombre: '', cargo: '', correo: '',
  responsabilidades: '', informe: '',
};

export default function EditorRendicion({
  rendicion,
  responsables,
  empleados,
  color,
}: {
  rendicion: Rendicion;
  responsables: Responsable[];
  empleados: Array<{ id: string; nombres: string; identificacion: string }>;
  color: string;
}) {
  const router = useRouter();
  const [pendiente, startTransition] = useTransition();
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);
  const [hecho, setHecho] = useState(false);
  const [enlace, setEnlace] = useState<{ nombre: string; url: string } | null>(null);
  const [formR, setFormR] = useState<typeof VACIO | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [correo, setCorreo] = useState({ para: '', mensaje: '' });

  const cerrada = rendicion.estado === 'cerrada';

  const [form, setForm] = useState({
    fecha: rendicion.fecha,
    alcance: rendicion.alcance ?? '',
    logros: rendicion.logros ?? '',
    dificultades: rendicion.dificultades ?? '',
    compromisos: rendicion.compromisos ?? '',
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
      const r = await guardarRendicion(rendicion.id, form);
      setAviso({ tipo: r.ok ? 'ok' : 'error', texto: r.mensaje });
      if (r.ok) {
        setHecho(true);
        setTimeout(() => setHecho(false), 2600);
        router.refresh();
      }
    });
  }

  function pedirInforme(q: Responsable) {
    setAviso(null);
    startTransition(async () => {
      const r = await enviarEnlaceRendicion(q.id, rendicion.id);
      if (r.enlace) setEnlace({ nombre: q.nombre, url: r.enlace });
      setAviso({ tipo: r.ok ? 'ok' : 'error', texto: r.mensaje });
      router.refresh();
    });
  }

  function verEnlace(q: Responsable) {
    setAviso(null);
    startTransition(async () => {
      const r = await obtenerEnlaceRendicion(q.id);
      if (r.enlace) {
        setEnlace({ nombre: q.nombre, url: r.enlace });
        setAviso({ tipo: 'ok', texto: 'Enlace generado. Cópialo de abajo.' });
      } else {
        setAviso({ tipo: 'error', texto: r.mensaje });
      }
      router.refresh();
    });
  }

  const sinInforme = responsables.filter((q) => !q.informe?.trim()).length;
  const sinFirma = responsables.filter((q) => !q.firmado).length;

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

      {cerrada && (
        <div style={s.cerrada}>
          <strong>Acta cerrada.</strong> Es la evidencia del estándar 2.8.1 de
          este año. Descárgala o envíala por correo.
        </div>
      )}

      <div style={s.barra}>
        <a href={`/api/pdf-rendicion/${rendicion.id}`} target="_blank" rel="noopener"
          style={{ ...s.botonSec, textDecoration: 'none' }}>
          Descargar acta
        </a>
        <button type="button" style={s.botonSec} onClick={() => setEnviando(true)}>
          Enviar por correo
        </button>
        {!cerrada && (
          <button type="button" disabled={pendiente}
            style={{ ...s.botonLleno, background: 'var(--marca)' }}
            onClick={() => correr(() => cerrarRendicion(rendicion.id))}>
            Cerrar acta
          </button>
        )}
      </div>

      {enviando && (
        <section style={s.bloque}>
          <div style={s.h3}>Enviar el acta</div>
          <label style={s.label}>Destinatarios</label>
          <input value={correo.para} style={s.input}
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
              style={{ ...s.botonLleno, background: 'var(--marca)' }}
              onClick={() => {
                correr(() => enviarActaRendicion(rendicion.id, correo.para, correo.mensaje));
                setEnviando(false);
              }}>
              Enviar
            </button>
          </div>
        </section>
      )}

      {/* ---------- Marco del acta ---------- */}
      <section style={s.bloque}>
        <div style={s.h3}>El periodo</div>
        <div style={s.fila}>
          <Campo etiqueta="Fecha del acta" ancho={170}>
            <input type="date" value={form.fecha} style={s.input} disabled={cerrada}
              onChange={(e) => setForm({ ...form, fecha: e.target.value })} />
          </Campo>
          <Campo etiqueta="Alcance" ancho={320}
            ayuda="Qué cubre esta rendición: sedes, procesos, contratistas.">
            <input value={form.alcance} style={s.input} disabled={cerrada}
              onChange={(e) => setForm({ ...form, alcance: e.target.value })} />
          </Campo>
        </div>

        <Campo etiqueta="Logros del periodo" ancho={9999}>
          <textarea rows={2} value={form.logros} style={{ ...s.input, resize: 'vertical' }}
            disabled={cerrada}
            onChange={(e) => setForm({ ...form, logros: e.target.value })} />
        </Campo>
        <Campo etiqueta="Dificultades" ancho={9999}>
          <textarea rows={2} value={form.dificultades} style={{ ...s.input, resize: 'vertical' }}
            disabled={cerrada}
            onChange={(e) => setForm({ ...form, dificultades: e.target.value })} />
        </Campo>
        <Campo etiqueta="Compromisos para el periodo siguiente" ancho={9999}>
          <textarea rows={2} value={form.compromisos} style={{ ...s.input, resize: 'vertical' }}
            disabled={cerrada}
            onChange={(e) => setForm({ ...form, compromisos: e.target.value })} />
        </Campo>

        {!cerrada && (
          <div style={s.acciones}>
            <button type="button" onClick={guardar} disabled={pendiente}
              style={{
                ...s.botonLleno,
                background: hecho ? 'var(--bien)' : pendiente ? 'var(--borde-fuerte)' : 'var(--marca)',
              }}>
              {hecho ? '✓ Guardado' : pendiente ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        )}
      </section>

      {/* ---------- Responsables ---------- */}
      <section style={s.bloque}>
        <div style={s.h3}>
          Quiénes rinden cuentas
          {!cerrada && (sinInforme > 0 || sinFirma > 0) && (
            <span style={s.contador}>
              {sinInforme > 0 && `${sinInforme} sin escribir`}
              {sinInforme > 0 && sinFirma > 0 && ' · '}
              {sinFirma > 0 && `${sinFirma} sin firmar`}
            </span>
          )}
        </div>
        <p style={s.nota}>
          El empleador, el responsable del SG-SST, los jefes de área y el
          COPASST. Tú asignas las responsabilidades; el informe lo escribe cada
          uno desde su enlace.
        </p>

        {responsables.length === 0 && (
          <p style={s.vacio}>Sin responsables. El acta no se puede cerrar así.</p>
        )}

        {responsables.map((q) => (
          <div key={q.id} style={s.persona}>
            <div style={s.personaCab}>
              <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                <div style={s.personaNombre}>{q.nombre}</div>
                <div style={s.personaMeta}>
                  {q.cargo ?? 'sin cargo'}
                  {q.correo ? ` · ${q.correo}` : ' · sin correo'}
                </div>
              </div>
              <span style={{
                ...s.chip,
                background: q.firmado ? 'var(--bien-fondo)' : 'var(--ambar-fondo)',
                color: q.firmado ? 'var(--bien)' : 'var(--aviso)',
              }}>
                {q.firmado ? 'Rindió cuentas' : q.tiene_token ? 'Enlace enviado' : 'Pendiente'}
              </span>

              {!cerrada && (
                <div style={s.accionesPersona}>
                  {!q.firmado && (
                    <>
                      <button type="button" style={s.botonMini} disabled={pendiente}
                        onClick={() => pedirInforme(q)}>
                        Enviar enlace
                      </button>
                      <button type="button" style={s.botonMini} disabled={pendiente}
                        onClick={() => verEnlace(q)}>
                        Ver enlace
                      </button>
                    </>
                  )}
                  <button type="button" style={s.botonMini} disabled={pendiente}
                    onClick={() => setFormR({
                      id: q.id, empleadoId: q.empleado_id ?? '',
                      nombre: q.nombre, cargo: q.cargo ?? '',
                      correo: q.correo ?? '',
                      responsabilidades: q.responsabilidades ?? '',
                      informe: q.informe ?? '',
                    })}>
                    Editar
                  </button>
                  {!q.firmado && (
                    <button type="button" style={{ ...s.botonMini, color: 'var(--mal)' }}
                      disabled={pendiente}
                      onClick={() => correr(() => eliminarResponsable(q.id, rendicion.id))}>
                      Quitar
                    </button>
                  )}
                </div>
              )}
            </div>

            {q.responsabilidades && (
              <div style={s.campoTexto}>
                <span style={s.etiquetaTexto}>Responsabilidades asignadas</span>
                <p style={s.parrafo}>{q.responsabilidades}</p>
              </div>
            )}
            <div style={s.campoTexto}>
              <span style={s.etiquetaTexto}>Su informe</span>
              <p style={q.informe ? s.parrafo : s.parrafoVacio}>
                {q.informe ?? 'Todavía no ha escrito su rendición.'}
              </p>
            </div>
          </div>
        ))}

        {enlace && (
          <div style={s.enlaceCaja}>
            <div style={s.enlaceTitulo}>Enlace de {enlace.nombre}</div>
            <code style={s.enlaceUrl}>{enlace.url}</code>
            <p style={s.ayuda}>Cópialo si el correo no llega.</p>
          </div>
        )}

        {!cerrada && !formR && (
          <button type="button" style={{ ...s.botonSec, marginTop: 10 }}
            onClick={() => setFormR({ ...VACIO })}>
            + Agregar responsable
          </button>
        )}

        {formR && (
          <div style={s.subBloque}>
            <div style={s.h4}>{formR.id ? 'Editar responsable' : 'Nuevo responsable'}</div>
            <Campo etiqueta="Empleado" ayuda="Si es externo, déjalo vacío." ancho={9999}>
              <select value={formR.empleadoId} style={s.input}
                onChange={(e) => setFormR({ ...formR, empleadoId: e.target.value })}>
                <option value="">— Persona externa —</option>
                {empleados.map((x) => (
                  <option key={x.id} value={x.id}>{x.nombres} · {x.identificacion}</option>
                ))}
              </select>
            </Campo>
            {!formR.empleadoId && (
              <div style={s.fila}>
                <Campo etiqueta="Nombre" ancho={200}>
                  <input value={formR.nombre} style={s.input}
                    onChange={(e) => setFormR({ ...formR, nombre: e.target.value })} />
                </Campo>
                <Campo etiqueta="Cargo" ancho={180}>
                  <input value={formR.cargo} style={s.input}
                    onChange={(e) => setFormR({ ...formR, cargo: e.target.value })} />
                </Campo>
              </div>
            )}
            <Campo etiqueta="Correo" ayuda="Aquí llega el enlace para rendir cuentas." ancho={9999}>
              <input value={formR.correo} type="email" style={s.input}
                onChange={(e) => setFormR({ ...formR, correo: e.target.value })} />
            </Campo>
            <Campo etiqueta="Responsabilidades asignadas" ancho={9999}
              ayuda="Lo que le correspondía hacer en el SG-SST durante el año.">
              <textarea rows={2} value={formR.responsabilidades}
                style={{ ...s.input, resize: 'vertical' }}
                onChange={(e) => setFormR({ ...formR, responsabilidades: e.target.value })} />
            </Campo>
            <div style={s.acciones}>
              <button type="button" style={s.botonPlano} onClick={() => setFormR(null)}>
                Cancelar
              </button>
              <button type="button" disabled={pendiente}
                style={{ ...s.botonLleno, background: 'var(--marca)' }}
                onClick={() => {
                  correr(() => guardarResponsable(rendicion.id, formR));
                  setFormR(null);
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
  h3: {
    fontSize: 14, fontWeight: 700, color: 'var(--texto)', marginBottom: 10,
    display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap',
  },
  h4: { fontSize: 13, fontWeight: 700, color: 'var(--texto)', marginBottom: 8 },
  contador: { fontSize: 11.5, fontWeight: 600, color: 'var(--aviso)' },
  nota: { fontSize: 12, color: 'var(--texto-suave)', lineHeight: 1.6, margin: '0 0 12px', maxWidth: 640 },
  vacio: { fontSize: 12.5, color: 'var(--texto-tenue)', fontStyle: 'italic', margin: '0 0 8px' },

  fila: { display: 'flex', gap: 12, flexWrap: 'wrap' },
  label: { display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5, color: 'var(--texto)' },
  input: {
    width: '100%', padding: '8px 11px', border: '1px solid var(--borde)',
    borderRadius: 8, fontSize: 13, boxSizing: 'border-box',
    fontFamily: 'inherit', background: 'var(--superficie)', color: 'var(--texto)',
  },
  ayuda: { fontSize: 11.5, color: 'var(--texto-tenue)', margin: '4px 0 0', lineHeight: 1.5 },

  persona: { padding: '12px 0', borderTop: '1px solid var(--superficie-3)' },
  personaCab: { display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' },
  personaNombre: { fontSize: 13, fontWeight: 700, color: 'var(--texto)' },
  personaMeta: { fontSize: 11.5, color: 'var(--texto-tenue)', marginTop: 2 },
  accionesPersona: { display: 'flex', gap: 4, flexWrap: 'wrap' },
  campoTexto: { marginTop: 8 },
  etiquetaTexto: {
    fontSize: 10, fontWeight: 700, color: 'var(--texto-tenue)',
    letterSpacing: .4, textTransform: 'uppercase',
  },
  parrafo: { fontSize: 12.5, color: 'var(--texto-suave)', lineHeight: 1.6, margin: '3px 0 0' },
  parrafoVacio: {
    fontSize: 12.5, color: 'var(--texto-tenue)', fontStyle: 'italic',
    lineHeight: 1.6, margin: '3px 0 0',
  },
  chip: {
    fontSize: 10.5, fontWeight: 700, padding: '3px 10px',
    borderRadius: 20, whiteSpace: 'nowrap',
  },

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
