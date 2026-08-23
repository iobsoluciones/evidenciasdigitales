'use client';

/**
 * GESTIÓN DE EMPLEADOS
 * ---------------------------------------------------------------
 * Base contra la que se valida al asistente en el registro público.
 *
 * El Excel se lee EN EL NAVEGADOR con SheetJS y se envían las filas
 * ya convertidas: no hay que subir el archivo a ningún lado ni
 * procesarlo en el servidor.
 */
import { useState, useTransition, useRef } from 'react';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';
import Link from 'next/link';
import {
  agregarEmpleado, actualizarEmpleado, retirarEmpleado, cargarEmpleados,
} from '@/lib/acciones-empleados';
import type { EmpleadoParticipacion } from '@/lib/acciones-ficha';

const VACIO = { identificacion: '', nombres: '', cargo: '', area: '', ciudad: '' };

/** Encabezados admitidos en la plantilla, tolerando variantes. */
const COLUMNAS: Record<string, string[]> = {
  identificacion: ['identificacion', 'identificación', 'cedula', 'cédula', 'documento', 'id'],
  nombres: ['nombres', 'nombre', 'nombre completo', 'apellidos y nombres'],
  cargo: ['cargo', 'puesto'],
  area: ['area', 'área', 'departamento'],
  ciudad: ['ciudad', 'sede'],
};

/** Localiza cada columna sin exigir un orden fijo en el archivo. */
function mapearColumnas(encabezados: string[]): Record<string, number> {
  const mapa: Record<string, number> = {};
  encabezados.forEach((h, i) => {
    const limpio = String(h ?? '').trim().toLowerCase();
    for (const [campo, alias] of Object.entries(COLUMNAS)) {
      if (alias.includes(limpio) && mapa[campo] === undefined) mapa[campo] = i;
    }
  });
  return mapa;
}

export default function GestorEmpleados({
  empleados,
  empresaNombre,
  color,
  esAdmin,
}: {
  empleados: EmpleadoParticipacion[];
  empresaNombre: string;
  color: string;
  esAdmin: boolean;
}) {
  const router = useRouter();
  const [pendiente, startTransition] = useTransition();
  const archivoRef = useRef<HTMLInputElement>(null);

  const [f, setF] = useState(VACIO);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [filtroArea, setFiltroArea] = useState('');
  const [pagina, setPagina] = useState(0);
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);
  const [errores, setErrores] = useState<string[]>([]);
  const [leyendo, setLeyendo] = useState(false);

  // Áreas presentes, para el desplegable
  const areas = Array.from(
    new Set(empleados.map((e) => e.area).filter(Boolean) as string[])
  ).sort();

  const filtrados = empleados.filter((e) => {
    if (filtroArea && e.area !== filtroArea) return false;
    if (!busqueda) return true;
    return `${e.identificacion} ${e.nombres} ${e.cargo ?? ''} ${e.area ?? ''}`
      .toLowerCase().includes(busqueda.toLowerCase());
  });

  // Con cientos de empleados la tabla completa es inmanejable:
  // se muestran 8 por página.
  const POR_PAGINA = 8;
  const paginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA));
  const paginaSegura = Math.min(pagina, paginas - 1);
  const visibles = filtrados.slice(
    paginaSegura * POR_PAGINA,
    paginaSegura * POR_PAGINA + POR_PAGINA
  );

  function guardar() {
    startTransition(async () => {
      const r = editandoId
        ? await actualizarEmpleado(editandoId, f)
        : await agregarEmpleado(f);
      setAviso({ tipo: r.ok ? 'ok' : 'error', texto: r.mensaje });
      if (r.ok) { setF(VACIO); setEditandoId(null); router.refresh(); }
    });
  }

  function editar(e: EmpleadoParticipacion) {
    setEditandoId(e.id);
    setF({
      identificacion: e.identificacion,
      nombres: e.nombres,
      cargo: e.cargo ?? '',
      area: e.area ?? '',
      ciudad: e.ciudad ?? '',
    });
  }

  function retirar(id: string) {
    startTransition(async () => {
      const r = await retirarEmpleado(id);
      setAviso({ tipo: r.ok ? 'ok' : 'error', texto: r.mensaje });
      if (r.ok) router.refresh();
    });
  }

  /** Genera y descarga la plantilla vacía con un ejemplo. */
  function descargarPlantilla() {
    const hoja = XLSX.utils.json_to_sheet([
      {
        identificacion: '1020304050',
        nombres: 'JUAN PÉREZ GÓMEZ',
        cargo: 'OPERARIO',
        area: 'PRODUCCIÓN',
        ciudad: 'BOGOTÁ',
      },
    ]);
    hoja['!cols'] = [{ wch: 16 }, { wch: 30 }, { wch: 20 }, { wch: 20 }, { wch: 16 }];

    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, 'Empleados');
    XLSX.writeFile(libro, 'Plantilla_Empleados.xlsx');

    setAviso({ tipo: 'ok', texto: 'Plantilla descargada. Reemplaza la fila de ejemplo con tus datos.' });
  }

  async function leerArchivo(archivo: File) {
    setErrores([]);
    setLeyendo(true);

    try {
      const buffer = await archivo.arrayBuffer();
      const libro = XLSX.read(buffer, { type: 'array' });
      const hoja = libro.Sheets[libro.SheetNames[0]];

      // header:1 devuelve arreglos, para poder mapear los encabezados
      const matriz = XLSX.utils.sheet_to_json<unknown[]>(hoja, { header: 1, blankrows: false });

      if (matriz.length < 2) {
        setLeyendo(false);
        setAviso({ tipo: 'error', texto: 'El archivo no tiene filas de datos.' });
        return;
      }

      const mapa = mapearColumnas((matriz[0] as string[]).map(String));

      if (mapa.identificacion === undefined || mapa.nombres === undefined) {
        setLeyendo(false);
        setAviso({
          tipo: 'error',
          texto: 'El archivo debe tener al menos las columnas "identificacion" y "nombres".',
        });
        return;
      }

      const filas = matriz.slice(1).map((fila) => ({
        identificacion: String(fila[mapa.identificacion] ?? ''),
        nombres: String(fila[mapa.nombres] ?? ''),
        cargo: mapa.cargo !== undefined ? String(fila[mapa.cargo] ?? '') : '',
        area: mapa.area !== undefined ? String(fila[mapa.area] ?? '') : '',
        ciudad: mapa.ciudad !== undefined ? String(fila[mapa.ciudad] ?? '') : '',
      }));

      startTransition(async () => {
        const r = await cargarEmpleados(filas);
        setLeyendo(false);
        setAviso({ tipo: r.ok ? 'ok' : 'error', texto: r.mensaje });
        setErrores(r.errores);
        if (archivoRef.current) archivoRef.current.value = '';
        if (r.ok) router.refresh();
      });
    } catch {
      setLeyendo(false);
      setAviso({ tipo: 'error', texto: 'No se pudo leer el archivo. Verifica que sea .xlsx o .csv.' });
    }
  }

  const ocupado = pendiente || leyendo;

  return (
    <section style={e.card}>
      <p style={e.intro}>
        Al crear una capacitación puedes exigir que solo se registren personas
        de esta lista. Si no la marcas, se aceptan registros libres.
      </p>

      {/* ---------- Carga masiva ---------- */}
      {esAdmin && (
        <div style={e.bloqueCarga}>
          <div style={e.filaCarga}>
            <button onClick={descargarPlantilla} style={e.btnSec}>
              Descargar plantilla Excel
            </button>
            <label style={{ ...e.btn, background: color, cursor: ocupado ? 'not-allowed' : 'pointer' }}>
              {leyendo ? 'Leyendo…' : 'Cargar archivo'}
              <input
                ref={archivoRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                disabled={ocupado}
                onChange={(ev) => {
                  const a = ev.target.files?.[0];
                  if (a) leerArchivo(a);
                }}
                style={{ display: 'none' }}
              />
            </label>
          </div>
          <p style={e.ayuda}>
            Columnas: <strong>identificacion</strong> y <strong>nombres</strong> son
            obligatorias; cargo, area y ciudad son opcionales. El orden no importa.
            Volver a cargar el mismo archivo actualiza los datos en vez de duplicarlos.
          </p>
        </div>
      )}

      {aviso && (
        <div style={{
          ...e.aviso,
          background: aviso.tipo === 'ok' ? '#F0FDF4' : '#FDF2F2',
          color: aviso.tipo === 'ok' ? '#15803D' : '#9B1C1C',
        }}>
          {aviso.texto}
        </div>
      )}

      {errores.length > 0 && (
        <div style={e.errores}>
          <strong style={{ fontSize: 12 }}>Filas omitidas:</strong>
          <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
            {errores.map((x, i) => <li key={i} style={{ fontSize: 11.5 }}>{x}</li>)}
          </ul>
        </div>
      )}

      {/* ---------- Alta manual ---------- */}
      {esAdmin && (
        <div style={e.formulario}>
          <div style={e.grid}>
            <input
              value={f.identificacion}
              disabled={Boolean(editandoId)}
              onChange={(ev) => setF({ ...f, identificacion: ev.target.value.replace(/[^0-9]/g, '') })}
              placeholder="Identificación *"
              inputMode="numeric"
              style={{ ...e.input, background: editandoId ? '#F4F4F0' : '#fff' }}
            />
            <input
              value={f.nombres}
              onChange={(ev) => setF({ ...f, nombres: ev.target.value })}
              placeholder="Nombre completo *"
              style={{ ...e.input, textTransform: 'uppercase' }}
            />
            <input
              value={f.cargo}
              onChange={(ev) => setF({ ...f, cargo: ev.target.value })}
              placeholder="Cargo"
              style={{ ...e.input, textTransform: 'uppercase' }}
            />
            <input
              value={f.area}
              onChange={(ev) => setF({ ...f, area: ev.target.value })}
              placeholder="Área"
              style={{ ...e.input, textTransform: 'uppercase' }}
            />
            <input
              value={f.ciudad}
              onChange={(ev) => setF({ ...f, ciudad: ev.target.value })}
              placeholder="Ciudad"
              style={{ ...e.input, textTransform: 'uppercase' }}
            />
            <button onClick={guardar} disabled={ocupado}
              style={{ ...e.btn, background: ocupado ? '#C5C5BD' : color, border: 'none' }}>
              {editandoId ? 'Guardar' : 'Agregar'}
            </button>
          </div>
          {editandoId && (
            <button onClick={() => { setEditandoId(null); setF(VACIO); }} style={e.enlace}>
              Cancelar edición
            </button>
          )}
        </div>
      )}

      {/* ---------- Listado ---------- */}
      <div style={e.cabeceraLista}>
        <span style={e.conteo}>
          {filtrados.length} de {empleados.length} empleados
        </span>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {areas.length > 0 && (
            <select
              value={filtroArea}
              onChange={(ev) => { setFiltroArea(ev.target.value); setPagina(0); }}
              style={{ ...e.input, maxWidth: 190 }}
            >
              <option value="">Todas las áreas</option>
              {areas.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          )}
          <input
            value={busqueda}
            onChange={(ev) => { setBusqueda(ev.target.value); setPagina(0); }}
            placeholder="Buscar…"
            style={{ ...e.input, maxWidth: 200 }}
          />
        </div>
      </div>

      {empleados.length === 0 ? (
        <p style={e.vacio}>
          Sin empleados cargados. Descarga la plantilla y súbela, o agrégalos uno a uno.
        </p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
            <thead>
              <tr>
                {['Identificación', 'Nombre', 'Cargo', 'Área', 'Asist.', 'Prom.', ''].map((h) => (
                  <th key={h} style={e.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibles.map((em) => (
                <tr key={em.id}>
                  <td style={{ ...e.td, fontFamily: 'ui-monospace,monospace' }}>{em.identificacion}</td>
                  <td style={e.td}>{em.nombres}</td>
                  <td style={e.td}>{em.cargo ?? '—'}</td>
                  <td style={e.td}>{em.area ?? '—'}</td>
                  <td style={{ ...e.td, textAlign: 'center' }}>{em.asistencias}</td>
                  <td style={{
                    ...e.td, textAlign: 'center', fontWeight: 600,
                    color: em.promedio === null ? '#A3AAB3'
                         : em.promedio >= 70 ? '#15803D' : '#9B1C1C',
                  }}>
                    {em.promedio !== null ? `${em.promedio}%` : '—'}
                  </td>
                  <td style={{ ...e.td, whiteSpace: 'nowrap' }}>
                    <Link href={`/panel/empleados/${em.id}`} style={e.btnVer}>Ver</Link>
                    {esAdmin && (
                      <>
                        <button onClick={() => editar(em)} style={e.btnMini}>Editar</button>
                        <button onClick={() => retirar(em.id)} style={{ ...e.btnMini, color: '#9B1C1C' }}>
                          Retirar
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {paginas > 1 && (
            <div style={e.paginacion}>
              <button
                onClick={() => setPagina((p) => Math.max(0, p - 1))}
                disabled={paginaSegura === 0}
                style={{ ...e.btnPag, opacity: paginaSegura === 0 ? .4 : 1 }}
              >
                ‹ Anterior
              </button>
              <span style={e.conteo}>
                Página {paginaSegura + 1} de {paginas}
              </span>
              <button
                onClick={() => setPagina((p) => Math.min(paginas - 1, p + 1))}
                disabled={paginaSegura >= paginas - 1}
                style={{ ...e.btnPag, opacity: paginaSegura >= paginas - 1 ? .4 : 1 }}
              >
                Siguiente ›
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

const e: Record<string, React.CSSProperties> = {
  card: {
    background: '#fff', border: '1px solid #E4E4DF', borderRadius: 8,
    padding: 22, marginBottom: 16,
  },
  h2: { fontSize: 14.5, margin: '0 0 5px', fontWeight: 600 },
  intro: { fontSize: 12, color: '#5B6470', margin: '0 0 16px', lineHeight: 1.5 },

  bloqueCarga: { background: '#FBFBF9', border: '1px solid #EFEFEA', borderRadius: 6, padding: 14, marginBottom: 16 },
  filaCarga: { display: 'flex', gap: 10, flexWrap: 'wrap' },
  ayuda: { fontSize: 11.5, color: '#8A929C', margin: '10px 0 0', lineHeight: 1.5 },

  formulario: { marginBottom: 16 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 8 },
  input: {
    padding: '9px 11px', border: '1px solid #DFDFD8', borderRadius: 4,
    fontSize: 13, boxSizing: 'border-box', fontFamily: 'inherit', width: '100%',
  },
  btn: {
    color: '#fff', padding: '9px 18px', borderRadius: 4, fontSize: 13,
    fontWeight: 600, display: 'inline-block', textAlign: 'center',
  },
  btnSec: {
    background: '#fff', color: '#14263F', border: '1px solid #DFDFD8',
    padding: '9px 18px', borderRadius: 4, fontSize: 13, fontWeight: 600, cursor: 'pointer',
  },
  btnVer: {
    background: '#14263F', color: '#fff', padding: '4px 12px', borderRadius: 3,
    fontSize: 11.5, fontWeight: 600, textDecoration: 'none', marginRight: 8,
  },
  btnMini: {
    background: 'none', border: 'none', color: '#5B6470',
    fontSize: 11.5, cursor: 'pointer', textDecoration: 'underline', marginRight: 8,
  },
  enlace: { background: 'none', border: 'none', color: '#5B6470', fontSize: 12, cursor: 'pointer', padding: '8px 0 0' },

  cabeceraLista: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    gap: 12, marginBottom: 10, flexWrap: 'wrap',
  },
  conteo: { fontSize: 12, color: '#8A929C' },

  th: {
    background: '#F7F7F4', color: '#8A929C', fontSize: 10.5, textTransform: 'uppercase',
    padding: '8px', textAlign: 'left', borderBottom: '1px solid #E4E4DF',
  },
  paginacion: {
    display: 'flex', justifyContent: 'center', alignItems: 'center',
    gap: 14, marginTop: 12, paddingTop: 12, borderTop: '1px solid #F4F4F0',
  },
  btnPag: {
    background: '#fff', borderWidth: 1, borderStyle: 'solid', borderColor: '#DFDFD8',
    color: '#14263F', padding: '6px 14px', borderRadius: 4,
    fontSize: 12, fontWeight: 600, cursor: 'pointer',
  },
  td: { padding: '8px', borderBottom: '1px solid #F4F4F0' },
  vacio: { fontSize: 12.5, color: '#8A929C', textAlign: 'center', padding: '24px 0', margin: 0 },

  aviso: { padding: '10px 14px', borderRadius: 6, fontSize: 13, marginBottom: 14 },
  errores: {
    background: '#FEFCE8', color: '#8A6100', padding: '12px 14px',
    borderRadius: 6, marginBottom: 14, maxHeight: 160, overflowY: 'auto',
  },
};
