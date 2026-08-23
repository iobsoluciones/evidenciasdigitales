'use client';

/**
 * CARGA MASIVA DE UNIDADES — fase 3
 * ---------------------------------------------------------------
 * Registrar 80 portátiles uno a uno es inviable. El archivo se lee en
 * el navegador y solo viajan las filas convertidas.
 *
 * Volver a cargar el mismo archivo actualiza en vez de duplicar: quien
 * mantiene un inventario sube la planilla completa cada vez, no solo
 * las novedades.
 */
import { useState, useTransition, useRef } from 'react';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';
import { cargarUnidades } from '@/lib/acciones-unidades';

/** Encabezados admitidos, tolerando variantes. */
const COLUMNAS: Record<string, string[]> = {
  placa: ['placa', 'placa interna', 'codigo interno', 'código interno', 'activo'],
  serial: ['serial', 'serie', 'nro serie', 'n serie', 'numero de serie'],
  fecha_compra: ['fecha compra', 'fecha de compra', 'compra', 'adquisicion', 'adquisición'],
  garantia_hasta: ['garantia', 'garantía', 'garantia hasta', 'garantía hasta', 'vence garantia'],
  observaciones: ['observaciones', 'observacion', 'notas', 'estado'],
};

function mapear(encabezados: string[]): Record<string, number> {
  const mapa: Record<string, number> = {};
  encabezados.forEach((h, i) => {
    const limpio = String(h ?? '').trim().toLowerCase();
    for (const [campo, alias] of Object.entries(COLUMNAS)) {
      if (alias.includes(limpio) && mapa[campo] === undefined) mapa[campo] = i;
    }
  });
  return mapa;
}

/** Excel guarda fechas como número de serie desde 1899-12-30. */
function aFecha(valor: unknown): string {
  if (!valor) return '';
  if (typeof valor === 'number') {
    const d = new Date(Math.round((valor - 25569) * 86400 * 1000));
    return d.toISOString().slice(0, 10);
  }
  const t = String(valor).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(t)) return t.slice(0, 10);
  // dd/mm/aaaa, formato habitual en Colombia
  const m = t.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  return '';
}

export default function CargaUnidades({
  articuloId,
  articuloNombre,
  color,
}: {
  articuloId: string;
  articuloNombre: string;
  color: string;
}) {
  const router = useRouter();
  const [pendiente, startTransition] = useTransition();
  const entrada = useRef<HTMLInputElement>(null);

  const [abierto, setAbierto] = useState(false);
  const [leyendo, setLeyendo] = useState(false);
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);
  const [errores, setErrores] = useState<string[]>([]);

  function descargarPlantilla() {
    const hoja = XLSX.utils.json_to_sheet([
      {
        placa: 'EQ-0042',
        serial: '8HJ2K91',
        fecha_compra: '2026-01-15',
        garantia_hasta: '2028-01-15',
        observaciones: 'CON CARGADOR Y ESTUCHE',
      },
    ]);
    hoja['!cols'] = [{ wch: 14 }, { wch: 20 }, { wch: 15 }, { wch: 16 }, { wch: 34 }];

    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, 'Unidades');
    XLSX.writeFile(libro, `Plantilla_Unidades_${articuloNombre.slice(0, 20)}.xlsx`);

    setAviso({ tipo: 'ok', texto: 'Plantilla descargada. Reemplaza la fila de ejemplo.' });
  }

  async function leer(archivo: File) {
    setErrores([]);
    setLeyendo(true);

    try {
      const buffer = await archivo.arrayBuffer();
      const libro = XLSX.read(buffer, { type: 'array' });
      const hoja = libro.Sheets[libro.SheetNames[0]];
      const matriz = XLSX.utils.sheet_to_json<unknown[]>(hoja, { header: 1, blankrows: false });

      if (matriz.length < 2) {
        setLeyendo(false);
        setAviso({ tipo: 'error', texto: 'El archivo no tiene filas de datos.' });
        return;
      }

      const mapa = mapear((matriz[0] as string[]).map(String));

      if (mapa.placa === undefined) {
        setLeyendo(false);
        setAviso({
          tipo: 'error',
          texto: 'El archivo debe tener al menos una columna «placa».',
        });
        return;
      }

      const filas = matriz.slice(1).map((fila) => ({
        placa: String(fila[mapa.placa] ?? ''),
        serial: mapa.serial !== undefined ? String(fila[mapa.serial] ?? '') : '',
        fecha_compra: mapa.fecha_compra !== undefined ? aFecha(fila[mapa.fecha_compra]) : '',
        garantia_hasta: mapa.garantia_hasta !== undefined ? aFecha(fila[mapa.garantia_hasta]) : '',
        observaciones: mapa.observaciones !== undefined ? String(fila[mapa.observaciones] ?? '') : '',
      }));

      startTransition(async () => {
        const r = await cargarUnidades(articuloId, filas);
        setLeyendo(false);
        setAviso({ tipo: r.ok ? 'ok' : 'error', texto: r.mensaje });
        setErrores(r.errores);
        if (entrada.current) entrada.current.value = '';
        if (r.ok) router.refresh();
      });
    } catch {
      setLeyendo(false);
      setAviso({ tipo: 'error', texto: 'No se pudo leer el archivo. Debe ser .xlsx o .csv.' });
    }
  }

  const ocupado = pendiente || leyendo;

  return (
    <div style={e.bloque}>
      {!abierto ? (
        <button onClick={() => setAbierto(true)} style={e.enlace}>
          + Cargar varias unidades desde Excel
        </button>
      ) : (
        <>
          <div style={e.cabecera}>
            <strong style={{ fontSize: 12.5 }}>Carga masiva</strong>
            <button onClick={() => setAbierto(false)} style={e.cerrar}>Cerrar</button>
          </div>

          <div style={e.acciones}>
            <button onClick={descargarPlantilla} style={e.btnSec}>
              Descargar plantilla
            </button>
            <label style={{ ...e.btn, background: color, cursor: ocupado ? 'not-allowed' : 'pointer' }}>
              {leyendo ? 'Leyendo…' : pendiente ? 'Guardando…' : 'Cargar archivo'}
              <input
                ref={entrada}
                type="file"
                accept=".xlsx,.xls,.csv"
                disabled={ocupado}
                onChange={(x) => {
                  const a = x.target.files?.[0];
                  if (a) leer(a);
                }}
                style={{ display: 'none' }}
              />
            </label>
          </div>

          <p style={e.ayuda}>
            Solo <strong>placa</strong> es obligatoria. Serial, fechas y
            observaciones son opcionales, y el orden de las columnas no importa.
            Volver a cargar el archivo actualiza las unidades existentes en vez
            de duplicarlas.
          </p>

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
              <strong style={{ fontSize: 11.5 }}>Filas omitidas:</strong>
              <ul style={{ margin: '5px 0 0', paddingLeft: 18 }}>
                {errores.map((x, i) => <li key={i} style={{ fontSize: 11 }}>{x}</li>)}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}

const e: Record<string, React.CSSProperties> = {
  bloque: {
    marginTop: 14, paddingTop: 14,
    borderTopWidth: 1, borderTopStyle: 'solid', borderTopColor: '#EFEFEA',
  },
  cabecera: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  enlace: {
    background: 'none', border: 'none', color: '#5B6470',
    fontSize: 12, cursor: 'pointer', textDecoration: 'underline', padding: 0,
  },
  cerrar: {
    background: 'none', border: 'none', color: '#8A929C',
    fontSize: 11.5, cursor: 'pointer', padding: 0,
  },
  acciones: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  btn: {
    color: '#fff', padding: '8px 16px', borderRadius: 4,
    fontSize: 12.5, fontWeight: 600, display: 'inline-block',
  },
  btnSec: {
    background: '#fff', color: '#14263F',
    borderWidth: 1, borderStyle: 'solid', borderColor: '#DFDFD8',
    padding: '8px 16px', borderRadius: 4, fontSize: 12.5,
    fontWeight: 600, cursor: 'pointer',
  },
  ayuda: { fontSize: 11, color: '#8A929C', margin: '10px 0 0', lineHeight: 1.6 },
  aviso: { marginTop: 10, padding: '9px 12px', borderRadius: 5, fontSize: 12 },
  errores: {
    marginTop: 10, padding: '10px 12px', borderRadius: 5,
    background: '#FEFCE8', color: '#8A6100', maxHeight: 150, overflowY: 'auto',
  },
};
