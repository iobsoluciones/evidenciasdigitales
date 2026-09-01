'use client';

/**
 * Firma de un permiso de trabajo de alto riesgo.
 *
 * A diferencia de las otras pantallas de firma, aquí SÍ se muestra la
 * lista de verificación completa: quien firma un permiso está dando fe
 * de que esas condiciones se cumplen. Ocultársela y pedirle la firma
 * sería pedirle que firme en blanco.
 */
import { useRef, useState, useTransition } from 'react';
import LienzoFirma, { type LienzoFirmaRef } from '@/app/LienzoFirma';
import { crearClienteNavegador } from '@/lib/supabase/cliente';

const TIPOS: Record<string, string> = {
  alturas: 'Trabajo en alturas',
  espacios_confinados: 'Espacios confinados',
  trabajo_caliente: 'Trabajo en caliente',
  energias: 'Energías peligrosas',
  izaje: 'Izaje de cargas',
  excavacion: 'Excavación',
};

const ROLES: Record<string, string> = {
  autoriza: 'quien autoriza el permiso',
  ejecuta: 'ejecutante de la tarea',
  vigia: 'vigía / ayudante de seguridad',
  coordinador_alturas: 'coordinador de trabajo en alturas',
};

const RESULTADOS: Record<string, { t: string; color: string }> = {
  cumple: { t: 'Cumple', color: 'var(--bien)' },
  no_cumple: { t: 'No cumple', color: 'var(--mal)' },
  no_aplica: { t: 'No aplica', color: 'var(--texto-suave)' },
  sin_verificar: { t: 'Sin verificar', color: 'var(--aviso)' },
};

export default function FirmaPermiso({
  token,
  orgId,
  participante,
  permiso,
  requisitos,
  empresa,
}: {
  token: string;
  orgId: string;
  participante: { nombre: string; cargo: string | null; rol: string; yaFirmo: boolean };
  permiso: {
    codigo: string; tipo: string; fecha: string;
    hora_inicio: string; hora_fin: string;
    lugar: string | null; descripcion: string; estado: string;
  };
  requisitos: Array<{ texto: string; obligatorio: boolean; resultado: string }>;
  empresa: { nombre: string; logo_url: string | null; color: string };
}) {
  const supabase = crearClienteNavegador();
  const firmaRef = useRef<LienzoFirmaRef>(null);
  const [pendiente, startTransition] = useTransition();
  const [error, setError] = useState('');
  const [listo, setListo] = useState(participante.yaFirmo);

  const color = empresa.color ?? '#14263F';
  const fecha = new Date(permiso.fecha + 'T12:00:00').toLocaleDateString('es-CO', {
    day: '2-digit', month: 'long', year: 'numeric',
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

      // Toda ruta de Storage empieza por org_id.
      const ruta = `${orgId}/permisos/firma-${token.slice(0, 12)}-${Date.now()}.png`;
      const { error: errSubida } = await supabase.storage
        .from('firmas')
        .upload(ruta, blob, { contentType: 'image/png', upsert: true });

      if (errSubida) { setError('No se pudo guardar la firma: ' + errSubida.message); return; }

      const { data, error: errRpc } = await supabase.rpc('firmar_permiso_publica', {
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
            Gracias, {participante.nombre}. Su firma quedó en el permiso{' '}
            <strong>{permiso.codigo}</strong>. Ya puede cerrar esta página.
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
          <div style={s.doc}>Permiso de alto riesgo · {permiso.codigo}</div>
        </header>

        <p style={s.saludo}>
          Buen día, <strong>{participante.nombre}</strong>. Usted figura como{' '}
          <strong>{ROLES[participante.rol] ?? participante.rol}</strong> en el
          siguiente permiso.
        </p>

        <div style={s.datos}>
          <Dato e="Tarea" v={TIPOS[permiso.tipo] ?? permiso.tipo} />
          <Dato e="Fecha" v={fecha} />
          <Dato e="Horario"
            v={`${permiso.hora_inicio.slice(0, 5)} a ${permiso.hora_fin.slice(0, 5)}`} />
          {permiso.lugar && <Dato e="Lugar" v={permiso.lugar} />}
        </div>

        <div style={{ ...s.descripcion, borderColor: color }}>{permiso.descripcion}</div>

        <div style={s.listaTitulo}>Lo que se verificó</div>
        <div style={s.lista}>
          {requisitos.map((r, i) => {
            const res = RESULTADOS[r.resultado] ?? RESULTADOS.sin_verificar;
            return (
              <div key={i} style={s.requisito}>
                <span style={{ ...s.resultado, color: res.color }}>{res.t}</span>
                <span style={s.reqTexto}>
                  {r.texto}
                  {r.obligatorio && <span style={s.norma}> · NORMA</span>}
                </span>
              </div>
            );
          })}
        </div>

        <p style={s.avisoTexto}>
          Al firmar deja constancia de que conoce la tarea, las condiciones
          verificadas y los controles definidos. El permiso solo autoriza el
          trabajo dentro del horario indicado.
        </p>

        <div style={s.zonaFirma}>
          <span style={s.etiquetaFirma}>Su firma</span>
          <LienzoFirma ref={firmaRef} color={color} />
        </div>

        {error && <div style={s.error}>{error}</div>}

        <button onClick={firmar} disabled={pendiente}
          style={{ ...s.boton, background: pendiente ? 'var(--borde-fuerte)' : color }}>
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

  datos: {
    display: 'grid', gap: 1, background: 'var(--borde)',
    border: '1px solid var(--borde)', borderRadius: 8, overflow: 'hidden', marginBottom: 14,
  },
  dato: { background: 'var(--fondo)', padding: '9px 12px', display: 'flex', flexDirection: 'column', gap: 2 },
  datoE: { fontSize: 10, color: 'var(--texto-tenue)', textTransform: 'uppercase', letterSpacing: .4 },
  datoV: { fontSize: 13.5, fontWeight: 600 },

  descripcion: {
    borderLeftWidth: 3, borderLeftStyle: 'solid', background: 'var(--superficie-2)',
    padding: '11px 14px', fontSize: 13.5, lineHeight: 1.6,
    color: 'var(--texto-suave)', marginBottom: 16,
  },

  listaTitulo: {
    fontSize: 11, fontWeight: 700, color: 'var(--texto-tenue)', letterSpacing: .5,
    textTransform: 'uppercase', marginBottom: 8,
  },
  lista: {
    border: '1px solid var(--borde)', borderRadius: 8,
    marginBottom: 16, maxHeight: 260, overflowY: 'auto',
  },
  requisito: {
    display: 'flex', gap: 9, alignItems: 'flex-start',
    padding: '9px 12px', borderBottom: '1px solid var(--superficie-3)',
  },
  resultado: { fontSize: 11, fontWeight: 700, width: 66, flexShrink: 0 },
  reqTexto: { fontSize: 12, lineHeight: 1.45, color: 'var(--texto-suave)' },
  norma: { fontSize: 9.5, fontWeight: 700, color: 'var(--mal)', letterSpacing: .3 },

  avisoTexto: { fontSize: 12, color: 'var(--texto-suave)', lineHeight: 1.6, margin: '0 0 16px' },

  zonaFirma: { display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 },
  etiquetaFirma: { fontSize: 12, fontWeight: 600 },

  error: {
    background: 'var(--mal-fondo)', color: 'var(--mal)', borderRadius: 8,
    padding: '10px 13px', fontSize: 13, marginBottom: 12,
  },
  boton: {
    width: '100%', color: 'var(--sobre-marca)', border: 'none', padding: 14,
    borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: 'pointer',
  },
  pie: { fontSize: 11, color: 'var(--texto-tenue)', marginTop: 14, lineHeight: 1.5, textAlign: 'center' },

  exito: {
    width: 46, height: 46, borderRadius: '50%', margin: '0 auto 12px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 25, fontWeight: 700,
  },
  titulo: { fontSize: 19, fontWeight: 700, margin: '0 0 8px' },
  texto: { fontSize: 14, color: 'var(--texto-suave)', margin: 0, lineHeight: 1.65 },
};
