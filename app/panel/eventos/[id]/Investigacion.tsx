'use client';

/**
 * INVESTIGACIÓN DE UN EVENTO
 * ---------------------------------------------------------------
 * Sigue el orden de la Resolución 1401: primero el hecho, luego quién
 * investiga, luego las causas, y solo al final el cierre.
 *
 * La distinción entre causas INMEDIATAS y BÁSICAS no es burocrática:
 * las inmediatas son lo que se vio (piso mojado), las básicas son por
 * qué se pudo dar (no hay procedimiento de limpieza por turnos). Actuar
 * sobre una causa inmediata seca el piso una vez; actuar sobre la
 * básica evita el siguiente accidente. Por eso las acciones se generan
 * SOLO desde las básicas.
 */
import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import LienzoFirma, { type LienzoFirmaRef } from '@/app/LienzoFirma';
import { crearClienteNavegador } from '@/lib/supabase/cliente';
import {
  guardarInvestigacion, guardarEquipo, guardarTestigos,
  cerrarInvestigacion, generarAccionesEvento, actualizarEvento,
  type Causa, type Metodologia, type RolEquipo, type DetalleEvento,
} from '@/lib/acciones-eventos';

const METODOLOGIAS: { v: Metodologia; t: string }[] = [
  { v: '5_porques', t: 'Cinco porqués' },
  { v: 'arbol_causas', t: 'Árbol de causas' },
  { v: 'espina_pescado', t: 'Espina de pescado' },
];

const ROLES: { v: RolEquipo; t: string }[] = [
  { v: 'responsable_sst', t: 'Responsable del SG-SST' },
  { v: 'copasst', t: 'Representante del COPASST' },
  { v: 'jefe_inmediato', t: 'Jefe inmediato' },
  { v: 'otro', t: 'Otro' },
];

const CLASES_INMEDIATA = ['acto', 'condicion'];
const CLASES_BASICA = ['personal', 'trabajo'];
const NOMBRE_CLASE: Record<string, string> = {
  acto: 'Acto subestándar',
  condicion: 'Condición subestándar',
  personal: 'Factor personal',
  trabajo: 'Factor del trabajo',
  otro: 'Otro',
};

type Miembro = { nombre: string; cargo: string; rol: RolEquipo; firma_url: string | null };
type Testigo = { nombre: string; identificacion: string; version: string };

export default function Investigacion({
  detalle,
  orgId,
  color,
}: {
  detalle: DetalleEvento;
  orgId: string;
  color: string;
}) {
  const router = useRouter();
  const supabase = crearClienteNavegador();
  const [pendiente, startTransition] = useTransition();
  const firmaRef = useRef<LienzoFirmaRef>(null);

  const ev = (detalle.evento ?? {}) as Record<string, unknown>;
  const inv = (detalle.investigacion ?? {}) as Record<string, unknown>;
  const eventoId = String(ev.id);
  const cerrada = Boolean(inv.fecha_cierre);

  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  const [metodologia, setMetodologia] = useState<Metodologia>(
    (inv.metodologia as Metodologia) ?? '5_porques'
  );
  const [inmediatas, setInmediatas] = useState<Causa[]>(
    ((inv.causas_inmediatas as Causa[]) ?? []).length
      ? (inv.causas_inmediatas as Causa[])
      : [{ descripcion: '', clase: 'condicion' }]
  );
  const [basicas, setBasicas] = useState<Causa[]>(
    ((inv.causas_basicas as Causa[]) ?? []).length
      ? (inv.causas_basicas as Causa[])
      : [{ descripcion: '', clase: 'trabajo' }]
  );
  const [conclusiones, setConclusiones] = useState(String(inv.conclusiones ?? ''));

  const [equipo, setEquipo] = useState<Miembro[]>(
    (detalle.equipo ?? []).length
      ? (detalle.equipo ?? []).map((m) => ({
          nombre: m.nombre, cargo: m.cargo ?? '', rol: m.rol, firma_url: m.firma_url,
        }))
      : [{ nombre: '', cargo: '', rol: 'responsable_sst', firma_url: null }]
  );
  const [firmando, setFirmando] = useState<number | null>(null);

  const [testigos, setTestigos] = useState<Testigo[]>(
    (detalle.testigos ?? []).map((t) => ({
      nombre: t.nombre, identificacion: t.identificacion ?? '', version: t.version ?? '',
    }))
  );

  const [dias, setDias] = useState(String(ev.dias_incapacidad ?? 0));
  const [arl, setArl] = useState(Boolean(ev.reportado_arl));
  const [furat, setFurat] = useState(String(ev.numero_furat ?? ''));

  const [responsableAcciones, setResponsableAcciones] = useState('');

  function ok(texto: string) { setAviso({ tipo: 'ok', texto }); }
  function mal(texto: string) { setAviso({ tipo: 'error', texto }); }

  /* ---------- Firma de un miembro del equipo ---------- */
  async function subirFirma(i: number) {
    if (!firmaRef.current?.tieneFirma()) {
      mal('Dibuja la firma antes de guardarla.');
      return;
    }
    const blob = await firmaRef.current.obtenerBlob();
    if (!blob) { mal('No se pudo leer la firma.'); return; }

    // Toda ruta de Storage empieza por org_id: lo exige la política de lectura.
    const ruta = `${orgId}/eventos/firma-${eventoId}-${i}-${Date.now()}.png`;
    const { error } = await supabase.storage
      .from('firmas')
      .upload(ruta, blob, { contentType: 'image/png', upsert: true });

    if (error) { mal('No se pudo subir la firma: ' + error.message); return; }

    setEquipo((p) => p.map((m, j) => (j === i ? { ...m, firma_url: ruta } : m)));
    setFirmando(null);
    firmaRef.current.limpiar();
    ok('Firma capturada. Guarda el equipo para conservarla.');
  }

  /* ---------- Acciones ---------- */
  const accion = (fn: () => Promise<{ ok: boolean; mensaje: string }>) => {
    setAviso(null);
    startTransition(async () => {
      const r = await fn();
      setAviso({ tipo: r.ok ? 'ok' : 'error', texto: r.mensaje });
      if (r.ok) router.refresh();
    });
  };

  return (
    <>
      {/* ================= DATOS QUE SE CONOCEN DESPUÉS ================= */}
      <section style={s.bloque}>
        <h2 style={s.h2}>Consecuencias y reporte legal</h2>
        <p style={s.nota}>
          Los días de incapacidad alimentan la <strong>severidad de accidentalidad</strong>,
          uno de los indicadores obligatorios del artículo 30.
        </p>

        <div style={s.fila}>
          <div style={{ flex: '1 1 140px' }}>
            <label style={s.label}>Días de incapacidad</label>
            <input
              value={dias}
              onChange={(e) => /^\d*$/.test(e.target.value) && setDias(e.target.value)}
              style={s.input}
              inputMode="numeric"
              disabled={cerrada}
            />
          </div>
          <div style={{ flex: '1 1 160px' }}>
            <label style={s.label}>N.º de FURAT</label>
            <input
              value={furat}
              onChange={(e) => setFurat(e.target.value)}
              style={s.input}
              placeholder="Radicado del reporte"
              disabled={cerrada}
            />
          </div>
          <div style={{ flex: '1 1 180px', display: 'flex', alignItems: 'flex-end', paddingBottom: 2 }}>
            <label style={s.check}>
              <input
                type="checkbox"
                checked={arl}
                onChange={(e) => setArl(e.target.checked)}
                style={s.casilla}
                disabled={cerrada}
              />
              Reportado a la ARL
            </label>
          </div>
        </div>

        {!cerrada && (
          <div style={s.acciones}>
            <button
              onClick={() => accion(() => actualizarEvento(eventoId, {
                diasIncapacidad: Number(dias) || 0,
                reportadoArl: arl,
                fechaReporteArl: arl && !ev.fecha_reporte_arl ? new Date().toISOString() : null,
                numeroFurat: furat,
              }))}
              disabled={pendiente}
              style={{ ...s.botonSec, borderColor: color, color }}
            >
              Guardar
            </button>
          </div>
        )}
      </section>

      {/* ================= EQUIPO INVESTIGADOR ================= */}
      <section style={s.bloque}>
        <h2 style={s.h2}>Equipo investigador</h2>
        <p style={s.nota}>
          La Resolución 1401 exige que participen el <strong>responsable del SG-SST</strong> y
          un <strong>representante del COPASST</strong>. Sin la firma del responsable no se
          puede cerrar la investigación.
        </p>

        {equipo.map((m, i) => (
          <div key={i} style={s.miembro}>
            <div style={s.fila}>
              <div style={{ flex: '2 1 180px' }}>
                <label style={s.label}>Nombre</label>
                <input
                  value={m.nombre}
                  onChange={(e) => setEquipo((p) => p.map((x, j) => j === i ? { ...x, nombre: e.target.value } : x))}
                  style={s.input}
                  disabled={cerrada}
                />
              </div>
              <div style={{ flex: '1 1 130px' }}>
                <label style={s.label}>Cargo</label>
                <input
                  value={m.cargo}
                  onChange={(e) => setEquipo((p) => p.map((x, j) => j === i ? { ...x, cargo: e.target.value } : x))}
                  style={s.input}
                  disabled={cerrada}
                />
              </div>
              <div style={{ flex: '1 1 170px' }}>
                <label style={s.label}>Rol</label>
                <select
                  value={m.rol}
                  onChange={(e) => setEquipo((p) => p.map((x, j) => j === i ? { ...x, rol: e.target.value as RolEquipo } : x))}
                  style={s.input}
                  disabled={cerrada}
                >
                  {ROLES.map((r) => <option key={r.v} value={r.v}>{r.t}</option>)}
                </select>
              </div>
            </div>

            <div style={s.filaFirma}>
              <span style={{ ...s.estadoFirma, color: m.firma_url ? '#1E6B3A' : '#9A3412' }}>
                {m.firma_url ? '✓ Firmado' : 'Sin firma'}
              </span>
              {!cerrada && (
                <>
                  <button
                    onClick={() => setFirmando(firmando === i ? null : i)}
                    style={s.botonPlano}
                    type="button"
                  >
                    {firmando === i ? 'Cancelar' : m.firma_url ? 'Volver a firmar' : 'Firmar'}
                  </button>
                  {equipo.length > 1 && (
                    <button
                      onClick={() => setEquipo((p) => p.filter((_, j) => j !== i))}
                      style={{ ...s.botonPlano, color: '#9B1C1C' }}
                      type="button"
                    >
                      Quitar
                    </button>
                  )}
                </>
              )}
            </div>

            {firmando === i && (
              <div style={s.zonaFirma}>
                <LienzoFirma ref={firmaRef} color={color} />
                <button onClick={() => subirFirma(i)} style={{ ...s.botonLleno, background: color }} type="button">
                  Guardar firma
                </button>
              </div>
            )}
          </div>
        ))}

        {!cerrada && (
          <div style={s.acciones}>
            <button
              onClick={() => setEquipo((p) => [...p, { nombre: '', cargo: '', rol: 'copasst', firma_url: null }])}
              style={s.botonPlano}
              type="button"
            >
              + Agregar integrante
            </button>
            <button
              onClick={() => accion(() => guardarEquipo(eventoId, equipo))}
              disabled={pendiente}
              style={{ ...s.botonSec, borderColor: color, color }}
            >
              Guardar equipo
            </button>
          </div>
        )}
      </section>

      {/* ================= TESTIGOS ================= */}
      <section style={s.bloque}>
        <h2 style={s.h2}>Testigos</h2>
        {testigos.length === 0 && <p style={s.nota}>No se registraron testigos.</p>}

        {testigos.map((t, i) => (
          <div key={i} style={s.miembro}>
            <div style={s.fila}>
              <div style={{ flex: '2 1 180px' }}>
                <label style={s.label}>Nombre</label>
                <input
                  value={t.nombre}
                  onChange={(e) => setTestigos((p) => p.map((x, j) => j === i ? { ...x, nombre: e.target.value } : x))}
                  style={s.input}
                  disabled={cerrada}
                />
              </div>
              <div style={{ flex: '1 1 130px' }}>
                <label style={s.label}>Identificación</label>
                <input
                  value={t.identificacion}
                  onChange={(e) => setTestigos((p) => p.map((x, j) => j === i ? { ...x, identificacion: e.target.value } : x))}
                  style={s.input}
                  disabled={cerrada}
                />
              </div>
            </div>
            <label style={s.label}>Versión del testigo</label>
            <textarea
              value={t.version}
              onChange={(e) => setTestigos((p) => p.map((x, j) => j === i ? { ...x, version: e.target.value } : x))}
              rows={2}
              style={{ ...s.input, resize: 'vertical' }}
              disabled={cerrada}
            />
            {!cerrada && (
              <button
                onClick={() => setTestigos((p) => p.filter((_, j) => j !== i))}
                style={{ ...s.botonPlano, color: '#9B1C1C', marginTop: 6 }}
                type="button"
              >
                Quitar
              </button>
            )}
          </div>
        ))}

        {!cerrada && (
          <div style={s.acciones}>
            <button
              onClick={() => setTestigos((p) => [...p, { nombre: '', identificacion: '', version: '' }])}
              style={s.botonPlano}
              type="button"
            >
              + Agregar testigo
            </button>
            <button
              onClick={() => accion(() => guardarTestigos(eventoId, testigos))}
              disabled={pendiente}
              style={{ ...s.botonSec, borderColor: color, color }}
            >
              Guardar testigos
            </button>
          </div>
        )}
      </section>

      {/* ================= CAUSAS ================= */}
      <section style={s.bloque}>
        <h2 style={s.h2}>Análisis de causas</h2>

        <label style={s.label}>Metodología</label>
        <select
          value={metodologia}
          onChange={(e) => setMetodologia(e.target.value as Metodologia)}
          style={{ ...s.input, maxWidth: 260 }}
          disabled={cerrada}
        >
          {METODOLOGIAS.map((m) => <option key={m.v} value={m.v}>{m.t}</option>)}
        </select>

        <ListaCausas
          titulo="Causas inmediatas"
          explicacion="Lo que se vio: actos y condiciones subestándar presentes en el momento."
          causas={inmediatas}
          clases={CLASES_INMEDIATA}
          onChange={setInmediatas}
          bloqueado={cerrada}
        />

        <ListaCausas
          titulo="Causas básicas"
          explicacion="Por qué se pudo dar. De aquí —y solo de aquí— salen las acciones correctivas: actuar sobre la causa inmediata resuelve este caso, actuar sobre la básica evita el siguiente."
          causas={basicas}
          clases={CLASES_BASICA}
          onChange={setBasicas}
          bloqueado={cerrada}
          destacado
        />

        <label style={s.label}>Conclusiones</label>
        <textarea
          value={conclusiones}
          onChange={(e) => setConclusiones(e.target.value)}
          rows={3}
          style={{ ...s.input, resize: 'vertical' }}
          disabled={cerrada}
        />

        {!cerrada && (
          <div style={s.acciones}>
            <button
              onClick={() => accion(() => guardarInvestigacion(eventoId, {
                metodologia, causasInmediatas: inmediatas, causasBasicas: basicas, conclusiones,
              }))}
              disabled={pendiente}
              style={{ ...s.botonSec, borderColor: color, color }}
            >
              Guardar análisis
            </button>
          </div>
        )}
      </section>

      {/* ================= PLAN DE ACCIÓN ================= */}
      <section style={s.bloque}>
        <h2 style={s.h2}>Acciones correctivas</h2>
        <p style={s.nota}>
          Se crea una acción por cada causa básica, en el mismo plan de acción del
          resto del sistema. No se duplican si ya se generaron antes.
        </p>

        {(detalle.acciones ?? []).length > 0 && (
          <ul style={s.listaAcciones}>
            {(detalle.acciones ?? []).map((a) => (
              <li key={a.id} style={s.itemAccion}>
                <span style={s.codigoAccion}>{a.codigo}</span> {a.accion}
                <div style={s.metaAccion}>
                  {a.responsable} · vence {a.fecha_limite} · {a.estado}
                </div>
              </li>
            ))}
          </ul>
        )}

        <div style={s.fila}>
          <div style={{ flex: '1 1 200px' }}>
            <label style={s.label}>Responsable de las acciones</label>
            <input
              value={responsableAcciones}
              onChange={(e) => setResponsableAcciones(e.target.value)}
              style={s.input}
              placeholder="Nombre de quien responde"
            />
          </div>
        </div>

        <div style={s.acciones}>
          <button
            onClick={() => accion(() => generarAccionesEvento(eventoId, responsableAcciones))}
            disabled={pendiente}
            style={{ ...s.botonSec, borderColor: color, color }}
          >
            Generar acciones desde las causas básicas
          </button>
        </div>
      </section>

      {aviso && (
        <div style={{
          ...s.aviso,
          background: aviso.tipo === 'ok' ? '#E6F4EA' : '#FDF2F2',
          color: aviso.tipo === 'ok' ? '#1E6B3A' : '#9B1C1C',
        }}>
          {aviso.texto}
        </div>
      )}

      {/* ================= CIERRE ================= */}
      {!cerrada && (
        <section style={{ ...s.bloque, borderColor: color }}>
          <h2 style={s.h2}>Cerrar la investigación</h2>
          <p style={s.nota}>
            Al cerrar, el control documental queda congelado y el informe deja de
            poder cambiar. Se exige al menos una causa básica y la firma del
            responsable del SG-SST.
          </p>
          <div style={s.acciones}>
            <button
              onClick={() => accion(() => cerrarInvestigacion(eventoId, conclusiones))}
              disabled={pendiente}
              style={{ ...s.botonLleno, background: pendiente ? '#cbd5e1' : color }}
            >
              {pendiente ? 'Cerrando…' : 'Cerrar investigación'}
            </button>
          </div>
        </section>
      )}
    </>
  );
}

function ListaCausas({
  titulo, explicacion, causas, clases, onChange, bloqueado, destacado = false,
}: {
  titulo: string;
  explicacion: string;
  causas: Causa[];
  clases: string[];
  onChange: (c: Causa[]) => void;
  bloqueado: boolean;
  destacado?: boolean;
}) {
  return (
    <div style={{ ...s.causas, ...(destacado ? s.causasDestacadas : {}) }}>
      <div style={s.causasTitulo}>{titulo}</div>
      <p style={s.nota}>{explicacion}</p>

      {causas.map((c, i) => (
        <div key={i} style={s.filaCausa}>
          <select
            value={c.clase}
            onChange={(e) => onChange(causas.map((x, j) => j === i ? { ...x, clase: e.target.value } : x))}
            style={{ ...s.input, flex: '0 0 190px' }}
            disabled={bloqueado}
          >
            {clases.map((k) => <option key={k} value={k}>{NOMBRE_CLASE[k] ?? k}</option>)}
          </select>
          <input
            value={c.descripcion}
            onChange={(e) => onChange(causas.map((x, j) => j === i ? { ...x, descripcion: e.target.value } : x))}
            style={{ ...s.input, flex: '1 1 200px' }}
            placeholder="Describe la causa"
            disabled={bloqueado}
          />
          {!bloqueado && causas.length > 1 && (
            <button
              onClick={() => onChange(causas.filter((_, j) => j !== i))}
              style={{ ...s.botonPlano, color: '#9B1C1C', flex: '0 0 auto' }}
              type="button"
            >
              ×
            </button>
          )}
        </div>
      ))}

      {!bloqueado && (
        <button
          onClick={() => onChange([...causas, { descripcion: '', clase: clases[0] }])}
          style={s.botonPlano}
          type="button"
        >
          + Agregar causa
        </button>
      )}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  bloque: {
    background: '#fff', border: '1px solid #E4E4DF', borderRadius: 12,
    padding: '18px 20px', marginBottom: 14,
  },
  h2: { fontSize: 15, fontWeight: 700, color: '#14263F', margin: '0 0 8px' },
  nota: { fontSize: 12.5, color: '#5B6470', lineHeight: 1.6, margin: '0 0 12px' },
  label: { display: 'block', fontSize: 12, fontWeight: 600, margin: '10px 0 5px', color: '#14263F' },
  input: {
    width: '100%', padding: '8px 11px', border: '1px solid #E4E4DF',
    borderRadius: 8, fontSize: 13, boxSizing: 'border-box',
    fontFamily: 'inherit', background: '#fff', color: '#14263F',
  },
  fila: { display: 'flex', gap: 10, flexWrap: 'wrap' },
  check: { display: 'flex', alignItems: 'center', fontSize: 13, cursor: 'pointer', color: '#14263F' },
  casilla: { marginRight: 8, width: 15, height: 15 },

  miembro: {
    border: '1px solid #F0F0EC', borderRadius: 9, padding: '10px 12px', marginBottom: 10,
  },
  filaFirma: { display: 'flex', alignItems: 'center', gap: 12, marginTop: 10, flexWrap: 'wrap' },
  estadoFirma: { fontSize: 12, fontWeight: 600 },
  zonaFirma: { marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-start' },

  causas: { marginTop: 16, paddingTop: 14, borderTop: '1px solid #F0F0EC' },
  causasDestacadas: {
    background: '#F7F7F4', border: '1px solid #E4E4DF', borderRadius: 9,
    padding: '12px 14px', marginTop: 16,
  },
  causasTitulo: { fontSize: 13, fontWeight: 700, color: '#14263F', marginBottom: 4 },
  filaCausa: { display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap', alignItems: 'center' },

  listaAcciones: { listStyle: 'none', padding: 0, margin: '0 0 14px' },
  itemAccion: {
    fontSize: 13, color: '#14263F', padding: '8px 0',
    borderBottom: '1px solid #F0F0EC', lineHeight: 1.5,
  },
  codigoAccion: { fontFamily: "'Consolas','Courier New',monospace", fontWeight: 600, marginRight: 6 },
  metaAccion: { fontSize: 11.5, color: '#8A929C', marginTop: 2 },

  acciones: { display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 14, flexWrap: 'wrap' },
  botonPlano: {
    background: 'none', border: 'none', color: '#5B6470',
    fontSize: 12.5, fontWeight: 600, cursor: 'pointer', padding: '6px 10px',
  },
  botonSec: {
    background: '#fff', borderWidth: 1, borderStyle: 'solid', borderRadius: 8,
    padding: '8px 16px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
  },
  botonLleno: {
    color: '#fff', border: 'none', padding: '10px 22px', borderRadius: 9,
    fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
  },
  aviso: { padding: '11px 14px', borderRadius: 9, fontSize: 13, marginBottom: 14, lineHeight: 1.55 },
};
