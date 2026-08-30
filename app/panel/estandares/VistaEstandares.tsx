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
  type ConjuntoResumen, type ItemConjunto, type FilaImportada,
} from '@/lib/acciones-conjuntos';

const CICLOS = ['planear', 'hacer', 'verificar', 'actuar'];

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
          background: aviso.tipo === 'ok' ? '#E6F4EA' : '#FDF2F2',
          color: aviso.tipo === 'ok' ? '#1E6B3A' : '#9B1C1C',
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

      {/* ---------- Conjuntos ---------- */}
      <div style={s.rejilla}>
        {conjuntos.map((x) => (
          <article key={x.id} style={{
            ...s.tarjeta,
            borderColor: c?.id === x.id ? color : '#E4E4DF',
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
                color: Math.abs(Number(x.peso_total) - 100) < 0.01 ? '#1E6B3A' : '#9A3412',
              }}>
                {x.peso_total} puntos
              </span>
            </div>
            <div style={s.tarjetaAcciones}>
              <a href={`/panel/estandares?id=${x.id}`} style={s.botonMini}>Ver</a>
              <button type="button" style={s.botonMini} disabled={pendiente}
                onClick={() => correr(() => duplicarConjunto(x.id, `${x.nombre} (copia)`))}>
                Duplicar
              </button>
              {!x.es_sistema && (
                <button type="button" style={{ ...s.botonMini, color: '#9B1C1C' }} disabled={pendiente}
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
            <div>
              <h2 style={s.h2}>{c.nombre}</h2>
              <p style={s.sub}>
                {c.estandares} estándares ·{' '}
                <strong style={{ color: suma100 ? '#1E6B3A' : '#9A3412' }}>
                  {c.peso_total} puntos
                </strong>
                {c.es_sistema && ' · no editable'}
              </p>
            </div>
            {!c.es_sistema && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
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
                    {['Código', 'Ciclo', 'Capítulo', 'Estándar', 'Peso'].map((h, i) => (
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
    background: '#FDF2F2', border: '1px solid #F5C6C6', borderRadius: 9,
    padding: '12px 15px', marginBottom: 14,
  },
  erroresTitulo: { fontSize: 13, fontWeight: 700, color: '#9B1C1C', marginBottom: 7 },
  listaErrores: { margin: 0, paddingLeft: 18 },
  errorItem: { fontSize: 12.5, color: '#9B1C1C', lineHeight: 1.6 },

  rejilla: {
    display: 'grid', gap: 12, marginBottom: 14,
    gridTemplateColumns: 'repeat(auto-fill,minmax(250px,1fr))',
  },
  tarjeta: {
    background: '#fff', borderWidth: 1, borderStyle: 'solid', borderRadius: 12,
    padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 5,
  },
  tarjetaCab: { display: 'flex', gap: 8, alignItems: 'flex-start', flexWrap: 'wrap' },
  tarjetaNombre: { fontSize: 14, fontWeight: 700, color: '#14263F', margin: 0, flex: 1 },
  sistema: {
    fontSize: 9.5, fontWeight: 700, background: '#F0F0EC', color: '#5B6470',
    padding: '2px 8px', borderRadius: 20, textTransform: 'uppercase', letterSpacing: .4,
  },
  norma: { fontSize: 11.5, color: '#8A929C' },
  cifras: {
    display: 'flex', justifyContent: 'space-between', fontSize: 12,
    color: '#5B6470', marginTop: 2, fontVariantNumeric: 'tabular-nums',
  },
  tarjetaAcciones: { display: 'flex', gap: 5, marginTop: 8, flexWrap: 'wrap' },

  barra: { display: 'flex', marginBottom: 18 },
  formNuevo: { display: 'flex', gap: 8, flexWrap: 'wrap', width: '100%', alignItems: 'center' },

  bloque: {
    background: '#fff', border: '1px solid #E4E4DF', borderRadius: 12,
    padding: '16px 18px',
  },
  detalleCab: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    gap: 14, flexWrap: 'wrap', marginBottom: 12,
  },
  h2: { fontSize: 16, fontWeight: 700, color: '#14263F', margin: 0 },
  sub: { fontSize: 12.5, color: '#5B6470', margin: '3px 0 0' },
  nota: { fontSize: 13, color: '#5B6470', lineHeight: 1.65, margin: 0, maxWidth: 620 },
  avisoPeso: {
    background: '#FFF7ED', border: '1px solid #FED7AA', color: '#7C2D12',
    borderRadius: 8, padding: '10px 13px', fontSize: 12.5, lineHeight: 1.6, marginBottom: 12,
  },
  avisoSistema: {
    background: '#F7F7F4', border: '1px solid #E4E4DF', color: '#5B6470',
    borderRadius: 8, padding: '10px 13px', fontSize: 12.5, lineHeight: 1.6, marginBottom: 12,
  },

  contenedor: { overflowX: 'auto', border: '1px solid #E4E4DF', borderRadius: 9 },
  tabla: { width: '100%', borderCollapse: 'collapse', fontSize: 12.5, minWidth: 640 },
  th: {
    textAlign: 'left', padding: '9px 10px', background: '#F7F7F4', color: '#5B6470',
    fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: .4,
    borderBottom: '1px solid #E4E4DF', whiteSpace: 'nowrap',
  },
  td: { padding: '8px 10px', borderBottom: '1px solid #F0F0EC', color: '#14263F' },
  tdCodigo: {
    padding: '8px 10px', borderBottom: '1px solid #F0F0EC',
    fontFamily: "'Consolas','Courier New',monospace", fontWeight: 600, whiteSpace: 'nowrap',
  },
  tdPeso: {
    padding: '8px 10px', borderBottom: '1px solid #F0F0EC',
    textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap',
  },

  input: {
    padding: '8px 11px', border: '1px solid #E4E4DF', borderRadius: 8,
    fontSize: 13, boxSizing: 'border-box', fontFamily: 'inherit',
  },
  botonPlano: {
    background: 'none', border: 'none', color: '#5B6470',
    fontSize: 12.5, fontWeight: 600, cursor: 'pointer', padding: '8px 12px',
  },
  botonSec: {
    background: '#fff', borderWidth: 1, borderStyle: 'solid', borderRadius: 8,
    padding: '8px 16px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
  },
  botonLleno: {
    color: '#fff', border: 'none', padding: '9px 20px', borderRadius: 8,
    fontSize: 13, fontWeight: 600, cursor: 'pointer',
  },
  botonMini: {
    background: '#fff', border: '1px solid #E4E4DF', borderRadius: 7,
    padding: '5px 11px', fontSize: 11.5, fontWeight: 600,
    color: '#14263F', cursor: 'pointer', whiteSpace: 'nowrap', textDecoration: 'none',
  },
};
