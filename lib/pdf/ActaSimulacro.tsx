/**
 * ACTA DE SIMULACRO
 * ---------------------------------------------------------------
 * Estándar 5.1.1 · Dec. 1072 de 2015, art. 2.2.4.6.25.
 *
 * Es LA evidencia del estándar: tener el plan de emergencias escrito no
 * prueba que se haya probado. Por eso el acta lleva lo medible arriba
 * —participantes, evacuados, tiempo— y las oportunidades de mejora
 * abajo, que es de donde salen las acciones del plan.
 *
 * Las firmas van con imagen si se capturaron. No se dibuja una línea
 * vacía para quien no firmó: un recuadro en blanco en un acta cerrada
 * invita a rellenarlo a mano después.
 */
import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer';
import { EncabezadoDoc, type EncabezadoConfig } from './EncabezadoDoc';

export type CampoEncabezado = { etiqueta: string; valor: string };

export type FirmaPdf = {
  nombre: string;
  cargo: string | null;
  rol: string;
  firma: Buffer | null;
  fecha: string | null;
};

export type DatosActa = {
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

  fecha: string;
  hora: string;
  tipo: string;
  amenaza: string | null;
  alcance: string | null;
  puntoEncuentro: string | null;

  participantes: number;
  evacuados: number;
  tiempo: string;
  cobertura: string;

  aciertos: string | null;
  oportunidades: string | null;
  observaciones: string | null;

  firmas: FirmaPdf[];
  cerrado: boolean;

  generadoEl: string;
};

const ROLES: Record<string, string> = {
  coordinador: 'Coordinador del simulacro',
  evaluador: 'Evaluador',
  brigadista: 'Brigadista',
  observador_arl: 'Observador de la ARL',
};

export function ActaSimulacro({ d }: { d: DatosActa }) {
  const s = estilos(d.colorPrimario);

  return (
    <Document title={`Acta de simulacro ${d.codigo}`} author={d.empresa}>
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

        {!d.cerrado && (
          <Text style={s.borrador}>
            BORRADOR — el acta no se ha cerrado y faltan firmas por capturar
          </Text>
        )}

        <View style={s.datos}>
          <Dato s={s} e="FECHA" v={d.fecha} />
          <Dato s={s} e="HORA DE INICIO" v={d.hora} />
          <Dato s={s} e="TIPO" v={d.tipo} />
          <Dato s={s} e="CONSECUTIVO" v={d.codigo} />
        </View>

        <View style={s.datos}>
          <Dato s={s} e="ALCANCE" v={d.alcance ?? '—'} />
          <Dato s={s} e="AMENAZA SIMULADA" v={d.amenaza ?? '—'} />
          <Dato s={s} e="PUNTO DE ENCUENTRO" v={d.puntoEncuentro ?? '—'} />
        </View>

        {/* Lo medible: es lo que se compara con el simulacro anterior. */}
        <View style={s.metricas}>
          <Metrica s={s} n={String(d.participantes)} t="PARTICIPANTES" />
          <Metrica s={s} n={String(d.evacuados)} t="EVACUADOS" />
          <Metrica s={s} n={d.cobertura} t="COBERTURA" />
          <Metrica s={s} n={d.tiempo} t="TIEMPO DE EVACUACIÓN" />
        </View>

        {d.aciertos && <Bloque s={s} t="ACIERTOS" v={d.aciertos} />}
        {d.oportunidades && (
          <Bloque s={s} t="OPORTUNIDADES DE MEJORA" v={d.oportunidades} />
        )}
        {d.observaciones && <Bloque s={s} t="OBSERVACIONES" v={d.observaciones} />}

        <Text style={s.bloqueTitulo}>EQUIPO EVALUADOR</Text>
        <View style={s.firmas}>
          {d.firmas.map((f, i) => (
            <View key={i} style={s.firma} wrap={false}>
              {f.firma
                ? <Image src={f.firma} style={s.imagenFirma} />
                : <View style={s.sinFirma}>
                    <Text style={s.sinFirmaTexto}>Sin firma</Text>
                  </View>}
              <View style={s.lineaFirma} />
              <Text style={s.firmaNombre}>{f.nombre}</Text>
              {f.cargo && <Text style={s.firmaCargo}>{f.cargo}</Text>}
              <Text style={s.firmaRol}>{ROLES[f.rol] ?? f.rol}</Text>
              {f.fecha && <Text style={s.firmaFecha}>Firmó el {f.fecha}</Text>}
            </View>
          ))}
        </View>

        {d.firmas.length === 0 && (
          <Text style={s.vacio}>Sin evaluadores registrados.</Text>
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

function Metrica({
  s, n, t,
}: {
  s: ReturnType<typeof estilos>; n: string; t: string;
}) {
  return (
    <View style={s.metrica}>
      <Text style={s.metricaN}>{n}</Text>
      <Text style={s.metricaT}>{t}</Text>
    </View>
  );
}

function Bloque({
  s, t, v,
}: {
  s: ReturnType<typeof estilos>; t: string; v: string;
}) {
  return (
    <View wrap={false}>
      <Text style={s.bloqueTitulo}>{t}</Text>
      <Text style={s.parrafo}>{v}</Text>
    </View>
  );
}

function estilos(color: string) {
  return StyleSheet.create({
    pagina: {
      paddingTop: 28, paddingBottom: 46, paddingHorizontal: 32,
      fontSize: 9, fontFamily: 'Helvetica', color: '#14263F',
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

    metricas: { flexDirection: 'row', gap: 8, marginTop: 6, marginBottom: 14 },
    metrica: {
      flex: 1, borderWidth: 0.8, borderColor: color, borderRadius: 3,
      padding: '8 10', alignItems: 'center',
    },
    metricaN: { fontSize: 16, fontFamily: 'Helvetica-Bold', color, lineHeight: 1 },
    metricaT: { fontSize: 6, color: '#5B6470', letterSpacing: .3, marginTop: 3 },

    bloqueTitulo: {
      fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#ffffff',
      backgroundColor: color, padding: '5 8', letterSpacing: .3,
      marginTop: 8, marginBottom: 5,
    },
    parrafo: { fontSize: 8.5, lineHeight: 1.6, color: '#374151', marginBottom: 4 },

    firmas: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 6 },
    firma: { width: 158 },
    imagenFirma: { height: 40, objectFit: 'contain', marginBottom: 2 },
    sinFirma: {
      height: 40, alignItems: 'center', justifyContent: 'center',
      backgroundColor: '#FAFAF8', marginBottom: 2,
    },
    sinFirmaTexto: { fontSize: 7, color: '#9CA3AF', fontStyle: 'italic' },
    lineaFirma: { borderTopWidth: 0.8, borderTopColor: '#14263F', marginBottom: 3 },
    firmaNombre: { fontSize: 8, fontFamily: 'Helvetica-Bold', lineHeight: 1.3 },
    firmaCargo: { fontSize: 7, color: '#5B6470' },
    firmaRol: { fontSize: 6.5, color: '#8A929C', marginTop: 1 },
    firmaFecha: { fontSize: 6, color: '#9CA3AF', marginTop: 1 },

    vacio: { fontSize: 8.5, color: '#9CA3AF', fontStyle: 'italic', marginTop: 6 },

    pie: {
      position: 'absolute', bottom: 20, left: 32, right: 32,
      textAlign: 'center', fontSize: 6, color: '#9CA3AF',
    },
  });
}
