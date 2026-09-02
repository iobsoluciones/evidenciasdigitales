'use client';

/**
 * Aprobación del plan anual por el empleador.
 *
 * Aquí se muestra el plan COMPLETO —objetivo, alcance, recursos y el
 * cronograma actividad por actividad— porque lo que se le pide al
 * empleador es que apruebe un compromiso de recursos y fechas. Pedirle
 * la firma sin dejarle leer el cronograma sería pedirle que firme en
 * blanco, y su firma es justamente lo que convierte esto en el plan de
 * la empresa.
 */
import { useRef, useState, useTransition } from 'react';
import LienzoFirma, { type LienzoFirmaRef } from '@/app/LienzoFirma';
import { crearClienteNavegador } from '@/lib/supabase/cliente';

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
               'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

type Actividad = {
  objetivo: string | null;
  actividad: string;
  meta: string | null;
  responsable: string | null;
  meses: number[] | null;
};

export default function AprobarPlan({
  token,
  orgId,
  plan,
  actividades,
  empresa,
}: {
  token: string;
  orgId: string;
  plan: {
    codigo: string; anio: number;
    objetivo_general: string | null; alcance: string | null;
    recursos_financieros: string | null; recursos_humanos: string | null;
    recursos_tecnicos: string | null; aprobado: boolean;
  };
  actividades: Actividad[];
  empresa: { nombre: string; logo_url: string | null; color: string };
}) {
  const supabase = crearClienteNavegador();
  const firmaRef = useRef<LienzoFirmaRef>(null);
  const [pendiente, startTransition] = useTransition();
  const [error, setError] = useState('');
  const [nombre, setNombre] = useState('');
  const [cargo, setCargo] = useState('');
  const [listo, setListo] = useState(plan.aprobado);

  const color = empresa.color ?? '#14263F';

  function aprobar() {
    setError('');
    startTransition(async () => {
      if (!nombre.trim()) { setError('Escriba su nombre.'); return; }
      if (!firmaRef.current?.tieneFirma()) {
        setError('Dibuje su firma antes de continuar.');
        return;
      }
      const blob = await firmaRef.current.obtenerBlob();
      if (!blob) { setError('No se pudo leer la firma.'); return; }

      // Toda ruta de Storage empieza por org_id.
      const ruta = `${orgId}/plan-anual/firma-${token.slice(0, 12)}-${Date.now()}.png`;
      const { error: errSubida } = await supabase.storage
        .from('firmas')
        .upload(ruta, blob, { contentType: 'image/png', upsert: true });

      if (errSubida) { setError('No se pudo guardar la firma: ' + errSubida.message); return; }

      const { data, error: errRpc } = await supabase.rpc('aprobar_plan_publica', {
        p_token: token, p_nombre: nombre, p_cargo: cargo, p_firma: ruta,
      });

      if (errRpc) { setError(errRpc.message); return; }
      const r = data as { ok: boolean; error?: string };
      if (!r.ok) { setError(r.error ?? 'No se pudo aprobar.'); return; }

      setListo(true);
    });
  }

  if (listo) {
    return (
      <main style={s.pagina}>
        <div style={s.caja}>
          <div style={{ ...s.exito, background: `${color}18`, color }}>✓</div>
          <h1 style={s.titulo}>Plan aprobado</h1>
          <p style={s.texto}>
            Gracias. El plan anual <strong>{plan.codigo}</strong> de {plan.anio} quedó
            aprobado con su firma. Ya puede cerrar esta página.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main style={s.pagina}>
      <div style={{ ...s.caja, textAlign: 'left', maxWidth: 620 }}>
        <header style={{ ...s.cabecera, borderColor: color }}>
          {empresa.logo_url && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={empresa.logo_url} alt="" style={s.logo} />
          )}
          <div style={s.empresa}>{empresa.nombre}</div>
          <div style={s.doc}>
            Plan anual de trabajo del SG-SST {plan.anio} · {plan.codigo}
          </div>
        </header>

        <p style={s.saludo}>
          Se le pide aprobar el plan anual de trabajo del Sistema de Gestión de
          Seguridad y Salud en el Trabajo. <strong>Su firma es la que lo convierte
          en el plan de la empresa</strong>: sin ella es un borrador del consultor.
        </p>

        {plan.objetivo_general && (
          <Bloque t="Objetivo general" v={plan.objetivo_general} color={color} />
        )}
        {plan.alcance && <Bloque t="Alcance" v={plan.alcance} color={color} />}

        {(plan.recursos_financieros || plan.recursos_humanos || plan.recursos_tecnicos) && (
          <>
            <div style={s.seccion}>Recursos que se compromete a asignar</div>
            <div style={s.recursos}>
              <Recurso t="Financieros" v={plan.recursos_financieros} />
              <Recurso t="Humanos" v={plan.recursos_humanos} />
              <Recurso t="Técnicos" v={plan.recursos_tecnicos} />
            </div>
          </>
        )}

        <div style={s.seccion}>Cronograma · {actividades.length} actividad(es)</div>
        <div style={s.lista}>
          {actividades.map((a, i) => (
            <div key={i} style={s.actividad}>
              <div style={s.actNombre}>{a.actividad}</div>
              {a.meta && <div style={s.actMeta}>Meta: {a.meta}</div>}
              <div style={s.actMeta}>
                {a.responsable ? `Responsable: ${a.responsable}` : 'Sin responsable'}
              </div>
              <div style={s.meses}>
                {MESES.map((m, n) => {
                  const activo = a.meses?.includes(n + 1);
                  return (
                    <span key={n} style={{
                      ...s.mes,
                      background: activo ? color : 'var(--superficie-3)',
                      color: activo ? 'var(--sobre-marca)' : '#A2AAB4',
                      fontWeight: activo ? 700 : 400,
                    }}>
                      {m}
                    </span>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div style={s.campo}>
          <label style={s.label}>Su nombre *</label>
          <input value={nombre} onChange={(e) => setNombre(e.target.value)}
            style={s.input} placeholder="Nombre completo de quien aprueba" />
        </div>
        <div style={s.campo}>
          <label style={s.label}>Cargo</label>
          <input value={cargo} onChange={(e) => setCargo(e.target.value)}
            style={s.input} placeholder="Gerente general, representante legal…" />
        </div>

        <div style={s.zonaFirma}>
          <span style={s.label}>Su firma *</span>
          <LienzoFirma ref={firmaRef} color={color} />
        </div>

        {error && <div style={s.error}>{error}</div>}

        <button onClick={aprobar} disabled={pendiente}
          style={{ ...s.boton, background: pendiente ? 'var(--borde-fuerte)' : color }}>
          {pendiente ? 'Registrando…' : 'Aprobar y firmar el plan'}
        </button>

        <p style={s.pie}>
          Este enlace deja de funcionar apenas usted apruebe.
        </p>
      </div>
    </main>
  );
}

function Bloque({ t, v, color }: { t: string; v: string; color: string }) {
  return (
    <div style={{ ...s.bloque, borderColor: color }}>
      <span style={s.bloqueT}>{t}</span>
      <p style={s.bloqueV}>{v}</p>
    </div>
  );
}

function Recurso({ t, v }: { t: string; v: string | null }) {
  return (
    <div style={s.recurso}>
      <span style={s.recursoT}>{t}</span>
      <span style={s.recursoV}>{v ?? '—'}</span>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  pagina: {
    minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'var(--fondo)', padding: 20, color: 'var(--texto)',
  },
  caja: {
    background: 'var(--superficie)', border: '1px solid var(--borde)', borderRadius: 14,
    padding: '26px 24px', maxWidth: 420, width: '100%', textAlign: 'center',
  },
  cabecera: {
    borderBottomWidth: 2, borderBottomStyle: 'solid', paddingBottom: 12, marginBottom: 16,
  },
  logo: { maxHeight: 44, maxWidth: 150, objectFit: 'contain', marginBottom: 8 },
  empresa: { fontSize: 15, fontWeight: 700 },
  doc: { fontSize: 11.5, color: 'var(--texto-suave)', marginTop: 2 },

  saludo: { fontSize: 14, lineHeight: 1.65, margin: '0 0 16px' },

  bloque: {
    borderLeftWidth: 3, borderLeftStyle: 'solid', background: 'var(--superficie-2)',
    padding: '10px 13px', marginBottom: 10,
  },
  bloqueT: {
    fontSize: 10, fontWeight: 700, color: 'var(--texto-tenue)',
    letterSpacing: .4, textTransform: 'uppercase',
  },
  bloqueV: { fontSize: 13, lineHeight: 1.6, color: 'var(--texto-suave)', margin: '3px 0 0' },

  seccion: {
    fontSize: 11, fontWeight: 700, color: 'var(--texto-tenue)', letterSpacing: .5,
    textTransform: 'uppercase', margin: '16px 0 8px',
  },
  recursos: { display: 'grid', gap: 6, marginBottom: 4 },
  recurso: {
    border: '1px solid var(--borde)', borderRadius: 8, padding: '8px 11px',
    display: 'flex', flexDirection: 'column', gap: 2,
  },
  recursoT: { fontSize: 10, color: 'var(--texto-tenue)', textTransform: 'uppercase', letterSpacing: .4 },
  recursoV: { fontSize: 12.5, color: 'var(--texto-suave)', lineHeight: 1.5 },

  lista: { border: '1px solid var(--borde)', borderRadius: 8, maxHeight: 300, overflowY: 'auto' },
  actividad: { padding: '10px 12px', borderBottom: '1px solid var(--superficie-3)' },
  actNombre: { fontSize: 13, fontWeight: 600, lineHeight: 1.4 },
  actMeta: { fontSize: 11.5, color: 'var(--texto-tenue)', marginTop: 2 },
  meses: { display: 'flex', gap: 2, marginTop: 6, flexWrap: 'wrap' },
  mes: {
    fontSize: 9, borderRadius: 3, padding: '2px 5px', minWidth: 22, textAlign: 'center',
  },

  campo: { marginTop: 14 },
  label: { display: 'block', fontSize: 12.5, fontWeight: 600, marginBottom: 5 },
  input: {
    width: '100%', padding: '10px 12px', border: '1px solid var(--borde)',
    borderRadius: 8, fontSize: 13.5, boxSizing: 'border-box',
    fontFamily: 'inherit', color: 'var(--texto)',
  },

  zonaFirma: { display: 'flex', flexDirection: 'column', gap: 6, margin: '16px 0 14px' },

  error: {
    background: 'var(--mal-fondo)', color: 'var(--mal)', borderRadius: 8,
    padding: '10px 13px', fontSize: 13, marginBottom: 12,
  },
  boton: {
    width: '100%', color: 'var(--sobre-marca)', border: 'none', padding: 14,
    borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: 'pointer',
  },
  pie: { fontSize: 11, color: 'var(--texto-tenue)', marginTop: 14, textAlign: 'center' },

  exito: {
    width: 46, height: 46, borderRadius: '50%', margin: '0 auto 12px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 25, fontWeight: 700,
  },
  titulo: { fontSize: 19, fontWeight: 700, margin: '0 0 8px' },
  texto: { fontSize: 14, color: 'var(--texto-suave)', margin: 0, lineHeight: 1.65 },
};
