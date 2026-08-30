'use client';

/**
 * ANÁLISIS DE AMENAZAS Y VULNERABILIDAD — metodología de colores
 * ---------------------------------------------------------------
 * Estándar 5.1.1 · guía FOPAE (Res. 004/09).
 *
 * La pantalla dice el VALOR de cada opción en voz alta —«Sí, existe
 * (0.0)»— porque la escala de esta metodología se invierte con
 * facilidad: el número mide la vulnerabilidad, no el control. Si se
 * volteara, el análisis pintaría de verde justo lo que está mal, y nadie
 * lo notaría hasta la auditoría. Escribirlo obliga a que el error, si
 * ocurre, sea visible.
 *
 * El diamante lleva la letra A/M/B dentro del color por la misma razón
 * que el organigrama del comité: esto se imprime y se fotocopia.
 */
import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  sembrarAmenazas, guardarAmenaza, eliminarAmenaza, enviarAnalisisAmenazas,
  type Amenaza, type ResumenAmenazas, type Origen, type Fuente,
  type Calificacion, type Color,
} from '@/lib/acciones-emergencias';

const ORIGENES: { v: Origen; t: string }[] = [
  { v: 'natural', t: 'Natural' },
  { v: 'tecnologico', t: 'Tecnológico' },
  { v: 'social', t: 'Social' },
];

const CALIFICACIONES: { v: Calificacion; t: string; que: string }[] = [
  { v: 'posible', t: 'Posible', que: 'Nunca ha sucedido pero puede suceder' },
  { v: 'probable', t: 'Probable', que: 'Ya sucedió o hay información que lo hace previsible' },
  { v: 'inminente', t: 'Inminente', que: 'Evidente, con señales claras de que va a ocurrir' },
];

/** Los tres aspectos de cada elemento expuesto, según la guía. */
const ASPECTOS = {
  personas: ['Organización', 'Capacitación', 'Dotación'],
  recursos: ['Materiales', 'Edificación', 'Equipos'],
  sistemas: ['Servicios públicos', 'Sistemas alternos', 'Recuperación'],
} as const;

const AYUDA = {
  personas: 'Brigada conformada, gente capacitada y con su dotación.',
  recursos: 'Extintores y camillas, estado de la edificación, equipos de atención.',
  sistemas: 'Agua y energía, planta o UPS, capacidad de volver a operar.',
} as const;

const OPCIONES = [
  { v: 0, t: 'Sí, existe / se cumple (0.0)' },
  { v: 0.5, t: 'Parcialmente (0.5)' },
  { v: 1, t: 'No existe / no se cumple (1.0)' },
];

const COLORES: Record<Color, { fondo: string; texto: string; letra: string; nombre: string }> = {
  verde: { fondo: '#E6F4EA', texto: '#1E6B3A', letra: 'B', nombre: 'Baja' },
  amarillo: { fondo: '#FEF3C7', texto: '#92400E', letra: 'M', nombre: 'Media' },
  rojo: { fondo: '#FDF2F2', texto: '#9B1C1C', letra: 'A', nombre: 'Alta' },
};

const NIVELES: Record<string, { fondo: string; texto: string }> = {
  alto: { fondo: '#FDF2F2', texto: '#9B1C1C' },
  medio: { fondo: '#FEF3C7', texto: '#92400E' },
  bajo: { fondo: '#E6F4EA', texto: '#1E6B3A' },
};

const VACIO = {
  id: undefined as string | undefined,
  amenaza: '', origen: 'natural' as Origen, fuente: 'externa' as Fuente,
  descripcion: '', calificacion: 'posible' as Calificacion,
  personas: [1, 1, 1], recursos: [1, 1, 1], sistemas: [1, 1, 1],
  observaciones: '',
};

export default function VistaAmenazas({
  items,
  resumen,
  empresaId,
  color,
}: {
  items: Amenaza[];
  resumen: ResumenAmenazas;
  empresaId: string;
  color: string;
}) {
  const router = useRouter();
  const [pendiente, startTransition] = useTransition();
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);
  const [form, setForm] = useState<typeof VACIO | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [correo, setCorreo] = useState({ para: '', mensaje: '' });

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

  function editar(a: Amenaza) {
    setForm({
      id: a.id, amenaza: a.amenaza, origen: a.origen, fuente: a.fuente,
      descripcion: a.descripcion ?? '', calificacion: a.calificacion,
      personas: [a.p_organizacion, a.p_capacitacion, a.p_dotacion],
      recursos: [a.r_materiales, a.r_edificacion, a.r_equipos],
      sistemas: [a.s_servicios, a.s_alternos, a.s_recuperacion],
      observaciones: a.observaciones ?? '',
    });
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const suma = (v: number[]) => v.reduce((s, x) => s + x, 0);
  const colorDe = (v: number): Color =>
    v >= 2.1 ? 'rojo' : v >= 1.1 ? 'amarillo' : 'verde';

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

      {/* ---------- Resumen ---------- */}
      <div style={s.resumen}>
        <Tarjeta n={resumen.alto} t="Riesgo alto" nivel="alto" />
        <Tarjeta n={resumen.medio} t="Riesgo medio" nivel="medio" />
        <Tarjeta n={resumen.bajo} t="Riesgo bajo" nivel="bajo" />
        <div style={s.tarjetaGris}>
          <span style={s.tarjetaN}>{resumen.sin_evaluar}</span>
          <span style={s.tarjetaT}>Sin calificar</span>
        </div>
      </div>

      {/* ---------- Acciones ---------- */}
      <div style={s.barra}>
        <button type="button" disabled={pendiente}
          style={{ ...s.botonLleno, background: color }}
          onClick={() => setForm({ ...VACIO })}>
          Agregar amenaza
        </button>
        {items.length === 0 && (
          <button type="button" disabled={pendiente} style={s.botonSec}
            onClick={() => correr(sembrarAmenazas)}>
            Cargar las amenazas típicas
          </button>
        )}
        <a href={`/api/pdf-amenazas/${empresaId}`} target="_blank" rel="noopener"
          style={{ ...s.botonSec, textDecoration: 'none' }}>
          Descargar PDF
        </a>
        <button type="button" style={s.botonSec} onClick={() => setEnviando(true)}>
          Enviar por correo
        </button>
      </div>

      {enviando && (
        <section style={s.bloque}>
          <div style={s.h3}>Enviar el análisis</div>
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
                correr(() => enviarAnalisisAmenazas(correo.para, correo.mensaje));
                setEnviando(false);
              }}>
              Enviar
            </button>
          </div>
        </section>
      )}

      {/* ---------- Formulario ---------- */}
      {form && (
        <section style={s.bloque}>
          <div style={s.h3}>{form.id ? 'Calificar la amenaza' : 'Nueva amenaza'}</div>

          <div style={s.fila}>
            <Campo etiqueta="Amenaza" ancho={240}>
              <input value={form.amenaza} style={s.input}
                placeholder="Incendio estructural"
                onChange={(e) => setForm({ ...form, amenaza: e.target.value })} />
            </Campo>
            <Campo etiqueta="Origen">
              <select value={form.origen} style={s.input}
                onChange={(e) => setForm({ ...form, origen: e.target.value as Origen })}>
                {ORIGENES.map((o) => <option key={o.v} value={o.v}>{o.t}</option>)}
              </select>
            </Campo>
            <Campo etiqueta="Fuente">
              <select value={form.fuente} style={s.input}
                onChange={(e) => setForm({ ...form, fuente: e.target.value as Fuente })}>
                <option value="interna">Interna</option>
                <option value="externa">Externa</option>
              </select>
            </Campo>
          </div>

          <Campo etiqueta="Descripción" ancho={9999}>
            <input value={form.descripcion} style={s.input}
              placeholder="Dónde y por qué se puede presentar"
              onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
          </Campo>

          {/* Calificación de la amenaza */}
          <div style={s.subtitulo}>Calificación de la amenaza</div>
          <div style={s.opciones}>
            {CALIFICACIONES.map((c) => (
              <button key={c.v} type="button"
                onClick={() => setForm({ ...form, calificacion: c.v })}
                style={{
                  ...s.opcion,
                  ...(form.calificacion === c.v
                    ? { borderColor: color, background: `${color}12`, fontWeight: 700 }
                    : {}),
                }}>
                <span style={s.opcionT}>{c.t}</span>
                <span style={s.opcionQue}>{c.que}</span>
              </button>
            ))}
          </div>

          {/* Vulnerabilidad */}
          <div style={s.subtitulo}>Análisis de vulnerabilidad</div>
          <p style={s.ayuda}>
            La calificación mide la <strong>vulnerabilidad</strong>, no el control:
            lo que ya existe puntúa 0.0 y lo que falta puntúa 1.0. Por eso una
            suma alta es malo.
          </p>

          <div style={s.elementos}>
            {(['personas', 'recursos', 'sistemas'] as const).map((elem) => {
              const total = suma(form[elem]);
              const c = COLORES[colorDe(total)];
              return (
                <div key={elem} style={s.elemento}>
                  <div style={s.elementoCab}>
                    <span style={s.elementoNombre}>
                      {elem === 'personas' ? 'Personas'
                        : elem === 'recursos' ? 'Recursos' : 'Sistemas y procesos'}
                    </span>
                    <span style={{ ...s.elementoTotal, background: c.fondo, color: c.texto }}>
                      {total.toFixed(1)} · {c.nombre}
                    </span>
                  </div>
                  <p style={s.elementoAyuda}>{AYUDA[elem]}</p>
                  {ASPECTOS[elem].map((aspecto, i) => (
                    <div key={aspecto} style={{ marginBottom: 7 }}>
                      <label style={s.labelMini}>{aspecto}</label>
                      <select value={form[elem][i]} style={s.input}
                        onChange={(e) => {
                          const copia = [...form[elem]];
                          copia[i] = Number(e.target.value);
                          setForm({ ...form, [elem]: copia });
                        }}>
                        {OPCIONES.map((o) => (
                          <option key={o.v} value={o.v}>{o.t}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>

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
              style={{ ...s.botonLleno, background: color }}
              onClick={() => {
                correr(() => guardarAmenaza(form));
                setForm(null);
              }}>
              Guardar calificación
            </button>
          </div>
        </section>
      )}

      {/* ---------- Tabla ---------- */}
      {items.length === 0 ? (
        <div style={s.bloque}>
          <p style={s.nota}>
            Todavía no hay amenazas. Sin este análisis el plan de emergencias no
            tiene sustento técnico, y es lo primero que pide el estándar 5.1.1.
            Puedes cargar las amenazas típicas y calificarlas una a una.
          </p>
        </div>
      ) : (
        <div style={s.contenedor}>
          <table style={s.tabla}>
            <thead>
              <tr>
                <th style={{ ...s.th, textAlign: 'left' }}>Amenaza</th>
                <th style={s.th}>Amenaza</th>
                <th style={s.th}>Personas</th>
                <th style={s.th}>Recursos</th>
                <th style={s.th}>Sistemas</th>
                <th style={s.th}>Riesgo</th>
                <th style={s.th}></th>
              </tr>
            </thead>
            <tbody>
              {items.map((a) => (
                <tr key={a.id}>
                  <td style={s.tdNombre}>
                    <div style={s.nombre}>{a.amenaza}</div>
                    <div style={s.meta}>
                      {ORIGENES.find((o) => o.v === a.origen)?.t} ·{' '}
                      {a.fuente === 'interna' ? 'interna' : 'externa'}
                      {a.descripcion ? ` · ${a.descripcion}` : ''}
                    </div>
                  </td>
                  <Rombo color={a.color_amenaza}
                    valor={CALIFICACIONES.find((c) => c.v === a.calificacion)?.t ?? ''} />
                  <Rombo color={a.color_personas} valor={a.v_personas.toFixed(1)} />
                  <Rombo color={a.color_recursos} valor={a.v_recursos.toFixed(1)} />
                  <Rombo color={a.color_sistemas} valor={a.v_sistemas.toFixed(1)} />
                  <td style={{ ...s.td, textAlign: 'center' }}>
                    {a.evaluada && a.nivel_riesgo ? (
                      <span style={{
                        ...s.nivel,
                        background: NIVELES[a.nivel_riesgo].fondo,
                        color: NIVELES[a.nivel_riesgo].texto,
                      }}>
                        {a.nivel_riesgo.toUpperCase()}
                      </span>
                    ) : (
                      <span style={s.sinEvaluar}>Sin calificar</span>
                    )}
                  </td>
                  <td style={{ ...s.td, textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <button type="button" style={s.botonMini} onClick={() => editar(a)}>
                      {a.evaluada ? 'Editar' : 'Calificar'}
                    </button>
                    <button type="button" disabled={pendiente}
                      style={{ ...s.botonMini, color: '#9B1C1C', marginLeft: 4 }}
                      onClick={() => correr(() => eliminarAmenaza(a.id))}>
                      Quitar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p style={s.leyenda}>
        Cada rombo va con su letra —<strong>B</strong> baja, <strong>M</strong> media,
        <strong> A</strong> alta— además del color, para que el análisis siga
        leyéndose impreso en blanco y negro. El nivel de riesgo sale del diamante:
        3 o 4 rombos en alto lo hacen <strong>alto</strong>; 1 o 2 en alto, o 3 en
        medio, lo hacen <strong>medio</strong>.
      </p>
    </>
  );
}

function Rombo({ color, valor }: { color: Color; valor: string }) {
  const c = COLORES[color];
  return (
    <td style={{ ...s.td, textAlign: 'center' }}>
      <div style={{ ...s.caja, background: c.fondo, color: c.texto, borderColor: c.texto }}>
        {c.letra}
      </div>
      <div style={s.cajaValor}>{valor}</div>
    </td>
  );
}

function Tarjeta({ n, t, nivel }: { n: number; t: string; nivel: string }) {
  return (
    <div style={{ ...s.tarjeta, background: NIVELES[nivel].fondo }}>
      <span style={{ ...s.tarjetaN, color: NIVELES[nivel].texto }}>{n}</span>
      <span style={{ ...s.tarjetaT, color: NIVELES[nivel].texto }}>{t}</span>
    </div>
  );
}

function Campo({
  etiqueta, ancho = 180, children,
}: {
  etiqueta: string; ancho?: number; children: React.ReactNode;
}) {
  return (
    <div style={{ flex: `1 1 ${ancho}px`, marginBottom: 10 }}>
      <label style={s.label}>{etiqueta}</label>
      {children}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  aviso: {
    position: 'fixed', right: 18, bottom: 18, zIndex: 60, maxWidth: 340,
    padding: '11px 15px', borderRadius: 9, fontSize: 13,
    boxShadow: '0 6px 20px rgba(20,38,63,.16)',
  },

  resumen: {
    display: 'grid', gap: 10, marginBottom: 14,
    gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))',
  },
  tarjeta: {
    borderRadius: 10, padding: '12px 14px',
    display: 'flex', flexDirection: 'column', gap: 2,
  },
  tarjetaGris: {
    background: '#fff', border: '1px solid #E4E4DF', borderRadius: 10,
    padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 2,
    color: '#5B6470',
  },
  tarjetaN: { fontSize: 22, fontWeight: 700, lineHeight: 1.1, fontVariantNumeric: 'tabular-nums' },
  tarjetaT: { fontSize: 11.5 },

  barra: { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 },

  bloque: {
    background: '#fff', border: '1px solid #E4E4DF', borderRadius: 12,
    padding: '15px 17px', marginBottom: 14,
  },
  h3: { fontSize: 14, fontWeight: 700, color: '#14263F', marginBottom: 10 },
  nota: { fontSize: 13, color: '#5B6470', lineHeight: 1.65, margin: 0, maxWidth: 640 },
  fila: { display: 'flex', gap: 12, flexWrap: 'wrap' },
  label: { display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5, color: '#14263F' },
  labelMini: { display: 'block', fontSize: 11.5, color: '#5B6470', marginBottom: 3 },
  input: {
    width: '100%', padding: '8px 11px', border: '1px solid #E4E4DF',
    borderRadius: 8, fontSize: 13, boxSizing: 'border-box',
    fontFamily: 'inherit', background: '#fff', color: '#14263F',
  },
  ayuda: { fontSize: 11.5, color: '#8A929C', margin: '4px 0 10px', lineHeight: 1.55 },

  subtitulo: {
    fontSize: 11, fontWeight: 700, color: '#8A929C', letterSpacing: .5,
    textTransform: 'uppercase', margin: '14px 0 8px',
  },
  opciones: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  opcion: {
    flex: '1 1 190px', textAlign: 'left', background: '#fff',
    border: '1px solid #E4E4DF', borderRadius: 9, padding: '9px 12px',
    cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 2,
  },
  opcionT: { fontSize: 13, color: '#14263F' },
  opcionQue: { fontSize: 11, color: '#8A929C', lineHeight: 1.45 },

  elementos: {
    display: 'grid', gap: 12,
    gridTemplateColumns: 'repeat(auto-fit,minmax(230px,1fr))',
  },
  elemento: {
    background: '#FAFAF8', border: '1px solid #E4E4DF',
    borderRadius: 10, padding: '11px 13px',
  },
  elementoCab: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'center', gap: 8, marginBottom: 3,
  },
  elementoNombre: { fontSize: 13, fontWeight: 700, color: '#14263F' },
  elementoTotal: {
    fontSize: 11, fontWeight: 700, borderRadius: 20,
    padding: '2px 9px', whiteSpace: 'nowrap',
  },
  elementoAyuda: { fontSize: 11, color: '#8A929C', margin: '0 0 9px', lineHeight: 1.45 },

  contenedor: {
    background: '#fff', border: '1px solid #E4E4DF',
    borderRadius: 12, overflowX: 'auto',
  },
  tabla: { width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 760 },
  th: {
    textAlign: 'center', padding: '10px 8px', background: '#F7F7F4', color: '#5B6470',
    fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: .4,
    borderBottom: '1px solid #E4E4DF', whiteSpace: 'nowrap',
  },
  td: { padding: '8px', borderBottom: '1px solid #F0F0EC', verticalAlign: 'middle' },
  tdNombre: { padding: '8px 12px', borderBottom: '1px solid #F0F0EC', minWidth: 220 },
  nombre: { fontSize: 13, fontWeight: 600, color: '#14263F' },
  meta: { fontSize: 11, color: '#8A929C', marginTop: 2, lineHeight: 1.4 },

  caja: {
    width: 26, height: 26, borderRadius: 5, borderWidth: 1, borderStyle: 'solid',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 12, fontWeight: 700, margin: '0 auto',
  },
  cajaValor: { fontSize: 9.5, color: '#8A929C', marginTop: 2 },

  nivel: {
    fontSize: 10.5, fontWeight: 700, borderRadius: 20,
    padding: '3px 10px', whiteSpace: 'nowrap',
  },
  sinEvaluar: { fontSize: 11, color: '#9CA3AF', fontStyle: 'italic' },

  leyenda: {
    fontSize: 11.5, color: '#8A929C', lineHeight: 1.6,
    margin: '12px 0 0', maxWidth: 720,
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
