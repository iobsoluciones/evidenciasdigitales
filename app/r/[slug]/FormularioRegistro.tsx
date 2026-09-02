'use client';

/**
 * FORMULARIO DEL ASISTENTE
 * ---------------------------------------------------------------
 * La IDENTIFICACIÓN va primero: si la capacitación valida contra la
 * base de empleados, verificarla de entrada evita que la persona
 * llene todo el formulario y firme para que se lo rechacen al final.
 * Y si está registrada, el resto se autocompleta solo.
 *
 * Los campos de lista aceptan valores que no estén en el catálogo:
 * un `select` que recibe un valor ausente se muestra vacío, y eso
 * borraría en pantalla lo que el autocompletado acaba de traer.
 */
import { useState, useRef, useEffect } from 'react';
import { crearClienteNavegador } from '@/lib/supabase/cliente';
import LienzoFirma, { type LienzoFirmaRef } from '../../LienzoFirma';

const VACIO = { identificacion: '', nombres: '', cargo: '', area: '', ciudad: '' };

type Catalogos = { ciudades: string[]; cargos: string[]; areas: string[] };

type PreguntaPublica = {
  id: string;
  enunciado: string;
  tipo: 'unica' | 'multiple';
  subtema: string | null;
  puntaje: number;
  opciones: Array<{ id: string; texto: string }>;
};

type EvaluacionPublica = {
  hay: boolean;
  titulo?: string;
  obligatoria?: boolean;
  puntajeMinimo?: number;
  preguntas?: PreguntaPublica[];
};

type Resultado = {
  participanteId: string;
  puntaje: number | null;
  aprobo: boolean | null;
  intentos: number;
  maxIntentos: number;
};

export default function FormularioRegistro({
  capacitacionId, orgId, slug, color,
}: {
  capacitacionId: string; orgId: string; slug: string; color: string;
}) {
  const supabase = crearClienteNavegador();
  const firmaRef = useRef<LienzoFirmaRef>(null);

  const [form, setForm] = useState(VACIO);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [cat, setCat] = useState<Catalogos>({ ciudades: [], cargos: [], areas: [] });
  const [evaluacion, setEvaluacion] = useState<EvaluacionPublica>({ hay: false });
  const [respuestas, setRespuestas] = useState<Record<string, string[]>>({});

  // Verificación contra la base de empleados
  const [validando, setValidando] = useState(false);
  const [avisoId, setAvisoId] = useState<{ ok: boolean; texto: string } | null>(null);
  const [bloqueado, setBloqueado] = useState(false);
  // Verificado contra la base: el nombre queda fijo para que nadie
  // registre asistencia a nombre de otro con una cédula ajena.
  const [verificado, setVerificado] = useState(false);

  // Reintento
  const [reintentando, setReintentando] = useState(false);

  useEffect(() => {
    supabase.rpc('catalogos_publicos', { p_slug: slug })
      .then(({ data }) => { if (data) setCat(data as Catalogos); });

    supabase.rpc('evaluacion_publica', { p_capacitacion_id: capacitacionId })
      .then(({ data }) => { if (data) setEvaluacion(data as EvaluacionPublica); });
  }, [slug, capacitacionId, supabase]);

  function cambiar(campo: keyof typeof VACIO, valor: string) {
    const v = campo === 'identificacion' ? valor.replace(/[^0-9]/g, '') : valor;
    setForm((p) => ({ ...p, [campo]: v }));
    if (campo === 'identificacion') {
      setAvisoId(null);
      setBloqueado(false);
      setVerificado(false);
    }
  }

  /** Verifica la identificación y autocompleta si la persona existe. */
  async function verificarIdentificacion() {
    const id = form.identificacion.trim();
    if (!id) return;

    setValidando(true);
    const { data } = await supabase.rpc('verificar_empleado', {
      p_capacitacion_id: capacitacionId,
      p_identificacion: id,
    });
    setValidando(false);

    const r = data as {
      requiere?: boolean; valida: boolean; error?: string;
      nombres?: string; cargo?: string; area?: string; ciudad?: string;
    } | null;

    if (!r || !r.requiere) return;   // la capacitación no exige validación

    if (!r.valida) {
      setAvisoId({ ok: false, texto: r.error ?? 'Identificación no registrada.' });
      setBloqueado(true);
      setVerificado(false);
      return;
    }

    // Autocompletado con los datos que la empresa ya tiene
    setForm((p) => ({
      ...p,
      nombres: r.nombres || p.nombres,
      cargo: r.cargo || p.cargo,
      area: r.area || p.area,
      ciudad: r.ciudad || p.ciudad,
    }));
    setBloqueado(false);
    setVerificado(true);
    setAvisoId({ ok: true, texto: `Verificado: ${r.nombres ?? ''}` });
  }

  function responder(preguntaId: string, opcionId: string, tipo: 'unica' | 'multiple') {
    setRespuestas((r) => {
      const actual = r[preguntaId] ?? [];
      if (tipo === 'unica') return { ...r, [preguntaId]: [opcionId] };
      return {
        ...r,
        [preguntaId]: actual.includes(opcionId)
          ? actual.filter((x) => x !== opcionId)
          : [...actual, opcionId],
      };
    });
  }

  function faltanRespuestas(): number {
    return (evaluacion.preguntas ?? []).filter((p) => !(respuestas[p.id]?.length)).length;
  }

  async function enviar(ev: React.FormEvent) {
    ev.preventDefault();
    setError('');

    if (bloqueado) {
      setError('La identificación no está registrada en la base de datos de la empresa.');
      return;
    }

    for (const [k, v] of Object.entries(form)) {
      if (!v.trim()) { setError('Todos los campos son obligatorios.'); return; }
      if (k === 'identificacion' && !/^[0-9]+$/.test(v)) {
        setError('La identificación debe contener solo números.'); return;
      }
    }

    if (evaluacion.hay && evaluacion.obligatoria) {
      const faltan = faltanRespuestas();
      if (faltan > 0) {
        setError(`Falta responder ${faltan} pregunta(s) de la evaluación.`);
        return;
      }
    }

    if (!firmaRef.current?.tieneFirma()) {
      setError('Por favor firma en el recuadro antes de enviar.');
      return;
    }

    setEnviando(true);

    let rutaFirma: string | null = null;
    const blob = await firmaRef.current.obtenerBlob();

    if (blob) {
      const ruta = `${orgId}/${capacitacionId}/${form.identificacion}-${Date.now()}.png`;
      const { error: errSubida } = await supabase.storage
        .from('firmas')
        .upload(ruta, blob, { contentType: 'image/png', upsert: false });

      if (errSubida) {
        setEnviando(false);
        setError('No se pudo guardar la firma. Intenta de nuevo.');
        return;
      }
      rutaFirma = ruta;
    }

    const payload = Object.entries(respuestas).map(([pregunta, opciones]) => ({
      pregunta, opciones,
    }));

    const { data, error: errRpc } = await supabase.rpc('registrar_asistencia_con_evaluacion', {
      p_capacitacion_id: capacitacionId,
      p_nombres: form.nombres,
      p_cargo: form.cargo,
      p_area: form.area,
      p_ciudad: form.ciudad,
      p_identificacion: form.identificacion,
      p_firma_url: rutaFirma,
      p_respuestas: payload.length ? payload : null,
    });

    setEnviando(false);

    if (errRpc) { setError('Error de conexión. Intenta de nuevo.'); return; }

    const r = data as {
      ok: boolean; error?: string; id?: string;
      puntaje?: number; aprobo?: boolean;
    };
    if (!r.ok) { setError(r.error ?? 'No se pudo registrar la asistencia.'); return; }

    setResultado({
      participanteId: r.id!,
      puntaje: r.puntaje ?? null,
      aprobo: r.aprobo ?? null,
      intentos: 1,
      maxIntentos: 1,   // se ajusta al abrir el reintento
    });
  }

  /** Vuelve a calificar con las respuestas nuevas. */
  async function enviarReintento() {
    if (!resultado) return;
    setError('');

    const faltan = faltanRespuestas();
    if (faltan > 0) {
      setError(`Falta responder ${faltan} pregunta(s).`);
      return;
    }

    setEnviando(true);
    const payload = Object.entries(respuestas).map(([pregunta, opciones]) => ({
      pregunta, opciones,
    }));

    const { data, error: errRpc } = await supabase.rpc('reintentar_evaluacion', {
      p_participante_id: resultado.participanteId,
      p_identificacion: form.identificacion,
      p_respuestas: payload,
    });

    setEnviando(false);

    if (errRpc) { setError('Error de conexión. Intenta de nuevo.'); return; }

    const r = data as {
      ok: boolean; error?: string;
      puntaje?: number; aprobo?: boolean;
      intentos?: number; maxIntentos?: number;
    };

    if (!r.ok) { setError(r.error ?? 'No se pudo reintentar.'); return; }

    setResultado({
      participanteId: resultado.participanteId,
      puntaje: r.puntaje ?? null,
      aprobo: r.aprobo ?? null,
      intentos: r.intentos ?? resultado.intentos + 1,
      maxIntentos: r.maxIntentos ?? 1,
    });
    setReintentando(false);
  }

  // =================== PANTALLA DE RESULTADO ===================
  if (resultado && !reintentando) {
    const aprobo = resultado.aprobo;
    const puedeReintentar =
      evaluacion.hay && aprobo === false && resultado.intentos < 3;

    return (
      <div style={{ textAlign: 'center', padding: '26px 0' }}>
        <div style={{
          width: 60, height: 60, borderRadius: '50%',
          background: aprobo === false ? 'var(--mal-fondo)' : 'var(--bien-fondo)',
          color: aprobo === false ? 'var(--mal)' : 'var(--bien)',
          fontSize: 30, lineHeight: '60px', margin: '0 auto 16px',
        }}>
          {aprobo === false ? '!' : '✓'}
        </div>

        <h2 style={{ fontSize: 18, color: 'var(--bien)', margin: '0 0 6px' }}>
          Asistencia registrada
        </h2>

        {resultado.puntaje !== null && (
          <div style={{
            margin: '16px auto 0', maxWidth: 280, padding: 16,
            background: aprobo ? 'var(--bien-fondo)' : 'var(--mal-fondo)', borderRadius: 12,
          }}>
            <div style={{ fontSize: 30, fontWeight: 700, color: aprobo ? 'var(--bien)' : 'var(--mal)' }}>
              {resultado.puntaje}%
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--texto-suave)', marginTop: 4 }}>
              {aprobo ? 'Evaluación aprobada' : 'Evaluación no aprobada'}
              {evaluacion.puntajeMinimo ? ` · mínimo ${evaluacion.puntajeMinimo}%` : ''}
            </div>
            {resultado.intentos > 1 && (
              <div style={{ fontSize: 11.5, color: 'var(--texto-tenue)', marginTop: 6 }}>
                Intento {resultado.intentos}
              </div>
            )}
          </div>
        )}

        {error && (
          <div style={{ ...s.error, maxWidth: 320, margin: '14px auto 0' }}>{error}</div>
        )}

        {puedeReintentar && (
          <>
            <button
              onClick={() => { setReintentando(true); setError(''); }}
              style={{ ...s.boton, background: color, maxWidth: 280, margin: '18px auto 0' }}
            >
              Reintentar evaluación
            </button>
            <p style={{ fontSize: 11.5, color: 'var(--texto-tenue)', marginTop: 8 }}>
              Tu asistencia ya quedó registrada. El reintento solo cambia la calificación.
            </p>
          </>
        )}

        <p style={{ fontSize: 13, color: 'var(--texto-suave)', marginTop: 16 }}>
          Gracias por participar. Ya puedes cerrar esta página.
        </p>
      </div>
    );
  }

  // =================== REINTENTO ===================
  if (reintentando) {
    return (
      <div>
        <div style={s.avisoReintento}>
          Responde de nuevo la evaluación. Tu asistencia ya está registrada;
          esto solo actualiza la calificación.
        </div>

        {(evaluacion.preguntas ?? []).map((p, i) => (
          <Pregunta
            key={p.id}
            p={p}
            i={i}
            color={color}
            elegidas={respuestas[p.id] ?? []}
            onResponder={responder}
          />
        ))}

        {error && <div style={s.error}>{error}</div>}

        <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
          <button
            onClick={enviarReintento}
            disabled={enviando}
            style={{ ...s.boton, background: enviando ? 'var(--borde-fuerte)' : color, flex: 1, marginTop: 0 }}
          >
            {enviando ? 'Calificando…' : 'Enviar respuestas'}
          </button>
          <button
            onClick={() => { setReintentando(false); setError(''); }}
            style={s.botonSec}
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  // =================== FORMULARIO ===================
  return (
    <form onSubmit={enviar}>
      {/* La identificación va primero: verifica y autocompleta el resto */}
      <div style={{ marginBottom: 14 }}>
        <label style={s.label}>Identificación *</label>
        <input
          value={form.identificacion}
          onChange={(ev) => cambiar('identificacion', ev.target.value)}
          onBlur={verificarIdentificacion}
          inputMode="numeric"
          autoFocus
          style={{
            ...s.input,
            borderColor: avisoId ? (avisoId.ok ? 'var(--bien)' : 'var(--mal)') : 'var(--borde-fuerte)',
          }}
        />
        <p style={s.ayuda}>
          {validando ? 'Verificando…' : 'Solo números, sin puntos ni guiones.'}
        </p>
        {avisoId && (
          <p style={{
            fontSize: 12, margin: '6px 0 0', padding: '8px 10px', borderRadius: 6,
            background: avisoId.ok ? 'var(--bien-fondo)' : 'var(--mal-fondo)',
            color: avisoId.ok ? 'var(--bien)' : 'var(--mal)',
          }}>
            {avisoId.texto}
          </p>
        )}
      </div>

      <Campo etiqueta="Nombre y apellidos" valor={form.nombres}
        onChange={(v) => cambiar('nombres', v)} mayus
        bloqueado={verificado}
        ayuda={verificado ? 'Tomado de la base de datos de la empresa.' : undefined} />

      <CampoLista etiqueta="Cargo" valor={form.cargo}
        onChange={(v) => cambiar('cargo', v)} opciones={cat.cargos} />

      <CampoLista etiqueta="Área" valor={form.area}
        onChange={(v) => cambiar('area', v)} opciones={cat.areas} />

      <CampoLista etiqueta="Ciudad" valor={form.ciudad}
        onChange={(v) => cambiar('ciudad', v)} opciones={cat.ciudades} />

      {evaluacion.hay && (
        <section style={s.evaluacion}>
          <h3 style={{ ...s.tituloEval, color }}>{evaluacion.titulo}</h3>
          <p style={s.notaEval}>
            {evaluacion.obligatoria
              ? 'Responde todas las preguntas para registrar tu asistencia.'
              : 'Responder es opcional.'}
            {evaluacion.puntajeMinimo ? ` Mínimo para aprobar: ${evaluacion.puntajeMinimo}%.` : ''}
          </p>

          {(evaluacion.preguntas ?? []).map((p, i) => (
            <Pregunta
              key={p.id}
              p={p}
              i={i}
              color={color}
              elegidas={respuestas[p.id] ?? []}
              onResponder={responder}
            />
          ))}
        </section>
      )}

      <label style={s.label}>Firma digital</label>
      <LienzoFirma ref={firmaRef} color={color} />

      {error && <div style={s.error}>{error}</div>}

      <button type="submit" disabled={enviando || bloqueado} style={{
        ...s.boton,
        background: enviando || bloqueado ? 'var(--borde-fuerte)' : color,
        cursor: enviando || bloqueado ? 'not-allowed' : 'pointer',
      }}>
        {enviando ? 'Enviando…' : 'Registrar mi asistencia'}
      </button>
    </form>
  );
}

/* ---------------------------------------------------------------- */

function Pregunta({
  p, i, color, elegidas, onResponder,
}: {
  p: PreguntaPublica;
  i: number;
  color: string;
  elegidas: string[];
  onResponder: (preguntaId: string, opcionId: string, tipo: 'unica' | 'multiple') => void;
}) {
  return (
    <div style={s.pregunta}>
      <div style={s.enunciado}>
        <span style={{ color, fontWeight: 700 }}>{i + 1}.</span> {p.enunciado}
      </div>
      {p.tipo === 'multiple' && (
        <div style={s.pista}>Puedes marcar varias opciones.</div>
      )}
      {p.opciones.map((o) => {
        const marcada = elegidas.includes(o.id);
        return (
          <label key={o.id} style={{
            ...s.opcion,
            background: marcada ? 'var(--info-fondo)' : 'var(--superficie)',
            borderColor: marcada ? color : 'var(--borde)',
          }}>
            <input
              type={p.tipo === 'unica' ? 'radio' : 'checkbox'}
              name={`p-${p.id}`}
              checked={marcada}
              onChange={() => onResponder(p.id, o.id, p.tipo)}
              style={{ marginRight: 10, width: 16, height: 16 }}
            />
            {o.texto}
          </label>
        );
      })}
    </div>
  );
}

function Campo({
  etiqueta, valor, onChange, mayus, bloqueado, ayuda,
}: {
  etiqueta: string; valor: string; onChange: (v: string) => void;
  mayus?: boolean; bloqueado?: boolean; ayuda?: string;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={s.label}>{etiqueta} *</label>
      <input
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        readOnly={bloqueado}
        style={{
          ...s.input,
          textTransform: mayus ? 'uppercase' : 'none',
          background: bloqueado ? 'var(--superficie-3)' : 'var(--superficie)',
          color: bloqueado ? 'var(--texto-suave)' : 'var(--texto)',
          cursor: bloqueado ? 'not-allowed' : 'text',
        }}
      />
      {ayuda && <p style={s.ayuda}>{ayuda}</p>}
    </div>
  );
}

/**
 * Campo con lista maestra.
 * Si el valor actual no está en el catálogo —porque vino del
 * autocompletado— se agrega a las opciones en vez de descartarlo:
 * un `select` con un valor ausente se muestra vacío y borraría en
 * pantalla lo que la verificación acaba de traer.
 */
function CampoLista({
  etiqueta, valor, onChange, opciones,
}: {
  etiqueta: string; valor: string; onChange: (v: string) => void; opciones: string[];
}) {
  const [libre, setLibre] = useState(false);
  const hayLista = opciones.length > 0;

  const lista = valor && !opciones.includes(valor) ? [valor, ...opciones] : opciones;

  if (!hayLista || libre) {
    return (
      <div style={{ marginBottom: 14 }}>
        <label style={s.label}>{etiqueta} *</label>
        <input value={valor} onChange={(e) => onChange(e.target.value)}
          style={{ ...s.input, textTransform: 'uppercase' }} autoFocus={libre} />
        {hayLista && (
          <button type="button" onClick={() => { setLibre(false); onChange(''); }} style={s.enlace}>
            Elegir de la lista
          </button>
        )}
      </div>
    );
  }

  return (
    <div style={{ marginBottom: 14 }}>
      <label style={s.label}>{etiqueta} *</label>
      <select value={valor} style={s.input}
        onChange={(e) => {
          if (e.target.value === '__otro__') { setLibre(true); onChange(''); }
          else onChange(e.target.value);
        }}>
        <option value="">Selecciona…</option>
        {lista.map((o) => <option key={o} value={o}>{o}</option>)}
        <option value="__otro__">Otro (escribir)</option>
      </select>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  label: { display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--texto)' },
  input: {
    width: '100%', padding: '11px 12px', borderWidth: 1, borderStyle: 'solid',
    borderColor: 'var(--borde-fuerte)', borderRadius: 8, fontSize: 14,
    boxSizing: 'border-box', background: 'var(--superficie)',
  },
  ayuda: { fontSize: 11, color: 'var(--texto-suave)', margin: '4px 0 0' },
  enlace: { background: 'none', border: 'none', color: 'var(--marca)', fontSize: 11.5, cursor: 'pointer', padding: '4px 0 0' },
  evaluacion: { margin: '22px 0', padding: 18, background: 'var(--superficie-3)', border: '1px solid var(--borde)', borderRadius: 12 },
  tituloEval: { fontSize: 15, margin: '0 0 4px' },
  notaEval: { fontSize: 11.5, color: 'var(--texto-suave)', margin: '0 0 16px', lineHeight: 1.5 },
  pregunta: { marginBottom: 18 },
  enunciado: { fontSize: 13.5, fontWeight: 600, color: 'var(--texto)', marginBottom: 4, lineHeight: 1.5 },
  pista: { fontSize: 11, color: 'var(--texto-suave)', marginBottom: 8 },
  opcion: {
    display: 'flex', alignItems: 'center', padding: '10px 12px',
    borderWidth: 1, borderStyle: 'solid', borderRadius: 8,
    marginBottom: 6, fontSize: 13, cursor: 'pointer', lineHeight: 1.4,
  },
  error: { marginTop: 14, padding: '11px 14px', background: 'var(--mal-fondo)', color: 'var(--mal)', borderRadius: 8, fontSize: 13 },
  avisoReintento: { padding: '12px 14px', background: 'var(--ambar-fondo)', color: 'var(--ambar)', borderRadius: 8, fontSize: 12.5, marginBottom: 18, lineHeight: 1.5 },
  boton: {
    display: 'block', width: '100%', marginTop: 20, padding: 14, color: 'var(--sobre-marca)',
    border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: 'pointer',
  },
  botonSec: {
    background: 'var(--superficie)', color: 'var(--texto)', borderWidth: 1, borderStyle: 'solid',
    borderColor: 'var(--borde-fuerte)', padding: '14px 20px', borderRadius: 8,
    fontSize: 14, fontWeight: 600, cursor: 'pointer',
  },
};
