'use client';

/**
 * MATRIZ DE PELIGROS — GTC 45
 * ---------------------------------------------------------------
 * Se lee de arriba hacia abajo y lo primero que hay que ver es lo que
 * puede matar a alguien: por eso ordena por nivel de riesgo, no por
 * fecha ni por proceso.
 *
 * La valoración no se calcula aquí. ND, NE y NC se eligen de las tablas
 * de la norma —no son números libres— y la base deriva NP, NR y el
 * nivel. Lo único que hace la pantalla es mostrar el resultado mientras
 * se elige, para que se vea el efecto de cada factor.
 */
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  guardarPeligro, eliminarPeligro, guardarControlesPeligro,
  type Peligro, type Clasificacion, type TipoControl, type ResumenPeligros,
} from '@/lib/acciones-peligros';

/* ---------- Tablas de la GTC 45. No son valores libres. ---------- */
const ND = [
  { v: 10, t: 'Muy alto', d: 'Se han detectado peligros con riesgo de consecuencia grave y sin control' },
  { v: 6, t: 'Alto', d: 'Los controles existentes son insuficientes o poco eficaces' },
  { v: 2, t: 'Medio', d: 'Hay controles pero no son totalmente eficaces' },
  { v: 0, t: 'Bajo', d: 'No se detecta anomalía. El riesgo está controlado' },
];
const NE = [
  { v: 4, t: 'Continua', d: 'Varias veces en la jornada, con tiempo prolongado' },
  { v: 3, t: 'Frecuente', d: 'Varias veces en la jornada, por tiempos cortos' },
  { v: 2, t: 'Ocasional', d: 'Alguna vez en la jornada' },
  { v: 1, t: 'Esporádica', d: 'De manera irregular' },
];
const NC = [
  { v: 100, t: 'Mortal o catastrófico', d: 'Muerte' },
  { v: 60, t: 'Muy grave', d: 'Lesiones o enfermedades graves irreparables' },
  { v: 25, t: 'Grave', d: 'Lesiones con incapacidad laboral transitoria' },
  { v: 10, t: 'Leve', d: 'Lesiones que no requieren incapacidad' },
];

const CLASES: { v: Clasificacion; t: string }[] = [
  { v: 'biologico', t: 'Biológico' },
  { v: 'fisico', t: 'Físico' },
  { v: 'quimico', t: 'Químico' },
  { v: 'psicosocial', t: 'Psicosocial' },
  { v: 'biomecanico', t: 'Biomecánico' },
  { v: 'condiciones_seguridad', t: 'Condiciones de seguridad' },
  { v: 'fenomenos_naturales', t: 'Fenómenos naturales' },
];

/** Código de color de la norma: I rojo, II naranja, III amarillo, IV verde. */
const NIVELES: Record<string, { fondo: string; color: string }> = {
  I: { fondo: 'var(--mal-fondo)', color: 'var(--mal)' },
  II: { fondo: 'var(--aviso-fondo)', color: 'var(--aviso)' },
  III: { fondo: 'var(--ambar-fondo)', color: 'var(--ambar)' },
  IV: { fondo: 'var(--bien-fondo)', color: 'var(--bien)' },
};

const TIPOS_CONTROL: { v: TipoControl; t: string }[] = [
  { v: 'epp', t: 'EPP' },
  { v: 'capacitacion', t: 'Capacitación' },
  { v: 'inspeccion', t: 'Inspección' },
];

const VACIO = {
  id: undefined as string | undefined,
  actividad: '', descripcion: '', clasificacion: 'condiciones_seguridad' as Clasificacion,
  nd: 6, ne: 3, nc: 25,
  proceso: '', zona: '', rutinaria: true, efectos: '',
  controlFuente: '', controlMedio: '', controlIndividuo: '',
  numExpuestos: 0, peorConsecuencia: '', requisitoLegal: '',
  mEliminacion: '', mSustitucion: '', mIngenieria: '', mAdministrativo: '', mEpp: '',
};

function valorar(nd: number, ne: number, nc: number) {
  const np = nd * ne;
  const nr = np * nc;
  const nivel = nr >= 600 ? 'I' : nr >= 150 ? 'II' : nr >= 40 ? 'III' : 'IV';
  const acept = nr >= 600 ? 'No aceptable'
    : nr >= 150 ? 'No aceptable o aceptable con control específico'
    : nr >= 40 ? 'Mejorable' : 'Aceptable';
  return { np, nr, nivel, acept };
}

export default function VistaPeligros({
  peligros,
  resumen,
  opciones,
  color,
}: {
  peligros: Peligro[];
  resumen: ResumenPeligros | null;
  opciones: {
    epp: Array<{ id: string; nombre: string }>;
    capacitacion: Array<{ id: string; nombre: string }>;
    inspeccion: Array<{ id: string; nombre: string }>;
  };
  color: string;
}) {
  const router = useRouter();
  const [pendiente, startTransition] = useTransition();
  const [form, setForm] = useState<typeof VACIO | null>(null);
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);
  const [hecho, setHecho] = useState(false);
  const [buscar, setBuscar] = useState('');
  const [enlazando, setEnlazando] = useState<string | null>(null);
  const [seleccion, setSeleccion] = useState<Array<{ tipo: TipoControl; referencia_id: string }>>([]);

  const v = form ? valorar(form.nd, form.ne, form.nc) : null;

  const q = buscar.trim().toLowerCase();
  const lista = peligros.filter(
    (p) => !q ||
      p.codigo.toLowerCase().includes(q) ||
      p.descripcion.toLowerCase().includes(q) ||
      p.actividad.toLowerCase().includes(q) ||
      (p.proceso ?? '').toLowerCase().includes(q)
  );

  function guardar() {
    if (!form) return;
    setAviso(null);
    startTransition(async () => {
      const r = await guardarPeligro(form);
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
      const r = await eliminarPeligro(id);
      setAviso({ tipo: r.ok ? 'ok' : 'error', texto: r.mensaje });
      if (r.ok) router.refresh();
    });
  }

  function guardarEnlaces() {
    if (!enlazando) return;
    startTransition(async () => {
      const r = await guardarControlesPeligro(enlazando, seleccion);
      setAviso({ tipo: r.ok ? 'ok' : 'error', texto: r.mensaje });
      if (r.ok) {
        setEnlazando(null);
        setSeleccion([]);
        router.refresh();
      }
    });
  }

  function alternar(tipo: TipoControl, id: string) {
    setSeleccion((p) =>
      p.some((x) => x.tipo === tipo && x.referencia_id === id)
        ? p.filter((x) => !(x.tipo === tipo && x.referencia_id === id))
        : [...p, { tipo, referencia_id: id }]
    );
  }

  return (
    <>
      {resumen && (
        <div style={s.tarjetas}>
          <Tarjeta n={resumen.total} t="Peligros identificados" c={color} />
          <Tarjeta n={resumen.nivel_i} t="Nivel I — no aceptable" c={resumen.nivel_i ? 'var(--mal)' : 'var(--marca-empresa)'} />
          <Tarjeta n={resumen.nivel_ii} t="Nivel II" c={resumen.nivel_ii ? 'var(--aviso)' : 'var(--marca-empresa)'} />
          <Tarjeta n={resumen.sin_controles} t="Sin controles enlazados" c={resumen.sin_controles ? 'var(--aviso)' : 'var(--marca-empresa)'} />
        </div>
      )}

      {resumen && resumen.sin_controles > 0 && (
        <div style={s.avisoControles}>
          <strong>{resumen.sin_controles} peligro(s) sin controles enlazados.</strong> Un
          peligro conectado con el EPP que exige, la capacitación que requiere y la
          inspección que lo vigila es lo que permite responderle a un auditor
          <em> por qué</em> ese control y no otro.
        </div>
      )}

      <div style={s.controles}>
        <input
          value={buscar}
          onChange={(e) => setBuscar(e.target.value)}
          placeholder="Buscar por código, peligro, actividad o proceso"
          style={s.buscador}
        />
        {!form && (
          <button
            onClick={() => { setForm({ ...VACIO }); setAviso(null); }}
            style={{ ...s.botonLleno, background: 'var(--marca)' }}
            type="button"
          >
            Identificar peligro
          </button>
        )}
      </div>

      {aviso && (
        <div style={{
          ...s.aviso,
          background: aviso.tipo === 'ok' ? 'var(--bien-fondo)' : 'var(--mal-fondo)',
          color: aviso.tipo === 'ok' ? 'var(--bien)' : 'var(--mal)',
        }}>
          {aviso.texto}
        </div>
      )}

      {/* ================= FORMULARIO ================= */}
      {form && (
        <section style={s.form}>
          <div style={s.formTitulo}>
            {form.id ? 'Editar peligro' : 'Identificar un peligro'}
          </div>

          <div style={s.fila}>
            <Campo etiqueta="Proceso"><input value={form.proceso}
              onChange={(e) => setForm({ ...form, proceso: e.target.value })} style={s.input} /></Campo>
            <Campo etiqueta="Zona o lugar"><input value={form.zona}
              onChange={(e) => setForm({ ...form, zona: e.target.value })} style={s.input} /></Campo>
            <Campo etiqueta="Expuestos"><input value={String(form.numExpuestos)}
              onChange={(e) => /^\d*$/.test(e.target.value) &&
                setForm({ ...form, numExpuestos: Number(e.target.value) || 0 })}
              style={s.input} inputMode="numeric" /></Campo>
          </div>

          <Campo etiqueta="Actividad *">
            <input value={form.actividad}
              onChange={(e) => setForm({ ...form, actividad: e.target.value })}
              style={s.input} placeholder="Mantenimiento de luminarias en altura" />
          </Campo>

          <div style={s.fila}>
            <Campo etiqueta="Clasificación">
              <select value={form.clasificacion}
                onChange={(e) => setForm({ ...form, clasificacion: e.target.value as Clasificacion })}
                style={s.input}>
                {CLASES.map((c) => <option key={c.v} value={c.v}>{c.t}</option>)}
              </select>
            </Campo>
            <Campo etiqueta="¿Es rutinaria?">
              <select value={form.rutinaria ? 'si' : 'no'}
                onChange={(e) => setForm({ ...form, rutinaria: e.target.value === 'si' })}
                style={s.input}>
                <option value="si">Sí, rutinaria</option>
                <option value="no">No rutinaria</option>
              </select>
            </Campo>
          </div>

          <Campo etiqueta="Descripción del peligro *">
            <input value={form.descripcion}
              onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
              style={s.input} placeholder="Caída de altura superior a 1,5 m" />
          </Campo>

          <Campo etiqueta="Efectos posibles">
            <input value={form.efectos}
              onChange={(e) => setForm({ ...form, efectos: e.target.value })}
              style={s.input} placeholder="Fracturas, trauma craneoencefálico, muerte" />
          </Campo>

          {/* ---------- Valoración ---------- */}
          <div style={s.valoracion}>
            <div style={s.valTitulo}>Valoración del riesgo</div>
            <p style={s.nota}>
              Los tres factores se eligen de las tablas de la GTC 45; no son
              números libres. El nivel lo calcula la base, no esta pantalla.
            </p>

            <Selector etiqueta="Nivel de deficiencia (ND)" opciones={ND}
              valor={form.nd} onChange={(n) => setForm({ ...form, nd: n })} />
            <Selector etiqueta="Nivel de exposición (NE)" opciones={NE}
              valor={form.ne} onChange={(n) => setForm({ ...form, ne: n })} />
            <Selector etiqueta="Nivel de consecuencia (NC)" opciones={NC}
              valor={form.nc} onChange={(n) => setForm({ ...form, nc: n })} />

            {v && (
              <div style={{ ...s.resultado, background: NIVELES[v.nivel].fondo }}>
                <div style={s.resultadoCifras}>
                  <span>NP = {form.nd} × {form.ne} = <strong>{v.np}</strong></span>
                  <span>NR = {v.np} × {form.nc} = <strong>{v.nr}</strong></span>
                </div>
                <div style={{ ...s.resultadoNivel, color: NIVELES[v.nivel].color }}>
                  Nivel {v.nivel} · {v.acept}
                </div>
              </div>
            )}
          </div>

          {/* ---------- Controles existentes e intervención ---------- */}
          <div style={s.fila}>
            <Campo etiqueta="Control en la fuente"><input value={form.controlFuente}
              onChange={(e) => setForm({ ...form, controlFuente: e.target.value })} style={s.input} /></Campo>
            <Campo etiqueta="Control en el medio"><input value={form.controlMedio}
              onChange={(e) => setForm({ ...form, controlMedio: e.target.value })} style={s.input} /></Campo>
            <Campo etiqueta="Control en el individuo"><input value={form.controlIndividuo}
              onChange={(e) => setForm({ ...form, controlIndividuo: e.target.value })} style={s.input} /></Campo>
          </div>

          <div style={s.valTitulo}>Medidas de intervención</div>
          <p style={s.nota}>
            En orden de jerarquía: eliminar es mejor que sustituir, y el EPP es
            siempre el último recurso, no el primero.
          </p>
          <div style={s.fila}>
            <Campo etiqueta="Eliminación"><input value={form.mEliminacion}
              onChange={(e) => setForm({ ...form, mEliminacion: e.target.value })} style={s.input} /></Campo>
            <Campo etiqueta="Sustitución"><input value={form.mSustitucion}
              onChange={(e) => setForm({ ...form, mSustitucion: e.target.value })} style={s.input} /></Campo>
          </div>
          <div style={s.fila}>
            <Campo etiqueta="Controles de ingeniería"><input value={form.mIngenieria}
              onChange={(e) => setForm({ ...form, mIngenieria: e.target.value })} style={s.input} /></Campo>
            <Campo etiqueta="Administrativos y señalización"><input value={form.mAdministrativo}
              onChange={(e) => setForm({ ...form, mAdministrativo: e.target.value })} style={s.input} /></Campo>
            <Campo etiqueta="EPP requerido"><input value={form.mEpp}
              onChange={(e) => setForm({ ...form, mEpp: e.target.value })} style={s.input} /></Campo>
          </div>

          <Campo etiqueta="Requisito legal aplicable">
            <input value={form.requisitoLegal}
              onChange={(e) => setForm({ ...form, requisitoLegal: e.target.value })}
              style={s.input} placeholder="Resolución 4272 de 2021" />
          </Campo>

          <div style={s.acciones}>
            <button onClick={() => setForm(null)} style={s.botonPlano} type="button">Cancelar</button>
            <button onClick={guardar} disabled={pendiente} type="button"
              style={{ ...s.botonLleno, background: hecho ? 'var(--bien)' : pendiente ? 'var(--borde-fuerte)' : 'var(--marca)' }}>
              {hecho ? '✓ Guardado' : pendiente ? 'Guardando…' : 'Guardar peligro'}
            </button>
          </div>
        </section>
      )}

      {/* ================= ENLACE DE CONTROLES ================= */}
      {enlazando && (
        <section style={s.form}>
          <div style={s.formTitulo}>Enlazar controles</div>
          <p style={s.nota}>
            Marca lo que ya existe en el sistema y que controla este peligro. Es lo
            que permite ver si el control está al día o solo está escrito.
          </p>
          {TIPOS_CONTROL.map(({ v: tipo, t }) => (
            <div key={tipo} style={{ marginBottom: 12 }}>
              <div style={s.grupoTitulo}>{t}</div>
              <div style={s.opciones}>
                {opciones[tipo].length === 0 && <span style={s.nota}>No hay {t.toLowerCase()} registrada.</span>}
                {opciones[tipo].map((o) => {
                  const marcado = seleccion.some((x) => x.tipo === tipo && x.referencia_id === o.id);
                  return (
                    <button key={o.id} onClick={() => alternar(tipo, o.id)} type="button"
                      style={{
                        ...s.opcion,
                        ...(marcado ? { borderColor: 'var(--marca)', background: 'var(--superficie)', color, fontWeight: 700 } : {}),
                      }}>
                      {marcado ? '✓ ' : ''}{o.nombre}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          <div style={s.acciones}>
            <button onClick={() => { setEnlazando(null); setSeleccion([]); }}
              style={s.botonPlano} type="button">Cancelar</button>
            <button onClick={guardarEnlaces} disabled={pendiente} type="button"
              style={{ ...s.botonLleno, background: pendiente ? 'var(--borde-fuerte)' : 'var(--marca)' }}>
              Guardar controles
            </button>
          </div>
        </section>
      )}

      {/* ================= MATRIZ ================= */}
      {lista.length === 0 ? (
        <p style={s.vacio}>
          {peligros.length === 0
            ? 'La matriz está vacía. Identifica el primer peligro: de aquí deberían salir el EPP que se entrega, la capacitación que se dicta y la inspección que se programa.'
            : 'Ningún peligro coincide con la búsqueda.'}
        </p>
      ) : (
        <div style={s.contenedor}>
          <table style={s.tabla}>
            <thead>
              <tr>
                {['Código', 'Proceso / actividad', 'Peligro', 'ND', 'NE', 'NP', 'NC', 'NR', 'Nivel', 'Controles', ''].map((h, i) => (
                  <th key={i} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lista.map((p) => {
                const n = NIVELES[p.nivel] ?? NIVELES.IV;
                return (
                  <tr key={p.id}>
                    <td style={s.td}><span style={s.codigo}>{p.codigo}</span></td>
                    <td style={s.td}>
                      {p.proceso ?? '—'}
                      <div style={s.meta}>{p.actividad}</div>
                    </td>
                    <td style={s.td}>
                      {p.descripcion}
                      <div style={s.meta}>
                        {CLASES.find((c) => c.v === p.clasificacion)?.t}
                        {p.num_expuestos > 0 ? ` · ${p.num_expuestos} expuestos` : ''}
                      </div>
                    </td>
                    <td style={s.tdNum}>{p.nd}</td>
                    <td style={s.tdNum}>{p.ne}</td>
                    <td style={s.tdNum}>{p.np}</td>
                    <td style={s.tdNum}>{p.nc}</td>
                    <td style={{ ...s.tdNum, fontWeight: 700 }}>{p.nr}</td>
                    <td style={s.td}>
                      <span style={{ ...s.chip, background: n.fondo, color: n.color }}>
                        {p.nivel}
                      </span>
                    </td>
                    <td style={s.td}>
                      {p.controles > 0
                        ? <span style={{ ...s.chip, background: 'var(--bien-fondo)', color: 'var(--bien)' }}>{p.controles}</span>
                        : <span style={{ ...s.chip, background: 'var(--aviso-fondo)', color: 'var(--aviso)' }}>Ninguno</span>}
                    </td>
                    <td style={s.td}>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button type="button" style={s.botonMini}
                          onClick={() => { setEnlazando(p.id); setSeleccion([]); setAviso(null); }}>
                          Controles
                        </button>
                        <button type="button" style={s.botonMini}
                          onClick={() => setForm({
                            id: p.id,
                            actividad: p.actividad, descripcion: p.descripcion,
                            clasificacion: p.clasificacion, nd: p.nd, ne: p.ne, nc: p.nc,
                            proceso: p.proceso ?? '', zona: p.zona ?? '', rutinaria: p.rutinaria,
                            efectos: p.efectos_posibles ?? '',
                            controlFuente: p.control_fuente ?? '',
                            controlMedio: p.control_medio ?? '',
                            controlIndividuo: p.control_individuo ?? '',
                            numExpuestos: p.num_expuestos,
                            peorConsecuencia: p.peor_consecuencia ?? '',
                            requisitoLegal: p.requisito_legal ?? '',
                            mEliminacion: p.m_eliminacion ?? '',
                            mSustitucion: p.m_sustitucion ?? '',
                            mIngenieria: p.m_ingenieria ?? '',
                            mAdministrativo: p.m_administrativo ?? '',
                            mEpp: p.m_epp ?? '',
                          })}>
                          Editar
                        </button>
                        <button type="button" onClick={() => borrar(p.id)}
                          style={{ ...s.botonMini, color: 'var(--mal)' }}>
                          Borrar
                        </button>
                      </div>
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

function Tarjeta({ n, t, c }: { n: number; t: string; c: string }) {
  return (
    <div style={s.tarjeta}>
      <span style={{ ...s.tarjetaN, color: c }}>{n}</span>
      <span style={s.tarjetaT}>{t}</span>
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

function Selector({
  etiqueta, opciones, valor, onChange,
}: {
  etiqueta: string;
  opciones: { v: number; t: string; d: string }[];
  valor: number;
  onChange: (n: number) => void;
}) {
  return (
    <div style={{ marginBottom: 10 }}>
      <label style={s.label}>{etiqueta}</label>
      <div style={s.opciones}>
        {opciones.map((o) => (
          <button key={o.v} onClick={() => onChange(o.v)} type="button" title={o.d}
            style={{
              ...s.opcion,
              ...(valor === o.v ? { borderColor: 'var(--marca)', background: 'var(--marca)', color: 'var(--sobre-empresa)', fontWeight: 700 } : {}),
            }}>
            {o.v} · {o.t}
          </button>
        ))}
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  tarjetas: {
    display: 'grid', gap: 10, marginBottom: 14,
    gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))',
  },
  tarjeta: {
    background: 'var(--superficie)', border: '1px solid var(--borde)', borderRadius: 8,
    padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 2,
  },
  tarjetaN: { fontSize: 24, fontWeight: 700, lineHeight: 1.1, fontVariantNumeric: 'tabular-nums' },
  tarjetaT: { fontSize: 11.5, color: 'var(--texto-suave)', lineHeight: 1.4 },

  avisoControles: {
    background: 'var(--aviso-fondo)', border: '1px solid var(--aviso)', color: 'var(--aviso)',
    borderRadius: 8, padding: '11px 14px', fontSize: 12.5, lineHeight: 1.6, marginBottom: 14,
  },
  controles: { display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' },
  buscador: {
    flex: '1 1 240px', padding: '9px 12px', border: '1px solid var(--borde)',
    borderRadius: 8, fontSize: 13.5, boxSizing: 'border-box',
  },
  aviso: { padding: '10px 13px', borderRadius: 8, fontSize: 13, marginBottom: 14 },

  form: {
    background: 'var(--superficie)', border: '1px solid var(--borde)', borderRadius: 12,
    padding: '16px 18px', marginBottom: 16,
  },
  formTitulo: { fontSize: 15, fontWeight: 700, color: 'var(--texto)', marginBottom: 10 },
  nota: { fontSize: 12, color: 'var(--texto-suave)', lineHeight: 1.6, margin: '0 0 10px' },
  fila: { display: 'flex', gap: 12, flexWrap: 'wrap' },
  label: { display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5, color: 'var(--texto)' },
  input: {
    width: '100%', padding: '8px 11px', border: '1px solid var(--borde)',
    borderRadius: 8, fontSize: 13, boxSizing: 'border-box',
    fontFamily: 'inherit', background: 'var(--superficie)', color: 'var(--texto)',
  },

  valoracion: {
    background: 'var(--fondo)', border: '1px solid var(--borde)', borderRadius: 8,
    padding: '14px 16px', margin: '6px 0 14px',
  },
  valTitulo: { fontSize: 13.5, fontWeight: 700, color: 'var(--texto)', marginBottom: 4 },
  opciones: { display: 'flex', gap: 6, flexWrap: 'wrap' },
  opcion: {
    background: 'var(--superficie)', border: '1px solid var(--borde)', borderRadius: 7,
    padding: '6px 12px', fontSize: 12, color: 'var(--texto)', cursor: 'pointer',
    textAlign: 'left',
  },
  grupoTitulo: { fontSize: 12, fontWeight: 700, color: 'var(--texto-suave)', marginBottom: 6 },
  resultado: { borderRadius: 8, padding: '12px 14px', marginTop: 12 },
  resultadoCifras: {
    display: 'flex', gap: 18, fontSize: 12.5, color: 'var(--texto-suave)',
    flexWrap: 'wrap', fontVariantNumeric: 'tabular-nums',
  },
  resultadoNivel: { fontSize: 15, fontWeight: 700, marginTop: 6 },

  acciones: { display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 },
  botonPlano: {
    background: 'none', border: 'none', color: 'var(--texto-suave)',
    fontSize: 12.5, fontWeight: 600, cursor: 'pointer', padding: '8px 12px',
  },
  botonLleno: {
    color: 'var(--sobre-marca)', border: 'none', padding: '9px 20px', borderRadius: 8,
    fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
  },

  vacio: {
    fontSize: 13.5, color: 'var(--texto-suave)', lineHeight: 1.65, background: 'var(--superficie)',
    border: '1px solid var(--borde)', borderRadius: 8, padding: '18px 20px', maxWidth: 640,
  },
  contenedor: {
    background: 'var(--superficie)', border: '1px solid var(--borde)', borderRadius: 8, overflowX: 'auto',
  },
  tabla: { width: '100%', borderCollapse: 'collapse', fontSize: 12.5, minWidth: 940 },
  th: {
    textAlign: 'left', padding: '10px 10px', background: 'var(--fondo)', color: 'var(--texto-suave)',
    fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: .4,
    borderBottom: '1px solid var(--borde)', whiteSpace: 'nowrap',
  },
  td: { padding: '9px 10px', borderBottom: '1px solid var(--superficie-3)', verticalAlign: 'top' },
  tdNum: {
    padding: '9px 10px', borderBottom: '1px solid var(--superficie-3)',
    textAlign: 'center', fontVariantNumeric: 'tabular-nums', color: 'var(--texto)',
  },
  codigo: { fontFamily: "'Consolas','Courier New',monospace", fontWeight: 600 },
  meta: { fontSize: 11, color: 'var(--texto-tenue)', marginTop: 2, maxWidth: 220 },
  chip: {
    display: 'inline-block', padding: '3px 10px', borderRadius: 20,
    fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap',
  },
  botonMini: {
    background: 'var(--superficie)', border: '1px solid var(--borde)', borderRadius: 7,
    padding: '5px 10px', fontSize: 11.5, fontWeight: 600,
    color: 'var(--texto)', cursor: 'pointer', whiteSpace: 'nowrap',
  },
};
