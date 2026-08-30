/**
 * INFORME DE INVESTIGACIÓN DE UN EVENTO
 * ---------------------------------------------------------------
 * Resolución 1401 de 2007. Es el documento que se entrega a la ARL y
 * el que revisa el Ministerio después de un accidente.
 *
 * Su núcleo son las CAUSAS separadas en inmediatas y básicas, y las
 * firmas del equipo investigador: sin la del responsable del SG-SST el
 * informe no vale, y por eso el cierre la exige antes de emitirlo.
 *
 * Nota de react-pdf: las fuentes estándar usan WinAnsi. Nada de flechas
 * ni guiones tipográficos fuera de ese juego — no se dibujan y no avisan.
 */
import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer';
import { EncabezadoDoc, type EncabezadoConfig } from './EncabezadoDoc';

export type CampoEncabezado = { etiqueta: string; valor: string };
export type CausaPdf = { descripcion: string; clase: string };

export type MiembroPdf = {
  nombre: string;
  cargo: string | null;
  rol: string;
  firma: Buffer | null;
};

export type DatosInvestigacion = {
  empresa: string;
  nit: string | null;
  direccion: string | null;
  logo: Buffer | null;

  codigo: string;
  titulo: string;
  nomenclatura: string;
  versionDoc: string;
  colorPrimario: string;
  camposExtra: CampoEncabezado[];
  encabezadoConfig: EncabezadoConfig | null;

  tipo: string;
  fechaEvento: string;
  fechaReporte: string;
  lugar: string | null;

  nombres: string | null;
  identificacion: string | null;
  cargo: string | null;
  area: string | null;

  descripcion: string;
  parteCuerpo: string | null;
  mecanismo: string | null;
  diasIncapacidad: number;
  gravedad: string;
  reportadoArl: boolean;
  numeroFurat: string | null;

  metodologia: string;
  causasInmediatas: CausaPdf[];
  causasBasicas: CausaPdf[];
  conclusiones: string | null;

  testigos: Array<{ nombre: string; identificacion: string | null; version: string | null }>;
  acciones: Array<{ codigo: string; accion: string; responsable: string; fecha_limite: string }>;
  equipo: MiembroPdf[];

  fechaCierre: string | null;
  generadoEl: string;
};

const NOMBRE_CLASE: Record<string, string> = {
  acto: 'ACTO SUBESTÁNDAR',
  condicion: 'CONDICIÓN SUBESTÁNDAR',
  personal: 'FACTOR PERSONAL',
  trabajo: 'FACTOR DEL TRABAJO',
  otro: 'OTRO',
};

const NOMBRE_ROL: Record<string, string> = {
  responsable_sst: 'RESPONSABLE DEL SG-SST',
  copasst: 'REPRESENTANTE DEL COPASST',
  jefe_inmediato: 'JEFE INMEDIATO',
  otro: 'INTEGRANTE',
};

export function InformeInvestigacion({ d }: { d: DatosInvestigacion }) {
  const s = estilos(d.colorPrimario);

  return (
    <Document title={`Investigación ${d.codigo}`} author={d.empresa}>
      <Page size="LETTER" style={s.pagina}>

        <EncabezadoDoc d={{
          config: d.encabezadoConfig,
          logo: d.logo,
          titulo: d.titulo,
          nomenclatura: d.nomenclatura,
          versionDoc: d.versionDoc,
          campos: d.camposExtra,
          empresa: d.empresa,
          nit: d.nit,
          direccion: d.direccion,
          color: d.colorPrimario,
        }} />

        {/* ============ EL HECHO ============ */}
        <View style={s.dosColumnas}>
          <View style={s.columna}>
            <Text style={s.tituloBloque}>DATOS DEL EVENTO</Text>
            <Dato s={s} e="CONSECUTIVO" v={d.codigo} />
            <Dato s={s} e="CLASIFICACIÓN" v={d.tipo.toUpperCase()} />
            <Dato s={s} e="FECHA DEL EVENTO" v={d.fechaEvento} />
            <Dato s={s} e="FECHA DE REPORTE" v={d.fechaReporte} />
            {d.lugar && <Dato s={s} e="LUGAR" v={d.lugar.toUpperCase()} />}
          </View>

          <View style={s.columna}>
            <Text style={s.tituloBloque}>TRABAJADOR AFECTADO</Text>
            <Dato s={s} e="NOMBRE" v={(d.nombres ?? 'SIN IDENTIFICAR').toUpperCase()} />
            {d.identificacion && <Dato s={s} e="IDENTIFICACIÓN" v={d.identificacion} />}
            {d.cargo && <Dato s={s} e="CARGO" v={d.cargo.toUpperCase()} />}
            {d.area && <Dato s={s} e="ÁREA" v={d.area.toUpperCase()} />}
          </View>
        </View>

        <View style={s.caja}>
          <Text style={s.tituloBloque}>DESCRIPCIÓN DEL HECHO</Text>
          <Text style={s.parrafo}>{d.descripcion}</Text>
        </View>

        {/* ============ CONSECUENCIAS ============ */}
        <Text style={s.tituloBloque}>CONSECUENCIAS Y REPORTE</Text>
        <View style={s.rejilla}>
          <Celda s={s} e="GRAVEDAD" v={d.gravedad.toUpperCase()} />
          <Celda s={s} e="DÍAS DE INCAPACIDAD" v={String(d.diasIncapacidad)} />
          <Celda s={s} e="PARTE AFECTADA" v={(d.parteCuerpo ?? '—').toUpperCase()} />
          <Celda s={s} e="MECANISMO" v={(d.mecanismo ?? '—').toUpperCase()} />
          <Celda s={s} e="REPORTADO A LA ARL" v={d.reportadoArl ? 'SÍ' : 'NO'} />
          <Celda s={s} e="N.º FURAT" v={d.numeroFurat ?? '—'} />
        </View>

        {/* ============ TESTIGOS ============ */}
        {d.testigos.length > 0 && (
          <View style={s.seccion} wrap={false}>
            <Text style={s.tituloBloque}>TESTIGOS</Text>
            {d.testigos.map((t, i) => (
              <View key={i} style={s.testigo}>
                <Text style={s.testigoNombre}>
                  {t.nombre.toUpperCase()}{t.identificacion ? `  ·  C.C. ${t.identificacion}` : ''}
                </Text>
                {t.version && <Text style={s.parrafo}>{t.version}</Text>}
              </View>
            ))}
          </View>
        )}

        {/* ============ CAUSAS ============ */}
        <View style={s.seccion}>
          <Text style={s.tituloBloque}>
            ANÁLISIS DE CAUSAS  ·  METODOLOGÍA: {d.metodologia.toUpperCase()}
          </Text>

          <Text style={s.subtitulo}>CAUSAS INMEDIATAS</Text>
          {d.causasInmediatas.length === 0
            ? <Text style={s.vacio}>No se registraron.</Text>
            : d.causasInmediatas.map((c, i) => (
                <View key={i} style={s.causa}>
                  <Text style={s.causaClase}>{NOMBRE_CLASE[c.clase] ?? c.clase.toUpperCase()}</Text>
                  <Text style={s.causaTexto}>{c.descripcion}</Text>
                </View>
              ))}

          {/* Las básicas van destacadas: son las que generan las acciones. */}
          <Text style={s.subtitulo}>CAUSAS BÁSICAS</Text>
          {d.causasBasicas.length === 0
            ? <Text style={s.vacio}>No se registraron.</Text>
            : d.causasBasicas.map((c, i) => (
                <View key={i} style={[s.causa, s.causaBasica]}>
                  <Text style={s.causaClase}>{NOMBRE_CLASE[c.clase] ?? c.clase.toUpperCase()}</Text>
                  <Text style={s.causaTexto}>{c.descripcion}</Text>
                </View>
              ))}
        </View>

        {d.conclusiones && (
          <View style={s.caja} wrap={false}>
            <Text style={s.tituloBloque}>CONCLUSIONES</Text>
            <Text style={s.parrafo}>{d.conclusiones}</Text>
          </View>
        )}

        {/* ============ ACCIONES ============ */}
        {d.acciones.length > 0 && (
          <View style={s.seccion}>
            <Text style={s.tituloBloque}>ACCIONES CORRECTIVAS DERIVADAS</Text>
            <View style={s.thead}>
              <Text style={[s.th, { width: '16%' }]}>CÓDIGO</Text>
              <Text style={[s.th, { width: '46%' }]}>ACCIÓN</Text>
              <Text style={[s.th, { width: '24%' }]}>RESPONSABLE</Text>
              <Text style={[s.th, { width: '14%' }]}>LÍMITE</Text>
            </View>
            {d.acciones.map((a, i) => (
              <View key={i} style={s.fila}>
                <Text style={[s.td, { width: '16%' }]}>{a.codigo}</Text>
                <Text style={[s.td, { width: '46%' }]}>{a.accion}</Text>
                <Text style={[s.td, { width: '24%' }]}>{a.responsable}</Text>
                <Text style={[s.td, { width: '14%' }]}>{a.fecha_limite}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ============ FIRMAS DEL EQUIPO ============ */}
        <View style={s.zonaFirmas} wrap={false}>
          {d.equipo.map((m, i) => (
            <View key={i} style={s.columnaFirma}>
              {m.firma
                ? <Image src={m.firma} style={s.firma} />
                : <View style={s.espacioFirma} />}
              <View style={s.lineaFirma} />
              <Text style={s.nombreFirma}>{m.nombre.toUpperCase()}</Text>
              {m.cargo && <Text style={s.rolFirma}>{m.cargo.toUpperCase()}</Text>}
              <Text style={s.rolFirma}>{NOMBRE_ROL[m.rol] ?? m.rol.toUpperCase()}</Text>
            </View>
          ))}
        </View>

        <Text
          style={s.pie}
          fixed
          render={({ pageNumber, totalPages }) =>
            `${d.codigo}   •   ${d.empresa.toUpperCase()}   •   ${d.nomenclatura}   •   ` +
            `${d.versionDoc}   •   GENERADO EL ${d.generadoEl}   •   PÁGINA ${pageNumber} DE ${totalPages}`
          }
        />
      </Page>
    </Document>
  );
}

function Dato({ s, e, v }: { s: ReturnType<typeof estilos>; e: string; v: string }) {
  return (
    <Text style={s.dato}>
      <Text style={s.datoEtiqueta}>{e}: </Text>{v}
    </Text>
  );
}

function Celda({ s, e, v }: { s: ReturnType<typeof estilos>; e: string; v: string }) {
  return (
    <View style={s.celda}>
      <Text style={s.celdaEtiqueta}>{e}</Text>
      <Text style={s.celdaValor}>{v}</Text>
    </View>
  );
}

function estilos(color: string) {
  return StyleSheet.create({
    pagina: {
      paddingTop: 28, paddingBottom: 46, paddingHorizontal: 32,
      fontSize: 9, fontFamily: 'Helvetica', color: '#14263F',
    },

    dosColumnas: { flexDirection: 'row', gap: 24, marginBottom: 12 },
    columna: { flex: 1 },
    tituloBloque: {
      fontSize: 8, fontFamily: 'Helvetica-Bold', color,
      marginBottom: 5, letterSpacing: .3,
    },
    subtitulo: {
      fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: '#5B6470',
      marginTop: 9, marginBottom: 4, letterSpacing: .4,
    },
    dato: { fontSize: 8.5, marginBottom: 2.5 },
    datoEtiqueta: { fontFamily: 'Helvetica-Bold' },

    caja: {
      borderWidth: 0.7, borderColor: '#E4E4DF', borderRadius: 3,
      backgroundColor: '#FAFAF8', padding: 10, marginBottom: 12,
    },
    parrafo: { fontSize: 8.2, lineHeight: 1.6, textAlign: 'justify' },
    vacio: { fontSize: 8, color: '#8A929C', fontStyle: 'italic' },

    seccion: { marginBottom: 12 },

    rejilla: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
    celda: {
      flexGrow: 1, flexBasis: '30%', borderWidth: 0.7, borderColor: '#E4E4DF',
      borderRadius: 3, padding: '6 9',
    },
    celdaEtiqueta: { fontSize: 6, color: '#8A929C', letterSpacing: .3 },
    celdaValor: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', marginTop: 2 },

    testigo: { marginBottom: 7 },
    testigoNombre: { fontSize: 8, fontFamily: 'Helvetica-Bold', marginBottom: 2 },

    causa: {
      borderLeftWidth: 2, borderLeftColor: '#E4E4DF',
      paddingLeft: 8, paddingVertical: 4, marginBottom: 5,
    },
    causaBasica: { borderLeftColor: color, backgroundColor: '#FAFAF8' },
    causaClase: { fontSize: 6.2, color: '#8A929C', letterSpacing: .4, marginBottom: 1.5 },
    causaTexto: { fontSize: 8.3, lineHeight: 1.5 },

    thead: { flexDirection: 'row', backgroundColor: color, paddingVertical: 4.5 },
    th: { fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: '#ffffff', paddingHorizontal: 4 },
    fila: {
      flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: '#EFEFEA',
      paddingVertical: 5,
    },
    td: { fontSize: 7.5, paddingHorizontal: 4 },

    zonaFirmas: {
      flexDirection: 'row', flexWrap: 'wrap', gap: 24, marginTop: 30,
      justifyContent: 'space-around',
    },
    columnaFirma: { flexGrow: 1, flexBasis: '40%', alignItems: 'center', marginBottom: 14 },
    firma: { height: 38, maxWidth: 140, objectFit: 'contain', marginBottom: 2 },
    espacioFirma: { height: 40 },
    lineaFirma: {
      width: '100%', borderBottomWidth: 0.8,
      borderBottomColor: '#9CA3AF', marginBottom: 4,
    },
    nombreFirma: { fontSize: 8.2, fontFamily: 'Helvetica-Bold', textAlign: 'center' },
    rolFirma: { fontSize: 6.5, color: '#6B7280', marginTop: 1, textAlign: 'center' },

    pie: {
      position: 'absolute', bottom: 20, left: 32, right: 32,
      textAlign: 'center', fontSize: 6, color: '#9CA3AF',
    },
  });
}
