/**
 * INFORME DE AUTOEVALUACIÓN DE ESTÁNDARES MÍNIMOS
 * ---------------------------------------------------------------
 * Resolución 0312 de 2019, arts. 27 y 28.
 *
 * Es el documento que el empleador presenta y que el auditor pide
 * primero. Por eso lleva el puntaje arriba —es el número que decide el
 * criterio de valoración— y debajo la tabla completa, estándar por
 * estándar, con la justificación de cada «no aplica»: sin ella la norma
 * puntúa ese estándar en cero y el porcentaje de la carátula quedaría
 * sin respaldo.
 */
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { EncabezadoDoc, type EncabezadoConfig } from './EncabezadoDoc';

export type CampoEncabezado = { etiqueta: string; valor: string };

export type ItemPdf = {
  codigo: string;
  ciclo: string;
  capitulo: string;
  nombre: string;
  peso: number;
  resultado: string;
  justificacion: string | null;
};

export type CicloPdf = {
  ciclo: string; obtenido: number; posible: number; porcentaje: number;
};

export type DatosAutoevaluacion = {
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
  alcance: number;
  estado: string;
  fechaCierre: string;
  observaciones: string | null;

  porcentaje: number;
  obtenido: number;
  posible: number;
  criterio: string;
  queSignifica: string;
  cumple: number;
  noCumple: number;
  noAplica: number;

  porCiclo: CicloPdf[];
  items: ItemPdf[];

  generadoEl: string;
};

const CICLOS: Record<string, string> = {
  planear: 'I. PLANEAR', hacer: 'II. HACER',
  verificar: 'III. VERIFICAR', actuar: 'IV. ACTUAR',
};

const RESULTADOS: Record<string, { t: string; color: string }> = {
  cumple: { t: 'Cumple', color: '#1E6B3A' },
  no_cumple: { t: 'No cumple', color: '#9B1C1C' },
  no_aplica: { t: 'No aplica', color: '#5B6470' },
  sin_evaluar: { t: 'Sin evaluar', color: '#8A929C' },
};

export function InformeAutoevaluacion({ d }: { d: DatosAutoevaluacion }) {
  const s = estilos(d.colorPrimario);
  const orden = Object.keys(CICLOS);

  return (
    <Document title={`Autoevaluación ${d.anio} ${d.codigo}`} author={d.empresa}>
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

        {/* El puntaje manda: es lo que decide el criterio de valoración. */}
        <View style={s.puntaje}>
          <View style={s.cifraCaja}>
            <Text style={s.cifra}>{d.porcentaje}%</Text>
            <Text style={s.criterio}>{d.criterio}</Text>
          </View>
          <View style={s.puntajeDetalle}>
            <Text style={s.queSignifica}>{d.queSignifica}</Text>
            <Text style={s.conteos}>
              {d.obtenido} de {d.posible} puntos   •   {d.cumple} cumplen   •   {' '}
              {d.noCumple} no cumplen   •   {d.noAplica} no aplican
            </Text>
          </View>
        </View>

        <View style={s.datos}>
          <Dato s={s} e="AÑO" v={String(d.anio)} />
          <Dato s={s} e="ALCANCE" v={`${d.alcance} estándares`} />
          <Dato s={s} e="ESTADO" v={d.estado} />
          <Dato s={s} e="CIERRE" v={d.fechaCierre} />
        </View>

        {d.porCiclo.length > 0 && (
          <View style={s.ciclos}>
            {orden
              .filter((c) => d.porCiclo.some((x) => x.ciclo === c))
              .map((c) => {
                const x = d.porCiclo.find((y) => y.ciclo === c)!;
                return (
                  <View key={c} style={s.cicloCaja}>
                    <Text style={s.cicloNombre}>{CICLOS[c]}</Text>
                    <Text style={s.cicloPct}>{x.porcentaje}%</Text>
                    <Text style={s.cicloPeso}>{x.obtenido} / {x.posible} pts</Text>
                  </View>
                );
              })}
          </View>
        )}

        {/* Tabla completa: el auditor la recorre estándar por estándar. */}
        {orden.map((ciclo) => {
          const del = d.items.filter((i) => i.ciclo === ciclo);
          if (del.length === 0) return null;
          return (
            <View key={ciclo} style={s.bloque}>
              <Text style={s.bloqueTitulo}>{CICLOS[ciclo]}</Text>

              <View style={s.fila} fixed>
                <Text style={[s.th, s.colCodigo]}>CÓDIGO</Text>
                <Text style={[s.th, s.colNombre]}>ESTÁNDAR</Text>
                <Text style={[s.th, s.colPeso]}>PESO</Text>
                <Text style={[s.th, s.colResultado]}>RESULTADO</Text>
              </View>

              {del.map((i, n) => {
                const r = RESULTADOS[i.resultado] ?? RESULTADOS.sin_evaluar;
                return (
                  <View key={n} wrap={false}>
                    <View style={s.fila}>
                      <Text style={[s.td, s.colCodigo]}>{i.codigo}</Text>
                      <Text style={[s.td, s.colNombre]}>{i.nombre}</Text>
                      <Text style={[s.td, s.colPeso]}>{i.peso}</Text>
                      <Text style={[s.td, s.colResultado, { color: r.color }]}>{r.t}</Text>
                    </View>
                    {i.justificacion && (
                      <Text style={s.justificacion}>
                        Justificación: {i.justificacion}
                      </Text>
                    )}
                  </View>
                );
              })}
            </View>
          );
        })}

        {d.observaciones && (
          <View style={s.bloque}>
            <Text style={s.bloqueTitulo}>OBSERVACIONES</Text>
            <Text style={s.parrafo}>{d.observaciones}</Text>
          </View>
        )}

        <View style={s.firmas} wrap={false}>
          <View style={s.firma}>
            <View style={s.linea} />
            <Text style={s.firmaEtiqueta}>Empleador o su delegado</Text>
          </View>
          <View style={s.firma}>
            <View style={s.linea} />
            <Text style={s.firmaEtiqueta}>Responsable del SG-SST</Text>
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

function estilos(color: string) {
  return StyleSheet.create({
    pagina: {
      paddingTop: 28, paddingBottom: 46, paddingHorizontal: 32,
      fontSize: 9, fontFamily: 'Helvetica', color: '#14263F',
    },

    puntaje: {
      flexDirection: 'row', gap: 16, alignItems: 'center',
      borderWidth: 0.7, borderColor: '#E4E4DF', borderRadius: 4,
      padding: 12, marginBottom: 10,
    },
    cifraCaja: { width: 150 },
    cifra: { fontSize: 30, fontFamily: 'Helvetica-Bold', color, lineHeight: 1 },
    criterio: { fontSize: 8, fontFamily: 'Helvetica-Bold', color, marginTop: 3, lineHeight: 1.3 },
    puntajeDetalle: { flex: 1 },
    queSignifica: { fontSize: 8.5, lineHeight: 1.5, color: '#374151' },
    conteos: { fontSize: 8, color: '#5B6470', marginTop: 5 },

    datos: { flexDirection: 'row', gap: 8, marginBottom: 12 },
    dato: {
      flex: 1, borderWidth: 0.7, borderColor: '#E4E4DF',
      borderRadius: 3, padding: '6 9',
    },
    datoEtiqueta: { fontSize: 6, color: '#8A929C', letterSpacing: .4 },
    datoValor: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', marginTop: 2 },

    ciclos: { flexDirection: 'row', gap: 8, marginBottom: 14 },
    cicloCaja: {
      flex: 1, borderWidth: 0.7, borderColor: '#E4E4DF',
      borderRadius: 3, padding: '7 9',
    },
    cicloNombre: { fontSize: 6.5, color: '#8A929C', letterSpacing: .3 },
    cicloPct: { fontSize: 14, fontFamily: 'Helvetica-Bold', color, marginTop: 2 },
    cicloPeso: { fontSize: 6.5, color: '#8A929C' },

    bloque: { marginBottom: 12 },
    bloqueTitulo: {
      fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#ffffff',
      backgroundColor: color, padding: '5 8', letterSpacing: .3, marginBottom: 5,
    },
    fila: {
      flexDirection: 'row', borderBottomWidth: 0.5,
      borderBottomColor: '#F0F0EC', paddingVertical: 4,
    },
    th: { fontSize: 6, fontFamily: 'Helvetica-Bold', color: '#8A929C', letterSpacing: .3 },
    td: { fontSize: 8, lineHeight: 1.35 },
    colCodigo: { width: 46 },
    colNombre: { flex: 1, paddingRight: 8 },
    colPeso: { width: 34, textAlign: 'right', paddingRight: 8 },
    colResultado: { width: 62, fontFamily: 'Helvetica-Bold' },
    justificacion: {
      fontSize: 7, color: '#5B6470', fontStyle: 'italic',
      paddingLeft: 46, paddingBottom: 4, lineHeight: 1.4,
    },
    parrafo: { fontSize: 8.5, lineHeight: 1.55, color: '#374151' },

    firmas: { flexDirection: 'row', gap: 30, marginTop: 24 },
    firma: { flex: 1 },
    linea: { borderTopWidth: 0.8, borderTopColor: '#14263F', marginBottom: 4 },
    firmaEtiqueta: { fontSize: 7, color: '#5B6470' },

    pie: {
      position: 'absolute', bottom: 20, left: 32, right: 32,
      textAlign: 'center', fontSize: 6, color: '#9CA3AF',
    },
  });
}
