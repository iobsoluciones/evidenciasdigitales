'use client';

/**
 * EJECUCIÓN DE LA INSPECCIÓN
 * ---------------------------------------------------------------
 * Un criterio por pantalla, no una lista larga.
 *
 * Con 26 criterios, una lista completa hace que la gente marque
 * «cumple» en bloque sin mirar. Un criterio a la vez obliga a decidir,
 * que es todo el propósito de una inspección.
 *
 * El hallazgo y la foto solo aparecen al marcar «no cumple»: pedirlos
 * siempre alarga el trabajo sin aportar nada.
 */
import { useState, useRef, useTransition, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  responderCriterio, cerrarInspeccion, eliminarBorradorInspeccion,
  type DetalleInspeccion, type ResultadoCriterio,
} from '@/lib/acciones-ejecutar-inspeccion';
import { crearClienteNavegador } from '@/lib/supabase/cliente';
import LienzoFirma, { type LienzoFirmaRef } from '@/app/LienzoFirma';

const OPCIONES: Array<{ v: ResultadoCriterio; t: string; color: string }> = [
  { v: 'cumple', t: 'Cumple', color: '#15803D' },
  { v: 'no_cumple', t: 'No cumple', color: '#9B1C1C' },
  { v: 'no_aplica', t: 'No aplica', color: '#5B6470' },
];

export default function EjecutarInspeccion({
  detalle,
  orgId,
  color,
}: {
  detalle: DetalleInspeccion;
  orgId: string;
  color: string;
}) {
  const router = useRouter();
  const supabase = crearClienteNavegador();
  const [pendiente, startTransition] = useTransition();
  const firmaInspRef = useRef<LienzoFirmaRef>(null);
  const firmaAcompRef = useRef<LienzoFirmaRef>(null);
  const fotoRef = useRef<HTMLInputElement>(null);

  const insp = detalle.inspeccion!;
  const respuestas = detalle.respuestas ?? [];
  const resumen = detalle.resumen!;
  const cerrada = insp.estado !== 'borrador';

  // Arranca en el primer criterio sin responder
  const primerPendiente = respuestas.findIndex((r) => r.resultado === null);
  const [indice, setIndice] = useState(primerPendiente >= 0 ? primerPendiente : 0);
  const [vistaResumen, setVistaResumen] = useState(cerrada);
  const [cerrando, setCerrando] = useState(false);

  const [hallazgo, setHallazgo] = useState('');
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [observaciones, setObservaciones] = useState(insp.observaciones ?? '');
  const [subiendo, setSubiendo] = useState(false);
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  const actual = respuestas[indice];
  const respondidos = respuestas.filter((r) => r.resultado !== null).length;
  const progreso = respuestas.length > 0
    ? Math.round((respondidos / respuestas.length) * 100) : 0;

  const hallazgos = useMemo(
    () => respuestas.filter((r) => r.resultado === 'no_cumple'),
    [respuestas]
  );

  async function subirFoto(archivo: File) {
    setSubiendo(true);
    try {
      const bitmap = await createImageBitmap(archivo);
      const escala = Math.min(1, 800 / bitmap.width);
      const lienzo = document.createElement('canvas');
      lienzo.width = Math.round(bitmap.width * escala);
      lienzo.height = Math.round(bitmap.height * escala);
      lienzo.getContext('2d')?.drawImage(bitmap, 0, 0, lienzo.width, lienzo.height);

      const blob = await new Promise<Blob | null>((r) =>
        lienzo.toBlob(r, 'image/jpeg', 0.8));
      if (!blob) throw new Error();

      const ruta = `${orgId}/inspecciones/${insp.id}/${actual.id}-${Date.now()}.jpg`;
      const { error } = await supabase.storage
        .from('logos')
        .upload(ruta, blob, { contentType: 'image/jpeg', upsert: true });
      if (error) throw new Error();

      const { data } = supabase.storage.from('logos').getPublicUrl(ruta);
      setFotoUrl(data.publicUrl);
    } catch {
      setAviso({ tipo: 'error', texto: 'No se pudo procesar la imagen.' });
    } finally {
      setSubiendo(false);
      if (fotoRef.current) fotoRef.current.value = '';
    }
  }

  function responder(resultado: ResultadoCriterio) {
    // «No cumple» abre los campos de evidencia; los demás avanzan
    if (resultado === 'no_cumple' && actual.resultado !== 'no_cumple') {
      setHallazgo(actual.hallazgo ?? '');
      setFotoUrl(actual.foto_url ?? null);
    }

    startTransition(async () => {
      const r = await responderCriterio({
        respuestaId: actual.id,
        resultado,
        hallazgo: resultado === 'no_cumple' ? hallazgo : '',
        fotoUrl: resultado === 'no_cumple' ? fotoUrl : null,
      });

      if (!r.ok) { setAviso({ tipo: 'error', texto: r.mensaje }); return; }

      router.refresh();

      // Solo avanza si no hace falta documentar el hallazgo
      if (resultado !== 'no_cumple') avanzar();
    });
  }

  function guardarHallazgo() {
    startTransition(async () => {
      const r = await responderCriterio({
        respuestaId: actual.id,
        resultado: 'no_cumple',
        hallazgo,
        fotoUrl,
      });
      if (!r.ok) { setAviso({ tipo: 'error', texto: r.mensaje }); return; }
      router.refresh();
      avanzar();
    });
  }

  function avanzar() {
    setHallazgo('');
    setFotoUrl(null);
    setAviso(null);
    if (indice < respuestas.length - 1) setIndice(indice + 1);
    else setVistaResumen(true);
  }

  function irA(i: number) {
    setIndice(i);
    setHallazgo(respuestas[i].hallazgo ?? '');
    setFotoUrl(respuestas[i].foto_url ?? null);
    setVistaResumen(false);
  }

  async function cerrar() {
    let firmaInsp: string | null = null;
    let firmaAcomp: string | null = null;

    if (firmaInspRef.current?.tieneFirma()) {
      const blob = await firmaInspRef.current.obtenerBlob();
      if (blob) {
        const ruta = `${orgId}/inspecciones/${insp.id}/firma-inspector.png`;
        const { error } = await supabase.storage
          .from('firmas').upload(ruta, blob, { contentType: 'image/png', upsert: true });
        if (!error) firmaInsp = ruta;
      }
    }

    if (firmaAcompRef.current?.tieneFirma()) {
      const blob = await firmaAcompRef.current.obtenerBlob();
      if (blob) {
        const ruta = `${orgId}/inspecciones/${insp.id}/firma-acompanante.png`;
        const { error } = await supabase.storage
          .from('firmas').upload(ruta, blob, { contentType: 'image/png', upsert: true });
        if (!error) firmaAcomp = ruta;
      }
    }

    startTransition(async () => {
      const r = await cerrarInspeccion(insp.id, { observaciones, firmaInspector: firmaInsp, firmaAcompanante: firmaAcomp });
      setAviso({ tipo: r.ok ? 'ok' : 'error', texto: r.mensaje });
      if (r.ok) { setCerrando(false); router.refresh(); }
    });
  }

  function eliminar() {
    startTransition(async () => {
      const r = await eliminarBorradorInspeccion(insp.id);
      if (r.ok) router.push('/panel/inspecciones');
      else setAviso({ tipo: 'error', texto: r.mensaje });
    });
  }

  const ocupado = pendiente || subiendo;

  return (
    <>
      {/* ---------- Cabecera con progreso ---------- */}
      <div style={s.cabecera}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={s.codigo}>{insp.codigo}</div>
          <h1 style={s.titulo}>{insp.nombre}</h1>
          <p style={s.sub}>
            {insp.objeto_nombre && <><strong>{insp.objeto_nombre}</strong> · </>}
            {insp.inspector}
            {insp.norma && <> · {insp.norma}</>}
          </p>
        </div>

        {cerrada && insp.puntaje !== null && (
          <div style={{
            ...s.veredicto,
            background: insp.cumple ? '#DCFCE7' : '#FEE2E2',
            color: insp.cumple ? '#15803D' : '#9B1C1C',
          }}>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{insp.puntaje}%</div>
            <div style={{ fontSize: 11 }}>{insp.cumple ? 'CUMPLE' : 'NO CUMPLE'}</div>
          </div>
        )}
      </div>

      {!cerrada && (
        <div style={s.barra}>
          <div style={{ ...s.progreso, width: `${progreso}%`, background: color }} />
          <span style={s.textoProgreso}>
            {respondidos} de {respuestas.length}
          </span>
        </div>
      )}

      {aviso && (
        <div style={{
          ...s.aviso,
          background: aviso.tipo === 'ok' ? '#F0FDF4' : '#FDF2F2',
          color: aviso.tipo === 'ok' ? '#15803D' : '#9B1C1C',
        }}>
          {aviso.texto}
        </div>
      )}

      {/* ---------- Un criterio a la vez ---------- */}
      {!vistaResumen && actual && (
        <section style={s.card}>
          {actual.seccion && (
            <div style={{ ...s.seccion, color }}>{actual.seccion}</div>
          )}

          <div style={s.numeroCriterio}>
            Criterio {indice + 1} de {respuestas.length}
            {actual.critico && <span style={s.chipCritico}>Crítico</span>}
          </div>

          <p style={s.criterio}>{actual.criterio}</p>

          {actual.ayuda && (
            <p style={s.ayuda}>ⓘ {actual.ayuda}</p>
          )}

          <div style={s.opciones}>
            {OPCIONES.map((o) => (
              <button
                key={o.v}
                onClick={() => responder(o.v)}
                disabled={ocupado || cerrada}
                style={{
                  ...s.botonOpcion,
                  borderColor: actual.resultado === o.v ? o.color : '#DFDFD8',
                  background: actual.resultado === o.v ? o.color : '#fff',
                  color: actual.resultado === o.v ? '#fff' : o.color,
                }}
              >
                {o.t}
              </button>
            ))}
          </div>

          {/* Evidencia: solo al incumplir */}
          {actual.resultado === 'no_cumple' && !cerrada && (
            <div style={s.evidencia}>
              <label style={s.label}>Hallazgo</label>
              <textarea
                value={hallazgo}
                rows={2}
                onChange={(x) => setHallazgo(x.target.value)}
                placeholder="Qué se encontró exactamente"
                style={{ ...s.input, resize: 'vertical' }}
              />

              {fotoUrl && <img src={fotoUrl} alt="Evidencia" style={s.foto} />}

              <div style={s.filaEvidencia}>
                <label style={{ ...s.btnSec, cursor: subiendo ? 'not-allowed' : 'pointer' }}>
                  {subiendo ? 'Procesando…' : fotoUrl ? 'Cambiar foto' : 'Adjuntar foto'}
                  <input
                    ref={fotoRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    disabled={subiendo}
                    onChange={(x) => {
                      const a = x.target.files?.[0];
                      if (a) subirFoto(a);
                    }}
                    style={{ display: 'none' }}
                  />
                </label>

                <button
                  onClick={guardarHallazgo}
                  disabled={ocupado}
                  style={{ ...s.btn, background: ocupado ? '#C5C5BD' : color }}
                >
                  Guardar y continuar
                </button>
              </div>
            </div>
          )}

          <div style={s.navegacion}>
            <button
              onClick={() => irA(Math.max(0, indice - 1))}
              disabled={indice === 0}
              style={s.btnNav}
            >
              ‹ Anterior
            </button>
            <button onClick={() => setVistaResumen(true)} style={s.btnNav}>
              Ver resumen
            </button>
            <button
              onClick={() => irA(Math.min(respuestas.length - 1, indice + 1))}
              disabled={indice === respuestas.length - 1}
              style={s.btnNav}
            >
              Siguiente ›
            </button>
          </div>
        </section>
      )}

      {/* ---------- Resumen ---------- */}
      {vistaResumen && (
        <>
          <section style={s.card}>
            <h2 style={s.h2}>Resumen</h2>

            <div style={s.kpis}>
              <Kpi v={String(resumen.cumple)} l="Cumplen" color="#15803D" />
              <Kpi v={String(resumen.no_cumple)} l="Incumplen" color={resumen.no_cumple > 0 ? '#9B1C1C' : undefined} />
              <Kpi v={String(resumen.no_aplica)} l="No aplican" />
              <Kpi
                v={String(resumen.criticos_fallidos)}
                l="Críticos fallidos"
                color={resumen.criticos_fallidos > 0 ? '#9B1C1C' : undefined}
              />
            </div>

            {resumen.criticos_fallidos > 0 && (
              <div style={s.avisoCritico}>
                <strong>{resumen.criticos_fallidos} criterio(s) crítico(s) incumplido(s).</strong>{' '}
                La inspección no cumple sin importar el puntaje: hay cosas que
                no se compensan con otras.
              </div>
            )}

            {resumen.respondidos < resumen.total && (
              <p style={s.faltantes}>
                Faltan {resumen.total - resumen.respondidos} criterio(s) por responder.
              </p>
            )}
          </section>

          {/* Hallazgos */}
          {hallazgos.length > 0 && (
            <section style={s.card}>
              <h2 style={s.h2}>Hallazgos ({hallazgos.length})</h2>
              {hallazgos.map((h) => (
                <div key={h.id} style={s.hallazgo}>
                  <div style={{ flex: 1 }}>
                    <div style={s.criterioHallazgo}>
                      {h.critico && <span style={s.chipCriticoMini}>Crítico</span>}
                      {h.criterio}
                    </div>
                    {h.hallazgo && <p style={s.textoHallazgo}>{h.hallazgo}</p>}
                  </div>
                  {h.foto_url && <img src={h.foto_url} alt="" style={s.miniatura} />}
                  {!cerrada && (
                    <button onClick={() => irA(h.orden - 1)} style={s.btnMini}>Editar</button>
                  )}
                </div>
              ))}
            </section>
          )}

          {/* Todos los criterios */}
          <section style={s.card}>
            <h2 style={s.h2}>Todos los criterios</h2>
            <div style={s.listaCriterios}>
              {respuestas.map((r, i) => (
                <button
                  key={r.id}
                  onClick={() => !cerrada && irA(i)}
                  style={{
                    ...s.itemCriterio,
                    cursor: cerrada ? 'default' : 'pointer',
                    background:
                      r.resultado === 'cumple' ? '#F0FDF4'
                      : r.resultado === 'no_cumple' ? '#FDF2F2'
                      : r.resultado === 'no_aplica' ? '#FBFBF9'
                      : '#fff',
                  }}
                >
                  <span style={s.ordenItem}>{r.orden}</span>
                  <span style={{ flex: 1, textAlign: 'left' }}>
                    {r.criterio}
                    {r.critico && <span style={s.puntoCritico} title="Crítico" />}
                  </span>
                  <span style={{
                    ...s.resultadoItem,
                    color:
                      r.resultado === 'cumple' ? '#15803D'
                      : r.resultado === 'no_cumple' ? '#9B1C1C'
                      : r.resultado === 'no_aplica' ? '#8A929C'
                      : '#C5C5BD',
                  }}>
                    {r.resultado === 'cumple' ? '✓'
                     : r.resultado === 'no_cumple' ? '✗'
                     : r.resultado === 'no_aplica' ? '—'
                     : '·'}
                  </span>
                </button>
              ))}
            </div>
          </section>

          {/* Cierre */}
          {!cerrada ? (
            <section style={s.card}>
              <h2 style={s.h2}>Cerrar inspección</h2>

              {!cerrando ? (
                <>
                  <p style={s.nota}>
                    Al cerrar se calcula el puntaje sobre los criterios aplicables
                    y no se podrá modificar.
                  </p>
                  <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
                    <button
                      onClick={() => setCerrando(true)}
                      disabled={resumen.respondidos < resumen.total}
                      style={{
                        ...s.btn,
                        background: resumen.respondidos < resumen.total ? '#C5C5BD' : color,
                        cursor: resumen.respondidos < resumen.total ? 'not-allowed' : 'pointer',
                      }}
                      title={resumen.respondidos < resumen.total
                        ? 'Responde todos los criterios primero' : ''}
                    >
                      Cerrar y calificar
                    </button>
                    <button onClick={eliminar} disabled={ocupado} style={s.btnBorrar}>
                      Eliminar inspección
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <label style={s.label}>Observaciones generales</label>
                  <textarea
                    value={observaciones}
                    rows={3}
                    onChange={(x) => setObservaciones(x.target.value)}
                    placeholder="Opcional"
                    style={{ ...s.input, resize: 'vertical' }}
                  />

                  <div style={s.dosFirmas}>
                    <div>
                      <label style={s.label}>Firma de quien inspecciona</label>
                      <LienzoFirma ref={firmaInspRef} color={color} />
                      <p style={s.pieFirma}>{insp.inspector}</p>
                    </div>
                    {insp.acompanante && (
                      <div>
                        <label style={s.label}>Firma de quien acompaña</label>
                        <LienzoFirma ref={firmaAcompRef} color={color} />
                        <p style={s.pieFirma}>{insp.acompanante}</p>
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                    <button
                      onClick={cerrar}
                      disabled={ocupado}
                      style={{ ...s.btn, background: ocupado ? '#C5C5BD' : color }}
                    >
                      {pendiente ? 'Calificando…' : 'Confirmar cierre'}
                    </button>
                    <button onClick={() => setCerrando(false)} style={s.btnSec}>
                      Cancelar
                    </button>
                  </div>
                </>
              )}
            </section>
          ) : (
            <section style={s.card}>
              <h2 style={s.h2}>Informe</h2>
              <p style={s.nota}>
                Documento firmado con el membrete de la empresa, el detalle por
                sección y los hallazgos con su evidencia.
              </p>
              <a
                href={`/api/pdf-inspeccion/${insp.id}`}
                style={{ ...s.btn, background: color, marginTop: 14, display: 'inline-block' }}
              >
                Descargar PDF
              </a>
            </section>
          )}
        </>
      )}

      <Link href="/panel/inspecciones" style={s.btnSecEnlace}>
        Volver a inspecciones
      </Link>
    </>
  );
}

function Kpi({ v, l, color }: { v: string; l: string; color?: string }) {
  return (
    <div style={s.kpi}>
      <div style={{ fontSize: 20, fontWeight: 700, color: color ?? '#14263F' }}>{v}</div>
      <div style={s.kpiL}>{l}</div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  cabecera: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    gap: 14, flexWrap: 'wrap', marginTop: 12, marginBottom: 14,
  },
  codigo: {
    fontSize: 11, color: '#A3AAB3', letterSpacing: .5,
    fontFamily: 'ui-monospace,SFMono-Regular,Menlo,monospace',
  },
  titulo: { fontSize: 20, margin: '3px 0', letterSpacing: -0.3 },
  sub: { fontSize: 12.5, color: '#5B6470', margin: 0 },
  veredicto: { padding: '10px 18px', borderRadius: 8, textAlign: 'center' },

  barra: {
    position: 'relative', height: 26, background: '#EFEFEA',
    borderRadius: 13, overflow: 'hidden', marginBottom: 16,
  },
  progreso: { height: '100%', transition: 'width .2s ease' },
  textoProgreso: {
    position: 'absolute', top: 0, left: 0, right: 0, lineHeight: '26px',
    textAlign: 'center', fontSize: 11.5, fontWeight: 600, color: '#14263F',
  },

  card: {
    background: '#fff', borderWidth: 1, borderStyle: 'solid', borderColor: '#E4E4DF',
    borderRadius: 8, padding: 22, marginBottom: 16,
  },
  h2: { fontSize: 14.5, margin: '0 0 14px', fontWeight: 600 },
  nota: { fontSize: 11.5, color: '#8A929C', margin: 0, lineHeight: 1.6 },

  seccion: {
    fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase',
    letterSpacing: .7, marginBottom: 10,
  },
  numeroCriterio: {
    fontSize: 11, color: '#8A929C', marginBottom: 8,
    display: 'flex', alignItems: 'center', gap: 8,
  },
  chipCritico: {
    fontSize: 9.5, background: '#FEE2E2', color: '#9B1C1C',
    padding: '2px 8px', borderRadius: 999, fontWeight: 700,
  },
  criterio: { fontSize: 16, lineHeight: 1.5, margin: '0 0 10px', fontWeight: 500 },
  ayuda: {
    fontSize: 12, color: '#0369A1', background: '#F0F9FF',
    padding: '9px 12px', borderRadius: 6, margin: '0 0 16px', lineHeight: 1.55,
  },

  opciones: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(110px,1fr))', gap: 8 },
  botonOpcion: {
    padding: '16px 12px', borderWidth: 2, borderStyle: 'solid', borderRadius: 8,
    fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
  },

  evidencia: {
    marginTop: 16, paddingTop: 16,
    borderTopWidth: 1, borderTopStyle: 'solid', borderTopColor: '#EFEFEA',
  },
  label: { display: 'block', fontSize: 12, fontWeight: 600, margin: '10px 0 5px' },
  input: {
    width: '100%', padding: '10px 12px', borderWidth: 1, borderStyle: 'solid',
    borderColor: '#DFDFD8', borderRadius: 6, fontSize: 13.5,
    boxSizing: 'border-box', fontFamily: 'inherit',
  },
  foto: { maxHeight: 160, maxWidth: '100%', objectFit: 'contain', borderRadius: 6, marginTop: 10 },
  filaEvidencia: { display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' },

  navegacion: {
    display: 'flex', gap: 8, justifyContent: 'space-between',
    marginTop: 18, paddingTop: 14,
    borderTopWidth: 1, borderTopStyle: 'solid', borderTopColor: '#EFEFEA',
  },
  btnNav: {
    background: '#fff', borderWidth: 1, borderStyle: 'solid', borderColor: '#DFDFD8',
    color: '#14263F', padding: '8px 14px', borderRadius: 4,
    fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
  },

  kpis: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(110px,1fr))', gap: 10 },
  kpi: { background: '#FBFBF9', borderRadius: 6, padding: 12, textAlign: 'center' },
  kpiL: { fontSize: 10, color: '#8A929C', textTransform: 'uppercase', marginTop: 2 },

  avisoCritico: {
    background: '#FDF2F2', color: '#9B1C1C', padding: '12px 14px',
    borderRadius: 6, fontSize: 12.5, marginTop: 14, lineHeight: 1.6,
  },
  faltantes: { fontSize: 12.5, color: '#8A6100', marginTop: 12 },

  hallazgo: {
    display: 'flex', gap: 12, alignItems: 'flex-start',
    padding: '12px 0', borderBottom: '1px solid #F4F4F0',
  },
  criterioHallazgo: { fontSize: 12.5, fontWeight: 600, display: 'flex', gap: 7, alignItems: 'center', flexWrap: 'wrap' },
  chipCriticoMini: {
    fontSize: 9, background: '#FEE2E2', color: '#9B1C1C',
    padding: '2px 7px', borderRadius: 999, fontWeight: 700,
  },
  textoHallazgo: { fontSize: 12, color: '#5B6470', margin: '4px 0 0', lineHeight: 1.5 },
  miniatura: { width: 54, height: 54, objectFit: 'cover', borderRadius: 4 },
  btnMini: {
    background: 'none', border: 'none', color: '#5B6470',
    fontSize: 11.5, cursor: 'pointer', textDecoration: 'underline',
  },

  listaCriterios: { display: 'grid', gap: 3, maxHeight: 380, overflowY: 'auto' },
  itemCriterio: {
    display: 'flex', gap: 10, alignItems: 'center',
    padding: '8px 10px', borderRadius: 4, fontSize: 12,
    borderWidth: 1, borderStyle: 'solid', borderColor: '#EFEFEA',
    fontFamily: 'inherit',
  },
  ordenItem: {
    fontSize: 10, color: '#A3AAB3', width: 18,
    fontFamily: 'ui-monospace,SFMono-Regular,Menlo,monospace',
  },
  puntoCritico: {
    display: 'inline-block', width: 6, height: 6, borderRadius: '50%',
    background: '#9B1C1C', marginLeft: 6,
  },
  resultadoItem: { fontSize: 15, fontWeight: 700, width: 18, textAlign: 'center' },

  dosFirmas: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(250px,1fr))', gap: 18, marginTop: 14 },
  pieFirma: { fontSize: 11, color: '#8A929C', textAlign: 'center', margin: '6px 0 0' },

  aviso: { padding: '10px 14px', borderRadius: 6, fontSize: 13, marginBottom: 14 },
  btn: {
    color: '#fff', border: 'none', padding: '11px 20px', borderRadius: 6,
    fontSize: 13, fontWeight: 600, cursor: 'pointer', textDecoration: 'none',
  },
  btnSec: {
    background: '#fff', color: '#14263F',
    borderWidth: 1, borderStyle: 'solid', borderColor: '#DFDFD8',
    padding: '11px 20px', borderRadius: 6, fontSize: 13,
    fontWeight: 600, display: 'inline-block',
  },
  btnBorrar: {
    background: '#fff', color: '#9B1C1C',
    borderWidth: 1, borderStyle: 'solid', borderColor: '#F5C6C6',
    padding: '11px 20px', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer',
  },
  btnSecEnlace: {
    background: '#fff', color: '#14263F',
    borderWidth: 1, borderStyle: 'solid', borderColor: '#DFDFD8',
    padding: '10px 20px', borderRadius: 4, fontSize: 13, fontWeight: 600,
    textDecoration: 'none', display: 'inline-block',
  },
};
