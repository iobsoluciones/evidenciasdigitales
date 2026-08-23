/**
 * REPORTE EJECUTIVO POR EMPRESA
 * ---------------------------------------------------------------
 * Documento de gestión para presentar a gerencia o al COPASST: el
 * estado del programa de capacitación de una empresa en un periodo.
 *
 * A diferencia del acta —que prueba un hecho puntual— este reporte
 * responde preguntas de gestión: cuánto se capacitó, quién participa,
 * dónde falla el aprendizaje.
 */
import {
  Document, Page, Text, View, Image, StyleSheet,
} from '@react-pdf/renderer';

export type CampoEncabezado = { etiqueta: string; valor: string };

export type DatosEjecutivo = {
  empresa: string;
  nit: string | null;
  ciudad: string | null;
  nomenclatura: string;
  versionDoc: string;
  colorPrimario: string;
  logo: Buffer | null;
  camposExtra: CampoEncabezado[];

  periodo: string;
  elaboradoPor: string;

  // Indicadores
  capacitaciones: number;
  participantes: number;
  participacion: number;
  registrados: number;
  esperados: number;
  conMeta: number;
  sinMeta: number;

  porMes: Array<{ mes: string; capacitaciones: number; participantes: number }>;
  porArea: Array<{ etiqueta: string; valor: number }>;
  porCiudad: Array<{ etiqueta: string; valor: number }>;

  detalle: Array<{
    codigo: string; tema: string; instructor: string; fecha: string;
    registrados: number; esperados: number | null; participacion: number;
    evaluada: boolean; promedio: number | null;
  }>;

  generadoEl: string;
};

const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

function etiquetaMes(iso: string): string {
  const [a, m] = iso.split('-');
  return `${MESES[Number(m) - 1]} ${a.slice(2)}`;
}

export function ReporteEjecutivo({ d }: { d: DatosEjecutivo }) {
  const s = estilos(d.colorPrimario);

  const tono = (p: number) => (p >= 80 ? '#15803D' : p >= 50 ? '#8A6100' : '#9B1C1C');
  const maxMes = Math.max(...d.porMes.map((m) => m.participantes), 1);

  return (
    <Document title={`Reporte ejecutivo ${d.empresa}`} author={d.empresa}>
      <Page size="LETTER" style={s.pagina}>

        {/* ============ ENCABEZADO ============ */}
        {d.logo && (
          <View style={s.logoCaja}><Image src={d.logo} style={s.logo} /></View>
        )}

        <Text style={s.titulo}>REPORTE EJECUTIVO DE CAPACITACIÓN</Text>
        <Text style={s.control}>
          VERSIÓN: {d.versionDoc}   •   NOMENCLATURA: {d.nomenclatura}
          {d.camposExtra.map((c) => `   •   ${c.etiqueta}: ${c.valor}`).join('')}
        </Text>

        <Text style={s.empresa}>{d.empresa.toUpperCase()}</Text>

        <View style={s.datos}>
          {d.nit && <Dato s={s} e="NIT" v={d.nit} />}
          {d.ciudad && <Dato s={s} e="CIUDAD" v={d.ciudad.toUpperCase()} />}
          <Dato s={s} e="PERIODO" v={d.periodo} />
          <Dato s={s} e="ELABORADO POR" v={d.elaboradoPor.toUpperCase()} />
        </View>

        {/* ============ RESUMEN ============ */}
        <Text style={s.seccion}>RESUMEN DEL PERIODO</Text>
        <View style={s.kpis}>
          <Kpi s={s} v={String(d.capacitaciones)} e="CAPACITACIONES" />
          <Kpi s={s} v={String(d.participantes)} e="ASISTENCIAS" />
          <Kpi s={s} v={`${d.participacion}%`} e="PARTICIPACIÓN" color={tono(d.participacion)} />
          <Kpi s={s} v={String(d.porArea.length)} e="ÁREAS ALCANZADAS" />
        </View>

        <Text style={s.lectura}>
          Se realizaron {d.capacitaciones} capacitaciones con {d.participantes} asistencias
          registradas. {d.conMeta > 0
            ? `De ${d.esperados} participantes esperados asistieron ${d.registrados}, para una participación del ${d.participacion}%.`
            : 'No se definieron metas de participación, por lo que el indicador no es comparable.'}
          {d.sinMeta > 0 && ` ${d.sinMeta} capacitación(es) no definieron meta y quedan fuera del cálculo.`}
        </Text>

        {/* ============ EVOLUCIÓN ============ */}
        <Text style={s.seccion}>EVOLUCIÓN MENSUAL</Text>
        <View style={s.grafico}>
          {d.porMes.map((m, i) => {
            const alto = m.participantes === 0 ? 2 : Math.max((m.participantes / maxMes) * 62, 4);
            return (
              <View key={i} style={s.columna}>
                <Text style={s.valorCol}>{m.participantes > 0 ? m.participantes : ''}</Text>
                <View style={{
                  ...s.barraCol, height: alto,
                  backgroundColor: m.participantes === 0 ? '#E4E4DF' : d.colorPrimario,
                }} />
                <Text style={s.etiquetaCol}>{etiquetaMes(m.mes)}</Text>
                <Text style={s.subCol}>{m.capacitaciones > 0 ? `${m.capacitaciones}c` : ''}</Text>
              </View>
            );
          })}
        </View>
        <Text style={s.nota}>
          Barras: asistencias por mes. Debajo, número de capacitaciones realizadas.
        </Text>

        {/* ============ DISTRIBUCIÓN ============ */}
        <View style={s.dosColumnas}>
          <View style={s.col}>
            <Text style={s.seccionMini}>PARTICIPACIÓN POR ÁREA</Text>
            {d.porArea.length === 0
              ? <Text style={s.vacio}>Sin datos.</Text>
              : d.porArea.slice(0, 8).map((a, i) => (
                  <Barra key={i} s={s} etiqueta={a.etiqueta} valor={a.valor}
                    max={d.porArea[0].valor} color={d.colorPrimario} />
                ))}
          </View>
          <View style={s.col}>
            <Text style={s.seccionMini}>PARTICIPACIÓN POR CIUDAD</Text>
            {d.porCiudad.length === 0
              ? <Text style={s.vacio}>Sin datos.</Text>
              : d.porCiudad.slice(0, 8).map((c, i) => (
                  <Barra key={i} s={s} etiqueta={c.etiqueta} valor={c.valor}
                    max={d.porCiudad[0].valor} color="#5B6470" />
                ))}
          </View>
        </View>

        {/* ============ DETALLE ============ */}
        <Text style={s.seccion} break={d.detalle.length > 10}>
          DETALLE DE CAPACITACIONES
        </Text>
        <View style={s.thead} fixed>
          <Text style={[s.th, { width: '11%' }]}>CÓDIGO</Text>
          <Text style={[s.th, { width: '31%' }]}>TEMA</Text>
          <Text style={[s.th, { width: '17%' }]}>INSTRUCTOR</Text>
          <Text style={[s.th, { width: '13%' }]}>FECHA</Text>
          <Text style={[s.th, { width: '14%' }]}>ASISTENCIA</Text>
          <Text style={[s.th, { width: '14%' }]}>EVALUACIÓN</Text>
        </View>

        {d.detalle.map((c, i) => (
          <View key={i} style={s.fila} wrap={false}>
            <Text style={[s.td, { width: '11%' }]}>{c.codigo}</Text>
            <Text style={[s.td, { width: '31%' }]}>{c.tema.toUpperCase()}</Text>
            <Text style={[s.td, { width: '17%' }]}>{c.instructor.toUpperCase()}</Text>
            <Text style={[s.td, { width: '13%' }]}>{c.fecha}</Text>
            <Text style={[s.td, { width: '14%', color: tono(c.participacion) }]}>
              {c.esperados ? `${c.registrados}/${c.esperados}` : String(c.registrados)}
              {c.esperados ? ` · ${c.participacion}%` : ''}
            </Text>
            <Text style={[s.td, { width: '14%' }]}>
              {c.evaluada ? (c.promedio !== null ? `${c.promedio}%` : 'Sin responder') : '—'}
            </Text>
          </View>
        ))}

        {d.detalle.length === 0 && (
          <Text style={s.vacio}>No hay capacitaciones registradas en el periodo.</Text>
        )}

        {/* ============ FIRMA ============ */}
        <View style={s.firma} wrap={false}>
          <Text style={s.lineaFirma}>__________________________________</Text>
          <Text style={s.nombreFirma}>{d.elaboradoPor.toUpperCase()}</Text>
          <Text style={s.rolFirma}>RESPONSABLE DEL PROGRAMA DE CAPACITACIÓN</Text>
        </View>

        <Text
          style={s.pie}
          fixed
          render={({ pageNumber, totalPages }) =>
            `${d.empresa.toUpperCase()}   •   REPORTE EJECUTIVO   •   ${d.nomenclatura}   •   ` +
            `${d.versionDoc}   •   GENERADO EL ${d.generadoEl}   •   PÁGINA ${pageNumber} DE ${totalPages}`
          }
        />
      </Page>
    </Document>
  );
}

function Dato({ s, e, v }: { s: any; e: string; v: string }) {
  return <Text style={s.dato}><Text style={s.datoEtiqueta}>{e}: </Text>{v}</Text>;
}

function Kpi({ s, v, e, color }: { s: any; v: string; e: string; color?: string }) {
  return (
    <View style={s.kpi}>
      <Text style={[s.kpiValor, color ? { color } : {}]}>{v}</Text>
      <Text style={s.kpiEtiqueta}>{e}</Text>
    </View>
  );
}

function Barra({ s, etiqueta, valor, max, color }: {
  s: any; etiqueta: string; valor: number; max: number; color: string;
}) {
  return (
    <View style={s.filaBarra}>
      <Text style={s.etiquetaBarra}>{etiqueta}</Text>
      <View style={s.pistaBarra}>
        <View style={{ width: `${Math.max((valor / max) * 100, 3)}%`, height: '100%', backgroundColor: color }} />
      </View>
      <Text style={s.valorBarra}>{valor}</Text>
    </View>
  );
}

function estilos(color: string) {
  return StyleSheet.create({
    pagina: {
      paddingTop: 28, paddingBottom: 46, paddingHorizontal: 30,
      fontSize: 9, fontFamily: 'Helvetica', color: '#14263F',
    },
    logoCaja: { alignItems: 'center', marginBottom: 8 },
    logo: { maxHeight: 44, maxWidth: 150, objectFit: 'contain' },

    titulo: { textAlign: 'center', fontSize: 15, fontFamily: 'Helvetica-Bold', color, marginBottom: 3 },
    control: { textAlign: 'center', fontSize: 7.2, color: '#8A929C', marginBottom: 14 },
    empresa: { fontSize: 13, fontFamily: 'Helvetica-Bold', color, marginBottom: 6 },

    datos: { marginBottom: 4 },
    dato: { fontSize: 8.5, marginBottom: 2 },
    datoEtiqueta: { fontFamily: 'Helvetica-Bold' },

    seccion: {
      fontSize: 10, fontFamily: 'Helvetica-Bold', color,
      marginTop: 16, marginBottom: 7,
      borderBottomWidth: 1, borderBottomColor: color, paddingBottom: 3,
    },
    seccionMini: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color, marginBottom: 6 },
    lectura: { fontSize: 8.5, color: '#5B6470', lineHeight: 1.5, marginTop: 8 },
    nota: { fontSize: 7, color: '#8A929C', marginTop: 5 },
    vacio: { fontSize: 8, color: '#A3AAB3', marginVertical: 6 },

    kpis: { flexDirection: 'row', gap: 8 },
    kpi: { flex: 1, backgroundColor: '#F7F7F4', padding: 10, alignItems: 'center' },
    kpiValor: { fontSize: 17, fontFamily: 'Helvetica-Bold', color: '#14263F' },
    kpiEtiqueta: { fontSize: 6.2, color: '#8A929C', marginTop: 2 },

    grafico: {
      flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 90,
      borderBottomWidth: 0.5, borderBottomColor: '#DFDFD8',
    },
    columna: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: '100%' },
    valorCol: { fontSize: 6.5, fontFamily: 'Helvetica-Bold', marginBottom: 2, minHeight: 8 },
    barraCol: { width: '100%', maxWidth: 26 },
    etiquetaCol: { fontSize: 5.8, color: '#5B6470', marginTop: 3 },
    subCol: { fontSize: 5.5, color: '#A3AAB3' },

    dosColumnas: { flexDirection: 'row', gap: 22, marginTop: 16 },
    col: { flex: 1 },
    filaBarra: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
    etiquetaBarra: { width: 74, fontSize: 7, paddingRight: 5, textAlign: 'right' },
    pistaBarra: { flex: 1, height: 9, backgroundColor: '#F0F0EB' },
    valorBarra: { width: 20, fontSize: 7, fontFamily: 'Helvetica-Bold', textAlign: 'right' },

    thead: { flexDirection: 'row', backgroundColor: color, paddingVertical: 4, marginTop: 4 },
    th: { fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: '#ffffff', paddingHorizontal: 3 },
    fila: {
      flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: '#EFEFEA',
      paddingVertical: 4, alignItems: 'center',
    },
    td: { fontSize: 7, paddingHorizontal: 3 },

    firma: { marginTop: 30 },
    lineaFirma: { fontSize: 10, color: '#A3AAB3' },
    nombreFirma: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', marginTop: 3 },
    rolFirma: { fontSize: 7, color: '#8A929C' },

    pie: {
      position: 'absolute', bottom: 20, left: 30, right: 30,
      textAlign: 'center', fontSize: 6.2, color: '#8A929C',
    },
  });
}
