'use client';

/**
 * EDITOR DE CRITERIOS
 * ---------------------------------------------------------------
 * Los criterios se agrupan por sección porque en campo se revisan por
 * bloques: primero la ubicación del extintor, después su estado físico,
 * al final la documentación. Ese orden es el del recorrido real.
 *
 * El marcador «crítico» es la decisión más importante de cada criterio:
 * un ítem crítico incumplido reprueba la inspección completa, sin
 * importar el puntaje. Hay cosas que no se compensan con otras.
 */
import { useState, useTransition, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  guardarItemsInspeccion,
  type DetallePlantilla, type ItemInspeccion, type TipoRespuesta,
} from '@/lib/acciones-inspecciones';

const PERIODOS = [
  { v: '', t: 'Sin definir' },
  { v: 'diaria', t: 'Diaria' },
  { v: 'semanal', t: 'Semanal' },
  { v: 'mensual', t: 'Mensual' },
  { v: 'bimestral', t: 'Bimestral' },
  { v: 'trimestral', t: 'Trimestral' },
  { v: 'semestral', t: 'Semestral' },
  { v: 'anual', t: 'Anual' },
  { v: 'uso', t: 'Antes de cada uso' },
];

const RESPUESTAS: Array<{ v: TipoRespuesta; t: string }> = [
  { v: 'cumple', t: 'Cumple / No cumple / N.A.' },
  { v: 'numerico', t: 'Valor numérico' },
  { v: 'texto', t: 'Texto libre' },
];

const NUEVO = (orden: number, seccion: string): ItemInspeccion => ({
  orden,
  seccion,
  criterio: '',
  tipo_respuesta: 'cumple',
  peso: 1,
  critico: false,
  ayuda: '',
});

export default function EditorCriterios({
  detalle,
  color,
}: {
  detalle: DetallePlantilla;
  color: string;
}) {
  const router = useRouter();
  const [pendiente, startTransition] = useTransition();

  const p = detalle.plantilla!;

  const [nombre, setNombre] = useState(p.nombre);
  const [descripcion, setDescripcion] = useState(p.descripcion ?? '');
  const [norma, setNorma] = useState(p.norma ?? '');
  const [periodicidad, setPeriodicidad] = useState(p.periodicidad ?? '');
  // Los campos opcionales llegan como null desde la base y React no
  // admite value={null} en un input controlado.
  const [items, setItems] = useState<ItemInspeccion[]>(
    (detalle.items ?? []).map((i) => ({
      ...i,
      seccion: i.seccion ?? '',
      ayuda: i.ayuda ?? '',
      criterio: i.criterio ?? '',
      tipo_respuesta: i.tipo_respuesta ?? 'cumple',
      peso: i.peso ?? 1,
      critico: i.critico ?? false,
    }))
  );
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  const secciones = useMemo(
    () => Array.from(new Set(items.map((i) => i.seccion).filter(Boolean))),
    [items]
  );

  const criticos = items.filter((i) => i.critico).length;
  const pesoTotal = items.reduce((t, i) => t + (Number(i.peso) || 0), 0);

  function actualizar(i: number, cambios: Partial<ItemInspeccion>) {
    setItems((xs) => xs.map((x, j) => (j === i ? { ...x, ...cambios } : x)));
  }

  function mover(i: number, direccion: -1 | 1) {
    const destino = i + direccion;
    if (destino < 0 || destino >= items.length) return;
    setItems((xs) => {
      const copia = [...xs];
      [copia[i], copia[destino]] = [copia[destino], copia[i]];
      return copia.map((x, k) => ({ ...x, orden: k + 1 }));
    });
  }

  function guardar() {
    startTransition(async () => {
      const r = await guardarItemsInspeccion(p.id, {
        nombre, descripcion, norma, periodicidad, items,
      });
      setAviso({ tipo: r.ok ? 'ok' : 'error', texto: r.mensaje });
      if (r.ok) router.refresh();
    });
  }

  return (
    <>
      {/* ---------- Datos de la lista ---------- */}
      <section style={e.card}>
        <h2 style={e.h2}>Datos de la lista</h2>

        <label style={e.label}>Nombre</label>
        <input
          value={nombre}
          onChange={(x) => setNombre(x.target.value.toUpperCase())}
          style={{ ...e.input, textTransform: 'uppercase' }}
        />

        <label style={e.label}>Descripción</label>
        <textarea
          value={descripcion}
          rows={2}
          onChange={(x) => setDescripcion(x.target.value)}
          style={{ ...e.input, resize: 'vertical' }}
        />

        <div style={e.dos}>
          <div>
            <label style={e.label}>Norma de referencia</label>
            <input
              value={norma}
              onChange={(x) => setNorma(x.target.value)}
              placeholder="NTC 2885, Res. 0312/2019…"
              style={e.input}
            />
          </div>
          <div>
            <label style={e.label}>Periodicidad</label>
            <select
              value={periodicidad}
              onChange={(x) => setPeriodicidad(x.target.value)}
              style={e.input}
            >
              {PERIODOS.map((x) => <option key={x.v} value={x.v}>{x.t}</option>)}
            </select>
          </div>
        </div>

        <div style={e.resumen}>
          <span><strong>{items.length}</strong> criterios</span>
          <span><strong>{criticos}</strong> críticos</span>
          <span><strong>{pesoTotal}</strong> puntos de peso</span>
          {secciones.length > 0 && <span><strong>{secciones.length}</strong> secciones</span>}
        </div>

        {p.es_base && (
          <p style={e.avisoBase}>
            Esta es una lista base del sistema. Si vas a adaptarla a un cliente
            concreto, conviene <strong>duplicarla</strong> primero para conservar
            la original.
          </p>
        )}
      </section>

      {/* ---------- Criterios ---------- */}
      {items.map((it, i) => {
        const nuevaSeccion = i === 0 || items[i - 1].seccion !== it.seccion;

        return (
          <div key={i}>
            {nuevaSeccion && it.seccion && (
              <div style={{ ...e.tituloSeccion, color }}>{it.seccion}</div>
            )}

            <section style={{
              ...e.criterio,
              borderLeftWidth: 3,
              borderLeftColor: it.critico ? 'var(--mal)' : 'var(--borde)',
            }}>
              <div style={e.cabeceraCriterio}>
                <span style={e.numero}>{i + 1}</span>
                <div style={e.flechas}>
                  <button onClick={() => mover(i, -1)} disabled={i === 0} style={e.flecha}>▴</button>
                  <button onClick={() => mover(i, 1)} disabled={i === items.length - 1} style={e.flecha}>▾</button>
                </div>
                <button
                  onClick={() => setItems((xs) => xs.filter((_, j) => j !== i))}
                  style={e.x}
                  title="Quitar criterio"
                >
                  ×
                </button>
              </div>

              <label style={e.labelMini}>Criterio</label>
              <textarea
                value={it.criterio}
                rows={2}
                onChange={(x) => actualizar(i, { criterio: x.target.value })}
                placeholder="El manómetro marca en la zona verde"
                style={{ ...e.input, resize: 'vertical' }}
              />

              <div style={e.tres}>
                <div>
                  <label style={e.labelMini}>Sección</label>
                  <input
                    value={it.seccion}
                    list="secciones-lista"
                    onChange={(x) => actualizar(i, { seccion: x.target.value.toUpperCase() })}
                    placeholder="ESTADO FÍSICO"
                    style={{ ...e.input, textTransform: 'uppercase' }}
                  />
                </div>
                <div>
                  <label style={e.labelMini}>Tipo de respuesta</label>
                  <select
                    value={it.tipo_respuesta}
                    onChange={(x) => actualizar(i, { tipo_respuesta: x.target.value as TipoRespuesta })}
                    style={e.input}
                  >
                    {RESPUESTAS.map((r) => <option key={r.v} value={r.v}>{r.t}</option>)}
                  </select>
                </div>
                <div>
                  <label style={e.labelMini}>Peso</label>
                  <input
                    type="number" min={1} max={10} value={it.peso}
                    onChange={(x) => actualizar(i, { peso: Math.max(1, Number(x.target.value) || 1) })}
                    style={e.input}
                  />
                </div>
              </div>

              <label style={e.labelMini}>Ayuda para quien inspecciona</label>
              <input
                value={it.ayuda}
                onChange={(x) => actualizar(i, { ayuda: x.target.value })}
                placeholder="Opcional — qué mirar exactamente"
                style={e.input}
              />

              <label style={e.check}>
                <input
                  type="checkbox"
                  checked={it.critico}
                  onChange={(x) => actualizar(i, { critico: x.target.checked })}
                  style={{ marginRight: 8 }}
                />
                Criterio crítico
              </label>
              <p style={e.notaCritico}>
                {it.critico
                  ? 'Su incumplimiento reprueba la inspección completa, sin importar el puntaje.'
                  : 'Resta puntaje según su peso, pero no reprueba por sí solo.'}
              </p>
            </section>
          </div>
        );
      })}

      <datalist id="secciones-lista">
        {secciones.map((s) => <option key={s} value={s} />)}
      </datalist>

      <button
        onClick={() => setItems((xs) => [
          ...xs,
          NUEVO(xs.length + 1, xs[xs.length - 1]?.seccion ?? ''),
        ])}
        style={{ ...e.btnSec, marginBottom: 16 }}
      >
        + Agregar criterio
      </button>

      {aviso && (
        <div style={{
          ...e.aviso,
          background: aviso.tipo === 'ok' ? 'var(--bien-fondo)' : 'var(--mal-fondo)',
          color: aviso.tipo === 'ok' ? 'var(--bien)' : 'var(--mal)',
        }}>
          {aviso.texto}
        </div>
      )}

      <div style={{ display: 'flex', gap: 10 }}>
        <button
          onClick={guardar}
          disabled={pendiente}
          style={{ ...e.btn, background: pendiente ? 'var(--borde-fuerte)' : color }}
        >
          {pendiente ? 'Guardando…' : 'Guardar lista'}
        </button>
        <Link href="/panel/inspecciones/plantillas" style={e.btnSecEnlace}>Volver</Link>
      </div>
    </>
  );
}

const e: Record<string, React.CSSProperties> = {
  card: {
    background: 'var(--superficie)', borderWidth: 1, borderStyle: 'solid', borderColor: 'var(--borde)',
    borderRadius: 8, padding: 20, marginBottom: 18, maxWidth: 760,
  },
  h2: { fontSize: 14.5, margin: '0 0 4px', fontWeight: 600 },

  label: { display: 'block', fontSize: 12, fontWeight: 600, margin: '14px 0 5px' },
  labelMini: { display: 'block', fontSize: 11, color: 'var(--texto-tenue)', margin: '10px 0 4px' },
  input: {
    width: '100%', padding: '9px 11px', borderWidth: 1, borderStyle: 'solid',
    borderColor: 'var(--borde-fuerte)', borderRadius: 4, fontSize: 13,
    boxSizing: 'border-box', fontFamily: 'inherit', background: 'var(--superficie)',
  },
  dos: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 12 },
  tres: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 10 },

  resumen: {
    display: 'flex', gap: 20, flexWrap: 'wrap', marginTop: 16, padding: '11px 14px',
    background: 'var(--superficie-2)', borderRadius: 6, fontSize: 12.5, color: 'var(--texto-suave)',
  },
  avisoBase: {
    fontSize: 11.5, color: 'var(--info)', background: 'var(--info-fondo)',
    padding: '10px 12px', borderRadius: 6, marginTop: 12, lineHeight: 1.6,
  },

  tituloSeccion: {
    fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase',
    letterSpacing: .6, margin: '18px 0 8px',
  },
  criterio: {
    background: 'var(--superficie)', borderWidth: 1, borderStyle: 'solid', borderColor: 'var(--borde)',
    borderRadius: 8, padding: 16, marginBottom: 10, maxWidth: 760,
  },
  cabeceraCriterio: { display: 'flex', gap: 8, alignItems: 'center' },
  numero: {
    fontSize: 11, color: 'var(--texto-tenue)', fontWeight: 700,
    fontFamily: 'ui-monospace,SFMono-Regular,Menlo,monospace',
  },
  flechas: { display: 'flex', gap: 2, marginLeft: 'auto' },
  flecha: {
    background: 'none', borderWidth: 1, borderStyle: 'solid', borderColor: 'var(--borde)',
    borderRadius: 3, color: 'var(--texto-tenue)', fontSize: 10,
    cursor: 'pointer', padding: '2px 6px',
  },
  x: { background: 'none', border: 'none', color: 'var(--mal)', fontSize: 18, cursor: 'pointer', padding: '0 4px' },

  check: { display: 'flex', alignItems: 'center', fontSize: 12.5, marginTop: 12, cursor: 'pointer', fontWeight: 600 },
  notaCritico: { fontSize: 11, color: 'var(--texto-tenue)', margin: '3px 0 0', lineHeight: 1.5 },

  aviso: { padding: '10px 14px', borderRadius: 6, fontSize: 13, marginBottom: 14, maxWidth: 760 },
  btn: {
    color: 'var(--sobre-marca)', border: 'none', padding: '11px 22px', borderRadius: 4,
    fontSize: 13, fontWeight: 600, cursor: 'pointer',
  },
  btnSec: {
    background: 'var(--superficie)', color: 'var(--texto)',
    borderWidth: 1, borderStyle: 'solid', borderColor: 'var(--borde-fuerte)',
    padding: '10px 18px', borderRadius: 4, fontSize: 12.5,
    fontWeight: 600, cursor: 'pointer',
  },
  btnSecEnlace: {
    background: 'var(--superficie)', color: 'var(--texto)',
    borderWidth: 1, borderStyle: 'solid', borderColor: 'var(--borde-fuerte)',
    padding: '11px 22px', borderRadius: 4, fontSize: 13, fontWeight: 600,
    textDecoration: 'none', display: 'inline-block',
  },
};
