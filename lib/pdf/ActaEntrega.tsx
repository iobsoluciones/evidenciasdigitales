/**
 * ACTA DE ENTREGA DE DOTACIÓN
 * ---------------------------------------------------------------
 * Misma estructura que el acta de asistencia, con un elemento que
 * aquella no tiene: la DECLARACIÓN.
 *
 * Un acta de capacitación prueba asistencia. Una entrega debe probar
 * que la persona conoce el uso del elemento, porque de eso depende la
 * responsabilidad del empleador ante un accidente. Por eso la
 * declaración es configurable por empresa y no va fija aquí.
 */
import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer';
import { EncabezadoDoc, type EncabezadoConfig } from './EncabezadoDoc';

export type CampoEncabezado = { etiqueta: string; valor: string };

export type ItemActa = {
  nombre: string;
  codigo: string;
  tipo: 'consumible' | 'retornable';
  unidad: string;
  cantidad: number;
  talla: string | null;
  lote: string | null;
  fecha_vence: string | null;
  placa: string | null;
  serial: string | null;
  estado_entrega: string | null;
  accesorios: string | null;
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
  /** Diseño del encabezado, congelado al emitir. */
  encabezadoConfig: EncabezadoConfig | null;

  nombres: string;
  identificacion: string;
  cargo: string | null;
  area: string | null;
  entregadoPor: string;
  observaciones: string | null;
  fechaEntrega: string;

  declaracion: string | null;
  items: ItemActa[];

  firmaRecibe: Buffer | null;
  firmaEntrega: Buffer | null;

  generadoEl: string;
};

const ANCHOS = {
  n: '5%', articulo: '31%', cant: '9%', talla: '9%',
  identificacion: '20%', estado: '12%', vence: '14%',
};

export function ActaEntrega({ d }: { d: DatosActa }) {
  const s = estilos(d.colorPrimario);

  const hayRetornables = d.items.some((i) => i.tipo === 'retornable');

  return (
    <Document title={`Entrega ${d.codigo}`} author={d.empresa}>
      <Page size="LETTER" style={s.pagina}>

        {/* ============ ENCABEZADO ============ */}
        {/* Diseño elegido por la empresa y congelado al crear el acta. */}
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

        {/* ============ QUIEN RECIBE ============ */}
        <View style={s.dosColumnas}>
          <View style={s.columna}>
            <Text style={s.tituloBloque}>DATOS DE QUIEN RECIBE</Text>
            <Dato s={s} e="NOMBRE" v={d.nombres.toUpperCase()} />
            <Dato s={s} e="IDENTIFICACIÓN" v={d.identificacion} />
            {d.cargo && <Dato s={s} e="CARGO" v={d.cargo.toUpperCase()} />}
            {d.area && <Dato s={s} e="ÁREA" v={d.area.toUpperCase()} />}
          </View>

          <View style={s.columna}>
            <Text style={s.tituloBloque}>DATOS DE LA ENTREGA</Text>
            <Dato s={s} e="ACTA" v={d.codigo} />
            <Dato s={s} e="FECHA" v={d.fechaEntrega} />
            <Dato s={s} e="ENTREGADO POR" v={d.entregadoPor.toUpperCase()} />
          </View>
        </View>

        {/* ============ TABLA ============ */}
        <Text style={s.tituloBloque}>ELEMENTOS ENTREGADOS</Text>

        <View style={s.thead}>
          <Text style={[s.th, { width: ANCHOS.n }]}>#</Text>
          <Text style={[s.th, { width: ANCHOS.articulo }]}>ELEMENTO</Text>
          <Text style={[s.th, { width: ANCHOS.cant }]}>CANT.</Text>
          <Text style={[s.th, { width: ANCHOS.talla }]}>TALLA</Text>
          <Text style={[s.th, { width: ANCHOS.identificacion }]}>PLACA / LOTE</Text>
          {hayRetornables && (
            <Text style={[s.th, { width: ANCHOS.estado }]}>ESTADO</Text>
          )}
          <Text style={[s.th, { width: ANCHOS.vence }]}>VENCE</Text>
        </View>

        {d.items.map((it, i) => (
          <View key={i} style={s.fila} wrap={false}>
            <Text style={[s.td, { width: ANCHOS.n }]}>{i + 1}</Text>
            <View style={[s.tdCaja, { width: ANCHOS.articulo }]}>
              <Text style={s.nombreItem}>{it.nombre.toUpperCase()}</Text>
              <Text style={s.codigoItem}>{it.codigo}</Text>
              {it.accesorios && (
                <Text style={s.accesorios}>Incluye: {it.accesorios}</Text>
              )}
            </View>
            <Text style={[s.td, { width: ANCHOS.cant }]}>
              {it.cantidad} {it.unidad.slice(0, 3).toLowerCase()}
            </Text>
            <Text style={[s.td, { width: ANCHOS.talla }]}>{it.talla ?? '—'}</Text>
            <Text style={[s.td, { width: ANCHOS.identificacion }]}>
              {it.placa ?? it.lote ?? '—'}
              {it.serial ? `\n${it.serial}` : ''}
            </Text>
            {hayRetornables && (
              <Text style={[s.td, { width: ANCHOS.estado }]}>
                {it.estado_entrega ? it.estado_entrega.toUpperCase() : '—'}
              </Text>
            )}
            <Text style={[s.td, { width: ANCHOS.vence }]}>
              {it.fecha_vence
                ? new Date(it.fecha_vence + 'T12:00:00')
                    .toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' })
                : '—'}
            </Text>
          </View>
        ))}

        {d.observaciones && (
          <View style={s.observaciones} wrap={false}>
            <Text style={s.tituloBloque}>OBSERVACIONES</Text>
            <Text style={s.textoObs}>{d.observaciones}</Text>
          </View>
        )}

        {/* ============ DECLARACIÓN ============ */}
        {/* Es lo que distingue esta acta de una de asistencia: prueba
            que la persona conoce el uso, no solo que recibió. */}
        {d.declaracion && (
          <View style={s.declaracion} wrap={false}>
            <Text style={s.tituloDeclaracion}>DECLARACIÓN</Text>
            <Text style={s.textoDeclaracion}>{d.declaracion}</Text>
          </View>
        )}

        {/* ============ FIRMAS ============ */}
        <View style={s.zonaFirmas} wrap={false}>
          <View style={s.columnaFirma}>
            {d.firmaRecibe
              ? <Image src={d.firmaRecibe} style={s.firma} />
              : <View style={s.espacioFirma} />}
            <View style={s.lineaFirma} />
            <Text style={s.nombreFirma}>{d.nombres.toUpperCase()}</Text>
            <Text style={s.rolFirma}>C.C. {d.identificacion}</Text>
            <Text style={s.rolFirma}>QUIEN RECIBE</Text>
          </View>

          <View style={s.columnaFirma}>
            {d.firmaEntrega
              ? <Image src={d.firmaEntrega} style={s.firma} />
              : <View style={s.espacioFirma} />}
            <View style={s.lineaFirma} />
            <Text style={s.nombreFirma}>{d.entregadoPor.toUpperCase()}</Text>
            <Text style={s.rolFirma}>QUIEN ENTREGA</Text>
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

function Dato({ s, e, v }: { s: any; e: string; v: string }) {
  return (
    <Text style={s.dato}>
      <Text style={s.datoEtiqueta}>{e}: </Text>{v}
    </Text>
  );
}

function estilos(color: string) {
  return StyleSheet.create({
    pagina: {
      paddingTop: 28, paddingBottom: 46, paddingHorizontal: 32,
      fontSize: 9, fontFamily: 'Helvetica', color: '#14263F',
    },

    encabezado: {
      alignItems: 'center', borderBottomWidth: 1.2, borderBottomColor: color,
      paddingBottom: 10, marginBottom: 12,
    },
    logo: { maxHeight: 40, maxWidth: 140, objectFit: 'contain', marginBottom: 8 },
    titulo: { fontSize: 12.5, fontFamily: 'Helvetica-Bold', color, textAlign: 'center' },
    control: { fontSize: 7, color: '#8A929C', marginTop: 4, textAlign: 'center' },

    bloqueEmpresa: { marginBottom: 12 },
    empresa: { fontSize: 11.5, fontFamily: 'Helvetica-Bold', color },
    datosEmpresa: { fontSize: 7.5, color: '#6B7280', marginTop: 2 },

    dosColumnas: { flexDirection: 'row', gap: 24, marginBottom: 14 },
    columna: { flex: 1 },
    tituloBloque: {
      fontSize: 8, fontFamily: 'Helvetica-Bold', color,
      marginBottom: 5, letterSpacing: .3,
    },
    dato: { fontSize: 8.5, marginBottom: 2.5 },
    datoEtiqueta: { fontFamily: 'Helvetica-Bold' },

    thead: { flexDirection: 'row', backgroundColor: color, paddingVertical: 4.5 },
    th: { fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: '#ffffff', paddingHorizontal: 4 },
    fila: {
      flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: '#EFEFEA',
      paddingVertical: 5, alignItems: 'center',
    },
    td: { fontSize: 7.5, paddingHorizontal: 4 },
    tdCaja: { paddingHorizontal: 4 },
    nombreItem: { fontSize: 7.8, fontFamily: 'Helvetica-Bold' },
    codigoItem: { fontSize: 6.2, color: '#9CA3AF', marginTop: 0.5 },
    accesorios: { fontSize: 6.2, color: '#6B7280', marginTop: 1 },

    observaciones: { marginTop: 14 },
    textoObs: { fontSize: 8, color: '#374151', lineHeight: 1.5 },

    declaracion: {
      marginTop: 18, padding: 11,
      borderWidth: 0.7, borderColor: '#D1D5DB', borderRadius: 3,
      backgroundColor: '#FAFAF8',
    },
    tituloDeclaracion: {
      fontSize: 8, fontFamily: 'Helvetica-Bold', color, marginBottom: 5,
    },
    textoDeclaracion: { fontSize: 7.8, lineHeight: 1.6, textAlign: 'justify' },

    zonaFirmas: { flexDirection: 'row', gap: 40, marginTop: 34 },
    columnaFirma: { flex: 1, alignItems: 'center' },
    firma: { height: 40, maxWidth: 150, objectFit: 'contain', marginBottom: 2 },
    espacioFirma: { height: 42 },
    lineaFirma: {
      width: '100%', borderBottomWidth: 0.8,
      borderBottomColor: '#9CA3AF', marginBottom: 4,
    },
    nombreFirma: { fontSize: 8.2, fontFamily: 'Helvetica-Bold' },
    rolFirma: { fontSize: 6.8, color: '#6B7280', marginTop: 1 },

    pie: {
      position: 'absolute', bottom: 20, left: 32, right: 32,
      textAlign: 'center', fontSize: 6, color: '#9CA3AF',
    },
  });
}
