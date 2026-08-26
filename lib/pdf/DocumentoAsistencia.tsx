/**
 * PLANTILLA DEL REPORTE DE ASISTENCIA
 * ---------------------------------------------------------------
 * Se construye con @react-pdf/renderer, que produce un PDF real
 * (no una captura de HTML), con texto seleccionable y control fino
 * del maquetado.
 *
 * ESTRUCTURA, igual a la que quedó en Apps Script:
 *   - Encabezado SOLO en la primera hoja: logo, título centrado y
 *     línea de control documental.
 *   - Pie en TODAS las hojas con el ID de la capacitación, para poder
 *     identificar a qué acta pertenece cada página suelta.
 *   - Bloque de firma del capacitador al final.
 *
 * Las imágenes se pasan como Buffer, no como URL: el bucket de firmas
 * es privado y así se evita depender de URLs temporales.
 */
import {
  Document, Page, Text, View, Image, StyleSheet,
} from '@react-pdf/renderer';
import { EncabezadoDoc, type EncabezadoConfig } from './EncabezadoDoc';

export type DatosPdf = {
  organizacion: string;
  tituloDoc: string;
  nomenclatura: string;
  versionDoc: string;
  fechaCreacionDoc: string;
  colorPrimario: string;
  logo: Buffer | null;
  /** Campos extra que cada empresa configura en su encabezado. */
  camposExtra: Array<{ etiqueta: string; valor: string }>;
  /** Diseño del encabezado, congelado al emitir. */
  encabezadoConfig: EncabezadoConfig | null;

  codigo: string;
  tema: string;
  descripcion: string | null;
  instructor: string;
  fechaInicio: string;
  fechaFin: string;
  esperados: number | null;
  registrados: number;
  porcentaje: number;

  participantes: Array<{
    nombres: string;
    cargo: string;
    area: string;
    ciudad: string;
    identificacion: string;
    firma: Buffer | null;
  }>;

  firmaInstructor: Buffer | null;
  /** Firma del consultor responsable, si pidió anexarla. Los datos van
   *  congelados desde la capacitación: un acta emitida no cambia
   *  aunque el consultor actualice su perfil después. */
  firmaProfesional: Buffer | null;
  profNombre: string | null;
  profProfesion: string | null;
  generadoEl: string;
};

/** Anchos relativos de la tabla. La columna "#" es angosta a propósito. */
const ANCHOS = {
  num: '5%',
  nombre: '24%',
  cargo: '15%',
  area: '15%',
  ciudad: '12%',
  identificacion: '14%',
  firma: '15%',
};

export function DocumentoAsistencia({ d }: { d: DatosPdf }) {
  const s = crearEstilos(d.colorPrimario);

  return (
    <Document
      title={`Asistencia ${d.codigo}`}
      author={d.organizacion}
      subject={d.tema}
    >
      <Page size="LETTER" style={s.pagina}>

        {/* ============ ENCABEZADO (solo primera hoja) ============ */}
        {/* Diseño elegido por la empresa y congelado al crear el acta.
            La fecha de creación documental viaja como un campo más
            para no perderla en las plantillas que no la contemplan. */}
        <EncabezadoDoc d={{
          config: d.encabezadoConfig,
          logo: d.logo,
          titulo: d.tituloDoc,
          nomenclatura: d.nomenclatura,
          versionDoc: d.versionDoc,
          codigo: d.codigo,
          campos: [
            ...(d.fechaCreacionDoc
              ? [{ etiqueta: 'FECHA DE CREACIÓN', valor: d.fechaCreacionDoc }]
              : []),
            ...d.camposExtra,
          ],
          empresa: d.organizacion,
          nit: null,
          direccion: null,
          color: d.colorPrimario,
        }} />

        {/* ============ DATOS + DESCRIPCIÓN (dos columnas) ============ */}
        <View style={s.dosColumnas}>
          <View style={s.colIzq}>
            <Dato s={s} e="ID CAPACITACIÓN" v={d.codigo} />
            <Dato s={s} e="TEMA" v={d.tema.toUpperCase()} />
            <Dato s={s} e="INSTRUCTOR" v={d.instructor.toUpperCase()} />
            <Dato s={s} e="HORARIO" v={`${d.fechaInicio}  —  ${d.fechaFin}`} />
            <Dato s={s} e="PARTICIPANTES REGISTRADOS" v={String(d.registrados)} />
            {d.esperados !== null && (
              <Dato s={s} e="PARTICIPANTES ESPERADOS" v={String(d.esperados)} />
            )}
            <Dato s={s} e="PORCENTAJE DE PARTICIPACIÓN" v={`${d.porcentaje}%`} />
          </View>

          <View style={s.colDer}>
            <Text style={s.tituloDesc}>DESCRIPCIÓN</Text>
            <Text style={s.textoDesc}>
              {(d.descripcion || 'SIN DESCRIPCIÓN REGISTRADA').toUpperCase()}
            </Text>
          </View>
        </View>

        {/* ============ TABLA DE ASISTENTES ============ */}
        <View style={s.tablaEncabezado} fixed>
          <Text style={[s.th, { width: ANCHOS.num }]}>#</Text>
          <Text style={[s.th, { width: ANCHOS.nombre }]}>NOMBRE</Text>
          <Text style={[s.th, { width: ANCHOS.cargo }]}>CARGO</Text>
          <Text style={[s.th, { width: ANCHOS.area }]}>ÁREA</Text>
          <Text style={[s.th, { width: ANCHOS.ciudad }]}>CIUDAD</Text>
          <Text style={[s.th, { width: ANCHOS.identificacion }]}>IDENTIFICACIÓN</Text>
          <Text style={[s.th, { width: ANCHOS.firma }]}>FIRMA</Text>
        </View>

        {d.participantes.map((p, i) => (
          <View key={i} style={s.fila} wrap={false}>
            <Text style={[s.td, { width: ANCHOS.num }]}>{i + 1}</Text>
            <Text style={[s.td, { width: ANCHOS.nombre }]}>{p.nombres.toUpperCase()}</Text>
            <Text style={[s.td, { width: ANCHOS.cargo }]}>{p.cargo.toUpperCase()}</Text>
            <Text style={[s.td, { width: ANCHOS.area }]}>{p.area.toUpperCase()}</Text>
            <Text style={[s.td, { width: ANCHOS.ciudad }]}>{p.ciudad.toUpperCase()}</Text>
            <Text style={[s.td, { width: ANCHOS.identificacion }]}>{p.identificacion}</Text>
            <View style={[s.tdFirma, { width: ANCHOS.firma }]}>
              {p.firma
                ? <Image src={p.firma} style={s.firmaTabla} />
                : <Text style={s.sinFirma}>—</Text>}
            </View>
          </View>
        ))}

        {d.participantes.length === 0 && (
          <Text style={s.vacio}>Sin asistentes registrados.</Text>
        )}

        {/* ============ FIRMAS ============ */}
        {/* Dos columnas cuando el consultor anexa la suya: quien dictó
            y quien avala técnicamente pueden ser personas distintas. */}
        <View style={s.zonaFirmas} wrap={false}>
          <View style={s.columnaFirma}>
            <Text style={s.tituloFirma}>FIRMA DE QUIEN CAPACITA</Text>
            {d.firmaInstructor
              ? <Image src={d.firmaInstructor} style={s.firmaInstructor} />
              : <Text style={s.lineaFirma}>______________________________</Text>}
            <Text style={s.nombreInstructor}>{d.instructor.toUpperCase()}</Text>
            <Text style={s.rolInstructor}>
              INSTRUCTOR / CAPACITADOR{d.firmaInstructor ? '' : ' (FIRMA PENDIENTE)'}
            </Text>
          </View>

          {d.firmaProfesional && (
            <View style={s.columnaFirma}>
              <Text style={s.tituloFirma}>RESPONSABLE TÉCNICO</Text>
              <Image src={d.firmaProfesional} style={s.firmaInstructor} />
              <Text style={s.nombreInstructor}>
                {(d.profNombre ?? '').toUpperCase()}
              </Text>
              <Text style={s.rolInstructor}>
                {(d.profProfesion ?? 'CONSULTOR HSEQ').toUpperCase()}
              </Text>
            </View>
          )}
        </View>

        {/* ============ PIE (se repite en TODAS las hojas) ============ */}
        <Text
          style={s.pie}
          fixed
          render={({ pageNumber, totalPages }) =>
            `ID CAPACITACIÓN: ${d.codigo}   •   ${d.tema.toUpperCase()}   •   ` +
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
      <Text style={s.datoEtiqueta}>{e}: </Text>
      {v}
    </Text>
  );
}

function crearEstilos(color: string) {
  return StyleSheet.create({
    pagina: {
      paddingTop: 28, paddingBottom: 48, paddingHorizontal: 30,
      fontSize: 9, fontFamily: 'Helvetica', color: '#1f2937',
    },

    logoCaja: { alignItems: 'center', marginBottom: 8 },
    logo: { maxHeight: 46, maxWidth: 150, objectFit: 'contain' },

    tituloDoc: {
      textAlign: 'center', fontSize: 15, fontFamily: 'Helvetica-Bold',
      color, marginBottom: 3,
    },
    control: {
      textAlign: 'center', fontSize: 7.5, color: '#6b7280', marginBottom: 14,
    },
    empresa: {
      fontSize: 12, fontFamily: 'Helvetica-Bold', color, marginBottom: 8,
    },

    dosColumnas: { flexDirection: 'row', marginBottom: 14 },
    colIzq: { width: '60%', paddingRight: 10 },
    colDer: { width: '40%', paddingLeft: 8 },
    dato: { fontSize: 9, marginBottom: 2.5 },
    datoEtiqueta: { fontFamily: 'Helvetica-Bold' },
    tituloDesc: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color, marginBottom: 3 },
    textoDesc: { fontSize: 8.5, color: '#374151', lineHeight: 1.4 },

    tablaEncabezado: {
      flexDirection: 'row', backgroundColor: color, color: '#ffffff',
      paddingVertical: 5, marginTop: 4,
    },
    th: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', paddingHorizontal: 3, color: '#ffffff' },

    fila: {
      flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: '#d1d5db',
      alignItems: 'center', minHeight: 26, paddingVertical: 2,
    },
    td: { fontSize: 8, paddingHorizontal: 3 },
    tdFirma: { paddingHorizontal: 3, alignItems: 'center', justifyContent: 'center' },
    firmaTabla: { width: 62, height: 26, objectFit: 'contain' },
    sinFirma: { fontSize: 8, color: '#9ca3af', textAlign: 'center' },
    vacio: { fontSize: 9, color: '#6b7280', textAlign: 'center', marginTop: 14 },

    zonaFirmas: { flexDirection: 'row', gap: 30, marginTop: 34 },
  columnaFirma: { flex: 1, alignItems: 'center' },
  bloqueFirma: { marginTop: 26 },
    tituloFirma: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color, marginBottom: 4 },
    firmaInstructor: { width: 110, height: 46, objectFit: 'contain' },
    lineaFirma: { fontSize: 10, color: '#9ca3af', marginTop: 14 },
    nombreInstructor: { fontSize: 9, fontFamily: 'Helvetica-Bold', marginTop: 3 },
    rolInstructor: { fontSize: 7.5, color: '#6b7280' },

    pie: {
      position: 'absolute', bottom: 22, left: 30, right: 30,
      textAlign: 'center', fontSize: 6.5, color: '#6b7280',
    },
  });
}
