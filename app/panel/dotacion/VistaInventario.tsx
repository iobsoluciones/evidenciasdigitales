'use client';

/**
 * INVENTARIO
 * ---------------------------------------------------------------
 * Dos vistas para dos momentos distintos:
 *
 *   Tarjetas — reconocer visualmente. Sirve con pocos artículos o
 *              cuando no recuerdas el código, porque la foto identifica.
 *   Lista    — trabajar con volumen. Con 200 referencias, las tarjetas
 *              obligan a desplazarse sin fin; la lista muestra 20 de
 *              un vistazo y se ordena por columna.
 *
 * La preferencia se recuerda en el navegador: quien administra un
 * inventario grande siempre quiere la lista, y volver a elegirla en
 * cada visita es una fricción innecesaria.
 */
import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import type { Articulo, TipoArticulo } from '@/lib/acciones-dotacion';

type Vista = 'tarjetas' | 'lista';
type Orden = 'nombre' | 'codigo' | 'categoria' | 'existencia';

const CLAVE_VISTA = 'dotacion_vista';

export default function VistaInventario({
  articulos,
  color,
}: {
  articulos: Articulo[];
  color: string;
}) {
  const [pestana, setPestana] = useState<TipoArticulo>('consumible');
  const [categoria, setCategoria] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [vista, setVista] = useState<Vista>('tarjetas');
  const [orden, setOrden] = useState<Orden>('nombre');
  const [descendente, setDescendente] = useState(false);

  // La preferencia se lee tras montar para no romper el renderizado
  // del servidor, que no tiene acceso a localStorage.
  useEffect(() => {
    const guardada = window.localStorage.getItem(CLAVE_VISTA);
    if (guardada === 'lista' || guardada === 'tarjetas') setVista(guardada);
  }, []);

  function cambiarVista(v: Vista) {
    setVista(v);
    try { window.localStorage.setItem(CLAVE_VISTA, v); } catch { /* modo privado */ }
  }

  const delTipo = useMemo(
    () => articulos.filter((a) => a.tipo === pestana),
    [articulos, pestana]
  );

  const categorias = useMemo(
    () => Array.from(new Set(delTipo.map((a) => a.categoria).filter(Boolean) as string[])).sort(),
    [delTipo]
  );

  /** ¿Este artículo requiere atención? */
  function enAlerta(a: Articulo): boolean {
    return a.tipo === 'consumible' ? a.bajo_minimo : (a.disponibles ?? 0) === 0;
  }

  const lista = useMemo(() => {
    const filtrados = delTipo.filter((a) => {
      if (categoria && a.categoria !== categoria) return false;
      if (!busqueda) return true;
      return `${a.codigo} ${a.nombre} ${a.marca ?? ''} ${a.categoria ?? ''}`
        .toLowerCase().includes(busqueda.toLowerCase());
    });

    // En tarjetas manda la alerta; en lista manda la columna elegida,
    // porque quien ordena por código espera ver códigos en orden.
    if (vista === 'tarjetas') {
      return filtrados.sort((a, b) => {
        const d = Number(enAlerta(b)) - Number(enAlerta(a));
        return d !== 0 ? -d : a.nombre.localeCompare(b.nombre);
      });
    }

    const factor = descendente ? -1 : 1;
    return filtrados.sort((a, b) => {
      if (orden === 'existencia') {
        const va = a.tipo === 'consumible' ? (a.existencia ?? 0) : (a.disponibles ?? 0);
        const vb = b.tipo === 'consumible' ? (b.existencia ?? 0) : (b.disponibles ?? 0);
        return (va - vb) * factor;
      }
      const va = String(a[orden] ?? '');
      const vb = String(b[orden] ?? '');
      return va.localeCompare(vb) * factor;
    });
  }, [delTipo, categoria, busqueda, vista, orden, descendente]);

  const conAlerta = delTipo.filter(enAlerta).length;
  const consumibles = articulos.filter((a) => a.tipo === 'consumible').length;
  const retornables = articulos.filter((a) => a.tipo === 'retornable').length;

  function ordenarPor(campo: Orden) {
    if (orden === campo) setDescendente(!descendente);
    else { setOrden(campo); setDescendente(false); }
  }

  return (
    <>
      <div style={e.pestanas}>
        <button
          onClick={() => { setPestana('consumible'); setCategoria(''); }}
          style={{ ...e.pestana, ...(pestana === 'consumible' ? { ...e.activa, color, borderBottomColor: color } : {}) }}
        >
          Elementos de protección ({consumibles})
        </button>
        <button
          onClick={() => { setPestana('retornable'); setCategoria(''); }}
          style={{ ...e.pestana, ...(pestana === 'retornable' ? { ...e.activa, color, borderBottomColor: color } : {}) }}
        >
          Equipos ({retornables})
        </button>
      </div>

      <div style={e.controles}>
        {categorias.length > 0 && (
          <select value={categoria} onChange={(x) => setCategoria(x.target.value)} style={e.select}>
            <option value="">Todas las categorías</option>
            {categorias.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        )}

        <input
          value={busqueda}
          onChange={(x) => setBusqueda(x.target.value)}
          placeholder="Buscar…"
          style={{ ...e.select, minWidth: 190 }}
        />

        {/* Selector de vista */}
        <div style={e.selectorVista}>
          <button
            onClick={() => cambiarVista('tarjetas')}
            title="Ver como tarjetas"
            style={{
              ...e.botonVista,
              background: vista === 'tarjetas' ? color : 'transparent',
              color: vista === 'tarjetas' ? '#fff' : '#5B6470',
            }}
          >
            <span aria-hidden="true" style={{ fontSize: 13 }}>▦</span> Tarjetas
          </button>
          <button
            onClick={() => cambiarVista('lista')}
            title="Ver como lista"
            style={{
              ...e.botonVista,
              background: vista === 'lista' ? color : 'transparent',
              color: vista === 'lista' ? '#fff' : '#5B6470',
            }}
          >
            <span aria-hidden="true" style={{ fontSize: 13 }}>☰</span> Lista
          </button>
        </div>

        <span style={e.conteo}>
          {lista.length} de {delTipo.length}
        </span>

        <Link
          href={`/panel/dotacion/nuevo?tipo=${pestana}`}
          style={{ ...e.btn, background: color }}
        >
          + Nuevo {pestana === 'consumible' ? 'elemento' : 'equipo'}
        </Link>
      </div>

      {conAlerta > 0 && (
        <div style={e.alerta}>
          <strong>{conAlerta}</strong>{' '}
          {pestana === 'consumible'
            ? 'artículo(s) en o bajo el stock mínimo.'
            : 'equipo(s) sin unidades disponibles.'}
        </div>
      )}

      {lista.length === 0 ? (
        <div style={e.vacio}>
          <p style={{ margin: '0 0 14px', fontSize: 13.5 }}>
            {delTipo.length === 0
              ? `Aún no hay ${pestana === 'consumible' ? 'elementos de protección' : 'equipos'} registrados.`
              : 'Ningún artículo coincide con el filtro.'}
          </p>
          {delTipo.length === 0 && (
            <Link href={`/panel/dotacion/nuevo?tipo=${pestana}`} style={{ ...e.btn, background: color }}>
              Registrar el primero
            </Link>
          )}
        </div>
      ) : vista === 'tarjetas' ? (
        <div style={e.grid}>
          {lista.map((a) => <Tarjeta key={a.id} a={a} alerta={enAlerta(a)} />)}
        </div>
      ) : (
        <div style={e.contenedorTabla}>
          <table style={e.tabla}>
            <thead>
              <tr>
                <Encabezado campo="codigo" texto="Código" {...{ orden, descendente, ordenarPor }} />
                <Encabezado campo="nombre" texto="Elemento" {...{ orden, descendente, ordenarPor }} />
                <Encabezado campo="categoria" texto="Categoría" {...{ orden, descendente, ordenarPor }} />
                <th style={e.th}>Marca</th>
                <Encabezado
                  campo="existencia"
                  texto={pestana === 'consumible' ? 'Existencia' : 'Disponibles'}
                  alineado="center"
                  {...{ orden, descendente, ordenarPor }}
                />
                {pestana === 'consumible' && <th style={{ ...e.th, textAlign: 'center' }}>Mínimo</th>}
                <th style={e.th}>Estado</th>
                <th style={e.th} />
              </tr>
            </thead>
            <tbody>
              {lista.map((a) => {
                const alerta = enAlerta(a);
                return (
                  <tr key={a.id}>
                    <td style={{ ...e.td, ...e.mono }}>{a.codigo}</td>
                    <td style={e.td}>
                      <Link href={`/panel/dotacion/${a.id}`} style={e.enlaceNombre}>
                        {a.nombre}
                      </Link>
                      {a.modelo && <div style={e.modelo}>{a.modelo}</div>}
                    </td>
                    <td style={{ ...e.td, color: '#5B6470' }}>{a.categoria ?? '—'}</td>
                    <td style={{ ...e.td, color: '#5B6470' }}>{a.marca ?? '—'}</td>
                    <td style={{
                      ...e.td, textAlign: 'center', fontWeight: 700,
                      color: alerta ? '#9B1C1C' : '#15803D',
                    }}>
                      {a.tipo === 'consumible'
                        ? `${a.existencia ?? 0}`
                        : `${a.disponibles ?? 0} / ${a.unidades ?? 0}`}
                    </td>
                    {pestana === 'consumible' && (
                      <td style={{ ...e.td, textAlign: 'center', color: '#8A929C' }}>
                        {a.stock_minimo}
                      </td>
                    )}
                    <td style={e.td}>
                      <span style={{
                        ...e.chipEstado,
                        background: alerta ? '#FEE2E2' : '#F0FDF4',
                        color: alerta ? '#9B1C1C' : '#15803D',
                      }}>
                        {alerta
                          ? (pestana === 'consumible' ? 'Bajo mínimo' : 'Sin disponibles')
                          : 'Normal'}
                      </span>
                    </td>
                    <td style={{ ...e.td, whiteSpace: 'nowrap' }}>
                      <Link href={`/panel/dotacion/${a.id}`} style={e.enlaceVer}>Ver</Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

/* ---------------------------------------------------------------- */

function Encabezado({
  campo, texto, orden, descendente, ordenarPor, alineado,
}: {
  campo: Orden;
  texto: string;
  orden: Orden;
  descendente: boolean;
  ordenarPor: (c: Orden) => void;
  alineado?: 'center';
}) {
  const activo = orden === campo;
  return (
    <th
      onClick={() => ordenarPor(campo)}
      style={{
        ...e.th,
        cursor: 'pointer',
        color: activo ? '#14263F' : '#8A929C',
        textAlign: alineado ?? 'left',
      }}
      title={`Ordenar por ${texto.toLowerCase()}`}
    >
      {texto}
      <span style={e.flecha}>{activo ? (descendente ? '▾' : '▴') : '⇅'}</span>
    </th>
  );
}

function Tarjeta({ a, alerta }: { a: Articulo; alerta: boolean }) {
  return (
    <Link href={`/panel/dotacion/${a.id}`} style={e.tarjeta}>
      <div style={e.zonaFoto}>
        {a.foto_url
          ? <img src={a.foto_url} alt={a.nombre} style={e.foto} />
          : <span style={e.sinFoto}>Sin fotografía</span>}
      </div>

      <div style={e.cuerpo}>
        <div style={e.codigo}>{a.codigo}</div>
        <h3 style={e.nombre}>{a.nombre}</h3>

        <div style={e.meta}>
          {a.categoria && <span style={e.chip}>{a.categoria}</span>}
          {a.marca && <span style={e.marca}>{a.marca}</span>}
        </div>

        <div style={{
          ...e.estado,
          background: alerta ? '#FEE2E2' : '#F0FDF4',
          color: alerta ? '#9B1C1C' : '#15803D',
        }}>
          {a.tipo === 'consumible' ? (
            <>
              <strong>{a.existencia ?? 0}</strong> {a.unidad.toLowerCase()}
              {a.stock_minimo > 0 && <span style={e.minimo}> · mín. {a.stock_minimo}</span>}
            </>
          ) : (
            <><strong>{a.disponibles ?? 0}</strong> de {a.unidades ?? 0} disponibles</>
          )}
        </div>
      </div>
    </Link>
  );
}

const e: Record<string, React.CSSProperties> = {
  pestanas: { display: 'flex', gap: 4, borderBottom: '1px solid #E4E4DF', marginBottom: 16 },
  pestana: {
    background: 'none', border: 'none', padding: '10px 18px', fontSize: 13,
    cursor: 'pointer', fontFamily: 'inherit', color: '#8A929C',
    borderBottomWidth: 2, borderBottomStyle: 'solid', borderBottomColor: 'transparent',
    marginBottom: -1,
  },
  activa: { fontWeight: 700 },

  controles: { display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 16 },
  select: {
    padding: '8px 11px', borderWidth: 1, borderStyle: 'solid', borderColor: '#DFDFD8',
    borderRadius: 4, fontSize: 12.5, fontFamily: 'inherit', background: '#fff',
  },
  conteo: { fontSize: 12, color: '#8A929C' },
  btn: {
    color: '#fff', padding: '9px 16px', borderRadius: 4, fontSize: 12.5,
    fontWeight: 600, textDecoration: 'none', display: 'inline-block',
    marginLeft: 'auto',
  },

  selectorVista: {
    display: 'flex', borderWidth: 1, borderStyle: 'solid', borderColor: '#DFDFD8',
    borderRadius: 4, overflow: 'hidden',
  },
  botonVista: {
    display: 'flex', alignItems: 'center', gap: 6,
    border: 'none', padding: '8px 13px', fontSize: 12,
    cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600,
  },

  alerta: {
    background: '#FEFCE8', color: '#8A6100', padding: '11px 15px',
    borderRadius: 6, fontSize: 13, marginBottom: 16,
  },

  /* -------- Tarjetas -------- */
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(230px,1fr))', gap: 16 },
  tarjeta: {
    background: '#fff', borderWidth: 1, borderStyle: 'solid', borderColor: '#E4E4DF',
    borderRadius: 8, overflow: 'hidden', textDecoration: 'none',
    color: 'inherit', display: 'block',
  },
  zonaFoto: {
    height: 130, background: '#FBFBF9', display: 'flex',
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  foto: { maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' },
  sinFoto: { fontSize: 11, color: '#C5C5BD' },
  cuerpo: { padding: 14 },
  codigo: {
    fontSize: 10, color: '#A3AAB3', letterSpacing: .4,
    fontFamily: 'ui-monospace,SFMono-Regular,Menlo,monospace',
  },
  nombre: { fontSize: 13.5, margin: '3px 0 8px', fontWeight: 600, lineHeight: 1.35 },
  meta: { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 },
  chip: { fontSize: 9.5, background: '#F4F4F0', color: '#5B6470', padding: '2px 7px', borderRadius: 3 },
  marca: { fontSize: 10.5, color: '#8A929C' },
  estado: { fontSize: 12, padding: '6px 10px', borderRadius: 4, textAlign: 'center' },
  minimo: { fontWeight: 400, opacity: .75 },

  /* -------- Lista -------- */
  contenedorTabla: {
    background: '#fff', borderWidth: 1, borderStyle: 'solid', borderColor: '#E4E4DF',
    borderRadius: 8, overflowX: 'auto',
  },
  tabla: { width: '100%', borderCollapse: 'collapse', fontSize: 12.5 },
  th: {
    background: '#F7F7F4', fontSize: 10.5, textTransform: 'uppercase',
    padding: '10px', textAlign: 'left', borderBottom: '1px solid #E4E4DF',
    letterSpacing: .3, whiteSpace: 'nowrap', userSelect: 'none',
  },
  flecha: { fontSize: 9, marginLeft: 5, opacity: .7 },
  td: { padding: '9px 10px', borderBottom: '1px solid #F4F4F0', verticalAlign: 'middle' },
  mono: {
    fontFamily: 'ui-monospace,SFMono-Regular,Menlo,monospace',
    fontSize: 11.5, color: '#5B6470', whiteSpace: 'nowrap',
  },
  enlaceNombre: { color: '#14263F', textDecoration: 'none', fontWeight: 600 },
  modelo: { fontSize: 10.5, color: '#A3AAB3', marginTop: 1 },
  chipEstado: {
    fontSize: 10.5, fontWeight: 600, padding: '3px 9px',
    borderRadius: 999, whiteSpace: 'nowrap',
  },
  enlaceVer: {
    fontSize: 11.5, color: '#14263F', textDecoration: 'underline', whiteSpace: 'nowrap',
  },

  vacio: {
    background: '#fff', borderWidth: 1, borderStyle: 'dashed', borderColor: '#DFDFD8',
    borderRadius: 8, padding: '40px 24px', textAlign: 'center',
  },
};
