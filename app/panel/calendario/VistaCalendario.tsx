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
  crearEvento, actualizarEvento, eliminarEvento, vincularAnotacion,
  type EventoCalendario, type TipoEvento,
} from '@/lib/acciones-agenda';
import { crearCapacitacion } from '@/lib/acciones';
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

/** Campos minimos para que `crearCapacitacion` valide sin rebotar. */
const CAP_VACIA = {
  tema: '', descripcion: '', instructor: '', empresa: '',
  esEmpresaPropia: false, esEvaluada: false,
  validarEmpleados: false, incluirFirmaProfesional: false,
  fecha_inicio: '', fecha_fin: '', esperados: '',
};

/** 'aaaa-mm-dd' + 'hh:mm' -> valor de un input datetime-local. */
function aLocal(fecha: string, hora: string, horasMas = 0) {
  const base = new Date(`${fecha}T${hora || '08:00'}:00`);
  if (Number.isNaN(base.getTime())) return '';
  base.setHours(base.getHours() + horasMas);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${base.getFullYear()}-${p(base.getMonth() + 1)}-${p(base.getDate())}` +
         `T${p(base.getHours())}:${p(base.getMinutes())}`;
}

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

  // Alta de capacitacion REAL desde el calendario. `desdeAnotacion`
  // guarda la anotacion de origen para vincularla despues y que el dia
  // no muestre el plan y el documento a la vez.
  const [capAbierta, setCapAbierta] = useState(false);
  const [cap, setCap] = useState(CAP_VACIA);
  const [desdeAnotacion, setDesdeAnotacion] = useState<string | null>(null);

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
    // Las capacitaciones reales no se editan aqui, pero el clic tampoco
    // puede quedarse mudo: se abre su ficha, que es donde si se editan.
    // Antes hacia `return` a secas, de modo que en un calendario con
    // capacitaciones y sin anotaciones ningun clic hacia nada.
    if (ev.origen === 'capacitacion') {
      router.push(`/panel/capacitaciones/${ev.id}`);
      return;
    }
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

  /** Abre el alta de capacitacion, opcionalmente partiendo de una anotacion. */
  function abrirCapacitacion(desde?: EventoCalendario) {
    const hoy = new Date().toISOString().slice(0, 10);
    const fecha = desde?.fecha ?? hoy;
    const hora = desde?.hora ?? '08:00';

    setDesdeAnotacion(desde?.id ?? null);
    setCap({
      ...CAP_VACIA,
      tema: desde?.titulo ?? '',
      descripcion: desde?.detalle ?? '',
      fecha_inicio: aLocal(fecha, hora),
      fecha_fin: aLocal(fecha, hora, 2),   // dos horas por defecto
    });
    setAviso(null);
    setAbierto(false);
    setCapAbierta(true);
  }

  function guardarCapacitacion() {
    startTransition(async () => {
      const r = await crearCapacitacion(cap);

      if (!r.ok) {
        setAviso({ tipo: 'error', texto: r.mensaje });
        return;
      }

      // Si nacio de una anotacion, se ata para no duplicar el dia.
      // Que la vinculacion falle no invalida la capacitacion, que ya
      // quedo creada: se avisa sin perder ese hecho.
      let texto = r.mensaje + ' Ya aparece en el listado y en el calendario.';
      if (desdeAnotacion && r.id) {
        const v = await vincularAnotacion(desdeAnotacion, r.id);
        if (!v.ok) texto += ' La anotación de origen sigue visible: ' + v.mensaje;
      }

      setAviso({ tipo: 'ok', texto });
      setCapAbierta(false);
      setDesdeAnotacion(null);
      router.refresh();
    });
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
            {' · planeación y alta de capacitaciones'}
          </p>
        </div>
        <div style={s.acciones}>
          <button onClick={alternarTodas} style={s.btnSec}>
            {verTodas ? 'Ver solo la empresa activa' : 'Ver todas las empresas'}
          </button>
          <button onClick={() => abrirNuevo()} style={s.btnSec}>
            + Anotación
          </button>
          <button
            onClick={() => abrirCapacitacion()}
            disabled={!empresaActiva}
            title={empresaActiva
              ? 'Crea la capacitación real, con su código y su acta'
              : 'Selecciona una empresa para crear capacitaciones'}
            style={{
              ...s.btn,
              background: empresaActiva ? color : '#C5C5BD',
              cursor: empresaActiva ? 'pointer' : 'not-allowed',
            }}
          >
            + Capacitación
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
          Clic en un día para anotar; en una anotación para editarla; en una
          capacitación para abrir su ficha.
        </span>
      </div>

      {/* ---------- Modal: capacitación real ---------- */}
      {capAbierta && (
        <div style={s.velo} onClick={(ev) => { if (ev.target === ev.currentTarget) setCapAbierta(false); }}>
          <div style={s.modal}>
            <h2 style={s.modalTitulo}>Nueva capacitación</h2>
            <p style={s.modalSub}>
              {desdeAnotacion
                ? 'Nace de una anotación: al crearla, el día mostrará la capacitación en vez del plan.'
                : 'Se crea inactiva. Actívala desde su ficha cuando vayas a registrar asistencia.'}
              {empresaActiva ? ` Empresa: ${empresaActiva.nombre}.` : ''}
            </p>

            <label style={s.label}>Tema</label>
            <input
              value={cap.tema}
              onChange={(ev) => setCap({ ...cap, tema: ev.target.value })}
              placeholder="TRABAJO EN ALTURAS"
              style={{ ...s.input, textTransform: 'uppercase' }}
            />

            <label style={s.label}>Instructor</label>
            <input
              value={cap.instructor}
              onChange={(ev) => setCap({ ...cap, instructor: ev.target.value })}
              placeholder="Nombre de quien dicta"
              style={s.input}
            />

            <div style={s.dos}>
              <div>
                <label style={s.label}>Inicio</label>
                <input type="datetime-local" value={cap.fecha_inicio}
                  onChange={(ev) => setCap({ ...cap, fecha_inicio: ev.target.value })}
                  style={s.input} />
              </div>
              <div>
                <label style={s.label}>Fin</label>
                <input type="datetime-local" value={cap.fecha_fin}
                  onChange={(ev) => setCap({ ...cap, fecha_fin: ev.target.value })}
                  style={s.input} />
              </div>
            </div>

            <label style={s.label}>Participantes esperados (opcional)</label>
            <input
              value={cap.esperados}
              inputMode="numeric"
              onChange={(ev) => setCap({ ...cap, esperados: ev.target.value.replace(/[^0-9]/g, '') })}
              placeholder="20"
              style={s.input}
            />

            <label style={s.label}>Descripción (opcional)</label>
            <textarea value={cap.descripcion} rows={2}
              onChange={(ev) => setCap({ ...cap, descripcion: ev.target.value })}
              style={{ ...s.input, resize: 'vertical' }} />

            <label style={s.check}>
              <input
                type="checkbox"
                checked={cap.validarEmpleados}
                onChange={(ev) => setCap({ ...cap, validarEmpleados: ev.target.checked })}
              />
              Solo pueden registrarse empleados de la base
            </label>
            <label style={s.check}>
              <input
                type="checkbox"
                checked={cap.esEvaluada}
                onChange={(ev) => setCap({ ...cap, esEvaluada: ev.target.checked })}
              />
              Lleva evaluación
            </label>

            <p style={s.notaModal}>
              El resto de opciones (evaluación, firma profesional) se ajustan
              después en la ficha de la capacitación.
            </p>

            <div style={s.modalAcciones}>
              <button onClick={guardarCapacitacion} disabled={pendiente}
                style={{ ...s.btn, background: pendiente ? '#C5C5BD' : color, flex: 1 }}>
                {pendiente ? 'Creando…' : 'Crear capacitación'}
              </button>
              <button onClick={() => setCapAbierta(false)} style={s.btnSec}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

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

            {/* Solo si la anotacion es de la empresa activa: crearCapacitacion
                trabaja siempre sobre esa empresa, y convertir una anotacion
                ajena emitiria el documento en la empresa equivocada. */}
            {editando && (() => {
              const ev = eventos.find((x) => x.id === editando);
              if (!ev || !empresaActiva) return null;

              if (ev.empresaId !== empresaActiva.id) {
                return (
                  <p style={s.notaModal}>
                    Para convertirla en capacitación, cambia la empresa activa a{' '}
                    <strong>{ev.empresa}</strong>.
                  </p>
                );
              }

              return (
                <button
                  onClick={() => abrirCapacitacion(ev)}
                  disabled={pendiente}
                  style={s.convertir}
                >
                  Convertir en capacitación real →
                </button>
              );
            })()}

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
                    cursor: 'pointer',
                  }}
                  title={`${ev.titulo}${ev.empresa ? ' · ' + ev.empresa : ''}${ev.hora ? ' · ' + ev.hora : ''}` +
                    (ev.origen === 'agenda'
                      ? ' — clic para editar esta anotación'
                      : ' — clic para abrir su ficha')}
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
  convertir: {
    display: 'block', width: '100%', marginTop: 14,
    background: '#F4F7FB', color: '#14263F',
    borderWidth: 1, borderStyle: 'solid', borderColor: '#D3DEEC',
    borderRadius: 4, padding: '9px 12px', fontSize: 12.5,
    fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
  },
  check: {
    display: 'flex', alignItems: 'center', gap: 8,
    fontSize: 12.5, color: '#14263F', marginTop: 10, cursor: 'pointer',
  },
  notaModal: {
    fontSize: 11.5, color: '#8A929C', margin: '14px 0 0', lineHeight: 1.5,
  },
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
