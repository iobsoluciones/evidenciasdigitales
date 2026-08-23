'use client';

/**
 * TARJETAS DE LA CARTERA
 * ---------------------------------------------------------------
 * Cada tarjeta responde tres preguntas de un vistazo: cuánta actividad
 * tiene la empresa, qué participación lleva, y si hay algo abierto
 * ahora mismo.
 */
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { crearEmpresa, seleccionarEmpresa } from '@/lib/acciones-empresas';
import type { EmpresaResumen } from './page';

const VACIO = {
  nombre: '', slug: '', nit: '', sector: '',
  ciudad: '', contacto: '', correo: '', telefono: '',
};

export default function TarjetasEmpresas({
  empresas, puedeAgregar, usadas, tope, plan,
}: {
  empresas: EmpresaResumen[];
  puedeAgregar: boolean;
  usadas: number;
  tope: number | null;
  plan: string;
}) {
  const router = useRouter();
  const [pendiente, startTransition] = useTransition();
  const [abierto, setAbierto] = useState(false);
  const [f, setF] = useState(VACIO);
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  /** El identificador se sugiere a partir del nombre, sin tildes. */
  function alEscribirNombre(v: string) {
    const slug = v.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .trim().replace(/\s+/g, '-').slice(0, 40);
    setF((p) => ({ ...p, nombre: v, slug }));
  }

  function guardar() {
    startTransition(async () => {
      const r = await crearEmpresa(f);
      setAviso({ tipo: r.ok ? 'ok' : 'error', texto: r.mensaje });
      if (r.ok) {
        setF(VACIO);
        setAbierto(false);
        router.refresh();
      }
    });
  }

  function entrar(id: string) {
    startTransition(async () => {
      await seleccionarEmpresa(id);
      router.push('/panel/capacitaciones');
    });
  }

  const fmt = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString('es-CO', { dateStyle: 'medium' }) : 'Sin actividad';

  return (
    <>
      <div style={s.cabecera}>
        <div>
          <h1 style={s.titulo}>Empresas a tu cargo</h1>
          <p style={s.sub}>
            {tope === null
              ? `${usadas} empresas · plan ${plan}, sin límite`
              : `${usadas} de ${tope} empresas · plan ${plan}`}
          </p>
        </div>
        <button
          onClick={() => setAbierto(true)}
          disabled={!puedeAgregar}
          style={{ ...s.btn, ...(puedeAgregar ? {} : s.btnOff) }}
          title={puedeAgregar ? '' : 'Alcanzaste el límite de tu plan'}
        >
          Agregar empresa
        </button>
      </div>

      {aviso && (
        <div style={{
          ...s.aviso,
          background: aviso.tipo === 'ok' ? '#F0FDF4' : '#FDF2F2',
          color: aviso.tipo === 'ok' ? '#166534' : '#9B1C1C',
        }}>
          {aviso.texto}
        </div>
      )}

      {!puedeAgregar && (
        <div style={s.limite}>
          Alcanzaste el límite de {tope} empresas del plan {plan}. Actualiza el
          plan para seguir agregando.
        </div>
      )}

      {empresas.length === 0 ? (
        <div style={s.vacio}>
          <p style={{ fontSize: 15, margin: '0 0 6px', fontWeight: 600 }}>
            Aún no has agregado empresas
          </p>
          <p style={{ fontSize: 13.5, color: '#5B6470', margin: '0 0 18px' }}>
            Registra la primera para empezar a programar sus capacitaciones.
          </p>
          <button onClick={() => setAbierto(true)} style={s.btn}>Agregar la primera</button>
        </div>
      ) : (
        <div style={s.grilla}>
          {empresas.map((e) => {
            const p = e.participacion === null ? null : Number(e.participacion);
            const tono = p === null ? '#8A929C'
                       : p >= 80 ? '#166534' : p >= 50 ? '#92400E' : '#9B1C1C';
            return (
              <article key={e.id} style={s.tarjeta}>
                <div style={{ ...s.franja, background: e.color_primario }} />

                <div style={s.tarjetaCuerpo}>
                  <div style={s.tarjetaCabecera}>
                    {e.logo_url
                      ? <img src={e.logo_url} alt="" style={s.logo} />
                      : <div style={{ ...s.logoVacio, background: e.color_primario }}>
                          {e.nombre.slice(0, 2)}
                        </div>}
                    <div style={{ minWidth: 0 }}>
                      <h2 style={s.nombre}>{e.nombre}</h2>
                      <div style={s.meta}>
                        {e.ciudad ?? 'Sin ciudad'} · {e.nomenclatura ?? 'sin nomenclatura'}
                      </div>
                    </div>
                  </div>

                  {e.activas > 0 && (
                    <div style={s.activa}>
                      {e.activas} capacitación{e.activas !== 1 ? 'es' : ''} abierta ahora
                    </div>
                  )}

                  <dl style={s.datos}>
                    <Dato k="Empleados" v={String(e.empleados ?? 0)} />
                    <Dato k="Capacitaciones" v={String(e.capacitaciones)} />
                    <Dato k="Participantes" v={String(e.participantes)} />
                    <Dato k="Participación" v={p === null ? '—' : `${p}%`} color={tono} />
                  </dl>

                  <div style={s.ultima}>Última: {fmt(e.ultima)}</div>

                  <button onClick={() => entrar(e.id)} disabled={pendiente} style={s.btnEntrar}>
                    Gestionar
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* ---------- Alta de empresa ---------- */}
      {abierto && (
        <div style={s.velo} onClick={(ev) => { if (ev.target === ev.currentTarget) setAbierto(false); }}>
          <div style={s.modal}>
            <h2 style={{ fontSize: 17, margin: '0 0 4px' }}>Agregar empresa</h2>
            <p style={{ fontSize: 12.5, color: '#5B6470', margin: '0 0 18px' }}>
              Podrás configurar su logo y nomenclatura después.
            </p>

            <Campo etiqueta="Nombre" valor={f.nombre} onChange={alEscribirNombre}
              placeholder="Autosnack SAS" mayus />

            <div>
              <label style={s.label}>Identificador</label>
              <div style={{ display: 'flex' }}>
                <span style={s.prefijo}>/r/</span>
                <input
                  value={f.slug}
                  onChange={(e) => setF({ ...f, slug: e.target.value.toLowerCase() })}
                  style={{ ...s.input, borderRadius: '0 6px 6px 0', borderLeft: 'none' }}
                />
              </div>
              <p style={s.ayuda}>
                Va en el enlace que escanean los asistentes de esta empresa. No
                se puede cambiar después.
              </p>
            </div>

            <div style={s.dos}>
              <Campo etiqueta="NIT" valor={f.nit} onChange={(v) => setF({ ...f, nit: v })} />
              <Campo etiqueta="Ciudad" valor={f.ciudad} onChange={(v) => setF({ ...f, ciudad: v })} mayus />
            </div>
            <div style={s.dos}>
              <Campo etiqueta="Sector" valor={f.sector} onChange={(v) => setF({ ...f, sector: v })}
                placeholder="MANUFACTURA" mayus />
              <Campo etiqueta="Contacto" valor={f.contacto} onChange={(v) => setF({ ...f, contacto: v })} mayus />
            </div>
            <div style={s.dos}>
              <Campo etiqueta="Correo" valor={f.correo} onChange={(v) => setF({ ...f, correo: v })} tipo="email" />
              <Campo etiqueta="Teléfono" valor={f.telefono} onChange={(v) => setF({ ...f, telefono: v })} />
            </div>

            {aviso?.tipo === 'error' && (
              <div style={{ ...s.aviso, background: '#FDF2F2', color: '#9B1C1C' }}>{aviso.texto}</div>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
              <button onClick={guardar} disabled={pendiente} style={{ ...s.btn, flex: 1 }}>
                {pendiente ? 'Guardando…' : 'Agregar'}
              </button>
              <button onClick={() => setAbierto(false)} style={{ ...s.btnSec, flex: 1 }}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Dato({ k, v, color }: { k: string; v: string; color?: string }) {
  return (
    <div>
      <dt style={s.datoClave}>{k}</dt>
      <dd style={{ ...s.datoValor, color: color ?? '#14263F' }}>{v}</dd>
    </div>
  );
}

function Campo({
  etiqueta, valor, onChange, placeholder, tipo = 'text', mayus,
}: {
  etiqueta: string; valor: string; onChange: (v: string) => void;
  placeholder?: string; tipo?: string; mayus?: boolean;
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={s.label}>{etiqueta}</label>
      <input
        type={tipo} value={valor} placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        style={{ ...s.input, textTransform: mayus ? 'uppercase' : 'none' }}
      />
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  cabecera: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    gap: 16, flexWrap: 'wrap', marginBottom: 20,
  },
  titulo: { fontSize: 22, margin: '0 0 3px', letterSpacing: -0.4 },
  sub: { fontSize: 13, color: '#5B6470', margin: 0 },

  grilla: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 16 },
  tarjeta: {
    background: '#fff', border: '1px solid #E4E4DF', borderRadius: 8,
    overflow: 'hidden', display: 'flex', flexDirection: 'column',
  },
  franja: { height: 3 },
  tarjetaCuerpo: { padding: 18, display: 'flex', flexDirection: 'column', flex: 1 },
  tarjetaCabecera: { display: 'flex', gap: 11, alignItems: 'center', marginBottom: 14 },
  logo: { width: 38, height: 38, objectFit: 'contain', borderRadius: 4, flexShrink: 0 },
  logoVacio: {
    width: 38, height: 38, borderRadius: 4, color: '#fff', flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 13, fontWeight: 700, letterSpacing: .5,
  },
  nombre: {
    fontSize: 14.5, margin: 0, fontWeight: 600, whiteSpace: 'nowrap',
    overflow: 'hidden', textOverflow: 'ellipsis',
  },
  meta: { fontSize: 11, color: '#8A929C', marginTop: 2 },
  activa: {
    fontSize: 11, color: '#166534', background: '#F0FDF4',
    border: '1px solid #BBF7D0', borderRadius: 4,
    padding: '5px 9px', marginBottom: 12,
  },
  datos: {
    display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8,
    margin: '0 0 12px', paddingTop: 12, borderTop: '1px solid #F0F0EB',
  },
  datoClave: { fontSize: 9.5, textTransform: 'uppercase', letterSpacing: .5, color: '#8A929C', margin: 0 },
  datoValor: { fontSize: 17, fontWeight: 700, margin: '2px 0 0' },
  ultima: { fontSize: 11, color: '#8A929C', marginBottom: 14, flex: 1 },

  btn: {
    background: '#14263F', color: '#fff', border: 'none',
    padding: '10px 18px', borderRadius: 5, fontSize: 13,
    fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
  },
  btnOff: { background: '#C9CED4', cursor: 'not-allowed' },
  btnSec: {
    background: '#fff', color: '#14263F', border: '1px solid #DFDFD8',
    padding: '10px 18px', borderRadius: 5, fontSize: 13,
    fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
  },
  btnEntrar: {
    width: '100%', background: '#F2F4F7', color: '#14263F',
    border: '1px solid #DFDFD8', padding: '9px', borderRadius: 5,
    fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
  },

  vacio: {
    background: '#fff', border: '1px dashed #DFDFD8', borderRadius: 8,
    padding: '48px 24px', textAlign: 'center',
  },
  limite: {
    background: '#FEFCE8', border: '1px solid #FDE68A', color: '#92400E',
    padding: '11px 14px', borderRadius: 6, fontSize: 13, marginBottom: 16,
  },
  aviso: { padding: '10px 14px', borderRadius: 6, fontSize: 13, marginBottom: 16 },

  velo: {
    position: 'fixed', inset: 0, background: 'rgba(20,38,63,.45)', zIndex: 100,
    display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
    padding: '40px 16px', overflowY: 'auto',
  },
  modal: { background: '#fff', borderRadius: 10, padding: 24, width: '100%', maxWidth: 520 },
  dos: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  label: { display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5 },
  input: {
    width: '100%', padding: '9px 11px', border: '1px solid #DFDFD8',
    borderRadius: 6, fontSize: 13, boxSizing: 'border-box', fontFamily: 'inherit',
  },
  prefijo: {
    background: '#F2F4F7', border: '1px solid #DFDFD8', borderRight: 'none',
    borderRadius: '6px 0 0 6px', padding: '9px 10px', fontSize: 13, color: '#5B6470',
  },
  ayuda: { fontSize: 11, color: '#8A929C', margin: '4px 0 12px' },
};
