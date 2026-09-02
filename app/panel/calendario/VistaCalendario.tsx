'use client';

/**
 * CALENDARIO DE PLANEACIÓN — un mes o una semana
 * ---------------------------------------------------------------
 * Un solo mes por pantalla: con dos lado a lado cada celda quedaba tan
 * estrecha que el nombre de la capacitacion se cortaba a los pocos
 * caracteres. La vista de semana da el paso siguiente para los dias
 * cargados: siete celdas altas donde cabe todo el detalle.
 *
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

/**
 * Campos minimos para `crearCapacitacion`.
 * esEmpresaPropia arranca en true, igual que el formulario del modulo
 * de Capacitaciones: la accion toma entonces el nombre de la empresa
 * activa. Con false y `empresa` vacio rebotaba pidiendo la empresa
 * capacitada, que este modal no llegaba a preguntar.
 */
const CAP_VACIA = {
  tema: '', descripcion: '', instructor: '', empresa: '',
  esEmpresaPropia: true, esEvaluada: false,
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
  eventos, empresas, empresaActiva, mesInicio, verTodas, porSemana, color,
}: {
  eventos: EventoCalendario[];
  empresas: Empresa[];
  empresaActiva: Empresa | null;
  /** Primer dia del rango: 1 del mes, o lunes de la semana. */
  mesInicio: string;
  verTodas: boolean;
  porSemana: boolean;
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

  // "12 — 18 de Agosto 2026" en semana; "Agosto 2026" en mes.
  const rotuloRango = (() => {
    if (!porSemana) return `${MESES[base.getMonth()]} ${base.getFullYear()}`;
    const fin = new Date(base.getFullYear(), base.getMonth(), base.getDate() + 6);
    return base.getMonth() === fin.getMonth()
      ? `${base.getDate()} — ${fin.getDate()} de ${MESES[base.getMonth()]} ${base.getFullYear()}`
      : `${base.getDate()} ${MESES[base.getMonth()]} — ${fin.getDate()} ${MESES[fin.getMonth()]} ${fin.getFullYear()}`;
  })();

  /** Agrupa por día para pintar cada celda sin recorrer todo el arreglo. */
  const porDia = new Map<string, EventoCalendario[]>();
  for (const e of eventos) {
    const lista = porDia.get(e.fecha) ?? [];
    lista.push(e);
    porDia.set(e.fecha, lista);
  }

  /** Fecha local en aaaa-mm-dd; toISOString correria el dia en Colombia. */
  function iso(d: Date) {
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }

  function irA(desde: string, opciones?: { semana?: boolean; todas?: boolean }) {
    const params = new URLSearchParams();
    params.set('desde', desde);
    if (opciones?.semana ?? porSemana) params.set('modo', 'semana');
    if (opciones?.todas ?? verTodas) params.set('todas', '1');
    router.push(`/panel/calendario?${params}`);
  }

  /** Un mes o una semana, segun lo que se este viendo. */
  function navegar(delta: number) {
    const d = porSemana
      ? new Date(base.getFullYear(), base.getMonth(), base.getDate() + delta * 7)
      : new Date(base.getFullYear(), base.getMonth() + delta, 1);
    irA(iso(d));
  }

  function alternarTodas() {
    irA(mesInicio, { todas: !verTodas });
  }

  /** Al cambiar de modo se conserva el dia que se estaba mirando. */
  function cambiarModo(semana: boolean) {
    irA(mesInicio, { semana });
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
    // Las inspecciones programadas se gestionan en su cronograma
    if (ev.origen === 'programacion') {
      router.push('/panel/inspecciones/programadas');
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
              background: empresaActiva ? 'var(--marca)' : 'var(--borde-fuerte)',
              cursor: empresaActiva ? 'pointer' : 'not-allowed',
            }}
          >
            + Capacitación
          </button>
        </div>
      </div>

      {/* ---------- Navegación ---------- */}
      <div style={s.navegacion}>
        <button onClick={() => navegar(-1)} style={s.flecha}
          aria-label={porSemana ? 'Semana anterior' : 'Mes anterior'}>‹</button>
        <span style={s.rango}>{rotuloRango}</span>
        <button onClick={() => navegar(1)} style={s.flecha}
          aria-label={porSemana ? 'Semana siguiente' : 'Mes siguiente'}>›</button>
        <button onClick={() => router.push('/panel/calendario')} style={s.hoy}>Hoy</button>

        <div style={s.selectorModo}>
          <button
            onClick={() => cambiarModo(false)}
            style={{
              ...s.botonModo,
              background: porSemana ? 'transparent' : 'var(--marca)',
              color: porSemana ? 'var(--texto-suave)' : 'var(--sobre-marca)',
            }}
          >
            Mes
          </button>
          <button
            onClick={() => cambiarModo(true)}
            style={{
              ...s.botonModo,
              background: porSemana ? 'var(--marca)' : 'transparent',
              color: porSemana ? 'var(--sobre-marca)' : 'var(--texto-suave)',
            }}
          >
            Semana
          </button>
        </div>
      </div>

      {aviso && (
        <div style={{
          ...s.aviso,
          background: aviso.tipo === 'ok' ? 'var(--bien-fondo)' : 'var(--mal-fondo)',
          color: aviso.tipo === 'ok' ? 'var(--bien)' : 'var(--mal)',
        }}>
          {aviso.texto}
        </div>
      )}

      {/* ---------- El periodo ---------- */}
      {porSemana ? (
        <Semana
          lunes={base}
          porDia={porDia}
          onDia={abrirNuevo}
          onEvento={abrirEdicion}
        />
      ) : (
        <Mes
          anio={base.getFullYear()}
          mes={base.getMonth()}
          porDia={porDia}
          onDia={abrirNuevo}
          onEvento={abrirEdicion}
        />
      )}

      {/* ---------- Leyenda ---------- */}
      <div style={s.leyenda}>
        <span style={s.leyendaItem}>
          <span style={{ ...s.punto, background: 'var(--marca)' }} /> Capacitación creada
        </span>
        <span style={s.leyendaItem}>
          <span style={{ ...s.punto, background: 'var(--superficie)', borderWidth: 1.5, borderStyle: 'solid', borderColor: 'var(--marca)' }} /> Anotación de agenda
        </span>
        <span style={s.leyendaItem}>
          <span style={{ ...s.punto, background: 'var(--superficie)', borderWidth: 1.5, borderStyle: 'dashed', borderColor: 'var(--marca)' }} /> Inspección programada
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
                checked={cap.esEmpresaPropia}
                onChange={(ev) => setCap({ ...cap, esEmpresaPropia: ev.target.checked })}
              />
              La capacitada es {empresaActiva?.nombre ?? 'la empresa activa'}
            </label>
            {!cap.esEmpresaPropia && (
              <input
                value={cap.empresa}
                onChange={(ev) => setCap({ ...cap, empresa: ev.target.value })}
                placeholder="Nombre de la empresa capacitada (contratista, visitante…)"
                style={{ ...s.input, marginTop: 8, textTransform: 'uppercase' }}
              />
            )}

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
                style={{ ...s.btn, background: pendiente ? 'var(--borde-fuerte)' : 'var(--marca)', flex: 1 }}>
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
                style={{ ...s.btn, background: pendiente ? 'var(--borde-fuerte)' : 'var(--marca)', flex: 1 }}>
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
   Una semana: siete columnas altas. Aqui no hace falta recortar el
   texto ni limitar cuantos eventos se ven, que es justo lo que la
   vista de mes no puede permitirse.
   --------------------------------------------------------------- */
function Semana({
  lunes, porDia, onDia, onEvento,
}: {
  lunes: Date;
  porDia: Map<string, EventoCalendario[]>;
  onDia: (fecha: string) => void;
  onEvento: (e: EventoCalendario) => void;
}) {
  const hoy = new Date();

  const dias = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(lunes.getFullYear(), lunes.getMonth(), lunes.getDate() + i);
    const p = (n: number) => String(n).padStart(2, '0');
    return {
      fecha: d,
      iso: `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`,
      esHoy: hoy.getFullYear() === d.getFullYear()
          && hoy.getMonth() === d.getMonth()
          && hoy.getDate() === d.getDate(),
      finDeSemana: i >= 5,
    };
  });

  return (
    <div style={m.mes}>
      <div style={w.rejilla}>
        {dias.map((d, i) => {
          const eventos = porDia.get(d.iso) ?? [];
          return (
            <div
              key={d.iso}
              onClick={() => onDia(d.iso)}
              style={{
                ...w.columna,
                background: d.esHoy ? 'var(--ambar-fondo)' : d.finDeSemana ? 'var(--superficie-2)' : 'var(--superficie)',
                borderColor: d.esHoy ? 'var(--ambar)' : 'var(--superficie-3)',
              }}
              title="Clic para anotar"
            >
              <div style={w.cabecera}>
                <span style={w.diaSemana}>{DIAS[i]}</span>
                <span style={{ ...w.numero, fontWeight: d.esHoy ? 700 : 500 }}>
                  {d.fecha.getDate()}
                </span>
              </div>

              {eventos.length === 0 ? (
                <p style={w.libre}>—</p>
              ) : (
                eventos.map((ev) => (
                  <div
                    key={ev.id}
                    onClick={(e) => { e.stopPropagation(); onEvento(ev); }}
                    style={{
                      ...w.evento,
                      background: ev.origen === 'capacitacion' ? ev.color : 'var(--superficie)',
                      color: ev.origen === 'capacitacion' ? 'var(--sobre-marca)' : ev.color,
                      borderWidth: 1, borderColor: ev.color,
                      borderStyle: ev.origen === 'programacion' ? 'dashed' : 'solid',
                    }}
                  >
                    {ev.hora && <div style={w.hora}>{ev.hora}</div>}
                    <div style={w.titulo}>{ev.titulo}</div>
                    {ev.codigo && <div style={w.codigo}>{ev.codigo}</div>}
                    {ev.empresa && <div style={w.empresa}>{ev.empresa}</div>}
                  </div>
                ))
              )}
            </div>
          );
        })}
      </div>
    </div>
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
                background: esHoy(d) ? 'var(--ambar-fondo)' : finDeSemana ? 'var(--superficie-2)' : 'var(--superficie)',
                borderColor: esHoy(d) ? 'var(--ambar)' : 'var(--superficie-3)',
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
                    background: ev.origen === 'capacitacion' ? ev.color : 'var(--superficie)',
                    color: ev.origen === 'capacitacion' ? 'var(--sobre-marca)' : ev.color,
                    borderWidth: 1, borderColor: ev.color,
                    // Punteado para lo programado: es un compromiso,
                    // no un documento todavia.
                    borderStyle: ev.origen === 'programacion' ? 'dashed' : 'solid',
                    cursor: 'pointer',
                  }}
                  title={`${ev.titulo}${ev.empresa ? ' · ' + ev.empresa : ''}${ev.hora ? ' · ' + ev.hora : ''}` +
                    (ev.origen === 'agenda'
                      ? ' — clic para editar esta anotación'
                      : ev.origen === 'programacion'
                      ? ' — inspección programada; clic para ver el cronograma'
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
  sub: { fontSize: 13, color: 'var(--texto-suave)', margin: 0 },
  acciones: { display: 'flex', gap: 10, flexWrap: 'wrap' },
  selectorModo: {
    display: 'inline-flex', gap: 2, marginLeft: 'auto',
    borderWidth: 1, borderStyle: 'solid', borderColor: 'var(--borde-fuerte)',
    borderRadius: 6, padding: 2, background: 'var(--superficie)',
  },
  botonModo: {
    border: 'none', borderRadius: 4, padding: '6px 14px',
    fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
  },
  convertir: {
    display: 'block', width: '100%', marginTop: 14,
    background: 'var(--superficie-3)', color: 'var(--texto)',
    borderWidth: 1, borderStyle: 'solid', borderColor: 'var(--borde)',
    borderRadius: 4, padding: '9px 12px', fontSize: 12.5,
    fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
  },
  check: {
    display: 'flex', alignItems: 'center', gap: 8,
    fontSize: 12.5, color: 'var(--texto)', marginTop: 10, cursor: 'pointer',
  },
  notaModal: {
    fontSize: 11.5, color: 'var(--texto-tenue)', margin: '14px 0 0', lineHeight: 1.5,
  },
  btn: { color: 'var(--sobre-marca)', border: 'none', padding: '10px 18px', borderRadius: 4, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  btnSec: { background: 'var(--superficie)', color: 'var(--texto)', border: '1px solid var(--borde-fuerte)', padding: '10px 16px', borderRadius: 4, fontSize: 12.5, fontWeight: 600, cursor: 'pointer' },
  btnBorrar: { background: 'var(--superficie)', color: 'var(--mal)', border: '1px solid var(--mal)', padding: '10px 16px', borderRadius: 4, fontSize: 12.5, fontWeight: 600, cursor: 'pointer' },

  navegacion: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 },
  flecha: { background: 'var(--superficie)', border: '1px solid var(--borde-fuerte)', width: 30, height: 30, borderRadius: 4, fontSize: 17, cursor: 'pointer', color: 'var(--texto)', lineHeight: 1 },
  rango: { fontSize: 14, fontWeight: 600, minWidth: 230 },
  hoy: { background: 'none', border: 'none', color: 'var(--texto-suave)', fontSize: 12.5, cursor: 'pointer', textDecoration: 'underline' },

  aviso: { padding: '10px 14px', borderRadius: 6, fontSize: 13, marginBottom: 16 },


  leyenda: { display: 'flex', gap: 20, alignItems: 'center', marginTop: 18, flexWrap: 'wrap', fontSize: 11.5, color: 'var(--texto-suave)' },
  leyendaItem: { display: 'flex', alignItems: 'center', gap: 7 },
  punto: { width: 9, height: 9, borderRadius: 2, display: 'inline-block' },
  leyendaNota: { color: 'var(--texto-tenue)', fontStyle: 'italic' },

  velo: { position: 'fixed', inset: 0, background: 'rgba(20,38,63,.45)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '50px 16px', overflowY: 'auto', zIndex: 100 },
  modal: { background: 'var(--superficie)', borderRadius: 8, padding: 24, width: '100%', maxWidth: 460 },
  modalTitulo: { fontSize: 17, margin: '0 0 3px' },
  modalSub: { fontSize: 12, color: 'var(--texto-suave)', margin: '0 0 14px' },
  label: { display: 'block', fontSize: 12, fontWeight: 600, margin: '12px 0 5px' },
  input: { width: '100%', padding: '9px 11px', border: '1px solid var(--borde-fuerte)', borderRadius: 4, fontSize: 13, boxSizing: 'border-box', fontFamily: 'inherit' },
  dos: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  modalAcciones: { display: 'flex', gap: 10, marginTop: 20, flexWrap: 'wrap' },
};

const m: Record<string, React.CSSProperties> = {
  mes: { background: 'var(--superficie)', border: '1px solid var(--borde)', borderRadius: 8, padding: 14 },
  titulo: { fontSize: 13.5, margin: '0 0 10px', fontWeight: 600 },
  anio: { color: 'var(--texto-tenue)', fontWeight: 400 },
  rejilla: { display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2 },
  diaSemana: { fontSize: 9.5, color: 'var(--texto-tenue)', textAlign: 'center', padding: '3px 0', fontWeight: 600 },
  celdaVacia: { minHeight: 116 },
  celda: {
    minHeight: 116, borderWidth: 1, borderStyle: 'solid', borderRadius: 3,
    padding: 5, cursor: 'pointer', overflow: 'hidden',
  },
  numero: { fontSize: 12, color: 'var(--texto-suave)', marginBottom: 4 },
  evento: {
    // Con un solo mes cabe el nombre completo en dos lineas en vez de
    // cortarlo con puntos suspensivos a los pocos caracteres.
    fontSize: 10.5, padding: '4px 6px', borderRadius: 3, marginBottom: 3,
    lineHeight: 1.3, overflow: 'hidden', wordBreak: 'break-word',
    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
  } as React.CSSProperties,
  hora: { fontWeight: 700, marginRight: 4 },
  mas: { fontSize: 10, color: 'var(--texto-tenue)', paddingLeft: 4 },
};

/* Vista de semana: columnas altas, sin recortes. */
const w: Record<string, React.CSSProperties> = {
  rejilla: { display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4 },
  columna: {
    minHeight: 320, borderWidth: 1, borderStyle: 'solid', borderRadius: 4,
    padding: 8, cursor: 'pointer',
  },
  cabecera: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
    marginBottom: 8, paddingBottom: 6, borderBottom: '1px solid var(--borde)',
  },
  diaSemana: { fontSize: 10, color: 'var(--texto-tenue)', fontWeight: 600, letterSpacing: .5 },
  numero: { fontSize: 15, color: 'var(--texto)' },
  libre: { fontSize: 11, color: 'var(--borde-fuerte)', textAlign: 'center', margin: '18px 0 0' },
  evento: {
    padding: '7px 8px', borderRadius: 4, marginBottom: 6, cursor: 'pointer',
  },
  hora: { fontSize: 10, fontWeight: 700, opacity: .85, marginBottom: 2 },
  titulo: { fontSize: 11.5, fontWeight: 600, lineHeight: 1.3, wordBreak: 'break-word' },
  codigo: { fontSize: 9.5, opacity: .8, marginTop: 3, fontFamily: 'ui-monospace,monospace' },
  empresa: { fontSize: 9.5, opacity: .75, marginTop: 2 },
};
