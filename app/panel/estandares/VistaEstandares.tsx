'use client';

/**
 * CONJUNTOS DE ESTÁNDARES
 * ---------------------------------------------------------------
 * Aquí el profesional mantiene el contenido normativo sin depender de
 * nadie. El de 60 viene precargado y no se edita —sus pesos están
 * verificados contra la tabla del artículo 27—; para los de 7 y 21 se
 * duplica y se adapta, o se importa desde Excel.
 *
 * La importación reemplaza el conjunto completo y valida ANTES de
 * escribir: o entra el archivo entero o no entra nada. Los errores se
 * listan con el número de fila, porque «formato inválido» a secas
 * obliga a revisar sesenta líneas a mano.
 */
import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';
import {
  crearConjunto, duplicarConjunto, importarConjunto, eliminarConjunto,
  actualizarConjunto, guardarItem, eliminarItem,
  type ConjuntoResumen, type ItemConjunto, type FilaImportada,
} from '@/lib/acciones-conjuntos';

const CICLOS = ['planear', 'hacer', 'verificar', 'actuar'];

/** Solo dígitos con coma o punto: evita que un texto entre como peso. */
const NUMERO = /^[0-9]*[.,]?[0-9]*$/;

const EJEMPLO: FilaImportada[] = [
  { codigo: '1.1.1', ciclo: 'planear', capitulo: 'Recursos',
    nombre: 'Asignación de persona que diseña el SG-SST', peso: 14.3 },
  { codigo: '2.4.1', ciclo: 'planear', capitulo: 'Gestión integral',
    nombre: 'Plan anual de trabajo', peso: 14.3 },
  { codigo: '4.1.1', ciclo: 'hacer', capitulo: 'Peligros y riesgos',
    nombre: 'Identificación de peligros y valoración de riesgos', peso: 14.2 },
];

export default function VistaEstandares({
  conjuntos,
  detalle,
  color,
}: {
  conjuntos: ConjuntoResumen[];
  detalle: { conjunto?: ConjuntoResumen; items?: ItemConjunto[] } | null;
  color: string;
}) {
  const router = useRouter();
  const [pendiente, startTransition] = useTransition();
  const archivoRef = useRef<HTMLInputElement>(null);
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);
  const [errores, setErrores] = useState<string[]>([]);
  const [creando, setCreando] = useState(false);
  const [nuevo, setNuevo] = useState({ nombre: '', norma: '', descripcion: '' });
  // Duplicar pide los datos nuevos ANTES de copiar: una copia que
  // conserva el nombre y la norma del original no sirve de nada.
  const [duplicando, setDuplicando] = useState<{
    id: string; nombre: string; norma: string; descripcion: string;
  } | null>(null);
  const [editandoCab, setEditandoCab] = useState(false);
  const [cab, setCab] = useState({ nombre: '', norma: '', descripcion: '' });
  const [fila, setFila] = useState<{
    id?: string; codigo: string; ciclo: string;
    capitulo: string; nombre: string; peso: string;
  } | null>(null);

  const c = detalle?.conjunto;
  const items = detalle?.items ?? [];

  const correr = (fn: () => Promise<{ ok: boolean; mensaje: string; errores?: string[] }>) => {
    setAviso(null);
    setErrores([]);
    startTransition(async () => {
      const r = await fn();
      setAviso({ tipo: r.ok ? 'ok' : 'error', texto: r.mensaje });
      if (r.errores) setErrores(r.errores);
      if (r.ok) router.refresh();
    });
  };

  /** Plantilla con las cinco columnas y tres filas de ejemplo. */
  function descargarPlantilla() {
    const hoja = XLSX.utils.json_to_sheet(EJEMPLO);
    hoja['!cols'] = [{ wch: 10 }, { wch: 12 }, { wch: 22 }, { wch: 56 }, { wch: 8 }];
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, 'Estandares');
    XLSX.writeFile(libro, 'Plantilla_estandares.xlsx');
  }

  /** El navegador lee el Excel y envía las filas ya convertidas. */
  function alElegirArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    if (!archivo || !c) return;

    const lector = new FileReader();
    lector.onload = (ev) => {
      try {
        const libro = XLSX.read(ev.target?.result, { type: 'binary' });
        const hoja = libro.Sheets[libro.SheetNames[0]];
        const bruto = XLSX.utils.sheet_to_json<Record<string, unknown>>(hoja);

        const filas: FilaImportada[] = bruto.map((f, i) => ({
          codigo: String(f.codigo ?? f.Codigo ?? f['código'] ?? f['Código'] ?? '').trim(),
          ciclo: String(f.ciclo ?? f.Ciclo ?? '').trim().toLowerCase(),
          capitulo: String(f.capitulo ?? f.Capitulo ?? f['capítulo'] ?? f['Capítulo'] ?? '').trim(),
          nombre: String(f.nombre ?? f.Nombre ?? '').trim(),
          peso: (f.peso ?? f.Peso ?? '') as number | string,
          orden: i + 1,
        }));

        correr(() => importarConjunto(c.id, filas));
      } catch {
        setAviso({ tipo: 'error', texto: 'No se pudo leer el archivo. ¿Es un Excel válido?' });
      }
      if (archivoRef.current) archivoRef.current.value = '';
    };
    lector.readAsBinaryString(archivo);
  }

  const suma100 = c ? Math.abs(Number(c.peso_total) - 100) < 0.01 : false;

  return (
    <>
      {aviso && (
        <div style={{
          ...s.aviso,
          background: aviso.tipo === 'ok' ? 'var(--bien-fondo)' : 'var(--mal-fondo)',
          color: aviso.tipo === 'ok' ? 'var(--bien)' : 'var(--mal)',
        }}>
          {aviso.texto}
        </div>
      )}

      {errores.length > 0 && (
        <div style={s.errores}>
          <div style={s.erroresTitulo}>No se importó nada. Corrige el archivo:</div>
          <ul style={s.listaErrores}>
            {errores.map((e, i) => <li key={i} style={s.errorItem}>{e}</li>)}
          </ul>
        </div>
      )}

      {/* ---------- Duplicar con datos propios ---------- */}
      {duplicando && (
        <section style={s.bloque}>
          <div style={s.h2}>Datos de la copia</div>
          <p style={s.nota}>
            Se copian los estándares del original; el nombre y la norma son de la
            copia. Después puedes editar, agregar o quitar estándares uno por uno.
          </p>
          <div style={s.formNuevo}>
            <input value={duplicando.nombre} placeholder="Nombre del conjunto"
              onChange={(e) => setDuplicando({ ...duplicando, nombre: e.target.value })}
              style={{ ...s.input, flex: '2 1 220px' }} />
            <input value={duplicando.norma} placeholder="Norma"
              onChange={(e) => setDuplicando({ ...duplicando, norma: e.target.value })}
              style={{ ...s.input, flex: '2 1 200px' }} />
          </div>
          <input value={duplicando.descripcion} placeholder="Descripción (a quién aplica)"
            onChange={(e) => setDuplicando({ ...duplicando, descripcion: e.target.value })}
            style={{ ...s.input, width: '100%', marginTop: 8 }} />
          <div style={s.acciones}>
            <button type="button" style={s.botonPlano} onClick={() => setDuplicando(null)}>
              Cancelar
            </button>
            <button type="button" disabled={pendiente}
              style={{ ...s.botonLleno, background: color }}
              onClick={() => {
                correr(() => duplicarConjunto(
                  duplicando.id, duplicando.nombre, duplicando.norma, duplicando.descripcion));
                setDuplicando(null);
              }}>
              Duplicar
            </button>
          </div>
        </section>
      )}

      {/* ---------- Conjuntos ---------- */}
      <div style={s.rejilla}>
        {conjuntos.map((x) => (
          <article key={x.id} style={{
            ...s.tarjeta,
            borderColor: c?.id === x.id ? color : 'var(--borde)',
            boxShadow: c?.id === x.id ? `0 0 0 1px ${color}` : undefined,
          }}>
            <div style={s.tarjetaCab}>
              <h3 style={s.tarjetaNombre}>{x.nombre}</h3>
              {x.es_sistema && <span style={s.sistema}>Del sistema</span>}
            </div>
            {x.norma && <div style={s.norma}>{x.norma}</div>}
            <div style={s.cifras}>
              <span>{x.estandares} estándares</span>
              <span style={{
                fontWeight: 700,
                color: Math.abs(Number(x.peso_total) - 100) < 0.01 ? 'var(--bien)' : 'var(--aviso)',
              }}>
                {x.peso_total} puntos
              </span>
            </div>
            <div style={s.tarjetaAcciones}>
              <a href={`/panel/estandares?id=${x.id}`} style={s.botonMini}>Ver</a>
              <button type="button" style={s.botonMini} disabled={pendiente}
                onClick={() => setDuplicando({
                  id: x.id,
                  nombre: `${x.nombre} (copia)`,
                  norma: x.norma ?? '',
                  descripcion: x.descripcion ?? '',
                })}>
                Duplicar
              </button>
              {!x.es_sistema && (
                <button type="button" style={{ ...s.botonMini, color: 'var(--mal)' }} disabled={pendiente}
                  onClick={() => correr(() => eliminarConjunto(x.id))}>
                  Borrar
                </button>
              )}
            </div>
          </article>
        ))}
      </div>

      <div style={s.barra}>
        {!creando ? (
          <button onClick={() => setCreando(true)} type="button"
            style={{ ...s.botonSec, borderColor: color, color }}>
            Crear conjunto vacío
          </button>
        ) : (
          <div style={s.formNuevo}>
            <input value={nuevo.nombre} placeholder="Nombre (ej. Estándares Mínimos — 7)"
              onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })}
              style={{ ...s.input, flex: '2 1 220px' }} />
            <input value={nuevo.norma} placeholder="Norma (ej. Res. 0312/2019, art. 3)"
              onChange={(e) => setNuevo({ ...nuevo, norma: e.target.value })}
              style={{ ...s.input, flex: '2 1 200px' }} />
            <button type="button" style={s.botonPlano} onClick={() => setCreando(false)}>
              Cancelar
            </button>
            <button type="button" disabled={pendiente}
              style={{ ...s.botonLleno, background: color }}
              onClick={() => {
                correr(() => crearConjunto(nuevo.nombre, nuevo.norma, nuevo.descripcion));
                setCreando(false);
                setNuevo({ nombre: '', norma: '', descripcion: '' });
              }}>
              Crear
            </button>
          </div>
        )}
      </div>

      {/* ---------- Detalle del conjunto ---------- */}
      {c && (
        <section style={s.bloque}>
          <div style={s.detalleCab}>
            <div style={{ flex: '1 1 260px' }}>
              {editandoCab && !c.es_sistema ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <input value={cab.nombre} placeholder="Nombre del conjunto"
                    onChange={(e) => setCab({ ...cab, nombre: e.target.value })} style={s.input} />
                  <input value={cab.norma} placeholder="Norma (ej. Res. 0312/2019, art. 9)"
                    onChange={(e) => setCab({ ...cab, norma: e.target.value })} style={s.input} />
                  <input value={cab.descripcion} placeholder="Descripción: a quién aplica"
                    onChange={(e) => setCab({ ...cab, descripcion: e.target.value })} style={s.input} />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="button" style={s.botonPlano} onClick={() => setEditandoCab(false)}>
                      Cancelar
                    </button>
                    <button type="button" disabled={pendiente}
                      style={{ ...s.botonSec, borderColor: color, color }}
                      onClick={() => {
                        correr(() => actualizarConjunto(c.id, cab.nombre, cab.norma, cab.descripcion));
                        setEditandoCab(false);
                      }}>
                      Guardar datos
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <h2 style={s.h2}>{c.nombre}</h2>
                  {c.norma && <div style={s.norma}>{c.norma}</div>}
                  {c.descripcion && <p style={s.desc}>{c.descripcion}</p>}
                </>
              )}
              <p style={s.sub}>
                {c.estandares} estándares ·{' '}
                <strong style={{ color: suma100 ? 'var(--bien)' : 'var(--aviso)' }}>
                  {c.peso_total} puntos
                </strong>
                {c.es_sistema && ' · no editable'}
              </p>
            </div>
            {!c.es_sistema && !editandoCab && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button type="button" style={s.botonMini}
                  onClick={() => {
                    setCab({
                      nombre: c.nombre,
                      norma: c.norma ?? '',
                      descripcion: c.descripcion ?? '',
                    });
                    setEditandoCab(true);
                  }}>
                  Editar datos
                </button>
                <button type="button" onClick={descargarPlantilla} style={s.botonMini}>
                  Descargar plantilla
                </button>
                <button type="button" disabled={pendiente} style={{ ...s.botonSec, borderColor: color, color }}
                  onClick={() => archivoRef.current?.click()}>
                  Importar desde Excel
                </button>
                <input ref={archivoRef} type="file" accept=".xlsx,.xls"
                  onChange={alElegirArchivo} style={{ display: 'none' }} />
              </div>
            )}
          </div>

          {!suma100 && c.estandares > 0 && (
            <div style={s.avisoPeso}>
              Los pesos suman <strong>{c.peso_total}</strong> y no 100. La
              autoevaluación seguirá funcionando —el porcentaje se calcula sobre el
              total real— pero el resultado no será comparable con la tabla oficial.
            </div>
          )}

          {c.es_sistema && (
            <div style={s.avisoSistema}>
              Este conjunto viene con la aplicación y no se edita: sus pesos están
              verificados contra la tabla del artículo 27. Para armar los de 7 o 21
              estándares, <strong>duplícalo</strong> y ajusta la copia, o crea uno
              vacío e impórtalo desde Excel.
            </div>
          )}

          {!c.es_sistema && (
            <div style={{ marginBottom: 12 }}>
              {!fila ? (
                <button type="button" style={s.botonMini}
                  onClick={() => setFila({
                    codigo: '', ciclo: 'planear', capitulo: '', nombre: '', peso: '',
                  })}>
                  + Agregar estándar
                </button>
              ) : (
                <div style={s.editorFila}>
                  <div style={s.formNuevo}>
                    <input value={fila.codigo} placeholder="Código"
                      onChange={(e) => setFila({ ...fila, codigo: e.target.value })}
                      style={{ ...s.input, flex: '0 1 100px' }} />
                    <select value={fila.ciclo}
                      onChange={(e) => setFila({ ...fila, ciclo: e.target.value })}
                      style={{ ...s.input, flex: '0 1 130px' }}>
                      {CICLOS.map((x) => <option key={x} value={x}>{x}</option>)}
                    </select>
                    <input value={fila.capitulo} placeholder="Capítulo"
                      onChange={(e) => setFila({ ...fila, capitulo: e.target.value })}
                      style={{ ...s.input, flex: '1 1 150px' }} />
                    <input value={fila.peso} placeholder="Peso" inputMode="decimal"
                      onChange={(e) => NUMERO.test(e.target.value)
                        && setFila({ ...fila, peso: e.target.value })}
                      style={{ ...s.input, flex: '0 1 80px' }} />
                  </div>
                  <input value={fila.nombre} placeholder="Nombre del estándar"
                    onChange={(e) => setFila({ ...fila, nombre: e.target.value })}
                    style={{ ...s.input, width: '100%', marginTop: 8 }} />
                  <div style={s.acciones}>
                    <button type="button" style={s.botonPlano} onClick={() => setFila(null)}>
                      Cancelar
                    </button>
                    <button type="button" disabled={pendiente}
                      style={{ ...s.botonSec, borderColor: color, color }}
                      onClick={() => {
                        correr(() => guardarItem(c.id, {
                          id: fila.id,
                          codigo: fila.codigo,
                          ciclo: fila.ciclo,
                          capitulo: fila.capitulo,
                          nombre: fila.nombre,
                          peso: Number(fila.peso.replace(',', '.')) || 0,
                        }));
                        setFila(null);
                      }}>
                      {fila.id ? 'Guardar cambios' : 'Agregar'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {items.length === 0 ? (
            <p style={s.nota}>
              El conjunto está vacío. Descarga la plantilla, llénala con los
              estándares de tu resolución e impórtala. Las columnas son{' '}
              <strong>codigo, ciclo, capitulo, nombre y peso</strong>; el ciclo debe
              ser {CICLOS.join(', ')}.
            </p>
          ) : (
            <div style={s.contenedor}>
              <table style={s.tabla}>
                <thead>
                  <tr>
                    {['Código', 'Ciclo', 'Capítulo', 'Estándar', 'Peso', ''].map((h, i) => (
                      <th key={i} style={s.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map((i) => (
                    <tr key={i.id}>
                      <td style={s.tdCodigo}>{i.codigo}</td>
                      <td style={s.td}>{i.ciclo}</td>
                      <td style={s.td}>{i.capitulo}</td>
                      <td style={s.td}>{i.nombre}</td>
                      <td style={s.tdPeso}>{i.peso}</td>
                      <td style={s.td}>
                        {!c.es_sistema && (
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button type="button" style={s.botonMini}
                              onClick={() => setFila({
                                id: i.id, codigo: i.codigo, ciclo: i.ciclo,
                                capitulo: i.capitulo, nombre: i.nombre, peso: String(i.peso),
                              })}>
                              Editar
                            </button>
                            <button type="button" disabled={pendiente}
                              style={{ ...s.botonMini, color: 'var(--mal)' }}
                              onClick={() => correr(() => eliminarItem(i.id))}>
                              Quitar
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </>
  );
}

const s: Record<string, React.CSSProperties> = {
  aviso: { padding: '10px 13px', borderRadius: 8, fontSize: 13, marginBottom: 14 },
  errores: {
    background: 'var(--mal-fondo)', border: '1px solid var(--mal)', borderRadius: 8,
    padding: '12px 15px', marginBottom: 14,
  },
  erroresTitulo: { fontSize: 13, fontWeight: 700, color: 'var(--mal)', marginBottom: 7 },
  listaErrores: { margin: 0, paddingLeft: 18 },
  errorItem: { fontSize: 12.5, color: 'var(--mal)', lineHeight: 1.6 },

  rejilla: {
    display: 'grid', gap: 12, marginBottom: 14,
    gridTemplateColumns: 'repeat(auto-fill,minmax(250px,1fr))',
  },
  tarjeta: {
    background: 'var(--superficie)', borderWidth: 1, borderStyle: 'solid', borderRadius: 12,
    padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 5,
  },
  tarjetaCab: { display: 'flex', gap: 8, alignItems: 'flex-start', flexWrap: 'wrap' },
  tarjetaNombre: { fontSize: 14, fontWeight: 700, color: 'var(--texto)', margin: 0, flex: 1 },
  sistema: {
    fontSize: 9.5, fontWeight: 700, background: 'var(--superficie-3)', color: 'var(--texto-suave)',
    padding: '2px 8px', borderRadius: 20, textTransform: 'uppercase', letterSpacing: .4,
  },
  norma: { fontSize: 11.5, color: 'var(--texto-tenue)' },
  desc: { fontSize: 12, color: 'var(--texto-suave)', margin: '4px 0 0', lineHeight: 1.5 },
  editorFila: {
    background: 'var(--fondo)', border: '1px solid var(--borde)',
    borderRadius: 8, padding: '12px 14px',
  },
  cifras: {
    display: 'flex', justifyContent: 'space-between', fontSize: 12,
    color: 'var(--texto-suave)', marginTop: 2, fontVariantNumeric: 'tabular-nums',
  },
  tarjetaAcciones: { display: 'flex', gap: 5, marginTop: 8, flexWrap: 'wrap' },

  barra: { display: 'flex', marginBottom: 18 },
  formNuevo: { display: 'flex', gap: 8, flexWrap: 'wrap', width: '100%', alignItems: 'center' },

  bloque: {
    background: 'var(--superficie)', border: '1px solid var(--borde)', borderRadius: 12,
    padding: '16px 18px',
  },
  detalleCab: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    gap: 14, flexWrap: 'wrap', marginBottom: 12,
  },
  h2: { fontSize: 16, fontWeight: 700, color: 'var(--texto)', margin: 0 },
  sub: { fontSize: 12.5, color: 'var(--texto-suave)', margin: '3px 0 0' },
  nota: { fontSize: 13, color: 'var(--texto-suave)', lineHeight: 1.65, margin: 0, maxWidth: 620 },
  avisoPeso: {
    background: 'var(--aviso-fondo)', border: '1px solid var(--aviso)', color: 'var(--aviso)',
    borderRadius: 8, padding: '10px 13px', fontSize: 12.5, lineHeight: 1.6, marginBottom: 12,
  },
  avisoSistema: {
    background: 'var(--fondo)', border: '1px solid var(--borde)', color: 'var(--texto-suave)',
    borderRadius: 8, padding: '10px 13px', fontSize: 12.5, lineHeight: 1.6, marginBottom: 12,
  },

  contenedor: { overflowX: 'auto', border: '1px solid var(--borde)', borderRadius: 8 },
  tabla: { width: '100%', borderCollapse: 'collapse', fontSize: 12.5, minWidth: 640 },
  th: {
    textAlign: 'left', padding: '9px 10px', background: 'var(--fondo)', color: 'var(--texto-suave)',
    fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: .4,
    borderBottom: '1px solid var(--borde)', whiteSpace: 'nowrap',
  },
  td: { padding: '8px 10px', borderBottom: '1px solid var(--superficie-3)', color: 'var(--texto)' },
  tdCodigo: {
    padding: '8px 10px', borderBottom: '1px solid var(--superficie-3)',
    fontFamily: "'Consolas','Courier New',monospace", fontWeight: 600, whiteSpace: 'nowrap',
  },
  tdPeso: {
    padding: '8px 10px', borderBottom: '1px solid var(--superficie-3)',
    textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap',
  },

  input: {
    padding: '8px 11px', border: '1px solid var(--borde)', borderRadius: 8,
    fontSize: 13, boxSizing: 'border-box', fontFamily: 'inherit',
  },
  botonPlano: {
    background: 'none', border: 'none', color: 'var(--texto-suave)',
    fontSize: 12.5, fontWeight: 600, cursor: 'pointer', padding: '8px 12px',
  },
  botonSec: {
    background: 'var(--superficie)', borderWidth: 1, borderStyle: 'solid', borderRadius: 8,
    padding: '8px 16px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
  },
  botonLleno: {
    color: 'var(--sobre-marca)', border: 'none', padding: '9px 20px', borderRadius: 8,
    fontSize: 13, fontWeight: 600, cursor: 'pointer',
  },
  botonMini: {
    background: 'var(--superficie)', border: '1px solid var(--borde)', borderRadius: 7,
    padding: '5px 11px', fontSize: 11.5, fontWeight: 600,
    color: 'var(--texto)', cursor: 'pointer', whiteSpace: 'nowrap', textDecoration: 'none',
  },
};
