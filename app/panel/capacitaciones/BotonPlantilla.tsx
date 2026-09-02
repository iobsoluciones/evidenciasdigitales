'use client';

/**
 * GUARDAR COMO PLANTILLA
 * ---------------------------------------------------------------
 * Se guarda desde una capacitación que ya funcionó, no al planearla:
 * así el banco se llena con lo que realmente usas, no con lo que
 * pensabas usar.
 */
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { guardarPlantillaCapacitacion } from '@/lib/acciones-plantillas';

export default function BotonPlantilla({
  capacitacionId,
  temaSugerido,
  tieneEvaluacion,
  color,
}: {
  capacitacionId: string;
  temaSugerido: string;
  tieneEvaluacion: boolean;
  color: string;
}) {
  const router = useRouter();
  const [pendiente, startTransition] = useTransition();
  const [abierto, setAbierto] = useState(false);
  const [nombre, setNombre] = useState(temaSugerido);
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  function guardar() {
    startTransition(async () => {
      const r = await guardarPlantillaCapacitacion(capacitacionId, nombre);
      setAviso({ tipo: r.ok ? 'ok' : 'error', texto: r.mensaje });
      if (r.ok) { setAbierto(false); router.refresh(); }
    });
  }

  return (
    <section style={e.card}>
      <div style={e.fila}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <h2 style={e.h2}>Guardar como plantilla</h2>
          <p style={e.sub}>
            Reutilízala en otras empresas cambiando solo las fechas.
            {tieneEvaluacion && ' Su evaluación se guarda junto con ella.'}
          </p>
        </div>
        <button onClick={() => setAbierto(!abierto)} style={e.btnSec}>
          {abierto ? 'Cancelar' : 'Guardar'}
        </button>
      </div>

      {abierto && (
        <div style={e.bloque}>
          <label style={e.label}>Nombre de la plantilla</label>
          <input
            value={nombre}
            onChange={(ev) => setNombre(ev.target.value)}
            placeholder="Inducción de alturas"
            style={e.input}
          />
          <button
            onClick={guardar}
            disabled={pendiente}
            style={{ ...e.btn, background: pendiente ? 'var(--borde-fuerte)' : 'var(--marca)' }}
          >
            {pendiente ? 'Guardando…' : 'Guardar en el banco'}
          </button>
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
    </section>
  );
}

const e: Record<string, React.CSSProperties> = {
  card: {
    background: 'var(--superficie)', border: '1px solid var(--borde)', borderRadius: 8,
    padding: 18, marginBottom: 20,
  },
  fila: { display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' },
  h2: { fontSize: 14, margin: '0 0 2px', fontWeight: 600 },
  sub: { fontSize: 11.5, color: 'var(--texto-tenue)', margin: 0, lineHeight: 1.5 },
  btnSec: {
    background: 'var(--superficie)', color: 'var(--texto)', border: '1px solid var(--borde-fuerte)',
    padding: '8px 16px', borderRadius: 4, fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
  },
  bloque: { marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--borde)', maxWidth: 460 },
  label: { display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5 },
  input: {
    width: '100%', padding: '9px 11px', border: '1px solid var(--borde-fuerte)',
    borderRadius: 4, fontSize: 13, boxSizing: 'border-box', fontFamily: 'inherit',
  },
  btn: {
    color: 'var(--sobre-marca)', border: 'none', padding: '10px 18px', borderRadius: 4,
    fontSize: 13, fontWeight: 600, cursor: 'pointer', marginTop: 10,
  },
  aviso: { marginTop: 12, padding: '10px 14px', borderRadius: 6, fontSize: 13 },
};
