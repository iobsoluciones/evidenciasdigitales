/**
 * INFORME DE INDICADORES DEL ARTÍCULO 30
 * ---------------------------------------------------------------
 * Dec. 1072 de 2015, arts. 2.2.4.6.20 a 2.2.4.6.22 · Res. 0312 art. 30.
 *
 * Son los seis indicadores mínimos que la norma exige: frecuencia,
 * severidad y mortalidad de accidentalidad, prevalencia e incidencia de
 * enfermedad laboral, y ausentismo por causa médica. La pantalla los
 * calculaba desde hace tiempo, pero no se podían sacar de la aplicación
 * — y un indicador que no se puede entregar no sirve como evidencia.
 *
 * Dos decisiones del documento:
 *
 * 1. CADA INDICADOR LLEVA SU FÓRMULA IMPRESA AL LADO, con el numerador
 *    y el denominador que se usaron. Un auditor no discute el resultado
 *    si puede rehacer la cuenta; sin la fórmula, tiene que creerse el
 *    número, y lo que no se puede verificar no se acepta.
 *
 * 2. LO QUE FALTA SE DICE. Si no hay horas-hombre cargadas de todo el
 *    año, el indicador sale con una advertencia en vez de un número
 *    limpio. Un cero que en realidad significa «no hay datos» es peor
 *    que decir que no hay datos: se lee como si todo fuera bien.
 */
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { EncabezadoDoc, type EncabezadoConfig } from './EncabezadoDoc';

export type CampoEncabezado = { etiqueta: string; valor: string };

export type IndicadorPdf = {
  clave: string;
  nombre: string;
  formula: string;
  valor: number | null;
  unidad: string;
  numerador: number | null;
  denominador: number | null;
  /** Texto cuando el indicador no se puede calcular con lo que hay. */
  falta: string | null;
};

export type DatosIndicadores = {
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

  anio: number;
  indicadores: IndicadorPdf[];

  // La base del cálculo, impresa aparte: son los números de los que
  // salen todos los demás, y el primero que se revisa cuando un
  // indicador parece raro.
  promedioTrabajadores: number;
  mesesConDato: number;
  diasProgramados: number;
  accidentes: number;
  diasIncapacidad: number;
  mortales: number;
  elNuevos: number;
  elTotal: number;
  diasAusenciaMedica: number;

  generadoEl: string;
};

function numero(v: number | null, unidad: string): string {
  if (v === null || v === undefined) return '—';
  const n = Number(v);
  const txt = Number.isInteger(n) ? String(n) : n.toFixed(2);
  return unidad === '%' ? `${txt} %` : `${txt}`;
}

export function InformeIndicadores({ d }: { d: DatosIndicadores }) {
  const s = estilos(d.colorPrimario);

  return (
    <Document title={`Indicadores del artículo 30 — ${d.anio}`} author={d.empresa}>
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

        <Text style={s.norma}>
          Indicadores mínimos del Decreto 1072 de 2015, artículos 2.2.4.6.20 a
          2.2.4.6.22, y Resolución 0312 de 2019 artículo 30. Periodo: año {d.anio}.
        </Text>

        {/* ---------- Base del cálculo ---------- */}
        <View style={s.base}>
          <Text style={s.baseTitulo}>Base del cálculo</Text>
          <View style={s.baseFila}>
            <Base s={s} e="Promedio de trabajadores" v={String(d.promedioTrabajadores)} />
            <Base s={s} e="Meses con horas cargadas" v={`${d.mesesConDato} de 12`} />
            <Base s={s} e="Días programados" v={String(d.diasProgramados)} />
          </View>
          <View style={s.baseFila}>
            <Base s={s} e="Accidentes de trabajo" v={String(d.accidentes)} />
            <Base s={s} e="Días de incapacidad" v={String(d.diasIncapacidad)} />
            <Base s={s} e="Accidentes mortales" v={String(d.mortales)} />
          </View>
          <View style={s.baseFila}>
            <Base s={s} e="Enfermedad laboral (casos nuevos)" v={String(d.elNuevos)} />
            <Base s={s} e="Enfermedad laboral (total)" v={String(d.elTotal)} />
            <Base s={s} e="Días de ausencia médica" v={String(d.diasAusenciaMedica)} />
          </View>

          {d.mesesConDato < 12 && (
            <Text style={s.aviso}>
              Atención: solo hay {d.mesesConDato} de 12 meses de horas-hombre
              cargados. Los indicadores que dependen del promedio de trabajadores
              o de los días programados están calculados sobre ese periodo parcial.
            </Text>
          )}
        </View>

        {/* ---------- Los seis indicadores ---------- */}
        {d.indicadores.map((i) => (
          <View key={i.clave} style={s.indicador} wrap={false}>
            <View style={s.indicadorCabeza}>
              <Text style={s.indicadorNombre}>{i.nombre}</Text>
              <Text style={s.indicadorValor}>{numero(i.valor, i.unidad)}</Text>
            </View>

            <Text style={s.formula}>{i.formula}</Text>

            <Text style={s.cuenta}>
              Numerador: {i.numerador ?? '—'}   •   Denominador: {i.denominador ?? '—'}
              {i.unidad !== '%' ? `   •   Expresado ${i.unidad}` : ''}
            </Text>

            {i.falta && <Text style={s.falta}>{i.falta}</Text>}
          </View>
        ))}

        <Text style={s.pie} fixed>
          {d.empresa} · Indicadores del artículo 30 · {d.anio} · Generado el {d.generadoEl}
        </Text>
        <Text
          style={s.folio}
          render={({ pageNumber, totalPages }) => `${pageNumber} de ${totalPages}`}
          fixed
        />
      </Page>
    </Document>
  );
}

function Base({ s, e, v }: { s: ReturnType<typeof estilos>; e: string; v: string }) {
  return (
    <View style={s.baseDato}>
      <Text style={s.baseEtiqueta}>{e}</Text>
      <Text style={s.baseValor}>{v}</Text>
    </View>
  );
}

function estilos(color: string) {
  return StyleSheet.create({
    pagina: { paddingTop: 28, paddingBottom: 46, paddingHorizontal: 34, fontSize: 9 },

    norma: {
      fontSize: 8.5, color: '#5B6470', marginTop: 12, marginBottom: 12,
      lineHeight: 1.5,
    },

    base: {
      borderWidth: 1, borderStyle: 'solid', borderColor: '#E4E4DF',
      borderRadius: 3, padding: 10, marginBottom: 14,
    },
    baseTitulo: {
      fontSize: 8, fontFamily: 'Helvetica-Bold', color: color,
      letterSpacing: 1, marginBottom: 7,
    },
    baseFila: { flexDirection: 'row', marginBottom: 6 },
    baseDato: { flex: 1, paddingRight: 8 },
    baseEtiqueta: { fontSize: 7, color: '#8A929C', marginBottom: 1 },
    baseValor: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#14263F' },

    aviso: {
      fontSize: 7.5, color: '#9A3412', backgroundColor: '#FFF7ED',
      padding: 6, marginTop: 4, lineHeight: 1.45,
    },

    indicador: {
      borderLeftWidth: 2, borderLeftStyle: 'solid', borderLeftColor: color,
      paddingLeft: 9, paddingVertical: 7, marginBottom: 9,
      backgroundColor: '#FBFBF9',
    },
    indicadorCabeza: {
      flexDirection: 'row', justifyContent: 'space-between',
      alignItems: 'flex-end', marginBottom: 4,
    },
    indicadorNombre: {
      fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#14263F', flex: 1,
    },
    indicadorValor: {
      fontSize: 14, fontFamily: 'Helvetica-Bold', color: color, marginLeft: 10,
    },
    // La fórmula es lo que vuelve verificable el número de al lado.
    formula: { fontSize: 8, color: '#374151', lineHeight: 1.45, marginBottom: 3 },
    cuenta: { fontSize: 7.5, color: '#8A929C' },
    falta: { fontSize: 7.5, color: '#9A3412', marginTop: 3 },

    pie: {
      position: 'absolute', bottom: 22, left: 34, right: 60,
      fontSize: 6.5, color: '#8A929C',
    },
    folio: {
      position: 'absolute', bottom: 22, right: 34,
      fontSize: 6.5, color: '#8A929C', textAlign: 'right',
    },
  });
}
