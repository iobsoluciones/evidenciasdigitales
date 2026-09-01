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
  const [pidiendoMotivo, setPidiendoMotivo] = useState<{ id: string; mensaje: string } | null>(null);
  const [motivo, setMotivo] = useState('');
  const [errores, setErrores] = useState<string[]>([]);
  const [leyendo, setLeyendo] = useState(false);

  // Áreas presentes, para el desplegable
  const areas = Array.from(
    new Set(empleados.map((e) => e.area).filter(Boolean) as string[])
  ).sort();

  const filtrados = empleados.filter((e) => {
    if (filtroArea && e.area !== filtroArea) return false;
    if (!busqueda) return true;
    // Todos los datos del empleado, no solo el nombre: se busca tanto
    // por cedula como por cargo, area o ciudad.
    return `${e.identificacion} ${e.nombres} ${e.cargo ?? ''} ${e.area ?? ''} ${e.ciudad ?? ''}`
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

  /**
   * Retiro. Si falta el examen médico de egreso el servidor lo bloquea
   * y aquí se pide el motivo: la Resolución 2346 lo exige, pero en la
   * práctica el trabajador a veces no asiste, y dejar constancia de eso
   * también es evidencia.
   */
  function retirar(id: string) {
    startTransition(async () => {
      const r = await retirarEmpleado(id);
      if (r.ok) {
        setAviso({ tipo: 'ok', texto: r.mensaje });
        router.refresh();
        return;
      }
      if (r.sinExamen) {
        setPidiendoMotivo({ id, mensaje: r.mensaje });
        setAviso(null);
        return;
      }
      setAviso({ tipo: 'error', texto: r.mensaje });
    });
  }

  function retirarSinExamen() {
    if (!pidiendoMotivo) return;
    if (!motivo.trim()) {
      setAviso({ tipo: 'error', texto: 'Escribe por qué no se realizó el examen.' });
      return;
    }
    startTransition(async () => {
      const r = await retirarEmpleado(pidiendoMotivo.id, motivo);
      setAviso({ tipo: r.ok ? 'ok' : 'error', texto: r.mensaje });
      if (r.ok) {
        setPidiendoMotivo(null);
        setMotivo('');
        router.refresh();
      }
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

      {pidiendoMotivo && (
        <div style={e.egreso}>
          <div style={e.egresoTitulo}>Falta el examen médico de egreso</div>
          <p style={e.egresoTexto}>
            La Resolución 2346 de 2007 lo exige, y es la principal defensa del
            empleador si más adelante aparece una reclamación por enfermedad
            laboral. Regístralo en <strong>Exámenes médicos</strong> antes de
            retirar, o deja aquí constancia de por qué no se realizó.
          </p>
          <textarea
            value={motivo}
            onChange={(ev) => setMotivo(ev.target.value)}
            rows={2}
            style={e.egresoCampo}
            placeholder="El trabajador no asistió a la cita programada el…"
          />
          <div style={e.egresoBotones}>
            <button
              onClick={() => { setPidiendoMotivo(null); setMotivo(''); }}
              style={e.egresoCancelar}
              type="button"
            >
              Cancelar
            </button>
            <button
              onClick={retirarSinExamen}
              disabled={pendiente}
              style={e.egresoConfirmar}
              type="button"
            >
              Retirar dejando constancia
            </button>
          </div>
        </div>
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
              style={{ ...e.input, background: editandoId ? 'var(--superficie-3)' : '#fff' }}
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
              style={{ ...e.btn, background: ocupado ? 'var(--borde-fuerte)' : color, border: 'none' }}>
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
        {/* Selector de area y buscador en la misma linea: se usan juntos
            para acotar la nomina, y separarlos obligaba a saltar la vista. */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {areas.length > 0 && (
            <select
              value={filtroArea}
              onChange={(ev) => { setFiltroArea(ev.target.value); setPagina(0); }}
              style={{ ...e.input, width: 'auto', minWidth: 160, maxWidth: 190 }}
            >
              <option value="">Todas las áreas</option>
              {areas.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          )}
          <input
            value={busqueda}
            onChange={(ev) => { setBusqueda(ev.target.value); setPagina(0); }}
            placeholder="Buscar por cédula, nombre, cargo o área…"
            title="Busca en cualquier dato del empleado: identificación, nombre, cargo o área."
            style={{ ...e.input, width: 'auto', minWidth: 240, maxWidth: 280 }}
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
                    color: em.promedio === null ? 'var(--texto-tenue)'
                         : em.promedio >= 70 ? 'var(--bien)' : 'var(--mal)',
                  }}>
                    {em.promedio !== null ? `${em.promedio}%` : '—'}
                  </td>
                  <td style={{ ...e.td, whiteSpace: 'nowrap' }}>
                    <Link href={`/panel/empleados/${em.id}`} style={e.btnVer}>Ver</Link>
                    {esAdmin && (
                      <>
                        <button onClick={() => editar(em)} style={e.btnMini}>Editar</button>
                        <button onClick={() => retirar(em.id)} style={{ ...e.btnMini, color: 'var(--mal)' }}>
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
  egreso: {
    background: 'var(--aviso-fondo)', border: '1px solid #FED7AA', borderRadius: 8,
    padding: '14px 16px', margin: '14px 0',
  },
  egresoTitulo: { fontSize: 14, fontWeight: 700, color: '#7C2D12', marginBottom: 6 },
  egresoTexto: { fontSize: 12.5, color: '#7C2D12', lineHeight: 1.6, margin: '0 0 10px' },
  egresoCampo: {
    width: '100%', padding: '9px 11px', border: '1px solid #FED7AA',
    borderRadius: 8, fontSize: 13, boxSizing: 'border-box',
    fontFamily: 'inherit', resize: 'vertical',
  },
  egresoBotones: { display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 10 },
  egresoCancelar: {
    background: 'none', border: 'none', color: '#7C2D12',
    fontSize: 12.5, fontWeight: 600, cursor: 'pointer', padding: '8px 12px',
  },
  egresoConfirmar: {
    background: 'var(--aviso)', color: 'var(--sobre-marca)', border: 'none',
    padding: '8px 18px', borderRadius: 8, fontSize: 12.5,
    fontWeight: 600, cursor: 'pointer',
  },
  card: {
    background: 'var(--superficie)', border: '1px solid var(--borde)', borderRadius: 8,
    padding: 22, marginBottom: 16,
  },
  h2: { fontSize: 14.5, margin: '0 0 5px', fontWeight: 600 },
  intro: { fontSize: 12, color: 'var(--texto-suave)', margin: '0 0 16px', lineHeight: 1.5 },

  bloqueCarga: { background: 'var(--superficie-2)', border: '1px solid var(--borde)', borderRadius: 6, padding: 14, marginBottom: 16 },
  filaCarga: { display: 'flex', gap: 10, flexWrap: 'wrap' },
  ayuda: { fontSize: 11.5, color: 'var(--texto-tenue)', margin: '10px 0 0', lineHeight: 1.5 },

  formulario: { marginBottom: 16 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 8 },
  input: {
    padding: '9px 11px', border: '1px solid var(--borde-fuerte)', borderRadius: 4,
    fontSize: 13, boxSizing: 'border-box', fontFamily: 'inherit', width: '100%',
  },
  btn: {
    color: 'var(--sobre-marca)', padding: '9px 18px', borderRadius: 4, fontSize: 13,
    fontWeight: 600, display: 'inline-block', textAlign: 'center',
  },
  btnSec: {
    background: 'var(--superficie)', color: 'var(--texto)', border: '1px solid var(--borde-fuerte)',
    padding: '9px 18px', borderRadius: 4, fontSize: 13, fontWeight: 600, cursor: 'pointer',
  },
  btnVer: {
    background: 'var(--marca)', color: 'var(--sobre-marca)', padding: '4px 12px', borderRadius: 3,
    fontSize: 11.5, fontWeight: 600, textDecoration: 'none', marginRight: 8,
  },
  btnMini: {
    background: 'none', border: 'none', color: 'var(--texto-suave)',
    fontSize: 11.5, cursor: 'pointer', textDecoration: 'underline', marginRight: 8,
  },
  enlace: { background: 'none', border: 'none', color: 'var(--texto-suave)', fontSize: 12, cursor: 'pointer', padding: '8px 0 0' },

  cabeceraLista: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    gap: 12, marginBottom: 10, flexWrap: 'wrap',
  },
  conteo: { fontSize: 12, color: 'var(--texto-tenue)' },

  th: {
    background: 'var(--fondo)', color: 'var(--texto-tenue)', fontSize: 10.5, textTransform: 'uppercase',
    padding: '8px', textAlign: 'left', borderBottom: '1px solid var(--borde)',
  },
  paginacion: {
    display: 'flex', justifyContent: 'center', alignItems: 'center',
    gap: 14, marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--superficie-3)',
  },
  btnPag: {
    background: 'var(--superficie)', borderWidth: 1, borderStyle: 'solid', borderColor: 'var(--borde-fuerte)',
    color: 'var(--texto)', padding: '6px 14px', borderRadius: 4,
    fontSize: 12, fontWeight: 600, cursor: 'pointer',
  },
  td: { padding: '8px', borderBottom: '1px solid var(--superficie-3)' },
  vacio: { fontSize: 12.5, color: 'var(--texto-tenue)', textAlign: 'center', padding: '24px 0', margin: 0 },

  aviso: { padding: '10px 14px', borderRadius: 6, fontSize: 13, marginBottom: 14 },
  errores: {
    background: 'var(--ambar-fondo)', color: 'var(--ambar)', padding: '12px 14px',
    borderRadius: 6, marginBottom: 14, maxHeight: 160, overflowY: 'auto',
  },
};
