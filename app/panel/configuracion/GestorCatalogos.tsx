'use client';

/**
 * GESTIÓN DE CATÁLOGOS
 * ---------------------------------------------------------------
 * Listas maestras de ciudad, cargo y área. Se ofrecen como desplegable
 * en el formulario público, de modo que el mismo valor no entre escrito
 * de formas distintas.
 */
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  agregarItemCatalogo, quitarItemCatalogo, agregarVariosItems,
  type ItemCatalogo, type TipoCatalogo,
} from '@/lib/acciones-catalogos';

const TITULOS: Record<TipoCatalogo, { titulo: string; ejemplo: string }> = {
  ciudad: { titulo: 'Ciudades', ejemplo: 'BOGOTÁ, MEDELLÍN, CALI' },
  cargo: { titulo: 'Cargos', ejemplo: 'OPERARIO, SUPERVISOR, ANALISTA' },
  area: { titulo: 'Áreas', ejemplo: 'PRODUCCIÓN, LOGÍSTICA, CALIDAD' },
};

export default function GestorCatalogos({
  catalogos,
  color,
  esAdmin,
}: {
  catalogos: Record<TipoCatalogo, ItemCatalogo[]>;
  color: string;
  esAdmin: boolean;
}) {
  return (
    <section style={est.tarjeta}>
      <h2 style={est.h2}>Listas maestras</h2>
      <p style={est.intro}>
        Los asistentes eligen de estas listas en vez de escribir a mano.
        Así el mismo valor no entra de veinte formas distintas, que es lo
        que arruina los reportes agrupados.
      </p>

      <div style={est.columnas}>
        {(Object.keys(TITULOS) as TipoCatalogo[]).map((tipo) => (
          <Lista
            key={tipo}
            tipo={tipo}
            items={catalogos[tipo] ?? []}
            color={color}
            esAdmin={esAdmin}
          />
        ))}
      </div>
    </section>
  );
}

function Lista({
  tipo, items, color, esAdmin,
}: {
  tipo: TipoCatalogo; items: ItemCatalogo[]; color: string; esAdmin: boolean;
}) {
  const router = useRouter();
  const [pendiente, startTransition] = useTransition();
  const [valor, setValor] = useState('');
  const [masivo, setMasivo] = useState(false);
  const [texto, setTexto] = useState('');
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  function agregar() {
    if (!valor.trim()) return;
    startTransition(async () => {
      const r = await agregarItemCatalogo(tipo, valor);
      setAviso({ tipo: r.ok ? 'ok' : 'error', texto: r.mensaje });
      if (r.ok) { setValor(''); router.refresh(); }
    });
  }

  function agregarVarios() {
    startTransition(async () => {
      const r = await agregarVariosItems(tipo, texto);
      setAviso({ tipo: r.ok ? 'ok' : 'error', texto: r.mensaje });
      if (r.ok) { setTexto(''); setMasivo(false); router.refresh(); }
    });
  }

  function quitar(id: string) {
    startTransition(async () => {
      const r = await quitarItemCatalogo(id);
      setAviso({ tipo: r.ok ? 'ok' : 'error', texto: r.mensaje });
      if (r.ok) router.refresh();
    });
  }

  const { titulo, ejemplo } = TITULOS[tipo];

  return (
    <div>
      <h3 style={est.h3}>{titulo} ({items.length})</h3>

      <div style={est.caja}>
        {items.length === 0 ? (
          <p style={est.vacio}>Sin valores. Se admitirá texto libre.</p>
        ) : (
          items.map((i) => (
            <div key={i.id} style={est.item}>
              <span>{i.valor}</span>
              {esAdmin && (
                <button
                  onClick={() => quitar(i.id)}
                  disabled={pendiente}
                  title="Quitar de la lista"
                  style={est.x}
                >
                  ×
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {esAdmin && (
        <>
          {!masivo ? (
            <>
              <div style={est.fila}>
                <input
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); agregar(); } }}
                  placeholder="Agregar…"
                  style={{ ...est.input, textTransform: 'uppercase' }}
                />
                <button
                  onClick={agregar}
                  disabled={pendiente}
                  style={{ ...est.btn, background: 'var(--marca)', color: 'var(--sobre-empresa)' }}
                >
                  +
                </button>
              </div>
              <button onClick={() => setMasivo(true)} style={est.enlace}>
                Cargar varios de una vez
              </button>
            </>
          ) : (
            <>
              <textarea
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                rows={4}
                placeholder={`Uno por línea o separados por coma.\nEj: ${ejemplo}`}
                style={{ ...est.input, resize: 'vertical', marginBottom: 6 }}
              />
              <div style={est.fila}>
                <button
                  onClick={agregarVarios}
                  disabled={pendiente}
                  style={{ ...est.btn, background: 'var(--marca)', color: 'var(--sobre-empresa)', flex: 1 }}
                >
                  {pendiente ? 'Cargando…' : 'Cargar'}
                </button>
                <button onClick={() => setMasivo(false)} style={est.btnSec}>
                  Cancelar
                </button>
              </div>
            </>
          )}
        </>
      )}

      {aviso && (
        <p style={{
          ...est.aviso,
          color: aviso.tipo === 'ok' ? 'var(--bien)' : 'var(--mal)',
        }}>
          {aviso.texto}
        </p>
      )}
    </div>
  );
}

const est: Record<string, React.CSSProperties> = {
  tarjeta: { background: 'var(--superficie)', borderRadius: 14, padding: 22, marginTop: 20, boxShadow: '0 6px 18px rgba(0,0,0,.05)' },
  h2: { fontSize: 15, margin: '0 0 6px' },
  intro: { fontSize: 12, color: 'var(--texto-suave)', margin: '0 0 18px', lineHeight: 1.5 },
  columnas: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 20 },
  h3: { fontSize: 12, color: 'var(--texto-suave)', textTransform: 'uppercase', letterSpacing: .4, margin: '0 0 8px' },
  caja: { border: '1px solid var(--borde)', borderRadius: 8, maxHeight: 180, overflowY: 'auto', marginBottom: 8, background: 'var(--superficie-3)' },
  item: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', fontSize: 12.5, borderBottom: '1px solid var(--borde)' },
  x: { background: 'none', border: 'none', color: 'var(--mal)', fontSize: 16, cursor: 'pointer', lineHeight: 1, padding: '0 2px' },
  vacio: { fontSize: 11.5, color: 'var(--texto-tenue)', padding: 12, margin: 0, textAlign: 'center' },
  fila: { display: 'flex', gap: 6 },
  input: { flex: 1, width: '100%', padding: '8px 10px', border: '1px solid var(--borde-fuerte)', borderRadius: 8, fontSize: 12.5, boxSizing: 'border-box', fontFamily: 'inherit' },
  btn: { border: 'none', padding: '8px 14px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' },
  btnSec: { background: 'var(--superficie-3)', color: 'var(--texto)', border: '1px solid var(--borde-fuerte)', padding: '8px 14px', borderRadius: 8, fontSize: 12, cursor: 'pointer' },
  enlace: { background: 'none', border: 'none', color: 'var(--marca)', fontSize: 11.5, cursor: 'pointer', padding: '6px 0 0' },
  aviso: { fontSize: 11.5, margin: '8px 0 0' },
};
