/**
 * ORGANIGRAMA DEL COMITÉ
 * ---------------------------------------------------------------
 * Documento de CARTELERA: se imprime y se publica en la pared, así que
 * tiene que leerse a un metro de distancia y sobrevivir a una fotocopia
 * en blanco y negro. Por eso la parte que representa cada integrante va
 * en texto y en posición —dos columnas—, nunca solo en color.
 *
 * Las fotos son opcionales: si no hay, queda la inicial. Un organigrama
 * a medio llenar sigue sirviendo; uno que no se puede imprimir, no.
 */
import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer';
import { EncabezadoDoc, type EncabezadoConfig } from './EncabezadoDoc';

export type CampoEncabezado = { etiqueta: string; valor: string };

export type MiembroPdf = {
  nombre: string;
  identificacion: string | null;
  cargo: string | null;
  rol: string;
  suplente: boolean;
  foto: Buffer | null;
};

export type DatosOrganigrama = {
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
  periodo: string;
  fechaConformacion: string;

  empleador: MiembroPdf[];
  trabajadores: MiembroPdf[];

  generadoEl: string;
};

const ROLES: Record<string, string> = {
  presidente: 'PRESIDENTE',
  secretario: 'SECRETARIO',
  integrante: 'INTEGRANTE',
};

export function Organigrama({ d }: { d: DatosOrganigrama }) {
  const s = estilos(d.colorPrimario);

  return (
    <Document title={`${d.tipoComite} ${d.codigo}`} author={d.empresa}>
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

        <View style={s.datos}>
          <Dato s={s} e="PERIODO" v={d.periodo} />
          <Dato s={s} e="CONFORMADO EL" v={d.fechaConformacion} />
          <Dato s={s} e="NORMA" v={d.norma} />
        </View>

        {/* Dos columnas: la paridad que exige la norma se ve de un vistazo. */}
        <View style={s.columnas}>
          <Columna s={s} titulo="REPRESENTANTES DEL EMPLEADOR"
            miembros={d.empleador} color={d.colorPrimario} />
          <Columna s={s} titulo="REPRESENTANTES DE LOS TRABAJADORES"
            miembros={d.trabajadores} color={d.colorPrimario} />
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

function Columna({
  s, titulo, miembros, color,
}: {
  s: ReturnType<typeof estilos>;
  titulo: string;
  miembros: MiembroPdf[];
  color: string;
}) {
  const principales = miembros.filter((m) => !m.suplente);
  const suplentes = miembros.filter((m) => m.suplente);

  return (
    <View style={s.columna}>
      <Text style={s.columnaTitulo}>{titulo}</Text>

      <Text style={s.grupo}>PRINCIPALES</Text>
      {principales.length === 0
        ? <Text style={s.vacio}>Sin designar</Text>
        : principales.map((m, i) => <Tarjeta key={i} s={s} m={m} color={color} />)}

      <Text style={s.grupo}>SUPLENTES</Text>
      {suplentes.length === 0
        ? <Text style={s.vacio}>Sin designar</Text>
        : suplentes.map((m, i) => <Tarjeta key={i} s={s} m={m} color={color} />)}
    </View>
  );
}

function Tarjeta({
  s, m, color,
}: {
  s: ReturnType<typeof estilos>; m: MiembroPdf; color: string;
}) {
  return (
    <View style={s.tarjeta} wrap={false}>
      {m.foto
        ? <Image src={m.foto} style={s.foto} />
        : (
          <View style={[s.fotoVacia, { borderColor: color }]}>
            <Text style={[s.inicial, { color }]}>{m.nombre.charAt(0)}</Text>
          </View>
        )}
      <View style={s.datosMiembro}>
        <Text style={s.nombre}>{m.nombre.toUpperCase()}</Text>
        {m.cargo && <Text style={s.cargo}>{m.cargo.toUpperCase()}</Text>}
        {m.identificacion && <Text style={s.cedula}>C.C. {m.identificacion}</Text>}
        <Text style={[s.rol, { color }]}>{ROLES[m.rol] ?? m.rol.toUpperCase()}</Text>
      </View>
    </View>
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

    datos: { flexDirection: 'row', gap: 8, marginBottom: 16 },
    dato: {
      flex: 1, borderWidth: 0.7, borderColor: '#E4E4DF',
      borderRadius: 3, padding: '7 10',
    },
    datoEtiqueta: { fontSize: 6, color: '#8A929C', letterSpacing: .4 },
    datoValor: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', marginTop: 2 },

    columnas: { flexDirection: 'row', gap: 14 },
    columna: { flex: 1 },
    columnaTitulo: {
      fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#ffffff',
      backgroundColor: color, padding: '6 8', textAlign: 'center',
      letterSpacing: .3, marginBottom: 8,
    },
    grupo: {
      fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: '#8A929C',
      letterSpacing: .6, marginTop: 6, marginBottom: 4,
    },
    vacio: {
      fontSize: 8, color: '#9CA3AF', fontStyle: 'italic',
      paddingVertical: 6, paddingHorizontal: 4,
    },

    tarjeta: {
      flexDirection: 'row', gap: 9, alignItems: 'center',
      borderWidth: 0.7, borderColor: '#E4E4DF', borderRadius: 4,
      padding: 8, marginBottom: 6,
    },
    foto: { width: 40, height: 40, borderRadius: 20, objectFit: 'cover' },
    fotoVacia: {
      width: 40, height: 40, borderRadius: 20, borderWidth: 1.2,
      alignItems: 'center', justifyContent: 'center',
    },
    inicial: { fontSize: 16, fontFamily: 'Helvetica-Bold' },
    datosMiembro: { flex: 1 },
    nombre: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', lineHeight: 1.25 },
    cargo: { fontSize: 7, color: '#5B6470', marginTop: 1.5 },
    cedula: { fontSize: 6.5, color: '#8A929C', marginTop: 1 },
    rol: { fontSize: 6.5, fontFamily: 'Helvetica-Bold', marginTop: 2.5, letterSpacing: .3 },

    pie: {
      position: 'absolute', bottom: 20, left: 32, right: 32,
      textAlign: 'center', fontSize: 6, color: '#9CA3AF',
    },
  });
}
