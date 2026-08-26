/**
 * CRONOGRAMA DE CAPACITACIONES
 * ---------------------------------------------------------------
 * Listado de lo programado y lo realizado en un periodo. Es el
 * documento que un jefe de SST lleva a comité: qué viene, qué se
 * hizo y qué quedó pendiente.
 */
import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer';
import { EncabezadoDoc, type EncabezadoConfig } from './EncabezadoDoc';

export type CampoEncabezado = { etiqueta: string; valor: string };

export type FilaCronograma = {
  fecha: string;
  hora: string | null;
  titulo: string;
  tipo: string;
  origen: 'capacitacion' | 'agenda';
  codigo: string | null;
  estado: string | null;
  empresa: string;
  detalle: string | null;
};

export type DatosCronograma = {
  empresa: string;
  nomenclatura: string;
  versionDoc: string;
  colorPrimario: string;
  logo: Buffer | null;
  camposExtra: CampoEncabezado[];
  /** Diseño del encabezado de la empresa. */
  encabezadoConfig: EncabezadoConfig | null;

  periodo: string;
  elaboradoPor: string;
  todasLasEmpresas: boolean;

  programadas: number;
  realizadas: number;

  filas: FilaCronograma[];
  generadoEl: string;
};

const TIPOS: Record<string, string> = {
  capacitacion: 'CAPACITACIÓN',
  inspeccion: 'INSPECCIÓN',
  entrega: 'ENTREGA EPP',
  reunion: 'REUNIÓN',
  otro: 'OTRO',
};

export function Cronograma({ d }: { d: DatosCronograma }) {
  const s = estilos(d.colorPrimario);

  return (
    <Document title={`Cronograma ${d.empresa}`} author={d.empresa}>
      <Page size="LETTER" style={s.pagina}>

        {/* ============ ENCABEZADO ============ */}
        <EncabezadoDoc d={{
          config: d.encabezadoConfig,
          logo: d.logo,
          titulo: 'CRONOGRAMA DE CAPACITACIONES',
          nomenclatura: d.nomenclatura,
          versionDoc: d.versionDoc,
          campos: d.camposExtra,
          empresa: d.empresa,
          nit: null,
          direccion: null,
          color: d.colorPrimario,
        }} />

        <View style={s.datos}>
          <Text style={s.dato}>
            <Text style={s.datoEtiqueta}>PERIODO: </Text>{d.periodo}
          </Text>
          <Text style={s.dato}>
            <Text style={s.datoEtiqueta}>ELABORADO POR: </Text>{d.elaboradoPor.toUpperCase()}
          </Text>
        </View>

        {/* ---------- Resumen ---------- */}
        <View style={s.resumen}>
          <View style={s.kpi}>
            <Text style={s.kpiValor}>{d.realizadas}</Text>
            <Text style={s.kpiEtiqueta}>CREADAS</Text>
          </View>
          <View style={s.kpi}>
            <Text style={s.kpiValor}>{d.programadas}</Text>
            <Text style={s.kpiEtiqueta}>PROGRAMADAS</Text>
          </View>
          <View style={s.kpi}>
            <Text style={s.kpiValor}>{d.filas.length}</Text>
            <Text style={s.kpiEtiqueta}>TOTAL EN EL PERIODO</Text>
          </View>
        </View>

        {/* ---------- Tabla ---------- */}
        <View style={s.thead} fixed>
          <Text style={[s.th, { width: '11%' }]}>FECHA</Text>
          <Text style={[s.th, { width: '7%' }]}>HORA</Text>
          <Text style={[s.th, { width: d.todasLasEmpresas ? '20%' : '34%' }]}>ACTIVIDAD</Text>
          {d.todasLasEmpresas && <Text style={[s.th, { width: '16%' }]}>EMPRESA</Text>}
          <Text style={[s.th, { width: '14%' }]}>TIPO</Text>
          <Text style={[s.th, { width: '12%' }]}>CÓDIGO</Text>
          <Text style={[s.th, { width: '14%' }]}>ESTADO</Text>
        </View>

        {d.filas.map((f, i) => (
          <View key={i} style={s.fila} wrap={false}>
            <Text style={[s.td, { width: '11%' }]}>{f.fecha}</Text>
            <Text style={[s.td, { width: '7%' }]}>{f.hora ?? '—'}</Text>
            <Text style={[s.td, { width: d.todasLasEmpresas ? '20%' : '34%' }]}>
              {f.titulo.toUpperCase()}
            </Text>
            {d.todasLasEmpresas && (
              <Text style={[s.td, { width: '16%' }]}>{f.empresa.toUpperCase()}</Text>
            )}
            <Text style={[s.td, { width: '14%' }]}>{TIPOS[f.tipo] ?? f.tipo.toUpperCase()}</Text>
            <Text style={[s.td, { width: '12%' }]}>{f.codigo ?? '—'}</Text>
            <Text style={[s.td, {
              width: '14%',
              color: f.origen === 'agenda' ? '#8A6100' : '#15803D',
            }]}>
              {f.origen === 'agenda' ? 'PROGRAMADA' : (f.estado ?? '').toUpperCase()}
            </Text>
          </View>
        ))}

        {d.filas.length === 0 && (
          <Text style={s.vacio}>No hay actividades registradas en el periodo.</Text>
        )}

        <Text style={s.nota}>
          «Programada» corresponde a anotaciones del cronograma que aún no se han
          creado como capacitación. Los demás estados corresponden a capacitaciones
          ya existentes en el sistema.
        </Text>

        {/* ---------- Firma ---------- */}
        <View style={s.firma} wrap={false}>
          <Text style={s.lineaFirma}>__________________________________</Text>
          <Text style={s.nombreFirma}>{d.elaboradoPor.toUpperCase()}</Text>
          <Text style={s.rolFirma}>RESPONSABLE DEL PROGRAMA DE CAPACITACIÓN</Text>
        </View>

        <Text
          style={s.pie}
          fixed
          render={({ pageNumber, totalPages }) =>
            `${d.empresa.toUpperCase()}   •   CRONOGRAMA   •   ${d.nomenclatura}   •   ` +
            `${d.versionDoc}   •   GENERADO EL ${d.generadoEl}   •   PÁGINA ${pageNumber} DE ${totalPages}`
          }
        />
      </Page>
    </Document>
  );
}

function estilos(color: string) {
  return StyleSheet.create({
    pagina: {
      paddingTop: 28, paddingBottom: 46, paddingHorizontal: 30,
      fontSize: 9, fontFamily: 'Helvetica', color: '#14263F',
    },
    logoCaja: { alignItems: 'center', marginBottom: 8 },
    logo: { maxHeight: 44, maxWidth: 150, objectFit: 'contain' },
    titulo: { textAlign: 'center', fontSize: 15, fontFamily: 'Helvetica-Bold', color, marginBottom: 3 },
    control: { textAlign: 'center', fontSize: 7.2, color: '#8A929C', marginBottom: 14 },
    empresa: { fontSize: 13, fontFamily: 'Helvetica-Bold', color, marginBottom: 6 },
    datos: { marginBottom: 12 },
    dato: { fontSize: 8.5, marginBottom: 2 },
    datoEtiqueta: { fontFamily: 'Helvetica-Bold' },

    resumen: { flexDirection: 'row', gap: 8, marginBottom: 14 },
    kpi: { flex: 1, backgroundColor: '#F7F7F4', padding: 10, alignItems: 'center' },
    kpiValor: { fontSize: 17, fontFamily: 'Helvetica-Bold' },
    kpiEtiqueta: { fontSize: 6.2, color: '#8A929C', marginTop: 2 },

    thead: { flexDirection: 'row', backgroundColor: color, paddingVertical: 4 },
    th: { fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: '#ffffff', paddingHorizontal: 3 },
    fila: {
      flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: '#EFEFEA',
      paddingVertical: 4, alignItems: 'center',
    },
    td: { fontSize: 7.2, paddingHorizontal: 3 },
    vacio: { fontSize: 8.5, color: '#A3AAB3', marginTop: 12, textAlign: 'center' },
    nota: { fontSize: 7, color: '#8A929C', marginTop: 10, lineHeight: 1.5 },

    firma: { marginTop: 30 },
    lineaFirma: { fontSize: 10, color: '#A3AAB3' },
    nombreFirma: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', marginTop: 3 },
    rolFirma: { fontSize: 7, color: '#8A929C' },

    pie: {
      position: 'absolute', bottom: 20, left: 30, right: 30,
      textAlign: 'center', fontSize: 6.2, color: '#8A929C',
    },
  });
}
