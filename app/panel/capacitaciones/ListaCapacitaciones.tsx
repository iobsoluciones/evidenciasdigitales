'use client';

/**
 * LISTA CON FILTROS Y FORMULARIO
 * ---------------------------------------------------------------
 * Los filtros de año, mes y texto trabajan sobre los datos ya
 * cargados, así que responden al instante sin ir al servidor.
 */
import { useState, useMemo, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Capacitacion } from '@/lib/tipos';
import QrRegistro from './QrRegistro';
import { fmtFecha, colorParticipacion, MESES, aDatetimeLocal } from '@/lib/tipos';
import {
  crearCapacitacion,
  eliminarCapacitacion,
  crearDesdePlantilla,
  actualizarCapacitacion,
  activarCapacitacion,
  cambiarEstado,
} from '@/lib/acciones';

const VACIO = {
  tema: '', descripcion: '', instructor: '',
  empresa: '', esEmpresaPropia: true, esEvaluada: false, validarEmpleados: false,
  incluirFirmaProfesional: false,
  fecha_inicio: '', fecha_fin: '', esperados: '',
};

export type PlantillaResumen = {
  id: string;
  nombre: string;
  tema: string;
  instructor: string | null;
  duracion_horas: number | null;
  es_evaluada: boolean;
  evaluacion_nombre: string | null;
  veces_usada: number;
};

/**
 * ESTADO MOSTRADO — derivado, no almacenado
 * ---------------------------------------------------------------
 * La base solo guarda activa / inactiva / cerrada (CHECK
 * estado_cap_valido), asi que 'programada' no es un valor almacenable:
 * se deriva en lectura, igual que el plan de accion calcula lo vencido
 * al listar en vez de persistirlo.
 *
 * Los estados reales se respetan tal cual. 'activa' significa "acepta
 * registros por el enlace publico" y no es un momento del calendario,
 * asi que la fecha no lo reescribe. La fecha solo desambigua las
 * INACTIVAS, que es donde no dice nada por si sola: ya paso (cerrada)
 * o esta por venir (programada).
 */
function estadoMostrado(
  c: { estado: string; fecha_inicio: string; fecha_fin: string },
  ahora: number
): { texto: string; fondo: string; color: string } {
  if (c.estado === 'activa') {
    return { texto: 'Activa', fondo: 'var(--bien-fondo)', color: 'var(--bien)' };
  }
  if (c.estado === 'cerrada') {
    return { texto: 'Cerrada', fondo: 'var(--superficie-3)', color: 'var(--texto-suave)' };
  }

  // Inactiva: la fecha dice si ya paso o si esta por venir.
  const inicio = new Date(c.fecha_inicio).getTime();
  const fin = new Date(c.fecha_fin).getTime();

  if (fin < ahora) return { texto: 'Cerrada', fondo: 'var(--superficie-3)', color: 'var(--texto-suave)' };
  if (inicio > ahora) return { texto: 'Programada', fondo: 'var(--info-fondo)', color: 'var(--info)' };

  // Hoy cae dentro del rango: sigue siendo su estado real.
  return { texto: 'Inactiva', fondo: 'var(--superficie-3)', color: 'var(--texto-suave)' };
}

export default function ListaCapacitaciones({
  capacitaciones,
  nombreOrganizacion,
  empresaSlug,
  empresaNombre,
  color,
  plantillas = [],
  tieneFirmaPropia = false,
}: {
  capacitaciones: Capacitacion[];
  nombreOrganizacion: string;
  /** Slug de la EMPRESA: el enlace publico es el mismo para todas sus
   *  capacitaciones, por eso el QR vive aqui y no en cada detalle. */
  empresaSlug: string;
  empresaNombre: string;
  color: string;
  plantillas?: PlantillaResumen[];
  /** Si el consultor no ha registrado su firma, la casilla se
   *  deshabilita con la explicación en vez de fallar al activar. */
  tieneFirmaPropia?: boolean;
}) {
  const router = useRouter();
  const [pendiente, startTransition] = useTransition();

  const [anio, setAnio] = useState('');
  const [mes, setMes] = useState('');
  const [texto, setTexto] = useState('');

  const [abierto, setAbierto] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState(VACIO);
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);
  const [confirmandoBorrado, setConfirmandoBorrado] = useState(false);

  // Alta desde plantilla: solo pide fechas
  const [modoPlantilla, setModoPlantilla] = useState(false);
  const [plantillaId, setPlantillaId] = useState('');
  const [fechasPlantilla, setFechasPlantilla] = useState({ fecha_inicio: '', fecha_fin: '' });

  // Años presentes en los datos, de más reciente a más antiguo
  const anios = useMemo(() => {
    const s = new Set(capacitaciones.map((c) => new Date(c.fecha_inicio).getFullYear()));
    return Array.from(s).sort((a, b) => b - a);
  }, [capacitaciones]);

  // Un unico instante por render: asi todas las filas se clasifican
  // contra la misma referencia y no se contradicen entre si.
  const ahora = Date.now();

  /**
   * LA SIGUIENTE a la fecha actual: la primera que esta por ocurrir,
   * que es la que hay que preparar. Si no queda ninguna por delante no
   * se resalta nada: destacar una ya pasada solo despistaria.
   */
  const proximaId = useMemo(() => {
    const ahora = Date.now();
    const futuras = capacitaciones
      .filter((c) => new Date(c.fecha_inicio).getTime() >= ahora)
      .sort((a, b) => +new Date(a.fecha_inicio) - +new Date(b.fecha_inicio));

    return futuras.length > 0 ? futuras[0].id : null;
  }, [capacitaciones]);

  const filtradas = useMemo(() => {
    return capacitaciones.filter((c) => {
      const d = new Date(c.fecha_inicio);
      if (anio && d.getFullYear() !== Number(anio)) return false;
      if (mes !== '' && d.getMonth() !== Number(mes)) return false;
      if (texto) {
        const blob = `${c.codigo} ${c.tema} ${c.instructor}`.toUpperCase();
        if (!blob.includes(texto.toUpperCase())) return false;
      }
      return true;
    });
  }, [capacitaciones, anio, mes, texto]);

  function abrirNueva() {
    setEditandoId(null);
    setForm(VACIO);
    setAviso(null);
    setModoPlantilla(false);
    setPlantillaId('');
    setFechasPlantilla({ fecha_inicio: '', fecha_fin: '' });
    setAbierto(true);
  }

  function crearConPlantilla() {
    if (!plantillaId) {
      setAviso({ tipo: 'error', texto: 'Elige una plantilla.' });
      return;
    }
    startTransition(async () => {
      const r = await crearDesdePlantilla(plantillaId, fechasPlantilla);
      if (r.ok) {
        setAbierto(false);
        setAviso({ tipo: 'ok', texto: r.mensaje });
        router.refresh();
      } else {
        setAviso({ tipo: 'error', texto: r.mensaje });
      }
    });
  }

  const plantillaElegida = plantillas.find((p) => p.id === plantillaId);

  function abrirEditar(c: Capacitacion) {
    setEditandoId(c.id);
    setConfirmandoBorrado(false);
    setForm({
      tema: c.tema,
      descripcion: c.descripcion ?? '',
      instructor: c.instructor,
      empresa: c.empresa ?? '',
      esEmpresaPropia: c.es_empresa_propia ?? false,
      esEvaluada: c.es_evaluada ?? false,
      validarEmpleados: c.validar_empleados ?? false,
      incluirFirmaProfesional: c.incluir_firma_profesional ?? false,
      fecha_inicio: aDatetimeLocal(c.fecha_inicio),
      fecha_fin: aDatetimeLocal(c.fecha_fin),
      esperados: c.esperados?.toString() ?? '',
    });
    setAviso(null);
    setAbierto(true);
  }

  function borrar() {
    if (!editandoId) return;
    startTransition(async () => {
      const r = await eliminarCapacitacion(editandoId);
      if (r.ok) {
        setAbierto(false);
        setConfirmandoBorrado(false);
        setEditandoId(null);
        setAviso({ tipo: 'ok', texto: r.mensaje });
        router.refresh();
      } else {
        setAviso({ tipo: 'error', texto: r.mensaje });
      }
    });
  }

  function guardar() {
    startTransition(async () => {
      const r = editandoId
        ? await actualizarCapacitacion(editandoId, form)
        : await crearCapacitacion(form);

      if (r.ok) {
        setAbierto(false);
        setAviso({ tipo: 'ok', texto: r.mensaje });
        router.refresh();
      } else {
        setAviso({ tipo: 'error', texto: r.mensaje });
      }
    });
  }

  function activar(id: string) {
    startTransition(async () => {
      const r = await activarCapacitacion(id);
      setAviso({ tipo: r.ok ? 'ok' : 'error', texto: r.mensaje });
      router.refresh();
    });
  }

  function desactivar(id: string) {
    startTransition(async () => {
      const r = await cambiarEstado(id, 'inactiva');
      setAviso({ tipo: r.ok ? 'ok' : 'error', texto: r.mensaje });
      router.refresh();
    });
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, color: 'var(--texto)', margin: 0 }}>Capacitaciones</h1>
          <p style={{ color: 'var(--texto-suave)', fontSize: 13, margin: '4px 0 0' }}>
            Solo una puede estar activa a la vez.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {/* Exportación completa: capacitaciones, participantes y
              resumen por persona en un solo libro */}
          <QrRegistro slug={empresaSlug} empresaNombre={empresaNombre} color={color} />
          <a href="/api/excel/todo" style={est.btnExcel}>Exportar todo a Excel</a>
          <button onClick={abrirNueva} style={est.btnPrimario}>+ Nueva capacitación</button>
        </div>
      </div>

      {aviso && (
        <div style={{
          ...est.aviso,
          background: aviso.tipo === 'ok' ? 'var(--bien-fondo)' : 'var(--mal-fondo)',
          color: aviso.tipo === 'ok' ? 'var(--bien)' : 'var(--mal)',
        }}>
          {aviso.texto}
        </div>
      )}

      <section style={est.tarjeta}>
        {/* ---------- Filtros ---------- */}
        <div style={est.filtros}>
          <div>
            <label style={est.label}>Año</label>
            <select value={anio} onChange={(e) => setAnio(e.target.value)} style={est.input}>
              <option value="">Todos</option>
              {anios.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <label style={est.label}>Mes</label>
            <select value={mes} onChange={(e) => setMes(e.target.value)} style={est.input}>
              <option value="">Todos</option>
              {MESES.map((m, i) => <option key={m} value={i}>{m}</option>)}
            </select>
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <label style={est.label}>Buscar</label>
            <input
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Código, tema o instructor"
              style={est.input}
            />
          </div>
          <button
            onClick={() => { setAnio(''); setMes(''); setTexto(''); }}
            style={{ ...est.btnSec, marginTop: 20 }}
          >
            Limpiar
          </button>
        </div>

        <p style={{ fontSize: 12, color: 'var(--texto-suave)', margin: '0 0 12px' }}>
          Mostrando {filtradas.length} de {capacitaciones.length}
        </p>

        {/* ---------- Tabla ---------- */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                {['Código', 'Tema', 'Inicio', 'Estado', 'Part.', '% Part.', 'Firma', 'Acciones'].map((h) => (
                  <th key={h} style={est.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtradas.map((c) => {
                const col = colorParticipacion(c.porcentaje_participacion);
                const activa = c.estado === 'activa';
                const vista = estadoMostrado(c, ahora);
                const esProxima = proximaId === c.id;
                return (
                  <tr
                    key={c.id}
                    style={esProxima ? est.filaProxima : undefined}
                  >
                    <td style={est.td}>
                      <Link href={`/panel/capacitaciones/${c.id}`} style={{ color: 'var(--marca)', fontWeight: 600 }}>
                        {c.codigo}
                      </Link>
                    </td>
                    <td style={est.td}>
                      {c.tema}
                      {esProxima && (
                        <span style={est.pillProxima}>Siguiente</span>
                      )}
                    </td>
                    <td style={est.td}>{fmtFecha(c.fecha_inicio)}</td>
                    <td style={est.td}>
                      <span style={{
                        ...est.pill,
                        background: vista.fondo,
                        color: vista.color,
                      }}>
                        {vista.texto}
                      </span>
                    </td>
                    <td style={est.td}>{c.registrados}</td>
                    <td style={est.td}>
                      <span
                        style={{ ...est.pill, background: col.fondo, color: col.texto }}
                        title={c.esperados ? `${c.registrados} de ${c.esperados}` : 'Sin meta definida'}
                      >
                        {c.porcentaje_participacion}%
                      </span>
                    </td>
                    <td style={est.td}>
                      {c.instructor_firmo
                        ? <span style={{ color: 'var(--bien)', fontWeight: 600 }}>Firmado</span>
                        : <span style={{ color: 'var(--texto-tenue)' }}>Pendiente</span>}
                    </td>
                    <td style={est.td}>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {activa
                          ? <button onClick={() => desactivar(c.id)} disabled={pendiente} style={est.btnMini}>Desactivar</button>
                          : <button onClick={() => activar(c.id)} disabled={pendiente} style={{ ...est.btnMini, ...est.btnVerde }}>Activar</button>}
                        {/* Solo se edita y se convoca en la capacitación
                            activa: una inactiva o cerrada ya no se modifica. */}
                        <button
                          onClick={() => abrirEditar(c)}
                          disabled={pendiente || !activa}
                          title={activa ? 'Editar' : 'Actívala para poder editarla'}
                          style={{
                            ...est.btnMini,
                            opacity: activa ? 1 : 0.45,
                            cursor: activa ? 'pointer' : 'not-allowed',
                          }}
                        >
                          Editar
                        </button>

                        {/* Convocar exige capacitacion activa Y que valide
                            contra la base de empleados: la misma regla que
                            en el detalle, para que el boton no prometa aqui
                            lo que alli esta bloqueado. */}
                        {activa && c.validar_empleados ? (
                          <Link
                            href={`/panel/capacitaciones/${c.id}/convocatoria`}
                            style={{ ...est.btnMini, textDecoration: 'none', display: 'inline-block' }}
                          >
                            Convocar
                          </Link>
                        ) : (
                          <span
                            title={!activa
                              ? 'Actívala para poder convocar'
                              : 'Marca «validar contra la base de empleados» para poder convocar'}
                            style={{ ...est.btnMini, opacity: 0.45, cursor: 'not-allowed' }}
                          >
                            Convocar
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filtradas.length === 0 && (
          <p style={{ textAlign: 'center', color: 'var(--texto-suave)', padding: '30px 0', fontSize: 13 }}>
            {capacitaciones.length === 0
              ? 'Aún no hay capacitaciones. Crea la primera.'
              : 'Ninguna capacitación coincide con los filtros.'}
          </p>
        )}
      </section>

      {/* ---------- Modal ---------- */}
      {abierto && (
        <div style={est.overlay} onClick={(e) => { if (e.target === e.currentTarget) setAbierto(false); }}>
          <div style={est.modal}>
            <h2 style={{ fontSize: 17, color: 'var(--texto)', marginTop: 0 }}>
              {editandoId ? 'Editar capacitación' : 'Nueva capacitación'}
            </h2>

            {/* Dos caminos al crear: desde cero o desde el banco */}
            {!editandoId && plantillas.length > 0 && (
              <div style={est.pestanas}>
                <button
                  onClick={() => setModoPlantilla(false)}
                  style={{ ...est.pestana, ...(modoPlantilla ? {} : est.pestanaActiva) }}
                >
                  Desde cero
                </button>
                <button
                  onClick={() => setModoPlantilla(true)}
                  style={{ ...est.pestana, ...(modoPlantilla ? est.pestanaActiva : {}) }}
                >
                  Desde plantilla ({plantillas.length})
                </button>
              </div>
            )}

            {modoPlantilla && !editandoId ? (
              <>
                <label style={est.label}>Plantilla</label>
                <select
                  value={plantillaId}
                  onChange={(e) => setPlantillaId(e.target.value)}
                  style={est.input}
                >
                  <option value="">Elige una…</option>
                  {plantillas.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre}{p.veces_usada > 0 ? ` · usada ${p.veces_usada}×` : ''}
                    </option>
                  ))}
                </select>

                {plantillaElegida && (
                  <div style={est.previa}>
                    <div style={est.previaFila}>
                      <span style={est.previaClave}>Tema</span>
                      <span>{plantillaElegida.tema}</span>
                    </div>
                    {plantillaElegida.instructor && (
                      <div style={est.previaFila}>
                        <span style={est.previaClave}>Instructor</span>
                        <span>{plantillaElegida.instructor}</span>
                      </div>
                    )}
                    {plantillaElegida.duracion_horas && (
                      <div style={est.previaFila}>
                        <span style={est.previaClave}>Duración</span>
                        <span>{plantillaElegida.duracion_horas} h</span>
                      </div>
                    )}
                    <div style={est.previaFila}>
                      <span style={est.previaClave}>Evaluación</span>
                      <span style={{ color: plantillaElegida.evaluacion_nombre ? 'var(--bien)' : 'var(--texto-tenue)' }}>
                        {plantillaElegida.evaluacion_nombre ?? 'No incluida'}
                      </span>
                    </div>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={est.label}>Inicio *</label>
                    <input type="datetime-local" value={fechasPlantilla.fecha_inicio}
                      onChange={(e) => setFechasPlantilla({ ...fechasPlantilla, fecha_inicio: e.target.value })}
                      style={est.input} />
                  </div>
                  <div>
                    <label style={est.label}>Fin *</label>
                    <input type="datetime-local" value={fechasPlantilla.fecha_fin}
                      onChange={(e) => setFechasPlantilla({ ...fechasPlantilla, fecha_fin: e.target.value })}
                      style={est.input} />
                  </div>
                </div>

                <p style={{ fontSize: 11.5, color: 'var(--texto-suave)', margin: '8px 0 0' }}>
                  Se copian tema, descripción, instructor y ajustes. Solo cambian
                  las fechas y la empresa, que será la activa.
                </p>

                {aviso?.tipo === 'error' && (
                  <div style={{ ...est.aviso, background: 'var(--mal-fondo)', color: 'var(--mal)' }}>{aviso.texto}</div>
                )}

                <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
                  <button onClick={crearConPlantilla} disabled={pendiente}
                    style={{ ...est.btnPrimario, flex: 1 }}>
                    {pendiente ? 'Creando…' : 'Crear capacitación'}
                  </button>
                  <button onClick={() => setAbierto(false)} style={{ ...est.btnSec, flex: 1 }}>
                    Cancelar
                  </button>
                </div>
              </>
            ) : (
            <>

            <label style={est.label}>Tema *</label>
            <input value={form.tema} onChange={(e) => setForm({ ...form, tema: e.target.value })} style={est.input} />

            <label style={est.label}>Instructor *</label>
            <input value={form.instructor} onChange={(e) => setForm({ ...form, instructor: e.target.value })} style={est.input} />

            <label style={est.label}>Empresa capacitada *</label>
            <label style={est.casilla}>
              <input
                type="checkbox"
                checked={form.esEmpresaPropia}
                onChange={(e) => setForm({ ...form, esEmpresaPropia: e.target.checked })}
                style={{ marginRight: 8 }}
              />
              Es mi propia empresa ({nombreOrganizacion})
            </label>
            {!form.esEmpresaPropia && (
              <input
                value={form.empresa}
                onChange={(e) => setForm({ ...form, empresa: e.target.value })}
                placeholder="Nombre de la empresa cliente"
                style={{ ...est.input, textTransform: 'uppercase', marginTop: 6 }}
              />
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={est.label}>Inicio *</label>
                <input type="datetime-local" value={form.fecha_inicio}
                  onChange={(e) => setForm({ ...form, fecha_inicio: e.target.value })} style={est.input} />
              </div>
              <div>
                <label style={est.label}>Fin *</label>
                <input type="datetime-local" value={form.fecha_fin}
                  onChange={(e) => setForm({ ...form, fecha_fin: e.target.value })} style={est.input} />
              </div>
            </div>

            <label style={est.label}>Participantes esperados</label>
            <input type="number" min="1" value={form.esperados} placeholder="Opcional"
              onChange={(e) => setForm({ ...form, esperados: e.target.value })} style={est.input} />
            <p style={{ fontSize: 11, color: 'var(--texto-suave)', margin: '4px 0 0' }}>
              Si se deja vacío, la participación se calcula como 100%.
            </p>

            <label style={est.label}>Evaluación</label>
            <label style={est.casilla}>
              <input
                type="checkbox"
                checked={form.esEvaluada}
                onChange={(e) => setForm({ ...form, esEvaluada: e.target.checked })}
                style={{ marginRight: 8 }}
              />
              Esta capacitación será evaluada
            </label>
            {form.esEvaluada && (
              <p style={{ fontSize: 11, color: '#a16207', background: 'var(--ambar-fondo)',
                          padding: '8px 10px', borderRadius: 6, margin: '4px 0 0' }}>
                Tras guardar, abre la capacitación y usa «Editar evaluación»
                para formular las preguntas.
              </p>
            )}

            <label style={est.label}>Control de asistentes</label>
            <label style={est.casilla}>
              <input
                type="checkbox"
                checked={form.validarEmpleados}
                onChange={(e) => setForm({ ...form, validarEmpleados: e.target.checked })}
                style={{ marginRight: 8 }}
              />
              Validar contra la base de empleados
            </label>
            <p style={{ fontSize: 11, color: 'var(--texto-tenue)', margin: '2px 0 0' }}>
              {form.validarEmpleados
                ? 'Solo podrán registrarse personas cargadas en Configuración → Empleados.'
                : 'Se aceptan registros libres: cualquier identificación es válida.'}
            </p>

            <label style={est.casilla}>
              <input
                type="checkbox"
                checked={form.incluirFirmaProfesional}
                disabled={!tieneFirmaPropia}
                onChange={(e) => setForm({ ...form, incluirFirmaProfesional: e.target.checked })}
                style={{ marginRight: 8 }}
              />
              Anexar mi firma como responsable técnico
            </label>
            <p style={{ fontSize: 11, color: 'var(--texto-tenue)', margin: '2px 0 0' }}>
              {!tieneFirmaPropia
                ? <>Aún no tienes firma registrada.{' '}
                    <Link href="/panel/perfil" style={{ color: 'var(--texto)', fontWeight: 600 }}>
                      Regístrala en Mi perfil
                    </Link>{' '}para poder anexarla.</>
                : form.incluirFirmaProfesional
                ? 'El acta llevará tu nombre, profesión y firma junto a la del instructor.'
                : 'El acta solo llevará la firma de quien dicta la capacitación.'}
            </p>

            <label style={est.label}>Descripción</label>
            <textarea value={form.descripcion} rows={3}
              onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
              style={{ ...est.input, resize: 'vertical' }} />

            {aviso?.tipo === 'error' && (
              <div style={{ ...est.aviso, background: 'var(--mal-fondo)', color: 'var(--mal)' }}>{aviso.texto}</div>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
              <button onClick={guardar} disabled={pendiente} style={{ ...est.btnPrimario, flex: 1 }}>
                {pendiente ? 'Guardando…' : 'Guardar'}
              </button>
              <button onClick={() => setAbierto(false)} style={{ ...est.btnSec, flex: 1 }}>Cancelar</button>
            </div>

            {/* ---------- Eliminar ---------- */}
            {/* Solo desde aqui, y solo si no queda rastro de que la
                capacitacion se haya ejecutado. El servidor vuelve a
                comprobarlo: esto es comodidad, no la garantia. */}
            {(() => {
              const c = capacitaciones.find((x) => x.id === editandoId);
              if (!c) return null;

              const bloqueo =
                c.registrados > 0
                  ? `Tiene ${c.registrados} registro(s) de asistencia. Un acta con ` +
                    'asistentes es evidencia del SG-SST y no se borra.'
                  : c.instructor_firmo
                  ? 'El instructor ya firmó: la capacitación se ejecutó aunque no se ' +
                    'registrara ningún asistente.'
                  : null;

              return (
                <div style={est.zonaBorrado}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <strong style={{ fontSize: 12.5 }}>Eliminar capacitación</strong>
                    <p style={est.notaBorrado}>
                      {bloqueo ?? 'No tiene asistentes ni firmas, así que puede borrarse sin perder evidencia. No se puede deshacer.'}
                    </p>
                  </div>

                  {bloqueo ? (
                    <span style={{ ...est.btnBorrar, opacity: 0.45, cursor: 'not-allowed' }}>
                      Eliminar
                    </span>
                  ) : confirmandoBorrado ? (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={borrar}
                        disabled={pendiente}
                        style={{ ...est.btnBorrar, background: 'var(--mal)', color: 'var(--superficie)', borderColor: 'var(--mal)' }}
                      >
                        {pendiente ? 'Eliminando…' : 'Sí, eliminar'}
                      </button>
                      <button
                        onClick={() => setConfirmandoBorrado(false)}
                        style={est.btnBorrar}
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmandoBorrado(true)}
                      disabled={pendiente}
                      style={est.btnBorrar}
                    >
                      Eliminar
                    </button>
                  )}
                </div>
              );
            })()}
            </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

const est: Record<string, React.CSSProperties> = {
  tarjeta: { background: 'var(--superficie)', borderRadius: 14, padding: 20, boxShadow: '0 6px 18px rgba(0,0,0,.05)' },
  filtros: { display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 14, paddingBottom: 14, borderBottom: '1px solid var(--borde)' },
  label: { display: 'block', fontSize: 12, fontWeight: 600, margin: '10px 0 4px' },
  input: { width: '100%', padding: '9px 10px', border: '1px solid var(--borde-fuerte)', borderRadius: 8, fontSize: 13, boxSizing: 'border-box', fontFamily: 'inherit' },
  th: { background: 'var(--superficie-3)', color: 'var(--texto-suave)', fontSize: 11, textTransform: 'uppercase', padding: '9px 8px', textAlign: 'left', borderBottom: '1px solid var(--borde)' },
  td: { padding: '10px 8px', borderBottom: '1px solid var(--borde)', verticalAlign: 'middle' },
  filaProxima: {
    background: 'var(--ambar-fondo)',
    boxShadow: 'inset 3px 0 0 var(--ambar)',
  },
  pillProxima: {
    marginLeft: 8, padding: '2px 8px', borderRadius: 8,
    background: 'var(--ambar)', color: '#4A3A00',
    fontSize: 10.5, fontWeight: 700, letterSpacing: .3,
    textTransform: 'uppercase', whiteSpace: 'nowrap',
  },
  pill: { padding: '3px 9px', borderRadius: 999, fontSize: 11, fontWeight: 600, display: 'inline-block' },
  btnPrimario: { background: 'var(--marca)', color: 'var(--sobre-empresa)', border: 'none', padding: '10px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  btnExcel: { background: 'var(--bien)', color: 'var(--superficie)', border: 'none', padding: '10px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', textDecoration: 'none', display: 'inline-block' },
  btnSec: { background: 'var(--superficie-3)', color: 'var(--texto)', border: '1px solid var(--borde-fuerte)', padding: '9px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  zonaBorrado: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    gap: 12, flexWrap: 'wrap', marginTop: 20, paddingTop: 16,
    borderTop: '1px solid #F1F1EC',
  },
  notaBorrado: {
    fontSize: 11.5, color: 'var(--texto-tenue)', margin: '3px 0 0',
    lineHeight: 1.5, maxWidth: 380,
  },
  btnBorrar: {
    background: 'var(--superficie)', color: 'var(--mal)',
    borderWidth: 1, borderStyle: 'solid', borderColor: 'var(--mal)',
    padding: '8px 14px', borderRadius: 6, fontSize: 12.5,
    fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
    whiteSpace: 'nowrap', display: 'inline-block',
  },
  btnMini: { background: 'var(--superficie-3)', borderWidth: 1, borderStyle: 'solid', borderColor: 'var(--borde)', color: 'var(--texto)', padding: '5px 10px', borderRadius: 6, fontSize: 11.5, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' },
  btnVerde: { background: 'var(--bien-fondo)', borderColor: 'var(--bien-fondo)', color: 'var(--bien)' },
  aviso: { padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16 },
  pestanas: { display: 'flex', gap: 4, borderBottom: '1px solid var(--borde)', marginBottom: 6 },
  pestana: {
    background: 'none', border: 'none', padding: '8px 14px', fontSize: 12.5,
    cursor: 'pointer', fontFamily: 'inherit', color: 'var(--texto-tenue)',
    borderBottomWidth: 2, borderBottomStyle: 'solid', borderBottomColor: 'transparent',
    marginBottom: -1,
  },
  pestanaActiva: { color: 'var(--texto)', fontWeight: 700, borderBottomColor: 'var(--marca)' },
  previa: {
    background: 'var(--superficie-3)', borderRadius: 6, padding: 12, margin: '10px 0 4px', fontSize: 12,
  },
  previaFila: { display: 'flex', justifyContent: 'space-between', gap: 10, padding: '3px 0' },
  previaClave: { color: 'var(--texto-tenue)' },
  casilla: { display: 'flex', alignItems: 'center', fontSize: 13, fontWeight: 400, color: 'var(--texto-suave)', cursor: 'pointer', padding: '6px 0' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 16px', overflowY: 'auto', zIndex: 100 },
  modal: { background: 'var(--superficie)', borderRadius: 14, padding: 24, width: '100%', maxWidth: 520 },
};
