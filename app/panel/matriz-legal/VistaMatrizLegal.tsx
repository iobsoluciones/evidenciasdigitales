'use client';

/**
 * MATRIZ LEGAL — estándar 2.7.1
 * ---------------------------------------------------------------
 * El catálogo base llega hecho, pero es un PUNTO DE PARTIDA: la matriz
 * depende del sector, la actividad y el nivel de riesgo de cada cliente,
 * y ninguna lista genérica puede saber eso. Por eso se entrega editable
 * y se puede importar un Excel completo (§5.22).
 *
 * «Cumple» exige escribir la evidencia. Una matriz que dice que cumple
 * sin decir con qué se demuestra es lo que un auditor desarma en la
 * primera pregunta.
 *
 * Lo que NO aplica se conserva marcado como tal, no se borra: poder
 * mostrar que se analizó y se descartó es parte de haber hecho la
 * identificación.
 */
import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';
import {
  sembrarMatriz, agregarNormaAMatriz, guardarItemMatriz, eliminarItemMatriz,
  guardarNorma, importarNormas, enviarMatrizLegal,
  type ItemMatriz, type ResumenMatriz, type Norma,
  type TipoNorma, type Cumplimiento, type FilaNorma,
} from '@/lib/acciones-matriz-legal';

const TIPOS: { v: TipoNorma; t: string }[] = [
  { v: 'ley', t: 'Ley' },
  { v: 'decreto', t: 'Decreto' },
  { v: 'resolucion', t: 'Resolución' },
  { v: 'circular', t: 'Circular' },
  { v: 'ntc', t: 'NTC' },
  { v: 'acuerdo', t: 'Acuerdo' },
  { v: 'otro', t: 'Otro' },
];

const CUMPLE: { v: Cumplimiento; t: string; fondo: string; color: string }[] = [
  { v: 'cumple', t: 'Cumple', fondo: '#E6F4EA', color: '#1E6B3A' },
  { v: 'cumple_parcial', t: 'Parcial', fondo: '#FEF3C7', color: '#92400E' },
  { v: 'no_cumple', t: 'No cumple', fondo: '#FDF2F2', color: '#9B1C1C' },
];

const EJEMPLO = [
  {
    tipo: 'resolucion', numero: '1409', anio: 2012,
    titulo: 'Reglamento de seguridad para protección contra caídas',
    emisor: 'Ministerio de Trabajo', tema: 'Alto riesgo',
    articulos: 'Art. 3 a 26', enlace: '', transversal: 'no',
  },
  {
    tipo: 'ntc', numero: '4435', anio: 2010,
    titulo: 'Hojas de seguridad para materiales', emisor: 'Icontec',
    tema: 'Químicos', articulos: '', enlace: '', transversal: 'no',
  },
];

const VACIO_NORMA = {
  id: undefined as string | undefined,
  tipo: 'resolucion' as TipoNorma, numero: '', anio: new Date().getFullYear(),
  titulo: '', emisor: '', tema: '', articulos: '', enlace: '',
  transversal: false,
};

export default function VistaMatrizLegal({
  items,
  resumen,
  catalogo,
  empresaId,
  color,
}: {
  items: ItemMatriz[];
  resumen: ResumenMatriz;
  catalogo: Norma[];
  empresaId: string;
  color: string;
}) {
  const router = useRouter();
  const archivoRef = useRef<HTMLInputElement>(null);
  const [pendiente, startTransition] = useTransition();
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);
  const [errores, setErrores] = useState<string[]>([]);
  const [editando, setEditando] = useState<{
    id: string; aplica: boolean; cumplimiento: Cumplimiento;
    evidencia: string; responsable: string; fecha: string; observaciones: string;
  } | null>(null);
  const [formNorma, setFormNorma] = useState<typeof VACIO_NORMA | null>(null);
  const [agregando, setAgregando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [correo, setCorreo] = useState({ para: '', mensaje: '' });

  useEffect(() => {
    if (aviso?.tipo !== 'ok') return;
    const t = setTimeout(() => setAviso(null), 2600);
    return () => clearTimeout(t);
  }, [aviso]);

  const correr = (
    fn: () => Promise<{ ok: boolean; mensaje: string; errores?: string[] }>
  ) => {
    setAviso(null);
    setErrores([]);
    startTransition(async () => {
      const r = await fn();
      setAviso({ tipo: r.ok ? 'ok' : 'error', texto: r.mensaje });
      if (r.errores) setErrores(r.errores);
      if (r.ok) router.refresh();
    });
  };

  function descargarPlantilla() {
    const hoja = XLSX.utils.json_to_sheet(EJEMPLO);
    hoja['!cols'] = [
      { wch: 12 }, { wch: 10 }, { wch: 8 }, { wch: 56 },
      { wch: 24 }, { wch: 18 }, { wch: 16 }, { wch: 24 }, { wch: 12 },
    ];
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, 'Normas');
    XLSX.writeFile(libro, 'Plantilla_matriz_legal.xlsx');
  }

  function alElegirArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    if (!archivo) return;

    const lector = new FileReader();
    lector.onload = (ev) => {
      try {
        const libro = XLSX.read(ev.target?.result, { type: 'binary' });
        const hoja = libro.Sheets[libro.SheetNames[0]];
        const bruto = XLSX.utils.sheet_to_json<Record<string, unknown>>(hoja);

        const filas: FilaNorma[] = bruto.map((f) => ({
          tipo: String(f.tipo ?? f.Tipo ?? '').trim(),
          numero: String(f.numero ?? f.Numero ?? f['número'] ?? f['Número'] ?? '').trim(),
          anio: (f.anio ?? f.Anio ?? f['año'] ?? f['Año'] ?? '') as number | string,
          titulo: String(f.titulo ?? f.Titulo ?? f['título'] ?? f['Título'] ?? '').trim(),
          emisor: String(f.emisor ?? f.Emisor ?? '').trim(),
          tema: String(f.tema ?? f.Tema ?? '').trim(),
          articulos: String(f.articulos ?? f.Articulos ?? f['artículos'] ?? '').trim(),
          enlace: String(f.enlace ?? f.Enlace ?? '').trim(),
          transversal: String(f.transversal ?? f.Transversal ?? '').trim(),
        }));

        correr(() => importarNormas(filas));
      } catch {
        setAviso({ tipo: 'error', texto: 'No se pudo leer el archivo. ¿Es un Excel válido?' });
      }
      if (archivoRef.current) archivoRef.current.value = '';
    };
    lector.readAsBinaryString(archivo);
  }

  const enMatriz = new Set(items.map((i) => `${i.tipo}|${i.numero}|${i.anio}`));
  const disponibles = catalogo.filter(
    (n) => !enMatriz.has(`${n.tipo}|${n.numero}|${n.anio}`)
  );

  return (
    <>
      {aviso && (
        <div role="status" aria-live="polite" style={{
          ...s.aviso,
          background: aviso.tipo === 'ok' ? '#E6F4EA' : '#FDF2F2',
          color: aviso.tipo === 'ok' ? '#1E6B3A' : '#9B1C1C',
          border: `1px solid ${aviso.tipo === 'ok' ? '#BFE3CB' : '#F3C7C7'}`,
        }}>{aviso.texto}</div>
      )}

      {errores.length > 0 && (
        <div style={s.errores}>
          <div style={s.erroresTitulo}>No se importó nada. Corrige el archivo:</div>
          <ul style={s.listaErrores}>
            {errores.map((e, i) => <li key={i} style={s.errorItem}>{e}</li>)}
          </ul>
        </div>
      )}

      {items.length > 0 && (
        <div style={s.resumen}>
          <Tarjeta n={resumen.aplican} t="Le aplican" fondo="#fff" color="#14263F" borde />
          <Tarjeta n={resumen.cumple} t="Cumplen" fondo="#E6F4EA" color="#1E6B3A" />
          <Tarjeta n={resumen.parcial} t="Parcial" fondo="#FEF3C7" color="#92400E" />
          <Tarjeta n={resumen.no_cumple} t="No cumplen" fondo="#FDF2F2" color="#9B1C1C" />
          <Tarjeta n={resumen.sin_evaluar} t="Sin evaluar" fondo="#F0F0EC" color="#5B6470" />
        </div>
      )}

      <div style={s.barra}>
        {items.length === 0 && (
          <button type="button" disabled={pendiente}
            style={{ ...s.botonLleno, background: color }}
            onClick={() => correr(sembrarMatriz)}>
            Cargar la normativa base
          </button>
        )}
        {items.length > 0 && (
          <button type="button" disabled={pendiente} style={s.botonSec}
            onClick={() => correr(sembrarMatriz)}>
            Actualizar con la base
          </button>
        )}
        <button type="button" style={s.botonSec} onClick={() => setAgregando(true)}>
          Agregar del catálogo
        </button>
        <button type="button" style={s.botonSec} onClick={() => setFormNorma({ ...VACIO_NORMA })}>
          Crear una norma
        </button>
        <button type="button" style={s.botonSec} onClick={descargarPlantilla}>
          Plantilla Excel
        </button>
        <button type="button" style={s.botonSec} disabled={pendiente}
          onClick={() => archivoRef.current?.click()}>
          Importar Excel
        </button>
        <a href={`/api/pdf-matriz-legal/${empresaId}`} target="_blank" rel="noopener"
          style={{ ...s.botonSec, textDecoration: 'none' }}>
          Descargar PDF
        </a>
        <button type="button" style={s.botonSec} onClick={() => setEnviando(true)}>
          Enviar por correo
        </button>
      </div>

      <input ref={archivoRef} type="file" accept=".xlsx,.xls"
        onChange={alElegirArchivo} style={{ display: 'none' }} />

      {enviando && (
        <section style={s.bloque}>
          <div style={s.h3}>Enviar la matriz</div>
          <label style={s.label}>Destinatarios</label>
          <input value={correo.para} style={s.input}
            onChange={(e) => setCorreo({ ...correo, para: e.target.value })} />
          <p style={s.ayuda}>Separa varios con coma.</p>
          <label style={{ ...s.label, marginTop: 10 }}>Mensaje</label>
          <textarea rows={2} value={correo.mensaje} style={{ ...s.input, resize: 'vertical' }}
            onChange={(e) => setCorreo({ ...correo, mensaje: e.target.value })} />
          <div style={s.acciones}>
            <button type="button" style={s.botonPlano} onClick={() => setEnviando(false)}>
              Cancelar
            </button>
            <button type="button" disabled={pendiente}
              style={{ ...s.botonLleno, background: color }}
              onClick={() => {
                correr(() => enviarMatrizLegal(correo.para, correo.mensaje));
                setEnviando(false);
              }}>
              Enviar
            </button>
          </div>
        </section>
      )}

      {/* ---------- Agregar del catálogo ---------- */}
      {agregando && (
        <section style={s.bloque}>
          <div style={s.h3}>Agregar una norma del catálogo</div>
          {disponibles.length === 0 ? (
            <p style={s.nota}>
              Ya están todas las normas del catálogo en esta matriz. Crea una
              norma nueva o importa un Excel para ampliarlo.
            </p>
          ) : (
            <div style={s.listaCatalogo}>
              {disponibles.map((n) => (
                <div key={n.id} style={s.catalogoFila}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={s.catalogoNorma}>
                      {TIPOS.find((t) => t.v === n.tipo)?.t ?? n.tipo} {n.numero} de {n.anio}
                      {n.del_sistema && <span style={s.chipSistema}>del sistema</span>}
                    </div>
                    <div style={s.catalogoTitulo}>{n.titulo}</div>
                  </div>
                  <button type="button" style={s.botonMini} disabled={pendiente}
                    onClick={() => correr(() => agregarNormaAMatriz(n.id))}>
                    Agregar
                  </button>
                </div>
              ))}
            </div>
          )}
          <div style={s.acciones}>
            <button type="button" style={s.botonPlano} onClick={() => setAgregando(false)}>
              Cerrar
            </button>
          </div>
        </section>
      )}

      {/* ---------- Crear norma propia ---------- */}
      {formNorma && (
        <section style={s.bloque}>
          <div style={s.h3}>Norma nueva en tu catálogo</div>
          <p style={s.nota}>
            Queda en tu catálogo, disponible para todas tus empresas. El catálogo
            del sistema es de solo lectura.
          </p>
          <div style={s.fila}>
            <Campo etiqueta="Tipo" ancho={130}>
              <select value={formNorma.tipo} style={s.input}
                onChange={(e) => setFormNorma({ ...formNorma, tipo: e.target.value as TipoNorma })}>
                {TIPOS.map((t) => <option key={t.v} value={t.v}>{t.t}</option>)}
              </select>
            </Campo>
            <Campo etiqueta="Número" ancho={110}>
              <input value={formNorma.numero} style={s.input}
                onChange={(e) => setFormNorma({ ...formNorma, numero: e.target.value })} />
            </Campo>
            <Campo etiqueta="Año" ancho={100}>
              <input value={formNorma.anio} style={s.input} inputMode="numeric"
                onChange={(e) => setFormNorma({
                  ...formNorma, anio: Number(e.target.value.replace(/\D/g, '')) || 0,
                })} />
            </Campo>
            <Campo etiqueta="Emisor" ancho={190}>
              <input value={formNorma.emisor} style={s.input}
                placeholder="Ministerio de Trabajo"
                onChange={(e) => setFormNorma({ ...formNorma, emisor: e.target.value })} />
            </Campo>
          </div>
          <Campo etiqueta="Título" ancho={9999}>
            <input value={formNorma.titulo} style={s.input}
              onChange={(e) => setFormNorma({ ...formNorma, titulo: e.target.value })} />
          </Campo>
          <div style={s.fila}>
            <Campo etiqueta="Tema" ancho={180}>
              <input value={formNorma.tema} style={s.input}
                placeholder="Alto riesgo, químicos, psicosocial…"
                onChange={(e) => setFormNorma({ ...formNorma, tema: e.target.value })} />
            </Campo>
            <Campo etiqueta="Artículos aplicables" ancho={180}>
              <input value={formNorma.articulos} style={s.input}
                placeholder="Art. 3 a 26"
                onChange={(e) => setFormNorma({ ...formNorma, articulos: e.target.value })} />
            </Campo>
            <Campo etiqueta="Enlace" ancho={220}>
              <input value={formNorma.enlace} style={s.input}
                onChange={(e) => setFormNorma({ ...formNorma, enlace: e.target.value })} />
            </Campo>
          </div>
          <label style={s.check}>
            <input type="checkbox" checked={formNorma.transversal}
              onChange={(e) => setFormNorma({ ...formNorma, transversal: e.target.checked })} />
            Aplica a cualquier empresa (se cargará al sembrar la matriz)
          </label>
          <div style={s.acciones}>
            <button type="button" style={s.botonPlano} onClick={() => setFormNorma(null)}>
              Cancelar
            </button>
            <button type="button" disabled={pendiente}
              style={{ ...s.botonLleno, background: color }}
              onClick={() => {
                correr(() => guardarNorma(formNorma));
                setFormNorma(null);
              }}>
              Guardar
            </button>
          </div>
        </section>
      )}

      {/* ---------- Matriz ---------- */}
      {items.length === 0 ? (
        <div style={s.bloque}>
          <p style={s.nota}>
            La matriz está vacía. Carga la normativa base y luego revísala: la
            matriz legal depende del sector, la actividad y el nivel de riesgo de
            cada cliente, y ninguna lista genérica puede saber eso. Lo que no
            aplique, márcalo como tal en vez de borrarlo.
          </p>
        </div>
      ) : (
        <div style={s.contenedor}>
          <table style={s.tabla}>
            <thead>
              <tr>
                <th style={{ ...s.th, textAlign: 'left' }}>Norma</th>
                <th style={{ ...s.th, textAlign: 'left' }}>De qué trata</th>
                <th style={s.th}>Estado</th>
                <th style={{ ...s.th, textAlign: 'left' }}>Evidencia</th>
                <th style={s.th}></th>
              </tr>
            </thead>
            <tbody>
              {items.map((i) => {
                const c = CUMPLE.find((x) => x.v === i.cumplimiento);
                return (
                  <tr key={i.id}>
                    <td style={s.tdNorma}>
                      <div style={s.norma}>
                        {TIPOS.find((t) => t.v === i.tipo)?.t ?? i.tipo} {i.numero} de {i.anio}
                      </div>
                      {i.emisor && <div style={s.meta}>{i.emisor}</div>}
                      {i.articulos && <div style={s.meta}>{i.articulos}</div>}
                    </td>
                    <td style={s.td}>
                      <div style={s.titulo}>{i.titulo}</div>
                      {i.tema && <div style={s.meta}>{i.tema}</div>}
                    </td>
                    <td style={{ ...s.td, textAlign: 'center' }}>
                      {!i.aplica ? (
                        <span style={{ ...s.chip, background: '#F0F0EC', color: '#5B6470' }}>
                          No aplica
                        </span>
                      ) : c ? (
                        <span style={{ ...s.chip, background: c.fondo, color: c.color }}>
                          {c.t}
                        </span>
                      ) : (
                        <span style={{ ...s.chip, background: '#F0F0EC', color: '#8A929C' }}>
                          Sin evaluar
                        </span>
                      )}
                      {i.fecha_verificacion && (
                        <div style={s.meta}>
                          {new Date(i.fecha_verificacion + 'T12:00:00')
                            .toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                        </div>
                      )}
                    </td>
                    <td style={s.td}>
                      <div style={s.evidencia}>{i.evidencia ?? '—'}</div>
                      {i.responsable && <div style={s.meta}>{i.responsable}</div>}
                    </td>
                    <td style={{ ...s.td, textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button type="button" style={s.botonMini}
                        onClick={() => setEditando({
                          id: i.id, aplica: i.aplica, cumplimiento: i.cumplimiento,
                          evidencia: i.evidencia ?? '', responsable: i.responsable ?? '',
                          fecha: i.fecha_verificacion ?? '',
                          observaciones: i.observaciones ?? '',
                        })}>
                        Evaluar
                      </button>
                      <button type="button" disabled={pendiente}
                        style={{ ...s.botonMini, color: '#9B1C1C', marginLeft: 4 }}
                        onClick={() => correr(() => eliminarItemMatriz(i.id))}>
                        Quitar
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ---------- Evaluar un requisito ---------- */}
      {editando && (
        <section style={{ ...s.bloque, marginTop: 14 }}>
          <div style={s.h3}>Evaluar el requisito</div>

          <label style={s.check}>
            <input type="checkbox" checked={editando.aplica}
              onChange={(e) => setEditando({ ...editando, aplica: e.target.checked })} />
            Esta norma le aplica a la empresa
          </label>
          <p style={s.ayuda}>
            Si no le aplica, déjala marcada como tal en vez de borrarla: mostrar
            que se analizó y se descartó es parte de la identificación.
          </p>

          {editando.aplica && (
            <>
              <label style={{ ...s.label, marginTop: 12 }}>Estado de cumplimiento</label>
              <div style={s.opciones}>
                {CUMPLE.map((x) => (
                  <button key={x.v} type="button"
                    onClick={() => setEditando({ ...editando, cumplimiento: x.v })}
                    style={{
                      ...s.opcion,
                      ...(editando.cumplimiento === x.v
                        ? { background: x.fondo, color: x.color, borderColor: x.color, fontWeight: 700 }
                        : {}),
                    }}>
                    {x.t}
                  </button>
                ))}
              </div>

              <Campo etiqueta="Evidencia" ancho={9999}
                ayuda="Con qué se demuestra. Es la columna que revisa el auditor.">
                <textarea rows={2} value={editando.evidencia}
                  style={{ ...s.input, resize: 'vertical' }}
                  placeholder="Acta de conformación del COPASST COP-2026-01 y actas de reunión mensuales"
                  onChange={(e) => setEditando({ ...editando, evidencia: e.target.value })} />
              </Campo>

              <div style={s.fila}>
                <Campo etiqueta="Responsable" ancho={200}>
                  <input value={editando.responsable} style={s.input}
                    onChange={(e) => setEditando({ ...editando, responsable: e.target.value })} />
                </Campo>
                <Campo etiqueta="Fecha de verificación" ancho={170}>
                  <input type="date" value={editando.fecha} style={s.input}
                    onChange={(e) => setEditando({ ...editando, fecha: e.target.value })} />
                </Campo>
              </div>

              <Campo etiqueta="Observaciones" ancho={9999}>
                <textarea rows={2} value={editando.observaciones}
                  style={{ ...s.input, resize: 'vertical' }}
                  onChange={(e) => setEditando({ ...editando, observaciones: e.target.value })} />
              </Campo>
            </>
          )}

          <div style={s.acciones}>
            <button type="button" style={s.botonPlano} onClick={() => setEditando(null)}>
              Cancelar
            </button>
            <button type="button" disabled={pendiente}
              style={{ ...s.botonLleno, background: color }}
              onClick={() => {
                correr(() => guardarItemMatriz(editando));
                setEditando(null);
              }}>
              Guardar
            </button>
          </div>
        </section>
      )}
    </>
  );
}

function Tarjeta({
  n, t, fondo, color, borde,
}: {
  n: number; t: string; fondo: string; color: string; borde?: boolean;
}) {
  return (
    <div style={{
      ...s.tarjeta, background: fondo,
      border: borde ? '1px solid #E4E4DF' : 'none',
    }}>
      <span style={{ ...s.tarjetaN, color }}>{n}</span>
      <span style={{ ...s.tarjetaT, color }}>{t}</span>
    </div>
  );
}

function Campo({
  etiqueta, ayuda, ancho = 170, children,
}: {
  etiqueta: string; ayuda?: string; ancho?: number; children: React.ReactNode;
}) {
  return (
    <div style={{ flex: `1 1 ${ancho}px`, marginBottom: 10 }}>
      <label style={s.label}>{etiqueta}</label>
      {children}
      {ayuda && <p style={s.ayuda}>{ayuda}</p>}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  aviso: {
    position: 'fixed', right: 18, bottom: 18, zIndex: 60, maxWidth: 340,
    padding: '11px 15px', borderRadius: 9, fontSize: 13,
    boxShadow: '0 6px 20px rgba(20,38,63,.16)',
  },
  errores: {
    background: '#FDF2F2', border: '1px solid #F3C7C7', borderRadius: 10,
    padding: '12px 15px', marginBottom: 14,
  },
  erroresTitulo: { fontSize: 13, fontWeight: 700, color: '#9B1C1C', marginBottom: 6 },
  listaErrores: { margin: 0, paddingLeft: 18 },
  errorItem: { fontSize: 12.5, color: '#9B1C1C', lineHeight: 1.6 },

  resumen: {
    display: 'grid', gap: 10, marginBottom: 14,
    gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))',
  },
  tarjeta: {
    borderRadius: 10, padding: '12px 14px',
    display: 'flex', flexDirection: 'column', gap: 2,
  },
  tarjetaN: { fontSize: 22, fontWeight: 700, lineHeight: 1.1, fontVariantNumeric: 'tabular-nums' },
  tarjetaT: { fontSize: 11.5 },

  barra: { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 },
  bloque: {
    background: '#fff', border: '1px solid #E4E4DF', borderRadius: 12,
    padding: '15px 17px', marginBottom: 14,
  },
  h3: { fontSize: 14, fontWeight: 700, color: '#14263F', marginBottom: 10 },
  nota: { fontSize: 13, color: '#5B6470', lineHeight: 1.65, margin: '0 0 10px', maxWidth: 660 },
  fila: { display: 'flex', gap: 12, flexWrap: 'wrap' },
  label: { display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5, color: '#14263F' },
  input: {
    width: '100%', padding: '8px 11px', border: '1px solid #E4E4DF',
    borderRadius: 8, fontSize: 13, boxSizing: 'border-box',
    fontFamily: 'inherit', background: '#fff', color: '#14263F',
  },
  ayuda: { fontSize: 11.5, color: '#8A929C', margin: '4px 0 0', lineHeight: 1.5 },
  check: {
    display: 'flex', alignItems: 'center', gap: 8,
    fontSize: 13, color: '#14263F', cursor: 'pointer', marginTop: 4,
  },

  opciones: { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 },
  opcion: {
    background: '#fff', border: '1px solid #E4E4DF', borderRadius: 8,
    padding: '7px 18px', fontSize: 12.5, color: '#5B6470', cursor: 'pointer',
  },

  listaCatalogo: { maxHeight: 320, overflowY: 'auto', marginBottom: 6 },
  catalogoFila: {
    display: 'flex', gap: 10, alignItems: 'center',
    padding: '9px 0', borderTop: '1px solid #F0F0EC',
  },
  catalogoNorma: { fontSize: 12.5, fontWeight: 700, color: '#14263F' },
  catalogoTitulo: { fontSize: 12, color: '#5B6470', marginTop: 2, lineHeight: 1.45 },
  chipSistema: {
    fontSize: 9.5, fontWeight: 700, background: '#EEF2F7', color: '#374151',
    padding: '2px 7px', borderRadius: 4, marginLeft: 8,
  },

  contenedor: {
    background: '#fff', border: '1px solid #E4E4DF',
    borderRadius: 12, overflowX: 'auto',
  },
  tabla: { width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 860 },
  th: {
    textAlign: 'center', padding: '10px 10px', background: '#F7F7F4', color: '#5B6470',
    fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: .4,
    borderBottom: '1px solid #E4E4DF', whiteSpace: 'nowrap',
  },
  td: { padding: '10px', borderBottom: '1px solid #F0F0EC', verticalAlign: 'top' },
  tdNorma: {
    padding: '10px 12px', borderBottom: '1px solid #F0F0EC',
    verticalAlign: 'top', minWidth: 150,
  },
  norma: { fontSize: 12.5, fontWeight: 700, color: '#14263F' },
  titulo: { fontSize: 12.5, color: '#14263F', lineHeight: 1.45 },
  evidencia: { fontSize: 12, color: '#374151', lineHeight: 1.45 },
  meta: { fontSize: 11, color: '#8A929C', marginTop: 2, lineHeight: 1.4 },
  chip: {
    fontSize: 10.5, fontWeight: 700, padding: '3px 10px',
    borderRadius: 20, whiteSpace: 'nowrap', display: 'inline-block',
  },

  acciones: { display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 10 },
  botonPlano: {
    background: 'none', border: 'none', color: '#5B6470',
    fontSize: 12.5, fontWeight: 600, cursor: 'pointer', padding: '8px 12px',
  },
  botonSec: {
    background: '#fff', border: '1px solid #E4E4DF', borderRadius: 8,
    padding: '9px 16px', fontSize: 13, fontWeight: 600,
    color: '#14263F', cursor: 'pointer',
  },
  botonLleno: {
    color: '#fff', border: 'none', padding: '9px 20px', borderRadius: 8,
    fontSize: 13, fontWeight: 600, cursor: 'pointer',
  },
  botonMini: {
    background: '#fff', border: '1px solid #E4E4DF', borderRadius: 7,
    padding: '5px 11px', fontSize: 11.5, fontWeight: 600,
    color: '#14263F', cursor: 'pointer', whiteSpace: 'nowrap',
  },
};
