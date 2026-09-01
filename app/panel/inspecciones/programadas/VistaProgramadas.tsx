'use client';

/**
 * CRONOGRAMA DE INSPECCIONES
 * ---------------------------------------------------------------
 * Lo vencido primero: una inspección que ya debía haberse hecho es
 * más urgente que la que viene. El aviso es visual, no por correo.
 *
 * Al marcar una como realizada, la base deja creada la siguiente si
 * es periódica, de modo que el ciclo no depende de que alguien se
 * acuerde de volver a programarla.
 */
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  programarInspeccion, cumplirProgramacion, cancelarProgramacion,
  type Programacion, type EstadoProgramacion,
} from '@/lib/acciones-programacion';
import type { PlantillaInspeccion } from '@/lib/acciones-inspecciones';

const PERIODICIDADES = [
  { v: '', t: 'Una sola vez' },
  { v: 'diaria', t: 'Diaria' },
  { v: 'semanal', t: 'Semanal' },
  { v: 'mensual', t: 'Mensual' },
  { v: 'bimestral', t: 'Bimestral' },
  { v: 'trimestral', t: 'Trimestral' },
  { v: 'semestral', t: 'Semestral' },
  { v: 'anual', t: 'Anual' },
];

const ESTADOS: Record<EstadoProgramacion, { t: string; c: string; f: string }> = {
  vencida: { t: 'Vencida', c: 'var(--mal)', f: 'var(--mal-fondo)' },
  proxima: { t: 'Esta semana', c: 'var(--ambar)', f: 'var(--ambar-fondo)' },
  pendiente: { t: 'Programada', c: '#1D4ED8', f: '#EFF6FF' },
  cumplida: { t: 'Realizada', c: 'var(--bien)', f: 'var(--bien-fondo)' },
  cancelada: { t: 'Cancelada', c: 'var(--texto-tenue)', f: 'var(--superficie-3)' },
};

const VACIO = {
  plantillaId: '', fecha: '', responsable: '',
  objetoNombre: '', periodicidad: '', notas: '',
};

function fmt(iso: string) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('es-CO', { dateStyle: 'medium' });
}

export default function VistaProgramadas({
  programaciones,
  plantillas,
  color,
}: {
  programaciones: Programacion[];
  plantillas: PlantillaInspeccion[];
  color: string;
}) {
  const router = useRouter();
  const [pendiente, startTransition] = useTransition();
  const [abierto, setAbierto] = useState(false);
  const [f, setF] = useState(VACIO);
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  const vencidas = programaciones.filter((p) => p.estado_real === 'vencida');
  const proximas = programaciones.filter((p) => p.estado_real === 'proxima');

  /** Al elegir plantilla se hereda su periodicidad, que ya está pensada. */
  function elegirPlantilla(id: string) {
    const p = plantillas.find((x) => x.id === id);
    setF((prev) => ({
      ...prev,
      plantillaId: id,
      periodicidad: p?.periodicidad && p.periodicidad !== 'uso' ? p.periodicidad : prev.periodicidad,
    }));
  }

  function guardar() {
    startTransition(async () => {
      const r = await programarInspeccion(f);
      setAviso({ tipo: r.ok ? 'ok' : 'error', texto: r.mensaje });
      if (r.ok) { setF(VACIO); setAbierto(false); router.refresh(); }
    });
  }

  function realizar(id: string) {
    startTransition(async () => {
      const r = await cumplirProgramacion(id);
      setAviso({ tipo: r.ok ? 'ok' : 'error', texto: r.mensaje });
      if (r.ok) router.refresh();
    });
  }

  function cancelar(id: string) {
    startTransition(async () => {
      const r = await cancelarProgramacion(id);
      setAviso({ tipo: r.ok ? 'ok' : 'error', texto: r.mensaje });
      if (r.ok) router.refresh();
    });
  }

  return (
    <>
      <div style={e.cabecera}>
        <div style={e.contadores}>
          {vencidas.length > 0 && (
            <span style={{ ...e.contador, background: 'var(--mal-fondo)', color: 'var(--mal)' }}>
              {vencidas.length} vencida{vencidas.length !== 1 ? 's' : ''}
            </span>
          )}
          {proximas.length > 0 && (
            <span style={{ ...e.contador, background: 'var(--ambar-fondo)', color: 'var(--ambar)' }}>
              {proximas.length} esta semana
            </span>
          )}
          <span style={e.total}>{programaciones.length} pendiente(s)</span>
        </div>

        <button
          onClick={() => { setAviso(null); setAbierto(!abierto); }}
          style={{ ...e.btn, background: abierto ? 'var(--texto-tenue)' : color }}
        >
          {abierto ? 'Cancelar' : '+ Programar inspección'}
        </button>
      </div>

      {aviso && (
        <div style={{
          ...e.aviso,
          background: aviso.tipo === 'ok' ? 'var(--bien-fondo)' : 'var(--mal-fondo)',
          color: aviso.tipo === 'ok' ? 'var(--bien)' : 'var(--mal)',
        }}>
          {aviso.texto}
        </div>
      )}

      {abierto && (
        <section style={e.card}>
          <h2 style={e.h2}>Nueva programación</h2>

          <label style={e.label}>Lista de verificación</label>
          <select
            value={f.plantillaId}
            onChange={(ev) => elegirPlantilla(ev.target.value)}
            style={e.input}
          >
            <option value="">Elige una…</option>
            {plantillas.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}{p.norma ? ` · ${p.norma}` : ''}
              </option>
            ))}
          </select>

          <div style={e.dos}>
            <div>
              <label style={e.label}>Fecha prevista</label>
              <input
                type="date"
                value={f.fecha}
                onChange={(ev) => setF({ ...f, fecha: ev.target.value })}
                style={e.input}
              />
            </div>
            <div>
              <label style={e.label}>Se repite</label>
              <select
                value={f.periodicidad}
                onChange={(ev) => setF({ ...f, periodicidad: ev.target.value })}
                style={e.input}
              >
                {PERIODICIDADES.map((p) => (
                  <option key={p.v} value={p.v}>{p.t}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={e.dos}>
            <div>
              <label style={e.label}>Área o lugar (opcional)</label>
              <input
                value={f.objetoNombre}
                onChange={(ev) => setF({ ...f, objetoNombre: ev.target.value.toUpperCase() })}
                placeholder="BODEGA 2"
                style={{ ...e.input, textTransform: 'uppercase' }}
              />
            </div>
            <div>
              <label style={e.label}>Responsable (opcional)</label>
              <input
                value={f.responsable}
                onChange={(ev) => setF({ ...f, responsable: ev.target.value })}
                placeholder="Quién la realiza"
                style={e.input}
              />
            </div>
          </div>

          <label style={e.label}>Notas (opcional)</label>
          <textarea
            value={f.notas}
            rows={2}
            onChange={(ev) => setF({ ...f, notas: ev.target.value })}
            style={{ ...e.input, resize: 'vertical' }}
          />

          <p style={e.nota}>
            Al marcarla como realizada, si se repite queda creada la siguiente
            automáticamente.
          </p>

          <button
            onClick={guardar}
            disabled={pendiente}
            style={{ ...e.btn, background: pendiente ? 'var(--borde-fuerte)' : color, marginTop: 14 }}
          >
            {pendiente ? 'Guardando…' : 'Programar'}
          </button>
        </section>
      )}

      {programaciones.length === 0 ? (
        <div style={e.vacio}>
          <p style={{ margin: '0 0 6px', fontSize: 14, fontWeight: 600 }}>
            Sin inspecciones programadas
          </p>
          <p style={e.explicacion}>
            Programa las que se repiten —extintores cada mes, señalización cada
            trimestre— y el sistema irá creando la siguiente cada vez que
            marques una como realizada.
          </p>
        </div>
      ) : (
        <div style={e.lista}>
          {programaciones.map((p) => {
            const est = ESTADOS[p.estado_real] ?? ESTADOS.pendiente;
            return (
              <article key={p.id} style={{
                ...e.fila,
                borderLeftColor: p.estado_real === 'vencida' ? 'var(--mal)'
                               : p.estado_real === 'proxima' ? '#E8C766' : 'var(--borde)',
              }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={e.nombre}>{p.nombre}</div>
                  <div style={e.meta}>
                    {fmt(p.fecha_programada)}
                    {p.objeto_nombre && <> · {p.objeto_nombre}</>}
                    {p.responsable && <> · {p.responsable}</>}
                    {p.periodicidad && <> · se repite {p.periodicidad}</>}
                  </div>
                  {p.notas && <div style={e.notas}>{p.notas}</div>}
                </div>

                <div style={e.derecha}>
                  <span style={{ ...e.chip, background: est.f, color: est.c }}>
                    {est.t}
                    {p.estado_real === 'vencida' && ` · ${Math.abs(p.dias)}d`}
                    {p.estado_real === 'proxima' && p.dias > 0 && ` · en ${p.dias}d`}
                  </span>

                  <div style={e.acciones}>
                    <Link
                      href={`/panel/inspecciones/nueva?plantilla=${p.plantilla_id}`}
                      style={e.btnMini}
                    >
                      Ejecutar
                    </Link>
                    <button
                      onClick={() => realizar(p.id)}
                      disabled={pendiente}
                      style={{ ...e.btnMini, color: 'var(--bien)' }}
                    >
                      Ya se hizo
                    </button>
                    <button
                      onClick={() => cancelar(p.id)}
                      disabled={pendiente}
                      style={{ ...e.btnMini, color: 'var(--mal)' }}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}

const e: Record<string, React.CSSProperties> = {
  cabecera: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    gap: 14, flexWrap: 'wrap', marginBottom: 16,
  },
  contadores: { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' },
  contador: { padding: '4px 11px', borderRadius: 11, fontSize: 12, fontWeight: 700 },
  total: { fontSize: 12, color: 'var(--texto-suave)' },
  btn: {
    color: 'var(--sobre-marca)', border: 'none', padding: '9px 16px', borderRadius: 4,
    fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
  },
  aviso: { padding: '10px 13px', borderRadius: 6, fontSize: 12.5, marginBottom: 14 },
  card: {
    background: 'var(--superficie)', border: '1px solid var(--borde)', borderRadius: 8,
    padding: 18, marginBottom: 18, maxWidth: 620,
  },
  h2: { fontSize: 15, margin: '0 0 14px', fontWeight: 600 },
  label: { display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5, marginTop: 10 },
  input: {
    width: '100%', padding: '9px 11px', border: '1px solid var(--borde-fuerte)',
    borderRadius: 4, fontSize: 13, boxSizing: 'border-box', fontFamily: 'inherit',
  },
  dos: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 12 },
  nota: { fontSize: 11.5, color: 'var(--texto-tenue)', margin: '14px 0 0', lineHeight: 1.5 },
  lista: { display: 'flex', flexDirection: 'column', gap: 10 },
  fila: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    gap: 14, flexWrap: 'wrap',
    background: 'var(--superficie)', border: '1px solid var(--borde)',
    borderLeftWidth: 3, borderLeftStyle: 'solid',
    borderRadius: 6, padding: '13px 15px',
  },
  nombre: { fontSize: 13.5, fontWeight: 600, color: 'var(--texto)' },
  meta: { fontSize: 11.5, color: 'var(--texto-suave)', marginTop: 3 },
  notas: { fontSize: 11.5, color: 'var(--texto-tenue)', marginTop: 5, fontStyle: 'italic' },
  derecha: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 7 },
  chip: { padding: '3px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' },
  acciones: { display: 'flex', gap: 6, flexWrap: 'wrap' },
  btnMini: {
    fontSize: 11.5, color: 'var(--texto)', background: 'var(--superficie)',
    border: '1px solid var(--borde-fuerte)', borderRadius: 4, padding: '4px 9px',
    cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'none',
    display: 'inline-block',
  },
  vacio: {
    background: 'var(--superficie)', border: '1px dashed var(--borde-fuerte)', borderRadius: 8,
    padding: '36px 24px', textAlign: 'center',
  },
  explicacion: { fontSize: 12.5, color: 'var(--texto-suave)', margin: 0, lineHeight: 1.6, maxWidth: 440, marginLeft: 'auto', marginRight: 'auto' },
};
