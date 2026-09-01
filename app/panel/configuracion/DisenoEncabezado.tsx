'use client';

/**
 * DISEÑO DEL ENCABEZADO DE LOS DOCUMENTOS
 * ---------------------------------------------------------------
 * Cada empresa cliente suele tener aprobado su propio formato. Se
 * elige entre tres plantillas, no se maqueta libremente: el consultor
 * no quiere diseñar, quiere parecerse al formato que su cliente ya
 * tiene aprobado.
 *
 * La vista previa es un esquema, no el PDF: basta para decidir, y
 * generar el documento real en cada clic sería lento y caro.
 */
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { guardarDisenoEncabezado } from '@/lib/acciones-empresas';

type Config = {
  plantilla: 'linea' | 'tabla' | 'lateral';
  logo_posicion: 'izquierda' | 'centro' | 'derecha';
  mostrar_nit: boolean;
  mostrar_direccion: boolean;
};

const ESTANDAR: Config = {
  plantilla: 'linea',
  logo_posicion: 'centro',
  mostrar_nit: true,
  mostrar_direccion: true,
};

const PLANTILLAS: Array<{ v: Config['plantilla']; t: string; d: string }> = [
  { v: 'linea', t: 'Línea', d: 'Logo, título y una línea de control. Es el estándar.' },
  { v: 'tabla', t: 'Tabla', d: 'Tres celdas: logo · título · control documental. La más usada en SG-SST.' },
  { v: 'lateral', t: 'Membrete lateral', d: 'Logo a un lado y los datos al otro.' },
];

export default function DisenoEncabezado({
  empresaId,
  configActual,
  puedePersonalizar,
  nombrePlan,
  empresaNombre,
  color,
  esAdmin,
}: {
  empresaId: string;
  configActual: Record<string, unknown>;
  /** Lo decide el plan contratado; el servidor lo vuelve a comprobar. */
  puedePersonalizar: boolean;
  nombrePlan: string;
  empresaNombre: string;
  color: string;
  esAdmin: boolean;
}) {
  const router = useRouter();
  const [pendiente, startTransition] = useTransition();
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  const [c, setC] = useState<Config>({ ...ESTANDAR, ...(configActual as Partial<Config>) });

  const bloqueado = !puedePersonalizar || !esAdmin;

  function guardar() {
    startTransition(async () => {
      const r = await guardarDisenoEncabezado(empresaId, c);
      setAviso({ tipo: r.ok ? 'ok' : 'error', texto: r.mensaje });
      if (r.ok) router.refresh();
    });
  }

  return (
    <section style={e.card}>
      <div style={e.cabecera}>
        <div>
          <h2 style={e.h2}>Diseño del encabezado</h2>
          <p style={e.sub}>
            Cómo se ve la parte superior de las actas de {empresaNombre}.
          </p>
        </div>
        {!puedePersonalizar && (
          <span style={e.candado}>Plan {nombrePlan} · encabezado estándar</span>
        )}
      </div>

      {!puedePersonalizar && (
        <p style={e.nota}>
          Tu plan usa el encabezado estándar para todos los documentos.
          Diseñar un encabezado propio por empresa está disponible desde el
          plan Pro.
        </p>
      )}

      {aviso && (
        <div style={{
          ...e.aviso,
          background: aviso.tipo === 'ok' ? 'var(--bien-fondo)' : 'var(--mal-fondo)',
          color: aviso.tipo === 'ok' ? 'var(--bien)' : 'var(--mal)',
        }}>
          {aviso.texto}
        </div>
      )}

      <div style={e.plantillas}>
        {PLANTILLAS.map((p) => {
          const activa = c.plantilla === p.v;
          return (
            <button
              key={p.v}
              onClick={() => !bloqueado && setC({ ...c, plantilla: p.v })}
              disabled={bloqueado}
              style={{
                ...e.plantilla,
                borderColor: activa ? color : 'var(--borde-fuerte)',
                background: activa ? '#F8FAFC' : '#fff',
                cursor: bloqueado ? 'not-allowed' : 'pointer',
                opacity: bloqueado && !activa ? 0.55 : 1,
              }}
            >
              <Vista tipo={p.v} color={color} c={c} />
              <span style={{ ...e.plantillaNombre, color: activa ? color : '#14263F' }}>
                {p.t}
              </span>
              <span style={e.plantillaDesc}>{p.d}</span>
            </button>
          );
        })}
      </div>

      <div style={e.opciones}>
        {c.plantilla !== 'tabla' && (
          <div>
            <label style={e.label}>Posición del logo</label>
            <select
              value={c.logo_posicion}
              disabled={bloqueado}
              onChange={(ev) => setC({ ...c, logo_posicion: ev.target.value as Config['logo_posicion'] })}
              style={e.input}
            >
              <option value="izquierda">Izquierda</option>
              {c.plantilla === 'linea' && <option value="centro">Centro</option>}
              <option value="derecha">Derecha</option>
            </select>
          </div>
        )}

        <div style={e.casillas}>
          <Casilla
            marcada={c.mostrar_nit} bloqueada={bloqueado}
            onCambio={(v) => setC({ ...c, mostrar_nit: v })}
            texto="Mostrar el NIT de la empresa"
          />
          <Casilla
            marcada={c.mostrar_direccion} bloqueada={bloqueado}
            onCambio={(v) => setC({ ...c, mostrar_direccion: v })}
            texto="Mostrar la dirección"
          />
        </div>
      </div>

      <p style={e.congelado}>
        El diseño se aplica a los documentos que emitas <strong>desde ahora</strong>.
        Las actas ya emitidas conservan el encabezado con el que se firmaron.
      </p>

      {!bloqueado && (
        <button
          onClick={guardar}
          disabled={pendiente}
          style={{ ...e.btn, background: pendiente ? 'var(--borde-fuerte)' : color }}
        >
          {pendiente ? 'Guardando…' : 'Guardar diseño'}
        </button>
      )}
    </section>
  );
}

function Casilla({
  marcada, bloqueada, onCambio, texto,
}: {
  marcada: boolean; bloqueada: boolean;
  onCambio: (v: boolean) => void; texto: string;
}) {
  return (
    <label style={{ ...e.casilla, cursor: bloqueada ? 'not-allowed' : 'pointer' }}>
      <input
        type="checkbox"
        checked={marcada}
        disabled={bloqueada}
        onChange={(ev) => onCambio(ev.target.checked)}
        style={{ marginRight: 8, width: 14, height: 14 }}
      />
      {texto}
    </label>
  );
}

/** Esquema en miniatura de cada plantilla. */
function Vista({ tipo, color, c }: { tipo: Config['plantilla']; color: string; c: Config }) {
  const barra = (ancho: string, alto = 4, tono = 'var(--borde-fuerte)') => (
    <div style={{ width: ancho, height: alto, background: tono, borderRadius: 1 }} />
  );

  if (tipo === 'tabla') {
    return (
      <div style={{ ...v.marco, flexDirection: 'row', borderColor: color, padding: 0 }}>
        <div style={{ ...v.celda, width: '24%', borderRightWidth: 1, borderRightStyle: 'solid', borderRightColor: color }}>
          <div style={{ ...v.logo, background: color }} />
        </div>
        <div style={{ ...v.celda, width: '50%', borderRightWidth: 1, borderRightStyle: 'solid', borderRightColor: color, gap: 3 }}>
          {barra('80%', 5, color)}
          {barra('55%')}
        </div>
        <div style={{ ...v.celda, width: '26%', alignItems: 'flex-start', gap: 2, padding: 4 }}>
          {barra('90%', 2.5)}
          {barra('70%', 2.5)}
        </div>
      </div>
    );
  }

  if (tipo === 'lateral') {
    const izq = c.logo_posicion !== 'derecha';
    const logo = <div key="l" style={{ ...v.logo, background: color, margin: 0 }} />;
    const texto = (
      <div key="t" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3, alignItems: izq ? 'flex-end' : 'flex-start' }}>
        {barra('70%', 5, color)}
        {barra('50%')}
        {barra('60%', 2.5)}
      </div>
    );
    return (
      <div style={{ ...v.marco, flexDirection: 'row', alignItems: 'center', gap: 8, borderColor: 'transparent', borderBottomColor: color }}>
        {izq ? [logo, texto] : [texto, logo]}
      </div>
    );
  }

  const alinear =
    c.logo_posicion === 'izquierda' ? 'flex-start'
    : c.logo_posicion === 'derecha' ? 'flex-end' : 'center';

  return (
    <div style={{ ...v.marco, alignItems: alinear, gap: 4, borderColor: 'transparent', borderBottomColor: color }}>
      <div style={{ ...v.logo, background: color, margin: 0 }} />
      {barra('70%', 5, color)}
      {barra('85%', 2.5)}
    </div>
  );
}

const v: Record<string, React.CSSProperties> = {
  marco: {
    display: 'flex', flexDirection: 'column', width: '100%', height: 62,
    borderWidth: 1, borderStyle: 'solid', borderRadius: 3,
    padding: 7, justifyContent: 'center', marginBottom: 10,
    boxSizing: 'border-box', overflow: 'hidden',
  },
  celda: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' },
  logo: { width: 22, height: 12, borderRadius: 2, opacity: .85 },
};

const e: Record<string, React.CSSProperties> = {
  card: {
    background: 'var(--superficie)', border: '1px solid var(--borde)',
    borderRadius: 8, padding: 20, marginBottom: 18,
  },
  cabecera: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'flex-start', gap: 12, flexWrap: 'wrap', marginBottom: 14,
  },
  h2: { fontSize: 15, margin: '0 0 3px', fontWeight: 600 },
  sub: { fontSize: 12.5, color: 'var(--texto-suave)', margin: 0 },
  candado: {
    fontSize: 11, background: 'var(--superficie-3)', color: 'var(--texto-tenue)',
    padding: '4px 10px', borderRadius: 8, fontWeight: 600, whiteSpace: 'nowrap',
  },
  nota: {
    fontSize: 12, color: 'var(--ambar)', background: 'var(--ambar-fondo)',
    padding: '10px 12px', borderRadius: 6, margin: '0 0 14px', lineHeight: 1.5,
  },
  aviso: { padding: '10px 12px', borderRadius: 6, fontSize: 12.5, margin: '0 0 14px' },
  plantillas: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))',
    gap: 12, marginBottom: 18,
  },
  plantilla: {
    display: 'flex', flexDirection: 'column', alignItems: 'stretch',
    borderWidth: 1.5, borderStyle: 'solid', borderRadius: 6,
    padding: 12, textAlign: 'left', fontFamily: 'inherit',
  },
  plantillaNombre: { fontSize: 13, fontWeight: 700, marginBottom: 3 },
  plantillaDesc: { fontSize: 11, color: 'var(--texto-suave)', lineHeight: 1.45 },
  opciones: {
    display: 'flex', gap: 24, flexWrap: 'wrap',
    paddingTop: 16, borderTop: '1px solid #F1F1EC',
  },
  label: { display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5 },
  input: {
    padding: '8px 10px', border: '1px solid var(--borde-fuerte)', borderRadius: 4,
    fontSize: 13, fontFamily: 'inherit', minWidth: 150,
  },
  casillas: { display: 'flex', flexDirection: 'column', gap: 8 },
  casilla: { display: 'flex', alignItems: 'center', fontSize: 12.5, color: 'var(--texto)' },
  congelado: {
    fontSize: 11.5, color: 'var(--texto-tenue)', margin: '16px 0 0', lineHeight: 1.55,
  },
  btn: {
    color: 'var(--sobre-marca)', border: 'none', padding: '9px 16px', borderRadius: 4,
    fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
    marginTop: 14,
  },
};
