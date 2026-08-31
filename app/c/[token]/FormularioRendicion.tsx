'use client';

/**
 * Rendición de cuentas de un responsable.
 *
 * Es la única pantalla pública donde la persona ESCRIBE algo, no solo
 * firma. Esa es la diferencia entre una rendición de cuentas y una lista
 * de asistencia, y es lo que pide el estándar 2.8.1: por escrito.
 *
 * Se muestran arriba sus responsabilidades asignadas, porque rendir
 * cuentas es responder por ellas, no escribir en abstracto.
 */
import { useRef, useState, useTransition } from 'react';
import LienzoFirma, { type LienzoFirmaRef } from '@/app/LienzoFirma';
import { crearClienteNavegador } from '@/lib/supabase/cliente';

export default function FormularioRendicion({
  token,
  orgId,
  responsable,
  rendicion,
  empresa,
}: {
  token: string;
  orgId: string;
  responsable: {
    nombre: string; cargo: string | null;
    responsabilidades: string | null; informe: string | null; yaFirmo: boolean;
  };
  rendicion: {
    codigo: string; anio: number; fecha: string;
    alcance: string | null; cerrada: boolean;
  };
  empresa: { nombre: string; logo_url: string | null; color: string };
}) {
  const supabase = crearClienteNavegador();
  const firmaRef = useRef<LienzoFirmaRef>(null);
  const [pendiente, startTransition] = useTransition();
  const [error, setError] = useState('');
  const [informe, setInforme] = useState(responsable.informe ?? '');
  const [listo, setListo] = useState(responsable.yaFirmo);

  const color = empresa.color ?? '#14263F';

  function enviar() {
    setError('');
    startTransition(async () => {
      if (!informe.trim()) {
        setError('Escriba su informe antes de firmar.');
        return;
      }
      if (!firmaRef.current?.tieneFirma()) {
        setError('Dibuje su firma antes de continuar.');
        return;
      }
      const blob = await firmaRef.current.obtenerBlob();
      if (!blob) { setError('No se pudo leer la firma.'); return; }

      // Toda ruta de Storage empieza por org_id.
      const ruta = `${orgId}/rendicion/firma-${token.slice(0, 12)}-${Date.now()}.png`;
      const { error: errSubida } = await supabase.storage
        .from('firmas')
        .upload(ruta, blob, { contentType: 'image/png', upsert: true });

      if (errSubida) { setError('No se pudo guardar la firma: ' + errSubida.message); return; }

      const { data, error: errRpc } = await supabase.rpc('rendir_cuentas_publica', {
        p_token: token,
        p_informe: informe,
        p_firma: ruta,
      });

      if (errRpc) { setError(errRpc.message); return; }
      const r = data as { ok: boolean; error?: string };
      if (!r.ok) { setError(r.error ?? 'No se pudo registrar.'); return; }

      setListo(true);
    });
  }

  if (listo) {
    return (
      <main style={s.pagina}>
        <div style={s.caja}>
          <div style={{ ...s.exito, background: `${color}18`, color }}>✓</div>
          <h1 style={s.titulo}>Rendición registrada</h1>
          <p style={s.texto}>
            Gracias, {responsable.nombre}. Su informe y su firma quedaron en el
            acta <strong>{rendicion.codigo}</strong>. Ya puede cerrar esta página.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main style={s.pagina}>
      <div style={{ ...s.caja, textAlign: 'left', maxWidth: 520 }}>
        <header style={{ ...s.cabecera, borderColor: color }}>
          {empresa.logo_url && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={empresa.logo_url} alt="" style={s.logo} />
          )}
          <div style={s.empresa}>{empresa.nombre}</div>
          <div style={s.doc}>
            Rendición de cuentas del SG-SST {rendicion.anio} · {rendicion.codigo}
          </div>
        </header>

        <p style={s.saludo}>
          Buen día, <strong>{responsable.nombre}</strong>
          {responsable.cargo ? `, ${responsable.cargo.toLowerCase()}` : ''}. El
          Sistema de Gestión de SST pide que quienes tienen responsabilidades
          asignadas rindan cuentas <strong>por escrito</strong> una vez al año.
        </p>

        {responsable.responsabilidades && (
          <div style={{ ...s.responsabilidades, borderColor: color }}>
            <span style={s.etiqueta}>Sus responsabilidades</span>
            <p style={s.parrafo}>{responsable.responsabilidades}</p>
          </div>
        )}

        {rendicion.alcance && (
          <p style={s.alcance}>{rendicion.alcance}</p>
        )}

        <label style={s.label}>Qué hizo con ellas durante {rendicion.anio} *</label>
        <textarea
          rows={7}
          value={informe}
          onChange={(e) => setInforme(e.target.value)}
          style={s.textarea}
          placeholder="Escriba en sus propias palabras: qué avanzó, con qué recursos, qué quedó pendiente y por qué."
        />
        <p style={s.ayuda}>
          Lo escribe usted. Nadie puede rendir cuentas en su nombre — eso es lo
          que diferencia esta acta de una lista de asistencia.
        </p>

        <div style={s.zonaFirma}>
          <span style={s.etiquetaFirma}>Su firma</span>
          <LienzoFirma ref={firmaRef} color={color} />
        </div>

        {error && <div style={s.error}>{error}</div>}

        <button onClick={enviar} disabled={pendiente}
          style={{ ...s.boton, background: pendiente ? '#cbd5e1' : color }}>
          {pendiente ? 'Registrando…' : 'Rendir cuentas y firmar'}
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

  responsabilidades: {
    borderLeftWidth: 3, borderLeftStyle: 'solid', background: '#FAFAF8',
    padding: '11px 14px', marginBottom: 14,
  },
  etiqueta: {
    fontSize: 10, fontWeight: 700, color: '#8A929C',
    letterSpacing: .4, textTransform: 'uppercase',
  },
  parrafo: { fontSize: 13, lineHeight: 1.6, color: '#374151', margin: '4px 0 0' },
  alcance: { fontSize: 12, color: '#8A929C', lineHeight: 1.55, margin: '0 0 14px' },

  label: { display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 },
  textarea: {
    width: '100%', padding: '10px 12px', border: '1px solid #E4E4DF',
    borderRadius: 9, fontSize: 13.5, boxSizing: 'border-box',
    fontFamily: 'inherit', lineHeight: 1.6, resize: 'vertical', color: '#14263F',
  },
  ayuda: { fontSize: 11.5, color: '#8A929C', margin: '6px 0 16px', lineHeight: 1.55 },

  zonaFirma: { display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 },
  etiquetaFirma: { fontSize: 12, fontWeight: 600 },

  error: {
    background: '#FDF2F2', color: '#9B1C1C', borderRadius: 8,
    padding: '10px 13px', fontSize: 13, marginBottom: 12,
  },
  boton: {
    width: '100%', color: '#fff', border: 'none', padding: 14,
    borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: 'pointer',
  },
  pie: { fontSize: 11, color: '#8A929C', marginTop: 14, lineHeight: 1.5, textAlign: 'center' },

  exito: {
    width: 46, height: 46, borderRadius: '50%', margin: '0 auto 12px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 25, fontWeight: 700,
  },
  titulo: { fontSize: 19, fontWeight: 700, margin: '0 0 8px' },
  texto: { fontSize: 14, color: '#5B6470', margin: 0, lineHeight: 1.65 },
};
