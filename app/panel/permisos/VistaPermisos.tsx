'use client';

/**
 * PERMISOS DE ALTO RIESGO — listado y creación
 * ---------------------------------------------------------------
 * Lo primero de la lista es la VIGENCIA, no la fecha: un permiso
 * autorizado cuya franja ya pasó no autoriza nada, y hay que verlo sin
 * abrirlo. Lo segundo es qué le falta para poder emitirse.
 */
import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  crearPermiso,
  type PermisoResumen, type TipoPermiso,
} from '@/lib/acciones-permisos';

const TIPOS: { v: TipoPermiso; t: string; norma: string }[] = [
  { v: 'alturas', t: 'Trabajo en alturas', norma: 'Res. 4272 de 2021' },
  { v: 'espacios_confinados', t: 'Espacios confinados', norma: 'Res. 491 de 2020' },
  { v: 'trabajo_caliente', t: 'Trabajo en caliente', norma: 'Criterio técnico · NFPA 51B' },
  { v: 'energias', t: 'Energías peligrosas', norma: 'Criterio técnico · LOTO' },
  { v: 'izaje', t: 'Izaje de cargas', norma: 'Criterio técnico' },
  { v: 'excavacion', t: 'Excavación', norma: 'Criterio técnico' },
];

const ESTADOS: Record<string, { t: string; fondo: string; color: string }> = {
  borrador: { t: 'Borrador', fondo: 'var(--superficie-3)', color: 'var(--texto-suave)' },
  autorizado: { t: 'Autorizado', fondo: 'var(--bien-fondo)', color: 'var(--bien)' },
  cerrado: { t: 'Cerrado', fondo: '#EEF2F7', color: 'var(--texto-suave)' },
  cancelado: { t: 'Cancelado', fondo: 'var(--mal-fondo)', color: 'var(--mal)' },
};

export default function VistaPermisos({
  lista,
  color,
}: {
  lista: PermisoResumen[];
  color: string;
}) {
  const router = useRouter();
  const [pendiente, startTransition] = useTransition();
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);
  const [nuevo, setNuevo] = useState<{
    tipo: TipoPermiso; fecha: string; horaInicio: string;
    horaFin: string; lugar: string; descripcion: string;
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
      const r = await crearPermiso(nuevo);
      if (!r.ok) { setAviso({ tipo: 'error', texto: r.mensaje }); return; }
      setNuevo(null);
      router.push(`/panel/permisos/${r.id}`);
    });
  }

  const abiertos = lista.filter(
    (x) => x.estado === 'borrador' || (x.estado === 'autorizado' && !x.vencido)
  ).length;
  const vencidos = lista.filter((x) => x.vencido).length;

  return (
    <>
      {aviso && (
        <div role="status" aria-live="polite" style={{
          ...s.aviso,
          background: aviso.tipo === 'ok' ? 'var(--bien-fondo)' : 'var(--mal-fondo)',
          color: aviso.tipo === 'ok' ? 'var(--bien)' : 'var(--mal)',
          border: `1px solid ${aviso.tipo === 'ok' ? '#BFE3CB' : '#F3C7C7'}`,
        }}>{aviso.texto}</div>
      )}

      {(abiertos > 0 || vencidos > 0) && (
        <div style={s.resumen}>
          <div style={{ ...s.tarjeta, background: 'var(--bien-fondo)' }}>
            <span style={{ ...s.tarjetaN, color: 'var(--bien)' }}>{abiertos}</span>
            <span style={{ ...s.tarjetaT, color: 'var(--bien)' }}>En curso o por emitir</span>
          </div>
          {vencidos > 0 && (
            <div style={{ ...s.tarjeta, background: 'var(--mal-fondo)' }}>
              <span style={{ ...s.tarjetaN, color: 'var(--mal)' }}>{vencidos}</span>
              <span style={{ ...s.tarjetaT, color: 'var(--mal)' }}>Vencidos sin cerrar</span>
            </div>
          )}
        </div>
      )}

      <div style={s.barra}>
        {!nuevo ? (
          <button type="button" style={{ ...s.botonLleno, background: color }}
            onClick={() => setNuevo({
              tipo: 'alturas',
              fecha: new Date().toISOString().slice(0, 10),
              horaInicio: '08:00', horaFin: '17:00',
              lugar: '', descripcion: '',
            })}>
            Abrir un permiso
          </button>
        ) : (
          <div style={s.bloque}>
            <div style={s.h3}>Nuevo permiso</div>
            <div style={s.fila}>
              <Campo etiqueta="Tarea de alto riesgo" ancho={250}
                ayuda={TIPOS.find((t) => t.v === nuevo.tipo)?.norma}>
                <select value={nuevo.tipo} style={s.input}
                  onChange={(e) => setNuevo({ ...nuevo, tipo: e.target.value as TipoPermiso })}>
                  {TIPOS.map((t) => <option key={t.v} value={t.v}>{t.t}</option>)}
                </select>
              </Campo>
              <Campo etiqueta="Fecha" ancho={140}>
                <input type="date" value={nuevo.fecha} style={s.input}
                  onChange={(e) => setNuevo({ ...nuevo, fecha: e.target.value })} />
              </Campo>
              <Campo etiqueta="Desde" ancho={110}>
                <input type="time" value={nuevo.horaInicio} style={s.input}
                  onChange={(e) => setNuevo({ ...nuevo, horaInicio: e.target.value })} />
              </Campo>
              <Campo etiqueta="Hasta" ancho={110}>
                <input type="time" value={nuevo.horaFin} style={s.input}
                  onChange={(e) => setNuevo({ ...nuevo, horaFin: e.target.value })} />
              </Campo>
            </div>
            <Campo etiqueta="Lugar" ancho={9999}>
              <input value={nuevo.lugar} style={s.input}
                placeholder="Techo de la bodega de producto terminado"
                onChange={(e) => setNuevo({ ...nuevo, lugar: e.target.value })} />
            </Campo>
            <Campo etiqueta="Qué se va a hacer" ancho={9999}>
              <textarea rows={2} value={nuevo.descripcion}
                style={{ ...s.input, resize: 'vertical' }}
                placeholder="Cambio de tejas en la cubierta del costado norte"
                onChange={(e) => setNuevo({ ...nuevo, descripcion: e.target.value })} />
            </Campo>
            <p style={s.ayuda}>
              El permiso vale solo para esa tarea y esa franja horaria. Al crearlo
              se copia la lista de verificación que corresponde al tipo.
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
            No hay permisos registrados. Un permiso de alto riesgo es una
            autorización que vence: vale para una tarea y una franja horaria, y
            no habilita nada hasta que todos firman.
          </p>
        </div>
      ) : (
        <div style={s.contenedor}>
          <table style={s.tabla}>
            <thead>
              <tr>
                <th style={{ ...s.th, textAlign: 'left' }}>Permiso</th>
                <th style={s.th}>Vigencia</th>
                <th style={s.th}>Personas</th>
                <th style={s.th}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((x) => {
                const est = ESTADOS[x.estado] ?? ESTADOS.borrador;
                return (
                  <tr key={x.id}>
                    <td style={s.tdNombre}>
                      <a href={`/panel/permisos/${x.id}`} style={s.enlace}>
                        {x.codigo} · {TIPOS.find((t) => t.v === x.tipo)?.t ?? x.tipo}
                      </a>
                      <div style={s.meta}>{x.descripcion}</div>
                      {x.lugar && <div style={s.meta}>{x.lugar}</div>}
                    </td>
                    <td style={{ ...s.td, textAlign: 'center', whiteSpace: 'nowrap' }}>
                      {new Date(x.fecha + 'T12:00:00').toLocaleDateString('es-CO', {
                        day: '2-digit', month: '2-digit', year: '2-digit',
                      })}
                      <div style={s.meta}>
                        {x.hora_inicio.slice(0, 5)} a {x.hora_fin.slice(0, 5)}
                      </div>
                    </td>
                    <td style={{ ...s.td, textAlign: 'center' }}>
                      {x.personas}
                      {x.sin_firmar > 0 && (
                        <div style={{ ...s.meta, color: 'var(--aviso)' }}>
                          {x.sin_firmar} sin firmar
                        </div>
                      )}
                    </td>
                    <td style={{ ...s.td, textAlign: 'center' }}>
                      {x.vencido ? (
                        <span style={{ ...s.chip, background: 'var(--mal-fondo)', color: 'var(--mal)' }}>
                          Vencido sin cerrar
                        </span>
                      ) : (
                        <span style={{ ...s.chip, background: est.fondo, color: est.color }}>
                          {est.t}
                        </span>
                      )}
                      {x.estado === 'borrador' && x.sin_verificar > 0 && (
                        <div style={{ ...s.meta, marginTop: 3 }}>
                          faltan {x.sin_verificar} requisito(s)
                        </div>
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
  etiqueta, ayuda, ancho = 170, children,
}: {
  etiqueta: string; ayuda?: string; ancho?: number; children: React.ReactNode;
}) {
  return (
    <div style={{ flex: `1 1 ${ancho}px`, marginBottom: 10 }}>
      <label style={s.label}>{etiqueta}</label>
      {children}
      {ayuda && <p style={s.ayuda}>{ayuda}</p>}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  aviso: {
    position: 'fixed', right: 18, bottom: 18, zIndex: 60, maxWidth: 340,
    padding: '11px 15px', borderRadius: 8, fontSize: 13,
    boxShadow: '0 6px 20px rgba(20,38,63,.16)',
  },
  resumen: {
    display: 'grid', gap: 10, marginBottom: 14,
    gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))',
  },
  tarjeta: {
    borderRadius: 8, padding: '12px 14px',
    display: 'flex', flexDirection: 'column', gap: 2,
  },
  tarjetaN: { fontSize: 22, fontWeight: 700, lineHeight: 1.1, fontVariantNumeric: 'tabular-nums' },
  tarjetaT: { fontSize: 11.5 },

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
  ayuda: { fontSize: 11.5, color: 'var(--texto-tenue)', margin: '4px 0 0', lineHeight: 1.5 },

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
  td: { padding: '10px 8px', borderBottom: '1px solid var(--superficie-3)', verticalAlign: 'top' },
  tdNombre: { padding: '10px 12px', borderBottom: '1px solid var(--superficie-3)', minWidth: 250 },
  enlace: { fontSize: 13, fontWeight: 600, color: 'var(--texto)' },
  meta: { fontSize: 11, color: 'var(--texto-tenue)', marginTop: 2, lineHeight: 1.4 },
  chip: {
    fontSize: 10.5, fontWeight: 700, padding: '3px 10px',
    borderRadius: 20, whiteSpace: 'nowrap', display: 'inline-block',
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
