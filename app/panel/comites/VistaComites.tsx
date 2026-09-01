'use client';

/**
 * COMITÉS — COPASST / Vigía y Convivencia Laboral
 * ---------------------------------------------------------------
 * La pantalla no es un formulario: es un CONTROL. Arriba muestra lo que
 * la norma exige según los trabajadores activos de la empresa, y abajo
 * lo que hay. La diferencia entre ambos es el hallazgo que hoy nadie
 * detecta hasta la visita del Ministerio.
 *
 * Los integrantes van en dos columnas —empleador y trabajadores—
 * porque la paridad es lo que exige la norma y así se ve sin contar.
 *
 * La BRIGADA no se agrupa por parte sino por FRENTE (primeros auxilios,
 * control de incendios, evacuación y rescate): en la brigada nadie
 * representa a nadie, y lo que hay que ver de un vistazo es si algún
 * frente quedó sin cubrir.
 */
import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { crearClienteNavegador } from '@/lib/supabase/cliente';
import {
  crearComite, guardarMiembro, quitarMiembro, enviarOrganigrama,
  guardarActa, obtenerEnlaceFirmaComite, cerrarActa, enviarActaComite,
  type ComiteResumen, type Comite, type Miembro, type Validacion,
  type TipoComite, type Parte, type RolComite, type Frente,
} from '@/lib/acciones-comites';

const TIPOS: Record<TipoComite, { t: string; norma: string }> = {
  copasst: { t: 'COPASST', norma: 'Resolución 2013 de 1986' },
  vigia: { t: 'Vigía en SST', norma: 'Decreto 1295 de 1994, art. 35' },
  convivencia: {
    t: 'Comité de Convivencia Laboral',
    norma: 'Res. 652 de 2012, modificada por la 1356 de 2012',
  },
  brigada: {
    t: 'Brigada de emergencia',
    norma: 'Dec. 1072 de 2015, art. 2.2.4.6.25 · Res. 0312 est. 5.1.2',
  },
};

const ROLES: { v: RolComite; t: string }[] = [
  { v: 'presidente', t: 'Presidente' },
  { v: 'secretario', t: 'Secretario' },
  { v: 'integrante', t: 'Integrante' },
];

const ROLES_BRIGADA: { v: RolComite; t: string }[] = [
  { v: 'jefe', t: 'Jefe de brigada' },
  { v: 'brigadista', t: 'Brigadista' },
];

const FRENTES: { v: Frente; t: string }[] = [
  { v: 'primeros_auxilios', t: 'Primeros auxilios' },
  { v: 'incendios', t: 'Control de incendios' },
  { v: 'evacuacion', t: 'Evacuación y rescate' },
];

const rotulo = (r: RolComite) =>
  [...ROLES, ...ROLES_BRIGADA].find((x) => x.v === r)?.t ?? r;

const VACIO = {
  id: undefined as string | undefined,
  empleadoId: '', nombre: '', identificacion: '', cargo: '',
  parte: 'trabajadores' as Parte, suplente: false, rol: 'integrante' as RolComite,
  frente: '' as Frente | '',
  // Cuando se entra por «+ Agregar» de una columna, la columna YA dijo a
  // quién representa (o a qué frente va): repreguntarlo es invitar a
  // equivocarse, porque el formulario se abre lejos de la columna.
  fijo: false,
};

export default function VistaComites({
  comites,
  detalle,
  empleados,
  orgId,
  color,
}: {
  comites: ComiteResumen[];
  detalle: {
    comite?: Comite; miembros?: Miembro[]; validacion?: Validacion;
  } | null;
  empleados: Array<{ id: string; nombres: string; identificacion: string; cargo: string | null }>;
  orgId: string;
  color: string;
}) {
  const router = useRouter();
  const supabase = crearClienteNavegador();
  const fotoRef = useRef<HTMLInputElement>(null);
  const [pendiente, startTransition] = useTransition();
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);
  const [nuevo, setNuevo] = useState<{ tipo: TipoComite; inicio: string; conformacion: string } | null>(null);
  const [form, setForm] = useState<typeof VACIO | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [correo, setCorreo] = useState({ para: '', mensaje: '' });
  const [subiendoFoto, setSubiendoFoto] = useState<string | null>(null);
  const [acta, setActa] = useState<{
    lugar: string; formaEleccion: string; observaciones: string;
  } | null>(null);
  const [enlace, setEnlace] = useState<{ nombre: string; url: string } | null>(null);
  const [enviandoActa, setEnviandoActa] = useState(false);
  const [correoActa, setCorreoActa] = useState({ para: '', mensaje: '' });

  const c = detalle?.comite;
  const miembros = detalle?.miembros ?? [];
  const v = detalle?.validacion;
  const esBrigada = c?.tipo === 'brigada';

  const correr = (fn: () => Promise<{ ok: boolean; mensaje: string }>) => {
    setAviso(null);
    startTransition(async () => {
      const r = await fn();
      setAviso({ tipo: r.ok ? 'ok' : 'error', texto: r.mensaje });
      if (r.ok) router.refresh();
    });
  };

  /** La foto va al bucket público de logos: es material de cartelera. */
  async function subirFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    if (!archivo || !subiendoFoto) return;

    const ext = archivo.name.split('.').pop() ?? 'jpg';
    const ruta = `${orgId}/comites/${subiendoFoto}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from('logos')
      .upload(ruta, archivo, { upsert: true });

    if (error) {
      setAviso({ tipo: 'error', texto: 'No se pudo subir la foto: ' + error.message });
    } else {
      const { data } = supabase.storage.from('logos').getPublicUrl(ruta);
      const m = miembros.find((x) => x.id === subiendoFoto);
      if (m) {
        correr(() => guardarMiembro(c!.id, {
          id: m.id, empleadoId: m.empleado_id, nombre: m.nombre,
          identificacion: m.identificacion ?? '', cargo: m.cargo_empresa ?? '',
          parte: m.parte, suplente: m.suplente, rol: m.rol, frente: m.frente,
          fotoUrl: data.publicUrl,
        }));
      }
    }
    setSubiendoFoto(null);
    if (fotoRef.current) fotoRef.current.value = '';
  }

  const porParte = (p: Parte) => miembros.filter((m) => m.parte === p && m.activo);
  const inactivos = miembros.filter((m) => !m.activo);

  return (
    <>
      {aviso && (
        <div style={{
          ...s.aviso,
          background: aviso.tipo === 'ok' ? '#E6F4EA' : '#FDF2F2',
          color: aviso.tipo === 'ok' ? '#1E6B3A' : '#9B1C1C',
        }}>{aviso.texto}</div>
      )}

      {/* ---------- Comités existentes ---------- */}
      <div style={s.rejilla}>
        {comites.map((x) => (
          <a key={x.id} href={`/panel/comites?id=${x.id}`} style={{
            ...s.tarjeta,
            borderColor: c?.id === x.id ? color : '#E4E4DF',
            boxShadow: c?.id === x.id ? `0 0 0 1px ${color}` : undefined,
          }}>
            <div style={s.tarjetaCab}>
              <h3 style={s.tarjetaNombre}>{TIPOS[x.tipo]?.t ?? x.tipo}</h3>
              <span style={{
                ...s.chip,
                background: x.conforme && !x.vencido ? '#E6F4EA' : '#FDF2F2',
                color: x.conforme && !x.vencido ? '#1E6B3A' : '#9B1C1C',
              }}>
                {x.vencido ? 'Vencido' : x.conforme ? 'Conforme' : 'Incompleto'}
              </span>
            </div>
            <div style={s.tarjetaMeta}>{x.codigo} · {x.integrantes} integrantes</div>
            <div style={s.tarjetaMeta}>
              Vence {x.periodo_fin}
              {!x.vencido && x.dias_restantes < 90 && ` · faltan ${x.dias_restantes} días`}
            </div>
          </a>
        ))}
      </div>

      {/* ---------- Conformar ---------- */}
      <div style={s.barra}>
        {!nuevo ? (
          <button type="button" style={{ ...s.botonSec, borderColor: color, color }}
            onClick={() => setNuevo({
              tipo: 'copasst',
              inicio: new Date().toISOString().slice(0, 10),
              conformacion: new Date().toISOString().slice(0, 10),
            })}>
            Conformar un comité
          </button>
        ) : (
          <div style={s.bloque}>
            <div style={s.h3}>Conformar un comité</div>
            <div style={s.fila}>
              <Campo etiqueta="Tipo">
                <select value={nuevo.tipo} style={s.input}
                  onChange={(e) => setNuevo({ ...nuevo, tipo: e.target.value as TipoComite })}>
                  <option value="copasst">COPASST</option>
                  <option value="vigia">Vigía en SST (menos de 10 trabajadores)</option>
                  <option value="convivencia">Comité de Convivencia Laboral</option>
                  <option value="brigada">Brigada de emergencia</option>
                </select>
              </Campo>
              <Campo etiqueta="Inicio del periodo"
                ayuda={nuevo.tipo === 'brigada'
                  ? 'La norma no fija periodo para la brigada: se abre a un año para revisar conformación, capacitación y dotación.'
                  : 'El periodo es de dos años.'}>
                <input type="date" value={nuevo.inicio} style={s.input}
                  onChange={(e) => setNuevo({ ...nuevo, inicio: e.target.value })} />
              </Campo>
              <Campo etiqueta="Fecha de conformación">
                <input type="date" value={nuevo.conformacion} style={s.input}
                  onChange={(e) => setNuevo({ ...nuevo, conformacion: e.target.value })} />
              </Campo>
            </div>
            <div style={s.acciones}>
              <button type="button" style={s.botonPlano} onClick={() => setNuevo(null)}>
                Cancelar
              </button>
              <button type="button" disabled={pendiente}
                style={{ ...s.botonLleno, background: color }}
                onClick={() => {
                  correr(() => crearComite(nuevo.tipo, nuevo.inicio, nuevo.conformacion));
                  setNuevo(null);
                }}>
                Conformar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ---------- Detalle ---------- */}
      {c && v && (
        <>
          {/* Lo que la norma exige frente a lo que hay */}
          <section style={{
            ...s.control,
            background: v.conforme ? '#E6F4EA' : '#FFF7ED',
            borderColor: v.conforme ? '#1E6B3A' : '#FED7AA',
          }}>
            <div style={s.controlCab}>
              <div>
                <div style={{ ...s.controlTitulo, color: v.conforme ? '#1E6B3A' : '#9A3412' }}>
                  {v.conforme ? 'Comité conforme a la norma' : 'El comité no cumple la composición exigida'}
                </div>
                <p style={s.controlNota}>
                  {v.requerido.nota} <span style={s.norma}>({v.requerido.norma})</span>
                </p>
              </div>
              <a href={`/api/pdf-organigrama/${c.id}`} style={s.botonMini} target="_blank" rel="noopener">
                Descargar organigrama
              </a>
            </div>

            {!v.conforme && (
              <ul style={s.fallas}>
                {v.fallas.map((f, i) => <li key={i} style={s.falla}>{f}</li>)}
              </ul>
            )}

            {v.recomendaciones?.length > 0 && (
              <div style={s.recomendaciones}>
                <div style={s.recomendacionesTitulo}>
                  Recomendaciones — criterio técnico, no exigencia legal
                </div>
                <ul style={s.fallas}>
                  {v.recomendaciones.map((r, i) => (
                    <li key={i} style={s.recomendacion}>{r}</li>
                  ))}
                </ul>
              </div>
            )}

            <p style={s.salvedad}>
              El cálculo usa los <strong>{v.requerido.trabajadores} empleados activos</strong> de
              la empresa. La norma habla de trabajadores: si hay contratistas, ajusta la
              composición a criterio propio.
            </p>
          </section>

          {/* ---------- El acta de conformación ---------- */}
          <section style={s.bloque}>
            <div style={s.h3}>
              Acta de conformación
              {c.acta_estado === 'cerrada' && (
                <span style={{ ...s.chip, background: '#E6F4EA', color: '#1E6B3A', marginLeft: 10 }}>
                  Cerrada
                </span>
              )}
            </div>
            <p style={s.nota}>
              El organigrama demuestra quién está; el acta demuestra que el comité
              se conformó, cómo se eligió y que sus integrantes lo aceptaron. Cada
              uno firma desde su enlace: los representantes de los trabajadores
              están en su puesto, no en la oficina.
            </p>

            <div style={s.barraActa}>
              <a href={`/api/pdf-acta-comite/${c.id}`} target="_blank" rel="noopener"
                style={{ ...s.botonMini, padding: '8px 14px' }}>
                Descargar acta
              </a>
              <button type="button" style={{ ...s.botonMini, padding: '8px 14px' }}
                onClick={() => setEnviandoActa(true)}>
                Enviar acta
              </button>
              {c.acta_estado !== 'cerrada' && (
                <>
                  <button type="button" style={{ ...s.botonMini, padding: '8px 14px' }}
                    onClick={() => setActa({
                      lugar: c.acta_lugar ?? '',
                      formaEleccion: c.acta_forma_eleccion ?? '',
                      observaciones: c.observaciones ?? '',
                    })}>
                    Editar datos del acta
                  </button>
                  <button type="button" disabled={pendiente}
                    style={{ ...s.botonLleno, background: color, padding: '8px 16px' }}
                    onClick={() => correr(() => cerrarActa(c.id))}>
                    Cerrar acta
                  </button>
                </>
              )}
            </div>

            {acta && (
              <div style={s.subBloqueActa}>
                <Campo etiqueta="Lugar de la reunión">
                  <input value={acta.lugar} style={s.input}
                    placeholder="Sala de juntas de la sede principal"
                    onChange={(e) => setActa({ ...acta, lugar: e.target.value })} />
                </Campo>
                <Campo etiqueta="Cómo se eligieron" ayuda="Los de los trabajadores por votación; los del empleador por designación.">
                  <textarea rows={2} value={acta.formaEleccion}
                    style={{ ...s.input, resize: 'vertical' }}
                    onChange={(e) => setActa({ ...acta, formaEleccion: e.target.value })} />
                </Campo>
                <Campo etiqueta="Observaciones">
                  <textarea rows={2} value={acta.observaciones}
                    style={{ ...s.input, resize: 'vertical' }}
                    onChange={(e) => setActa({ ...acta, observaciones: e.target.value })} />
                </Campo>
                <div style={s.acciones}>
                  <button type="button" style={s.botonPlano} onClick={() => setActa(null)}>
                    Cancelar
                  </button>
                  <button type="button" disabled={pendiente}
                    style={{ ...s.botonLleno, background: color }}
                    onClick={() => {
                      correr(() => guardarActa(c.id, acta));
                      setActa(null);
                    }}>
                    Guardar
                  </button>
                </div>
              </div>
            )}

            {enlace && (
              <div style={s.enlaceCaja}>
                <div style={s.enlaceTitulo}>Enlace de firma de {enlace.nombre}</div>
                <code style={s.enlaceUrl}>{enlace.url}</code>
              </div>
            )}

            {enviandoActa && (
              <div style={s.subBloqueActa}>
                <Campo etiqueta="Destinatarios" ayuda="Separa varios con coma.">
                  <input value={correoActa.para} style={s.input}
                    onChange={(e) => setCorreoActa({ ...correoActa, para: e.target.value })} />
                </Campo>
                <Campo etiqueta="Mensaje">
                  <textarea rows={2} value={correoActa.mensaje}
                    style={{ ...s.input, resize: 'vertical' }}
                    onChange={(e) => setCorreoActa({ ...correoActa, mensaje: e.target.value })} />
                </Campo>
                <div style={s.acciones}>
                  <button type="button" style={s.botonPlano} onClick={() => setEnviandoActa(false)}>
                    Cancelar
                  </button>
                  <button type="button" disabled={pendiente}
                    style={{ ...s.botonLleno, background: color }}
                    onClick={() => {
                      correr(() => enviarActaComite(c.id, correoActa.para, correoActa.mensaje));
                      setEnviandoActa(false);
                    }}>
                    Enviar
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* Envío por correo */}
          <div style={s.barra}>
            {!enviando ? (
              <button type="button" style={s.botonMini} onClick={() => setEnviando(true)}>
                Enviar organigrama por correo
              </button>
            ) : (
              <div style={s.bloque}>
                <div style={s.h3}>Enviar el organigrama</div>
                <Campo etiqueta="Destinatarios" ayuda="Separa varios con coma.">
                  <input value={correo.para} style={s.input}
                    onChange={(e) => setCorreo({ ...correo, para: e.target.value })} />
                </Campo>
                <Campo etiqueta="Mensaje">
                  <textarea rows={2} value={correo.mensaje} style={{ ...s.input, resize: 'vertical' }}
                    onChange={(e) => setCorreo({ ...correo, mensaje: e.target.value })} />
                </Campo>
                <div style={s.acciones}>
                  <button type="button" style={s.botonPlano} onClick={() => setEnviando(false)}>
                    Cancelar
                  </button>
                  <button type="button" disabled={pendiente}
                    style={{ ...s.botonLleno, background: color }}
                    onClick={() => {
                      correr(() => enviarOrganigrama(c.id, correo.para, correo.mensaje));
                      setEnviando(false);
                    }}>
                    Enviar
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Formulario de integrante */}
          {form && (
            <section style={s.bloque}>
              <div style={s.h3}>
                {form.id
                  ? 'Editar integrante'
                  : esBrigada
                    ? `Agregar brigadista${form.frente
                        ? ' — ' + FRENTES.find((f) => f.v === form.frente)?.t
                        : ''}`
                    : `Agregar integrante — representantes ${
                        form.parte === 'empleador' ? 'del empleador' : 'de los trabajadores'}`}
              </div>
              <Campo etiqueta="Empleado" ayuda="Si es alguien externo, déjalo vacío y escribe los datos.">
                <select value={form.empleadoId} style={s.input}
                  onChange={(e) => setForm({ ...form, empleadoId: e.target.value })}>
                  <option value="">— Persona externa —</option>
                  {empleados.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.nombres} · {x.identificacion}
                    </option>
                  ))}
                </select>
              </Campo>
              {!form.empleadoId && (
                <div style={s.fila}>
                  <Campo etiqueta="Nombre">
                    <input value={form.nombre} style={s.input}
                      onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
                  </Campo>
                  <Campo etiqueta="Identificación">
                    <input value={form.identificacion} style={s.input}
                      onChange={(e) => setForm({ ...form, identificacion: e.target.value })} />
                  </Campo>
                  <Campo etiqueta="Cargo en la empresa">
                    <input value={form.cargo} style={s.input}
                      onChange={(e) => setForm({ ...form, cargo: e.target.value })} />
                  </Campo>
                </div>
              )}
              <div style={s.fila}>
                {esBrigada ? (
                  <>
                    <Campo etiqueta="Frente"
                      ayuda="Los tres frentes deberían quedar cubiertos.">
                      <select value={form.frente} style={s.input}
                        onChange={(e) => setForm({ ...form, frente: e.target.value as Frente | '' })}>
                        <option value="">— Sin asignar —</option>
                        {FRENTES.map((f) => <option key={f.v} value={f.v}>{f.t}</option>)}
                      </select>
                    </Campo>
                    <Campo etiqueta="Rol en la brigada">
                      <select value={form.rol} style={s.input}
                        onChange={(e) => setForm({ ...form, rol: e.target.value as RolComite })}>
                        {ROLES_BRIGADA.map((r) => <option key={r.v} value={r.v}>{r.t}</option>)}
                      </select>
                    </Campo>
                  </>
                ) : (
                  <>
                    <Campo etiqueta="Representa a"
                      ayuda={form.fijo ? 'Lo define la columna desde la que se agregó.' : undefined}>
                      {form.fijo ? (
                        <div style={s.fijo}>
                          {form.parte === 'empleador' ? 'El empleador' : 'Los trabajadores'}
                        </div>
                      ) : (
                        <select value={form.parte} style={s.input}
                          onChange={(e) => setForm({ ...form, parte: e.target.value as Parte })}>
                          <option value="empleador">El empleador</option>
                          <option value="trabajadores">Los trabajadores</option>
                        </select>
                      )}
                    </Campo>
                    <Campo etiqueta="Condición">
                      <select value={form.suplente ? 'si' : 'no'} style={s.input}
                        onChange={(e) => setForm({ ...form, suplente: e.target.value === 'si' })}>
                        <option value="no">Principal</option>
                        <option value="si">Suplente</option>
                      </select>
                    </Campo>
                    <Campo etiqueta="Rol en el comité">
                      <select value={form.rol} style={s.input}
                        onChange={(e) => setForm({ ...form, rol: e.target.value as RolComite })}>
                        {ROLES.map((r) => <option key={r.v} value={r.v}>{r.t}</option>)}
                      </select>
                    </Campo>
                  </>
                )}
              </div>
              <div style={s.acciones}>
                <button type="button" style={s.botonPlano} onClick={() => setForm(null)}>
                  Cancelar
                </button>
                <button type="button" disabled={pendiente}
                  style={{ ...s.botonLleno, background: color }}
                  onClick={() => {
                    correr(() => guardarMiembro(c.id, form));
                    setForm(null);
                  }}>
                  Guardar
                </button>
              </div>
            </section>
          )}

          {/* Brigada: por frente. Los demás: por parte, que es la paridad. */}
          <div style={s.columnas}>
            {esBrigada
              ? ([...FRENTES.map((f) => f.v), ''] as Array<Frente | ''>).map((frente) => {
                const lista = miembros.filter(
                  (m) => m.activo && (m.frente ?? '') === frente);
                if (frente === '' && lista.length === 0) return null;
                return (
                  <section key={frente || 'sin'} style={s.columna}>
                    <div style={{
                      ...s.columnaTitulo,
                      background: frente ? color : '#8A929C',
                    }}>
                      {frente
                        ? FRENTES.find((f) => f.v === frente)!.t
                        : 'Sin frente asignado'}
                    </div>
                    {lista.length === 0 && <p style={{ ...s.vacio, paddingTop: 12 }}>Sin brigadistas</p>}
                    {lista.map((m) => (
                      <Tarjeta key={m.id} m={m} color={color} pendiente={pendiente}
                        onFoto={() => { setSubiendoFoto(m.id); fotoRef.current?.click(); }}
                        onEditar={() => setForm({
                          id: m.id, empleadoId: m.empleado_id ?? '',
                          nombre: m.nombre, identificacion: m.identificacion ?? '',
                          cargo: m.cargo_empresa ?? '', parte: m.parte,
                          suplente: m.suplente, rol: m.rol,
                          frente: m.frente ?? '', fijo: false,
                        })}
                        onQuitar={() => correr(() => quitarMiembro(m.id, 'Retirado de la brigada'))} />
                    ))}
                    {frente && (
                      <button type="button" style={{ ...s.botonMini, margin: '10px 14px 0' }}
                        onClick={() => setForm({
                          ...VACIO, parte: 'brigada', rol: 'brigadista',
                          frente, fijo: true,
                        })}>
                        + Agregar
                      </button>
                    )}
                  </section>
                );
              })
              : (['empleador', 'trabajadores'] as Parte[]).map((parte) => (
              <section key={parte} style={s.columna}>
                <div style={{ ...s.columnaTitulo, background: color }}>
                  {parte === 'empleador'
                    ? 'Representantes del empleador'
                    : 'Representantes de los trabajadores'}
                </div>

                {[false, true].map((esSuplente) => {
                  const lista = porParte(parte).filter((m) => m.suplente === esSuplente);
                  return (
                    <div key={String(esSuplente)}>
                      <div style={s.grupo}>{esSuplente ? 'Suplentes' : 'Principales'}</div>
                      {lista.length === 0 && <p style={s.vacio}>Sin designar</p>}
                      {lista.map((m) => (
                        <div key={m.id} style={s.miembro}>
                          {m.foto_url
                            /* eslint-disable-next-line @next/next/no-img-element */
                            ? <img src={m.foto_url} alt="" style={s.foto} />
                            : <div style={{ ...s.fotoVacia, borderColor: color, color }}>
                                {m.nombre.charAt(0)}
                              </div>}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={s.nombre}>{m.nombre}</div>
                            {m.cargo_empresa && <div style={s.cargo}>{m.cargo_empresa}</div>}
                            <div style={{ ...s.rol, color }}>{rotulo(m.rol)}</div>
                          </div>
                          <div style={s.accionesMiembro}>
                            <button type="button" style={s.botonMini}
                              onClick={() => {
                                setSubiendoFoto(m.id);
                                fotoRef.current?.click();
                              }}>
                              Foto
                            </button>
                            {!m.firmado && c.acta_estado !== 'cerrada' && (
                              <button type="button" style={s.botonMini} disabled={pendiente}
                                onClick={() => {
                                  startTransition(async () => {
                                    const r = await obtenerEnlaceFirmaComite(m.id);
                                    if (r.enlace) {
                                      setEnlace({ nombre: m.nombre, url: r.enlace });
                                      setAviso({ tipo: 'ok', texto: 'Enlace listo, arriba en el acta.' });
                                    } else {
                                      setAviso({ tipo: 'error', texto: r.mensaje });
                                    }
                                    router.refresh();
                                  });
                                }}>
                                Firma
                              </button>
                            )}
                            {m.firmado && (
                              <span style={{ ...s.chip, background: '#E6F4EA', color: '#1E6B3A' }}>
                                Firmó
                              </span>
                            )}
                            <button type="button" style={s.botonMini}
                              onClick={() => setForm({
                                id: m.id, empleadoId: m.empleado_id ?? '',
                                nombre: m.nombre, identificacion: m.identificacion ?? '',
                                cargo: m.cargo_empresa ?? '', parte: m.parte,
                                suplente: m.suplente, rol: m.rol,
                                frente: m.frente ?? '', fijo: false,
                              })}>
                              Editar
                            </button>
                            <button type="button" style={{ ...s.botonMini, color: '#9B1C1C' }}
                              disabled={pendiente}
                              onClick={() => correr(() => quitarMiembro(m.id, 'Retirado del comité'))}>
                              Quitar
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}

                <button type="button" style={{ ...s.botonMini, marginTop: 8 }}
                  onClick={() => setForm({ ...VACIO, parte, fijo: true })}>
                  + Agregar
                </button>
              </section>
            ))}
          </div>

          <input ref={fotoRef} type="file" accept="image/*"
            onChange={subirFoto} style={{ display: 'none' }} />

          {inactivos.length > 0 && (
            <section style={s.bloque}>
              <div style={s.h3}>Integrantes que salieron</div>
              <p style={s.nota}>
                No se borran: el acta de conformación sigue nombrándolos y borrarlos
                la dejaría mintiendo.
              </p>
              {inactivos.map((m) => (
                <div key={m.id} style={s.inactivo}>
                  <strong>{m.nombre}</strong>
                  {m.parte === 'brigada'
                    ? ` · ${FRENTES.find((f) => f.v === m.frente)?.t ?? 'brigada'}`
                    : m.parte === 'empleador' ? ' · empleador' : ' · trabajadores'}
                  {m.motivo_salida ? ` · ${m.motivo_salida}` : ''}
                </div>
              ))}
            </section>
          )}
        </>
      )}
    </>
  );
}

/** Tarjeta de brigadista: la misma información, sin parte ni suplencia. */
function Tarjeta({
  m, color, pendiente, onFoto, onEditar, onQuitar,
}: {
  m: Miembro; color: string; pendiente: boolean;
  onFoto: () => void; onEditar: () => void; onQuitar: () => void;
}) {
  return (
    <div style={s.miembro}>
      {m.foto_url
        /* eslint-disable-next-line @next/next/no-img-element */
        ? <img src={m.foto_url} alt="" style={s.foto} />
        : <div style={{ ...s.fotoVacia, borderColor: color, color }}>
            {m.nombre.charAt(0)}
          </div>}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={s.nombre}>{m.nombre}</div>
        {m.cargo_empresa && <div style={s.cargo}>{m.cargo_empresa}</div>}
        <div style={{ ...s.rol, color }}>{rotulo(m.rol)}</div>
      </div>
      <div style={s.accionesMiembro}>
        <button type="button" style={s.botonMini} onClick={onFoto}>Foto</button>
        <button type="button" style={s.botonMini} onClick={onEditar}>Editar</button>
        <button type="button" style={{ ...s.botonMini, color: '#9B1C1C' }}
          disabled={pendiente} onClick={onQuitar}>Quitar</button>
      </div>
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
  aviso: { padding: '10px 13px', borderRadius: 8, fontSize: 13, marginBottom: 14 },

  rejilla: {
    display: 'grid', gap: 12, marginBottom: 14,
    gridTemplateColumns: 'repeat(auto-fill,minmax(230px,1fr))',
  },
  tarjeta: {
    background: '#fff', borderWidth: 1, borderStyle: 'solid', borderRadius: 12,
    padding: '13px 15px', textDecoration: 'none', color: 'inherit',
    display: 'flex', flexDirection: 'column', gap: 4,
  },
  tarjetaCab: { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' },
  tarjetaNombre: { fontSize: 13.5, fontWeight: 700, color: '#14263F', margin: 0, flex: 1 },
  tarjetaMeta: { fontSize: 11.5, color: '#8A929C' },
  chip: {
    fontSize: 10, fontWeight: 700, padding: '3px 9px',
    borderRadius: 20, whiteSpace: 'nowrap',
  },

  barra: { display: 'flex', marginBottom: 16 },
  bloque: {
    background: '#fff', border: '1px solid #E4E4DF', borderRadius: 12,
    padding: '15px 17px', marginBottom: 14, width: '100%',
  },
  h3: { fontSize: 14, fontWeight: 700, color: '#14263F', marginBottom: 10 },
  nota: { fontSize: 12, color: '#5B6470', lineHeight: 1.6, margin: '0 0 10px' },
  fila: { display: 'flex', gap: 12, flexWrap: 'wrap' },
  label: { display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5, color: '#14263F' },
  input: {
    width: '100%', padding: '8px 11px', border: '1px solid #E4E4DF',
    borderRadius: 8, fontSize: 13, boxSizing: 'border-box',
    fontFamily: 'inherit', background: '#fff', color: '#14263F',
  },
  ayuda: { fontSize: 11, color: '#8A929C', margin: '4px 0 0' },

  control: {
    borderWidth: 1, borderStyle: 'solid', borderRadius: 12,
    padding: '15px 18px', marginBottom: 14,
  },
  controlCab: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    gap: 14, flexWrap: 'wrap',
  },
  controlTitulo: { fontSize: 14.5, fontWeight: 700 },
  controlNota: { fontSize: 12.5, color: '#374151', lineHeight: 1.6, margin: '5px 0 0', maxWidth: 620 },
  norma: { color: '#8A929C', fontSize: 11.5 },
  fallas: { margin: '10px 0 0', paddingLeft: 18 },
  falla: { fontSize: 12.5, color: '#9A3412', lineHeight: 1.65 },
  recomendaciones: {
    marginTop: 12, paddingTop: 10, borderTop: '1px solid rgba(0,0,0,.07)',
  },
  recomendacionesTitulo: {
    fontSize: 10.5, fontWeight: 700, color: '#5B6470',
    letterSpacing: .4, textTransform: 'uppercase',
  },
  recomendacion: { fontSize: 12.5, color: '#5B6470', lineHeight: 1.65 },
  fijo: {
    padding: '8px 11px', border: '1px solid #EDEDE8', borderRadius: 8,
    fontSize: 13, background: '#F7F7F4', color: '#374151', fontWeight: 600,
  },
  salvedad: {
    fontSize: 11.5, color: '#5B6470', lineHeight: 1.55,
    margin: '10px 0 0', paddingTop: 9, borderTop: '1px solid rgba(0,0,0,.07)',
  },

  columnas: { display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))' },
  columna: {
    background: '#fff', border: '1px solid #E4E4DF',
    borderRadius: 12, padding: '0 0 14px', overflow: 'hidden',
  },
  columnaTitulo: {
    color: '#fff', fontSize: 12, fontWeight: 700,
    padding: '10px 14px', textAlign: 'center',
  },
  grupo: {
    fontSize: 10, fontWeight: 700, color: '#8A929C', letterSpacing: .5,
    textTransform: 'uppercase', padding: '12px 14px 6px',
  },
  vacio: { fontSize: 12, color: '#9CA3AF', fontStyle: 'italic', padding: '0 14px 6px', margin: 0 },
  miembro: {
    display: 'flex', gap: 10, alignItems: 'center',
    padding: '9px 14px', borderTop: '1px solid #F0F0EC', flexWrap: 'wrap',
  },
  foto: { width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' },
  fotoVacia: {
    width: 40, height: 40, borderRadius: '50%', borderWidth: 1.5, borderStyle: 'solid',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 16, fontWeight: 700, flexShrink: 0,
  },
  nombre: { fontSize: 13, fontWeight: 700, color: '#14263F', lineHeight: 1.3 },
  cargo: { fontSize: 11, color: '#5B6470', marginTop: 1 },
  rol: { fontSize: 10.5, fontWeight: 700, marginTop: 2 },
  accionesMiembro: { display: 'flex', gap: 4, flexWrap: 'wrap' },

  inactivo: {
    fontSize: 12.5, color: '#5B6470', padding: '7px 0',
    borderTop: '1px solid #F0F0EC',
  },

  acciones: { display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 10 },
  botonPlano: {
    background: 'none', border: 'none', color: '#5B6470',
    fontSize: 12.5, fontWeight: 600, cursor: 'pointer', padding: '8px 12px',
  },
  botonSec: {
    background: '#fff', borderWidth: 1, borderStyle: 'solid', borderRadius: 8,
    padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
  },
  botonLleno: {
    color: '#fff', border: 'none', padding: '9px 20px', borderRadius: 8,
    fontSize: 13, fontWeight: 600, cursor: 'pointer',
  },
  barraActa: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  subBloqueActa: {
    background: '#FAFAF8', border: '1px solid #E4E4DF', borderRadius: 10,
    padding: '13px 15px', marginTop: 12,
  },
  enlaceCaja: {
    background: '#F7F7F4', border: '1px solid #E4E4DF',
    borderRadius: 9, padding: '11px 13px', marginTop: 12,
  },
  enlaceTitulo: { fontSize: 12, fontWeight: 700, color: '#14263F', marginBottom: 5 },
  enlaceUrl: {
    display: 'block', fontFamily: "'Consolas','Courier New',monospace",
    fontSize: 11.5, color: '#374151', wordBreak: 'break-all', lineHeight: 1.5,
  },
  botonMini: {
    background: '#fff', border: '1px solid #E4E4DF', borderRadius: 7,
    padding: '5px 11px', fontSize: 11.5, fontWeight: 600,
    color: '#14263F', cursor: 'pointer', whiteSpace: 'nowrap', textDecoration: 'none',
  },
};
