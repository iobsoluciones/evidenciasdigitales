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
 */
import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { crearClienteNavegador } from '@/lib/supabase/cliente';
import {
  crearComite, guardarMiembro, quitarMiembro, enviarOrganigrama,
  type ComiteResumen, type Comite, type Miembro, type Validacion,
  type TipoComite, type Parte, type RolComite,
} from '@/lib/acciones-comites';

const TIPOS: Record<TipoComite, { t: string; norma: string }> = {
  copasst: { t: 'COPASST', norma: 'Resolución 2013 de 1986' },
  vigia: { t: 'Vigía en SST', norma: 'Decreto 1295 de 1994, art. 35' },
  convivencia: {
    t: 'Comité de Convivencia Laboral',
    norma: 'Res. 652 de 2012, modificada por la 1356 de 2012',
  },
};

const ROLES: { v: RolComite; t: string }[] = [
  { v: 'presidente', t: 'Presidente' },
  { v: 'secretario', t: 'Secretario' },
  { v: 'integrante', t: 'Integrante' },
];

const VACIO = {
  id: undefined as string | undefined,
  empleadoId: '', nombre: '', identificacion: '', cargo: '',
  parte: 'trabajadores' as Parte, suplente: false, rol: 'integrante' as RolComite,
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

  const c = detalle?.comite;
  const miembros = detalle?.miembros ?? [];
  const v = detalle?.validacion;

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
          parte: m.parte, suplente: m.suplente, rol: m.rol,
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
                </select>
              </Campo>
              <Campo etiqueta="Inicio del periodo" ayuda="El periodo es de dos años.">
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

            <p style={s.salvedad}>
              El cálculo usa los <strong>{v.requerido.trabajadores} empleados activos</strong> de
              la empresa. La norma habla de trabajadores: si hay contratistas, ajusta la
              composición a criterio propio.
            </p>
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
              <div style={s.h3}>{form.id ? 'Editar integrante' : 'Agregar integrante'}</div>
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
                <Campo etiqueta="Representa a">
                  <select value={form.parte} style={s.input}
                    onChange={(e) => setForm({ ...form, parte: e.target.value as Parte })}>
                    <option value="empleador">El empleador</option>
                    <option value="trabajadores">Los trabajadores</option>
                  </select>
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

          {/* Organigrama en dos columnas */}
          <div style={s.columnas}>
            {(['empleador', 'trabajadores'] as Parte[]).map((parte) => (
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
                            <div style={{ ...s.rol, color }}>
                              {ROLES.find((r) => r.v === m.rol)?.t ?? m.rol}
                            </div>
                          </div>
                          <div style={s.accionesMiembro}>
                            <button type="button" style={s.botonMini}
                              onClick={() => {
                                setSubiendoFoto(m.id);
                                fotoRef.current?.click();
                              }}>
                              Foto
                            </button>
                            <button type="button" style={s.botonMini}
                              onClick={() => setForm({
                                id: m.id, empleadoId: m.empleado_id ?? '',
                                nombre: m.nombre, identificacion: m.identificacion ?? '',
                                cargo: m.cargo_empresa ?? '', parte: m.parte,
                                suplente: m.suplente, rol: m.rol,
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
                  onClick={() => setForm({ ...VACIO, parte })}>
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
                  <strong>{m.nombre}</strong> · {m.parte === 'empleador' ? 'empleador' : 'trabajadores'}
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
  botonMini: {
    background: '#fff', border: '1px solid #E4E4DF', borderRadius: 7,
    padding: '5px 11px', fontSize: 11.5, fontWeight: 600,
    color: '#14263F', cursor: 'pointer', whiteSpace: 'nowrap', textDecoration: 'none',
  },
};
