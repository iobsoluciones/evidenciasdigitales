'use client';

/**
 * NUEVA LISTA DE VERIFICACIÓN
 * El tipo determina dónde se usa: una lista de equipo se aplica a una
 * unidad del inventario; una de área, a una zona de la planta.
 */
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  crearPlantillaInspeccion, type TipoInspeccion,
} from '@/lib/acciones-inspecciones';

const TIPOS: Array<{ v: TipoInspeccion; t: string; nota: string }> = [
  { v: 'planeada', t: 'Planeada', nota: 'Extintores, botiquines, camillas — elementos fijos' },
  { v: 'area', t: 'De área', nota: 'Recorrido por planta, bodega o zona' },
  { v: 'equipo', t: 'De equipo', nota: 'Se aplica a una unidad concreta del inventario' },
  { v: 'auditoria', t: 'Auditoría', nota: 'Al sistema de gestión completo' },
];

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

export default function FormularioPlantillaInspeccion({ color }: { color: string }) {
  const router = useRouter();
  const [pendiente, startTransition] = useTransition();
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  const [f, setF] = useState({
    nombre: '',
    tipo: 'planeada' as TipoInspeccion,
    descripcion: '',
    norma: '',
    periodicidad: 'mensual',
  });

  function crear() {
    startTransition(async () => {
      const r = await crearPlantillaInspeccion(f);
      setAviso({ tipo: r.ok ? 'ok' : 'error', texto: r.mensaje });
      // Se va al editor: una lista sin criterios no sirve de nada
      if (r.ok && r.id) router.push(`/panel/inspecciones/plantillas/${r.id}`);
    });
  }

  return (
    <section style={e.card}>
      <label style={e.label}>Tipo</label>
      <div style={e.opciones}>
        {TIPOS.map((t) => (
          <button
            key={t.v}
            onClick={() => setF({ ...f, tipo: t.v })}
            style={{
              ...e.opcion,
              borderColor: f.tipo === t.v ? color : 'var(--borde-fuerte)',
              background: f.tipo === t.v ? 'var(--superficie-3)' : 'var(--superficie)',
            }}
          >
            <strong style={{ fontSize: 13, color: f.tipo === t.v ? color : 'var(--texto)' }}>
              {t.t}
            </strong>
            <p style={e.notaOpcion}>{t.nota}</p>
          </button>
        ))}
      </div>

      <label style={e.label}>Nombre</label>
      <input
        value={f.nombre}
        onChange={(x) => setF({ ...f, nombre: x.target.value.toUpperCase() })}
        placeholder="INSPECCIÓN DE TABLEROS ELÉCTRICOS"
        style={{ ...e.input, textTransform: 'uppercase' }}
      />

      <label style={e.label}>Descripción</label>
      <textarea
        value={f.descripcion}
        rows={2}
        onChange={(x) => setF({ ...f, descripcion: x.target.value })}
        placeholder="Qué cubre esta lista"
        style={{ ...e.input, resize: 'vertical' }}
      />

      <div style={e.dos}>
        <div>
          <label style={e.label}>Norma de referencia</label>
          <input
            value={f.norma}
            onChange={(x) => setF({ ...f, norma: x.target.value })}
            placeholder="RETIE, NTC 2050…"
            style={e.input}
          />
        </div>
        <div>
          <label style={e.label}>Periodicidad</label>
          <select
            value={f.periodicidad}
            onChange={(x) => setF({ ...f, periodicidad: x.target.value })}
            style={e.input}
          >
            {PERIODOS.map((x) => <option key={x.v} value={x.v}>{x.t}</option>)}
          </select>
        </div>
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

      <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
        <button
          onClick={crear}
          disabled={pendiente}
          style={{ ...e.btn, background: pendiente ? 'var(--borde-fuerte)' : color }}
        >
          {pendiente ? 'Creando…' : 'Crear y agregar criterios'}
        </button>
        <Link href="/panel/inspecciones/plantillas" style={e.btnSec}>Cancelar</Link>
      </div>
    </section>
  );
}

const e: Record<string, React.CSSProperties> = {
  card: {
    background: 'var(--superficie)', borderWidth: 1, borderStyle: 'solid', borderColor: 'var(--borde)',
    borderRadius: 8, padding: 22, maxWidth: 700,
  },
  label: { display: 'block', fontSize: 12, fontWeight: 600, margin: '14px 0 6px' },
  input: {
    width: '100%', padding: '9px 11px', borderWidth: 1, borderStyle: 'solid',
    borderColor: 'var(--borde-fuerte)', borderRadius: 4, fontSize: 13,
    boxSizing: 'border-box', fontFamily: 'inherit', background: 'var(--superficie)',
  },
  dos: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 12 },

  opciones: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 10 },
  opcion: {
    borderWidth: 2, borderStyle: 'solid', borderRadius: 8, padding: 14,
    cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
  },
  notaOpcion: { fontSize: 11, color: 'var(--texto-suave)', margin: '5px 0 0', lineHeight: 1.5 },

  aviso: { marginTop: 16, padding: '10px 14px', borderRadius: 6, fontSize: 13 },
  btn: {
    color: 'var(--sobre-marca)', border: 'none', padding: '11px 22px', borderRadius: 4,
    fontSize: 13, fontWeight: 600, cursor: 'pointer',
  },
  btnSec: {
    background: 'var(--superficie)', color: 'var(--texto)',
    borderWidth: 1, borderStyle: 'solid', borderColor: 'var(--borde-fuerte)',
    padding: '11px 22px', borderRadius: 4, fontSize: 13, fontWeight: 600,
    textDecoration: 'none', display: 'inline-block',
  },
};
