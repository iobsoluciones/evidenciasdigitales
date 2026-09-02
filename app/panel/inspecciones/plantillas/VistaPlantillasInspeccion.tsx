'use client';

/**
 * BANCO DE LISTAS DE VERIFICACIÓN
 * ---------------------------------------------------------------
 * Las precargadas se marcan como «base». Son punto de partida, no
 * dogma: se editan y se duplican para adaptarlas a cada cliente.
 *
 * Duplicar existe porque un consultor no quiere perder la lista
 * original al ajustarla para una empresa concreta.
 */
import { useState, useMemo, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  sembrarPlantillasBase, duplicarPlantillaInspeccion,
  archivarPlantillaInspeccion,
  type PlantillaInspeccion, type TipoInspeccion,
} from '@/lib/acciones-inspecciones';

const TIPOS: Array<{ v: TipoInspeccion; t: string; nota: string }> = [
  { v: 'planeada', t: 'Planeadas', nota: 'Extintores, botiquines, camillas' },
  { v: 'area', t: 'De área', nota: 'Recorridos por planta o zona' },
  { v: 'equipo', t: 'De equipo', nota: 'Arneses, escaleras, herramienta' },
  { v: 'auditoria', t: 'Auditorías', nota: 'Al sistema de gestión completo' },
];

const PERIODOS: Record<string, string> = {
  diaria: 'Diaria', semanal: 'Semanal', mensual: 'Mensual',
  bimestral: 'Bimestral', trimestral: 'Trimestral',
  semestral: 'Semestral', anual: 'Anual', uso: 'Antes de cada uso',
};

type Vista = 'tarjetas' | 'lista';
type Orden = 'nombre' | 'tipo' | 'criterios' | 'criticos' | 'usada';

const CLAVE_VISTA = 'inspeccion_plantillas_vista';

export default function VistaPlantillasInspeccion({
  plantillas,
  color,
}: {
  plantillas: PlantillaInspeccion[];
  color: string;
}) {
  const router = useRouter();
  const [pendiente, startTransition] = useTransition();
  const [tipo, setTipo] = useState<TipoInspeccion | ''>('');
  const [busqueda, setBusqueda] = useState('');
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  // Dos vistas, como en el inventario: tarjetas para hojear el banco,
  // lista para comparar de un vistazo y ordenar por columna.
  const [vista, setVista] = useState<Vista>('tarjetas');
  const [orden, setOrden] = useState<Orden>('nombre');
  const [descendente, setDescendente] = useState(false);

  // La preferencia se lee tras montar para no romper el render del
  // servidor, que no tiene acceso a localStorage.
  useEffect(() => {
    try {
      const guardada = window.localStorage.getItem(CLAVE_VISTA);
      if (guardada === 'lista' || guardada === 'tarjetas') setVista(guardada);
    } catch { /* modo privado */ }
  }, []);

  function cambiarVista(v: Vista) {
    setVista(v);
    try { window.localStorage.setItem(CLAVE_VISTA, v); } catch { /* modo privado */ }
  }

  function ordenarPor(col: Orden) {
    if (orden === col) setDescendente((d) => !d);
    else { setOrden(col); setDescendente(false); }
  }

  const lista = useMemo(() => {
    const porTipo = tipo ? plantillas.filter((p) => p.tipo === tipo) : plantillas;

    // La busqueda cubre tambien norma y secciones: con once listas base
    // se busca tanto por "extintores" como por "NTC 2885" o por la
    // seccion que se recuerda haber incluido.
    const texto = busqueda.trim().toLowerCase();
    const filtradas = texto
      ? porTipo.filter((p) =>
          [p.nombre, p.norma ?? '', p.descripcion ?? '', ...p.secciones]
            .join(' ').toLowerCase().includes(texto))
      : porTipo;

    const dir = descendente ? -1 : 1;
    const copia = [...filtradas];
    copia.sort((a, b) => {
      switch (orden) {
        case 'criterios': return (a.items - b.items) * dir;
        case 'criticos': return (a.criticos - b.criticos) * dir;
        case 'usada': return (a.veces_usada - b.veces_usada) * dir;
        case 'tipo': return a.tipo.localeCompare(b.tipo) * dir;
        default: return a.nombre.localeCompare(b.nombre) * dir;
      }
    });
    return copia;
  }, [plantillas, tipo, busqueda, orden, descendente]);

  function sembrar() {
    startTransition(async () => {
      const r = await sembrarPlantillasBase();
      setAviso({ tipo: r.ok ? 'ok' : 'error', texto: r.mensaje });
      if (r.ok) router.refresh();
    });
  }

  function duplicar(p: PlantillaInspeccion) {
    startTransition(async () => {
      const r = await duplicarPlantillaInspeccion(p.id);
      setAviso({ tipo: r.ok ? 'ok' : 'error', texto: r.mensaje });
      if (r.ok && r.id) router.push(`/panel/inspecciones/plantillas/${r.id}`);
    });
  }

  function archivar(id: string) {
    startTransition(async () => {
      const r = await archivarPlantillaInspeccion(id);
      setAviso({ tipo: r.ok ? 'ok' : 'error', texto: r.mensaje });
      if (r.ok) router.refresh();
    });
  }

  const conteo = (t: TipoInspeccion) => plantillas.filter((p) => p.tipo === t).length;

  return (
    <>
      <div style={e.controles}>
        <button
          onClick={() => setTipo('')}
          style={{
            ...e.filtro,
            background: tipo === '' ? 'var(--marca)' : 'var(--superficie)',
            color: tipo === '' ? 'var(--sobre-marca)' : 'var(--texto-suave)',
            borderColor: tipo === '' ? 'var(--marca)' : 'var(--borde-fuerte)',
          }}
        >
          Todas ({plantillas.length})
        </button>
        {TIPOS.map((t) => (
          <button
            key={t.v}
            onClick={() => setTipo(t.v)}
            title={t.nota}
            style={{
              ...e.filtro,
              background: tipo === t.v ? 'var(--marca)' : 'var(--superficie)',
              color: tipo === t.v ? 'var(--sobre-marca)' : 'var(--texto-suave)',
              borderColor: tipo === t.v ? 'var(--marca)' : 'var(--borde-fuerte)',
            }}
          >
            {t.t} ({conteo(t.v)})
          </button>
        ))}

        {plantillas.length > 0 && (
          <input
            value={busqueda}
            onChange={(ev) => setBusqueda(ev.target.value)}
            placeholder="Buscar por nombre, norma o sección…"
            style={e.buscador}
          />
        )}

        {plantillas.length > 0 && (
          <div style={e.selectorVista}>
            <button
              onClick={() => cambiarVista('tarjetas')}
              title="Ver como tarjetas"
              style={{
                ...e.botonVista,
                background: vista === 'tarjetas' ? 'var(--marca)' : 'transparent',
                color: vista === 'tarjetas' ? 'var(--sobre-marca)' : 'var(--texto-suave)',
              }}
            >
              <span aria-hidden="true" style={{ fontSize: 13 }}>▦</span> Tarjetas
            </button>
            <button
              onClick={() => cambiarVista('lista')}
              title="Ver como lista"
              style={{
                ...e.botonVista,
                background: vista === 'lista' ? 'var(--marca)' : 'transparent',
                color: vista === 'lista' ? 'var(--sobre-marca)' : 'var(--texto-suave)',
              }}
            >
              <span aria-hidden="true" style={{ fontSize: 13 }}>☰</span> Lista
            </button>
          </div>
        )}

        <Link href="/panel/inspecciones/plantillas/nueva" style={{ ...e.btn, background: 'var(--marca)' }}>
          + Nueva lista
        </Link>
      </div>

      {aviso && (
        <div style={{
          ...e.aviso,
          background: aviso.tipo === 'ok' ? 'var(--bien-fondo)' : 'var(--mal-fondo)',
          color: aviso.tipo === 'ok' ? 'var(--bien)' : 'var(--mal)',
        }}>
          {aviso.texto}
        </div>
      )}

      {plantillas.length === 0 ? (
        <div style={e.vacio}>
          <p style={{ margin: '0 0 6px', fontSize: 14, fontWeight: 600 }}>
            El banco está vacío
          </p>
          <p style={e.explicacion}>
            Puedes empezar con once listas de verificación basadas en la
            normativa colombiana —extintores, botiquines, alturas, estándares
            mínimos y más— y adaptarlas a cada cliente.
          </p>
          <button
            onClick={sembrar}
            disabled={pendiente}
            style={{ ...e.btn, background: pendiente ? 'var(--borde-fuerte)' : 'var(--marca)', marginTop: 14, border: 'none', cursor: 'pointer' }}
          >
            {pendiente ? 'Cargando…' : 'Cargar las 11 listas base'}
          </button>
        </div>
      ) : lista.length === 0 ? (
        <div style={e.vacio}>
          <p style={{ margin: '0 0 6px', fontSize: 14, fontWeight: 600 }}>
            Sin resultados
          </p>
          <p style={e.explicacion}>
            Ninguna lista coincide con la búsqueda{tipo ? ' y el tipo seleccionados' : ''}.
          </p>
          <button
            onClick={() => { setBusqueda(''); setTipo(''); }}
            style={{ ...e.btn, background: 'var(--marca)', marginTop: 14, border: 'none', cursor: 'pointer' }}
          >
            Quitar filtros
          </button>
        </div>
      ) : vista === 'lista' ? (
        <>
          <div style={e.tablaContenedor}>
            <table style={e.tabla}>
              <thead>
                <tr>
                  <ThOrden etiqueta="Lista de verificación" col="nombre" orden={orden} desc={descendente} onClick={ordenarPor} izq />
                  <ThOrden etiqueta="Tipo" col="tipo" orden={orden} desc={descendente} onClick={ordenarPor} izq />
                  <ThOrden etiqueta="Criterios" col="criterios" orden={orden} desc={descendente} onClick={ordenarPor} />
                  <ThOrden etiqueta="Críticos" col="criticos" orden={orden} desc={descendente} onClick={ordenarPor} />
                  <th style={e.thNorma}>Periodicidad / Norma</th>
                  <ThOrden etiqueta="Usada" col="usada" orden={orden} desc={descendente} onClick={ordenarPor} />
                  <th style={e.thAcciones} />
                </tr>
              </thead>
              <tbody>
                {lista.map((p) => (
                  <tr key={p.id} style={e.filaTabla}>
                    <td style={e.tdNombre}>
                      <Link href={`/panel/inspecciones/plantillas/${p.id}`} style={e.enlaceNombre}>
                        {p.nombre}
                      </Link>
                      {p.es_base && <span style={e.baseChipMini}>base</span>}
                    </td>
                    <td style={e.tdTipo}>{TIPOS.find((t) => t.v === p.tipo)?.t ?? p.tipo}</td>
                    <td style={e.tdNum}>{p.items}</td>
                    <td style={{ ...e.tdNum, color: p.criticos > 0 ? 'var(--mal)' : 'var(--texto)', fontWeight: p.criticos > 0 ? 700 : 400 }}>
                      {p.criticos}
                    </td>
                    <td style={e.tdNorma}>
                      {p.periodicidad ? (PERIODOS[p.periodicidad] ?? p.periodicidad) : '—'}
                      {p.norma && <span style={e.normaMini}>{p.norma}</span>}
                    </td>
                    <td style={e.tdNum}>{p.veces_usada}</td>
                    <td style={e.tdAcciones}>
                      <Link href={`/panel/inspecciones/plantillas/${p.id}`} style={e.accionMini}>Editar</Link>
                      <button onClick={() => duplicar(p)} disabled={pendiente} style={e.accionMiniBtn}>Duplicar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p style={e.nota}>
            Toca cualquier encabezado con flecha para ordenar. La columna
            <strong> críticos</strong> resalta las listas más exigentes.
          </p>
        </>
      ) : (
        <>
          <div style={e.grid}>
            {lista.map((p) => (
              <article key={p.id} style={e.tarjeta}>
                <div style={{ ...e.franja, background: p.es_base ? '#0EA5E9' : 'var(--marca)' }} />

                <div style={e.cuerpo}>
                  <div style={e.cabeceraTarjeta}>
                    <span style={e.tipoChip}>
                      {TIPOS.find((t) => t.v === p.tipo)?.t ?? p.tipo}
                    </span>
                    {p.es_base && <span style={e.baseChip}>Base</span>}
                  </div>

                  <h3 style={e.nombre}>{p.nombre}</h3>
                  {p.descripcion && <p style={e.descripcion}>{p.descripcion}</p>}

                  <dl style={e.datos}>
                    <Fila k="Criterios" v={String(p.items)} />
                    <Fila
                      k="Críticos"
                      v={String(p.criticos)}
                      destacado={p.criticos > 0}
                    />
                    {p.periodicidad && (
                      <Fila k="Periodicidad" v={PERIODOS[p.periodicidad] ?? p.periodicidad} />
                    )}
                    {p.norma && <Fila k="Norma" v={p.norma} />}
                    <Fila
                      k="Usada"
                      v={`${p.veces_usada} ${p.veces_usada === 1 ? 'vez' : 'veces'}`}
                    />
                  </dl>

                  {p.secciones?.length > 0 && (
                    <div style={e.secciones}>
                      {p.secciones.slice(0, 4).map((s) => (
                        <span key={s} style={e.seccion}>{s}</span>
                      ))}
                      {p.secciones.length > 4 && (
                        <span style={e.masSecciones}>+{p.secciones.length - 4}</span>
                      )}
                    </div>
                  )}

                  <div style={e.acciones}>
                    <Link
                      href={`/panel/inspecciones/plantillas/${p.id}`}
                      style={{ ...e.btnAccion, background: 'var(--marca)' }}
                    >
                      Editar
                    </Link>
                    <button
                      onClick={() => duplicar(p)}
                      disabled={pendiente}
                      style={e.btnSec}
                    >
                      Duplicar
                    </button>
                    {!p.es_base && (
                      <button
                        onClick={() => archivar(p.id)}
                        disabled={pendiente}
                        style={e.btnBorrar}
                      >
                        Archivar
                      </button>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>

          <p style={e.nota}>
            Las listas marcadas como <strong>base</strong> salen de la normativa
            colombiana y sirven de punto de partida. <strong>Duplícalas</strong>{' '}
            antes de adaptarlas a un cliente concreto, así conservas la original
            para los demás.
          </p>
        </>
      )}
    </>
  );
}

/** Encabezado de columna ordenable: muestra la flecha del orden activo. */
function ThOrden({
  etiqueta, col, orden, desc, onClick, izq,
}: {
  etiqueta: string;
  col: Orden;
  orden: Orden;
  desc: boolean;
  onClick: (c: Orden) => void;
  izq?: boolean;
}) {
  const activo = orden === col;
  return (
    <th
      onClick={() => onClick(col)}
      style={{
        ...e.thOrden,
        textAlign: izq ? 'left' : 'center',
        color: activo ? 'var(--texto)' : 'var(--texto-tenue)',
      }}
    >
      {etiqueta}
      <span style={{ opacity: activo ? 1 : 0.25, marginLeft: 4 }}>
        {activo ? (desc ? '▼' : '▲') : '▲'}
      </span>
    </th>
  );
}

function Fila({ k, v, destacado }: { k: string; v: string; destacado?: boolean }) {
  return (
    <div style={e.fila}>
      <dt style={e.clave}>{k}</dt>
      <dd style={{ ...e.valor, color: destacado ? 'var(--mal)' : 'var(--texto)' }}>{v}</dd>
    </div>
  );
}

const e: Record<string, React.CSSProperties> = {
  controles: { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 18 },
  filtro: {
    padding: '7px 14px', borderRadius: 4, fontSize: 12.5, fontWeight: 600,
    borderWidth: 1, borderStyle: 'solid', cursor: 'pointer', fontFamily: 'inherit',
  },

  buscador: {
    padding: '7px 12px', borderRadius: 4, fontSize: 12.5,
    borderWidth: 1, borderStyle: 'solid', borderColor: 'var(--borde-fuerte)',
    fontFamily: 'inherit', color: 'var(--texto)', minWidth: 240, flex: '1 1 240px',
    maxWidth: 320, background: 'var(--superficie)',
  },

  // Selector de vista (tarjetas / lista), igual que el inventario
  selectorVista: {
    display: 'inline-flex', gap: 2, marginLeft: 'auto',
    borderWidth: 1, borderStyle: 'solid', borderColor: 'var(--borde-fuerte)',
    borderRadius: 6, padding: 2, background: 'var(--superficie)',
  },
  botonVista: {
    display: 'inline-flex', alignItems: 'center', gap: 5,
    border: 'none', borderRadius: 4, padding: '6px 12px',
    fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
  },

  // Vista lista
  tablaContenedor: {
    overflowX: 'auto', borderWidth: 1, borderStyle: 'solid', borderColor: 'var(--borde)',
    borderRadius: 8, background: 'var(--superficie)',
  },
  tabla: { width: '100%', borderCollapse: 'collapse', fontSize: 12.5 },
  thOrden: {
    padding: '10px 12px', fontSize: 10.5, textTransform: 'uppercase',
    letterSpacing: .3, fontWeight: 700, cursor: 'pointer',
    whiteSpace: 'nowrap', borderBottom: '1px solid var(--borde)', userSelect: 'none',
  },
  thNorma: {
    padding: '10px 12px', fontSize: 10.5, textTransform: 'uppercase', letterSpacing: .3,
    fontWeight: 700, color: 'var(--texto-tenue)', textAlign: 'left',
    borderBottom: '1px solid var(--borde)', whiteSpace: 'nowrap',
  },
  thAcciones: { borderBottom: '1px solid var(--borde)', width: 150 },
  filaTabla: { borderBottom: '1px solid var(--superficie-3)' },
  tdNombre: { padding: '9px 12px', verticalAlign: 'middle' },
  enlaceNombre: { color: 'var(--texto)', textDecoration: 'none', fontWeight: 600 },
  baseChipMini: {
    fontSize: 8.5, background: 'var(--info-fondo)', color: 'var(--info)',
    padding: '2px 6px', borderRadius: 3, fontWeight: 600, marginLeft: 8,
  },
  tdTipo: { padding: '9px 12px', color: 'var(--texto-suave)' },
  tdNum: { padding: '9px 12px', textAlign: 'center' },
  tdNorma: { padding: '9px 12px', color: 'var(--texto-suave)', display: 'flex', flexDirection: 'column' },
  normaMini: { fontSize: 10, color: 'var(--texto-tenue)', marginTop: 1 },
  tdAcciones: { padding: '9px 12px', whiteSpace: 'nowrap', textAlign: 'right' },
  accionMini: {
    fontSize: 11.5, color: 'var(--texto)', textDecoration: 'none', fontWeight: 600, marginRight: 12,
  },
  accionMiniBtn: {
    background: 'none', border: 'none', color: 'var(--texto-suave)',
    fontSize: 11.5, fontWeight: 600, cursor: 'pointer', padding: 0, fontFamily: 'inherit',
  },
  btn: {
    color: 'var(--sobre-marca)', padding: '8px 16px', borderRadius: 4, fontSize: 12.5,
    fontWeight: 600, textDecoration: 'none', display: 'inline-block',
  },

  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(290px,1fr))', gap: 16 },
  tarjeta: {
    background: 'var(--superficie)', borderWidth: 1, borderStyle: 'solid', borderColor: 'var(--borde)',
    borderRadius: 8, overflow: 'hidden', display: 'flex', flexDirection: 'column',
  },
  franja: { height: 3, flexShrink: 0 },
  cuerpo: { padding: 18, display: 'flex', flexDirection: 'column', flex: 1 },

  cabeceraTarjeta: { display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' },
  tipoChip: {
    fontSize: 9.5, background: 'var(--superficie-3)', color: 'var(--texto-suave)',
    padding: '3px 8px', borderRadius: 3, textTransform: 'uppercase', letterSpacing: .4,
  },
  baseChip: {
    fontSize: 9.5, background: 'var(--info-fondo)', color: 'var(--info)',
    padding: '3px 8px', borderRadius: 3, fontWeight: 600,
  },

  nombre: { fontSize: 14, margin: '0 0 5px', fontWeight: 600, lineHeight: 1.35 },
  descripcion: { fontSize: 11.5, color: 'var(--texto-suave)', margin: '0 0 12px', lineHeight: 1.5 },

  datos: { margin: 0 },
  fila: {
    display: 'flex', justifyContent: 'space-between', gap: 10,
    padding: '4px 0', borderBottom: '1px solid var(--superficie-3)', fontSize: 11.5,
  },
  clave: { color: 'var(--texto-tenue)', margin: 0 },
  valor: { margin: 0, fontWeight: 600, textAlign: 'right' },

  secciones: { display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 10 },
  seccion: {
    fontSize: 9, background: 'var(--superficie-2)', color: 'var(--texto-tenue)',
    padding: '2px 7px', borderRadius: 999,
  },
  masSecciones: { fontSize: 9, color: 'var(--texto-tenue)', padding: '2px 4px' },

  acciones: { display: 'flex', gap: 6, marginTop: 14, flexWrap: 'wrap', flexShrink: 0 },
  btnAccion: {
    color: 'var(--sobre-marca)', padding: '7px 14px', borderRadius: 4, fontSize: 11.5,
    fontWeight: 600, textDecoration: 'none',
  },
  btnSec: {
    background: 'var(--superficie)', color: 'var(--texto)',
    borderWidth: 1, borderStyle: 'solid', borderColor: 'var(--borde-fuerte)',
    padding: '7px 14px', borderRadius: 4, fontSize: 11.5,
    fontWeight: 600, cursor: 'pointer',
  },
  btnBorrar: {
    background: 'none', border: 'none', color: 'var(--mal)',
    fontSize: 11, cursor: 'pointer', textDecoration: 'underline',
  },

  aviso: { padding: '10px 14px', borderRadius: 6, fontSize: 13, marginBottom: 16 },
  vacio: {
    background: 'var(--superficie)', borderWidth: 1, borderStyle: 'dashed', borderColor: 'var(--borde-fuerte)',
    borderRadius: 8, padding: '40px 24px', textAlign: 'center',
  },
  explicacion: {
    fontSize: 12.5, color: 'var(--texto-suave)', margin: 0, lineHeight: 1.6,
    maxWidth: 460, marginLeft: 'auto', marginRight: 'auto',
  },
  nota: { fontSize: 11.5, color: 'var(--texto-tenue)', marginTop: 20, lineHeight: 1.65, maxWidth: 680 },
};
