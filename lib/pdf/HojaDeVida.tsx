/**
 * HOJA DE VIDA PROFESIONAL
 * ---------------------------------------------------------------
 * Estructura de dos columnas: la estrecha con datos de contacto y
 * credenciales, la ancha con el recorrido. Es la disposición que usan
 * los CV que se leen en treinta segundos, que es el tiempo real que
 * un cliente le dedica.
 *
 * La sección de trayectoria va arriba y con cifras del sistema: no es
 * lo que el consultor dice de sí mismo, sino lo que puede demostrar
 * con actas firmadas.
 */
import {
  Document, Page, Text, View, Image, StyleSheet,
} from '@react-pdf/renderer';

export type DatosPerfil = {
  nombre: string;
  titulo: string | null;
  profesion: string | null;
  tarjetaProfesional: string | null;
  licenciaSst: string | null;
  vigenciaLicencia: string | null;
  correo: string | null;
  telefono: string | null;
  ciudad: string | null;
  resumen: string | null;
  foto: Buffer | null;
  firma: Buffer | null;

  formacion: Array<{ titulo: string; institucion: string; anio: string }>;
  experiencia: Array<{ cargo: string; empresa: string; periodo: string; detalle: string; logros?: string }>;
  certificaciones: Array<{ nombre: string; entidad: string; vigencia: string }>;

  trayectoria: {
    empresas: number;
    capacitaciones: number;
    personas: number;
    horas: number;
    temas: string[];
  } | null;

  colorPrimario: string;
  generadoEl: string;
};

export function HojaDeVida({ d }: { d: DatosPerfil }) {
  const s = estilos(d.colorPrimario);

  return (
    <Document title={`Hoja de vida — ${d.nombre}`} author={d.nombre}>
      <Page size="LETTER" style={s.pagina}>

        {/* ============ ENCABEZADO ============ */}
        <View style={s.encabezado}>
          {d.foto && <Image src={d.foto} style={s.foto} />}
          <View style={s.encabezadoTexto}>
            <Text style={s.nombre}>{d.nombre.toUpperCase()}</Text>
            {d.profesion && <Text style={s.profesion}>{d.profesion}</Text>}
            {d.titulo && <Text style={s.titulo}>{d.titulo}</Text>}
          </View>
        </View>

        <View style={s.regla} />

        {/* ============ DOS COLUMNAS ============ */}
        <View style={s.columnas}>

          {/* -------- Lateral -------- */}
          <View style={s.lateral}>
            <Text style={s.tituloLateral}>CONTACTO</Text>
            {d.correo && <Text style={s.itemLateral}>{d.correo}</Text>}
            {d.telefono && <Text style={s.itemLateral}>{d.telefono}</Text>}
            {d.ciudad && <Text style={s.itemLateral}>{d.ciudad}</Text>}

            {(d.tarjetaProfesional || d.licenciaSst) && (
              <>
                <Text style={s.tituloLateral}>CREDENCIALES</Text>
                {d.tarjetaProfesional && (
                  <>
                    <Text style={s.etiquetaLateral}>Tarjeta profesional</Text>
                    <Text style={s.itemLateral}>{d.tarjetaProfesional}</Text>
                  </>
                )}
                {d.licenciaSst && (
                  <>
                    <Text style={s.etiquetaLateral}>Licencia SST</Text>
                    <Text style={s.itemLateral}>{d.licenciaSst}</Text>
                    {d.vigenciaLicencia && (
                      <Text style={s.vigencia}>Vigente hasta {d.vigenciaLicencia}</Text>
                    )}
                  </>
                )}
              </>
            )}

            {d.certificaciones.length > 0 && (
              <>
                <Text style={s.tituloLateral}>CERTIFICACIONES</Text>
                {d.certificaciones.map((c, i) => (
                  <View key={i} style={s.bloqueLateral}>
                    <Text style={s.itemLateral}>{c.nombre}</Text>
                    <Text style={s.detalleLateral}>
                      {c.entidad}{c.vigencia ? ` · ${c.vigencia}` : ''}
                    </Text>
                  </View>
                ))}
              </>
            )}

            {d.formacion.length > 0 && (
              <>
                <Text style={s.tituloLateral}>FORMACIÓN</Text>
                {d.formacion.map((f, i) => (
                  <View key={i} style={s.bloqueLateral}>
                    <Text style={s.itemLateral}>{f.titulo}</Text>
                    <Text style={s.detalleLateral}>
                      {f.institucion}{f.anio ? ` · ${f.anio}` : ''}
                    </Text>
                  </View>
                ))}
              </>
            )}
          </View>

          {/* -------- Principal -------- */}
          <View style={s.principal}>
            {d.resumen && (
              <>
                <Text style={s.seccion}>PERFIL</Text>
                <Text style={s.parrafo}>{d.resumen}</Text>
              </>
            )}

            {/* Cifras del sistema: demostrables, no declarativas */}
            {d.trayectoria && d.trayectoria.capacitaciones > 0 && (
              <>
                <Text style={s.seccion}>TRAYECTORIA VERIFICABLE</Text>
                <View style={s.cifras}>
                  <Cifra s={s} v={String(d.trayectoria.capacitaciones)} e="CAPACITACIONES" />
                  <Cifra s={s} v={String(d.trayectoria.personas)} e="PERSONAS" />
                  <Cifra s={s} v={String(d.trayectoria.horas)} e="HORAS" />
                  <Cifra s={s} v={String(d.trayectoria.empresas)} e="EMPRESAS" />
                </View>
                <Text style={s.nota}>
                  Cifras respaldadas por actas de asistencia con firma digital,
                  disponibles para verificación.
                </Text>
              </>
            )}

            {d.experiencia.length > 0 && (
              <>
                <Text style={s.seccion}>EXPERIENCIA</Text>
                {d.experiencia.map((x, i) => (
                  <View key={i} style={s.bloqueExp} wrap={false}>
                    <Text style={s.cargo}>{x.cargo}</Text>
                    <Text style={s.empresa}>
                      {x.empresa}{x.periodo ? `  ·  ${x.periodo}` : ''}
                    </Text>
                    {x.detalle && <Text style={s.detalleExp}>{x.detalle}</Text>}
                    {x.logros && (
                      <View style={s.logros}>
                        {x.logros.split('\n')
                          .map((l) => l.trim())
                          .filter(Boolean)
                          .map((l, k) => (
                            <Text key={k} style={s.logro}>• {l}</Text>
                          ))}
                      </View>
                    )}
                  </View>
                ))}
              </>
            )}

            {d.firma && (
              <View style={s.bloqueFirma} wrap={false}>
                <Image src={d.firma} style={s.firma} />
                <View style={s.lineaFirma} />
                <Text style={s.nombreFirma}>{d.nombre.toUpperCase()}</Text>
                {d.profesion && <Text style={s.profesionFirma}>{d.profesion}</Text>}
                {/* El campo es licenciaSst; con `d.licencia` este bloque
                    nunca se pintaba y la licencia no salia bajo la firma. */}
                {d.licenciaSst && (
                  <Text style={s.licenciaFirma}>LICENCIA SST {d.licenciaSst}</Text>
                )}
              </View>
            )}

            {d.trayectoria && d.trayectoria.temas.length > 0 && (
              <>
                <Text style={s.seccion}>TEMAS DICTADOS</Text>
                <View style={s.temas}>
                  {d.trayectoria.temas.map((t, i) => (
                    <Text key={i} style={s.tema}>{t}</Text>
                  ))}
                </View>
              </>
            )}
          </View>
        </View>

        <Text
          style={s.pie}
          fixed
          render={({ pageNumber, totalPages }) =>
            `${d.nombre.toUpperCase()}   ·   HOJA DE VIDA   ·   ` +
            `ACTUALIZADA EL ${d.generadoEl}   ·   PÁGINA ${pageNumber} DE ${totalPages}`
          }
        />
      </Page>
    </Document>
  );
}

function Cifra({ s, v, e }: { s: any; v: string; e: string }) {
  return (
    <View style={s.cifra}>
      <Text style={s.cifraValor}>{v}</Text>
      <Text style={s.cifraEtiqueta}>{e}</Text>
    </View>
  );
}

function estilos(color: string) {
  return StyleSheet.create({
    pagina: {
      paddingTop: 34, paddingBottom: 44, paddingHorizontal: 36,
      fontSize: 9, fontFamily: 'Helvetica', color: '#14263F',
    },

    encabezado: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 12 },
    foto: { width: 62, height: 62, borderRadius: 31, objectFit: 'cover' },
    encabezadoTexto: { flex: 1 },
    nombre: { fontSize: 21, fontFamily: 'Helvetica-Bold', letterSpacing: -0.4 },
    profesion: { fontSize: 11, color, marginTop: 3, fontFamily: 'Helvetica-Bold' },
    titulo: { fontSize: 9, color: '#5B6470', marginTop: 2 },

    regla: { borderBottomWidth: 2, borderBottomColor: color, marginBottom: 16 },

    columnas: { flexDirection: 'row', gap: 24 },
    lateral: { width: 150 },
    principal: { flex: 1 },

    tituloLateral: {
      fontSize: 8, fontFamily: 'Helvetica-Bold', color,
      letterSpacing: 0.8, marginTop: 14, marginBottom: 6,
      borderBottomWidth: 0.5, borderBottomColor: '#DFDFD8', paddingBottom: 3,
    },
    etiquetaLateral: { fontSize: 6.8, color: '#8A929C', marginTop: 5 },
    itemLateral: { fontSize: 8, marginBottom: 2, lineHeight: 1.4 },
    detalleLateral: { fontSize: 7, color: '#5B6470', lineHeight: 1.4 },
    vigencia: { fontSize: 6.8, color: '#15803D', marginTop: 1 },
    bloqueLateral: { marginBottom: 7 },

    seccion: {
      fontSize: 9.5, fontFamily: 'Helvetica-Bold', color,
      letterSpacing: 0.5, marginTop: 14, marginBottom: 6,
      borderBottomWidth: 0.5, borderBottomColor: '#DFDFD8', paddingBottom: 3,
    },
    parrafo: { fontSize: 9, lineHeight: 1.55, color: '#3C4650', textAlign: 'justify' },

    cifras: { flexDirection: 'row', gap: 8, marginTop: 4 },
    cifra: { flex: 1, backgroundColor: '#F7F7F4', padding: 9, alignItems: 'center' },
    cifraValor: { fontSize: 15, fontFamily: 'Helvetica-Bold', color },
    cifraEtiqueta: { fontSize: 5.8, color: '#8A929C', marginTop: 2, letterSpacing: 0.3 },
    nota: { fontSize: 6.8, color: '#8A929C', marginTop: 6, lineHeight: 1.4 },

    bloqueExp: { marginBottom: 11 },
    cargo: { fontSize: 10, fontFamily: 'Helvetica-Bold' },
    empresa: { fontSize: 8, color, marginTop: 1 },
    detalleExp: { fontSize: 8.5, color: '#5B6470', marginTop: 3, lineHeight: 1.5 },

    logros: { marginTop: 3, paddingLeft: 4 },
  logro: { fontSize: 7.8, color: '#374151', lineHeight: 1.45, marginBottom: 1 },

  bloqueFirma: { marginTop: 22, alignItems: 'flex-start' },
  firma: { height: 42, maxWidth: 160, objectFit: 'contain', marginBottom: 2 },
  lineaFirma: {
    width: 175, borderBottomWidth: 0.8, borderBottomColor: '#9CA3AF', marginBottom: 4,
  },
  nombreFirma: { fontSize: 8.5, fontFamily: 'Helvetica-Bold' },
  profesionFirma: { fontSize: 7.5, color: '#6B7280' },
  licenciaFirma: { fontSize: 6.8, color: '#9CA3AF', marginTop: 1 },

  temas: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 3 },
    tema: {
      fontSize: 7.5, backgroundColor: '#F7F7F4', color: '#3C4650',
      paddingVertical: 3, paddingHorizontal: 8, borderRadius: 2,
    },

    pie: {
      position: 'absolute', bottom: 20, left: 36, right: 36,
      textAlign: 'center', fontSize: 6.2, color: '#A3AAB3',
    },
  });
}
