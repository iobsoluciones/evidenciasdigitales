'use client';

/**
 * CALENDARIO DE PLANEACIÓN — tres meses
 * ---------------------------------------------------------------
 * Muestra dos fuentes distinguibles:
 *   - Capacitaciones ya creadas (punto sólido)
 *   - Anotaciones de agenda (punto hueco)
 *
 * La distinción importa: lo planeado no es lo comprometido, y
 * confundirlos llevaría a creer que hay actas donde solo hay una
 * intención.
 */
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  crearEvento, actualizarEvento, eliminarEvento,
  type EventoCalendario, type TipoEvento,
} from '@/lib/acciones-agenda';
import type { Empresa } from '@/lib/empresa-activa';

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
               'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DIAS = ['L','M','X','J','V','S','D'];

const TIPOS: Array<{ id: TipoEvento; texto: string }> = [
  { id: 'capacitacion', texto: 'Capacitación' },
  { id: 'inspeccion',   texto: 'Inspección' },
  { id: 'entrega',      texto: 'Entrega de EPP' },
  { id: 'auditoria',    texto: 'Auditoría' },
  { id: 'otro',         texto: 'Otro' },
];

const VACIO = {
  titulo: '', fecha: '', hora: '', tipo: 'capacitacion' as TipoEvento, notas: '',
};

export default function VistaCalendario({
  eventos, empresas, empresaActiva, mesInicio, verTodas, color,
}: {
  eventos: EventoCalendario[];
  empresas: Empresa[];
  empresaActiva: Empresa | null;
  mesInicio: string;
  verTodas: boolean;
  color: string;
}) {
  const router = useRouter();
  const [pendiente, startTransition] = useTransition();
  const [abierto, setAbierto] = useState(false);
  const [editando, setEditando] = useState<string | null>(null);
  const [f, setF] = useState(VACIO);
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  const base = new Date(mesInicio + 'T12:00:00');

  /** Agrupa por día para pintar cada celda sin recorrer todo el arreglo. */
  const porDia = new Map<string, EventoCalendario[]>();
  for (const e of eventos) {
    const lista = porDia.get(e.fecha) ?? [];
    lista.push(e);
    porDia.set(e.fecha, lista);
  }

  function navegar(delta: number) {
    const d = new Date(base.getFullYear(), base.getMonth() + delta, 1);
    const params = new URLSearchParams();
    params.set('desde', d.toISOString().slice(0, 10));
    if (verTodas) params.set('todas', '1');
    router.push(`/panel/calendario?${params}`);
  }

  function alternarTodas() {
    const params = new URLSearchParams();
    params.set('desde', mesInicio);
    if (!verTodas) params.set('todas', '1');
    router.push(`/panel/calendario?${params}`);
  }

  function abrirNuevo(fecha?: string) {
    setEditando(null);
    setF({ ...VACIO, fecha: fecha ?? '' });
    setAviso(null);
    setAbierto(true);
  }

  function abrirEdicion(ev: EventoCalendario) {
    // Las capacitaciones reales no se editan aquí: se editan en su ficha
    if (ev.origen === 'capacitacion') return;
    setEditando(ev.id);
    setF({
      titulo: ev.titulo,
      fecha: ev.fecha,
      hora: ev.hora ?? '',
      tipo: ev.tipo,
      notas: ev.detalle ?? '',
    });
    setAviso(null);
    setAbierto(true);
  }

  function guardar() {
    startTransition(async () => {
      const r = editando
        ? await actualizarEvento(editando, f)
        : await crearEvento({ ...f, empresaId: empresaActiva?.id ?? null });

      setAviso({ tipo: r.ok ? 'ok' : 'error', texto: r.mensaje });
      if (r.ok) {
        setAbierto(false);
        router.refresh();
      }
    });
  }

  function borrar() {
    if (!editando) return;
    startTransition(async () => {
      const r = await eliminarEvento(editando);
      setAviso({ tipo: r.ok ? 'ok' : 'error', texto: r.mensaje });
      if (r.ok) {
        setAbierto(false);
        router.refresh();
      }
    });
  }

  return (
    <>
      <div style={s.cabecera}>
        <div>
          <h1 style={s.titulo}>Calendario</h1>
          <p style={s.sub}>
            {verTodas
              ? 'Todas las empresas a tu cargo'
              : empresaActiva?.nombre ?? 'Sin empresa seleccionada'}
            {' · planeación, no crea capacitaciones'}
          </p>
        </div>
        <div style={s.acciones}>
          <button onClick={alternarTodas} style={s.btnSec}>
            {verTodas ? 'Ver solo la empresa activa' : 'Ver todas las empresas'}
          </button>
          <button onClick={() => abrirNuevo()} style={{ ...s.btn, background: color }}>
            + Anotación
          </button>
        </div>
      </div>

      {/* ---------- Navegación ---------- */}
      <div style={s.navegacion}>
        <button onClick={() => navegar(-1)} style={s.flecha} aria-label="Mes anterior">‹</button>
        <span style={s.rango}>
          {MESES[base.getMonth()]} — {MESES[(base.getMonth() + 1) % 12]} {base.getFullYear()}
        </span>
        <button onClick={() => navegar(1)} style={s.flecha} aria-label="Mes siguiente">›</button>
        <button onClick={() => router.push('/panel/calendario')} style={s.hoy}>Hoy</button>
      </div>

      {aviso && (
        <div style={{
          ...s.aviso,
          background: aviso.tipo === 'ok' ? '#F0FDF4' : '#FDF2F2',
          color: aviso.tipo === 'ok' ? '#15803D' : '#9B1C1C',
        }}>
          {aviso.texto}
        </div>
      )}

      {/* ---------- Dos meses: actual y siguiente ---------- */}
      {/* Dos en vez de tres da el ancho suficiente para leer el
          nombre de cada capacitacion dentro de la celda. */}
      <div style={s.meses}>
        {[0, 1].map((offset) => (
          <Mes
            key={offset}
            anio={base.getFullYear()}
            mes={base.getMonth() + offset}
            porDia={porDia}
            onDia={abrirNuevo}
            onEvento={abrirEdicion}
          />
        ))}
      </div>

      {/* ---------- Leyenda ---------- */}
      <div style={s.leyenda}>
        <span style={s.leyendaItem}>
          <span style={{ ...s.punto, background: color }} /> Capacitación creada
        </span>
        <span style={s.leyendaItem}>
          <span style={{ ...s.punto, background: '#fff', borderWidth: 1.5, borderStyle: 'solid', borderColor: color }} /> Anotación de agenda
        </span>
        <span style={s.leyendaNota}>
          Clic en un día para anotar; clic en una anotación para editarla.
        </span>
      </div>

      {/* ---------- Modal ---------- */}
      {abierto && (
        <div style={s.velo} onClick={(e) => { if (e.target === e.currentTarget) setAbierto(false); }}>
          <div style={s.modal}>
            <h2 style={s.modalTitulo}>
              {editando ? 'Editar anotación' : 'Nueva anotación'}
            </h2>
            <p style={s.modalSub}>
              {empresaActiva
                ? `Se agenda para ${empresaActiva.nombre}.`
                : 'Sin empresa asignada.'}
            </p>

            <label style={s.label}>Título</label>
            <input
              value={f.titulo}
              onChange={(e) => setF({ ...f, titulo: e.target.value })}
              placeholder="TRABAJO EN ALTURAS"
              style={{ ...s.input, textTransform: 'uppercase' }}
            />

            <div style={s.dos}>
              <div>
                <label style={s.label}>Fecha</label>
                <input type="date" value={f.fecha}
                  onChange={(e) => setF({ ...f, fecha: e.target.value })} style={s.input} />
              </div>
              <div>
                <label style={s.label}>Hora (opcional)</label>
                <input type="time" value={f.hora}
                  onChange={(e) => setF({ ...f, hora: e.target.value })} style={s.input} />
              </div>
            </div>

            <label style={s.label}>Tipo</label>
            <select value={f.tipo}
              onChange={(e) => setF({ ...f, tipo: e.target.value as TipoEvento })}
              style={s.input}>
              {TIPOS.map((t) => <option key={t.id} value={t.id}>{t.texto}</option>)}
            </select>

            <label style={s.label}>Notas</label>
            <textarea value={f.notas} rows={3}
              onChange={(e) => setF({ ...f, notas: e.target.value })}
              style={{ ...s.input, resize: 'vertical' }} />

            <div style={s.modalAcciones}>
              <button onClick={guardar} disabled={pendiente}
                style={{ ...s.btn, background: pendiente ? '#C5C5BD' : color, flex: 1 }}>
                {pendiente ? 'Guardando…' : 'Guardar'}
              </button>
              {editando && (
                <button onClick={borrar} disabled={pendiente} style={s.btnBorrar}>Eliminar</button>
              )}
              <button onClick={() => setAbierto(false)} style={s.btnSec}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ---------------------------------------------------------------
   Un mes: rejilla de 7 columnas empezando en lunes.
   --------------------------------------------------------------- */
function Mes({
  anio, mes, porDia, onDia, onEvento,
}: {
  anio: number;
  mes: number;
  porDia: Map<string, EventoCalendario[]>;
  onDia: (fecha: string) => void;
  onEvento: (e: EventoCalendario) => void;
}) {
  const primero = new Date(anio, mes, 1);
  const dias = new Date(anio, mes + 1, 0).getDate();

  // getDay() devuelve 0 para domingo; se desplaza para empezar en lunes
  const desplazamiento = (primero.getDay() + 6) % 7;

  const hoy = new Date();
  const esHoy = (d: number) =>
    hoy.getFullYear() === anio && hoy.getMonth() === mes && hoy.getDate() === d;

  const celdas: Array<number | null> = [
    ...Array(desplazamiento).fill(null),
    ...Array.from({ length: dias }, (_, i) => i + 1),
  ];

  function fechaISO(d: number) {
    return `${anio}-${String(mes + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }

  return (
    <div style={m.mes}>
      <h3 style={m.titulo}>
        {MESES[new Date(anio, mes).getMonth()]}{' '}
        <span style={m.anio}>{new Date(anio, mes).getFullYear()}</span>
      </h3>

      <div style={m.rejilla}>
        {DIAS.map((d, i) => (
          <div key={i} style={m.diaSemana}>{d}</div>
        ))}

        {celdas.map((d, i) => {
          if (d === null) return <div key={`v${i}`} style={m.celdaVacia} />;

          const iso = fechaISO(d);
          const eventos = porDia.get(iso) ?? [];
          const finDeSemana = i % 7 >= 5;

          return (
            <div
              key={iso}
              onClick={() => onDia(iso)}
              style={{
                ...m.celda,
                background: esHoy(d) ? '#FEF9E7' : finDeSemana ? '#FAFAF8' : '#fff',
                borderColor: esHoy(d) ? '#E8C766' : '#EFEFEA',
              }}
              title="Clic para anotar"
            >
              <div style={{ ...m.numero, fontWeight: esHoy(d) ? 700 : 400 }}>{d}</div>

              {eventos.slice(0, 3).map((ev) => (
                <div
                  key={ev.id}
                  onClick={(e) => { e.stopPropagation(); onEvento(ev); }}
                  style={{
                    ...m.evento,
                    background: ev.origen === 'capacitacion' ? ev.color : '#fff',
                    color: ev.origen === 'capacitacion' ? '#fff' : ev.color,
                    borderWidth: 1, borderStyle: 'solid', borderColor: ev.color,
                    cursor: ev.origen === 'agenda' ? 'pointer' : 'default',
                  }}
                  title={`${ev.titulo}${ev.empresa ? ' · ' + ev.empresa : ''}${ev.hora ? ' · ' + ev.hora : ''}`}
                >
                  {ev.hora && <span style={m.hora}>{ev.hora}</span>}
                  {ev.titulo}
                </div>
              ))}

              {eventos.length > 3 && (
                <div style={m.mas}>+{eventos.length - 3} más</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  cabecera: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap', marginBottom: 18 },
  titulo: { fontSize: 22, margin: '0 0 3px', letterSpacing: -0.4 },
  sub: { fontSize: 13, color: '#5B6470', margin: 0 },
  acciones: { display: 'flex', gap: 10, flexWrap: 'wrap' },
  btn: { color: '#fff', border: 'none', padding: '10px 18px', borderRadius: 4, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  btnSec: { background: '#fff', color: '#14263F', border: '1px solid #DFDFD8', padding: '10px 16px', borderRadius: 4, fontSize: 12.5, fontWeight: 600, cursor: 'pointer' },
  btnBorrar: { background: '#fff', color: '#9B1C1C', border: '1px solid #F5C6C6', padding: '10px 16px', borderRadius: 4, fontSize: 12.5, fontWeight: 600, cursor: 'pointer' },

  navegacion: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 },
  flecha: { background: '#fff', border: '1px solid #DFDFD8', width: 30, height: 30, borderRadius: 4, fontSize: 17, cursor: 'pointer', color: '#14263F', lineHeight: 1 },
  rango: { fontSize: 14, fontWeight: 600, minWidth: 230 },
  hoy: { background: 'none', border: 'none', color: '#5B6470', fontSize: 12.5, cursor: 'pointer', textDecoration: 'underline' },

  aviso: { padding: '10px 14px', borderRadius: 6, fontSize: 13, marginBottom: 16 },

  meses: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(390px,1fr))', gap: 20 },

  leyenda: { display: 'flex', gap: 20, alignItems: 'center', marginTop: 18, flexWrap: 'wrap', fontSize: 11.5, color: '#5B6470' },
  leyendaItem: { display: 'flex', alignItems: 'center', gap: 7 },
  punto: { width: 9, height: 9, borderRadius: 2, display: 'inline-block' },
  leyendaNota: { color: '#8A929C', fontStyle: 'italic' },

  velo: { position: 'fixed', inset: 0, background: 'rgba(20,38,63,.45)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '50px 16px', overflowY: 'auto', zIndex: 100 },
  modal: { background: '#fff', borderRadius: 8, padding: 24, width: '100%', maxWidth: 460 },
  modalTitulo: { fontSize: 17, margin: '0 0 3px' },
  modalSub: { fontSize: 12, color: '#5B6470', margin: '0 0 14px' },
  label: { display: 'block', fontSize: 12, fontWeight: 600, margin: '12px 0 5px' },
  input: { width: '100%', padding: '9px 11px', border: '1px solid #DFDFD8', borderRadius: 4, fontSize: 13, boxSizing: 'border-box', fontFamily: 'inherit' },
  dos: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  modalAcciones: { display: 'flex', gap: 10, marginTop: 20, flexWrap: 'wrap' },
};

const m: Record<string, React.CSSProperties> = {
  mes: { background: '#fff', border: '1px solid #E4E4DF', borderRadius: 8, padding: 14 },
  titulo: { fontSize: 13.5, margin: '0 0 10px', fontWeight: 600 },
  anio: { color: '#8A929C', fontWeight: 400 },
  rejilla: { display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2 },
  diaSemana: { fontSize: 9.5, color: '#8A929C', textAlign: 'center', padding: '3px 0', fontWeight: 600 },
  celdaVacia: { minHeight: 82 },
  celda: {
    minHeight: 82, borderWidth: 1, borderStyle: 'solid', borderRadius: 3,
    padding: 4, cursor: 'pointer', overflow: 'hidden',
  },
  numero: { fontSize: 11, color: '#5B6470', marginBottom: 3 },
  evento: {
    fontSize: 9, padding: '3px 4px', borderRadius: 2, marginBottom: 2,
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.35,
  },
  hora: { fontWeight: 700, marginRight: 4 },
  mas: { fontSize: 9, color: '#8A929C', paddingLeft: 4 },
};
