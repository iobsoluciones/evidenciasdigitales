'use client';

/**
 * SIMULACROS — listado y creación
 * ---------------------------------------------------------------
 * El listado muestra el TIEMPO DE EVACUACIÓN y la cobertura porque son
 * los dos números que se comparan con el simulacro anterior. Un listado
 * de fechas no dice si la empresa mejoró.
 */
import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  crearSimulacro,
  type SimulacroResumen, type TipoSimulacro, type Amenaza,
} from '@/lib/acciones-emergencias';

const TIPOS: { v: TipoSimulacro; t: string }[] = [
  { v: 'evacuacion', t: 'Evacuación' },
  { v: 'incendio', t: 'Conato de incendio' },
  { v: 'sismo', t: 'Sismo' },
  { v: 'primeros_auxilios', t: 'Primeros auxilios' },
  { v: 'derrame', t: 'Derrame de químicos' },
  { v: 'otro', t: 'Otro' },
];

function tiempoLegible(seg: number | null): string {
  if (seg === null || seg === undefined) return '—';
  if (seg < 60) return `${seg} s`;
  const m = Math.floor(seg / 60);
  const r = seg % 60;
  return r === 0 ? `${m} min` : `${m} min ${r} s`;
}

export default function VistaSimulacros({
  lista,
  amenazas,
  color,
}: {
  lista: SimulacroResumen[];
  amenazas: Amenaza[];
  color: string;
}) {
  const router = useRouter();
  const [pendiente, startTransition] = useTransition();
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);
  const [nuevo, setNuevo] = useState<{
    fecha: string; tipo: TipoSimulacro; amenazaId: string;
  } | null>(null);

  useEffect(() => {
    if (aviso?.tipo !== 'ok') return;
    const t = setTimeout(() => setAviso(null), 2600);
    return () => clearTimeout(t);
  }, [aviso]);

  function crear() {
    if (!nuevo) return;
    setAviso(null);
    startTransition(async () => {
      const r = await crearSimulacro(nuevo.fecha, nuevo.tipo, nuevo.amenazaId);
      if (!r.ok) { setAviso({ tipo: 'error', texto: r.mensaje }); return; }
      setNuevo(null);
      router.push(`/panel/emergencias/simulacros/${r.id}`);
    });
  }

  return (
    <>
      {aviso && (
        <div role="status" aria-live="polite" style={{
          ...s.aviso,
          background: aviso.tipo === 'ok' ? 'var(--bien-fondo)' : 'var(--mal-fondo)',
          color: aviso.tipo === 'ok' ? 'var(--bien)' : 'var(--mal)',
          border: `1px solid ${aviso.tipo === 'ok' ? 'var(--bien)' : 'var(--mal)'}`,
        }}>{aviso.texto}</div>
      )}

      <div style={s.barra}>
        {!nuevo ? (
          <button type="button" style={{ ...s.botonLleno, background: color }}
            onClick={() => setNuevo({
              fecha: new Date().toISOString().slice(0, 10),
              tipo: 'evacuacion',
              amenazaId: '',
            })}>
            Registrar un simulacro
          </button>
        ) : (
          <div style={s.bloque}>
            <div style={s.h3}>Nuevo simulacro</div>
            <div style={s.fila}>
              <Campo etiqueta="Fecha">
                <input type="date" value={nuevo.fecha} style={s.input}
                  onChange={(e) => setNuevo({ ...nuevo, fecha: e.target.value })} />
              </Campo>
              <Campo etiqueta="Tipo">
                <select value={nuevo.tipo} style={s.input}
                  onChange={(e) => setNuevo({ ...nuevo, tipo: e.target.value as TipoSimulacro })}>
                  {TIPOS.map((t) => <option key={t.v} value={t.v}>{t.t}</option>)}
                </select>
              </Campo>
              <Campo etiqueta="Amenaza que se simula" ancho={240}>
                <select value={nuevo.amenazaId} style={s.input}
                  onChange={(e) => setNuevo({ ...nuevo, amenazaId: e.target.value })}>
                  <option value="">— Sin enlazar —</option>
                  {amenazas.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.amenaza}{a.nivel_riesgo ? ` · riesgo ${a.nivel_riesgo}` : ''}
                    </option>
                  ))}
                </select>
              </Campo>
            </div>
            <p style={s.ayuda}>
              Enlazarlo con una amenaza del análisis es lo que demuestra que se
              simula lo que de verdad puede pasar, y no lo de siempre.
            </p>
            <div style={s.acciones}>
              <button type="button" style={s.botonPlano} onClick={() => setNuevo(null)}>
                Cancelar
              </button>
              <button type="button" disabled={pendiente}
                style={{ ...s.botonLleno, background: color }} onClick={crear}>
                {pendiente ? 'Creando…' : 'Crear'}
              </button>
            </div>
          </div>
        )}
      </div>

      {lista.length === 0 ? (
        <div style={s.bloque}>
          <p style={s.nota}>
            No hay simulacros registrados. El estándar 5.1.1 espera al menos uno
            al año, y el acta firmada es la evidencia: tener el plan escrito no
            prueba que se haya probado.
          </p>
        </div>
      ) : (
        <div style={s.contenedor}>
          <table style={s.tabla}>
            <thead>
              <tr>
                <th style={{ ...s.th, textAlign: 'left' }}>Simulacro</th>
                <th style={s.th}>Participantes</th>
                <th style={s.th}>Cobertura</th>
                <th style={s.th}>Tiempo</th>
                <th style={s.th}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((x) => {
                const cobertura = x.participantes > 0
                  ? Math.round((x.evacuados / x.participantes) * 100) : null;
                return (
                  <tr key={x.id}>
                    <td style={s.tdNombre}>
                      <a href={`/panel/emergencias/simulacros/${x.id}`} style={s.enlace}>
                        {x.codigo} · {TIPOS.find((t) => t.v === x.tipo)?.t ?? x.tipo}
                      </a>
                      <div style={s.meta}>
                        {new Date(x.fecha + 'T12:00:00').toLocaleDateString('es-CO', {
                          day: '2-digit', month: 'long', year: 'numeric',
                        })}
                      </div>
                    </td>
                    <td style={{ ...s.td, textAlign: 'center' }}>
                      {x.evacuados} de {x.participantes}
                    </td>
                    <td style={{ ...s.td, textAlign: 'center' }}>
                      {cobertura === null ? '—' : `${cobertura}%`}
                    </td>
                    <td style={{ ...s.td, textAlign: 'center' }}>
                      {tiempoLegible(x.tiempo_evacuacion_seg)}
                    </td>
                    <td style={{ ...s.td, textAlign: 'center' }}>
                      {x.estado === 'cerrado' ? (
                        <span style={{ ...s.chip, background: 'var(--bien-fondo)', color: 'var(--bien)' }}>
                          Cerrada
                        </span>
                      ) : (
                        <span style={{ ...s.chip, background: 'var(--ambar-fondo)', color: 'var(--aviso)' }}>
                          {x.sin_firmar > 0
                            ? `${x.sin_firmar} firma(s) pendiente(s)`
                            : 'Lista para cerrar'}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function Campo({
  etiqueta, ancho = 170, children,
}: {
  etiqueta: string; ancho?: number; children: React.ReactNode;
}) {
  return (
    <div style={{ flex: `1 1 ${ancho}px`, marginBottom: 10 }}>
      <label style={s.label}>{etiqueta}</label>
      {children}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  aviso: {
    position: 'fixed', right: 18, bottom: 18, zIndex: 60, maxWidth: 340,
    padding: '11px 15px', borderRadius: 8, fontSize: 13,
    boxShadow: '0 6px 20px rgba(20,38,63,.16)',
  },
  barra: { display: 'flex', marginBottom: 16 },
  bloque: {
    background: 'var(--superficie)', border: '1px solid var(--borde)', borderRadius: 12,
    padding: '15px 17px', marginBottom: 14, width: '100%',
  },
  h3: { fontSize: 14, fontWeight: 700, color: 'var(--texto)', marginBottom: 10 },
  nota: { fontSize: 13, color: 'var(--texto-suave)', lineHeight: 1.65, margin: 0, maxWidth: 640 },
  fila: { display: 'flex', gap: 12, flexWrap: 'wrap' },
  label: { display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5, color: 'var(--texto)' },
  input: {
    width: '100%', padding: '8px 11px', border: '1px solid var(--borde)',
    borderRadius: 8, fontSize: 13, boxSizing: 'border-box',
    fontFamily: 'inherit', background: 'var(--superficie)', color: 'var(--texto)',
  },
  ayuda: { fontSize: 11.5, color: 'var(--texto-tenue)', margin: '2px 0 0', lineHeight: 1.55 },

  contenedor: {
    background: 'var(--superficie)', border: '1px solid var(--borde)',
    borderRadius: 12, overflowX: 'auto',
  },
  tabla: { width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 640 },
  th: {
    textAlign: 'center', padding: '10px 8px', background: 'var(--fondo)', color: 'var(--texto-suave)',
    fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: .4,
    borderBottom: '1px solid var(--borde)', whiteSpace: 'nowrap',
  },
  td: { padding: '10px 8px', borderBottom: '1px solid var(--superficie-3)' },
  tdNombre: { padding: '10px 12px', borderBottom: '1px solid var(--superficie-3)', minWidth: 230 },
  enlace: { fontSize: 13, fontWeight: 600, color: 'var(--texto)' },
  meta: { fontSize: 11, color: 'var(--texto-tenue)', marginTop: 2 },
  chip: {
    fontSize: 10.5, fontWeight: 700, padding: '3px 10px',
    borderRadius: 20, whiteSpace: 'nowrap',
  },

  acciones: { display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 10 },
  botonPlano: {
    background: 'none', border: 'none', color: 'var(--texto-suave)',
    fontSize: 12.5, fontWeight: 600, cursor: 'pointer', padding: '8px 12px',
  },
  botonLleno: {
    color: 'var(--sobre-marca)', border: 'none', padding: '9px 20px', borderRadius: 8,
    fontSize: 13, fontWeight: 600, cursor: 'pointer',
  },
};
