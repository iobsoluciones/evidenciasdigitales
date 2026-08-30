'use client';

/**
 * Pantalla de firma para un evaluador del simulacro.
 *
 * Muestra los resultados del ejercicio —lo que se está certificando— y
 * pide la firma. Nada más: quien abre el enlace no necesita ver el resto
 * del SG-SST para dejar constancia de que evaluó el simulacro.
 */
import { useRef, useState, useTransition } from 'react';
import LienzoFirma, { type LienzoFirmaRef } from '@/app/LienzoFirma';
import { crearClienteNavegador } from '@/lib/supabase/cliente';

const TIPOS: Record<string, string> = {
  evacuacion: 'Evacuación',
  incendio: 'Conato de incendio',
  sismo: 'Sismo',
  primeros_auxilios: 'Primeros auxilios',
  derrame: 'Derrame de químicos',
  otro: 'Otro',
};

const ROLES: Record<string, string> = {
  coordinador: 'Coordinador del simulacro',
  evaluador: 'Evaluador',
  brigadista: 'Brigadista',
  observador_arl: 'Observador de la ARL',
};

function tiempoLegible(seg: number | null): string {
  if (seg === null || seg === undefined) return '—';
  if (seg < 60) return `${seg} s`;
  const m = Math.floor(seg / 60);
  const r = seg % 60;
  return r === 0 ? `${m} min` : `${m} min ${r} s`;
}

export default function FirmaSimulacro({
  token,
  orgId,
  evaluador,
  simulacro,
  empresa,
}: {
  token: string;
  orgId: string;
  evaluador: { nombre: string; cargo: string | null; rol: string; yaFirmo: boolean };
  simulacro: {
    codigo: string; tipo: string; fecha: string;
    alcance: string | null; punto_encuentro: string | null;
    participantes: number; evacuados: number;
    tiempo: number | null; cerrado: boolean;
  };
  empresa: { nombre: string; logo_url: string | null; color: string };
}) {
  const supabase = crearClienteNavegador();
  const firmaRef = useRef<LienzoFirmaRef>(null);
  const [pendiente, startTransition] = useTransition();
  const [error, setError] = useState('');
  const [listo, setListo] = useState(evaluador.yaFirmo);

  const color = empresa.color ?? '#14263F';
  const fecha = new Date(simulacro.fecha + 'T12:00:00').toLocaleDateString('es-CO', {
    day: '2-digit', month: 'long', year: 'numeric',
  });
  const cobertura = simulacro.participantes > 0
    ? `${Math.round((simulacro.evacuados / simulacro.participantes) * 100)}%`
    : '—';

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
      const ruta = `${orgId}/simulacros/firma-${token.slice(0, 12)}-${Date.now()}.png`;
      const { error: errSubida } = await supabase.storage
        .from('firmas')
        .upload(ruta, blob, { contentType: 'image/png', upsert: true });

      if (errSubida) { setError('No se pudo guardar la firma: ' + errSubida.message); return; }

      const { data, error: errRpc } = await supabase.rpc('firmar_simulacro_publica', {
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
            Gracias, {evaluador.nombre}. Su firma quedó asociada al acta del
            simulacro <strong>{simulacro.codigo}</strong>. Ya puede cerrar esta página.
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
          <div style={s.doc}>Acta de simulacro · {simulacro.codigo}</div>
        </header>

        <p style={s.saludo}>
          Buen día, <strong>{evaluador.nombre}</strong>. Usted participó como{' '}
          <strong>{ROLES[evaluador.rol] ?? 'evaluador'}</strong> en el siguiente
          simulacro.
        </p>

        <div style={s.datos}>
          <Dato e="Tipo" v={TIPOS[simulacro.tipo] ?? simulacro.tipo} />
          <Dato e="Fecha" v={fecha} />
          {simulacro.alcance && <Dato e="Alcance" v={simulacro.alcance} />}
          {simulacro.punto_encuentro && (
            <Dato e="Punto de encuentro" v={simulacro.punto_encuentro} />
          )}
        </div>

        <div style={s.metricas}>
          <Metrica n={String(simulacro.participantes)} t="Participantes" color={color} />
          <Metrica n={String(simulacro.evacuados)} t="Evacuados" color={color} />
          <Metrica n={cobertura} t="Cobertura" color={color} />
          <Metrica n={tiempoLegible(simulacro.tiempo)} t="Tiempo" color={color} />
        </div>

        <p style={s.aviso}>
          Al firmar deja constancia de que evaluó este simulacro y de que los
          resultados anotados corresponden a lo observado.
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

function Metrica({ n, t, color }: { n: string; t: string; color: string }) {
  return (
    <div style={s.metrica}>
      <span style={{ ...s.metricaN, color }}>{n}</span>
      <span style={s.metricaT}>{t}</span>
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
    border: '1px solid #E4E4DF', borderRadius: 9, overflow: 'hidden', marginBottom: 12,
  },
  dato: { background: '#F7F7F4', padding: '9px 12px', display: 'flex', flexDirection: 'column', gap: 2 },
  datoE: { fontSize: 10, color: '#8A929C', textTransform: 'uppercase', letterSpacing: .4 },
  datoV: { fontSize: 13.5, fontWeight: 600 },

  metricas: {
    display: 'grid', gap: 8, marginBottom: 16,
    gridTemplateColumns: 'repeat(auto-fit,minmax(88px,1fr))',
  },
  metrica: {
    border: '1px solid #E4E4DF', borderRadius: 9, padding: '8px 6px',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
  },
  metricaN: { fontSize: 15, fontWeight: 700, fontVariantNumeric: 'tabular-nums' },
  metricaT: { fontSize: 10, color: '#8A929C' },

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
