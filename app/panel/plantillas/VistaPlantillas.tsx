'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  eliminarPlantillaEvaluacion, eliminarPlantillaCapacitacion,
  type PlantillaEvaluacion, type PlantillaCapacitacion,
} from '@/lib/acciones-plantillas';

export default function VistaPlantillas({
  evaluaciones,
  capacitaciones,
  color,
}: {
  evaluaciones: PlantillaEvaluacion[];
  capacitaciones: PlantillaCapacitacion[];
  color: string;
}) {
  const router = useRouter();
  const [pendiente, startTransition] = useTransition();
  const [pestana, setPestana] = useState<'capacitaciones' | 'evaluaciones'>('capacitaciones');
  const [aviso, setAviso] = useState<string>('');

  function borrarEval(id: string) {
    startTransition(async () => {
      const r = await eliminarPlantillaEvaluacion(id);
      setAviso(r.mensaje);
      if (r.ok) router.refresh();
    });
  }

  function borrarCap(id: string) {
    startTransition(async () => {
      const r = await eliminarPlantillaCapacitacion(id);
      setAviso(r.mensaje);
      if (r.ok) router.refresh();
    });
  }

  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString('es-CO', { dateStyle: 'medium' });

  return (
    <>
      <div style={e.pestanas}>
        <Pestana
          activa={pestana === 'capacitaciones'}
          onClick={() => setPestana('capacitaciones')}
          color={color}
        >
          Capacitaciones ({capacitaciones.length})
        </Pestana>
        <Pestana
          activa={pestana === 'evaluaciones'}
          onClick={() => setPestana('evaluaciones')}
          color={color}
        >
          Evaluaciones ({evaluaciones.length})
        </Pestana>
      </div>

      {aviso && <div style={e.aviso}>{aviso}</div>}

      {pestana === 'capacitaciones' ? (
        capacitaciones.length === 0 ? (
          <Vacio texto="Sin plantillas de capacitación. Guarda una desde el detalle de cualquier capacitación con «Guardar como plantilla»." />
        ) : (
          <div style={e.grid}>
            {capacitaciones.map((p) => (
              <article key={p.id} style={e.tarjeta}>
                <div style={{ ...e.franja, background: color }} />
                <div style={e.cuerpo}>
                  <h3 style={e.nombre}>{p.nombre}</h3>
                  <p style={e.tema}>{p.tema}</p>

                  <dl style={e.datos}>
                    {p.instructor && <Dato k="Instructor" v={p.instructor} />}
                    {p.duracion_horas && <Dato k="Duración" v={`${p.duracion_horas} h`} />}
                    {p.esperados && <Dato k="Esperados" v={String(p.esperados)} />}
                    <Dato
                      k="Evaluación"
                      v={p.evaluacion_nombre ? 'Incluida' : 'No'}
                      destacado={Boolean(p.evaluacion_nombre)}
                    />
                    <Dato k="Usada" v={`${p.veces_usada} ${p.veces_usada === 1 ? 'vez' : 'veces'}`} />
                  </dl>

                  <div style={e.pie}>
                    <span style={e.fecha}>{fmt(p.created_at)}</span>
                    <button
                      onClick={() => borrarCap(p.id)}
                      disabled={pendiente}
                      style={e.btnBorrar}
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )
      ) : evaluaciones.length === 0 ? (
        <Vacio texto="Sin plantillas de evaluación. Guarda una desde el editor de cualquier evaluación con «Guardar en el banco»." />
      ) : (
        <div style={e.grid}>
          {evaluaciones.map((p) => (
            <article key={p.id} style={e.tarjeta}>
              <div style={{ ...e.franja, background: '#0EA5E9' }} />
              <div style={e.cuerpo}>
                <h3 style={e.nombre}>{p.nombre}</h3>
                {p.descripcion && <p style={e.tema}>{p.descripcion}</p>}

                <dl style={e.datos}>
                  <Dato k="Preguntas" v={String(p.preguntas)} />
                  <Dato k="Mínimo" v={`${p.puntaje_minimo}%`} />
                  <Dato
                    k="Intentos"
                    v={p.max_intentos === 1 ? 'Sin reintento' : String(p.max_intentos)}
                  />
                  <Dato k="Usada" v={`${p.veces_usada} ${p.veces_usada === 1 ? 'vez' : 'veces'}`} />
                </dl>

                {p.subtemas?.length > 0 && (
                  <div style={e.subtemas}>
                    {p.subtemas.map((t) => (
                      <span key={t} style={e.chip}>{t}</span>
                    ))}
                  </div>
                )}

                <div style={e.pie}>
                  <span style={e.fecha}>{fmt(p.created_at)}</span>
                  <button
                    onClick={() => borrarEval(p.id)}
                    disabled={pendiente}
                    style={e.btnBorrar}
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <p style={e.nota}>
        Al aplicar una plantilla, su contenido se <strong>copia</strong> a la
        capacitación y queda editable. Modificar la plantilla después no altera
        lo que ya se aplicó — de otro modo, cambiar una plantilla alteraría
        evaluaciones ya respondidas.
      </p>
    </>
  );
}

function Pestana({
  activa, onClick, color, children,
}: {
  activa: boolean; onClick: () => void; color: string; children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        ...e.pestana,
        color: activa ? color : 'var(--texto-tenue)',
        borderBottomColor: activa ? color : 'transparent',
        fontWeight: activa ? 700 : 500,
      }}
    >
      {children}
    </button>
  );
}

function Dato({ k, v, destacado }: { k: string; v: string; destacado?: boolean }) {
  return (
    <div style={e.fila}>
      <dt style={e.clave}>{k}</dt>
      <dd style={{ ...e.valor, color: destacado ? 'var(--bien)' : 'var(--texto)' }}>{v}</dd>
    </div>
  );
}

function Vacio({ texto }: { texto: string }) {
  return (
    <div style={e.vacio}>
      <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.6, maxWidth: 460 }}>{texto}</p>
    </div>
  );
}

const e: Record<string, React.CSSProperties> = {
  pestanas: { display: 'flex', gap: 4, borderBottom: '1px solid var(--borde)', marginBottom: 20 },
  pestana: {
    background: 'none', border: 'none', padding: '10px 16px', fontSize: 13,
    cursor: 'pointer', fontFamily: 'inherit',
    borderBottomWidth: 2, borderBottomStyle: 'solid', marginBottom: -1,
  },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(270px,1fr))', gap: 16 },
  tarjeta: { background: 'var(--superficie)', border: '1px solid var(--borde)', borderRadius: 8, overflow: 'hidden' },
  franja: { height: 3 },
  cuerpo: { padding: 18 },
  nombre: { fontSize: 14.5, margin: '0 0 3px', fontWeight: 600 },
  tema: { fontSize: 12, color: 'var(--texto-suave)', margin: '0 0 12px', lineHeight: 1.5 },
  datos: { margin: 0 },
  fila: {
    display: 'flex', justifyContent: 'space-between', gap: 10,
    padding: '5px 0', borderBottom: '1px solid var(--superficie-3)', fontSize: 12,
  },
  clave: { color: 'var(--texto-tenue)', margin: 0 },
  valor: { margin: 0, fontWeight: 600, textAlign: 'right' },
  subtemas: { display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 12 },
  chip: {
    fontSize: 10, background: 'var(--info-fondo)', color: 'var(--info)',
    padding: '3px 8px', borderRadius: 999,
  },
  pie: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 14, paddingTop: 10, borderTop: '1px solid var(--superficie-3)',
  },
  fecha: { fontSize: 11, color: 'var(--texto-tenue)' },
  btnBorrar: {
    background: 'none', border: 'none', color: 'var(--mal)',
    fontSize: 11.5, cursor: 'pointer', textDecoration: 'underline',
  },
  vacio: {
    background: 'var(--superficie)', border: '1px dashed var(--borde-fuerte)', borderRadius: 8,
    padding: '40px 24px', textAlign: 'center', display: 'flex', justifyContent: 'center',
  },
  aviso: {
    background: 'var(--bien-fondo)', color: 'var(--bien)', padding: '10px 14px',
    borderRadius: 6, fontSize: 13, marginBottom: 16,
  },
  nota: { fontSize: 11.5, color: 'var(--texto-tenue)', marginTop: 20, lineHeight: 1.6, maxWidth: 640 },
};
