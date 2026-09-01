/**
 * ACTA DE CONFORMACIÓN DEL COMITÉ
 * ---------------------------------------------------------------
 * Estándares 1.1.6 y 1.1.8 · Res. 2013 de 1986 · Res. 652 de 2012 ·
 * Dec. 1072 art. 2.2.4.6.25 (brigada).
 *
 * El organigrama es material de cartelera: demuestra quién está. Esto es
 * el ACTA: demuestra que el comité se conformó, cómo se eligieron sus
 * integrantes y que ellos lo aceptaron con su firma.
 *
 * El acta **imprime la validación de la norma aunque salga en contra**.
 * Un acta que oculta que faltan dos suplentes le sirve a nadie: el
 * auditor lo va a ver igual, y entonces el documento pierde
 * credibilidad completa en vez de solo señalar lo que falta.
 */
import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer';
import { EncabezadoDoc, type EncabezadoConfig } from './EncabezadoDoc';

export type CampoEncabezado = { etiqueta: string; valor: string };

export type IntegrantePdf = {
  nombre: string;
  identificacion: string | null;
  cargo: string | null;
  parte: string;
  suplente: boolean;
  rol: string;
  frente: string | null;
  firma: Buffer | null;
  fecha: string | null;
};

export type DatosActaComite = {
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

  tipoComite: string;
  norma: string;
  fechaConformacion: string;
  periodo: string;
  lugar: string | null;
  formaEleccion: string | null;
  observaciones: string | null;

  trabajadores: number;
  exigido: string;
  conforme: boolean;
  fallas: string[];

  integrantes: IntegrantePdf[];
  cerrada: boolean;

  generadoEl: string;
};

const ROLES: Record<string, string> = {
  presidente: 'Presidente',
  secretario: 'Secretario',
  integrante: 'Integrante',
  jefe: 'Jefe de brigada',
  brigadista: 'Brigadista',
};

const FRENTES: Record<string, string> = {
  primeros_auxilios: 'Primeros auxilios',
  incendios: 'Control de incendios',
  evacuacion: 'Evacuación y rescate',
};

export function ActaComite({ d }: { d: DatosActaComite }) {
  const s = estilos(d.colorPrimario);

  return (
    <Document title={`Acta ${d.tipoComite} ${d.codigo}`} author={d.empresa}>
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
            BORRADOR — faltan firmas de los integrantes
          </Text>
        )}

        <View style={s.datos}>
          <Dato s={s} e="COMITÉ" v={d.tipoComite} />
          <Dato s={s} e="CONFORMADO EL" v={d.fechaConformacion} />
          <Dato s={s} e="PERIODO" v={d.periodo} />
          <Dato s={s} e="CONSECUTIVO" v={d.codigo} />
        </View>

        <Text style={s.parrafo}>
          En {d.lugar ?? 'las instalaciones de la empresa'}, el {d.fechaConformacion},
          se reunieron los abajo firmantes para dejar constancia de la conformación
          del {d.tipoComite} de {d.empresa}, conforme a {d.norma}.
        </Text>

        {d.formaEleccion && (
          <>
            <Text style={s.bloqueTitulo}>FORMA DE ELECCIÓN</Text>
            <Text style={s.parrafo}>{d.formaEleccion}</Text>
          </>
        )}

        {/* La composición exigida se imprime aunque salga en contra. */}
        <Text style={s.bloqueTitulo}>COMPOSICIÓN EXIGIDA POR LA NORMA</Text>
        <Text style={s.parrafo}>
          Con {d.trabajadores} trabajadores activos: {d.exigido}
        </Text>

        <View style={[s.veredicto, {
          backgroundColor: d.conforme ? '#E6F4EA' : '#FFF7ED',
          borderColor: d.conforme ? '#1E6B3A' : '#B45309',
        }]}>
          <Text style={[s.veredictoTexto, { color: d.conforme ? '#1E6B3A' : '#92400E' }]}>
            {d.conforme
              ? 'El comité cumple la composición exigida.'
              : 'El comité NO cumple la composición exigida:'}
          </Text>
          {!d.conforme && d.fallas.map((f, i) => (
            <Text key={i} style={s.falla}>• {f}</Text>
          ))}
        </View>

        <Text style={s.bloqueTitulo}>INTEGRANTES Y FIRMAS</Text>
        <View style={s.firmas}>
          {d.integrantes.map((m, i) => (
            <View key={i} style={s.firma} wrap={false}>
              {m.firma
                ? <Image src={m.firma} style={s.imagenFirma} />
                : <View style={s.sinFirma}>
                    <Text style={s.sinFirmaTexto}>Sin firma</Text>
                  </View>}
              <View style={s.linea} />
              <Text style={s.nombre}>{m.nombre}</Text>
              {m.identificacion && (
                <Text style={s.dato2}>C.C. {m.identificacion}</Text>
              )}
              {m.cargo && <Text style={s.dato2}>{m.cargo}</Text>}
              <Text style={[s.rol, { color: d.colorPrimario }]}>
                {ROLES[m.rol] ?? m.rol}
                {m.frente ? ` · ${FRENTES[m.frente] ?? m.frente}` : ''}
              </Text>
              {m.parte !== 'brigada' && (
                <Text style={s.dato2}>
                  {m.parte === 'empleador' ? 'Representa al empleador' : 'Representa a los trabajadores'}
                  {m.suplente ? ' · suplente' : ' · principal'}
                </Text>
              )}
              {m.fecha && <Text style={s.fecha}>Firmó el {m.fecha}</Text>}
            </View>
          ))}
        </View>

        {d.integrantes.length === 0 && (
          <Text style={s.vacio}>Sin integrantes registrados.</Text>
        )}

        {d.observaciones && (
          <View wrap={false}>
            <Text style={s.bloqueTitulo}>OBSERVACIONES</Text>
            <Text style={s.parrafo}>{d.observaciones}</Text>
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

    borrador: {
      backgroundColor: '#FEF3C7', color: '#92400E',
      fontSize: 8, fontFamily: 'Helvetica-Bold',
      padding: '6 10', borderRadius: 3, marginBottom: 10, textAlign: 'center',
    },

    datos: { flexDirection: 'row', gap: 8, marginBottom: 10 },
    dato: {
      flex: 1, borderWidth: 0.7, borderColor: '#E4E4DF',
      borderRadius: 3, padding: '6 9',
    },
    datoEtiqueta: { fontSize: 6, color: '#8A929C', letterSpacing: .4 },
    datoValor: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', marginTop: 2 },

    bloqueTitulo: {
      fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#ffffff',
      backgroundColor: color, padding: '5 8', letterSpacing: .3,
      marginTop: 10, marginBottom: 5,
    },
    parrafo: { fontSize: 8.5, lineHeight: 1.6, color: '#374151', marginBottom: 3 },

    veredicto: {
      borderWidth: 0.8, borderRadius: 4, padding: '8 11', marginTop: 8,
    },
    veredictoTexto: { fontSize: 8.5, fontFamily: 'Helvetica-Bold' },
    falla: { fontSize: 8, color: '#92400E', marginTop: 2.5, lineHeight: 1.4 },

    firmas: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 6 },
    firma: { width: 158 },
    imagenFirma: { height: 38, objectFit: 'contain', marginBottom: 2 },
    sinFirma: {
      height: 38, alignItems: 'center', justifyContent: 'center',
      backgroundColor: '#FAFAF8', marginBottom: 2,
    },
    sinFirmaTexto: { fontSize: 7, color: '#9CA3AF', fontStyle: 'italic' },
    linea: { borderTopWidth: 0.8, borderTopColor: '#14263F', marginBottom: 3 },
    nombre: { fontSize: 8, fontFamily: 'Helvetica-Bold', lineHeight: 1.3 },
    dato2: { fontSize: 6.5, color: '#5B6470', lineHeight: 1.35 },
    rol: { fontSize: 6.5, fontFamily: 'Helvetica-Bold', marginTop: 1.5 },
    fecha: { fontSize: 6, color: '#9CA3AF', marginTop: 1 },

    vacio: { fontSize: 8.5, color: '#9CA3AF', fontStyle: 'italic' },

    pie: {
      position: 'absolute', bottom: 20, left: 32, right: 32,
      textAlign: 'center', fontSize: 6, color: '#9CA3AF',
    },
  });
}
