'use client';

/**
 * PLAN ANUAL DE TRABAJO
 * ---------------------------------------------------------------
 * El cronograma es una rejilla de doce meses por actividad. Se marcan
 * los meses PROGRAMADOS y, al ejecutarlos, los meses CUMPLIDOS: sin esa
 * distinción el plan solo diría qué se pensaba hacer, nunca qué se hizo,
 * que es justo lo que revisa un auditor.
 *
 * Aprobar es firmar. La firma del empleador es lo que convierte el
 * borrador del consultor en un compromiso de la empresa, y por eso el
 * documento se congela ahí.
 */
import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import LienzoFirma, { type LienzoFirmaRef } from '@/app/LienzoFirma';
import { crearClienteNavegador } from '@/lib/supabase/cliente';
import {
  crearPlan, guardarPlan, guardarActividad, eliminarActividad, aprobarPlan,
  enviarEnlacePlan, obtenerEnlacePlan, enviarPlanAnual,
  type Plan, type Actividad, type Avance, type PlanResumen, type EstadoActividad,
} from '@/lib/acciones-plan-anual';

const MESES = ['E', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
const NOMBRE_MES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

const ESTADOS: { v: EstadoActividad; t: string; fondo: string; color: string }[] = [
  { v: 'pendiente', t: 'Pendiente', fondo: '#F0F0EC', color: '#5B6470' },
  { v: 'en_curso', t: 'En curso', fondo: '#FFF7ED', color: '#9A3412' },
  { v: 'cumplida', t: 'Cumplida', fondo: '#E6F4EA', color: '#1E6B3A' },
  { v: 'no_aplica', t: 'No aplica', fondo: '#F0F0EC', color: '#8A929C' },
];

const ACT_VACIA = {
  id: undefined as string | undefined,
  actividad: '', objetivo: '', meta: '', indicador: '',
  responsable: '', recursos: '',
  meses: [] as number[], ejecutados: [] as number[],
  estado: 'pendiente' as EstadoActividad,
};

export default function VistaPlanAnual({
  planes,
  plan,
  actividades,
  avance,
  orgId,
  color,
}: {
  planes: PlanResumen[];
  plan: Plan | null;
  actividades: Actividad[];
  avance: Avance | null;
  orgId: string;
  color: string;
}) {
  const router = useRouter();
  const supabase = crearClienteNavegador();
  const firmaRef = useRef<LienzoFirmaRef>(null);
  const [pendiente, startTransition] = useTransition();
  const [firmaRemota, setFirmaRemota] = useState<{ correo: string } | null>(null);
  const [enlace, setEnlace] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [correo, setCorreo] = useState({ para: '', mensaje: '' });
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);
  const [hecho, setHecho] = useState<string | null>(null);

  const aprobado = plan?.estado === 'aprobado';

  const [cab, setCab] = useState({
    objetivo: plan?.objetivo_general ?? '',
    alcance: plan?.alcance ?? '',
    financieros: plan?.recursos_financieros ?? '',
    humanos: plan?.recursos_humanos ?? '',
    tecnicos: plan?.recursos_tecnicos ?? '',
  });
  const [act, setAct] = useState<typeof ACT_VACIA | null>(null);
  const [firmando, setFirmando] = useState(false);
  const [emp, setEmp] = useState({ nombre: '', cargo: '' });

  const marcar = (clave: string) => {
    setHecho(clave);
    setTimeout(() => setHecho((h) => (h === clave ? null : h)), 2600);
  };

  const correr = (clave: string, fn: () => Promise<{ ok: boolean; mensaje: string }>) => {
    setAviso(null);
    startTransition(async () => {
      const r = await fn();
      setAviso({ tipo: r.ok ? 'ok' : 'error', texto: r.mensaje });
      if (r.ok) { marcar(clave); router.refresh(); }
    });
  };

  async function firmarYAprobar() {
    if (!plan) return;
    if (!emp.nombre.trim()) {
      setAviso({ tipo: 'error', texto: 'Indica quién aprueba por el empleador.' });
      return;
    }
    if (!firmaRef.current?.tieneFirma()) {
      setAviso({ tipo: 'error', texto: 'Falta la firma del empleador.' });
      return;
    }
    const blob = await firmaRef.current.obtenerBlob();
    if (!blob) { setAviso({ tipo: 'error', texto: 'No se pudo leer la firma.' }); return; }

    startTransition(async () => {
      // Toda ruta de Storage empieza por org_id.
      const ruta = `${orgId}/planes/firma-${plan.id}-${Date.now()}.png`;
      const { error } = await supabase.storage
        .from('firmas')
        .upload(ruta, blob, { contentType: 'image/png', upsert: true });
      if (error) {
        setAviso({ tipo: 'error', texto: 'No se pudo subir la firma: ' + error.message });
        return;
      }
      const r = await aprobarPlan(plan.id, emp.nombre, emp.cargo, ruta);
      setAviso({ tipo: r.ok ? 'ok' : 'error', texto: r.mensaje });
      if (r.ok) { setFirmando(false); marcar('aprobar'); router.refresh(); }
    });
  }

  function alternarMes(campo: 'meses' | 'ejecutados', m: number) {
    if (!act) return;
    const lista = act[campo];
    setAct({
      ...act,
      [campo]: lista.includes(m) ? lista.filter((x) => x !== m) : [...lista, m].sort((a, b) => a - b),
    });
  }

  /* ---------- Sin plan del año ---------- */
  if (!plan) {
    const anio = new Date().getFullYear();
    return (
      <>
        <div style={s.vacio}>
          <h2 style={s.vacioTitulo}>No hay plan anual de {anio}</h2>
          <p style={s.vacioTexto}>
            Es el primer documento que pide cualquier auditor (estándar 2.4.1).
            Debe llevar objetivos, metas, responsables, recursos y cronograma, y
            estar <strong>firmado por el empleador</strong>: sin esa firma es un
            borrador del consultor, no un compromiso de la empresa.
          </p>
          <button
            onClick={() => correr('crear', () => crearPlan(anio))}
            disabled={pendiente}
            style={{ ...s.botonLleno, background: pendiente ? '#cbd5e1' : color }}
            type="button"
          >
            {pendiente ? 'Creando…' : `Crear el plan de ${anio}`}
          </button>
        </div>
        {aviso && <Aviso a={aviso} />}
        {planes.length > 0 && <ListaPlanes planes={planes} />}
      </>
    );
  }

  return (
    <>
      {/* ---------- Documento: PDF, correo y firma remota ---------- */}
      <div style={s.barraDoc}>
        <a href={`/api/pdf-plan-anual/${plan.id}`} target="_blank" rel="noopener"
          style={{ ...s.botonDoc, textDecoration: 'none' }}>
          Descargar PDF
        </a>
        <button type="button" style={s.botonDoc} onClick={() => setEnviando(true)}>
          Enviar por correo
        </button>
        {!aprobado && (
          <button type="button" style={s.botonDoc} disabled={pendiente}
            onClick={() => setFirmaRemota({ correo: '' })}>
            Mandar a firmar al empleador
          </button>
        )}
      </div>

      {firmaRemota && (
        <section style={s.bloque}>
          <div style={s.h3}>Mandar el plan a firmar</div>
          <p style={s.notaDoc}>
            El empleador abre el enlace, lee el objetivo, los recursos y el
            cronograma completo, y firma desde donde esté. Su firma es la que
            convierte esto en el plan de la empresa.
          </p>
          <Campo etiqueta="Correo del empleador">
            <input value={firmaRemota.correo} type="email" style={s.input}
              placeholder="gerencia@empresa.com"
              onChange={(e) => setFirmaRemota({ correo: e.target.value })} />
          </Campo>
          <div style={s.acciones}>
            <button type="button" style={s.botonPlanoDoc}
              onClick={() => setFirmaRemota(null)}>
              Cancelar
            </button>
            <button type="button" style={{ ...s.botonSec, borderColor: color, color }}
              disabled={pendiente}
              onClick={() => {
                const c = firmaRemota.correo;
                setFirmaRemota(null);
                startTransition(async () => {
                  const r = await enviarEnlacePlan(plan.id, c);
                  if (r.enlace) setEnlace(r.enlace);
                  setAviso({ tipo: r.ok ? 'ok' : 'error', texto: r.mensaje });
                  router.refresh();
                });
              }}>
              Enviar enlace
            </button>
            <button type="button" style={s.botonSec} disabled={pendiente}
              onClick={() => {
                setFirmaRemota(null);
                startTransition(async () => {
                  const r = await obtenerEnlacePlan(plan.id);
                  if (r.enlace) {
                    setEnlace(r.enlace);
                    setAviso({ tipo: 'ok', texto: 'Enlace generado. Cópialo de abajo.' });
                  } else {
                    setAviso({ tipo: 'error', texto: r.mensaje });
                  }
                });
              }}>
              Solo ver el enlace
            </button>
          </div>
        </section>
      )}

      {enlace && (
        <div style={s.enlaceCaja}>
          <div style={s.enlaceTitulo}>Enlace de aprobación del empleador</div>
          <code style={s.enlaceUrl}>{enlace}</code>
          <p style={s.notaDoc}>
            Cópialo si el correo no llega: sirve por WhatsApp igual de bien.
          </p>
        </div>
      )}

      {enviando && (
        <section style={s.bloque}>
          <div style={s.h3}>Enviar el plan</div>
          <Campo etiqueta="Destinatarios">
            <input value={correo.para} style={s.input}
              onChange={(e) => setCorreo({ ...correo, para: e.target.value })} />
          </Campo>
          <Campo etiqueta="Mensaje">
            <textarea rows={2} value={correo.mensaje}
              style={{ ...s.input, resize: 'vertical' }}
              onChange={(e) => setCorreo({ ...correo, mensaje: e.target.value })} />
          </Campo>
          <div style={s.acciones}>
            <button type="button" style={s.botonPlanoDoc} onClick={() => setEnviando(false)}>
              Cancelar
            </button>
            <button type="button" style={{ ...s.botonSec, borderColor: color, color }}
              disabled={pendiente}
              onClick={() => {
                const datos = correo;
                setEnviando(false);
                startTransition(async () => {
                  const r = await enviarPlanAnual(plan.id, datos.para, datos.mensaje);
                  setAviso({ tipo: r.ok ? 'ok' : 'error', texto: r.mensaje });
                });
              }}>
              Enviar
            </button>
          </div>
        </section>
      )}

      {/* ---------- Encabezado ---------- */}
      <div style={s.cabecera}>
        <div>
          <span style={s.codigo}>{plan.codigo}</span>
          <h2 style={s.tituloPlan}>Plan anual {plan.anio}</h2>
          {aprobado ? (
            <p style={s.sub}>
              Aprobado por {plan.nombre_empleador}
              {plan.cargo_empleador ? ` · ${plan.cargo_empleador}` : ''}
              {plan.fecha_aprobacion
                ? ` · ${new Date(plan.fecha_aprobacion).toLocaleDateString('es-CO')}` : ''}
            </p>
          ) : (
            <p style={s.sub}>Borrador · sin firma del empleador todavía no es un plan</p>
          )}
        </div>

        {avance && (
          <div style={s.avance}>
            <div style={{ ...s.avanceCifra, color }}>{avance.porcentaje}%</div>
            <div style={s.avanceDetalle}>
              {avance.cumplidas} de {avance.actividades - avance.no_aplica} actividades
              <div style={s.avanceMeses}>
                {avance.ejecutados} de {avance.programados} meses del cronograma
              </div>
            </div>
          </div>
        )}
      </div>

      {aviso && <Aviso a={aviso} />}

      {/* ---------- Datos generales ---------- */}
      <section style={s.bloque}>
        <h3 style={s.h3}>Objetivo y recursos</h3>
        <Campo etiqueta="Objetivo general">
          <textarea value={cab.objetivo} rows={2} disabled={aprobado}
            onChange={(e) => setCab({ ...cab, objetivo: e.target.value })}
            style={{ ...s.input, resize: 'vertical' }} />
        </Campo>
        <Campo etiqueta="Alcance">
          <input value={cab.alcance} disabled={aprobado}
            onChange={(e) => setCab({ ...cab, alcance: e.target.value })} style={s.input} />
        </Campo>
        <div style={s.fila}>
          <Campo etiqueta="Recursos financieros">
            <input value={cab.financieros} disabled={aprobado}
              onChange={(e) => setCab({ ...cab, financieros: e.target.value })} style={s.input} />
          </Campo>
          <Campo etiqueta="Recursos humanos">
            <input value={cab.humanos} disabled={aprobado}
              onChange={(e) => setCab({ ...cab, humanos: e.target.value })} style={s.input} />
          </Campo>
          <Campo etiqueta="Recursos técnicos">
            <input value={cab.tecnicos} disabled={aprobado}
              onChange={(e) => setCab({ ...cab, tecnicos: e.target.value })} style={s.input} />
          </Campo>
        </div>
        {!aprobado && (
          <div style={s.acciones}>
            <button onClick={() => correr('cab', () => guardarPlan(plan.id, cab))}
              disabled={pendiente} type="button"
              style={{
                ...s.botonSec,
                borderColor: hecho === 'cab' ? '#1E6B3A' : color,
                color: hecho === 'cab' ? '#1E6B3A' : color,
                background: hecho === 'cab' ? '#E6F4EA' : '#fff',
              }}>
              {hecho === 'cab' ? '✓ Guardado' : 'Guardar'}
            </button>
          </div>
        )}
      </section>

      {/* ---------- Cronograma ---------- */}
      <section style={s.bloque}>
        <div style={s.filaTitulo}>
          <h3 style={s.h3}>Cronograma de actividades</h3>
          {!aprobado && !act && (
            <button onClick={() => setAct({ ...ACT_VACIA })} style={s.botonMini} type="button">
              + Agregar actividad
            </button>
          )}
        </div>
        <p style={s.nota}>
          Marca en azul los meses <strong>programados</strong> y en verde los
          <strong> ejecutados</strong>. Sin esa distinción el plan diría qué se
          pensaba hacer pero nunca qué se hizo.
        </p>

        {act && (
          <div style={s.formActividad}>
            <Campo etiqueta="Actividad *">
              <input value={act.actividad} style={s.input}
                onChange={(e) => setAct({ ...act, actividad: e.target.value })}
                placeholder="Capacitación en trabajo seguro en alturas" />
            </Campo>
            <div style={s.fila}>
              <Campo etiqueta="Objetivo">
                <input value={act.objetivo} style={s.input}
                  onChange={(e) => setAct({ ...act, objetivo: e.target.value })} />
              </Campo>
              <Campo etiqueta="Meta">
                <input value={act.meta} style={s.input}
                  onChange={(e) => setAct({ ...act, meta: e.target.value })} />
              </Campo>
            </div>
            <div style={s.fila}>
              <Campo etiqueta="Indicador">
                <input value={act.indicador} style={s.input}
                  onChange={(e) => setAct({ ...act, indicador: e.target.value })} />
              </Campo>
              <Campo etiqueta="Responsable">
                <input value={act.responsable} style={s.input}
                  onChange={(e) => setAct({ ...act, responsable: e.target.value })} />
              </Campo>
              <Campo etiqueta="Recursos">
                <input value={act.recursos} style={s.input}
                  onChange={(e) => setAct({ ...act, recursos: e.target.value })} />
              </Campo>
            </div>

            <Campo etiqueta="Meses programados">
              <div style={s.meses}>
                {MESES.map((m, i) => (
                  <button key={i} type="button" title={NOMBRE_MES[i]}
                    onClick={() => alternarMes('meses', i + 1)}
                    style={{
                      ...s.mes,
                      ...(act.meses.includes(i + 1)
                        ? { background: color, color: '#fff', borderColor: color } : {}),
                    }}>{m}</button>
                ))}
              </div>
            </Campo>

            <Campo etiqueta="Meses ejecutados">
              <div style={s.meses}>
                {MESES.map((m, i) => (
                  <button key={i} type="button" title={NOMBRE_MES[i]}
                    onClick={() => alternarMes('ejecutados', i + 1)}
                    style={{
                      ...s.mes,
                      ...(act.ejecutados.includes(i + 1)
                        ? { background: '#1E6B3A', color: '#fff', borderColor: '#1E6B3A' } : {}),
                    }}>{m}</button>
                ))}
              </div>
            </Campo>

            <Campo etiqueta="Estado">
              <select value={act.estado} style={{ ...s.input, maxWidth: 200 }}
                onChange={(e) => setAct({ ...act, estado: e.target.value as EstadoActividad })}>
                {ESTADOS.map((x) => <option key={x.v} value={x.v}>{x.t}</option>)}
              </select>
            </Campo>

            <div style={s.acciones}>
              <button onClick={() => setAct(null)} style={s.botonPlano} type="button">Cancelar</button>
              <button onClick={() => {
                correr('act', () => guardarActividad(plan.id, act));
                setAct(null);
              }} disabled={pendiente} type="button"
                style={{ ...s.botonLleno, background: pendiente ? '#cbd5e1' : color }}>
                Guardar actividad
              </button>
            </div>
          </div>
        )}

        {actividades.length === 0 ? (
          <p style={s.nota}>Todavía no hay actividades en el plan.</p>
        ) : (
          <div style={s.contenedor}>
            <table style={s.tabla}>
              <thead>
                <tr>
                  <th style={s.th}>Actividad</th>
                  <th style={s.th}>Responsable</th>
                  {MESES.map((m, i) => <th key={i} style={s.thMes}>{m}</th>)}
                  <th style={s.th}>Estado</th>
                  {!aprobado && <th style={s.th}></th>}
                </tr>
              </thead>
              <tbody>
                {actividades.map((a) => {
                  const e = ESTADOS.find((x) => x.v === a.estado) ?? ESTADOS[0];
                  return (
                    <tr key={a.id}>
                      <td style={s.td}>
                        <strong>{a.actividad}</strong>
                        {a.meta && <div style={s.meta}>Meta: {a.meta}</div>}
                        {a.atrasada && <div style={s.atrasada}>Atrasada</div>}
                      </td>
                      <td style={s.td}>{a.responsable ?? '—'}</td>
                      {MESES.map((_, i) => {
                        const m = i + 1;
                        const prog = a.meses_programados.includes(m);
                        const ejec = a.meses_ejecutados.includes(m);
                        return (
                          <td key={i} style={s.tdMes}>
                            <span style={{
                              ...s.celdaMes,
                              background: ejec ? '#1E6B3A' : prog ? color : 'transparent',
                              opacity: ejec || prog ? 1 : 0.15,
                            }} />
                          </td>
                        );
                      })}
                      <td style={s.td}>
                        <span style={{ ...s.chip, background: e.fondo, color: e.color }}>{e.t}</span>
                      </td>
                      {!aprobado && (
                        <td style={s.td}>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button type="button" style={s.botonMini}
                              onClick={() => setAct({
                                id: a.id, actividad: a.actividad,
                                objetivo: a.objetivo ?? '', meta: a.meta ?? '',
                                indicador: a.indicador ?? '', responsable: a.responsable ?? '',
                                recursos: a.recursos ?? '',
                                meses: a.meses_programados, ejecutados: a.meses_ejecutados,
                                estado: a.estado,
                              })}>Editar</button>
                            <button type="button" style={{ ...s.botonMini, color: '#9B1C1C' }}
                              onClick={() => correr('del', () => eliminarActividad(a.id))}>
                              Borrar
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ---------- Aprobación ---------- */}
      {!aprobado && (
        <section style={{ ...s.bloque, borderColor: color }}>
          <h3 style={s.h3}>Aprobación del empleador</h3>
          <p style={s.nota}>
            La firma del empleador es lo que convierte este borrador en el plan de
            la empresa. Al aprobarlo el documento queda congelado y deja de admitir
            cambios.
          </p>

          {!firmando ? (
            <div style={s.acciones}>
              <button onClick={() => setFirmando(true)} disabled={actividades.length === 0}
                type="button"
                title={actividades.length === 0 ? 'Agrega al menos una actividad' : undefined}
                style={{
                  ...s.botonLleno,
                  background: actividades.length === 0 ? '#D8DCDF' : color,
                  color: actividades.length === 0 ? '#8A929C' : '#fff',
                  cursor: actividades.length === 0 ? 'not-allowed' : 'pointer',
                }}>
                Aprobar y firmar
              </button>
            </div>
          ) : (
            <>
              <div style={s.fila}>
                <Campo etiqueta="Nombre de quien aprueba *">
                  <input value={emp.nombre} style={s.input}
                    onChange={(e) => setEmp({ ...emp, nombre: e.target.value })} />
                </Campo>
                <Campo etiqueta="Cargo">
                  <input value={emp.cargo} style={s.input}
                    onChange={(e) => setEmp({ ...emp, cargo: e.target.value })}
                    placeholder="Representante legal" />
                </Campo>
              </div>
              <Campo etiqueta="Firma">
                <LienzoFirma ref={firmaRef} color={color} />
              </Campo>
              <div style={s.acciones}>
                <button onClick={() => setFirmando(false)} style={s.botonPlano} type="button">
                  Cancelar
                </button>
                <button onClick={firmarYAprobar} disabled={pendiente} type="button"
                  style={{ ...s.botonLleno, background: pendiente ? '#cbd5e1' : color }}>
                  {pendiente ? 'Aprobando…' : 'Firmar y aprobar'}
                </button>
              </div>
            </>
          )}
        </section>
      )}

      {planes.length > 1 && <ListaPlanes planes={planes} />}
    </>
  );
}

function ListaPlanes({ planes }: { planes: PlanResumen[] }) {
  return (
    <section style={s.bloque}>
      <h3 style={s.h3}>Otros años</h3>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {planes.map((p) => (
          <li key={p.id} style={s.itemPlan}>
            <strong>{p.anio}</strong> · {p.codigo} ·{' '}
            {p.estado === 'aprobado' ? `aprobado por ${p.nombre_empleador}` : 'borrador'} ·{' '}
            {p.cumplidas} de {p.actividades} actividades cumplidas
          </li>
        ))}
      </ul>
    </section>
  );
}

function Aviso({ a }: { a: { tipo: 'ok' | 'error'; texto: string } }) {
  return (
    <div style={{
      ...s.aviso,
      background: a.tipo === 'ok' ? '#E6F4EA' : '#FDF2F2',
      color: a.tipo === 'ok' ? '#1E6B3A' : '#9B1C1C',
    }}>
      {a.texto}
    </div>
  );
}

function Campo({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div style={{ flex: '1 1 180px', marginBottom: 10 }}>
      <label style={s.label}>{etiqueta}</label>
      {children}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  vacio: {
    background: '#fff', border: '1px solid #E4E4DF', borderRadius: 12,
    padding: '22px 24px', maxWidth: 620, marginBottom: 16,
  },
  vacioTitulo: { fontSize: 17, fontWeight: 700, color: '#14263F', margin: '0 0 8px' },
  vacioTexto: { fontSize: 13.5, color: '#5B6470', lineHeight: 1.65, margin: '0 0 16px' },

  cabecera: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    gap: 16, flexWrap: 'wrap', marginBottom: 14,
  },
  codigo: {
    fontFamily: "'Consolas','Courier New',monospace", fontSize: 11.5,
    color: '#5B6470', fontWeight: 600, letterSpacing: .5,
  },
  tituloPlan: { fontSize: 20, fontWeight: 700, color: '#14263F', margin: '3px 0 3px' },
  sub: { fontSize: 12.5, color: '#5B6470', margin: 0 },
  avance: {
    display: 'flex', alignItems: 'center', gap: 12,
    background: '#fff', border: '1px solid #E4E4DF', borderRadius: 10, padding: '10px 16px',
  },
  avanceCifra: { fontSize: 28, fontWeight: 700, lineHeight: 1, fontVariantNumeric: 'tabular-nums' },
  avanceDetalle: { fontSize: 12, color: '#5B6470', lineHeight: 1.45 },
  avanceMeses: { fontSize: 11, color: '#8A929C', marginTop: 2 },

  bloque: {
    background: '#fff', border: '1px solid #E4E4DF', borderRadius: 12,
    padding: '16px 18px', marginBottom: 14,
  },
  filaTitulo: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    gap: 12, flexWrap: 'wrap',
  },
  h3: { fontSize: 14.5, fontWeight: 700, color: '#14263F', margin: '0 0 10px' },
  nota: { fontSize: 12, color: '#5B6470', lineHeight: 1.6, margin: '0 0 12px' },
  fila: { display: 'flex', gap: 12, flexWrap: 'wrap' },
  label: { display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5, color: '#14263F' },
  input: {
    width: '100%', padding: '8px 11px', border: '1px solid #E4E4DF',
    borderRadius: 8, fontSize: 13, boxSizing: 'border-box',
    fontFamily: 'inherit', background: '#fff', color: '#14263F',
  },

  formActividad: {
    background: '#F7F7F4', border: '1px solid #E4E4DF',
    borderRadius: 10, padding: '14px 16px', marginBottom: 14,
  },
  meses: { display: 'flex', gap: 4, flexWrap: 'wrap' },
  mes: {
    width: 30, height: 30, border: '1px solid #E4E4DF', borderRadius: 6,
    background: '#fff', fontSize: 11.5, fontWeight: 700, color: '#5B6470', cursor: 'pointer',
  },

  contenedor: { overflowX: 'auto', border: '1px solid #E4E4DF', borderRadius: 10 },
  tabla: { width: '100%', borderCollapse: 'collapse', fontSize: 12.5, minWidth: 820 },
  th: {
    textAlign: 'left', padding: '9px 10px', background: '#F7F7F4', color: '#5B6470',
    fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: .4,
    borderBottom: '1px solid #E4E4DF', whiteSpace: 'nowrap',
  },
  thMes: {
    padding: '9px 2px', background: '#F7F7F4', color: '#5B6470',
    fontSize: 10, fontWeight: 700, borderBottom: '1px solid #E4E4DF',
    textAlign: 'center', width: 22,
  },
  td: { padding: '9px 10px', borderBottom: '1px solid #F0F0EC', verticalAlign: 'top' },
  tdMes: { padding: '9px 2px', borderBottom: '1px solid #F0F0EC', textAlign: 'center' },
  celdaMes: {
    display: 'inline-block', width: 14, height: 14, borderRadius: 3, background: '#C8CDD2',
  },
  meta: { fontSize: 11, color: '#8A929C', marginTop: 2 },
  atrasada: { fontSize: 10.5, fontWeight: 700, color: '#9B1C1C', marginTop: 3 },
  chip: {
    display: 'inline-block', padding: '3px 9px', borderRadius: 20,
    fontSize: 10.5, fontWeight: 700, whiteSpace: 'nowrap',
  },
  itemPlan: {
    fontSize: 12.5, color: '#5B6470', padding: '7px 0',
    borderBottom: '1px solid #F0F0EC',
  },

  aviso: { padding: '10px 13px', borderRadius: 8, fontSize: 13, marginBottom: 14 },
  acciones: { display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 10 },
  botonPlano: {
    background: 'none', border: 'none', color: '#5B6470',
    fontSize: 12.5, fontWeight: 600, cursor: 'pointer', padding: '8px 12px',
  },
  barraDoc: { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 },
  botonDoc: {
    background: '#fff', border: '1px solid #E4E4DF', borderRadius: 8,
    padding: '9px 16px', fontSize: 13, fontWeight: 600,
    color: '#14263F', cursor: 'pointer',
  },
  botonPlanoDoc: {
    background: 'none', border: 'none', color: '#5B6470',
    fontSize: 12.5, fontWeight: 600, cursor: 'pointer', padding: '8px 12px',
  },
  notaDoc: { fontSize: 11.5, color: '#8A929C', margin: '4px 0 10px', lineHeight: 1.55 },
  enlaceCaja: {
    background: '#F7F7F4', border: '1px solid #E4E4DF',
    borderRadius: 9, padding: '11px 13px', marginBottom: 14,
  },
  enlaceTitulo: { fontSize: 12, fontWeight: 700, color: '#14263F', marginBottom: 5 },
  enlaceUrl: {
    display: 'block', fontFamily: "'Consolas','Courier New',monospace",
    fontSize: 11.5, color: '#374151', wordBreak: 'break-all', lineHeight: 1.5,
  },
  botonSec: {
    borderWidth: 1, borderStyle: 'solid', borderRadius: 8,
    padding: '8px 16px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
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
