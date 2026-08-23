/**
 * PANEL PRINCIPAL — Indicadores y reportes
 * ---------------------------------------------------------------
 * Los gráficos vienen de reporte_global(), una función SECURITY
 * INVOKER: la agregación ocurre en la base de datos y RLS garantiza
 * que cada organización solo sume sus propios datos.
 *
 * Sigue sin filtrar por org_id en ninguna consulta: si RLS fallara,
 * los datos ajenos aparecerían en pantalla y se notaría de inmediato.
 */
import Link from 'next/link';
import { obtenerPerfil } from '@/lib/sesion';
import { empresaActiva } from '@/lib/empresa-activa';
import { crearClienteServidor } from '@/lib/supabase/servidor';
import { BarrasHorizontales, Columnas, Panel, type Punto } from '@/lib/graficos';
import AccionesEjecutivo from './AccionesEjecutivo';

type ReporteGlobal = {
  porCiudad: Punto[];
  porArea: Punto[];
  participantesPorMes: Array<{ mes: string; valor: number }>;
  capacitacionesPorMes: Array<{ mes: string; valor: number }>;
  participacionGeneral: {
    porcentaje: number;
    registrados: number;
    esperados: number;
    conMeta: number;
    sinMeta: number;
  } | null;
  totales: {
    capacitaciones: number;
    participantes: number;
    ciudades: number;
    areas: number;
  };
};

export default async function PaginaIndicadores() {
  const perfil = await obtenerPerfil();
  const empresa = await empresaActiva();

  if (!empresa) {
    return (
      <div style={{ background:'#fff', border:'1px dashed #DFDFD8', borderRadius:8,
                    padding:'40px 24px', textAlign:'center' }}>
        <p style={{ margin:'0 0 14px', fontSize:14 }}>
          Agrega una empresa para ver sus indicadores.
        </p>
        <Link href="/panel/empresas/nueva" style={{ background:'#14263F', color:'#fff',
              padding:'10px 18px', borderRadius:4, fontSize:13, fontWeight:600,
              textDecoration:'none' }}>Agregar empresa</Link>
      </div>
    );
  }

  const supabase = await crearClienteServidor();

  // p_empresa acota el reporte a la empresa activa
  const { data } = await supabase.rpc('reporte_global', {
    p_meses: 12,
    p_empresa: empresa.id,
  });
  const r = (data ?? null) as ReporteGlobal | null;

  const { data: activa } = await supabase
    .from('capacitaciones')
    .select('id, codigo, tema, instructor')
    .eq('empresa_id', empresa.id)
    .eq('estado', 'activa')
    .maybeSingle();

  const color = empresa.color_primario;
  const t = r?.totales;

  return (
    <>
      <h1 style={{ fontSize: 22, marginBottom: 3, letterSpacing: -0.4 }}>Indicadores</h1>
      <p style={{ color: '#5B6470', fontSize: 13, marginTop: 0 }}>
        {empresa.nombre} · últimos 12 meses
      </p>

      {/* ---------- Participación general ---------- */}
      <TarjetaParticipacion datos={r?.participacionGeneral ?? null} color={color} />

      {/* ---------- Indicadores ---------- */}
      <div style={est.kpis}>
        <Kpi valor={String(t?.capacitaciones ?? 0)} etiqueta="Capacitaciones" color={color} />
        <Kpi valor={String(t?.participantes ?? 0)} etiqueta="Participantes" color={color} />
        <Kpi valor={String(t?.ciudades ?? 0)} etiqueta="Ciudades" color={color} />
        <Kpi valor={String(t?.areas ?? 0)} etiqueta="Áreas" color={color} />
      </div>

      {/* ---------- Capacitación activa ---------- */}
      {activa && (
        <section style={est.activa}>
          <div>
            <div style={{ fontSize: 11, color: '#15803d', fontWeight: 600, textTransform: 'uppercase' }}>
              Capacitación activa
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, marginTop: 3 }}>{activa.tema}</div>
            <div style={{ fontSize: 12, color: '#6b7280' }}>
              {activa.codigo} · {activa.instructor}
            </div>
          </div>
          <Link href={`/panel/capacitaciones/${activa.id}`} style={{ ...est.enlace, background: color }}>
            Ver detalle
          </Link>
        </section>
      )}

      <AccionesEjecutivo
        empresaId={empresa.id}
        empresaNombre={empresa.nombre}
        correoContacto={empresa.correo}
        color={color}
      />

      {/* ---------- Series por mes ---------- */}
      <div style={est.dos}>
        <Panel
          titulo="Participantes por mes"
          descripcion="Total de asistentes registrados en cada mes."
        >
          <Columnas datos={r?.participantesPorMes ?? []} color={color} />
        </Panel>

        <Panel
          titulo="Capacitaciones por mes"
          descripcion="Cantidad de capacitaciones realizadas en cada mes."
        >
          <Columnas datos={r?.capacitacionesPorMes ?? []} color="#0ea5e9" />
        </Panel>
      </div>

      {/* ---------- Distribución global ---------- */}
      <div style={est.dos}>
        <Panel
          titulo="Participantes por ciudad"
          descripcion="Acumulado de todas las capacitaciones."
        >
          <BarrasHorizontales
            datos={r?.porCiudad ?? []}
            color={color}
            vacio="Aún no hay participantes registrados."
          />
        </Panel>

        <Panel
          titulo="Participantes por área"
          descripcion="Acumulado de todas las capacitaciones."
        >
          <BarrasHorizontales
            datos={r?.porArea ?? []}
            color="#0ea5e9"
            vacio="Aún no hay participantes registrados."
          />
        </Panel>
      </div>

      {/* ---------- Verificación de aislamiento ---------- */}
      <section style={est.aislamiento}>
        <strong style={{ color: '#14263F' }}>Empresa:</strong>{' '}
        {empresa.nombre} · Nomenclatura vigente: {empresa.nomenclatura ?? '—'}
        <div style={{ marginTop: 4 }}>
          Todos los datos de esta pantalla están filtrados por Row Level Security.
        </div>
      </section>
    </>
  );
}

/**
 * Participación general de la organización.
 * El porcentaje viene PONDERADO desde la base: total de registrados
 * sobre total de esperados. Promediar los porcentajes de cada
 * capacitación daría un número engañoso, porque una de 2 personas
 * pesaría igual que una de 50.
 */
function TarjetaParticipacion({
  datos, color,
}: {
  datos: { porcentaje: number; registrados: number; esperados: number; conMeta: number; sinMeta: number } | null;
  color: string;
}) {
  const p = datos?.porcentaje ?? 100;
  const tono = p >= 80
    ? { fondo: '#f0fdf4', borde: '#dcfce7', texto: '#15803d' }
    : p >= 50
    ? { fondo: '#fefce8', borde: '#fef08a', texto: '#a16207' }
    : { fondo: '#fef2f2', borde: '#fecaca', texto: '#b91c1c' };

  const sinMeta = datos?.sinMeta ?? 0;

  return (
    <section style={{
      background: tono.fondo, border: `1px solid ${tono.borde}`,
      borderRadius: 14, padding: '20px 22px', marginTop: 20,
      display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap',
    }}>
      <div>
        <div style={{ fontSize: 40, fontWeight: 700, color: tono.texto, lineHeight: 1 }}>
          {p}%
        </div>
        <div style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: .3, marginTop: 4 }}>
          Participación general
        </div>
      </div>

      <div style={{ flex: 1, minWidth: 200 }}>
        {/* Barra de progreso: la lectura visual es más rápida que el número */}
        <div style={{ background: '#fff', borderRadius: 6, height: 12, overflow: 'hidden', border: `1px solid ${tono.borde}` }}>
          <div style={{
            width: `${Math.min(p, 100)}%`, height: '100%',
            background: tono.texto, borderRadius: 6,
          }} />
        </div>
        <div style={{ fontSize: 12, color: '#374151', marginTop: 8 }}>
          {datos
            ? <>{datos.registrados} de {datos.esperados} participantes esperados,
                en {datos.conMeta} capacitación(es) con meta definida.</>
            : 'Aún no hay capacitaciones con meta definida.'}
        </div>
        {sinMeta > 0 && (
          <div style={{ fontSize: 11, color: '#6b7280', marginTop: 3 }}>
            {sinMeta} capacitación(es) sin meta no entran en este cálculo.
          </div>
        )}
      </div>
    </section>
  );
}

function Kpi({ valor, etiqueta, color }: { valor: string; etiqueta: string; color: string }) {
  return (
    <div style={est.kpi}>
      <div style={{ fontSize: 24, fontWeight: 700, color }}>{valor}</div>
      <div style={est.kpiEtiqueta}>{etiqueta}</div>
    </div>
  );
}

const est: Record<string, React.CSSProperties> = {
  kpis: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))',
    gap: 14, margin: '20px 0',
  },
  kpi: { background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 4px 12px rgba(0,0,0,.04)' },
  kpiEtiqueta: { fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: .3 },

  activa: {
    background: '#f0fdf4', border: '1px solid #dcfce7', borderRadius: 12,
    padding: '14px 18px', marginBottom: 20, display: 'flex',
    justifyContent: 'space-between', alignItems: 'center', gap: 14, flexWrap: 'wrap',
  },
  enlace: {
    color: '#fff', padding: '8px 16px', borderRadius: 8,
    fontSize: 12.5, fontWeight: 600, textDecoration: 'none',
  },

  dos: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: 20 },

  aislamiento: {
    fontSize: 11.5, color: '#6b7280', background: '#f8fafc',
    border: '1px solid #e2e8f0', borderRadius: 10, padding: 14,
  },
};
