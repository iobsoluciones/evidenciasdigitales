'use client';

/**
 * CONVOCATORIA
 * ---------------------------------------------------------------
 * Selección por área y por persona. El área se marca completa con un
 * clic, pero cada empleado puede desmarcarse: no todos son aptos para
 * toda capacitación —trabajo en alturas aplica a unos pocos aunque
 * pertenezcan al mismo área—.
 *
 * La casilla del área es de tres estados: vacía, parcial (algunos) y
 * llena. La parcial es la que informa de verdad, porque dice que hubo
 * una decisión sobre esa área en vez de un olvido.
 */
import { useState, useTransition, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { convocarEmpleados, type EmpleadoConvocable } from '@/lib/acciones-convocatoria';

export default function Convocatoria({
  capacitacionId,
  empleados,
  color,
  soloLectura = false,
}: {
  capacitacionId: string;
  empleados: EmpleadoConvocable[];
  color: string;
  soloLectura?: boolean;
}) {
  const router = useRouter();
  const [pendiente, startTransition] = useTransition();
  const [abierto, setAbierto] = useState(false);
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  const [elegidos, setElegidos] = useState<Set<string>>(
    () => new Set(empleados.filter((e) => e.convocado).map((e) => e.id))
  );

  /**
   * Areas contraidas por defecto. Con una nomina larga, desplegarlo
   * todo obliga a recorrer cientos de nombres para marcar cuatro: el
   * area es el criterio con el que se convoca de verdad.
   */
  const [expandidas, setExpandidas] = useState<Set<string>>(new Set());
  const [busqueda, setBusqueda] = useState('');

  const texto = busqueda.trim().toLowerCase();
  const buscando = texto.length > 0;

  // Total por area SIN filtrar: el contador debe seguir diciendo la
  // verdad sobre el area aunque la busqueda oculte a parte de ella.
  const totalPorArea = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const e of empleados) mapa.set(e.area, (mapa.get(e.area) ?? 0) + 1);
    return mapa;
  }, [empleados]);

  // Agrupa por área conservando el orden que trae la consulta
  const porArea = useMemo(() => {
    const mapa = new Map<string, EmpleadoConvocable[]>();
    for (const e of empleados) {
      if (buscando) {
        const blob = `${e.nombres} ${e.identificacion} ${e.cargo ?? ''} ${e.area}`.toLowerCase();
        if (!blob.includes(texto)) continue;
      }
      const lista = mapa.get(e.area) ?? [];
      lista.push(e);
      mapa.set(e.area, lista);
    }
    return Array.from(mapa.entries());
  }, [empleados, buscando, texto]);

  // Buscando se abre todo lo que coincide: esconder el resultado tras
  // un clic mas seria pedirle al usuario que busque dos veces.
  const estaExpandida = (area: string) => buscando || expandidas.has(area);

  function alternarExpandida(area: string) {
    setExpandidas((s) => {
      const n = new Set(s);
      if (n.has(area)) n.delete(area); else n.add(area);
      return n;
    });
  }

  const totalVisibles = porArea.reduce((n, [, lista]) => n + lista.length, 0);

  const convocadosActuales = empleados.filter((e) => e.convocado).length;
  const hayCambios =
    elegidos.size !== convocadosActuales ||
    empleados.some((e) => e.convocado !== elegidos.has(e.id));

  function alternar(id: string) {
    setElegidos((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }

  function alternarArea(area: string, lista: EmpleadoConvocable[]) {
    const todosMarcados = lista.every((e) => elegidos.has(e.id));
    setElegidos((s) => {
      const n = new Set(s);
      for (const e of lista) {
        if (todosMarcados) n.delete(e.id); else n.add(e.id);
      }
      return n;
    });
  }

  function guardar() {
    startTransition(async () => {
      const r = await convocarEmpleados(capacitacionId, Array.from(elegidos));
      setAviso({ tipo: r.ok ? 'ok' : 'error', texto: r.mensaje });
      if (r.ok) router.refresh();
    });
  }

  if (empleados.length === 0) {
    return (
      <section style={e.card}>
        <h2 style={e.h2}>Convocatoria</h2>
        <p style={e.vacio}>
          Esta empresa no tiene empleados cargados. Cárgalos en{' '}
          <strong>Capacitaciones → Empleados</strong> para poder convocar por área.
        </p>
      </section>
    );
  }

  return (
    <section style={e.card}>
      <div style={e.cabecera}>
        <div>
          <h2 style={e.h2}>Convocatoria</h2>
          <p style={e.sub}>
            {convocadosActuales > 0
              ? `${convocadosActuales} empleado(s) convocado(s) de ${empleados.length}.`
              : 'Sin convocatoria. Selecciona a quién va dirigida.'}
          </p>
        </div>
        {!soloLectura && (
          <button onClick={() => setAbierto(!abierto)} style={e.btnSec}>
            {abierto ? 'Cerrar' : convocadosActuales > 0 ? 'Modificar' : 'Convocar'}
          </button>
        )}
      </div>

      {aviso && (
        <div style={{
          ...e.aviso,
          background: aviso.tipo === 'ok' ? '#F0FDF4' : '#FDF2F2',
          color: aviso.tipo === 'ok' ? '#15803D' : '#9B1C1C',
        }}>
          {aviso.texto}
        </div>
      )}

      {abierto && (
        <>
          <div style={e.resumen}>
            <strong style={{ fontSize: 13 }}>{elegidos.size} seleccionado(s)</strong>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setElegidos(new Set(empleados.map((x) => x.id)))}
                style={e.enlace}
              >
                Todos
              </button>
              <button onClick={() => setElegidos(new Set())} style={e.enlace}>
                Ninguno
              </button>
            </div>
          </div>

          <div style={e.barraBusqueda}>
            <input
              value={busqueda}
              onChange={(ev) => setBusqueda(ev.target.value)}
              placeholder="Buscar por nombre, cédula, cargo o área…"
              style={e.buscador}
            />
            {buscando ? (
              <span style={e.resultado}>
                {totalVisibles} de {empleados.length}
                <button onClick={() => setBusqueda('')} style={e.enlace}>Limpiar</button>
              </span>
            ) : (
              <button
                onClick={() =>
                  setExpandidas(
                    expandidas.size === porArea.length
                      ? new Set()
                      : new Set(porArea.map(([a]) => a))
                  )
                }
                style={e.enlace}
              >
                {expandidas.size === porArea.length ? 'Contraer todo' : 'Desplegar todo'}
              </button>
            )}
          </div>

          <div style={e.areas}>
            {porArea.map(([area, lista]) => {
              const marcados = lista.filter((x) => elegidos.has(x.id)).length;
              const todos = marcados === lista.length;
              const algunos = marcados > 0 && !todos;

              const abierta = estaExpandida(area);
              const totalArea = totalPorArea.get(area) ?? lista.length;

              return (
                <div key={area} style={e.area}>
                  {/* El checkbox marca el area entera; el resto de la
                      fila despliega. Antes todo era un label, asi que
                      cualquier clic marcaba a todo el mundo. */}
                  <div style={e.encabezadoArea}>
                    <input
                      type="checkbox"
                      checked={todos}
                      ref={(el) => { if (el) el.indeterminate = algunos; }}
                      onChange={() => alternarArea(area, lista)}
                      title={`Marcar toda el área ${area}`}
                      style={{ marginRight: 9, width: 15, height: 15, flexShrink: 0 }}
                    />
                    <button
                      onClick={() => alternarExpandida(area)}
                      style={e.botonArea}
                      aria-expanded={abierta}
                    >
                      <span style={{ ...e.flecha, transform: abierta ? 'rotate(90deg)' : 'none' }}>
                        ›
                      </span>
                      <span style={{ fontWeight: 600, flex: 1, textAlign: 'left' }}>{area}</span>
                      <span style={{
                        ...e.contador,
                        background: todos ? '#DCFCE7' : algunos ? '#FEF9C3' : '#EFEFEA',
                        color: todos ? '#15803D' : algunos ? '#8A6100' : '#8A929C',
                      }}>
                        {marcados}/{buscando ? `${lista.length} de ${totalArea}` : lista.length}
                      </span>
                    </button>
                  </div>

                  {abierta && (
                  <div style={e.personas}>
                    {lista.map((em) => (
                      <label
                        key={em.id}
                        style={{
                          ...e.persona,
                          background: elegidos.has(em.id) ? '#F0F9FF' : '#fff',
                          borderColor: elegidos.has(em.id) ? color : '#EFEFEA',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={elegidos.has(em.id)}
                          onChange={() => alternar(em.id)}
                          style={{ marginRight: 8, width: 14, height: 14 }}
                        />
                        <span style={{ flex: 1 }}>
                          {em.nombres}
                          {em.cargo && <span style={e.cargo}> · {em.cargo}</span>}
                        </span>
                        <span style={e.cedula}>{em.identificacion}</span>
                      </label>
                    ))}
                  </div>
                  )}
                </div>
              );
            })}

            {porArea.length === 0 && (
              <p style={e.sinResultados}>
                Ningún empleado coincide con “{busqueda}”.
              </p>
            )}
          </div>

          <div style={e.acciones}>
            <button
              onClick={guardar}
              disabled={pendiente || !hayCambios || soloLectura}
              style={{
                ...e.btn,
                background: pendiente || !hayCambios || soloLectura ? '#C5C5BD' : color,
                cursor: pendiente || !hayCambios || soloLectura ? 'not-allowed' : 'pointer',
              }}
            >
              {pendiente ? 'Guardando…' : 'Guardar convocatoria'}
            </button>
            <span style={e.nota}>
              El número de convocados pasa a ser la meta de participación.
            </span>
          </div>
        </>
      )}
    </section>
  );
}

const e: Record<string, React.CSSProperties> = {
  card: {
    background: '#fff', border: '1px solid #E4E4DF', borderRadius: 8,
    padding: 20, marginBottom: 20,
  },
  cabecera: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    gap: 14, flexWrap: 'wrap',
  },
  h2: { fontSize: 14.5, margin: '0 0 3px', fontWeight: 600 },
  sub: { fontSize: 12, color: '#5B6470', margin: 0 },
  vacio: { fontSize: 12.5, color: '#5B6470', margin: '10px 0 0', lineHeight: 1.6 },

  resumen: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '10px 12px', background: '#FBFBF9', borderRadius: 6,
    margin: '16px 0 12px', flexWrap: 'wrap', gap: 10,
  },
  enlace: {
    background: 'none', border: 'none', color: '#5B6470',
    fontSize: 12, cursor: 'pointer', textDecoration: 'underline',
  },

  barraBusqueda: {
    display: 'flex', alignItems: 'center', gap: 10,
    margin: '0 0 12px', flexWrap: 'wrap',
  },
  buscador: {
    flex: '1 1 240px', minWidth: 200, padding: '8px 11px',
    borderWidth: 1, borderStyle: 'solid', borderColor: '#DFDFD8',
    borderRadius: 4, fontSize: 13, fontFamily: 'inherit', color: '#14263F',
  },
  resultado: {
    fontSize: 12, color: '#5B6470', display: 'flex',
    alignItems: 'center', gap: 8, whiteSpace: 'nowrap',
  },
  botonArea: {
    display: 'flex', alignItems: 'center', gap: 8, flex: 1,
    background: 'none', border: 'none', padding: 0,
    font: 'inherit', fontSize: 13, color: '#14263F', cursor: 'pointer',
  },
  flecha: {
    display: 'inline-block', fontSize: 15, color: '#8A929C',
    transition: 'transform .15s', width: 10, flexShrink: 0,
  },
  sinResultados: {
    fontSize: 12.5, color: '#5B6470', textAlign: 'center',
    padding: '22px 0', margin: 0,
  },
  areas: { display: 'grid', gap: 12, maxHeight: 420, overflowY: 'auto' },
  area: { border: '1px solid #EFEFEA', borderRadius: 6, overflow: 'hidden' },
  encabezadoArea: {
    display: 'flex', alignItems: 'center', padding: '10px 12px',
    background: '#F7F7F4', fontSize: 12.5, cursor: 'pointer',
  },
  contador: {
    fontSize: 10.5, fontWeight: 600, padding: '2px 8px', borderRadius: 999,
  },
  personas: { padding: 8, display: 'grid', gap: 4 },
  persona: {
    display: 'flex', alignItems: 'center', padding: '7px 10px',
    borderWidth: 1, borderStyle: 'solid', borderRadius: 4,
    fontSize: 12.5, cursor: 'pointer',
  },
  cargo: { color: '#8A929C', fontSize: 11.5 },
  cedula: {
    fontFamily: 'ui-monospace,SFMono-Regular,Menlo,monospace',
    fontSize: 11, color: '#A3AAB3',
  },

  acciones: { display: 'flex', gap: 14, alignItems: 'center', marginTop: 16, flexWrap: 'wrap' },
  btn: { color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 4, fontSize: 13, fontWeight: 600 },
  btnSec: {
    background: '#fff', color: '#14263F', border: '1px solid #DFDFD8',
    padding: '8px 16px', borderRadius: 4, fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
  },
  nota: { fontSize: 11.5, color: '#8A929C' },
  aviso: { padding: '10px 14px', borderRadius: 6, fontSize: 13, marginTop: 14 },
};
