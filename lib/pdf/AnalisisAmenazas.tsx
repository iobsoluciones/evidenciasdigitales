/**
 * ANÁLISIS DE AMENAZAS Y VULNERABILIDAD — metodología de colores
 * ---------------------------------------------------------------
 * Estándar 5.1.1 · guía FOPAE (Res. 004/09).
 *
 * Es el anexo técnico del plan de emergencias: el documento narrativo
 * —procedimientos, roles, rutas— lo escribe el consultor; lo que la
 * aplicación puede producir con rigor es esta tabla, que es la que
 * justifica el plan y la que revisa el auditor.
 *
 * Los cuatro rombos del diamante llevan SIEMPRE una letra dentro
 * (A/M/B) además del color. Un análisis de riesgo fotocopiado en blanco
 * y negro sigue siendo un análisis de riesgo; uno donde el color era la
 * única información, no.
 */
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { EncabezadoDoc, type EncabezadoConfig } from './EncabezadoDoc';

export type CampoEncabezado = { etiqueta: string; valor: string };

export type AmenazaPdf = {
  amenaza: string;
  origen: string;
  fuente: string;
  descripcion: string | null;
  calificacion: string;
  v_personas: number;
  v_recursos: number;
  v_sistemas: number;
  nivel_riesgo: string | null;
  color_amenaza: string;
  color_personas: string;
  color_recursos: string;
  color_sistemas: string;
  observaciones: string | null;
  evaluada: boolean;
};

export type DatosAnalisis = {
  empresa: string;
  nit: string | null;
  direccion: string | null;
  logo: Buffer | null;

  titulo: string;
  nomenclatura: string;
  versionDoc: string;
  colorPrimario: string;
  camposExtra: CampoEncabezado[];
  encabezadoConfig: EncabezadoConfig | null;

  amenazas: AmenazaPdf[];
  alto: number;
  medio: number;
  bajo: number;

  generadoEl: string;
};

const ORIGENES: Record<string, string> = {
  natural: 'Natural',
  tecnologico: 'Tecnológico',
  social: 'Social',
};

const CALIFICACIONES: Record<string, string> = {
  posible: 'Posible',
  probable: 'Probable',
  inminente: 'Inminente',
};

const COLORES: Record<string, string> = {
  verde: '#1E6B3A',
  amarillo: '#B45309',
  rojo: '#9B1C1C',
};

const FONDOS: Record<string, string> = {
  verde: '#E6F4EA',
  amarillo: '#FEF3C7',
  rojo: '#FDF2F2',
};

/** La letra que sobrevive a la fotocopia. */
const LETRA: Record<string, string> = { verde: 'B', amarillo: 'M', rojo: 'A' };

export function AnalisisAmenazas({ d }: { d: DatosAnalisis }) {
  const s = estilos(d.colorPrimario);

  return (
    <Document title={`Análisis de amenazas — ${d.empresa}`} author={d.empresa}>
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

        <View style={s.resumen}>
          <Conteo s={s} n={d.alto} t="RIESGO ALTO" color="rojo" />
          <Conteo s={s} n={d.medio} t="RIESGO MEDIO" color="amarillo" />
          <Conteo s={s} n={d.bajo} t="RIESGO BAJO" color="verde" />
          <View style={s.metodo}>
            <Text style={s.metodoTitulo}>CÓMO SE LEE</Text>
            <Text style={s.metodoTexto}>
              Vulnerabilidad por elemento: 0.0–1.0 baja (B) • 1.1–2.0 media (M) •
              2.1–3.0 alta (A). Nivel de riesgo: 3 o 4 rombos en alto = ALTO;
              1 o 2 rombos en alto, o 3 en medio = MEDIO; el resto BAJO.
            </Text>
          </View>
        </View>

        <View style={s.fila} fixed>
          <Text style={[s.th, s.colAmenaza]}>AMENAZA</Text>
          <Text style={[s.th, s.colOrigen]}>ORIGEN</Text>
          <Text style={[s.th, s.colRombo]}>AMEN.</Text>
          <Text style={[s.th, s.colRombo]}>PERS.</Text>
          <Text style={[s.th, s.colRombo]}>RECUR.</Text>
          <Text style={[s.th, s.colRombo]}>SIST.</Text>
          <Text style={[s.th, s.colNivel]}>RIESGO</Text>
          <Text style={[s.th, s.colObs]}>OBSERVACIONES</Text>
        </View>

        {d.amenazas.map((a, i) => (
          <View key={i} style={s.fila} wrap={false}>
            <View style={s.colAmenaza}>
              <Text style={s.td}>{a.amenaza}</Text>
              {a.descripcion && <Text style={s.sub}>{a.descripcion}</Text>}
            </View>
            <View style={s.colOrigen}>
              <Text style={s.td}>{ORIGENES[a.origen] ?? a.origen}</Text>
              <Text style={s.sub}>{a.fuente === 'interna' ? 'Interna' : 'Externa'}</Text>
            </View>

            <Rombo s={s} color={a.color_amenaza}
              valor={CALIFICACIONES[a.calificacion] ?? a.calificacion} />
            <Rombo s={s} color={a.color_personas} valor={a.v_personas.toFixed(1)} />
            <Rombo s={s} color={a.color_recursos} valor={a.v_recursos.toFixed(1)} />
            <Rombo s={s} color={a.color_sistemas} valor={a.v_sistemas.toFixed(1)} />

            <View style={s.colNivel}>
              {a.evaluada && a.nivel_riesgo ? (
                <Text style={[s.nivel, {
                  color: COLORES[nivelColor(a.nivel_riesgo)],
                  backgroundColor: FONDOS[nivelColor(a.nivel_riesgo)],
                }]}>
                  {a.nivel_riesgo.toUpperCase()}
                </Text>
              ) : (
                <Text style={s.sinEvaluar}>Sin calificar</Text>
              )}
            </View>

            <Text style={[s.td, s.colObs]}>{a.observaciones ?? ''}</Text>
          </View>
        ))}

        {d.amenazas.length === 0 && (
          <Text style={s.vacio}>
            No hay amenazas registradas. Sin este análisis, el plan de emergencias
            no tiene sustento técnico.
          </Text>
        )}

        <View style={s.firmas} wrap={false}>
          <View style={s.firma}>
            <View style={s.linea} />
            <Text style={s.firmaEtiqueta}>Elaboró — responsable del SG-SST</Text>
          </View>
          <View style={s.firma}>
            <View style={s.linea} />
            <Text style={s.firmaEtiqueta}>Aprobó — empleador o su delegado</Text>
          </View>
        </View>

        <Text
          style={s.pie}
          fixed
          render={({ pageNumber, totalPages }) =>
            `${d.empresa.toUpperCase()}   •   ${d.nomenclatura}   •   ${d.versionDoc}   •   ` +
            `METODOLOGÍA DE COLORES   •   GENERADO EL ${d.generadoEl}   •   ` +
            `PÁGINA ${pageNumber} DE ${totalPages}`
          }
        />
      </Page>
    </Document>
  );
}

function nivelColor(nivel: string) {
  return nivel === 'alto' ? 'rojo' : nivel === 'medio' ? 'amarillo' : 'verde';
}

function Rombo({
  s, color, valor,
}: {
  s: ReturnType<typeof estilos>; color: string; valor: string;
}) {
  return (
    <View style={s.colRombo}>
      <View style={[s.caja, { backgroundColor: FONDOS[color], borderColor: COLORES[color] }]}>
        <Text style={[s.cajaLetra, { color: COLORES[color] }]}>{LETRA[color]}</Text>
      </View>
      <Text style={s.cajaValor}>{valor}</Text>
    </View>
  );
}

function Conteo({
  s, n, t, color,
}: {
  s: ReturnType<typeof estilos>; n: number; t: string; color: string;
}) {
  return (
    <View style={[s.conteo, { backgroundColor: FONDOS[color], borderColor: COLORES[color] }]}>
      <Text style={[s.conteoN, { color: COLORES[color] }]}>{n}</Text>
      <Text style={[s.conteoT, { color: COLORES[color] }]}>{t}</Text>
    </View>
  );
}

function estilos(color: string) {
  return StyleSheet.create({
    pagina: {
      paddingTop: 26, paddingBottom: 42, paddingHorizontal: 30,
      fontSize: 8, fontFamily: 'Helvetica', color: '#14263F',
    },

    resumen: { flexDirection: 'row', gap: 8, marginBottom: 12 },
    conteo: {
      width: 96, borderWidth: 0.8, borderRadius: 3, padding: '6 9',
    },
    conteoN: { fontSize: 17, fontFamily: 'Helvetica-Bold', lineHeight: 1 },
    conteoT: { fontSize: 6, fontFamily: 'Helvetica-Bold', letterSpacing: .3, marginTop: 2 },
    metodo: {
      flex: 1, borderWidth: 0.7, borderColor: '#E4E4DF',
      borderRadius: 3, padding: '6 10',
    },
    metodoTitulo: { fontSize: 6, color: '#8A929C', letterSpacing: .4 },
    metodoTexto: { fontSize: 7, color: '#374151', lineHeight: 1.5, marginTop: 2 },

    fila: {
      flexDirection: 'row', alignItems: 'flex-start',
      borderBottomWidth: 0.5, borderBottomColor: '#F0F0EC', paddingVertical: 4,
    },
    th: { fontSize: 6, fontFamily: 'Helvetica-Bold', color: '#8A929C', letterSpacing: .3 },
    td: { fontSize: 8, lineHeight: 1.35 },
    sub: { fontSize: 6.5, color: '#8A929C', marginTop: 1, lineHeight: 1.35 },

    colAmenaza: { width: 150, paddingRight: 6 },
    colOrigen: { width: 62, paddingRight: 6 },
    colRombo: { width: 44, alignItems: 'center' },
    colNivel: { width: 56, alignItems: 'center' },
    colObs: { flex: 1, paddingLeft: 6 },

    caja: {
      width: 16, height: 16, borderWidth: 0.8, borderRadius: 2,
      alignItems: 'center', justifyContent: 'center',
    },
    cajaLetra: { fontSize: 8, fontFamily: 'Helvetica-Bold' },
    cajaValor: { fontSize: 6, color: '#8A929C', marginTop: 1 },

    nivel: {
      fontSize: 7, fontFamily: 'Helvetica-Bold',
      padding: '3 6', borderRadius: 8,
    },
    sinEvaluar: { fontSize: 6.5, color: '#9CA3AF', fontStyle: 'italic' },

    vacio: {
      fontSize: 9, color: '#9CA3AF', fontStyle: 'italic',
      marginTop: 16, textAlign: 'center', lineHeight: 1.6,
    },

    firmas: { flexDirection: 'row', gap: 40, marginTop: 26 },
    firma: { flex: 1 },
    linea: { borderTopWidth: 0.8, borderTopColor: '#14263F', marginBottom: 4 },
    firmaEtiqueta: { fontSize: 7, color: '#5B6470' },

    pie: {
      position: 'absolute', bottom: 18, left: 30, right: 30,
      textAlign: 'center', fontSize: 6, color: '#9CA3AF',
    },
  });
}
