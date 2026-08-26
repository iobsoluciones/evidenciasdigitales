/**
 * DETALLE DE CAPACITACIÓN (actualizado en Fase 4)
 * ---------------------------------------------------------------
 * Bloques: indicadores, compartir (QR y enlace de firma), reporte
 * (descarga del PDF y envío por correo) y listado de asistentes.
 */
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { crearClienteServidor } from '@/lib/supabase/servidor';
import { obtenerPerfil } from '@/lib/sesion';
import { fmtFecha, colorParticipacion } from '@/lib/tipos';
import type { Capacitacion, Participante } from '@/lib/tipos';
import CompartirCapacitacion from '../CompartirCapacitacion';
import AccionesReporte from '../AccionesReporte';
import { BarrasHorizontales, Panel, type Punto } from '@/lib/graficos';
import BloqueEvaluacion from '../BloqueEvaluacion';
import Convocatoria from './Convocatoria';
import BotonPlantilla from '../BotonPlantilla';
import { empleadosParaConvocar } from '@/lib/acciones-convocatoria';

export default async function DetalleCapacitacion({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await crearClienteServidor();
  const perfil = await obtenerPerfil();

  const { data: cap } = await supabase
    .from('v_capacitaciones_resumen')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (!cap || !perfil) notFound();
  const c = cap as Capacitacion;

  const { data: participantes } = await supabase
    .from('participantes')
    .select('id, nombres, cargo, area, ciudad, identificacion, firma_url, created_at')
    .eq('capacitacion_id', id)
    .order('created_at', { ascending: true });

  const lista = (participantes ?? []) as Participante[];
  const col = colorParticipacion(c.porcentaje_participacion);

  // Distribución de esta capacitación (agregada en la base de datos)
  const { data: repo } = await supabase.rpc('reporte_capacitacion', { p_id: id });
  const reporte = (repo ?? { porCiudad: [], porArea: [] }) as {
    porCiudad: Punto[]; porArea: Punto[];
  };
  const colorMarca = perfil.organizacion.color_primario;

  // A quién va dirigida esta capacitación
  const convocables = await empleadosParaConvocar(id);

  // Estadisticas de la evaluacion (si la capacitacion es evaluada)
  const { data: datosEval } = await supabase.rpc('estadisticas_evaluacion', { p_capacitacion_id: id });
  const estadisticas = (datosEval ?? null) as {
    evaluados: number; promedio: number | null;
    aprobados: number; reprobados: number;
    porSubtema: Array<{ etiqueta: string; respuestas: number; aciertos: number; aciertos_pct: number }>;
    porPregunta: Array<{ etiqueta: string; subtema: string | null; respuestas: number; aciertos_pct: number }>;
  } | null;

  return (
    <>
      <Link href="/panel/capacitaciones" style={{ fontSize: 13, color: '#3b82f6' }}>
        ← Volver al listado
      </Link>

      <h1 style={{ fontSize: 22, color: '#1e3a8a', margin: '12px 0 2px' }}>{c.tema}</h1>
      <p style={{ color: '#6b7280', fontSize: 13, marginTop: 0 }}>
        {c.codigo} · {c.instructor} · {c.estado}
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 14, margin: '20px 0' }}>
        <Kpi valor={String(c.registrados)} etiqueta="Registrados" />
        <Kpi valor={c.esperados ? String(c.esperados) : '—'} etiqueta="Esperados" />
        <Kpi valor={`${c.porcentaje_participacion}%`} etiqueta="Participación" color={col.texto} />
        <Kpi valor={c.instructor_firmo ? 'Sí' : 'No'} etiqueta="Instructor firmó" />
      </div>

      <CompartirCapacitacion
        capacitacionId={c.id}
        instructor={c.instructor}
        color={perfil.organizacion.color_primario}
      />

      <AccionesReporte
        capacitacionId={c.id}
        color={perfil.organizacion.color_primario}
      />

      <section style={est.tarjeta}>
        <h2 style={est.h2}>Datos</h2>
        <table style={{ fontSize: 13, borderCollapse: 'collapse' }}>
          <tbody>
            <Fila e="Horario" v={`${fmtFecha(c.fecha_inicio)} — ${fmtFecha(c.fecha_fin)}`} />
            <Fila e="Empresa capacitada" v={c.empresa + (c.es_empresa_propia ? ' (propia)' : '')} />
            <Fila e="Control documental" v={`${c.nomenclatura ?? '—'} · ${c.version_doc ?? '—'}`} />
            <Fila e="En horario ahora" v={c.en_horario ? 'Sí' : 'No'} />
            <Fila e="Descripción" v={c.descripcion || '—'} />
          </tbody>
        </table>
      </section>

      {lista.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 20 }}>
          <Panel titulo="Participantes por ciudad" descripcion="Solo esta capacitación.">
            <BarrasHorizontales datos={reporte.porCiudad} color={colorMarca} />
          </Panel>
          <Panel titulo="Participantes por área" descripcion="Solo esta capacitación.">
            <BarrasHorizontales datos={reporte.porArea} color="#0ea5e9" />
          </Panel>
        </div>
      )}

      {/* Convocar y evaluar dependen de lo que se marco al crear: sin
          esas marcas los botones quedan inertes en vez de ofrecer algo
          que no corresponde a esta capacitacion. */}
      <Convocatoria
        capacitacionId={c.id}
        empleados={convocables}
        color={colorMarca}
        habilitada={Boolean(c.validar_empleados)}
      />

      <BotonPlantilla
        capacitacionId={c.id}
        temaSugerido={c.tema}
        tieneEvaluacion={Boolean(c.tiene_evaluacion)}
        color={colorMarca}
      />

      <BloqueEvaluacion
        capacitacionId={c.id}
        esEvaluada={c.tiene_evaluacion ?? c.es_evaluada ?? false}
        estadisticas={estadisticas}
        color={colorMarca}
        habilitada={Boolean(c.es_evaluada) || Boolean(c.tiene_evaluacion)}
      />

      <section style={est.tarjeta}>
        <h2 style={est.h2}>Asistentes ({lista.length})</h2>
        {lista.length === 0 ? (
          <p style={{ color: '#6b7280', fontSize: 13, textAlign: 'center', padding: '24px 0' }}>
            Aún no hay asistentes registrados.
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  {['#', 'Nombre', 'Cargo', 'Área', 'Ciudad', 'Identificación', 'Firma', 'Registro'].map((h) => (
                    <th key={h} style={est.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lista.map((p, i) => (
                  <tr key={p.id}>
                    <td style={est.td}>{i + 1}</td>
                    <td style={est.td}>{p.nombres}</td>
                    <td style={est.td}>{p.cargo}</td>
                    <td style={est.td}>{p.area}</td>
                    <td style={est.td}>{p.ciudad}</td>
                    <td style={est.td}>{p.identificacion}</td>
                    <td style={est.td}>
                      {p.firma_url
                        ? <span style={{ color: '#15803d', fontWeight: 600 }}>Sí</span>
                        : <span style={{ color: '#9ca3af' }}>—</span>}
                    </td>
                    <td style={est.td}>{fmtFecha(p.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

function Kpi({ valor, etiqueta, color }: { valor: string; etiqueta: string; color?: string }) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 4px 12px rgba(0,0,0,.04)' }}>
      <div style={{ fontSize: 24, fontWeight: 700, color: color ?? 'var(--marca)' }}>{valor}</div>
      <div style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: .3 }}>{etiqueta}</div>
    </div>
  );
}

function Fila({ e, v }: { e: string; v: string }) {
  return (
    <tr>
      <td style={{ padding: '6px 16px 6px 0', color: '#6b7280', verticalAlign: 'top' }}>{e}</td>
      <td style={{ padding: '6px 0' }}>{v}</td>
    </tr>
  );
}

const est: Record<string, React.CSSProperties> = {
  tarjeta: { background: '#fff', borderRadius: 14, padding: 20, marginBottom: 20, boxShadow: '0 6px 18px rgba(0,0,0,.05)' },
  h2: { fontSize: 15, margin: '0 0 12px' },
  th: { background: '#f8fafc', color: '#6b7280', fontSize: 11, textTransform: 'uppercase', padding: '9px 8px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' },
  td: { padding: '9px 8px', borderBottom: '1px solid #e5e7eb' },
};
