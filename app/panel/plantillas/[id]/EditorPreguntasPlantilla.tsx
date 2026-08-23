'use client';

/**
 * EDITOR DE PREGUNTAS DE UNA PLANTILLA
 * ---------------------------------------------------------------
 * A diferencia del editor de una evaluación real, aquí no hay
 * respuestas que proteger: la plantilla nunca se contesta. Por eso
 * las preguntas se reemplazan por completo al guardar, sin archivar.
 */
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  guardarPreguntasPlantilla,
  type PlantillaDetalle, type PreguntaPlantilla,
} from '@/lib/acciones-plantillas';

const PREGUNTA_VACIA = (orden: number): PreguntaPlantilla => ({
  orden,
  enunciado: '',
  tipo: 'unica',
  subtema: '',
  puntaje: 10,
  opciones: [
    { texto: '', es_correcta: true },
    { texto: '', es_correcta: false },
  ],
});

export default function EditorPreguntasPlantilla({
  plantilla,
  color,
}: {
  plantilla: PlantillaDetalle;
  color: string;
}) {
  const router = useRouter();
  const [pendiente, startTransition] = useTransition();

  const [nombre, setNombre] = useState(plantilla.nombre);
  const [descripcion, setDescripcion] = useState(plantilla.descripcion ?? '');
  const [minimo, setMinimo] = useState(plantilla.puntaje_minimo);
  const [intentos, setIntentos] = useState(plantilla.max_intentos);
  const [preguntas, setPreguntas] = useState<PreguntaPlantilla[]>(plantilla.preguntas);
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  const suma = preguntas.reduce((t, p) => t + (Number(p.puntaje) || 0), 0);
  const excede = suma > 100;

  function actualizar(i: number, cambios: Partial<PreguntaPlantilla>) {
    setPreguntas((ps) => ps.map((p, j) => (j === i ? { ...p, ...cambios } : p)));
  }

  function actualizarOpcion(iP: number, iO: number, cambios: Partial<{ texto: string; es_correcta: boolean }>) {
    setPreguntas((ps) => ps.map((p, j) => {
      if (j !== iP) return p;
      const opciones = p.opciones.map((o, k) => (k === iO ? { ...o, ...cambios } : o));
      // En selección única, marcar una desmarca las demás
      if (cambios.es_correcta && p.tipo === 'unica') {
        return { ...p, opciones: opciones.map((o, k) => ({ ...o, es_correcta: k === iO })) };
      }
      return { ...p, opciones };
    }));
  }

  /** Reparte los 100 puntos por igual, dando el residuo a las primeras. */
  function repartir() {
    const n = preguntas.length;
    if (n === 0) return;
    const base = Math.floor(100 / n);
    const resto = 100 - base * n;
    setPreguntas((ps) => ps.map((p, i) => ({ ...p, puntaje: base + (i < resto ? 1 : 0) })));
  }

  function guardar() {
    startTransition(async () => {
      const r = await guardarPreguntasPlantilla(plantilla.id, {
        nombre, descripcion, puntaje_minimo: minimo,
        max_intentos: intentos, preguntas,
      });
      setAviso({ tipo: r.ok ? 'ok' : 'error', texto: r.mensaje });
      if (r.ok) router.refresh();
    });
  }

  return (
    <>
      {/* ---------- Datos de la plantilla ---------- */}
      <section style={e.card}>
        <h2 style={e.h2}>Datos de la plantilla</h2>

        <label style={e.label}>Nombre</label>
        <input value={nombre} onChange={(ev) => setNombre(ev.target.value.toUpperCase())}
          style={{ ...e.input, textTransform: 'uppercase' }} />

        <label style={e.label}>Descripción</label>
        <textarea value={descripcion} rows={2}
          onChange={(ev) => setDescripcion(ev.target.value)}
          style={{ ...e.input, resize: 'vertical' }} />

        <div style={e.dos}>
          <div>
            <label style={e.label}>Puntaje mínimo (%)</label>
            <input type="number" min={0} max={100} value={minimo}
              onChange={(ev) => setMinimo(Number(ev.target.value))} style={e.input} />
          </div>
          <div>
            <label style={e.label}>Intentos permitidos</label>
            <select value={intentos} onChange={(ev) => setIntentos(Number(ev.target.value))} style={e.input}>
              <option value={1}>1 — sin reintento</option>
              <option value={2}>2 — un reintento</option>
              <option value={3}>3 — dos reintentos</option>
            </select>
          </div>
        </div>

        <div style={{
          ...e.puntaje,
          background: excede ? '#FDF2F2' : suma === 100 ? '#F0FDF4' : '#FBFBF9',
          borderColor: excede ? '#F5C6C6' : suma === 100 ? '#BBF7D0' : '#EFEFEA',
        }}>
          <div>
            <strong style={{ fontSize: 13, color: excede ? '#9B1C1C' : '#14263F' }}>
              {suma} de 100 puntos
            </strong>
            <p style={{ ...e.nota, margin: '2px 0 0' }}>
              {excede ? 'Supera 100. Reduce alguna pregunta.'
                : suma === 100 ? 'Reparto completo.'
                : `Quedan ${100 - suma} sin asignar.`}
            </p>
          </div>
          <button onClick={repartir} style={e.btnRepartir} type="button">
            Repartir por igual
          </button>
        </div>
      </section>

      {/* ---------- Preguntas ---------- */}
      {preguntas.map((p, i) => (
        <section key={i} style={e.card}>
          <div style={e.cabeceraPregunta}>
            <strong style={{ fontSize: 13, color }}>Pregunta {i + 1}</strong>
            <button
              onClick={() => setPreguntas((ps) => ps.filter((_, j) => j !== i))}
              style={e.btnBorrar}
            >
              Eliminar
            </button>
          </div>

          <label style={e.label}>Enunciado</label>
          <textarea
            value={p.enunciado}
            rows={2}
            onChange={(ev) => actualizar(i, { enunciado: ev.target.value.toUpperCase() })}
            style={{ ...e.input, resize: 'vertical', textTransform: 'uppercase' }}
          />

          <div style={e.tres}>
            <div>
              <label style={e.label}>Tipo</label>
              <select
                value={p.tipo}
                onChange={(ev) => actualizar(i, { tipo: ev.target.value as 'unica' | 'multiple' })}
                style={e.input}
              >
                <option value="unica">Selección única</option>
                <option value="multiple">Selección múltiple</option>
              </select>
            </div>
            <div>
              <label style={e.label}>Subtema</label>
              <input
                value={p.subtema}
                placeholder="CONTAMINACIÓN CRUZADA"
                onChange={(ev) => actualizar(i, { subtema: ev.target.value.toUpperCase() })}
                style={{ ...e.input, textTransform: 'uppercase' }}
              />
            </div>
            <div>
              <label style={e.label}>Puntaje</label>
              <input
                type="number" min={1} max={100} value={p.puntaje}
                onChange={(ev) => actualizar(i, { puntaje: Number(ev.target.value) })}
                style={e.input}
              />
            </div>
          </div>

          <label style={e.label}>Opciones</label>
          {p.opciones.map((o, k) => (
            <div key={k} style={e.filaOpcion}>
              <input
                type={p.tipo === 'unica' ? 'radio' : 'checkbox'}
                name={`p${i}`}
                checked={o.es_correcta}
                onChange={(ev) => actualizarOpcion(i, k, { es_correcta: ev.target.checked })}
                style={{ width: 16, height: 16 }}
                title="Marcar como correcta"
              />
              <input
                value={o.texto}
                placeholder={`Opción ${k + 1}`}
                onChange={(ev) => actualizarOpcion(i, k, { texto: ev.target.value })}
                style={{ ...e.input, flex: 1 }}
              />
              {p.opciones.length > 2 && (
                <button
                  onClick={() => actualizar(i, { opciones: p.opciones.filter((_, j) => j !== k) })}
                  style={e.x}
                >
                  ×
                </button>
              )}
            </div>
          ))}

          {p.opciones.length < 6 && (
            <button
              onClick={() => actualizar(i, {
                opciones: [...p.opciones, { texto: '', es_correcta: false }],
              })}
              style={{ ...e.enlace, color }}
            >
              + Agregar opción
            </button>
          )}
        </section>
      ))}

      <button
        onClick={() => setPreguntas((ps) => [...ps, PREGUNTA_VACIA(ps.length + 1)])}
        style={{ ...e.btnSec, marginBottom: 16 }}
      >
        + Agregar pregunta
      </button>

      {aviso && (
        <div style={{
          ...e.aviso,
          background: aviso.tipo === 'ok' ? '#F0FDF4' : '#FDF2F2',
          color: aviso.tipo === 'ok' ? '#15803D' : '#9B1C1C',
        }}>
          {aviso.texto}
        </div>
      )}

      <div style={{ display: 'flex', gap: 10 }}>
        <button
          onClick={guardar}
          disabled={pendiente || excede}
          style={{
            ...e.btn,
            background: pendiente || excede ? '#C5C5BD' : color,
            cursor: pendiente || excede ? 'not-allowed' : 'pointer',
          }}
          title={excede ? 'La suma de puntajes supera 100' : ''}
        >
          {pendiente ? 'Guardando…' : 'Guardar plantilla'}
        </button>
        <Link href="/panel/plantillas" style={e.btnSecEnlace}>Volver</Link>
      </div>
    </>
  );
}

const e: Record<string, React.CSSProperties> = {
  card: {
    background: '#fff', border: '1px solid #E4E4DF', borderRadius: 8,
    padding: 20, marginBottom: 14, maxWidth: 720,
  },
  h2: { fontSize: 14.5, margin: '0 0 4px', fontWeight: 600 },
  nota: { fontSize: 11.5, color: '#8A929C' },
  label: { display: 'block', fontSize: 12, fontWeight: 600, margin: '12px 0 5px' },
  input: {
    width: '100%', padding: '9px 11px', border: '1px solid #DFDFD8',
    borderRadius: 4, fontSize: 13, boxSizing: 'border-box', fontFamily: 'inherit',
  },
  dos: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 12 },
  tres: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 12 },

  puntaje: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    gap: 14, flexWrap: 'wrap', marginTop: 16, padding: '12px 14px',
    borderRadius: 6, borderWidth: 1, borderStyle: 'solid',
  },
  btnRepartir: {
    background: '#fff', border: '1px solid #DFDFD8', color: '#14263F',
    padding: '7px 14px', borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: 'pointer',
  },

  cabeceraPregunta: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  filaOpcion: { display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 },
  x: { background: 'none', border: 'none', color: '#9B1C1C', fontSize: 17, cursor: 'pointer', padding: '0 4px' },
  enlace: { background: 'none', border: 'none', fontSize: 12, cursor: 'pointer', padding: '6px 0', fontWeight: 600 },
  btnBorrar: { background: 'none', border: 'none', color: '#9B1C1C', fontSize: 11.5, cursor: 'pointer', textDecoration: 'underline' },

  btn: { color: '#fff', border: 'none', padding: '11px 22px', borderRadius: 4, fontSize: 13, fontWeight: 600 },
  btnSec: {
    background: '#fff', color: '#14263F', border: '1px solid #DFDFD8',
    padding: '10px 18px', borderRadius: 4, fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
  },
  btnSecEnlace: {
    background: '#fff', color: '#14263F', border: '1px solid #DFDFD8',
    padding: '11px 22px', borderRadius: 4, fontSize: 13, fontWeight: 600,
    textDecoration: 'none', display: 'inline-block',
  },
  aviso: { padding: '10px 14px', borderRadius: 6, fontSize: 13, marginBottom: 14, maxWidth: 720 },
};
