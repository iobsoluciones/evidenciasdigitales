/**
 * PERMISO DE TRABAJO DE ALTO RIESGO
 * ---------------------------------------------------------------
 * Res. 4272 de 2021 · Res. 491 de 2020 · Dec. 1072 art. 2.2.4.6.24.
 *
 * Este documento se imprime y se cuelga en el sitio de trabajo, así que
 * lo primero que tiene que gritar es la VIGENCIA: fecha, horario y si
 * está autorizado o ya venció. Un permiso vencido pegado en la pared
 * parece uno vigente, y esa confusión es justamente la que mata gente.
 *
 * La lista de verificación distingue lo que exige la norma de lo que es
 * criterio técnico, y lo dice con la palabra «NORMA» al lado, no solo
 * con un color.
 */
import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer';
import { EncabezadoDoc, type EncabezadoConfig } from './EncabezadoDoc';

export type CampoEncabezado = { etiqueta: string; valor: string };

export type RequisitoPdf = {
  texto: string;
  obligatorio: boolean;
  fundamento: string | null;
  resultado: string;
  observacion: string | null;
};

export type PersonaPdf = {
  nombre: string;
  identificacion: string | null;
  cargo: string | null;
  rol: string;
  apto: boolean | null;
  aptitudDetalle: string | null;
  firma: Buffer | null;
  fecha: string | null;
};

export type DatosPermiso = {
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
  fecha: string;
  horario: string;
  lugar: string | null;
  descripcion: string;
  ejecutor: string;
  altura: string | null;
  medicion: string | null;

  estado: string;
  estadoDetalle: string;
  vencido: boolean;

  requisitos: RequisitoPdf[];
  personas: PersonaPdf[];

  aptitudJustificacion: string | null;
  cierre: string | null;
  cancelado: string | null;

  generadoEl: string;
};

const ROLES: Record<string, string> = {
  autoriza: 'Autoriza',
  ejecuta: 'Ejecuta',
  vigia: 'Vigía / ayudante de seguridad',
  coordinador_alturas: 'Coordinador de trabajo en alturas',
};

const RESULTADOS: Record<string, { t: string; color: string }> = {
  cumple: { t: 'Cumple', color: '#1E6B3A' },
  no_cumple: { t: 'No cumple', color: '#9B1C1C' },
  no_aplica: { t: 'No aplica', color: '#5B6470' },
  sin_verificar: { t: 'Sin verificar', color: '#8A929C' },
};

export function PermisoTrabajo({ d }: { d: DatosPermiso }) {
  const s = estilos(d.colorPrimario);

  return (
    <Document title={`Permiso ${d.codigo}`} author={d.empresa}>
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

        {/* La vigencia manda: es lo primero que hay que poder leer. */}
        <View style={[s.estado, {
          backgroundColor: d.vencido ? '#FDF2F2'
            : d.estado === 'AUTORIZADO' ? '#E6F4EA' : '#F7F7F4',
          borderColor: d.vencido ? '#9B1C1C'
            : d.estado === 'AUTORIZADO' ? '#1E6B3A' : '#E4E4DF',
        }]}>
          <Text style={[s.estadoTexto, {
            color: d.vencido ? '#9B1C1C'
              : d.estado === 'AUTORIZADO' ? '#1E6B3A' : '#5B6470',
          }]}>
            {d.vencido ? 'VENCIDO' : d.estado}
          </Text>
          <Text style={s.estadoDetalle}>{d.estadoDetalle}</Text>
        </View>

        <View style={s.datos}>
          <Dato s={s} e="TAREA" v={d.tipo} />
          <Dato s={s} e="FECHA" v={d.fecha} />
          <Dato s={s} e="HORARIO" v={d.horario} />
          <Dato s={s} e="CONSECUTIVO" v={d.codigo} />
        </View>

        <View style={s.datos}>
          <Dato s={s} e="LUGAR" v={d.lugar ?? '—'} />
          <Dato s={s} e="EJECUTA" v={d.ejecutor} />
          {d.altura && <Dato s={s} e="ALTURA" v={d.altura} />}
        </View>

        <Text style={s.bloqueTitulo}>DESCRIPCIÓN DE LA TAREA</Text>
        <Text style={s.parrafo}>{d.descripcion}</Text>

        {d.medicion && (
          <>
            <Text style={s.bloqueTitulo}>MEDICIÓN DE ATMÓSFERA</Text>
            <Text style={s.parrafo}>{d.medicion}</Text>
          </>
        )}

        <Text style={s.bloqueTitulo}>LISTA DE VERIFICACIÓN</Text>
        {d.requisitos.map((r, i) => {
          const res = RESULTADOS[r.resultado] ?? RESULTADOS.sin_verificar;
          return (
            <View key={i} style={s.requisito} wrap={false}>
              <Text style={s.reqN}>{i + 1}</Text>
              <View style={s.reqTexto}>
                <Text style={s.td}>{r.texto}</Text>
                <Text style={s.reqFundamento}>
                  {r.obligatorio ? 'NORMA' : 'CRITERIO TÉCNICO'}
                  {r.fundamento ? ` · ${r.fundamento}` : ''}
                </Text>
                {r.observacion && (
                  <Text style={s.reqObs}>{r.observacion}</Text>
                )}
              </View>
              <Text style={[s.reqResultado, { color: res.color }]}>{res.t}</Text>
            </View>
          );
        })}

        <Text style={s.bloqueTitulo}>PERSONAL AUTORIZADO Y FIRMAS</Text>
        <View style={s.personas}>
          {d.personas.map((p, i) => (
            <View key={i} style={s.persona} wrap={false}>
              {p.firma
                ? <Image src={p.firma} style={s.imagenFirma} />
                : <View style={s.sinFirma}>
                    <Text style={s.sinFirmaTexto}>Sin firma</Text>
                  </View>}
              <View style={s.lineaFirma} />
              <Text style={s.personaNombre}>{p.nombre}</Text>
              {p.identificacion && (
                <Text style={s.personaDato}>C.C. {p.identificacion}</Text>
              )}
              {p.cargo && <Text style={s.personaDato}>{p.cargo}</Text>}
              <Text style={[s.personaRol, { color: d.colorPrimario }]}>
                {ROLES[p.rol] ?? p.rol}
              </Text>
              {p.aptitudDetalle && (
                <Text style={[s.aptitud, {
                  color: p.apto === false ? '#9B1C1C' : '#5B6470',
                }]}>
                  {p.apto === false ? 'SIN APTITUD: ' : 'Aptitud: '}
                  {p.aptitudDetalle}
                </Text>
              )}
              {p.fecha && <Text style={s.personaFecha}>Firmó el {p.fecha}</Text>}
            </View>
          ))}
        </View>

        {d.personas.length === 0 && (
          <Text style={s.vacio}>Sin personal registrado.</Text>
        )}

        {d.aptitudJustificacion && (
          <View wrap={false}>
            <Text style={s.bloqueTitulo}>CONSTANCIA POR FALTA DE APTITUD MÉDICA</Text>
            <Text style={s.parrafo}>{d.aptitudJustificacion}</Text>
          </View>
        )}

        {d.cierre && (
          <View wrap={false}>
            <Text style={s.bloqueTitulo}>CIERRE DEL PERMISO</Text>
            <Text style={s.parrafo}>{d.cierre}</Text>
          </View>
        )}

        {d.cancelado && (
          <View wrap={false}>
            <Text style={s.bloqueTitulo}>MOTIVO DE LA CANCELACIÓN</Text>
            <Text style={s.parrafo}>{d.cancelado}</Text>
          </View>
        )}

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

function estilos(color: string) {
  return StyleSheet.create({
    pagina: {
      paddingTop: 28, paddingBottom: 46, paddingHorizontal: 32,
      fontSize: 9, fontFamily: 'Helvetica', color: '#14263F',
    },

    estado: {
      borderWidth: 1, borderRadius: 4, padding: '8 12',
      marginBottom: 10, flexDirection: 'row',
      alignItems: 'center', gap: 12,
    },
    estadoTexto: { fontSize: 13, fontFamily: 'Helvetica-Bold', letterSpacing: .5 },
    estadoDetalle: { fontSize: 8, color: '#5B6470', flex: 1 },

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

    requisito: {
      flexDirection: 'row', gap: 7, alignItems: 'flex-start',
      borderBottomWidth: 0.5, borderBottomColor: '#F0F0EC', paddingVertical: 4,
    },
    reqN: { width: 13, fontSize: 7.5, color: '#8A929C', paddingTop: 1 },
    reqTexto: { flex: 1, paddingRight: 8 },
    td: { fontSize: 8.5, lineHeight: 1.35 },
    reqFundamento: { fontSize: 6, color: '#8A929C', marginTop: 1.5, letterSpacing: .2 },
    reqObs: { fontSize: 7, color: '#5B6470', fontStyle: 'italic', marginTop: 1.5 },
    reqResultado: { width: 58, fontSize: 7.5, fontFamily: 'Helvetica-Bold', textAlign: 'right' },

    personas: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
    persona: { width: 162 },
    imagenFirma: { height: 36, objectFit: 'contain', marginBottom: 2 },
    sinFirma: {
      height: 36, alignItems: 'center', justifyContent: 'center',
      backgroundColor: '#FAFAF8', marginBottom: 2,
    },
    sinFirmaTexto: { fontSize: 7, color: '#9CA3AF', fontStyle: 'italic' },
    lineaFirma: { borderTopWidth: 0.8, borderTopColor: '#14263F', marginBottom: 3 },
    personaNombre: { fontSize: 8, fontFamily: 'Helvetica-Bold', lineHeight: 1.3 },
    personaDato: { fontSize: 6.5, color: '#5B6470' },
    personaRol: { fontSize: 6.5, fontFamily: 'Helvetica-Bold', marginTop: 1.5 },
    aptitud: { fontSize: 6, marginTop: 1.5, lineHeight: 1.35 },
    personaFecha: { fontSize: 6, color: '#9CA3AF', marginTop: 1 },

    vacio: { fontSize: 8.5, color: '#9CA3AF', fontStyle: 'italic' },

    pie: {
      position: 'absolute', bottom: 20, left: 32, right: 32,
      textAlign: 'center', fontSize: 6, color: '#9CA3AF',
    },
  });
}
