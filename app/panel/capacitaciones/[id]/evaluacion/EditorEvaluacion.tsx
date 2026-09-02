'use client';

/**
 * EDITOR DE PREGUNTAS
 * ---------------------------------------------------------------
 * El cliente formula sus propias preguntas. Cada una lleva:
 *   - tipo: selección única o múltiple
 *   - opciones, con la correcta marcada
 *   - subtema, que es lo que permite saber DÓNDE falla la gente
 */
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  guardarEvaluacion, eliminarEvaluacion,
  type Evaluacion, type Pregunta, type TipoPregunta,
} from '@/lib/acciones-evaluacion';
import {
  aplicarPlantillaEvaluacion, guardarPlantillaEvaluacion,
  type PlantillaEvaluacion,
} from '@/lib/acciones-plantillas';

function preguntaVacia(orden: number): Pregunta {
  return {
    orden,
    enunciado: '',
    tipo: 'unica',
    subtema: '',
    puntaje: 1,
    opciones: [
      { texto: '', es_correcta: true },
      { texto: '', es_correcta: false },
    ],
  };
}

export default function EditorEvaluacion({
  capacitacionId, codigo, tema, evaluacion, subtemas,
  maxPreguntas, nombrePlan, color, banco = [],
}: {
  capacitacionId: string;
  codigo: string;
  tema: string;
  evaluacion: Evaluacion | null;
  subtemas: string[];
  maxPreguntas: number | null;
  nombrePlan: string;
  color: string;
  banco?: PlantillaEvaluacion[];
}) {
  const router = useRouter();
  const [pendiente, startTransition] = useTransition();

  const [titulo, setTitulo] = useState(evaluacion?.titulo ?? 'EVALUACIÓN DE CONOCIMIENTO');
  const [minimo, setMinimo] = useState(evaluacion?.puntaje_minimo ?? 70);
  const [obligatoria, setObligatoria] = useState(evaluacion?.obligatoria ?? true);
  const [maxIntentos, setMaxIntentos] = useState(evaluacion?.max_intentos ?? 1);
  const [preguntas, setPreguntas] = useState<Pregunta[]>(
    evaluacion?.preguntas.length ? evaluacion.preguntas : [preguntaVacia(1)]
  );
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  // Banco de plantillas: usar una, o guardar esta
  const [plantillaId, setPlantillaId] = useState('');
  const [guardandoBanco, setGuardandoBanco] = useState(false);
  const [nombreBanco, setNombreBanco] = useState('');

  function usarPlantilla() {
    if (!plantillaId) return;
    startTransition(async () => {
      const r = await aplicarPlantillaEvaluacion(capacitacionId, plantillaId);
      setAviso({ tipo: r.ok ? 'ok' : 'error', texto: r.mensaje });
      if (r.ok) { setPlantillaId(''); router.refresh(); }
    });
  }

  function guardarEnBanco() {
    if (!evaluacion) {
      setAviso({ tipo: 'error', texto: 'Guarda la evaluación antes de enviarla al banco.' });
      return;
    }
    startTransition(async () => {
      const r = await guardarPlantillaEvaluacion(evaluacion.id, nombreBanco || titulo);
      setAviso({ tipo: r.ok ? 'ok' : 'error', texto: r.mensaje });
      if (r.ok) { setGuardandoBanco(false); setNombreBanco(''); }
    });
  }

  const alTope = maxPreguntas !== null && preguntas.length >= maxPreguntas;

  // La evaluación vale 100 puntos en total; cada pregunta aporta una parte.
  const sumaPuntos = preguntas.reduce((t, p) => t + (Number(p.puntaje) || 0), 0);
  const excede = sumaPuntos > 100;

  /** Reparte los 100 puntos por igual entre las preguntas. */
  function repartirPuntos() {
    const n = preguntas.length;
    if (n === 0) return;
    const base = Math.floor(100 / n);
    const resto = 100 - base * n;
    setPreguntas((ps) =>
      ps.map((p, i) => ({ ...p, puntaje: base + (i < resto ? 1 : 0) }))
    );
  }

  function actualizar(i: number, cambios: Partial<Pregunta>) {
    setPreguntas((p) => p.map((q, j) => (j === i ? { ...q, ...cambios } : q)));
  }

  function cambiarTipo(i: number, tipo: TipoPregunta) {
    const p = preguntas[i];
    // Al pasar a única solo puede quedar una correcta
    const opciones = tipo === 'unica'
      ? p.opciones.map((o, j) => ({ ...o, es_correcta: j === p.opciones.findIndex((x) => x.es_correcta) }))
      : p.opciones;
    actualizar(i, { tipo, opciones });
  }

  function marcarCorrecta(i: number, j: number) {
    const p = preguntas[i];
    const opciones = p.tipo === 'unica'
      ? p.opciones.map((o, k) => ({ ...o, es_correcta: k === j }))
      : p.opciones.map((o, k) => (k === j ? { ...o, es_correcta: !o.es_correcta } : o));
    actualizar(i, { opciones });
  }

  function textoOpcion(i: number, j: number, texto: string) {
    actualizar(i, { opciones: preguntas[i].opciones.map((o, k) => (k === j ? { ...o, texto } : o)) });
  }

  function agregarOpcion(i: number) {
    actualizar(i, { opciones: [...preguntas[i].opciones, { texto: '', es_correcta: false }] });
  }

  function quitarOpcion(i: number, j: number) {
    if (preguntas[i].opciones.length <= 2) return;
    actualizar(i, { opciones: preguntas[i].opciones.filter((_, k) => k !== j) });
  }

  function guardar() {
    startTransition(async () => {
      const r = await guardarEvaluacion(capacitacionId, {
        titulo, puntaje_minimo: minimo, obligatoria,
        max_intentos: maxIntentos, preguntas,
      });
      setAviso({ tipo: r.ok ? 'ok' : 'error', texto: r.mensaje });
      if (r.ok) router.refresh();
    });
  }

  function eliminar() {
    startTransition(async () => {
      const r = await eliminarEvaluacion(capacitacionId);
      setAviso({ tipo: r.ok ? 'ok' : 'error', texto: r.mensaje });
      if (r.ok) router.push(`/panel/capacitaciones/${capacitacionId}`);
    });
  }

  return (
    <>
      <Link href={`/panel/capacitaciones/${capacitacionId}`} style={{ fontSize: 13, color: 'var(--marca)' }}>
        ← Volver a la capacitación
      </Link>

      <h1 style={{ fontSize: 22, color: 'var(--texto)', margin: '12px 0 2px' }}>Evaluación</h1>
      <p style={{ color: 'var(--texto-suave)', fontSize: 13, marginTop: 0 }}>{codigo} · {tema}</p>

      {evaluacion && (
        <div style={e.avisoEdicion}>
          Al guardar, las preguntas que ya tengan respuestas se archivan en vez
          de borrarse: los resultados y las estadísticas anteriores se conservan.
        </div>
      )}

      {aviso && (
        <div style={{
          ...e.aviso,
          background: aviso.tipo === 'ok' ? 'var(--bien-fondo)' : 'var(--mal-fondo)',
          color: aviso.tipo === 'ok' ? 'var(--bien)' : 'var(--mal)',
        }}>
          {aviso.texto}
        </div>
      )}

      {/* ---------- Banco de plantillas ---------- */}
      <section style={e.card}>
        <h2 style={e.h2}>Banco de evaluaciones</h2>

        {banco.length === 0 ? (
          <p style={e.nota}>
            El banco está vacío. Cuando termines esta evaluación puedes
            guardarla para reutilizarla en otras empresas.
          </p>
        ) : (
          <>
            <p style={e.nota}>
              Usar una plantilla <strong>reemplaza</strong> las preguntas
              actuales. Las que ya tengan respuestas se archivan.
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
              <select
                value={plantillaId}
                onChange={(ev) => setPlantillaId(ev.target.value)}
                style={{ ...e.input, flex: 1, minWidth: 200 }}
              >
                <option value="">Elige una plantilla…</option>
                {banco.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre} · {p.preguntas} pregunta(s)
                  </option>
                ))}
              </select>
              <button
                onClick={usarPlantilla}
                disabled={pendiente || !plantillaId}
                style={{
                  ...e.btn,
                  background: pendiente || !plantillaId ? 'var(--borde-fuerte)' : 'var(--marca)',
                  cursor: pendiente || !plantillaId ? 'not-allowed' : 'pointer',
                }}
              >
                Usar
              </button>
            </div>
          </>
        )}

        {evaluacion && (
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--borde)' }}>
            {!guardandoBanco ? (
              <button onClick={() => setGuardandoBanco(true)} style={e.enlace}>
                + Guardar esta evaluación en el banco
              </button>
            ) : (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <input
                  value={nombreBanco}
                  onChange={(ev) => setNombreBanco(ev.target.value)}
                  placeholder={titulo}
                  style={{ ...e.input, flex: 1, minWidth: 200 }}
                />
                <button
                  onClick={guardarEnBanco}
                  disabled={pendiente}
                  style={{ ...e.btn, background: pendiente ? 'var(--borde-fuerte)' : 'var(--marca)' }}
                >
                  Guardar
                </button>
                <button onClick={() => setGuardandoBanco(false)} style={e.btnSec}>
                  Cancelar
                </button>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ---------- Configuración ---------- */}
      <section style={e.card}>
        <h2 style={e.h2}>Configuración</h2>

        <label style={e.label}>Título</label>
        <input value={titulo} onChange={(ev) => setTitulo(ev.target.value)} style={e.input} />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 12 }}>
          <div>
            <label style={e.label}>Puntaje mínimo para aprobar (%)</label>
            <input type="number" min={0} max={100} value={minimo}
              onChange={(ev) => setMinimo(Number(ev.target.value))} style={e.input} />
          </div>
          <div>
            <label style={e.label}>Obligatoriedad</label>
            <label style={e.check}>
              <input type="checkbox" checked={obligatoria}
                onChange={(ev) => setObligatoria(ev.target.checked)} style={{ marginRight: 8 }} />
              No permitir registrar asistencia sin responder
            </label>
          </div>
        </div>

        <label style={e.label}>Intentos permitidos</label>
        <select
          value={maxIntentos}
          onChange={(ev) => setMaxIntentos(Number(ev.target.value))}
          style={{ ...e.input, maxWidth: 260 }}
        >
          <option value={1}>1 — sin reintento</option>
          <option value={2}>2 — un reintento</option>
          <option value={3}>3 — dos reintentos</option>
        </select>
        <p style={e.nota}>
          Los reintentos quedan registrados: el resumen de participación
          muestra quién necesitó más de un intento.
        </p>

        {/* Reparto de los 100 puntos */}
        <div style={{
          ...e.puntaje,
          background: excede ? 'var(--mal-fondo)' : sumaPuntos === 100 ? 'var(--bien-fondo)' : 'var(--superficie-2)',
          borderColor: excede ? 'var(--mal)' : sumaPuntos === 100 ? 'var(--bien)' : 'var(--superficie-3)',
        }}>
          <div>
            <strong style={{ fontSize: 13, color: excede ? 'var(--mal)' : 'var(--texto)' }}>
              {sumaPuntos} de 100 puntos asignados
            </strong>
            <p style={{ ...e.nota, margin: '2px 0 0' }}>
              {excede
                ? 'La suma supera 100. Reduce el valor de alguna pregunta.'
                : sumaPuntos === 100
                ? 'Reparto completo.'
                : `Quedan ${100 - sumaPuntos} puntos sin asignar.`}
            </p>
          </div>
          <button onClick={repartirPuntos} style={e.btnRepartir} type="button">
            Repartir por igual
          </button>
        </div>
      </section>

      {/* ---------- Preguntas ---------- */}
      {preguntas.map((p, i) => (
        <section key={i} style={e.card}>
          <div style={e.cabecera}>
            <h3 style={e.h3}>Pregunta {i + 1}</h3>
            {preguntas.length > 1 && (
              <button onClick={() => setPreguntas((q) => q.filter((_, j) => j !== i))}
                style={e.btnQuitar}>Quitar</button>
            )}
          </div>

          <label style={e.label}>Enunciado</label>
          <textarea value={p.enunciado} rows={2}
            onChange={(ev) => actualizar(i, { enunciado: ev.target.value })}
            style={{ ...e.input, resize: 'vertical' }} />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 90px', gap: 12, marginTop: 12 }}>
            <div>
              <label style={e.label}>Tipo</label>
              <select value={p.tipo} onChange={(ev) => cambiarTipo(i, ev.target.value as TipoPregunta)}
                style={e.input}>
                <option value="unica">Selección única</option>
                <option value="multiple">Selección múltiple</option>
              </select>
            </div>
            <div>
              <label style={e.label}>Subtema</label>
              <input value={p.subtema} list="subtemas" placeholder="SEGURIDAD, SALUD…"
                onChange={(ev) => actualizar(i, { subtema: ev.target.value.toUpperCase() })}
                style={{ ...e.input, textTransform: 'uppercase' }} />
            </div>
            <div>
              <label style={e.label}>Puntos</label>
              <input type="number" min={1} value={p.puntaje}
                onChange={(ev) => actualizar(i, { puntaje: Number(ev.target.value) })}
                style={e.input} />
            </div>
          </div>

          <label style={{ ...e.label, marginTop: 14 }}>
            Opciones — marca {p.tipo === 'unica' ? 'la correcta' : 'todas las correctas'}
          </label>

          {p.opciones.map((o, j) => (
            <div key={j} style={e.filaOpcion}>
              <input
                type={p.tipo === 'unica' ? 'radio' : 'checkbox'}
                name={`correcta-${i}`}
                checked={o.es_correcta}
                onChange={() => marcarCorrecta(i, j)}
                title="Marcar como correcta"
                style={{ width: 17, height: 17, flexShrink: 0, cursor: 'pointer' }}
              />
              <input
                value={o.texto}
                placeholder={`Opción ${j + 1}`}
                onChange={(ev) => textoOpcion(i, j, ev.target.value)}
                style={{
                  ...e.input,
                  textTransform: 'uppercase',
                  background: o.es_correcta ? 'var(--bien-fondo)' : 'var(--superficie)',
                  borderColor: o.es_correcta ? 'var(--bien)' : 'var(--borde-fuerte)',
                }}
              />
              {p.opciones.length > 2 && (
                <button onClick={() => quitarOpcion(i, j)} style={e.x} title="Quitar opción">×</button>
              )}
            </div>
          ))}

          <button onClick={() => agregarOpcion(i)} style={e.enlace}>+ Agregar opción</button>
        </section>
      ))}

      <datalist id="subtemas">
        {subtemas.map((s) => <option key={s} value={s} />)}
      </datalist>

      {/* ---------- Acciones ---------- */}
      <div style={e.acciones}>
        <button
          onClick={() => setPreguntas((p) => [...p, preguntaVacia(p.length + 1)])}
          disabled={alTope}
          style={{ ...e.btnSec, ...(alTope ? { opacity: .5, cursor: 'not-allowed' } : {}) }}
        >
          + Agregar pregunta
        </button>

        <button onClick={guardar} disabled={pendiente || excede}
          style={{
            ...e.btn,
            background: pendiente || excede ? 'var(--borde-fuerte)' : 'var(--marca)',
            cursor: pendiente || excede ? 'not-allowed' : 'pointer',
          }}
          title={excede ? 'La suma de puntajes supera 100' : ''}>
          {pendiente ? 'Guardando…' : 'Guardar evaluación'}
        </button>

        {evaluacion && (
          <button onClick={eliminar} disabled={pendiente} style={e.btnBorrar}>
            Eliminar evaluación
          </button>
        )}
      </div>

      <p style={e.tope}>
        {maxPreguntas === null
          ? `Plan ${nombrePlan}: preguntas ilimitadas.`
          : `Plan ${nombrePlan}: ${preguntas.length} de ${maxPreguntas} preguntas.`}
        {alTope && ' Actualiza tu plan para agregar más.'}
      </p>
    </>
  );
}

const e: Record<string, React.CSSProperties> = {
  card: { background: 'var(--superficie)', borderRadius: 14, padding: 20, marginBottom: 16, boxShadow: '0 6px 18px rgba(0,0,0,.05)' },
  h2: { fontSize: 15, margin: '0 0 14px' },
  h3: { fontSize: 14, margin: 0, color: 'var(--texto)' },
  cabecera: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  label: { display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5 },
  input: { width: '100%', padding: '9px 10px', border: '1px solid var(--borde-fuerte)', borderRadius: 8, fontSize: 13, boxSizing: 'border-box', fontFamily: 'inherit' },
  check: { display: 'flex', alignItems: 'center', fontSize: 12.5, color: 'var(--texto-suave)', cursor: 'pointer', padding: '9px 0' },
  filaOpcion: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 },
  x: { background: 'none', border: 'none', color: 'var(--mal)', fontSize: 18, cursor: 'pointer', padding: '0 4px', flexShrink: 0 },
  enlace: { background: 'none', border: 'none', color: 'var(--marca)', fontSize: 12, cursor: 'pointer', padding: '6px 0 0' },
  acciones: { display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 6 },
  btn: { color: 'var(--sobre-marca)', border: 'none', padding: '11px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  btnSec: { background: 'var(--superficie-3)', color: 'var(--texto)', border: '1px solid var(--borde-fuerte)', padding: '11px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  btnBorrar: { background: 'var(--superficie)', color: 'var(--mal)', border: '1px solid var(--mal-fondo)', padding: '11px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  btnQuitar: { background: 'none', border: 'none', color: 'var(--mal)', fontSize: 12, cursor: 'pointer' },
  aviso: { padding: '10px 14px', borderRadius: 8, fontSize: 13, margin: '14px 0' },
  tope: { fontSize: 11.5, color: 'var(--texto-suave)', marginTop: 14 },
  nota: { fontSize: 11.5, color: 'var(--texto-suave)', margin: '4px 0 0' },
  puntaje: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    gap: 14, flexWrap: 'wrap', marginTop: 16, padding: '12px 14px',
    borderRadius: 6, borderWidth: 1, borderStyle: 'solid',
  },
  btnRepartir: {
    background: 'var(--superficie)', border: '1px solid var(--borde-fuerte)', color: 'var(--texto)',
    padding: '7px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer',
  },
  avisoEdicion: {
    background: 'var(--ambar-fondo)', color: 'var(--ambar)', padding: '10px 14px',
    borderRadius: 6, fontSize: 12, margin: '14px 0', lineHeight: 1.5,
  },
};
