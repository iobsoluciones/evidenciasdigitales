'use client';

/**
 * Pantalla de firma para un integrante del equipo investigador.
 *
 * Muestra el evento en breve y pide la firma. Nada más: quien abre el
 * enlace no necesita —ni debe— ver el análisis de causas completo para
 * poder firmar que participó.
 */
import { useRef, useState, useTransition } from 'react';
import LienzoFirma, { type LienzoFirmaRef } from '@/app/LienzoFirma';
import { crearClienteNavegador } from '@/lib/supabase/cliente';

const TIPOS: Record<string, string> = {
  accidente: 'Accidente de trabajo',
  incidente: 'Incidente',
  casi_accidente: 'Casi accidente',
  enfermedad: 'Enfermedad laboral',
};

const ROLES: Record<string, string> = {
  responsable_sst: 'Responsable del SG-SST',
  copasst: 'Representante del COPASST',
  jefe_inmediato: 'Jefe inmediato',
  otro: 'Integrante del equipo',
};

export default function FirmaInvestigacion({
  token,
  orgId,
  miembro,
  evento,
  empresa,
}: {
  token: string;
  orgId: string;
  miembro: { nombre: string; cargo: string | null; rol: string; yaFirmo: boolean };
  evento: {
    codigo: string; tipo: string; fecha: string; lugar: string | null;
    descripcion: string; trabajador: string | null; cerrado: boolean;
  };
  empresa: { nombre: string; logo_url: string | null; color: string };
}) {
  const supabase = crearClienteNavegador();
  const firmaRef = useRef<LienzoFirmaRef>(null);
  const [pendiente, startTransition] = useTransition();
  const [error, setError] = useState('');
  const [listo, setListo] = useState(miembro.yaFirmo);

  const color = empresa.color ?? '#14263F';
  const fecha = new Date(evento.fecha).toLocaleString('es-CO', {
    dateStyle: 'long', timeStyle: 'short',
  });

  function firmar() {
    setError('');
    startTransition(async () => {
      if (!firmaRef.current?.tieneFirma()) {
        setError('Dibuja tu firma antes de continuar.');
        return;
      }
      const blob = await firmaRef.current.obtenerBlob();
      if (!blob) { setError('No se pudo leer la firma.'); return; }

      // Toda ruta de Storage empieza por org_id: lo exige la política
      // de lectura del bucket privado.
      const ruta = `${orgId}/eventos/firma-${token.slice(0, 12)}-${Date.now()}.png`;
      const { error: errSubida } = await supabase.storage
        .from('firmas')
        .upload(ruta, blob, { contentType: 'image/png', upsert: true });

      if (errSubida) { setError('No se pudo guardar la firma: ' + errSubida.message); return; }

      const { data, error: errRpc } = await supabase.rpc('firmar_evento_publica', {
        p_token: token,
        p_firma: ruta,
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
            Gracias, {miembro.nombre}. Su firma quedó asociada a la investigación
            del evento <strong>{evento.codigo}</strong>. Ya puede cerrar esta página.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main style={s.pagina}>
      <div style={{ ...s.caja, textAlign: 'left', maxWidth: 480 }}>
        <header style={{ ...s.cabecera, borderColor: color }}>
          {empresa.logo_url && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={empresa.logo_url} alt="" style={s.logo} />
          )}
          <div style={s.empresa}>{empresa.nombre}</div>
          <div style={s.doc}>Investigación de evento · {evento.codigo}</div>
        </header>

        <p style={s.saludo}>
          Buen día, <strong>{miembro.nombre}</strong>. Usted participa como{' '}
          <strong>{ROLES[miembro.rol] ?? 'integrante del equipo'}</strong> en la
          investigación del siguiente evento.
        </p>

        <div style={s.datos}>
          <Dato e="Clasificación" v={TIPOS[evento.tipo] ?? evento.tipo} />
          <Dato e="Fecha" v={fecha} />
          {evento.lugar && <Dato e="Lugar" v={evento.lugar} />}
          {evento.trabajador && <Dato e="Trabajador" v={evento.trabajador} />}
        </div>

        <div style={{ ...s.descripcion, borderColor: color }}>{evento.descripcion}</div>

        <p style={s.aviso}>
          Al firmar deja constancia de que participó en la investigación de este
          evento, conforme a la Resolución 1401 de 2007.
        </p>

        <div style={s.zonaFirma}>
          <span style={s.etiquetaFirma}>Su firma</span>
          <LienzoFirma ref={firmaRef} color={color} />
        </div>

        {error && <div style={s.error}>{error}</div>}

        <button
          onClick={firmar}
          disabled={pendiente}
          style={{ ...s.boton, background: pendiente ? '#cbd5e1' : color }}
        >
          {pendiente ? 'Registrando…' : 'Firmar'}
        </button>

        <p style={s.pie}>
          Este enlace es personal y deja de funcionar apenas usted firme.
        </p>
      </div>
    </main>
  );
}

function Dato({ e, v }: { e: string; v: string }) {
  return (
    <div style={s.dato}>
      <span style={s.datoE}>{e}</span>
      <span style={s.datoV}>{v}</span>
    </div>
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

  saludo: { fontSize: 14, lineHeight: 1.65, margin: '0 0 16px' },

  datos: {
    display: 'grid', gap: 1, background: '#E4E4DF',
    border: '1px solid #E4E4DF', borderRadius: 9, overflow: 'hidden', marginBottom: 14,
  },
  dato: { background: '#F7F7F4', padding: '9px 12px', display: 'flex', flexDirection: 'column', gap: 2 },
  datoE: { fontSize: 10, color: '#8A929C', textTransform: 'uppercase', letterSpacing: .4 },
  datoV: { fontSize: 13.5, fontWeight: 600 },

  descripcion: {
    borderLeftWidth: 3, borderLeftStyle: 'solid', background: '#FAFAF8',
    padding: '11px 14px', fontSize: 13.5, lineHeight: 1.6,
    color: '#374151', marginBottom: 16, textAlign: 'left',
  },
  aviso: { fontSize: 12, color: '#5B6470', lineHeight: 1.6, margin: '0 0 16px' },

  zonaFirma: { display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 },
  etiquetaFirma: { fontSize: 12, fontWeight: 600, textAlign: 'left' },

  error: {
    background: '#FDF2F2', color: '#9B1C1C', borderRadius: 8,
    padding: '10px 13px', fontSize: 13, marginBottom: 12, textAlign: 'left',
  },
  boton: {
    width: '100%', color: '#fff', border: 'none', padding: 14,
    borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: 'pointer',
  },
  pie: { fontSize: 11, color: '#8A929C', marginTop: 14, lineHeight: 1.5 },

  exito: {
    width: 46, height: 46, borderRadius: '50%', margin: '0 auto 12px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 25, fontWeight: 700,
  },
  titulo: { fontSize: 19, fontWeight: 700, margin: '0 0 8px' },
  texto: { fontSize: 14, color: '#5B6470', margin: 0, lineHeight: 1.65 },
};
