'use client';

/**
 * Firma del acta de conformación por un integrante del comité.
 *
 * Se le muestra CON QUIÉNES queda conformado el comité: está firmando
 * que acepta ser parte de ese cuerpo, no un papel suelto. Ocultarle la
 * lista sería pedirle que acepte un cargo sin saber junto a quién.
 */
import { useRef, useState, useTransition } from 'react';
import LienzoFirma, { type LienzoFirmaRef } from '@/app/LienzoFirma';
import { crearClienteNavegador } from '@/lib/supabase/cliente';

const TIPOS: Record<string, string> = {
  copasst: 'COPASST',
  vigia: 'Vigía en SST',
  convivencia: 'Comité de Convivencia Laboral',
  brigada: 'Brigada de emergencia',
};

const ROLES: Record<string, string> = {
  presidente: 'Presidente',
  secretario: 'Secretario',
  integrante: 'Integrante',
  jefe: 'Jefe de brigada',
  brigadista: 'Brigadista',
};

const FRENTES: Record<string, string> = {
  primeros_auxilios: 'Primeros auxilios',
  incendios: 'Control de incendios',
  evacuacion: 'Evacuación y rescate',
};

export default function FirmaComite({
  token,
  orgId,
  miembro,
  comite,
  integrantes,
  empresa,
}: {
  token: string;
  orgId: string;
  miembro: {
    nombre: string; cargo: string | null; parte: string;
    suplente: boolean; rol: string; frente: string | null; yaFirmo: boolean;
  };
  comite: {
    tipo: string; codigo: string;
    periodo_inicio: string; periodo_fin: string;
    fecha_conformacion: string | null;
    lugar: string | null; forma_eleccion: string | null; cerrada: boolean;
  };
  integrantes: Array<{
    nombre: string; cargo: string | null;
    parte: string; suplente: boolean; rol: string;
  }>;
  empresa: { nombre: string; logo_url: string | null; color: string };
}) {
  const supabase = crearClienteNavegador();
  const firmaRef = useRef<LienzoFirmaRef>(null);
  const [pendiente, startTransition] = useTransition();
  const [error, setError] = useState('');
  const [listo, setListo] = useState(miembro.yaFirmo);

  const color = empresa.color ?? '#14263F';
  const fecha = (v: string | null) =>
    v ? new Date(v + 'T12:00:00').toLocaleDateString('es-CO', {
      day: '2-digit', month: 'long', year: 'numeric',
    }) : '—';

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
      const ruta = `${orgId}/comites/firma-${token.slice(0, 12)}-${Date.now()}.png`;
      const { error: errSubida } = await supabase.storage
        .from('firmas')
        .upload(ruta, blob, { contentType: 'image/png', upsert: true });

      if (errSubida) { setError('No se pudo guardar la firma: ' + errSubida.message); return; }

      const { data, error: errRpc } = await supabase.rpc('firmar_comite_publica', {
        p_token: token, p_firma: ruta,
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
            Gracias, {miembro.nombre}. Su firma quedó en el acta de conformación{' '}
            <strong>{comite.codigo}</strong>. Ya puede cerrar esta página.
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
          <div style={s.doc}>
            Acta de conformación · {TIPOS[comite.tipo] ?? comite.tipo} · {comite.codigo}
          </div>
        </header>

        <p style={s.saludo}>
          Buen día, <strong>{miembro.nombre}</strong>. Usted fue designado como{' '}
          <strong>
            {ROLES[miembro.rol] ?? miembro.rol}
            {miembro.frente ? ` de ${FRENTES[miembro.frente] ?? miembro.frente}` : ''}
          </strong>
          {miembro.parte !== 'brigada' && (
            <>
              {', '}
              {miembro.suplente ? 'suplente' : 'principal'}
              {' en representación de '}
              {miembro.parte === 'empleador' ? 'el empleador' : 'los trabajadores'}
            </>
          )}
          .
        </p>

        <div style={s.datos}>
          <Dato e="Periodo" v={`${fecha(comite.periodo_inicio)} a ${fecha(comite.periodo_fin)}`} />
          {comite.fecha_conformacion && (
            <Dato e="Fecha de conformación" v={fecha(comite.fecha_conformacion)} />
          )}
          {comite.lugar && <Dato e="Lugar" v={comite.lugar} />}
        </div>

        {comite.forma_eleccion && (
          <div style={{ ...s.eleccion, borderColor: color }}>
            <span style={s.etiqueta}>Forma de elección</span>
            <p style={s.parrafo}>{comite.forma_eleccion}</p>
          </div>
        )}

        <div style={s.seccion}>Queda conformado así</div>
        <div style={s.lista}>
          {integrantes.map((x, i) => (
            <div key={i} style={s.integrante}>
              <span style={s.intNombre}>{x.nombre}</span>
              <span style={s.intMeta}>
                {ROLES[x.rol] ?? x.rol}
                {x.parte !== 'brigada' && (
                  ` · ${x.parte === 'empleador' ? 'empleador' : 'trabajadores'}` +
                  ` · ${x.suplente ? 'suplente' : 'principal'}`
                )}
              </span>
            </div>
          ))}
        </div>

        <p style={s.aviso}>
          Al firmar deja constancia de que acepta hacer parte de este comité durante
          el periodo indicado.
        </p>

        <div style={s.zonaFirma}>
          <span style={s.etiquetaFirma}>Su firma</span>
          <LienzoFirma ref={firmaRef} color={color} />
        </div>

        {error && <div style={s.error}>{error}</div>}

        <button onClick={firmar} disabled={pendiente}
          style={{ ...s.boton, background: pendiente ? '#cbd5e1' : color }}>
          {pendiente ? 'Registrando…' : 'Firmar el acta'}
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

  saludo: { fontSize: 14, lineHeight: 1.65, margin: '0 0 14px' },

  datos: {
    display: 'grid', gap: 1, background: '#E4E4DF',
    border: '1px solid #E4E4DF', borderRadius: 9, overflow: 'hidden', marginBottom: 12,
  },
  dato: { background: '#F7F7F4', padding: '9px 12px', display: 'flex', flexDirection: 'column', gap: 2 },
  datoE: { fontSize: 10, color: '#8A929C', textTransform: 'uppercase', letterSpacing: .4 },
  datoV: { fontSize: 13, fontWeight: 600 },

  eleccion: {
    borderLeftWidth: 3, borderLeftStyle: 'solid', background: '#FAFAF8',
    padding: '10px 13px', marginBottom: 14,
  },
  etiqueta: {
    fontSize: 10, fontWeight: 700, color: '#8A929C',
    letterSpacing: .4, textTransform: 'uppercase',
  },
  parrafo: { fontSize: 13, lineHeight: 1.6, color: '#374151', margin: '3px 0 0' },

  seccion: {
    fontSize: 11, fontWeight: 700, color: '#8A929C', letterSpacing: .5,
    textTransform: 'uppercase', marginBottom: 8,
  },
  lista: {
    border: '1px solid #E4E4DF', borderRadius: 9,
    marginBottom: 16, maxHeight: 220, overflowY: 'auto',
  },
  integrante: {
    padding: '9px 12px', borderBottom: '1px solid #F0F0EC',
    display: 'flex', flexDirection: 'column', gap: 2,
  },
  intNombre: { fontSize: 12.5, fontWeight: 600 },
  intMeta: { fontSize: 11, color: '#8A929C' },

  aviso: { fontSize: 12, color: '#5B6470', lineHeight: 1.6, margin: '0 0 16px' },

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
  pie: { fontSize: 11, color: '#8A929C', marginTop: 14, textAlign: 'center' },

  exito: {
    width: 46, height: 46, borderRadius: '50%', margin: '0 auto 12px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 25, fontWeight: 700,
  },
  titulo: { fontSize: 19, fontWeight: 700, margin: '0 0 8px' },
  texto: { fontSize: 14, color: '#5B6470', margin: 0, lineHeight: 1.65 },
};
