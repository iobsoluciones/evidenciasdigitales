'use client';

/**
 * AUTOEVALUACIÓN DE ESTÁNDARES MÍNIMOS
 * ---------------------------------------------------------------
 * Resolución 0312 de 2019, arts. 27 y 28.
 *
 * El puntaje manda en la pantalla porque es el número que el gerente
 * entiende sin formación en SST y el que decide si hay que hacer plan
 * de mejoramiento.
 *
 * La regla que más puntos cuesta en una visita: un estándar marcado
 * «no aplica» sin justificar se puntúa en cero. Aquí se pide la
 * justificación en el momento de marcarlo, no después.
 */
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  crearAutoevaluacion, responderEstandar, cerrarAutoevaluacion, generarPlanMejoramiento,
  type DetalleAuto, type ItemEstandar, type Resultado_, type ResumenAuto, type Criterio,
} from '@/lib/acciones-autoevaluacion';

const CICLOS: Record<string, string> = {
  planear: 'I. Planear', hacer: 'II. Hacer',
  verificar: 'III. Verificar', actuar: 'IV. Actuar',
};

const CRITERIOS: Record<Criterio, { t: string; fondo: string; color: string; que: string }> = {
  critico: {
    t: 'Crítico', fondo: '#FDF2F2', color: '#9B1C1C',
    que: 'Menos del 60 %. Exige plan de mejoramiento inmediato y la ARL debe hacer seguimiento.',
  },
  moderadamente_aceptable: {
    t: 'Moderadamente aceptable', fondo: '#FFF7ED', color: '#9A3412',
    que: 'Entre 60 y 85 %. Exige plan de mejoramiento y comunicarlo a la ARL.',
  },
  aceptable: {
    t: 'Aceptable', fondo: '#E6F4EA', color: '#1E6B3A',
    que: 'Más del 85 %. Mantener el sistema y las evidencias al día.',
  },
};

const RESULTADOS: { v: Resultado_; t: string; fondo: string; color: string }[] = [
  { v: 'cumple', t: 'Cumple', fondo: '#E6F4EA', color: '#1E6B3A' },
  { v: 'no_cumple', t: 'No cumple', fondo: '#FDF2F2', color: '#9B1C1C' },
  { v: 'no_aplica', t: 'No aplica', fondo: '#F0F0EC', color: '#5B6470' },
];

export default function VistaAutoevaluacion({
  lista,
  detalle,
  color,
}: {
  lista: ResumenAuto[];
  detalle: DetalleAuto | null;
  color: string;
}) {
  const router = useRouter();
  const [pendiente, startTransition] = useTransition();
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);
  const [alcance, setAlcance] = useState(60);
  const [justificando, setJustificando] = useState<{ id: string; texto: string } | null>(null);
  const [responsable, setResponsable] = useState('');

  const a = detalle?.autoevaluacion;
  const items = detalle?.items ?? [];
  const p = detalle?.puntaje;
  const crit = detalle?.criterio ? CRITERIOS[detalle.criterio] : null;
  const cerrada = a?.estado === 'cerrada';

  const correr = (fn: () => Promise<{ ok: boolean; mensaje: string }>) => {
    setAviso(null);
    startTransition(async () => {
      const r = await fn();
      setAviso({ tipo: r.ok ? 'ok' : 'error', texto: r.mensaje });
      if (r.ok) router.refresh();
    });
  };

  function responder(item: ItemEstandar, v: Resultado_) {
    // «No aplica» exige justificación: la base la rechaza sin ella y
    // pedirla aquí evita el ida y vuelta.
    if (v === 'no_aplica') {
      setJustificando({ id: item.id, texto: item.justificacion ?? '' });
      return;
    }
    correr(() => responderEstandar(item.id, v));
  }

  function guardarJustificacion() {
    if (!justificando) return;
    if (!justificando.texto.trim()) {
      setAviso({ tipo: 'error', texto: 'Escribe por qué no aplica: sin justificación la norma lo puntúa en cero.' });
      return;
    }
    correr(async () => {
      const r = await responderEstandar(justificando.id, 'no_aplica', justificando.texto);
      if (r.ok) setJustificando(null);
      return r;
    });
  }

  const anio = new Date().getFullYear();

  /* ---------- Sin autoevaluación ---------- */
  if (!a) {
    return (
      <>
        <div style={s.vacio}>
          <h2 style={s.vacioTitulo}>No hay autoevaluación de {anio}</h2>
          <p style={s.vacioTexto}>
            Es obligatoria y anual. Su puntaje determina el criterio de valoración
            de la empresa y si hay que presentar plan de mejoramiento.
          </p>
          <label style={s.label}>Cuántos estándares aplican</label>
          <select value={alcance} onChange={(e) => setAlcance(Number(e.target.value))}
            style={{ ...s.input, maxWidth: 420, marginBottom: 6 }}>
            <option value={7}>7 · menos de 10 trabajadores, riesgo I, II o III</option>
            <option value={21}>21 · de 11 a 50 trabajadores, riesgo I, II o III</option>
            <option value={60}>60 · más de 50 trabajadores, o riesgo IV o V</option>
          </select>
          <p style={s.ayuda}>
            El puntaje sobre 100 con la tabla oficial corresponde al conjunto de 60.
            Para 7 y 21 el porcentaje se calcula proporcionalmente sobre los
            estándares seleccionados.
          </p>
          <button onClick={() => correr(() => crearAutoevaluacion(anio, alcance))}
            disabled={pendiente} type="button"
            style={{ ...s.botonLleno, background: pendiente ? '#cbd5e1' : color, marginTop: 12 }}>
            {pendiente ? 'Creando…' : `Crear la autoevaluación de ${anio}`}
          </button>
        </div>
        {aviso && <Aviso a={aviso} />}
      </>
    );
  }

  return (
    <>
      {/* ---------- Puntaje ---------- */}
      {p && crit && (
        <section style={{ ...s.puntaje, background: crit.fondo }}>
          <div>
            <div style={{ ...s.cifra, color: crit.color }}>{p.porcentaje}%</div>
            <div style={{ ...s.criterio, color: crit.color }}>{crit.t}</div>
          </div>
          <div style={s.puntajeDetalle}>
            <p style={{ ...s.criterioQue, color: crit.color }}>{crit.que}</p>
            <div style={s.conteos}>
              <span>{p.obtenido} de {p.posible} puntos</span>
              <span>{p.cumple} cumplen</span>
              <span>{p.no_cumple} no cumplen</span>
              {p.no_aplica > 0 && <span>{p.no_aplica} no aplican</span>}
              {p.sin_evaluar > 0 && <strong>{p.sin_evaluar} sin evaluar</strong>}
            </div>
          </div>
        </section>
      )}

      {detalle?.por_ciclo && detalle.por_ciclo.length > 0 && (
        <div style={s.ciclos}>
          {detalle.por_ciclo
            .slice()
            .sort((x, y) => Object.keys(CICLOS).indexOf(x.ciclo) - Object.keys(CICLOS).indexOf(y.ciclo))
            .map((c) => (
              <div key={c.ciclo} style={s.ciclo}>
                <span style={s.cicloNombre}>{CICLOS[c.ciclo] ?? c.ciclo}</span>
                <span style={{ ...s.cicloPct, color }}>{c.porcentaje}%</span>
                <span style={s.cicloPeso}>{c.obtenido} / {c.posible} pts</span>
              </div>
            ))}
        </div>
      )}

      {aviso && <Aviso a={aviso} />}

      {/* ---------- Acciones ---------- */}
      <div style={s.barra}>
        <span style={s.meta}>
          {a.codigo} · {a.alcance} estándares · {cerrada ? 'cerrada' : 'en diligenciamiento'}
        </span>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {detalle?.requiere_plan && (
            <>
              <input value={responsable} onChange={(e) => setResponsable(e.target.value)}
                placeholder="Responsable del plan" style={{ ...s.input, width: 190 }} />
              <button onClick={() => correr(() => generarPlanMejoramiento(a.id, responsable))}
                disabled={pendiente} type="button"
                style={{ ...s.botonSec, borderColor: color, color }}>
                Generar plan de mejoramiento
              </button>
            </>
          )}
          {!cerrada && (
            <button onClick={() => correr(() => cerrarAutoevaluacion(a.id))}
              disabled={pendiente || (p?.sin_evaluar ?? 0) > 0} type="button"
              title={(p?.sin_evaluar ?? 0) > 0 ? 'Faltan estándares por evaluar' : undefined}
              style={{
                ...s.botonLleno,
                background: (p?.sin_evaluar ?? 0) > 0 ? '#D8DCDF' : color,
                color: (p?.sin_evaluar ?? 0) > 0 ? '#8A929C' : '#fff',
                cursor: (p?.sin_evaluar ?? 0) > 0 ? 'not-allowed' : 'pointer',
              }}>
              Cerrar autoevaluación
            </button>
          )}
        </div>
      </div>

      {/* ---------- Estándares ---------- */}
      {Object.keys(CICLOS).map((ciclo) => {
        const del = items.filter((i) => i.ciclo === ciclo);
        if (del.length === 0) return null;
        return (
          <section key={ciclo} style={s.bloque}>
            <h3 style={s.h3}>{CICLOS[ciclo]}</h3>
            {del.map((i) => (
              <div key={i.id} style={s.item}>
                <div style={s.itemCab}>
                  <span style={s.itemCodigo}>{i.codigo}</span>
                  <span style={s.itemNombre}>{i.nombre}</span>
                  <span style={s.itemPeso}>{i.peso} pts</span>
                </div>

                {justificando?.id === i.id ? (
                  <div style={s.justif}>
                    <label style={s.label}>Por qué no aplica *</label>
                    <textarea rows={2} value={justificando.texto}
                      onChange={(e) => setJustificando({ ...justificando, texto: e.target.value })}
                      style={{ ...s.input, resize: 'vertical' }}
                      placeholder="La empresa no tiene trabajadores en actividades de alto riesgo…" />
                    <p style={s.ayuda}>
                      Sin justificación la norma puntúa este estándar en cero.
                    </p>
                    <div style={s.acciones}>
                      <button onClick={() => setJustificando(null)} style={s.botonPlano} type="button">
                        Cancelar
                      </button>
                      <button onClick={guardarJustificacion} disabled={pendiente} type="button"
                        style={{ ...s.botonSec, borderColor: color, color }}>
                        Guardar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={s.opciones}>
                    {RESULTADOS.map((r) => (
                      <button key={r.v} onClick={() => responder(i, r.v)}
                        disabled={cerrada || pendiente} type="button"
                        style={{
                          ...s.opcion,
                          ...(i.resultado === r.v
                            ? { background: r.fondo, color: r.color, borderColor: r.color, fontWeight: 700 }
                            : {}),
                          cursor: cerrada ? 'default' : 'pointer',
                        }}>
                        {r.t}
                      </button>
                    ))}
                    {i.justificacion && (
                      <span style={s.justificacion}>{i.justificacion}</span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </section>
        );
      })}

      {lista.length > 1 && (
        <section style={s.bloque}>
          <h3 style={s.h3}>Otros años</h3>
          {lista.map((x) => (
            <div key={x.id} style={s.otroAnio}>
              <strong>{x.anio}</strong> · {x.codigo} · {x.alcance} estándares ·{' '}
              {x.estado === 'cerrada' ? 'cerrada' : `${x.pendientes} pendientes`}
            </div>
          ))}
        </section>
      )}
    </>
  );
}

function Aviso({ a }: { a: { tipo: 'ok' | 'error'; texto: string } }) {
  return (
    <div style={{
      ...s.aviso,
      background: a.tipo === 'ok' ? '#E6F4EA' : '#FDF2F2',
      color: a.tipo === 'ok' ? '#1E6B3A' : '#9B1C1C',
    }}>{a.texto}</div>
  );
}

const s: Record<string, React.CSSProperties> = {
  vacio: {
    background: '#fff', border: '1px solid #E4E4DF', borderRadius: 12,
    padding: '22px 24px', maxWidth: 620, marginBottom: 16,
  },
  vacioTitulo: { fontSize: 17, fontWeight: 700, color: '#14263F', margin: '0 0 8px' },
  vacioTexto: { fontSize: 13.5, color: '#5B6470', lineHeight: 1.65, margin: '0 0 14px' },

  puntaje: {
    display: 'flex', gap: 22, alignItems: 'center', flexWrap: 'wrap',
    borderRadius: 12, padding: '18px 22px', marginBottom: 12,
  },
  cifra: { fontSize: 44, fontWeight: 700, lineHeight: 1, fontVariantNumeric: 'tabular-nums' },
  criterio: { fontSize: 13, fontWeight: 700, marginTop: 4 },
  puntajeDetalle: { flex: '1 1 260px' },
  criterioQue: { fontSize: 13, lineHeight: 1.6, margin: '0 0 8px', opacity: .9 },
  conteos: {
    display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 12,
    color: '#374151', fontVariantNumeric: 'tabular-nums',
  },

  ciclos: {
    display: 'grid', gap: 10, marginBottom: 14,
    gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))',
  },
  ciclo: {
    background: '#fff', border: '1px solid #E4E4DF', borderRadius: 10,
    padding: '11px 13px', display: 'flex', flexDirection: 'column', gap: 2,
  },
  cicloNombre: { fontSize: 11, color: '#5B6470' },
  cicloPct: { fontSize: 20, fontWeight: 700, lineHeight: 1.1, fontVariantNumeric: 'tabular-nums' },
  cicloPeso: { fontSize: 10.5, color: '#8A929C' },

  barra: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    gap: 12, flexWrap: 'wrap', marginBottom: 14,
  },
  meta: { fontSize: 12.5, color: '#5B6470' },

  bloque: {
    background: '#fff', border: '1px solid #E4E4DF', borderRadius: 12,
    padding: '14px 16px', marginBottom: 12,
  },
  h3: { fontSize: 14, fontWeight: 700, color: '#14263F', margin: '0 0 10px' },
  item: { padding: '10px 0', borderTop: '1px solid #F0F0EC' },
  itemCab: { display: 'flex', gap: 10, alignItems: 'baseline', flexWrap: 'wrap', marginBottom: 7 },
  itemCodigo: {
    fontFamily: "'Consolas','Courier New',monospace", fontSize: 11.5,
    fontWeight: 700, color: '#5B6470', flexShrink: 0,
  },
  itemNombre: { fontSize: 13, color: '#14263F', flex: '1 1 240px', lineHeight: 1.45 },
  itemPeso: { fontSize: 11, color: '#8A929C', flexShrink: 0, fontVariantNumeric: 'tabular-nums' },
  opciones: { display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' },
  opcion: {
    background: '#fff', border: '1px solid #E4E4DF', borderRadius: 7,
    padding: '5px 14px', fontSize: 12, color: '#5B6470',
  },
  justificacion: { fontSize: 11.5, color: '#5B6470', fontStyle: 'italic', marginLeft: 6 },
  justif: {
    background: '#F7F7F4', border: '1px solid #E4E4DF',
    borderRadius: 9, padding: '12px 14px',
  },
  label: { display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5, color: '#14263F' },
  input: {
    width: '100%', padding: '8px 11px', border: '1px solid #E4E4DF',
    borderRadius: 8, fontSize: 13, boxSizing: 'border-box',
    fontFamily: 'inherit', background: '#fff', color: '#14263F',
  },
  ayuda: { fontSize: 11.5, color: '#8A929C', margin: '5px 0 0', lineHeight: 1.5 },
  aviso: { padding: '10px 13px', borderRadius: 8, fontSize: 13, marginBottom: 14 },
  acciones: { display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 10 },
  botonPlano: {
    background: 'none', border: 'none', color: '#5B6470',
    fontSize: 12.5, fontWeight: 600, cursor: 'pointer', padding: '8px 12px',
  },
  botonSec: {
    background: '#fff', borderWidth: 1, borderStyle: 'solid', borderRadius: 8,
    padding: '8px 16px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
  },
  botonLleno: {
    color: '#fff', border: 'none', padding: '9px 20px', borderRadius: 8,
    fontSize: 13, fontWeight: 600, cursor: 'pointer',
  },
  otroAnio: { fontSize: 12.5, color: '#5B6470', padding: '7px 0', borderTop: '1px solid #F0F0EC' },
};
