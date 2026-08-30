/**
 * ACTA DE DEVOLUCIÓN DE DOTACIÓN
 * ---------------------------------------------------------------
 * El acta de entrega prueba que la persona recibió y conoce el uso.
 * Esta prueba lo contrario: que devolvió, cuándo, y EN QUÉ ESTADO.
 *
 * Por eso el bloque central no es una lista de elementos sino la
 * comparación entre cómo salió y cómo volvió. Es lo único que permite
 * sostener después un descuento de nómina o una reposición, y lo que
 * un acta que solo dijera "devuelto" no podría respaldar.
 */
import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer';
import { EncabezadoDoc, type EncabezadoConfig } from './EncabezadoDoc';

export type CampoEncabezado = { etiqueta: string; valor: string };

/** Orden de peor a mejor conservación. El índice mide el deterioro. */
export const ESCALA_ESTADO = ['nuevo', 'bueno', 'regular', 'malo'] as const;

export type DatosActaDevolucion = {
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

  nombres: string;
  identificacion: string;
  cargo: string | null;
  area: string | null;

  entregaCodigo: string;
  fechaEntrega: string;
  fechaDevolucion: string;
  diasUso: number;
  entregadoPor: string;
  recibidoPor: string;

  articulo: string;
  articuloCodigo: string;
  placa: string | null;
  serial: string | null;
  accesorios: string | null;

  estadoEntrega: string | null;
  estadoDevolucion: string | null;
  destinoUnidad: string | null;
  observaciones: string | null;
  foto: Buffer | null;

  firmaDevuelve: Buffer | null;

  generadoEl: string;
};

/** Escalones que bajó el estado. Positivo = se deterioró. */
function deterioro(entrega: string | null, devolucion: string | null): number | null {
  const a = ESCALA_ESTADO.indexOf((entrega ?? '') as (typeof ESCALA_ESTADO)[number]);
  const b = ESCALA_ESTADO.indexOf((devolucion ?? '') as (typeof ESCALA_ESTADO)[number]);
  if (a < 0 || b < 0) return null;
  return b - a;
}

function veredicto(n: number | null): { texto: string; color: string } {
  if (n === null) return { texto: 'SIN COMPARACIÓN', color: '#6B7280' };
  if (n <= 0) return { texto: 'SIN DETERIORO', color: '#1E6B3A' };
  if (n === 1) return { texto: 'DETERIORO NORMAL DE USO', color: '#9A3412' };
  return { texto: 'DETERIORO SUPERIOR AL ESPERADO', color: '#9B1C1C' };
}

export function ActaDevolucion({ d }: { d: DatosActaDevolucion }) {
  const s = estilos(d.colorPrimario);
  const baja = deterioro(d.estadoEntrega, d.estadoDevolucion);
  const v = veredicto(baja);

  return (
    <Document title={`Devolución ${d.codigo}`} author={d.empresa}>
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

        {/* ============ QUIÉN DEVUELVE / DATOS DEL ACTA ============ */}
        <View style={s.dosColumnas}>
          <View style={s.columna}>
            <Text style={s.tituloBloque}>DATOS DE QUIEN DEVUELVE</Text>
            <Dato s={s} e="NOMBRE" v={d.nombres.toUpperCase()} />
            <Dato s={s} e="IDENTIFICACIÓN" v={d.identificacion} />
            {d.cargo && <Dato s={s} e="CARGO" v={d.cargo.toUpperCase()} />}
            {d.area && <Dato s={s} e="ÁREA" v={d.area.toUpperCase()} />}
          </View>

          <View style={s.columna}>
            <Text style={s.tituloBloque}>DATOS DE LA DEVOLUCIÓN</Text>
            <Dato s={s} e="ACTA" v={d.codigo} />
            <Dato s={s} e="FECHA" v={d.fechaDevolucion} />
            <Dato s={s} e="RECIBIDO POR" v={d.recibidoPor.toUpperCase()} />
          </View>
        </View>

        {/* ============ TRAZABILIDAD CON LA ENTREGA ============ */}
        {/* Sin este bloque el acta quedaría suelta: hay que poder llegar
            del elemento devuelto al acta con que se entregó. */}
        <View style={s.trazabilidad}>
          <Text style={s.tituloBloque}>ORIGEN DEL ELEMENTO</Text>
          <View style={s.filaTraza}>
            <Dato s={s} e="ACTA DE ENTREGA" v={d.entregaCodigo} />
            <Dato s={s} e="FECHA DE ENTREGA" v={d.fechaEntrega} />
            <Dato s={s} e="ENTREGADO POR" v={d.entregadoPor.toUpperCase()} />
            <Dato s={s} e="TIEMPO EN USO" v={`${d.diasUso} días`} />
          </View>
        </View>

        {/* ============ ELEMENTO ============ */}
        <Text style={s.tituloBloque}>ELEMENTO DEVUELTO</Text>
        <View style={s.thead}>
          <Text style={[s.th, { width: '46%' }]}>ELEMENTO</Text>
          <Text style={[s.th, { width: '27%' }]}>PLACA / SERIAL</Text>
          <Text style={[s.th, { width: '27%' }]}>ACCESORIOS</Text>
        </View>
        <View style={s.fila}>
          <View style={[s.tdCaja, { width: '46%' }]}>
            <Text style={s.nombreItem}>{d.articulo.toUpperCase()}</Text>
            <Text style={s.codigoItem}>{d.articuloCodigo}</Text>
          </View>
          <Text style={[s.td, { width: '27%' }]}>
            {d.placa ?? '—'}{d.serial ? ` / ${d.serial}` : ''}
          </Text>
          <Text style={[s.td, { width: '27%' }]}>{d.accesorios ?? '—'}</Text>
        </View>

        {/* ============ ESTADO: EL BLOQUE QUE DA VALOR AL ACTA ============ */}
        <View style={s.estado} wrap={false}>
          <Text style={s.tituloBloque}>ESTADO DEL ELEMENTO</Text>

          <View style={s.comparacion}>
            <View style={s.celdaEstado}>
              <Text style={s.etiquetaEstado}>SE ENTREGÓ</Text>
              <Text style={s.valorEstado}>
                {(d.estadoEntrega ?? '—').toUpperCase()}
              </Text>
            </View>

            {/* ASCII a proposito: react-pdf usa WinAnsi con las fuentes
                estandar y la flecha → (U+2192) no esta en ese juego, asi
                que sale en blanco sin avisar. */}
            <Text style={s.flecha}>&gt;</Text>

            <View style={s.celdaEstado}>
              <Text style={s.etiquetaEstado}>SE DEVOLVIÓ</Text>
              <Text style={s.valorEstado}>
                {(d.estadoDevolucion ?? '—').toUpperCase()}
              </Text>
            </View>

            <View style={[s.celdaVeredicto, { borderColor: v.color }]}>
              <Text style={[s.textoVeredicto, { color: v.color }]}>{v.texto}</Text>
              {d.destinoUnidad && (
                <Text style={s.destino}>DESTINO: {d.destinoUnidad.toUpperCase()}</Text>
              )}
            </View>
          </View>
        </View>

        {d.observaciones && (
          <View style={s.observaciones} wrap={false}>
            <Text style={s.tituloBloque}>OBSERVACIONES</Text>
            <Text style={s.textoObs}>{d.observaciones}</Text>
          </View>
        )}

        {/* La foto es la evidencia del estado: sin ella, el veredicto
            es la palabra de quien recibe contra la de quien devuelve. */}
        {d.foto && (
          <View style={s.zonaFoto} wrap={false}>
            <Text style={s.tituloBloque}>EVIDENCIA FOTOGRÁFICA</Text>
            <Image src={d.foto} style={s.foto} />
          </View>
        )}

        {/* ============ FIRMAS ============ */}
        <View style={s.zonaFirmas} wrap={false}>
          <View style={s.columnaFirma}>
            {d.firmaDevuelve
              ? <Image src={d.firmaDevuelve} style={s.firma} />
              : <View style={s.espacioFirma} />}
            <View style={s.lineaFirma} />
            <Text style={s.nombreFirma}>{d.nombres.toUpperCase()}</Text>
            <Text style={s.rolFirma}>C.C. {d.identificacion}</Text>
            <Text style={s.rolFirma}>QUIEN DEVUELVE</Text>
          </View>

          <View style={s.columnaFirma}>
            <View style={s.espacioFirma} />
            <View style={s.lineaFirma} />
            <Text style={s.nombreFirma}>{d.recibidoPor.toUpperCase()}</Text>
            <Text style={s.rolFirma}>QUIEN RECIBE</Text>
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

    dosColumnas: { flexDirection: 'row', gap: 24, marginBottom: 14 },
    columna: { flex: 1 },
    tituloBloque: {
      fontSize: 8, fontFamily: 'Helvetica-Bold', color,
      marginBottom: 5, letterSpacing: .3,
    },
    dato: { fontSize: 8.5, marginBottom: 2.5 },
    datoEtiqueta: { fontFamily: 'Helvetica-Bold' },

    trazabilidad: {
      marginBottom: 14, padding: 9,
      borderWidth: 0.7, borderColor: '#E4E4DF', borderRadius: 3,
      backgroundColor: '#FAFAF8',
    },
    filaTraza: { flexDirection: 'row', flexWrap: 'wrap', gap: 18 },

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

    estado: { marginTop: 16 },
    comparacion: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    celdaEstado: {
      borderWidth: 0.7, borderColor: '#D1D5DB', borderRadius: 3,
      paddingVertical: 8, paddingHorizontal: 12, alignItems: 'center', minWidth: 92,
    },
    etiquetaEstado: { fontSize: 6.2, color: '#6B7280', letterSpacing: .4 },
    valorEstado: { fontSize: 11, fontFamily: 'Helvetica-Bold', marginTop: 3 },
    flecha: { fontSize: 15, color: '#9CA3AF', fontFamily: 'Helvetica-Bold' },
    celdaVeredicto: {
      flex: 1, borderWidth: 1, borderRadius: 3,
      paddingVertical: 8, paddingHorizontal: 12, alignItems: 'center',
    },
    textoVeredicto: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', textAlign: 'center' },
    destino: { fontSize: 6.5, color: '#6B7280', marginTop: 3 },

    observaciones: { marginTop: 14 },
    textoObs: { fontSize: 8, color: '#374151', lineHeight: 1.5 },

    zonaFoto: { marginTop: 14 },
    foto: { maxHeight: 150, maxWidth: 220, objectFit: 'contain' },

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
