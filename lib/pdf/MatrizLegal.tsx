/**
 * MATRIZ DE REQUISITOS LEGALES
 * ---------------------------------------------------------------
 * Estándar 2.7.1 · Dec. 1072 art. 2.2.4.6.8 num. 3.
 *
 * Apaisado porque la columna que de verdad importa es la de EVIDENCIA:
 * una matriz que dice «cumple» sin decir con qué se demuestra es lo que
 * un auditor desarma en la primera pregunta. Si esa columna no cabe, el
 * documento no sirve.
 *
 * Las normas que no aplican se conservan con esa marca, no se borran:
 * poder mostrar que se analizaron y se descartaron es parte de haber
 * hecho la identificación.
 */
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { EncabezadoDoc, type EncabezadoConfig } from './EncabezadoDoc';

export type CampoEncabezado = { etiqueta: string; valor: string };

export type ItemPdf = {
  tipo: string;
  numero: string;
  anio: number;
  titulo: string;
  emisor: string | null;
  tema: string | null;
  articulos: string | null;
  aplica: boolean;
  cumplimiento: string;
  evidencia: string | null;
  responsable: string | null;
  fecha_verificacion: string | null;
};

export type DatosMatriz = {
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

  items: ItemPdf[];
  aplican: number;
  cumple: number;
  parcial: number;
  noCumple: number;
  sinEvaluar: number;

  generadoEl: string;
};

const TIPOS: Record<string, string> = {
  ley: 'Ley', decreto: 'Decreto', resolucion: 'Resolución',
  circular: 'Circular', ntc: 'NTC', acuerdo: 'Acuerdo', otro: 'Otro',
};

const CUMPLE: Record<string, { t: string; color: string; fondo: string }> = {
  cumple: { t: 'Cumple', color: '#1E6B3A', fondo: '#E6F4EA' },
  cumple_parcial: { t: 'Parcial', color: '#92400E', fondo: '#FEF3C7' },
  no_cumple: { t: 'No cumple', color: '#9B1C1C', fondo: '#FDF2F2' },
  no_evaluado: { t: 'Sin evaluar', color: '#5B6470', fondo: '#F0F0EC' },
};

export function MatrizLegal({ d }: { d: DatosMatriz }) {
  const s = estilos(d.colorPrimario);

  return (
    <Document title={`Matriz legal — ${d.empresa}`} author={d.empresa}>
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
          <Conteo s={s} n={d.aplican} t="APLICAN" tipo="no_evaluado" />
          <Conteo s={s} n={d.cumple} t="CUMPLEN" tipo="cumple" />
          <Conteo s={s} n={d.parcial} t="PARCIAL" tipo="cumple_parcial" />
          <Conteo s={s} n={d.noCumple} t="NO CUMPLEN" tipo="no_cumple" />
          <Conteo s={s} n={d.sinEvaluar} t="SIN EVALUAR" tipo="no_evaluado" />
        </View>

        <View style={s.fila} fixed>
          <Text style={[s.th, s.colNorma]}>NORMA</Text>
          <Text style={[s.th, s.colTitulo]}>DE QUÉ TRATA</Text>
          <Text style={[s.th, s.colEstado]}>ESTADO</Text>
          <Text style={[s.th, s.colEvidencia]}>EVIDENCIA</Text>
          <Text style={[s.th, s.colResp]}>RESPONSABLE</Text>
        </View>

        {d.items.map((i, n) => {
          const c = CUMPLE[i.cumplimiento] ?? CUMPLE.no_evaluado;
          return (
            <View key={n} style={s.fila} wrap={false}>
              <View style={s.colNorma}>
                <Text style={s.norma}>
                  {TIPOS[i.tipo] ?? i.tipo} {i.numero} de {i.anio}
                </Text>
                {i.emisor && <Text style={s.sub}>{i.emisor}</Text>}
                {i.articulos && <Text style={s.sub}>{i.articulos}</Text>}
              </View>

              <View style={s.colTitulo}>
                <Text style={s.td}>{i.titulo}</Text>
                {i.tema && <Text style={s.sub}>{i.tema}</Text>}
              </View>

              <View style={s.colEstado}>
                {i.aplica ? (
                  <Text style={[s.estado, { color: c.color, backgroundColor: c.fondo }]}>
                    {c.t}
                  </Text>
                ) : (
                  <Text style={[s.estado, { color: '#5B6470', backgroundColor: '#F0F0EC' }]}>
                    No aplica
                  </Text>
                )}
                {i.fecha_verificacion && (
                  <Text style={s.sub}>{i.fecha_verificacion}</Text>
                )}
              </View>

              <Text style={[s.td, s.colEvidencia]}>{i.evidencia ?? ''}</Text>
              <Text style={[s.td, s.colResp]}>{i.responsable ?? ''}</Text>
            </View>
          );
        })}

        {d.items.length === 0 && (
          <Text style={s.vacio}>
            La matriz está vacía. Sin identificar la normativa aplicable no se
            puede demostrar el cumplimiento del estándar 2.7.1.
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
            `ESTÁNDAR 2.7.1   •   GENERADO EL ${d.generadoEl}   •   ` +
            `PÁGINA ${pageNumber} DE ${totalPages}`
          }
        />
      </Page>
    </Document>
  );
}

function Conteo({
  s, n, t, tipo,
}: {
  s: ReturnType<typeof estilos>; n: number; t: string; tipo: string;
}) {
  const c = CUMPLE[tipo] ?? CUMPLE.no_evaluado;
  return (
    <View style={[s.conteo, { backgroundColor: c.fondo, borderColor: c.color }]}>
      <Text style={[s.conteoN, { color: c.color }]}>{n}</Text>
      <Text style={[s.conteoT, { color: c.color }]}>{t}</Text>
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
      flex: 1, borderWidth: 0.8, borderRadius: 3, padding: '6 9',
    },
    conteoN: { fontSize: 15, fontFamily: 'Helvetica-Bold', lineHeight: 1 },
    conteoT: { fontSize: 6, fontFamily: 'Helvetica-Bold', letterSpacing: .3, marginTop: 2 },

    fila: {
      flexDirection: 'row', alignItems: 'flex-start',
      borderBottomWidth: 0.5, borderBottomColor: '#F0F0EC', paddingVertical: 4,
    },
    th: { fontSize: 6, fontFamily: 'Helvetica-Bold', color: '#8A929C', letterSpacing: .3 },
    td: { fontSize: 7.5, lineHeight: 1.35 },
    norma: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', lineHeight: 1.3 },
    sub: { fontSize: 6, color: '#8A929C', marginTop: 1, lineHeight: 1.3 },

    colNorma: { width: 105, paddingRight: 6 },
    colTitulo: { flex: 1.3, paddingRight: 6 },
    colEstado: { width: 56, alignItems: 'flex-start', paddingRight: 6 },
    colEvidencia: { flex: 1.5, paddingRight: 6 },
    colResp: { width: 82 },

    estado: {
      fontSize: 6.5, fontFamily: 'Helvetica-Bold',
      padding: '2 5', borderRadius: 7,
    },

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
