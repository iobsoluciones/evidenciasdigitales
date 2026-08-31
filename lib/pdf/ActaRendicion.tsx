/**
 * ACTA DE RENDICIÓN DE CUENTAS DEL SG-SST
 * ---------------------------------------------------------------
 * Estándar 2.8.1 · Dec. 1072 art. 2.2.4.6.8 num. 3.
 *
 * El documento se organiza por PERSONA, no por tema: la norma pide que
 * cada quien rinda cuentas de lo suyo, y un acta redactada en bloque no
 * demuestra eso. Debajo de cada nombre van sus responsabilidades, lo que
 * escribió él mismo y su firma.
 */
import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer';
import { EncabezadoDoc, type EncabezadoConfig } from './EncabezadoDoc';

export type CampoEncabezado = { etiqueta: string; valor: string };

export type ResponsablePdf = {
  nombre: string;
  cargo: string | null;
  responsabilidades: string | null;
  informe: string | null;
  firma: Buffer | null;
  fecha: string | null;
};

export type DatosRendicion = {
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
  fecha: string;
  alcance: string | null;
  logros: string | null;
  dificultades: string | null;
  compromisos: string | null;

  responsables: ResponsablePdf[];
  cerrada: boolean;

  generadoEl: string;
};

export function ActaRendicion({ d }: { d: DatosRendicion }) {
  const s = estilos(d.colorPrimario);

  return (
    <Document title={`Rendición de cuentas ${d.anio} ${d.codigo}`} author={d.empresa}>
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

        {!d.cerrada && (
          <Text style={s.borrador}>
            BORRADOR — faltan informes o firmas por registrar
          </Text>
        )}

        <View style={s.datos}>
          <Dato s={s} e="PERIODO" v={String(d.anio)} />
          <Dato s={s} e="FECHA" v={d.fecha} />
          <Dato s={s} e="CONSECUTIVO" v={d.codigo} />
        </View>

        {d.alcance && (
          <>
            <Text style={s.bloqueTitulo}>ALCANCE</Text>
            <Text style={s.parrafo}>{d.alcance}</Text>
          </>
        )}
        {d.logros && (
          <>
            <Text style={s.bloqueTitulo}>LOGROS DEL PERIODO</Text>
            <Text style={s.parrafo}>{d.logros}</Text>
          </>
        )}
        {d.dificultades && (
          <>
            <Text style={s.bloqueTitulo}>DIFICULTADES</Text>
            <Text style={s.parrafo}>{d.dificultades}</Text>
          </>
        )}
        {d.compromisos && (
          <>
            <Text style={s.bloqueTitulo}>COMPROMISOS PARA EL PERIODO SIGUIENTE</Text>
            <Text style={s.parrafo}>{d.compromisos}</Text>
          </>
        )}

        <Text style={s.bloqueTitulo}>RENDICIÓN INDIVIDUAL</Text>
        {d.responsables.map((r, i) => (
          <View key={i} style={s.persona} wrap={false}>
            <View style={s.personaCab}>
              <Text style={s.personaNombre}>{r.nombre}</Text>
              {r.cargo && <Text style={s.personaCargo}>{r.cargo}</Text>}
            </View>

            {r.responsabilidades && (
              <>
                <Text style={s.etiqueta}>RESPONSABILIDADES ASIGNADAS</Text>
                <Text style={s.texto}>{r.responsabilidades}</Text>
              </>
            )}

            <Text style={s.etiqueta}>INFORME DE SU DESEMPEÑO</Text>
            <Text style={s.texto}>
              {r.informe ?? 'Sin rendir cuentas todavía.'}
            </Text>

            <View style={s.zonaFirma}>
              {r.firma
                ? <Image src={r.firma} style={s.imagenFirma} />
                : <View style={s.sinFirma}>
                    <Text style={s.sinFirmaTexto}>Sin firma</Text>
                  </View>}
              <View style={s.lineaFirma} />
              <Text style={s.firmaPie}>
                {r.nombre}{r.fecha ? ` · firmó el ${r.fecha}` : ''}
              </Text>
            </View>
          </View>
        ))}

        {d.responsables.length === 0 && (
          <Text style={s.vacio}>Sin responsables registrados.</Text>
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
    parrafo: { fontSize: 8.5, lineHeight: 1.6, color: '#374151', marginBottom: 4 },

    persona: {
      borderWidth: 0.7, borderColor: '#E4E4DF', borderRadius: 4,
      padding: 10, marginBottom: 8,
    },
    personaCab: {
      flexDirection: 'row', alignItems: 'baseline', gap: 8,
      borderBottomWidth: 0.5, borderBottomColor: '#F0F0EC',
      paddingBottom: 5, marginBottom: 6,
    },
    personaNombre: { fontSize: 9.5, fontFamily: 'Helvetica-Bold' },
    personaCargo: { fontSize: 7.5, color: '#5B6470' },
    etiqueta: {
      fontSize: 6, fontFamily: 'Helvetica-Bold', color: '#8A929C',
      letterSpacing: .4, marginTop: 5,
    },
    texto: { fontSize: 8.5, lineHeight: 1.55, color: '#374151', marginTop: 2 },

    zonaFirma: { marginTop: 10, width: 190 },
    imagenFirma: { height: 34, objectFit: 'contain', marginBottom: 2 },
    sinFirma: {
      height: 34, alignItems: 'center', justifyContent: 'center',
      backgroundColor: '#FAFAF8', marginBottom: 2,
    },
    sinFirmaTexto: { fontSize: 7, color: '#9CA3AF', fontStyle: 'italic' },
    lineaFirma: { borderTopWidth: 0.8, borderTopColor: '#14263F', marginBottom: 3 },
    firmaPie: { fontSize: 6.5, color: '#5B6470' },

    vacio: { fontSize: 8.5, color: '#9CA3AF', fontStyle: 'italic' },

    pie: {
      position: 'absolute', bottom: 20, left: 32, right: 32,
      textAlign: 'center', fontSize: 6, color: '#9CA3AF',
    },
  });
}
