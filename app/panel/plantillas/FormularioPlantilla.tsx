'use client';

/**
 * PLANTILLA NUEVA — desde cero
 * ---------------------------------------------------------------
 * Hasta ahora las plantillas solo nacían de una capacitación ya
 * dictada. Eso obliga a dictarla una vez antes de poder reutilizarla,
 * y a veces uno quiere preparar el contenido antes: al llegar un
 * cliente nuevo, tener listo el catálogo de lo que se ofrece.
 */
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  crearPlantillaCapacitacion, crearPlantillaEvaluacionVacia,
} from '@/lib/acciones-plantillas';

export default function FormularioPlantilla({
  tipoInicial,
  color,
}: {
  tipoInicial: 'capacitacion' | 'evaluacion';
  color: string;
}) {
  const router = useRouter();
  const [pendiente, startTransition] = useTransition();
  const [tipo, setTipo] = useState(tipoInicial);
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  const [cap, setCap] = useState({
    nombre: '', tema: '', descripcion: '', instructor: '',
    duracion_horas: '2', esperados: '', es_evaluada: false,
    validar_empleados: false,
  });

  const [ev, setEv] = useState({ nombre: '', descripcion: '' });

  function crear() {
    startTransition(async () => {
      if (tipo === 'capacitacion') {
        const r = await crearPlantillaCapacitacion(cap);
        setAviso({ tipo: r.ok ? 'ok' : 'error', texto: r.mensaje });
        if (r.ok) router.push('/panel/plantillas');
      } else {
        const r = await crearPlantillaEvaluacionVacia(ev.nombre, ev.descripcion);
        setAviso({ tipo: r.ok ? 'ok' : 'error', texto: r.mensaje });
        // La evaluación necesita preguntas: se va directo a agregarlas
        if (r.ok && r.id) router.push(`/panel/plantillas/${r.id}`);
      }
    });
  }

  return (
    <>
      <div style={e.pestanas}>
        <button
          onClick={() => setTipo('capacitacion')}
          style={{ ...e.pestana, ...(tipo === 'capacitacion' ? { ...e.activa, color, borderBottomColor: color } : {}) }}
        >
          Capacitación
        </button>
        <button
          onClick={() => setTipo('evaluacion')}
          style={{ ...e.pestana, ...(tipo === 'evaluacion' ? { ...e.activa, color, borderBottomColor: color } : {}) }}
        >
          Evaluación
        </button>
      </div>

      <section style={e.card}>
        {tipo === 'capacitacion' ? (
          <>
            <Campo etiqueta="Nombre de la plantilla" valor={cap.nombre}
              onChange={(v) => setCap({ ...cap, nombre: v })}
              marcador="Inducción de alturas" mayus />
            <p style={e.ayuda}>
              Es como la verás en la lista al crear una capacitación.
            </p>

            <Campo etiqueta="Tema" valor={cap.tema}
              onChange={(v) => setCap({ ...cap, tema: v })}
              marcador="TRABAJO SEGURO EN ALTURAS" mayus />

            <label style={e.label}>Descripción</label>
            <textarea
              value={cap.descripcion}
              rows={3}
              onChange={(ev2) => setCap({ ...cap, descripcion: ev2.target.value.toUpperCase() })}
              placeholder="Contenido que se cubre en la sesión."
              style={{ ...e.input, resize: 'vertical', textTransform: 'uppercase' }}
            />

            <div style={e.tres}>
              <Campo etiqueta="Instructor habitual" valor={cap.instructor}
                onChange={(v) => setCap({ ...cap, instructor: v })} mayus />
              <div>
                <label style={e.label}>Duración (horas)</label>
                <input type="number" min={0.5} step={0.5} value={cap.duracion_horas}
                  onChange={(ev2) => setCap({ ...cap, duracion_horas: ev2.target.value })}
                  style={e.input} />
              </div>
              <div>
                <label style={e.label}>Asistentes previstos</label>
                <input type="number" min={1} value={cap.esperados}
                  placeholder="Opcional"
                  onChange={(ev2) => setCap({ ...cap, esperados: ev2.target.value })}
                  style={e.input} />
              </div>
            </div>

            <label style={e.check}>
              <input
                type="checkbox"
                checked={cap.es_evaluada}
                onChange={(ev2) => setCap({ ...cap, es_evaluada: ev2.target.checked })}
                style={{ marginRight: 8 }}
              />
              Esta capacitación se evalúa
            </label>

            <label style={e.check}>
              <input
                type="checkbox"
                checked={cap.validar_empleados}
                onChange={(ev2) => setCap({ ...cap, validar_empleados: ev2.target.checked })}
                style={{ marginRight: 8 }}
              />
              Validar asistentes contra la base de empleados
            </label>
          </>
        ) : (
          <>
            <Campo etiqueta="Nombre de la evaluación" valor={ev.nombre}
              onChange={(v) => setEv({ ...ev, nombre: v })}
              marcador="Evaluación de alturas" mayus />

            <label style={e.label}>Descripción</label>
            <textarea
              value={ev.descripcion}
              rows={2}
              onChange={(ev2) => setEv({ ...ev, descripcion: ev2.target.value })}
              placeholder="Opcional"
              style={{ ...e.input, resize: 'vertical' }}
            />

            <p style={e.ayuda}>
              Al crearla se abre el editor, donde se agregan las preguntas y
              se ajustan el puntaje mínimo y los intentos permitidos.
            </p>
          </>
        )}

        {aviso && (
          <div style={{
            ...e.aviso,
            background: aviso.tipo === 'ok' ? '#F0FDF4' : '#FDF2F2',
            color: aviso.tipo === 'ok' ? '#15803D' : '#9B1C1C',
          }}>
            {aviso.texto}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
          <button
            onClick={crear}
            disabled={pendiente}
            style={{ ...e.btn, background: pendiente ? '#C5C5BD' : color }}
          >
            {pendiente ? 'Creando…' : 'Crear plantilla'}
          </button>
          <Link href="/panel/plantillas" style={e.btnSec}>Cancelar</Link>
        </div>
      </section>
    </>
  );
}

function Campo({
  etiqueta, valor, onChange, mayus, marcador,
}: {
  etiqueta: string; valor: string; onChange: (v: string) => void;
  mayus?: boolean; marcador?: string;
}) {
  return (
    <div>
      <label style={e.label}>{etiqueta}</label>
      <input
        value={valor}
        placeholder={marcador}
        onChange={(ev) => onChange(mayus ? ev.target.value.toUpperCase() : ev.target.value)}
        style={{ ...e.input, textTransform: mayus ? 'uppercase' : 'none' }}
      />
    </div>
  );
}

const e: Record<string, React.CSSProperties> = {
  pestanas: { display: 'flex', gap: 4, borderBottom: '1px solid #E4E4DF', marginBottom: 18 },
  pestana: {
    background: 'none', border: 'none', padding: '10px 18px', fontSize: 13,
    cursor: 'pointer', fontFamily: 'inherit', color: '#8A929C',
    borderBottomWidth: 2, borderBottomStyle: 'solid', borderBottomColor: 'transparent',
    marginBottom: -1,
  },
  activa: { fontWeight: 700 },
  card: {
    background: '#fff', border: '1px solid #E4E4DF', borderRadius: 8,
    padding: 22, maxWidth: 660,
  },
  label: { display: 'block', fontSize: 12, fontWeight: 600, margin: '14px 0 5px' },
  input: {
    width: '100%', padding: '9px 11px', border: '1px solid #DFDFD8',
    borderRadius: 4, fontSize: 13, boxSizing: 'border-box', fontFamily: 'inherit',
  },
  ayuda: { fontSize: 11.5, color: '#8A929C', margin: '5px 0 0' },
  dos: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12 },
  tres: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12 },
  check: { display: 'flex', alignItems: 'center', fontSize: 12.5, marginTop: 16, cursor: 'pointer' },
  aviso: { marginTop: 16, padding: '10px 14px', borderRadius: 6, fontSize: 13 },
  btn: {
    color: '#fff', border: 'none', padding: '11px 22px', borderRadius: 4,
    fontSize: 13, fontWeight: 600, cursor: 'pointer',
  },
  btnSec: {
    background: '#fff', color: '#14263F', border: '1px solid #DFDFD8',
    padding: '11px 22px', borderRadius: 4, fontSize: 13, fontWeight: 600,
    textDecoration: 'none', display: 'inline-block',
  },
};
