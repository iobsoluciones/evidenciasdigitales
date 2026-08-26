/**
 * INFORME DE INSPECCIÓN
 * ---------------------------------------------------------------
 * Misma estructura documental que el acta de entrega, con lo propio de
 * una inspección: un VEREDICTO al frente y la evidencia fotográfica de
 * los hallazgos.
 *
 * El veredicto va arriba y en grande porque es lo que primero busca
 * quien recibe el informe —el jefe de SST, el auditor de la ARL—: no
 * quiere leer 40 criterios para saber si el extintor sirve.
 *
 * Y el veredicto NO es el puntaje. Un criterio crítico incumplido
 * reprueba la inspección aunque saque 92%, y el informe lo dice
 * explícitamente para que nadie confunda un porcentaje alto con
 * conformidad.
 */
import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer';

export type CampoEncabezado = { etiqueta: string; valor: string };

export type RespuestaInforme = {
  orden: number;
  seccion: string | null;
  criterio: string;
  critico: boolean;
  resultado: 'cumple' | 'no_cumple' | 'no_aplica' | null;
  hallazgo: string | null;
  foto: Buffer | null;
};

export type DatosInforme = {
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

  nombre: string;
  tipo: string;
  norma: string | null;
  objetoNombre: string | null;
  inspector: string;
  acompanante: string | null;
  fecha: string;
  observaciones: string | null;

  puntaje: number;
  cumple: boolean;
  totalAplicables: number;
  cumplen: number;
  noAplican: number;
  criticosFallidos: number;

  respuestas: RespuestaInforme[];

  /**
   * Acciones abiertas desde los hallazgos de esta inspeccion. Sin
   * ellas el informe documenta el diagnostico y omite el tratamiento,
   * que es justo lo que una auditoria pregunta despues.
   */
  acciones: AccionInforme[];

  firmaInspector: Buffer | null;
  firmaAcompanante: Buffer | null;

  generadoEl: string;
};

export type AccionInforme = {
  codigo: string;
  hallazgo: string;
  accion: string;
  responsable: string;
  severidad: string;
  fechaLimite: string;
};

const TIPOS: Record<string, string> = {
  planeada: 'Inspección planeada',
  area: 'Inspección de área',
  equipo: 'Inspección de equipo',
  auditoria: 'Auditoría',
};

const RESULTADOS: Record<string, { t: string; c: string }> = {
  cumple: { t: 'CUMPLE', c: '#15803D' },
  no_cumple: { t: 'NO CUMPLE', c: '#9B1C1C' },
  no_aplica: { t: 'N/A', c: '#8A929C' },
};

export function InformeInspeccion({ d }: { d: DatosInforme }) {
  const s = estilos(d.colorPrimario);

  // Solo los incumplimientos van a la sección de evidencia
  const hallazgos = d.respuestas.filter((r) => r.resultado === 'no_cumple');
  const conFoto = hallazgos.filter((r) => r.foto);

  // Agrupar respuestas por sección, conservando el orden
  const secciones: Array<{ nombre: string | null; items: RespuestaInforme[] }> = [];
  for (const r of d.respuestas) {
    const ultima = secciones[secciones.length - 1];
    if (!ultima || ultima.nombre !== r.seccion) {
      secciones.push({ nombre: r.seccion, items: [r] });
    } else {
      ultima.items.push(r);
    }
  }

  return (
    <Document title={`Inspección ${d.codigo}`} author={d.empresa}>
      <Page size="LETTER" style={s.pagina}>

        {/* ============ ENCABEZADO ============ */}
        <View style={s.encabezado}>
          {d.logo && <Image src={d.logo} style={s.logo} />}
          <Text style={s.titulo}>{d.titulo}</Text>
          <Text style={s.control}>
            VERSIÓN: {d.versionDoc}   •   NOMENCLATURA: {d.nomenclatura}
            {d.camposExtra.map((c) => `   •   ${c.etiqueta}: ${c.valor}`).join('')}
          </Text>
        </View>

        {/* ============ EMPRESA ============ */}
        <View style={s.bloqueEmpresa}>
          <Text style={s.empresa}>{d.empresa.toUpperCase()}</Text>
          <Text style={s.datosEmpresa}>
            {d.nit ? `NIT ${d.nit}` : ''}
            {d.nit && d.direccion ? '   •   ' : ''}
            {d.direccion ?? ''}
          </Text>
        </View>

        {/* ============ VEREDICTO ============ */}
        {/* Lo primero: cumple o no, y por qué. */}
        <View style={[s.veredicto, { borderColor: d.cumple ? '#15803D' : '#9B1C1C',
                                     backgroundColor: d.cumple ? '#F0FDF4' : '#FDF2F2' }]}>
          <View style={s.veredictoIzq}>
            <Text style={[s.veredictoEstado, { color: d.cumple ? '#15803D' : '#9B1C1C' }]}>
              {d.cumple ? 'CUMPLE' : 'NO CUMPLE'}
            </Text>
            <Text style={s.veredictoDetalle}>
              {d.cumplen} de {d.totalAplicables} criterios aplicables cumplen
              {d.noAplican > 0 ? `  ·  ${d.noAplican} no aplican` : ''}
            </Text>
            {d.criticosFallidos > 0 && (
              <Text style={s.veredictoCritico}>
                {d.criticosFallidos} criterio(s) crítico(s) incumplido(s): esto reprueba
                la inspección aunque el puntaje sea alto.
              </Text>
            )}
          </View>
          <View style={s.veredictoDer}>
            <Text style={[s.puntaje, { color: d.cumple ? '#15803D' : '#9B1C1C' }]}>
              {d.puntaje}%
            </Text>
            <Text style={s.puntajeNota}>puntaje</Text>
          </View>
        </View>

        {/* ============ DATOS ============ */}
        <View style={s.dosColumnas}>
          <View style={s.columna}>
            <Text style={s.tituloBloque}>DATOS DE LA INSPECCIÓN</Text>
            <Dato s={s} e="CÓDIGO" v={d.codigo} />
            <Dato s={s} e="TIPO" v={TIPOS[d.tipo] ?? d.tipo} />
            {d.objetoNombre && <Dato s={s} e="OBJETO" v={d.objetoNombre.toUpperCase()} />}
            {d.norma && <Dato s={s} e="NORMA" v={d.norma} />}
          </View>
          <View style={s.columna}>
            <Text style={s.tituloBloque}>EJECUCIÓN</Text>
            <Dato s={s} e="FECHA" v={d.fecha} />
            <Dato s={s} e="INSPECCIONÓ" v={d.inspector.toUpperCase()} />
            {d.acompanante && <Dato s={s} e="ACOMPAÑÓ" v={d.acompanante.toUpperCase()} />}
          </View>
        </View>

        {/* ============ DETALLE POR SECCIÓN ============ */}
        <Text style={s.tituloBloque}>RESULTADO POR CRITERIO</Text>

        <View style={s.thead}>
          <Text style={[s.th, { width: '6%' }]}>#</Text>
          <Text style={[s.th, { width: '52%' }]}>CRITERIO</Text>
          <Text style={[s.th, { width: '14%' }]}>RESULTADO</Text>
          <Text style={[s.th, { width: '28%' }]}>HALLAZGO</Text>
        </View>

        {secciones.map((sec, si) => (
          <View key={si} wrap={false}>
            {sec.nombre && <Text style={s.seccion}>{sec.nombre}</Text>}
            {sec.items.map((r) => {
              const res = r.resultado ? RESULTADOS[r.resultado] : null;
              return (
                <View key={r.orden} style={s.fila}>
                  <Text style={[s.td, { width: '6%', color: '#9CA3AF' }]}>{r.orden}</Text>
                  <View style={{ width: '52%', paddingHorizontal: 4 }}>
                    <Text style={s.tdCriterio}>{r.criterio}</Text>
                    {r.critico && <Text style={s.marcaCritico}>CRÍTICO</Text>}
                  </View>
                  <View style={{ width: '14%', paddingHorizontal: 4 }}>
                    <Text style={[s.tdResultado, { color: res?.c ?? '#9CA3AF' }]}>
                      {res?.t ?? '—'}
                    </Text>
                  </View>
                  <Text style={[s.td, { width: '28%', color: '#6B7280' }]}>
                    {r.hallazgo ?? ''}
                  </Text>
                </View>
              );
            })}
          </View>
        ))}

        {/* ============ OBSERVACIONES ============ */}
        {d.observaciones && (
          <View style={s.observaciones}>
            <Text style={s.tituloBloque}>OBSERVACIONES</Text>
            <Text style={s.textoObs}>{d.observaciones}</Text>
          </View>
        )}

        {/* ============ EVIDENCIA FOTOGRÁFICA ============ */}
        {conFoto.length > 0 && (
          <View style={s.evidencia} break={conFoto.length > 2}>
            <Text style={s.tituloBloque}>EVIDENCIA DE LOS HALLAZGOS</Text>
            <View style={s.galeria}>
              {conFoto.map((r) => (
                <View key={r.orden} style={s.foto} wrap={false}>
                  {r.foto && <Image src={r.foto} style={s.imagen} />}
                  <Text style={s.pieFoto}>
                    {r.orden}. {r.criterio}
                  </Text>
                  {r.hallazgo && <Text style={s.pieHallazgo}>{r.hallazgo}</Text>}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ============ PLAN DE ACCIÓN ============ */}
        {d.acciones.length > 0 && (
          <View style={s.plan} break={d.acciones.length > 6}>
            <Text style={s.tituloBloque}>PLAN DE ACCIÓN</Text>

            <View style={s.thead}>
              <Text style={[s.th, { width: '12%' }]}>CÓD.</Text>
              <Text style={[s.th, { width: '26%' }]}>HALLAZGO</Text>
              <Text style={[s.th, { width: '30%' }]}>ACCIÓN</Text>
              <Text style={[s.th, { width: '20%' }]}>RESPONSABLE</Text>
              <Text style={[s.th, { width: '12%' }]}>LÍMITE</Text>
            </View>

            {d.acciones.map((a) => (
              <View key={a.codigo} style={s.fila} wrap={false}>
                <Text style={[s.td, { width: '12%' }]}>{a.codigo}</Text>
                <Text style={[s.td, { width: '26%' }]}>{a.hallazgo}</Text>
                <Text style={[s.td, { width: '30%' }]}>{a.accion}</Text>
                <Text style={[s.td, { width: '20%' }]}>{a.responsable}</Text>
                <Text style={[s.td, { width: '12%' }]}>{a.fechaLimite}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ============ FIRMAS ============ */}
        <View style={s.zonaFirmas} wrap={false}>
          <View style={s.columnaFirma}>
            {d.firmaInspector
              ? <Image src={d.firmaInspector} style={s.firma} />
              : <View style={s.espacioFirma} />}
            <View style={s.lineaFirma} />
            <Text style={s.nombreFirma}>{d.inspector.toUpperCase()}</Text>
            <Text style={s.rolFirma}>QUIEN INSPECCIONA</Text>
          </View>

          {d.acompanante && (
            <View style={s.columnaFirma}>
              {d.firmaAcompanante
                ? <Image src={d.firmaAcompanante} style={s.firma} />
                : <View style={s.espacioFirma} />}
              <View style={s.lineaFirma} />
              <Text style={s.nombreFirma}>{d.acompanante.toUpperCase()}</Text>
              <Text style={s.rolFirma}>QUIEN ACOMPAÑA</Text>
            </View>
          )}
        </View>

        <Text style={s.pie} fixed>
          {d.empresa.toUpperCase()}   •   {d.codigo}   •   Generado el {d.generadoEl}
        </Text>
      </Page>
    </Document>
  );
}

function Dato({ s, e, v }: { s: ReturnType<typeof estilos>; e: string; v: string }) {
  return (
    <Text style={s.dato}>
      <Text style={s.datoEtiqueta}>{e}: </Text>
      {v}
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

    veredicto: {
      flexDirection: 'row', alignItems: 'center',
      borderWidth: 1, borderRadius: 4, padding: 12, marginBottom: 14,
    },
    veredictoIzq: { flex: 1 },
    veredictoEstado: { fontSize: 15, fontFamily: 'Helvetica-Bold', letterSpacing: .5 },
    veredictoDetalle: { fontSize: 8, color: '#374151', marginTop: 3 },
    veredictoCritico: { fontSize: 7.5, color: '#9B1C1C', marginTop: 4, lineHeight: 1.4 },
    veredictoDer: { alignItems: 'center', paddingLeft: 16 },
    puntaje: { fontSize: 24, fontFamily: 'Helvetica-Bold' },
    puntajeNota: { fontSize: 6.5, color: '#8A929C', textTransform: 'uppercase', letterSpacing: .5 },

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
    seccion: {
      fontSize: 7.5, fontFamily: 'Helvetica-Bold', color,
      backgroundColor: '#F4F4F0', paddingVertical: 3, paddingHorizontal: 4,
      marginTop: 2,
    },
    fila: {
      flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: '#EFEFEA',
      paddingVertical: 5, alignItems: 'flex-start',
    },
    td: { fontSize: 7.5, paddingHorizontal: 4 },
    tdCriterio: { fontSize: 7.8 },
    marcaCritico: { fontSize: 5.8, fontFamily: 'Helvetica-Bold', color: '#9B1C1C', marginTop: 1, letterSpacing: .4 },
    tdResultado: { fontSize: 7.5, fontFamily: 'Helvetica-Bold' },

    observaciones: { marginTop: 14 },
    textoObs: { fontSize: 8, color: '#374151', lineHeight: 1.5 },

    evidencia: { marginTop: 16 },
    plan: { marginTop: 16 },
    galeria: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    foto: { width: '47%' },
    imagen: {
      width: '100%', height: 130, objectFit: 'cover', borderRadius: 3,
      borderWidth: 0.5, borderColor: '#E4E4DF',
    },
    pieFoto: { fontSize: 7, fontFamily: 'Helvetica-Bold', marginTop: 3 },
    pieHallazgo: { fontSize: 6.8, color: '#9B1C1C', marginTop: 1, lineHeight: 1.4 },

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
