'use client';

/**
 * REJILLA DE HORAS-HOMBRE
 * ---------------------------------------------------------------
 * Doce filas fijas, una por mes. Los meses sin guardar se muestran
 * VACÍOS, no en cero: un cero es un dato («ese mes no se trabajó») y
 * un vacío es la ausencia de dato. Confundirlos falsea el promedio de
 * trabajadores y con él la frecuencia de accidentalidad.
 *
 * Se guarda el año completo de una vez porque así se diligencia en la
 * práctica: el consultor recibe la nómina del año y la transcribe.
 *
 * Un mes ya guardado queda BLOQUEADO. Estas horas son el denominador de
 * los indicadores del art. 30: si se tocan sin querer, la frecuencia y
 * la severidad de todo el año cambian sin que nadie lo note. Para
 * corregir hay que pedirlo mes por mes, que es justo la fricción que
 * separa una corrección de un tropiezo con el teclado.
 */
import { useState, useTransition } from 'react';
import { guardarAnioHoras, type MesHoras } from '@/lib/acciones-horas';

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

type Fila = { mes: number; horas: string; trabajadores: string; dias: string };

function aFilas(datos: MesHoras[]): Fila[] {
  return Array.from({ length: 12 }, (_, i) => {
    const d = datos.find((x) => x.mes === i + 1);
    const puesto = d?.registrado ?? false;
    return {
      mes: i + 1,
      horas: puesto ? String(d!.horas) : '',
      trabajadores: puesto ? String(d!.trabajadores) : '',
      dias: puesto ? String(d!.dias_programados) : '',
    };
  });
}

const num = (v: string) => {
  const n = Number(v.replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};

export default function RejillaHoras({
  anio,
  datos,
  color,
}: {
  anio: number;
  datos: MesHoras[];
  color: string;
}) {
  const [pendiente, startTransition] = useTransition();
  const [filas, setFilas] = useState<Fila[]>(() => aFilas(datos));
  const [bloqueadas, setBloqueadas] = useState<number[]>(
    () => datos.filter((d) => d.registrado).map((d) => d.mes)
  );
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);
  const [hecho, setHecho] = useState(false);

  function cambiar(mes: number, campo: keyof Omit<Fila, 'mes'>, valor: string) {
    if (bloqueadas.includes(mes)) return;
    setHecho(false);
    // Solo dígitos, coma y punto: evita que un texto se convierta en 0
    // silenciosamente al guardar.
    if (valor !== '' && !/^[0-9]*[.,]?[0-9]*$/.test(valor)) return;
    setFilas((p) => p.map((f) => (f.mes === mes ? { ...f, [campo]: valor } : f)));
    setAviso(null);
  }

  const conDato = filas.filter((f) => f.horas !== '' || f.trabajadores !== '');
  const totalHoras = conDato.reduce((s, f) => s + num(f.horas), 0);
  const totalDias = conDato.reduce((s, f) => s + num(f.dias), 0);
  const mesesConTrabajadores = filas.filter((f) => num(f.trabajadores) > 0);
  const promedio = mesesConTrabajadores.length
    ? mesesConTrabajadores.reduce((s, f) => s + num(f.trabajadores), 0) / mesesConTrabajadores.length
    : 0;

  function guardar() {
    setAviso(null);
    startTransition(async () => {
      const r = await guardarAnioHoras(
        anio,
        filas
          .filter((f) => f.horas !== '' || f.trabajadores !== '' || f.dias !== '')
          .map((f) => ({
            mes: f.mes,
            horas: num(f.horas),
            trabajadores: num(f.trabajadores),
            dias_programados: num(f.dias),
          }))
      );
      setAviso({ tipo: r.ok ? 'ok' : 'error', texto: r.mensaje });
      if (r.ok) {
        setHecho(true);
        // Lo que acaba de guardarse vuelve a quedar bajo llave.
        setBloqueadas(
          filas.filter((f) => f.horas !== '' || f.trabajadores !== '' || f.dias !== '')
            .map((f) => f.mes)
        );
        setTimeout(() => setHecho(false), 2600);
      }
    });
  }

  return (
    <>
      <div style={e.resumen}>
        <Dato etiqueta="Horas del año" valor={totalHoras.toLocaleString('es-CO')} color={color} />
        <Dato etiqueta="Promedio de trabajadores" valor={promedio ? promedio.toFixed(1) : '—'} color={color} />
        <Dato etiqueta="Días programados" valor={totalDias.toLocaleString('es-CO')} color={color} />
        <Dato etiqueta="Meses con dato" valor={`${conDato.length} de 12`} color={color} />
      </div>

      <div style={e.contenedor}>
        <table style={e.tabla}>
          <thead>
            <tr>
              <th style={{ ...e.th, textAlign: 'left' }}>Mes</th>
              <th style={e.th}>Horas trabajadas</th>
              <th style={e.th}>Trabajadores</th>
              <th style={e.th}>Días programados</th>
              <th style={{ ...e.th, textAlign: 'center' }}>Estado</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => {
              const bloqueada = bloqueadas.includes(f.mes);
              const est = bloqueada ? { ...e.input, ...e.inputBloqueado } : e.input;
              return (
              <tr key={f.mes}>
                <td style={e.tdMes}>{MESES[f.mes - 1]}</td>
                <td style={e.td}>
                  <input
                    value={f.horas}
                    onChange={(ev) => cambiar(f.mes, 'horas', ev.target.value)}
                    readOnly={bloqueada}
                    style={est}
                    inputMode="decimal"
                    placeholder="—"
                    aria-label={`Horas trabajadas de ${MESES[f.mes - 1]}`}
                  />
                </td>
                <td style={e.td}>
                  <input
                    value={f.trabajadores}
                    onChange={(ev) => cambiar(f.mes, 'trabajadores', ev.target.value)}
                    readOnly={bloqueada}
                    style={est}
                    inputMode="numeric"
                    placeholder="—"
                    aria-label={`Trabajadores de ${MESES[f.mes - 1]}`}
                  />
                </td>
                <td style={e.td}>
                  <input
                    value={f.dias}
                    onChange={(ev) => cambiar(f.mes, 'dias', ev.target.value)}
                    readOnly={bloqueada}
                    style={est}
                    inputMode="numeric"
                    placeholder="—"
                    aria-label={`Días programados de ${MESES[f.mes - 1]}`}
                  />
                </td>
                <td style={{ ...e.td, textAlign: 'center' }}>
                  {bloqueada ? (
                    <button
                      type="button"
                      onClick={() => setBloqueadas((p) => p.filter((m) => m !== f.mes))}
                      style={e.desbloquear}
                      title={`Corregir ${MESES[f.mes - 1]}`}
                    >
                      Corregir
                    </button>
                  ) : (
                    <span style={e.abierto}>editable</span>
                  )}
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
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

      <div style={e.acciones}>
        <button
          onClick={guardar}
          disabled={pendiente}
          style={{ ...e.boton, background: hecho ? 'var(--bien)' : pendiente ? 'var(--borde-fuerte)' : color }}
        >
          {hecho ? '✓ Guardado' : pendiente ? 'Guardando…' : `Guardar ${anio}`}
        </button>
      </div>
    </>
  );
}

function Dato({ etiqueta, valor, color }: { etiqueta: string; valor: string; color: string }) {
  return (
    <div style={e.tarjeta}>
      <span style={e.tarjetaEtiqueta}>{etiqueta}</span>
      <span style={{ ...e.tarjetaValor, color }}>{valor}</span>
    </div>
  );
}

const e: Record<string, React.CSSProperties> = {
  resumen: {
    display: 'grid', gap: 10, marginBottom: 18,
    gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))',
  },
  tarjeta: {
    background: 'var(--superficie)', border: '1px solid var(--borde)', borderRadius: 8,
    padding: '11px 13px', display: 'flex', flexDirection: 'column', gap: 3,
  },
  tarjetaEtiqueta: { fontSize: 11, color: 'var(--texto-suave)' },
  tarjetaValor: { fontSize: 21, fontWeight: 700, lineHeight: 1.1, fontVariantNumeric: 'tabular-nums' },

  contenedor: {
    background: 'var(--superficie)', border: '1px solid var(--borde)', borderRadius: 8,
    overflowX: 'auto',
  },
  tabla: { width: '100%', borderCollapse: 'collapse', fontSize: 13.5, minWidth: 620 },
  th: {
    textAlign: 'right', padding: '10px 12px', background: 'var(--fondo)', color: 'var(--texto-suave)',
    fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: .4,
    borderBottom: '1px solid var(--borde)', whiteSpace: 'nowrap',
  },
  tdMes: {
    padding: '6px 12px', borderBottom: '1px solid var(--superficie-3)',
    fontWeight: 600, color: 'var(--texto)', whiteSpace: 'nowrap',
  },
  td: { padding: '6px 8px', borderBottom: '1px solid var(--superficie-3)' },
  inputBloqueado: { background: 'var(--fondo)', color: 'var(--texto-suave)', borderColor: '#EDEDE8' },
  desbloquear: {
    background: 'none', border: '1px solid var(--borde)', borderRadius: 6,
    padding: '4px 10px', fontSize: 11.5, color: 'var(--texto-suave)',
    cursor: 'pointer', whiteSpace: 'nowrap',
  },
  abierto: { fontSize: 11, color: 'var(--texto-tenue)' },
  input: {
    width: '100%', minWidth: 90, padding: '7px 9px', textAlign: 'right',
    border: '1px solid var(--borde)', borderRadius: 6, fontSize: 13.5,
    fontVariantNumeric: 'tabular-nums', boxSizing: 'border-box',
  },
  aviso: { marginTop: 14, padding: '10px 13px', borderRadius: 8, fontSize: 13 },
  acciones: { display: 'flex', justifyContent: 'flex-end', marginTop: 16 },
  boton: {
    color: 'var(--sobre-marca)', border: 'none', padding: '10px 24px', borderRadius: 8,
    fontSize: 14, fontWeight: 600, cursor: 'pointer',
  },
};
