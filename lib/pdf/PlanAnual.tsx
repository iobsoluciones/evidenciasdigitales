/**
 * PLAN ANUAL DE TRABAJO DEL SG-SST
 * ---------------------------------------------------------------
 * Estándar 2.4.1 · Dec. 1072 art. 2.2.4.6.8 num. 7.
 *
 * Es el primer documento que pide un auditor, y hasta ahora no se podía
 * imprimir. Va apaisado porque el cronograma —doce meses por actividad—
 * es el documento: una lista de actividades sin los meses es un listado
 * de buenas intenciones.
 *
 * Cada mes se marca con LETRA, no con color: **P** programado, **E**
 * ejecutado. Un cronograma fotocopiado en blanco y negro tiene que
 * seguir diciendo qué se cumplió.
 *
 * Y lo que lo convierte en plan es la firma del EMPLEADOR. Si falta, el
 * documento lo dice arriba en vez de disimularlo.
 */
import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer';
import { EncabezadoDoc, type EncabezadoConfig } from './EncabezadoDoc';

export type CampoEncabezado = { etiqueta: string; valor: string };

export type ActividadPdf = {
  objetivo: string | null;
  actividad: string;
  meta: string | null;
  indicador: string | null;
  responsable: string | null;
  recursos: string | null;
  meses_programados: number[];
  meses_ejecutados: number[];
  estado: string;
};

export type DatosPlan = {
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

  anio: number;
  objetivoGeneral: string | null;
  alcance: string | null;
  recursosFinancieros: string | null;
  recursosHumanos: string | null;
  recursosTecnicos: string | null;

  actividades: ActividadPdf[];
  porcentaje: number;
  cumplidas: number;
  totalActividades: number;

  aprobado: boolean;
  nombreEmpleador: string | null;
  cargoEmpleador: string | null;
  fechaAprobacion: string | null;
  firmaEmpleador: Buffer | null;

  generadoEl: string;
};

const MESES = ['E', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

export function PlanAnual({ d }: { d: DatosPlan }) {
  const s = estilos(d.colorPrimario);

  return (
    <Document title={`Plan anual ${d.anio} ${d.codigo}`} author={d.empresa}>
      <Page size="LETTER" orientation="landscape" style={s.pagina}>

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

        {!d.aprobado && (
          <Text style={s.borrador}>
            SIN APROBAR — falta la firma del empleador. Hasta entonces es un
            borrador del consultor, no el plan de la empresa.
          </Text>
        )}

        <View style={s.datos}>
          <Dato s={s} e="AÑO" v={String(d.anio)} />
          <Dato s={s} e="ACTIVIDADES" v={String(d.totalActividades)} />
          <Dato s={s} e="CUMPLIDAS" v={`${d.cumplidas} · ${d.porcentaje}%`} />
          <Dato s={s} e="CONSECUTIVO" v={d.codigo} />
        </View>

        {d.objetivoGeneral && (
          <>
            <Text style={s.bloqueTitulo}>OBJETIVO GENERAL</Text>
            <Text style={s.parrafo}>{d.objetivoGeneral}</Text>
          </>
        )}
        {d.alcance && (
          <>
            <Text style={s.bloqueTitulo}>ALCANCE</Text>
            <Text style={s.parrafo}>{d.alcance}</Text>
          </>
        )}

        {(d.recursosFinancieros || d.recursosHumanos || d.recursosTecnicos) && (
          <>
            <Text style={s.bloqueTitulo}>RECURSOS ASIGNADOS</Text>
            <View style={s.recursos}>
              <Recurso s={s} t="FINANCIEROS" v={d.recursosFinancieros} />
              <Recurso s={s} t="HUMANOS" v={d.recursosHumanos} />
              <Recurso s={s} t="TÉCNICOS" v={d.recursosTecnicos} />
            </View>
          </>
        )}

        <Text style={s.bloqueTitulo}>CRONOGRAMA</Text>

        <View style={s.fila} fixed>
          <Text style={[s.th, s.colActividad]}>ACTIVIDAD</Text>
          <Text style={[s.th, s.colMeta]}>META E INDICADOR</Text>
          <Text style={[s.th, s.colResp]}>RESPONSABLE</Text>
          {MESES.map((m, i) => (
            <Text key={i} style={[s.th, s.colMes]}>{m}</Text>
          ))}
        </View>

        {d.actividades.map((a, n) => (
          <View key={n} style={s.fila} wrap={false}>
            <View style={s.colActividad}>
              <Text style={s.td}>{a.actividad}</Text>
              {a.objetivo && <Text style={s.sub}>{a.objetivo}</Text>}
            </View>
            <View style={s.colMeta}>
              {a.meta && <Text style={s.td}>{a.meta}</Text>}
              {a.indicador && <Text style={s.sub}>{a.indicador}</Text>}
            </View>
            <Text style={[s.td, s.colResp]}>{a.responsable ?? ''}</Text>

            {MESES.map((_, i) => {
              const mes = i + 1;
              const prog = a.meses_programados?.includes(mes);
              const ejec = a.meses_ejecutados?.includes(mes);
              return (
                <View key={i} style={s.colMes}>
                  {(prog || ejec) && (
                    <View style={[s.celdaMes, {
                      backgroundColor: ejec ? d.colorPrimario : '#EFEFEA',
                      borderColor: ejec ? d.colorPrimario : '#D8D8D2',
                    }]}>
                      <Text style={[s.marca, { color: ejec ? '#ffffff' : '#5B6470' }]}>
                        {ejec ? 'E' : 'P'}
                      </Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        ))}

        {d.actividades.length === 0 && (
          <Text style={s.vacio}>
            El plan no tiene actividades. Sin cronograma no hay plan anual.
          </Text>
        )}

        <Text style={s.leyenda}>
          P = mes programado   •   E = mes ejecutado
        </Text>

        <View style={s.firmas} wrap={false}>
          <View style={s.firma}>
            {d.firmaEmpleador
              ? <Image src={d.firmaEmpleador} style={s.imagenFirma} />
              : <View style={s.sinFirma}>
                  <Text style={s.sinFirmaTexto}>Sin firma</Text>
                </View>}
            <View style={s.linea} />
            <Text style={s.firmaNombre}>{d.nombreEmpleador ?? 'Empleador'}</Text>
            {d.cargoEmpleador && <Text style={s.firmaCargo}>{d.cargoEmpleador}</Text>}
            <Text style={s.firmaEtiqueta}>
              Aprueba por el empleador
              {d.fechaAprobacion ? ` · ${d.fechaAprobacion}` : ''}
            </Text>
          </View>
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

function Dato({
  s, e, v,
}: {
  s: ReturnType<typeof estilos>; e: string; v: string;
}) {
  return (
    <View style={s.dato}>
      <Text style={s.datoEtiqueta}>{e}</Text>
      <Text style={s.datoValor}>{v}</Text>
    </View>
  );
}

function Recurso({
  s, t, v,
}: {
  s: ReturnType<typeof estilos>; t: string; v: string | null;
}) {
  return (
    <View style={s.recurso}>
      <Text style={s.datoEtiqueta}>{t}</Text>
      <Text style={s.recursoTexto}>{v ?? '—'}</Text>
    </View>
  );
}

function estilos(color: string) {
  return StyleSheet.create({
    pagina: {
      paddingTop: 26, paddingBottom: 42, paddingHorizontal: 30,
      fontSize: 8, fontFamily: 'Helvetica', color: '#14263F',
    },

    borrador: {
      backgroundColor: '#FEF3C7', color: '#92400E',
      fontSize: 8, fontFamily: 'Helvetica-Bold',
      padding: '6 10', borderRadius: 3, marginBottom: 10, textAlign: 'center',
    },

    datos: { flexDirection: 'row', gap: 8, marginBottom: 8 },
    dato: {
      flex: 1, borderWidth: 0.7, borderColor: '#E4E4DF',
      borderRadius: 3, padding: '6 9',
    },
    datoEtiqueta: { fontSize: 6, color: '#8A929C', letterSpacing: .4 },
    datoValor: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', marginTop: 2 },

    bloqueTitulo: {
      fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#ffffff',
      backgroundColor: color, padding: '5 8', letterSpacing: .3,
      marginTop: 8, marginBottom: 5,
    },
    parrafo: { fontSize: 8.5, lineHeight: 1.55, color: '#374151', marginBottom: 3 },

    recursos: { flexDirection: 'row', gap: 8, marginBottom: 4 },
    recurso: {
      flex: 1, borderWidth: 0.7, borderColor: '#E4E4DF',
      borderRadius: 3, padding: '6 9',
    },
    recursoTexto: { fontSize: 8, lineHeight: 1.45, color: '#374151', marginTop: 2 },

    fila: {
      flexDirection: 'row', alignItems: 'flex-start',
      borderBottomWidth: 0.5, borderBottomColor: '#F0F0EC', paddingVertical: 3,
    },
    th: { fontSize: 6, fontFamily: 'Helvetica-Bold', color: '#8A929C', letterSpacing: .3 },
    td: { fontSize: 8, lineHeight: 1.35 },
    sub: { fontSize: 6.5, color: '#8A929C', marginTop: 1, lineHeight: 1.3 },

    colActividad: { flex: 1.4, paddingRight: 6 },
    colMeta: { flex: 1.1, paddingRight: 6 },
    colResp: { width: 78, paddingRight: 6 },
    colMes: { width: 18, alignItems: 'center' },

    celdaMes: {
      width: 14, height: 12, borderWidth: 0.6, borderRadius: 2,
      alignItems: 'center', justifyContent: 'center',
    },
    marca: { fontSize: 6.5, fontFamily: 'Helvetica-Bold' },

    leyenda: { fontSize: 6.5, color: '#8A929C', marginTop: 6 },
    vacio: {
      fontSize: 9, color: '#9CA3AF', fontStyle: 'italic',
      marginTop: 14, textAlign: 'center',
    },

    firmas: { flexDirection: 'row', marginTop: 26 },
    firma: { width: 220 },
    imagenFirma: { height: 38, objectFit: 'contain', marginBottom: 2 },
    sinFirma: {
      height: 38, alignItems: 'center', justifyContent: 'center',
      backgroundColor: '#FAFAF8', marginBottom: 2,
    },
    sinFirmaTexto: { fontSize: 7, color: '#9CA3AF', fontStyle: 'italic' },
    linea: { borderTopWidth: 0.8, borderTopColor: '#14263F', marginBottom: 3 },
    firmaNombre: { fontSize: 8.5, fontFamily: 'Helvetica-Bold' },
    firmaCargo: { fontSize: 7, color: '#5B6470' },
    firmaEtiqueta: { fontSize: 6.5, color: '#8A929C', marginTop: 1 },

    pie: {
      position: 'absolute', bottom: 18, left: 30, right: 30,
      textAlign: 'center', fontSize: 6, color: '#9CA3AF',
    },
  });
}
