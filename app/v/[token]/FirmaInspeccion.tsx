'use client';

/**
 * Firma del acompañante de una inspección.
 *
 * Van los HALLAZGOS, no solo el veredicto: está firmando que acompañó el
 * recorrido y conoce lo que se encontró. Enseñarle un porcentaje sin
 * decirle qué falló sería pedirle que firme un número.
 */
import { useRef, useState, useTransition } from 'react';
import LienzoFirma, { type LienzoFirmaRef } from '@/app/LienzoFirma';
import { crearClienteNavegador } from '@/lib/supabase/cliente';

export default function FirmaInspeccion({
  token,
  orgId,
  inspeccion,
  hallazgos,
  empresa,
}: {
  token: string;
  orgId: string;
  inspeccion: {
    codigo: string; tipo: string; fecha: string;
    objeto: string | null; inspector: string | null; acompanante: string | null;
    puntaje: number | null; cumple: boolean | null;
    cerrada: boolean; yaFirmo: boolean;
  };
  hallazgos: Array<{
    criterio: string; seccion: string | null;
    critico: boolean; hallazgo: string | null;
  }>;
  empresa: { nombre: string; logo_url: string | null; color: string };
}) {
  const supabase = crearClienteNavegador();
  const firmaRef = useRef<LienzoFirmaRef>(null);
  const [pendiente, startTransition] = useTransition();
  const [error, setError] = useState('');
  const [nombre, setNombre] = useState(inspeccion.acompanante ?? '');
  const [listo, setListo] = useState(inspeccion.yaFirmo);

  const color = empresa.color ?? '#14263F';
  const fecha = new Date(inspeccion.fecha).toLocaleDateString('es-CO', {
    day: '2-digit', month: 'long', year: 'numeric',
  });

  function firmar() {
    setError('');
    startTransition(async () => {
      if (!firmaRef.current?.tieneFirma()) {
        setError('Dibuje su firma antes de continuar.');
        return;
      }
      const blob = await firmaRef.current.obtenerBlob();
      if (!blob) { setError('No se pudo leer la firma.'); return; }

      // Toda ruta de Storage empieza por org_id.
      const ruta = `${orgId}/inspecciones/firma-${token.slice(0, 12)}-${Date.now()}.png`;
      const { error: errSubida } = await supabase.storage
        .from('firmas')
        .upload(ruta, blob, { contentType: 'image/png', upsert: true });

      if (errSubida) { setError('No se pudo guardar la firma: ' + errSubida.message); return; }

      const { data, error: errRpc } = await supabase.rpc('firmar_inspeccion_publica', {
        p_token: token, p_firma: ruta, p_nombre: nombre,
      });

      if (errRpc) { setError(errRpc.message); return; }
      const r = data as { ok: boolean; error?: string };
      if (!r.ok) { setError(r.error ?? 'No se pudo registrar la firma.'); return; }

      setListo(true);
    });
  }

  if (listo) {
    return (
      <main style={s.pagina}>
        <div style={s.caja}>
          <div style={{ ...s.exito, background: `${color}18`, color }}>✓</div>
          <h1 style={s.titulo}>Firma registrada</h1>
          <p style={s.texto}>
            Gracias. Su firma quedó en el informe de la inspección{' '}
            <strong>{inspeccion.codigo}</strong>. Ya puede cerrar esta página.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main style={s.pagina}>
      <div style={{ ...s.caja, textAlign: 'left', maxWidth: 500 }}>
        <header style={{ ...s.cabecera, borderColor: color }}>
          {empresa.logo_url && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={empresa.logo_url} alt="" style={s.logo} />
          )}
          <div style={s.empresa}>{empresa.nombre}</div>
          <div style={s.doc}>Informe de inspección · {inspeccion.codigo}</div>
        </header>

        <p style={s.saludo}>
          Buen día. Usted acompañó la inspección realizada
          {inspeccion.inspector ? ` por ${inspeccion.inspector}` : ''} el {fecha}
          {inspeccion.objeto ? ` en ${inspeccion.objeto}` : ''}.
        </p>

        {inspeccion.puntaje !== null && (
          <div style={{
            ...s.veredicto,
            background: inspeccion.cumple ? '#E6F4EA' : '#FDF2F2',
            color: inspeccion.cumple ? '#1E6B3A' : '#9B1C1C',
          }}>
            <span style={s.puntaje}>{inspeccion.puntaje}%</span>
            <span style={s.veredictoTexto}>
              {inspeccion.cumple ? 'Cumple' : 'No cumple'}
            </span>
          </div>
        )}

        <div style={s.seccion}>
          {hallazgos.length === 0
            ? 'No se encontraron incumplimientos'
            : `Lo que se encontró · ${hallazgos.length} hallazgo(s)`}
        </div>

        {hallazgos.length > 0 && (
          <div style={s.lista}>
            {hallazgos.map((h, i) => (
              <div key={i} style={s.hallazgo}>
                <div style={s.hCriterio}>
                  {h.critico && <span style={s.critico}>CRÍTICO</span>}
                  {h.criterio}
                </div>
                {h.seccion && <div style={s.hSeccion}>{h.seccion}</div>}
                {h.hallazgo && <div style={s.hTexto}>{h.hallazgo}</div>}
              </div>
            ))}
          </div>
        )}

        <div style={s.campo}>
          <label style={s.label}>Su nombre</label>
          <input value={nombre} onChange={(e) => setNombre(e.target.value)}
            style={s.input} placeholder="Nombre de quien acompañó el recorrido" />
        </div>

        <p style={s.aviso}>
          Al firmar deja constancia de que acompañó la inspección y conoce los
          hallazgos registrados.
        </p>

        <div style={s.zonaFirma}>
          <span style={s.label}>Su firma</span>
          <LienzoFirma ref={firmaRef} color={color} />
        </div>

        {error && <div style={s.error}>{error}</div>}

        <button onClick={firmar} disabled={pendiente}
          style={{ ...s.boton, background: pendiente ? '#cbd5e1' : color }}>
          {pendiente ? 'Registrando…' : 'Firmar'}
        </button>

        <p style={s.pie}>
          Este enlace es personal y deja de funcionar apenas usted firme.
        </p>
      </div>
    </main>
  );
}

const s: Record<string, React.CSSProperties> = {
  pagina: {
    minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: '#F7F7F4', padding: 20,
    fontFamily: "'Inter','Segoe UI',Roboto,Arial,sans-serif", color: '#14263F',
  },
  caja: {
    background: '#fff', border: '1px solid #E4E4DF', borderRadius: 14,
    padding: '26px 24px', maxWidth: 420, width: '100%', textAlign: 'center',
  },
  cabecera: {
    borderBottomWidth: 2, borderBottomStyle: 'solid', paddingBottom: 12, marginBottom: 16,
  },
  logo: { maxHeight: 44, maxWidth: 150, objectFit: 'contain', marginBottom: 8 },
  empresa: { fontSize: 15, fontWeight: 700 },
  doc: { fontSize: 11.5, color: '#5B6470', marginTop: 2 },

  saludo: { fontSize: 14, lineHeight: 1.65, margin: '0 0 14px' },

  veredicto: {
    borderRadius: 10, padding: '12px 16px', marginBottom: 14,
    display: 'flex', alignItems: 'baseline', gap: 12,
  },
  puntaje: { fontSize: 26, fontWeight: 700, fontVariantNumeric: 'tabular-nums' },
  veredictoTexto: { fontSize: 14, fontWeight: 700 },

  seccion: {
    fontSize: 11, fontWeight: 700, color: '#8A929C', letterSpacing: .5,
    textTransform: 'uppercase', marginBottom: 8,
  },
  lista: {
    border: '1px solid #E4E4DF', borderRadius: 9,
    marginBottom: 14, maxHeight: 240, overflowY: 'auto',
  },
  hallazgo: { padding: '10px 12px', borderBottom: '1px solid #F0F0EC' },
  hCriterio: { fontSize: 12.5, fontWeight: 600, lineHeight: 1.45 },
  critico: {
    fontSize: 9.5, fontWeight: 700, color: '#9B1C1C', background: '#FDF2F2',
    padding: '2px 6px', borderRadius: 4, marginRight: 6,
  },
  hSeccion: { fontSize: 11, color: '#8A929C', marginTop: 2 },
  hTexto: { fontSize: 12, color: '#374151', marginTop: 4, lineHeight: 1.5 },

  campo: { marginTop: 8 },
  label: { display: 'block', fontSize: 12.5, fontWeight: 600, marginBottom: 5 },
  input: {
    width: '100%', padding: '10px 12px', border: '1px solid #E4E4DF',
    borderRadius: 9, fontSize: 13.5, boxSizing: 'border-box',
    fontFamily: 'inherit', color: '#14263F',
  },

  aviso: { fontSize: 12, color: '#5B6470', lineHeight: 1.6, margin: '14px 0' },

  zonaFirma: { display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 },

  error: {
    background: '#FDF2F2', color: '#9B1C1C', borderRadius: 8,
    padding: '10px 13px', fontSize: 13, marginBottom: 12,
  },
  boton: {
    width: '100%', color: '#fff', border: 'none', padding: 14,
    borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: 'pointer',
  },
  pie: { fontSize: 11, color: '#8A929C', marginTop: 14, textAlign: 'center' },

  exito: {
    width: 46, height: 46, borderRadius: '50%', margin: '0 auto 12px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 25, fontWeight: 700,
  },
  titulo: { fontSize: 19, fontWeight: 700, margin: '0 0 8px' },
  texto: { fontSize: 14, color: '#5B6470', margin: 0, lineHeight: 1.65 },
};
