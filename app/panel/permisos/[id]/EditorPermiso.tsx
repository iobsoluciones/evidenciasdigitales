'use client';

/**
 * EDITOR DEL PERMISO DE ALTO RIESGO
 * ---------------------------------------------------------------
 * Pensado para diligenciarse de pie, con el celular: la lista de
 * verificación va en botones grandes, uno por requisito, igual que la
 * ejecución de inspecciones.
 *
 * La aptitud médica se muestra VIVA mientras el permiso es borrador —lo
 * que hace falta ver antes de emitir— y CONGELADA una vez autorizado,
 * porque el documento debe poder mostrar mañana lo que se verificó hoy.
 *
 * Autorizar es emitir: exige requisitos de norma verificados, los roles
 * que pide cada tarea y todas las firmas. Si a alguien le falta aptitud
 * médica se puede autorizar igual, pero dejando constancia escrita.
 */
import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  guardarPermiso, responderRequisito, guardarParticipante, eliminarParticipante,
  autorizarPermiso, cerrarPermiso, cancelarPermiso,
  enviarEnlaceFirmaPermiso, obtenerEnlaceFirmaPermiso, enviarPermiso,
  type Permiso, type Requisito, type Participante,
  type RolPermiso, type ResultadoReq,
} from '@/lib/acciones-permisos';

const ROLES: { v: RolPermiso; t: string }[] = [
  { v: 'ejecuta', t: 'Ejecuta la tarea' },
  { v: 'autoriza', t: 'Autoriza el permiso' },
  { v: 'vigia', t: 'Vigía / ayudante de seguridad' },
  { v: 'coordinador_alturas', t: 'Coordinador de trabajo en alturas' },
];

const RESULTADOS: { v: ResultadoReq; t: string; fondo: string; color: string }[] = [
  { v: 'cumple', t: 'Cumple', fondo: '#E6F4EA', color: '#1E6B3A' },
  { v: 'no_cumple', t: 'No cumple', fondo: '#FDF2F2', color: '#9B1C1C' },
  { v: 'no_aplica', t: 'No aplica', fondo: '#F0F0EC', color: '#5B6470' },
];

const VACIO = {
  id: undefined as string | undefined,
  empleadoId: '', nombre: '', identificacion: '', cargo: '', correo: '',
  rol: 'ejecuta' as RolPermiso,
};

export default function EditorPermiso({
  permiso,
  requisitos,
  participantes,
  empleados,
  color,
}: {
  permiso: Permiso;
  requisitos: Requisito[];
  participantes: Participante[];
  empleados: Array<{ id: string; nombres: string; identificacion: string; cargo: string | null }>;
  color: string;
}) {
  const router = useRouter();
  const [pendiente, startTransition] = useTransition();
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);
  const [hecho, setHecho] = useState(false);
  const [enlace, setEnlace] = useState<{ nombre: string; url: string } | null>(null);
  const [formP, setFormP] = useState<typeof VACIO | null>(null);
  const [justificando, setJustificando] = useState<{ texto: string } | null>(null);
  const [cerrando, setCerrando] = useState<{ texto: string } | null>(null);
  const [cancelando, setCancelando] = useState<{ texto: string } | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [correo, setCorreo] = useState({ para: '', mensaje: '' });

  const borrador = permiso.estado === 'borrador';

  const [form, setForm] = useState({
    fecha: permiso.fecha,
    horaInicio: permiso.hora_inicio.slice(0, 5),
    horaFin: permiso.hora_fin.slice(0, 5),
    lugar: permiso.lugar ?? '',
    descripcion: permiso.descripcion,
    ejecutor: permiso.ejecutor,
    contratista: permiso.contratista ?? '',
    altura: permiso.altura_m !== null ? String(permiso.altura_m) : '',
    medicion: permiso.medicion_atmosfera ?? '',
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
      const r = await guardarPermiso(permiso.id, {
        ...form,
        alturaM: form.altura ? Number(form.altura) : null,
      });
      setAviso({ tipo: r.ok ? 'ok' : 'error', texto: r.mensaje });
      if (r.ok) {
        setHecho(true);
        setTimeout(() => setHecho(false), 2600);
        router.refresh();
      }
    });
  }

  function autorizar(justificacion = '') {
    setAviso(null);
    startTransition(async () => {
      const r = await autorizarPermiso(permiso.id, justificacion);
      if (!r.ok && r.requiereJustificacion) {
        setJustificando({ texto: '' });
        setAviso({ tipo: 'error', texto: r.mensaje });
        return;
      }
      setAviso({ tipo: r.ok ? 'ok' : 'error', texto: r.mensaje });
      if (r.ok) { setJustificando(null); router.refresh(); }
    });
  }

  function pedirFirma(q: Participante) {
    setAviso(null);
    startTransition(async () => {
      const r = await enviarEnlaceFirmaPermiso(q.id, permiso.id);
      if (r.enlace) setEnlace({ nombre: q.nombre, url: r.enlace });
      setAviso({ tipo: r.ok ? 'ok' : 'error', texto: r.mensaje });
      router.refresh();
    });
  }

  function verEnlace(q: Participante) {
    setAviso(null);
    startTransition(async () => {
      const r = await obtenerEnlaceFirmaPermiso(q.id);
      if (r.enlace) {
        setEnlace({ nombre: q.nombre, url: r.enlace });
        setAviso({ tipo: 'ok', texto: 'Enlace generado. Cópialo de abajo.' });
      } else {
        setAviso({ tipo: 'error', texto: r.mensaje });
      }
      router.refresh();
    });
  }

  const obligatorios = requisitos.filter((r) => r.obligatorio);
  const faltanReq = obligatorios.filter((r) => r.resultado === 'sin_verificar').length;
  const incumplen = obligatorios.filter((r) => r.resultado === 'no_cumple').length;
  const sinFirma = participantes.filter((q) => !q.firmado).length;
  const sinAptitud = participantes.filter(
    (q) => q.rol !== 'autoriza' && (borrador ? q.aptitud_hoy?.apto === false : q.apto === false)
  );

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

      {/* ---------- Estado ---------- */}
      <div style={{
        ...s.estado,
        background: permiso.vencido ? '#FDF2F2'
          : permiso.estado === 'autorizado' ? '#E6F4EA' : '#F7F7F4',
        borderColor: permiso.vencido ? '#F3C7C7'
          : permiso.estado === 'autorizado' ? '#BFE3CB' : '#E4E4DF',
      }}>
        <strong style={{
          color: permiso.vencido ? '#9B1C1C'
            : permiso.estado === 'autorizado' ? '#1E6B3A' : '#5B6470',
        }}>
          {permiso.vencido ? 'VENCIDO'
            : permiso.estado === 'borrador' ? 'BORRADOR'
            : permiso.estado.toUpperCase()}
        </strong>
        {' — '}
        {permiso.vencido
          ? 'la franja horaria terminó: este permiso ya no autoriza la tarea. Ciérralo dejando cómo quedó el área.'
          : permiso.estado === 'borrador'
            ? 'sin autorizar todavía. No habilita ninguna tarea.'
            : permiso.estado === 'autorizado'
              ? `autoriza la tarea solo entre ${permiso.hora_inicio.slice(0, 5)} y ${permiso.hora_fin.slice(0, 5)}.`
              : permiso.estado === 'cerrado'
                ? 'tarea terminada y área verificada.'
                : 'permiso cancelado.'}
      </div>

      <div style={s.barra}>
        <a href={`/api/pdf-permiso/${permiso.id}`} target="_blank" rel="noopener"
          style={{ ...s.botonSec, textDecoration: 'none' }}>
          Descargar PDF
        </a>
        <button type="button" style={s.botonSec} onClick={() => setEnviando(true)}>
          Enviar por correo
        </button>
        {borrador && (
          <button type="button" disabled={pendiente}
            style={{ ...s.botonLleno, background: color }}
            onClick={() => autorizar()}>
            Autorizar permiso
          </button>
        )}
        {permiso.estado === 'autorizado' && (
          <button type="button" style={{ ...s.botonLleno, background: color }}
            onClick={() => setCerrando({ texto: '' })}>
            Cerrar permiso
          </button>
        )}
        {permiso.estado !== 'cerrado' && permiso.estado !== 'cancelado' && (
          <button type="button" style={{ ...s.botonSec, color: '#9B1C1C' }}
            onClick={() => setCancelando({ texto: '' })}>
            Cancelar
          </button>
        )}
      </div>

      {/* ---------- Diálogos ---------- */}
      {justificando && (
        <section style={{ ...s.bloque, borderColor: '#F3C7C7' }}>
          <div style={s.h3}>Constancia por falta de aptitud médica</div>
          <p style={s.nota}>
            {sinAptitud.map((q) => q.nombre).join(', ')} no tiene aptitud médica
            vigente registrada. Puedes autorizar igual, pero queda escrito en el
            permiso por qué se hizo. Prohibirlo del todo llevaría a trabajar sin
            permiso, que es peor.
          </p>
          <textarea rows={3} value={justificando.texto}
            style={{ ...s.input, resize: 'vertical' }}
            placeholder="El contratista aportó el certificado de aptitud en físico, se anexa al expediente."
            onChange={(e) => setJustificando({ texto: e.target.value })} />
          <div style={s.acciones}>
            <button type="button" style={s.botonPlano} onClick={() => setJustificando(null)}>
              Cancelar
            </button>
            <button type="button" disabled={pendiente || !justificando.texto.trim()}
              style={{ ...s.botonLleno, background: color }}
              onClick={() => autorizar(justificando.texto)}>
              Autorizar con constancia
            </button>
          </div>
        </section>
      )}

      {cerrando && (
        <section style={s.bloque}>
          <div style={s.h3}>Cerrar el permiso</div>
          <label style={s.label}>Cómo quedó el área</label>
          <textarea rows={3} value={cerrando.texto}
            style={{ ...s.input, resize: 'vertical' }}
            placeholder="Tarea terminada, herramienta retirada, área despejada y sin novedad."
            onChange={(e) => setCerrando({ texto: e.target.value })} />
          <p style={s.ayuda}>Es la mitad útil del cierre: sin esto solo queda la hora.</p>
          <div style={s.acciones}>
            <button type="button" style={s.botonPlano} onClick={() => setCerrando(null)}>
              Cancelar
            </button>
            <button type="button" disabled={pendiente}
              style={{ ...s.botonLleno, background: color }}
              onClick={() => {
                correr(() => cerrarPermiso(permiso.id, cerrando.texto));
                setCerrando(null);
              }}>
              Cerrar
            </button>
          </div>
        </section>
      )}

      {cancelando && (
        <section style={s.bloque}>
          <div style={s.h3}>Cancelar el permiso</div>
          <label style={s.label}>Por qué se cancela</label>
          <input value={cancelando.texto} style={s.input}
            placeholder="Se suspendió por lluvia"
            onChange={(e) => setCancelando({ texto: e.target.value })} />
          <div style={s.acciones}>
            <button type="button" style={s.botonPlano} onClick={() => setCancelando(null)}>
              Volver
            </button>
            <button type="button" disabled={pendiente}
              style={{ ...s.botonLleno, background: '#9B1C1C' }}
              onClick={() => {
                correr(() => cancelarPermiso(permiso.id, cancelando.texto));
                setCancelando(null);
              }}>
              Cancelar el permiso
            </button>
          </div>
        </section>
      )}

      {enviando && (
        <section style={s.bloque}>
          <div style={s.h3}>Enviar el permiso</div>
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
              style={{ ...s.botonLleno, background: color }}
              onClick={() => {
                correr(() => enviarPermiso(permiso.id, correo.para, correo.mensaje));
                setEnviando(false);
              }}>
              Enviar
            </button>
          </div>
        </section>
      )}

      {/* ---------- Datos ---------- */}
      <section style={s.bloque}>
        <div style={s.h3}>La tarea</div>
        <div style={s.fila}>
          <Campo etiqueta="Fecha" ancho={140}>
            <input type="date" value={form.fecha} style={s.input} disabled={!borrador}
              onChange={(e) => setForm({ ...form, fecha: e.target.value })} />
          </Campo>
          <Campo etiqueta="Desde" ancho={110}>
            <input type="time" value={form.horaInicio} style={s.input} disabled={!borrador}
              onChange={(e) => setForm({ ...form, horaInicio: e.target.value })} />
          </Campo>
          <Campo etiqueta="Hasta" ancho={110}>
            <input type="time" value={form.horaFin} style={s.input} disabled={!borrador}
              onChange={(e) => setForm({ ...form, horaFin: e.target.value })} />
          </Campo>
          <Campo etiqueta="Lugar" ancho={220}>
            <input value={form.lugar} style={s.input} disabled={!borrador}
              onChange={(e) => setForm({ ...form, lugar: e.target.value })} />
          </Campo>
        </div>

        <div style={s.fila}>
          <Campo etiqueta="Quién ejecuta" ancho={160}>
            <select value={form.ejecutor} style={s.input} disabled={!borrador}
              onChange={(e) => setForm({
                ...form, ejecutor: e.target.value as 'propia' | 'contratista',
              })}>
              <option value="propia">Personal propio</option>
              <option value="contratista">Contratista</option>
            </select>
          </Campo>
          {form.ejecutor === 'contratista' && (
            <Campo etiqueta="Empresa contratista" ancho={220}>
              <input value={form.contratista} style={s.input} disabled={!borrador}
                onChange={(e) => setForm({ ...form, contratista: e.target.value })} />
            </Campo>
          )}
          {permiso.tipo === 'alturas' && (
            <Campo etiqueta="Altura (m)" ancho={120}>
              <input value={form.altura} style={s.input} inputMode="decimal" disabled={!borrador}
                onChange={(e) => setForm({ ...form, altura: e.target.value.replace(/[^0-9.,]/g, '') })} />
            </Campo>
          )}
        </div>

        <Campo etiqueta="Qué se va a hacer" ancho={9999}>
          <textarea rows={2} value={form.descripcion} style={{ ...s.input, resize: 'vertical' }}
            disabled={!borrador}
            onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
        </Campo>

        {permiso.tipo === 'espacios_confinados' && (
          <Campo etiqueta="Medición de atmósfera" ancho={9999}
            ayuda="Oxígeno, inflamables y tóxicos, con la hora de la medición.">
            <textarea rows={2} value={form.medicion} style={{ ...s.input, resize: 'vertical' }}
              disabled={!borrador}
              placeholder="O2 20,9 % · LEL 0 % · H2S 0 ppm · CO 0 ppm — medido a las 07:50"
              onChange={(e) => setForm({ ...form, medicion: e.target.value })} />
          </Campo>
        )}

        {borrador && (
          <div style={s.acciones}>
            <button type="button" onClick={guardar} disabled={pendiente}
              style={{
                ...s.botonLleno,
                background: hecho ? '#1E6B3A' : pendiente ? '#cbd5e1' : color,
              }}>
              {hecho ? '✓ Guardado' : pendiente ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        )}
      </section>

      {/* ---------- Lista de verificación ---------- */}
      <section style={s.bloque}>
        <div style={s.h3}>
          Lista de verificación
          {borrador && (faltanReq > 0 || incumplen > 0) && (
            <span style={s.contador}>
              {faltanReq > 0 && `faltan ${faltanReq} de norma`}
              {faltanReq > 0 && incumplen > 0 && ' · '}
              {incumplen > 0 && `${incumplen} en no cumple`}
            </span>
          )}
        </div>
        <p style={s.nota}>
          Lo marcado <strong>NORMA</strong> lo exige la resolución y bloquea la
          emisión del permiso. Lo marcado <strong>criterio técnico</strong> es
          buena práctica: se advierte, pero no bloquea.
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
            </div>
            {r.fundamento && <div style={s.fundamento}>{r.fundamento}</div>}
            <div style={s.opciones}>
              {RESULTADOS.map((res) => (
                <button key={res.v} type="button" disabled={!borrador || pendiente}
                  onClick={() => correr(() =>
                    responderRequisito(r.id, res.v, r.observacion ?? '', permiso.id))}
                  style={{
                    ...s.opcion,
                    ...(r.resultado === res.v
                      ? { background: res.fondo, color: res.color, borderColor: res.color, fontWeight: 700 }
                      : {}),
                    cursor: borrador ? 'pointer' : 'default',
                  }}>
                  {res.t}
                </button>
              ))}
              {r.observacion && <span style={s.observacion}>{r.observacion}</span>}
            </div>
          </div>
        ))}
      </section>

      {/* ---------- Personal ---------- */}
      <section style={s.bloque}>
        <div style={s.h3}>
          Personal y firmas
          {borrador && sinFirma > 0 && (
            <span style={s.contador}>{sinFirma} sin firmar</span>
          )}
        </div>
        <p style={s.nota}>
          El permiso no autoriza nada hasta que todos firman. Quien autoriza
          suele estar en otra sede: mándale el enlace.
        </p>

        {participantes.length === 0 && (
          <p style={s.vacio}>Sin personal registrado.</p>
        )}

        {participantes.map((q) => {
          const apt = borrador ? q.aptitud_hoy : { apto: q.apto, detalle: q.aptitud_detalle ?? '' };
          return (
            <div key={q.id} style={s.persona}>
              <div style={{ flex: '1 1 220px', minWidth: 0 }}>
                <div style={s.personaNombre}>{q.nombre}</div>
                <div style={s.personaMeta}>
                  {ROLES.find((x) => x.v === q.rol)?.t ?? q.rol}
                  {q.cargo ? ` · ${q.cargo}` : ''}
                  {q.correo ? ` · ${q.correo}` : ' · sin correo'}
                </div>
                {q.rol !== 'autoriza' && apt && (
                  <div style={{
                    ...s.aptitud,
                    background: apt.apto === false ? '#FDF2F2'
                      : apt.apto === null ? '#F0F0EC' : '#E6F4EA',
                    color: apt.apto === false ? '#9B1C1C'
                      : apt.apto === null ? '#5B6470' : '#1E6B3A',
                  }}>
                    {apt.detalle}
                  </div>
                )}
              </div>

              <span style={{
                ...s.chip,
                background: q.firmado ? '#E6F4EA' : '#FEF3C7',
                color: q.firmado ? '#1E6B3A' : '#92400E',
              }}>
                {q.firmado ? 'Firmó' : q.tiene_token ? 'Enlace enviado' : 'Sin firmar'}
              </span>

              {borrador && (
                <div style={s.accionesPersona}>
                  {!q.firmado && (
                    <>
                      <button type="button" style={s.botonMini} disabled={pendiente}
                        onClick={() => pedirFirma(q)}>
                        Enviar enlace
                      </button>
                      <button type="button" style={s.botonMini} disabled={pendiente}
                        onClick={() => verEnlace(q)}>
                        Ver enlace
                      </button>
                    </>
                  )}
                  <button type="button" style={s.botonMini} disabled={pendiente}
                    onClick={() => setFormP({
                      id: q.id, empleadoId: q.empleado_id ?? '',
                      nombre: q.nombre, identificacion: q.identificacion ?? '',
                      cargo: q.cargo ?? '', correo: q.correo ?? '', rol: q.rol,
                    })}>
                    Editar
                  </button>
                  {!q.firmado && (
                    <button type="button" style={{ ...s.botonMini, color: '#9B1C1C' }}
                      disabled={pendiente}
                      onClick={() => correr(() => eliminarParticipante(q.id, permiso.id))}>
                      Quitar
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {enlace && (
          <div style={s.enlaceCaja}>
            <div style={s.enlaceTitulo}>Enlace de firma de {enlace.nombre}</div>
            <code style={s.enlaceUrl}>{enlace.url}</code>
            <p style={s.ayuda}>Cópialo si el correo no llega: sirve por WhatsApp igual.</p>
          </div>
        )}

        {borrador && !formP && (
          <button type="button" style={{ ...s.botonSec, marginTop: 10 }}
            onClick={() => setFormP({ ...VACIO })}>
            + Agregar persona
          </button>
        )}

        {formP && (
          <div style={s.subBloque}>
            <div style={s.h4}>{formP.id ? 'Editar persona' : 'Agregar persona'}</div>
            <Campo etiqueta="Empleado"
              ayuda="Si es de un contratista, déjalo vacío: la aptitud médica habrá que verificarla con ellos."
              ancho={9999}>
              <select value={formP.empleadoId} style={s.input}
                onChange={(e) => setFormP({ ...formP, empleadoId: e.target.value })}>
                <option value="">— Persona externa —</option>
                {empleados.map((x) => (
                  <option key={x.id} value={x.id}>{x.nombres} · {x.identificacion}</option>
                ))}
              </select>
            </Campo>
            {!formP.empleadoId && (
              <div style={s.fila}>
                <Campo etiqueta="Nombre" ancho={200}>
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
              </div>
            )}
            <div style={s.fila}>
              <Campo etiqueta="Correo" ayuda="Aquí llega el enlace de firma." ancho={220}>
                <input value={formP.correo} type="email" style={s.input}
                  onChange={(e) => setFormP({ ...formP, correo: e.target.value })} />
              </Campo>
              <Campo etiqueta="Papel en el permiso" ancho={230}>
                <select value={formP.rol} style={s.input}
                  onChange={(e) => setFormP({ ...formP, rol: e.target.value as RolPermiso })}>
                  {ROLES.map((x) => <option key={x.v} value={x.v}>{x.t}</option>)}
                </select>
              </Campo>
            </div>
            <div style={s.acciones}>
              <button type="button" style={s.botonPlano} onClick={() => setFormP(null)}>
                Cancelar
              </button>
              <button type="button" disabled={pendiente}
                style={{ ...s.botonLleno, background: color }}
                onClick={() => {
                  correr(() => guardarParticipante(permiso.id, formP));
                  setFormP(null);
                }}>
                Guardar
              </button>
            </div>
          </div>
        )}
      </section>

      {permiso.aptitud_justificacion && (
        <section style={s.bloque}>
          <div style={s.h3}>Constancia por falta de aptitud médica</div>
          <p style={s.parrafo}>{permiso.aptitud_justificacion}</p>
        </section>
      )}

      {permiso.cierre_observaciones && (
        <section style={s.bloque}>
          <div style={s.h3}>Cierre</div>
          <p style={s.parrafo}>{permiso.cierre_observaciones}</p>
        </section>
      )}

      {permiso.cancelado_motivo && (
        <section style={s.bloque}>
          <div style={s.h3}>Motivo de la cancelación</div>
          <p style={s.parrafo}>{permiso.cancelado_motivo}</p>
        </section>
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
    padding: '11px 15px', borderRadius: 9, fontSize: 13,
    boxShadow: '0 6px 20px rgba(20,38,63,.16)',
  },
  estado: {
    borderWidth: 1, borderStyle: 'solid', borderRadius: 10,
    padding: '12px 15px', fontSize: 13, color: '#374151',
    lineHeight: 1.6, marginBottom: 14,
  },
  barra: { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 },

  bloque: {
    background: '#fff', borderWidth: 1, borderStyle: 'solid', borderColor: '#E4E4DF',
    borderRadius: 12, padding: '15px 17px', marginBottom: 14,
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
  parrafo: { fontSize: 13, color: '#374151', lineHeight: 1.65, margin: 0 },
  vacio: { fontSize: 12.5, color: '#9CA3AF', fontStyle: 'italic', margin: '0 0 8px' },

  fila: { display: 'flex', gap: 12, flexWrap: 'wrap' },
  label: { display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5, color: '#14263F' },
  input: {
    width: '100%', padding: '8px 11px', border: '1px solid #E4E4DF',
    borderRadius: 8, fontSize: 13, boxSizing: 'border-box',
    fontFamily: 'inherit', background: '#fff', color: '#14263F',
  },
  ayuda: { fontSize: 11.5, color: '#8A929C', margin: '4px 0 0', lineHeight: 1.5 },

  requisito: { padding: '11px 0', borderTop: '1px solid #F0F0EC' },
  reqCab: { display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap' },
  etiqueta: {
    fontSize: 9.5, fontWeight: 700, letterSpacing: .3,
    padding: '2px 7px', borderRadius: 4, whiteSpace: 'nowrap',
  },
  reqTexto: { fontSize: 13, color: '#14263F', flex: '1 1 240px', lineHeight: 1.45 },
  fundamento: { fontSize: 11, color: '#8A929C', margin: '3px 0 7px' },
  opciones: { display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' },
  opcion: {
    background: '#fff', border: '1px solid #E4E4DF', borderRadius: 8,
    padding: '7px 16px', fontSize: 12.5, color: '#5B6470',
  },
  observacion: { fontSize: 11.5, color: '#5B6470', fontStyle: 'italic', marginLeft: 6 },

  persona: {
    display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap',
    padding: '11px 0', borderTop: '1px solid #F0F0EC',
  },
  personaNombre: { fontSize: 13, fontWeight: 700, color: '#14263F' },
  personaMeta: { fontSize: 11.5, color: '#8A929C', marginTop: 2, lineHeight: 1.4 },
  aptitud: {
    fontSize: 11.5, borderRadius: 7, padding: '5px 9px',
    marginTop: 5, lineHeight: 1.45, display: 'inline-block',
  },
  chip: {
    fontSize: 10.5, fontWeight: 700, padding: '3px 10px',
    borderRadius: 20, whiteSpace: 'nowrap',
  },
  accionesPersona: { display: 'flex', gap: 4, flexWrap: 'wrap' },

  enlaceCaja: {
    background: '#F7F7F4', border: '1px solid #E4E4DF',
    borderRadius: 9, padding: '11px 13px', marginTop: 12,
  },
  enlaceTitulo: { fontSize: 12, fontWeight: 700, color: '#14263F', marginBottom: 5 },
  enlaceUrl: {
    display: 'block', fontFamily: "'Consolas','Courier New',monospace",
    fontSize: 11.5, color: '#374151', wordBreak: 'break-all', lineHeight: 1.5,
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
