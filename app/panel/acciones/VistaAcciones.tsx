'use client';

/**
 * PLAN DE ACCIÓN
 * ---------------------------------------------------------------
 * La lista prioriza lo vencido y ordena por fecha límite: lo que más
 * urge, arriba. Cerrar una acción exige evidencia y quién verificó,
 * porque una acción que se cierra sola no cierra nada.
 */
import { useState, useMemo, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  crearAccion, actualizarAccion, eliminarAccion,
  type Accion, type EstadoAccion, type Severidad,
} from '@/lib/acciones-plan';

const SEVERIDAD: Record<Severidad, { t: string; c: string; f: string }> = {
  baja: { t: 'Baja', c: 'var(--texto-suave)', f: 'var(--superficie-3)' },
  media: { t: 'Media', c: 'var(--ambar)', f: 'var(--ambar-fondo)' },
  alta: { t: 'Alta', c: 'var(--aviso)', f: 'var(--aviso-fondo)' },
  critica: { t: 'Crítica', c: 'var(--mal)', f: 'var(--mal-fondo)' },
};

const ESTADO: Record<EstadoAccion, { t: string; c: string; f: string }> = {
  abierta: { t: 'Abierta', c: 'var(--info)', f: 'var(--info-fondo)' },
  en_proceso: { t: 'En proceso', c: 'var(--ambar)', f: 'var(--ambar-fondo)' },
  vencida: { t: 'Vencida', c: 'var(--mal)', f: 'var(--mal-fondo)' },
  cerrada: { t: 'Cerrada', c: 'var(--bien)', f: 'var(--bien-fondo)' },
};

export default function VistaAcciones({
  acciones,
  color,
}: {
  acciones: Accion[];
  color: string;
}) {
  const router = useRouter();
  const [pendiente, startTransition] = useTransition();
  const [filtro, setFiltro] = useState<EstadoAccion | ''>('');
  const [creando, setCreando] = useState(false);
  const [expandida, setExpandida] = useState<string | null>(null);
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  const lista = useMemo(
    () => (filtro ? acciones.filter((a) => a.estado_real === filtro) : acciones),
    [acciones, filtro]
  );

  /**
   * AGRUPACION POR INSPECCION: un hallazgo no se entiende solo. Ver
   * juntas las acciones que salieron de la misma visita permite cerrar
   * el ciclo de esa inspeccion, que es como lo revisa una auditoria.
   * Las acciones creadas a mano no tienen inspeccion y van al final.
   */
  const grupos = useMemo(() => {
    const mapa = new Map<string, {
      clave: string;
      inspeccionId: string | null;
      codigo: string | null;
      objeto: string | null;
      acciones: Accion[];
    }>();

    for (const a of lista) {
      const clave = a.inspeccion_id ?? '__sin_inspeccion__';
      let g = mapa.get(clave);
      if (!g) {
        g = {
          clave,
          inspeccionId: a.inspeccion_id,
          codigo: a.inspeccion_codigo,
          objeto: a.inspeccion_objeto,
          acciones: [],
        };
        mapa.set(clave, g);
      }
      g.acciones.push(a);
    }

    // Las sueltas al final; el resto por codigo de inspeccion descendente
    // (lo mas reciente primero, igual que el listado de inspecciones).
    return [...mapa.values()].sort((x, y) => {
      if (x.inspeccionId === null) return 1;
      if (y.inspeccionId === null) return -1;
      return (y.codigo ?? '').localeCompare(x.codigo ?? '');
    });
  }, [lista]);

  const cuenta = (e: EstadoAccion) => acciones.filter((a) => a.estado_real === e).length;
  const vencidas = cuenta('vencida');

  const fmt = (iso: string | null) =>
    iso ? new Date(iso + 'T12:00:00').toLocaleDateString('es-CO', { dateStyle: 'medium' }) : '—';

  return (
    <>
      {/* ---------- Contadores ---------- */}
      <div style={e.contadores}>
        <Contador n={acciones.length} etiqueta="Total" activo={filtro === ''} onClick={() => setFiltro('')} />
        <Contador n={cuenta('vencida')} etiqueta="Vencidas" tono="var(--mal)" activo={filtro === 'vencida'} onClick={() => setFiltro('vencida')} />
        <Contador n={cuenta('abierta')} etiqueta="Abiertas" tono="var(--info)" activo={filtro === 'abierta'} onClick={() => setFiltro('abierta')} />
        <Contador n={cuenta('en_proceso')} etiqueta="En proceso" tono="var(--ambar)" activo={filtro === 'en_proceso'} onClick={() => setFiltro('en_proceso')} />
        <Contador n={cuenta('cerrada')} etiqueta="Cerradas" tono="var(--bien)" activo={filtro === 'cerrada'} onClick={() => setFiltro('cerrada')} />
      </div>

      {vencidas > 0 && filtro === '' && (
        <div style={e.alertaVencidas}>
          {vencidas} acción(es) vencida(s) sin cerrar. Aparecen primero en la lista.
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
        <button onClick={() => setCreando((v) => !v)} style={{ ...e.btn, background: color }}>
          {creando ? 'Cerrar' : '+ Acción manual'}
        </button>
      </div>

      {creando && (
        <FormularioNueva
          color={color}
          pendiente={pendiente}
          onCrear={(datos, limpiar) => {
            startTransition(async () => {
              const r = await crearAccion(datos);
              setAviso({ tipo: r.ok ? 'ok' : 'error', texto: r.mensaje });
              if (r.ok) { limpiar(); setCreando(false); router.refresh(); }
            });
          }}
        />
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

      {lista.length === 0 ? (
        <div style={e.vacio}>
          <p style={{ margin: 0, fontSize: 14 }}>
            {acciones.length === 0
              ? 'No hay acciones registradas. Se crean desde los hallazgos de una inspección, o manualmente.'
              : 'No hay acciones en ese estado.'}
          </p>
        </div>
      ) : (
        <div style={e.grupos}>
          {grupos.map((g) => {
            const vencidasGrupo = g.acciones.filter((a) => a.estado_real === 'vencida').length;
            const abiertasGrupo = g.acciones.filter((a) => a.estado_real !== 'cerrada').length;

            return (
              <section key={g.clave} style={e.grupo}>
                <header style={e.grupoCabecera}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                    {g.inspeccionId ? (
                      <Link href={`/panel/inspecciones/${g.inspeccionId}`} style={e.grupoTitulo}>
                        {g.codigo ?? 'Inspección'}
                      </Link>
                    ) : (
                      <span style={{ ...e.grupoTitulo, color: 'var(--texto-suave)' }}>Sin inspección</span>
                    )}
                    <span style={e.grupoObjeto}>
                      {g.inspeccionId
                        ? (g.objeto ?? 'Sin objeto registrado')
                        : 'Acciones creadas manualmente'}
                    </span>
                  </div>

                  <div style={e.grupoConteos}>
                    <span>{g.acciones.length} acción{g.acciones.length !== 1 ? 'es' : ''}</span>
                    {abiertasGrupo > 0 && <span>· {abiertasGrupo} sin cerrar</span>}
                    {vencidasGrupo > 0 && (
                      <span style={{ color: 'var(--mal)', fontWeight: 600 }}>· {vencidasGrupo} vencida{vencidasGrupo !== 1 ? 's' : ''}</span>
                    )}
                  </div>
                </header>

                <div style={e.grid}>
          {g.acciones.map((a) => {
            const sev = SEVERIDAD[a.severidad];
            const est = ESTADO[a.estado_real];
            const abierta = expandida === a.id;

            return (
              <article key={a.id} style={e.tarjeta}>
                <div style={e.cabecera}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={e.codigo}>{a.codigo}</span>
                    <span style={{ ...e.chip, background: est.f, color: est.c }}>{est.t}</span>
                    <span style={{ ...e.chip, background: sev.f, color: sev.c }}>{sev.t}</span>
                  </div>
                  <span style={{
                    ...e.dias,
                    color: a.estado_real === 'vencida' ? 'var(--mal)'
                         : a.estado_real === 'cerrada' ? 'var(--bien)' : 'var(--texto-tenue)',
                  }}>
                    {a.estado_real === 'cerrada'
                      ? `Cerrada ${fmt(a.fecha_cierre)}`
                      : a.dias < 0 ? `Venció hace ${Math.abs(a.dias)}d`
                      : a.dias === 0 ? 'Vence hoy'
                      : `Vence en ${a.dias}d`}
                  </span>
                </div>

                <p style={e.hallazgo}>{a.hallazgo}</p>

                <div style={e.accionTexto}>
                  <span style={e.etiquetaMini}>ACCIÓN</span> {a.accion}
                </div>

                <div style={e.meta}>
                  <span><strong>Responsable:</strong> {a.responsable}</span>
                  <span style={e.limite}>Límite {fmt(a.fecha_limite)}</span>
                </div>

                {a.estado_real === 'cerrada' ? (
                  <div style={e.cierre}>
                    Verificó {a.verificado_por}
                    {a.causa_raiz && <> · causa: {a.causa_raiz}</>}
                  </div>
                ) : (
                  <>
                    <button onClick={() => setExpandida(abierta ? null : a.id)} style={e.gestionar}>
                      {abierta ? 'Ocultar' : 'Gestionar'}
                    </button>

                    {abierta && (
                      <GestionAccion
                        accion={a}
                        color={color}
                        pendiente={pendiente}
                        onGuardar={(datos) => {
                          startTransition(async () => {
                            const r = await actualizarAccion(a.id, datos);
                            setAviso({ tipo: r.ok ? 'ok' : 'error', texto: r.mensaje });
                            if (r.ok) { setExpandida(null); router.refresh(); }
                          });
                        }}
                        onEliminar={() => {
                          startTransition(async () => {
                            const r = await eliminarAccion(a.id);
                            setAviso({ tipo: r.ok ? 'ok' : 'error', texto: r.mensaje });
                            if (r.ok) router.refresh();
                          });
                        }}
                      />
                    )}
                  </>
                )}
              </article>
            );
          })}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}

/* ---------- Formulario de acción manual ---------- */
function FormularioNueva({
  color, pendiente, onCrear,
}: {
  color: string;
  pendiente: boolean;
  onCrear: (
    datos: { hallazgo: string; accion: string; responsable: string; fechaLimite: string; severidad: Severidad },
    limpiar: () => void
  ) => void;
}) {
  const [f, setF] = useState({
    hallazgo: '', accion: '', responsable: '',
    fechaLimite: '', severidad: 'media' as Severidad,
  });
  const limpiar = () => setF({ hallazgo: '', accion: '', responsable: '', fechaLimite: '', severidad: 'media' });

  return (
    <section style={e.formulario}>
      <div style={e.dos}>
        <div>
          <label style={e.label}>Hallazgo</label>
          <textarea value={f.hallazgo} rows={2}
            onChange={(x) => setF({ ...f, hallazgo: x.target.value })}
            placeholder="Qué se encontró" style={{ ...e.input, resize: 'vertical' }} />
        </div>
        <div>
          <label style={e.label}>Acción a realizar</label>
          <textarea value={f.accion} rows={2}
            onChange={(x) => setF({ ...f, accion: x.target.value })}
            placeholder="Qué se va a hacer" style={{ ...e.input, resize: 'vertical' }} />
        </div>
      </div>
      <div style={e.tres}>
        <div>
          <label style={e.label}>Responsable</label>
          <input value={f.responsable}
            onChange={(x) => setF({ ...f, responsable: x.target.value })}
            style={e.input} />
        </div>
        <div>
          <label style={e.label}>Fecha límite</label>
          <input type="date" value={f.fechaLimite}
            onChange={(x) => setF({ ...f, fechaLimite: x.target.value })}
            style={e.input} />
        </div>
        <div>
          <label style={e.label}>Severidad</label>
          <select value={f.severidad}
            onChange={(x) => setF({ ...f, severidad: x.target.value as Severidad })}
            style={e.input}>
            <option value="baja">Baja</option>
            <option value="media">Media</option>
            <option value="alta">Alta</option>
            <option value="critica">Crítica</option>
          </select>
        </div>
      </div>
      <button
        onClick={() => onCrear(f, limpiar)}
        disabled={pendiente}
        style={{ ...e.btn, background: pendiente ? 'var(--borde-fuerte)' : color, marginTop: 12 }}
      >
        {pendiente ? 'Guardando…' : 'Crear acción'}
      </button>
    </section>
  );
}

/* ---------- Gestión de una acción ---------- */
function GestionAccion({
  accion, color, pendiente, onGuardar, onEliminar,
}: {
  accion: Accion;
  color: string;
  pendiente: boolean;
  onGuardar: (datos: {
    estado: 'abierta' | 'en_proceso' | 'cerrada';
    accion?: string; causaRaiz?: string; verificadoPor?: string;
  }) => void;
  onEliminar: () => void;
}) {
  const [accionTexto, setAccionTexto] = useState(accion.accion);
  const [causaRaiz, setCausaRaiz] = useState(accion.causa_raiz ?? '');
  const [verificadoPor, setVerificadoPor] = useState('');

  return (
    <div style={e.gestion}>
      <label style={e.label}>Acción</label>
      <textarea value={accionTexto} rows={2}
        onChange={(x) => setAccionTexto(x.target.value)}
        style={{ ...e.input, resize: 'vertical' }} />

      <label style={e.label}>Causa raíz</label>
      <input value={causaRaiz}
        onChange={(x) => setCausaRaiz(x.target.value)}
        placeholder="Por qué ocurrió (opcional)" style={e.input} />

      <div style={e.botonesGestion}>
        <button
          onClick={() => onGuardar({ estado: 'en_proceso', accion: accionTexto, causaRaiz })}
          disabled={pendiente}
          style={e.btnProceso}
        >
          Marcar en proceso
        </button>
      </div>

      <div style={e.zonaCierre}>
        <label style={e.label}>Cerrar la acción</label>
        <p style={e.notaCierre}>
          Para cerrar, indica quién verificó que el hallazgo quedó resuelto.
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input value={verificadoPor}
            onChange={(x) => setVerificadoPor(x.target.value)}
            placeholder="Quién verificó" style={{ ...e.input, flex: 1, minWidth: 160 }} />
          <button
            onClick={() => onGuardar({
              estado: 'cerrada', accion: accionTexto, causaRaiz, verificadoPor,
            })}
            disabled={pendiente || !verificadoPor.trim()}
            style={{
              ...e.btnCerrar,
              background: verificadoPor.trim() ? 'var(--bien)' : 'var(--borde-fuerte)',
              cursor: verificadoPor.trim() ? 'pointer' : 'not-allowed',
            }}
          >
            Cerrar acción
          </button>
        </div>
      </div>

      <button onClick={onEliminar} disabled={pendiente} style={e.eliminar}>
        Eliminar acción
      </button>
    </div>
  );
}

function Contador({ n, etiqueta, tono, activo, onClick }: {
  n: number; etiqueta: string; tono?: string; activo: boolean; onClick: () => void;
}) {
  return (
    <button onClick={onClick} style={{
      ...e.contador,
      borderColor: activo ? (tono ?? 'var(--texto)') : 'var(--borde)',
      background: activo ? 'var(--superficie-2)' : 'var(--superficie)',
    }}>
      <span style={{ ...e.contadorN, color: tono ?? 'var(--texto)' }}>{n}</span>
      <span style={e.contadorL}>{etiqueta}</span>
    </button>
  );
}

const e: Record<string, React.CSSProperties> = {
  contadores: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(96px,1fr))', gap: 10, marginBottom: 16 },
  contador: {
    borderWidth: 1, borderStyle: 'solid', borderRadius: 8, padding: '12px 8px',
    cursor: 'pointer', textAlign: 'center', fontFamily: 'inherit',
    display: 'flex', flexDirection: 'column', gap: 2,
  },
  contadorN: { fontSize: 20, fontWeight: 700 },
  contadorL: { fontSize: 10.5, color: 'var(--texto-tenue)', textTransform: 'uppercase', letterSpacing: .3 },

  alertaVencidas: {
    background: 'var(--mal-fondo)', color: 'var(--mal)', padding: '10px 14px',
    borderRadius: 6, fontSize: 12.5, marginBottom: 14,
  },

  btn: {
    color: 'var(--sobre-marca)', border: 'none', padding: '9px 18px', borderRadius: 4,
    fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
  },

  formulario: {
    background: 'var(--superficie)', borderWidth: 1, borderStyle: 'solid', borderColor: 'var(--borde)',
    borderRadius: 8, padding: 18, marginBottom: 16,
  },
  dos: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12 },
  tres: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 12, marginTop: 4 },
  label: { display: 'block', fontSize: 11.5, fontWeight: 600, margin: '10px 0 5px' },
  input: {
    width: '100%', padding: '9px 11px', borderWidth: 1, borderStyle: 'solid',
    borderColor: 'var(--borde-fuerte)', borderRadius: 4, fontSize: 13,
    boxSizing: 'border-box', fontFamily: 'inherit', background: 'var(--superficie)',
  },

  aviso: { padding: '10px 14px', borderRadius: 6, fontSize: 13, marginBottom: 14 },
  vacio: {
    background: 'var(--superficie)', borderWidth: 1, borderStyle: 'dashed', borderColor: 'var(--borde-fuerte)',
    borderRadius: 8, padding: '36px 24px', textAlign: 'center', color: 'var(--texto-suave)',
  },

  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: 14 },

  // Agrupacion por inspeccion
  grupos: { display: 'flex', flexDirection: 'column', gap: 22 },
  grupo: {
    borderLeftWidth: 2, borderLeftStyle: 'solid', borderLeftColor: 'var(--borde)',
    paddingLeft: 14,
  },
  grupoCabecera: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
    gap: 12, flexWrap: 'wrap', marginBottom: 10,
  },
  grupoTitulo: {
    fontSize: 13.5, fontWeight: 700, color: 'var(--texto)',
    textDecoration: 'none', fontFamily: 'ui-monospace,monospace',
  },
  grupoObjeto: { fontSize: 12, color: 'var(--texto-suave)' },
  grupoConteos: { fontSize: 11.5, color: 'var(--texto-tenue)', display: 'flex', gap: 5, flexWrap: 'wrap' },
  limite: { color: 'var(--texto-tenue)' },
  tarjeta: {
    background: 'var(--superficie)', borderWidth: 1, borderStyle: 'solid', borderColor: 'var(--borde)',
    borderRadius: 8, padding: 16,
  },
  cabecera: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    gap: 8, flexWrap: 'wrap', marginBottom: 10,
  },
  codigo: {
    fontSize: 11.5, fontWeight: 700,
    fontFamily: 'ui-monospace,SFMono-Regular,Menlo,monospace',
  },
  chip: { fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 999 },
  dias: { fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' },

  hallazgo: { fontSize: 13, margin: '0 0 10px', lineHeight: 1.5, fontWeight: 500 },
  accionTexto: { fontSize: 12, color: 'var(--texto-suave)', lineHeight: 1.55, marginBottom: 10 },
  etiquetaMini: {
    fontSize: 8.5, fontWeight: 700, color: 'var(--texto-tenue)',
    letterSpacing: .5, marginRight: 4,
  },
  meta: {
    display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap',
    fontSize: 11.5, color: 'var(--texto-suave)', paddingTop: 10,
    borderTopWidth: 1, borderTopStyle: 'solid', borderTopColor: 'var(--superficie-3)',
  },
  origen: {
    fontSize: 10.5, color: 'var(--info)', textDecoration: 'none',
    fontFamily: 'ui-monospace,monospace',
  },
  cierre: {
    fontSize: 11, color: 'var(--bien)', marginTop: 10, paddingTop: 8,
    borderTopWidth: 1, borderTopStyle: 'solid', borderTopColor: 'var(--superficie-3)',
  },

  gestionar: {
    background: 'none', border: 'none', color: 'var(--texto-suave)', fontSize: 12,
    cursor: 'pointer', textDecoration: 'underline', padding: '10px 0 0',
  },
  gestion: {
    marginTop: 12, paddingTop: 12,
    borderTopWidth: 1, borderTopStyle: 'solid', borderTopColor: 'var(--borde)',
  },
  botonesGestion: { marginTop: 10 },
  btnProceso: {
    background: 'var(--ambar-fondo)', color: 'var(--ambar)', border: 'none',
    padding: '8px 14px', borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: 'pointer',
  },
  zonaCierre: {
    marginTop: 12, padding: 12, background: 'var(--bien-fondo)', borderRadius: 6,
  },
  notaCierre: { fontSize: 11, color: 'var(--bien)', margin: '0 0 8px', lineHeight: 1.5 },
  btnCerrar: {
    color: 'var(--sobre-marca)', border: 'none', padding: '9px 16px', borderRadius: 4,
    fontSize: 12, fontWeight: 600,
  },
  eliminar: {
    background: 'none', border: 'none', color: 'var(--mal)', fontSize: 11,
    cursor: 'pointer', textDecoration: 'underline', marginTop: 12, padding: 0,
  },
};
