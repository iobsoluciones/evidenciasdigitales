/**
 * INFORME DE RESULTADOS DE LA EVALUACIÓN
 * ---------------------------------------------------------------
 * Documento pensado para presentar a áreas administrativas: primero
 * los indicadores, luego el desglose por subtema —que es lo
 * accionable— y al final el detalle por participante.
 *
 * El encabezado admite los campos extra que cada empresa configure.
 */
import {
  Document, Page, Text, View, Image, StyleSheet,
} from '@react-pdf/renderer';
import { EncabezadoDoc, type EncabezadoConfig } from './EncabezadoDoc';

export type CampoEncabezado = { etiqueta: string; valor: string };

export type DatosInforme = {
  organizacion: string;
  nomenclatura: string;
  versionDoc: string;
  colorPrimario: string;
  logo: Buffer | null;
  camposExtra: CampoEncabezado[];
  /** Diseño del encabezado de la empresa. */
  encabezadoConfig: EncabezadoConfig | null;

  codigo: string;
  tema: string;
  instructor: string;
  fecha: string;
  tituloEvaluacion: string;
  puntajeMinimo: number;

  evaluados: number;
  promedio: number;
  aprobados: number;
  reprobados: number;

  porSubtema: Array<{ etiqueta: string; respuestas: number; aciertos: number; aciertos_pct: number }>;
  porPregunta: Array<{ etiqueta: string; subtema: string | null; respuestas: number; aciertos_pct: number }>;
  participantes: Array<{ nombres: string; area: string; puntaje: number | null; aprobo: boolean | null }>;

  generadoEl: string;
};

export function InformeEvaluacion({ d }: { d: DatosInforme }) {
  const s = estilos(d.colorPrimario);

  /** Verde, ámbar o rojo según el nivel de acierto. */
  const tono = (pct: number) =>
    pct >= 80 ? '#15803d' : pct >= 60 ? '#a16207' : '#b91c1c';

  return (
    <Document title={`Informe evaluación ${d.codigo}`} author={d.organizacion}>
      <Page size="LETTER" style={s.pagina}>

        {/* ============ ENCABEZADO ============ */}
        <EncabezadoDoc d={{
          config: d.encabezadoConfig,
          logo: d.logo,
          titulo: 'INFORME DE RESULTADOS DE EVALUACIÓN',
          nomenclatura: d.nomenclatura,
          versionDoc: d.versionDoc,
          campos: d.camposExtra,
          empresa: d.organizacion,
          nit: null,
          direccion: null,
          color: d.colorPrimario,
        }} />

        {/* ============ DATOS ============ */}
        <View style={s.bloqueDatos}>
          <Dato s={s} e="ID CAPACITACIÓN" v={d.codigo} />
          <Dato s={s} e="TEMA" v={d.tema.toUpperCase()} />
          <Dato s={s} e="INSTRUCTOR" v={d.instructor.toUpperCase()} />
          <Dato s={s} e="FECHA" v={d.fecha} />
          <Dato s={s} e="EVALUACIÓN" v={d.tituloEvaluacion.toUpperCase()} />
          <Dato s={s} e="PUNTAJE MÍNIMO PARA APROBAR" v={`${d.puntajeMinimo}%`} />
        </View>

        {/* ============ INDICADORES ============ */}
        <Text style={s.seccion}>INDICADORES GENERALES</Text>
        <View style={s.kpis}>
          <Kpi s={s} v={String(d.evaluados)} e="EVALUADOS" />
          <Kpi s={s} v={`${d.promedio}%`} e="PROMEDIO" color={tono(d.promedio)} />
          <Kpi s={s} v={String(d.aprobados)} e="APROBADOS" color="#15803d" />
          <Kpi s={s} v={String(d.reprobados)} e="REPROBADOS"
               color={d.reprobados > 0 ? '#b91c1c' : '#6b7280'} />
        </View>

        {/* ============ POR SUBTEMA ============ */}
        <Text style={s.seccion}>DESEMPEÑO POR SUBTEMA</Text>
        <Text style={s.nota}>
          Ordenado de menor a mayor acierto. Los primeros de la lista indican
          dónde conviene reforzar la formación.
        </Text>

        {d.porSubtema.length === 0 ? (
          <Text style={s.vacio}>Las preguntas no tienen subtema asignado.</Text>
        ) : (
          d.porSubtema.map((t, i) => (
            <View key={i} style={s.filaBarra} wrap={false}>
              <Text style={s.etiquetaBarra}>{t.etiqueta}</Text>
              <View style={s.pista}>
                <View style={{
                  width: `${Math.max(t.aciertos_pct, 2)}%`,
                  height: '100%',
                  backgroundColor: tono(t.aciertos_pct),
                }} />
              </View>
              <Text style={[s.valorBarra, { color: tono(t.aciertos_pct) }]}>
                {t.aciertos_pct}%
              </Text>
              <Text style={s.detalleBarra}>{t.aciertos}/{t.respuestas}</Text>
            </View>
          ))
        )}

        {/* ============ POR PREGUNTA ============ */}
        <Text style={s.seccion}>RESULTADO POR PREGUNTA</Text>
        <View style={s.thead} fixed>
          <Text style={[s.th, { width: '58%' }]}>PREGUNTA</Text>
          <Text style={[s.th, { width: '22%' }]}>SUBTEMA</Text>
          <Text style={[s.th, { width: '20%' }]}>ACIERTOS</Text>
        </View>
        {d.porPregunta.map((p, i) => (
          <View key={i} style={s.fila} wrap={false}>
            <Text style={[s.td, { width: '58%' }]}>{p.etiqueta}</Text>
            <Text style={[s.td, { width: '22%' }]}>{p.subtema ?? '—'}</Text>
            <Text style={[s.td, { width: '20%', color: tono(p.aciertos_pct) }]}>
              {p.aciertos_pct}%
            </Text>
          </View>
        ))}

        {/* ============ POR PARTICIPANTE ============ */}
        <Text style={s.seccion} break={d.participantes.length > 12}>
          RESULTADO POR PARTICIPANTE
        </Text>
        <View style={s.thead} fixed>
          <Text style={[s.th, { width: '8%' }]}>#</Text>
          <Text style={[s.th, { width: '46%' }]}>NOMBRE</Text>
          <Text style={[s.th, { width: '22%' }]}>ÁREA</Text>
          <Text style={[s.th, { width: '12%' }]}>PUNTAJE</Text>
          <Text style={[s.th, { width: '12%' }]}>ESTADO</Text>
        </View>
        {d.participantes.map((p, i) => (
          <View key={i} style={s.fila} wrap={false}>
            <Text style={[s.td, { width: '8%' }]}>{i + 1}</Text>
            <Text style={[s.td, { width: '46%' }]}>{p.nombres.toUpperCase()}</Text>
            <Text style={[s.td, { width: '22%' }]}>{p.area.toUpperCase()}</Text>
            <Text style={[s.td, { width: '12%' }]}>
              {p.puntaje !== null ? `${p.puntaje}%` : '—'}
            </Text>
            <Text style={[s.td, {
              width: '12%',
              color: p.aprobo === null ? '#9ca3af' : p.aprobo ? '#15803d' : '#b91c1c',
            }]}>
              {p.aprobo === null ? 'SIN EVALUAR' : p.aprobo ? 'APROBÓ' : 'REPROBÓ'}
            </Text>
          </View>
        ))}

        {/* ============ PIE ============ */}
        <Text
          style={s.pie}
          fixed
          render={({ pageNumber, totalPages }) =>
            `ID CAPACITACIÓN: ${d.codigo}   •   INFORME DE EVALUACIÓN   •   ` +
            `${d.nomenclatura}   •   ${d.versionDoc}   •   ` +
            `GENERADO EL ${d.generadoEl}   •   PÁGINA ${pageNumber} DE ${totalPages}`
          }
        />
      </Page>
    </Document>
  );
}

function Dato({ s, e, v }: { s: any; e: string; v: string }) {
  return (
    <Text style={s.dato}>
      <Text style={s.datoEtiqueta}>{e}: </Text>{v}
    </Text>
  );
}

function Kpi({ s, v, e, color }: { s: any; v: string; e: string; color?: string }) {
  return (
    <View style={s.kpi}>
      <Text style={[s.kpiValor, color ? { color } : {}]}>{v}</Text>
      <Text style={s.kpiEtiqueta}>{e}</Text>
    </View>
  );
}

function estilos(color: string) {
  return StyleSheet.create({
    pagina: {
      paddingTop: 28, paddingBottom: 48, paddingHorizontal: 30,
      fontSize: 9, fontFamily: 'Helvetica', color: '#1f2937',
    },
    logoCaja: { alignItems: 'center', marginBottom: 8 },
    logo: { maxHeight: 46, maxWidth: 150, objectFit: 'contain' },

    titulo: { textAlign: 'center', fontSize: 15, fontFamily: 'Helvetica-Bold', color, marginBottom: 3 },
    control: { textAlign: 'center', fontSize: 7.5, color: '#6b7280', marginBottom: 14 },
    empresa: { fontSize: 12, fontFamily: 'Helvetica-Bold', color, marginBottom: 10 },

    bloqueDatos: { marginBottom: 6 },
    dato: { fontSize: 9, marginBottom: 2.5 },
    datoEtiqueta: { fontFamily: 'Helvetica-Bold' },

    seccion: {
      fontSize: 10, fontFamily: 'Helvetica-Bold', color,
      marginTop: 18, marginBottom: 6,
      borderBottomWidth: 1, borderBottomColor: color, paddingBottom: 3,
    },
    nota: { fontSize: 8, color: '#6b7280', marginBottom: 8 },
    vacio: { fontSize: 8.5, color: '#9ca3af', marginBottom: 8 },

    kpis: { flexDirection: 'row', gap: 8, marginBottom: 4 },
    kpi: { flex: 1, backgroundColor: '#f8fafc', padding: 10, alignItems: 'center' },
    kpiValor: { fontSize: 17, fontFamily: 'Helvetica-Bold', color: '#1f2937' },
    kpiEtiqueta: { fontSize: 6.5, color: '#6b7280', marginTop: 2 },

    filaBarra: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
    etiquetaBarra: { width: 130, fontSize: 8, paddingRight: 6, textAlign: 'right' },
    pista: { flex: 1, height: 11, backgroundColor: '#f1f5f9' },
    valorBarra: { width: 34, fontSize: 8, fontFamily: 'Helvetica-Bold', textAlign: 'right' },
    detalleBarra: { width: 34, fontSize: 7, color: '#9ca3af', textAlign: 'right' },

    thead: { flexDirection: 'row', backgroundColor: color, paddingVertical: 4, marginTop: 4 },
    th: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#ffffff', paddingHorizontal: 4 },
    fila: {
      flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: '#e5e7eb',
      paddingVertical: 4, alignItems: 'center',
    },
    td: { fontSize: 7.5, paddingHorizontal: 4 },

    pie: {
      position: 'absolute', bottom: 22, left: 30, right: 30,
      textAlign: 'center', fontSize: 6.5, color: '#6b7280',
    },
  });
}
