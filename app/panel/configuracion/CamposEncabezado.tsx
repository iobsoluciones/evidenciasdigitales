'use client';

/**
 * CAMPOS DEL ENCABEZADO — por empresa
 * ---------------------------------------------------------------
 * Cada empresa define qué aparece en su línea de control documental,
 * además de versión y nomenclatura: «APROBADO POR», «CÓDIGO INTERNO»,
 * «PROCESO»… lo que su sistema de gestión exija.
 *
 * Los valores se congelan en cada capacitación al crearla: un acta
 * emitida conserva su encabezado aunque después cambie esto.
 */
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { guardarCamposEncabezadoEmpresa } from '@/lib/acciones-empresas';

export type CampoEncabezado = { etiqueta: string; valor: string };

const MAXIMO = 4;

/** Etiquetas habituales en sistemas de gestión de calidad y SST. */
const SUGERENCIAS = [
  'APROBADO POR', 'ELABORADO POR', 'REVISADO POR',
  'CÓDIGO INTERNO', 'PROCESO', 'ÁREA RESPONSABLE',
];

export default function CamposEncabezado({
  empresaId,
  campos: iniciales,
  version,
  nomenclatura,
  titulo,
  color,
  esAdmin,
}: {
  empresaId: string;
  campos: CampoEncabezado[];
  version: string;
  nomenclatura: string;
  titulo: string;
  color: string;
  esAdmin: boolean;
}) {
  const router = useRouter();
  const [pendiente, startTransition] = useTransition();
  const [campos, setCampos] = useState<CampoEncabezado[]>(iniciales ?? []);
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  function actualizar(i: number, cambios: Partial<CampoEncabezado>) {
    setCampos((c) => c.map((x, j) => (j === i ? { ...x, ...cambios } : x)));
  }

  function guardar() {
    startTransition(async () => {
      const limpios = campos.filter((c) => c.etiqueta.trim() && c.valor.trim());
      const r = await guardarCamposEncabezadoEmpresa(empresaId, limpios);
      setAviso({ tipo: r.ok ? 'ok' : 'error', texto: r.mensaje });
      if (r.ok) {
        setCampos(limpios);
        router.refresh();
      }
    });
  }

  const visibles = campos.filter((c) => c.etiqueta.trim() && c.valor.trim());

  return (
    <section style={e.card}>
      <h2 style={e.h2}>Campos del encabezado</h2>
      <p style={e.intro}>
        Se suman a la línea de control documental del PDF, junto a la versión
        y la nomenclatura.
      </p>

      {campos.map((c, i) => (
        <div key={i} style={e.fila}>
          <input
            value={c.etiqueta}
            list="sugerencias-encabezado"
            placeholder="Etiqueta"
            disabled={!esAdmin}
            onChange={(ev) => actualizar(i, { etiqueta: ev.target.value.toUpperCase() })}
            style={{ ...e.input, textTransform: 'uppercase', flex: 1 }}
          />
          <input
            value={c.valor}
            placeholder="Valor"
            disabled={!esAdmin}
            onChange={(ev) => actualizar(i, { valor: ev.target.value.toUpperCase() })}
            style={{ ...e.input, textTransform: 'uppercase', flex: 1 }}
          />
          {esAdmin && (
            <button
              onClick={() => setCampos((x) => x.filter((_, j) => j !== i))}
              style={e.x}
              title="Quitar campo"
            >
              ×
            </button>
          )}
        </div>
      ))}

      <datalist id="sugerencias-encabezado">
        {SUGERENCIAS.map((s) => <option key={s} value={s} />)}
      </datalist>

      {campos.length === 0 && (
        <p style={e.vacio}>
          Sin campos extra. El encabezado mostrará solo versión y nomenclatura.
        </p>
      )}

      {esAdmin && campos.length < MAXIMO && (
        <button
          onClick={() => setCampos((c) => [...c, { etiqueta: '', valor: '' }])}
          style={e.enlace}
        >
          + Agregar campo
        </button>
      )}

      {campos.length >= MAXIMO && (
        <p style={e.tope}>
          Máximo {MAXIMO} campos: más de eso no cabe en una línea legible del PDF.
        </p>
      )}

      {/* ---------- Vista previa ---------- */}
      <div style={e.previa}>
        <strong style={{ color: 'var(--texto)', fontSize: 11 }}>
          Vista previa del encabezado:
        </strong>
        <div style={{ textAlign: 'center', marginTop: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color }}>
            {titulo}
          </div>
          <div style={{ fontSize: 9, color: 'var(--texto-tenue)', marginTop: 4 }}>
            VERSIÓN: {version} • NOMENCLATURA: {nomenclatura || '—'}
            {visibles.map((c) => ` • ${c.etiqueta}: ${c.valor}`).join('')}
          </div>
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

      {esAdmin && (
        <button onClick={guardar} disabled={pendiente}
          style={{ ...e.btn, background: pendiente ? 'var(--borde-fuerte)' : 'var(--marca)' }}>
          {pendiente ? 'Guardando…' : 'Guardar encabezado'}
        </button>
      )}

      <p style={e.legal}>
        Los cambios aplican a las capacitaciones <strong>nuevas</strong>. Las
        actas ya creadas conservan el encabezado con el que nacieron.
      </p>
    </section>
  );
}

const e: Record<string, React.CSSProperties> = {
  card: {
    background: 'var(--superficie)', border: '1px solid var(--borde)', borderRadius: 8,
    padding: 22, marginTop: 18, maxWidth: 640,
  },
  h2: { fontSize: 14.5, margin: '0 0 5px', fontWeight: 600 },
  intro: { fontSize: 12, color: 'var(--texto-suave)', margin: '0 0 16px', lineHeight: 1.5 },
  fila: { display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 },
  input: {
    padding: '9px 11px', border: '1px solid var(--borde-fuerte)', borderRadius: 4,
    fontSize: 13, boxSizing: 'border-box', fontFamily: 'inherit',
  },
  x: { background: 'none', border: 'none', color: 'var(--mal)', fontSize: 18, cursor: 'pointer', padding: '0 4px' },
  enlace: { background: 'none', border: 'none', color: 'var(--texto-suave)', fontSize: 12, cursor: 'pointer', padding: '4px 0', textDecoration: 'underline' },
  vacio: { fontSize: 12, color: 'var(--texto-tenue)', margin: '4px 0' },
  tope: { fontSize: 11, color: 'var(--ambar)', margin: '6px 0 0' },
  previa: { marginTop: 18, padding: 14, background: 'var(--fondo)', borderRadius: 6, fontSize: 12, color: 'var(--texto-suave)' },
  aviso: { marginTop: 14, padding: '10px 14px', borderRadius: 6, fontSize: 13 },
  btn: { color: 'var(--sobre-marca)', border: 'none', padding: '11px 20px', borderRadius: 4, fontSize: 13, fontWeight: 600, cursor: 'pointer', marginTop: 16 },
  legal: { fontSize: 11, color: 'var(--texto-tenue)', marginTop: 12, lineHeight: 1.5 },
};
