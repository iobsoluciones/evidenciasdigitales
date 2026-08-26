/**
 * ENCABEZADO DE LOS DOCUMENTOS — diseño por empresa
 * ---------------------------------------------------------------
 * Cada empresa cliente suele tener aprobado su propio formato de
 * encabezado, y hasta ahora todos los documentos salían con el mismo:
 * logo centrado, título y una línea de control.
 *
 * Tres plantillas, no un editor libre: el consultor no quiere maquetar,
 * quiere parecerse al formato que su cliente ya tiene aprobado. La
 * "tabla" es la de tres celdas que usan casi todos los SG-SST
 * colombianos, y era imposible de reproducir antes.
 *
 * CONGELADO: la configuración se copia al emitir el documento, igual
 * que la nomenclatura y la versión. Rediseñar el encabezado no puede
 * cambiar el aspecto de un acta ya firmada.
 */
import { View, Text, Image, StyleSheet } from '@react-pdf/renderer';

export type CampoEncabezado = { etiqueta: string; valor: string };

export type PlantillaEncabezado = 'linea' | 'tabla' | 'lateral';

export type EncabezadoConfig = {
  plantilla?: PlantillaEncabezado;
  logo_posicion?: 'izquierda' | 'centro' | 'derecha';
  mostrar_nit?: boolean;
  mostrar_direccion?: boolean;
  mostrar_codigo?: boolean;
};

/** Config vacía = encabezado estándar, que es lo que ve el plan Básico. */
export const ENCABEZADO_ESTANDAR: Required<EncabezadoConfig> = {
  plantilla: 'linea',
  logo_posicion: 'centro',
  mostrar_nit: true,
  mostrar_direccion: true,
  mostrar_codigo: true,
};

export function normalizarEncabezado(c: EncabezadoConfig | null | undefined) {
  return { ...ENCABEZADO_ESTANDAR, ...(c ?? {}) };
}

export type DatosEncabezado = {
  config: EncabezadoConfig | null;
  logo: Buffer | null;
  titulo: string;
  nomenclatura: string;
  versionDoc: string;
  codigo?: string | null;
  campos: CampoEncabezado[];
  empresa: string;
  nit?: string | null;
  direccion?: string | null;
  color: string;
};

export function EncabezadoDoc({ d }: { d: DatosEncabezado }) {
  const c = normalizarEncabezado(d.config);
  const s = estilos(d.color);

  const extras = d.campos.map((x) => `${x.etiqueta}: ${x.valor}`);
  const control = [
    `VERSIÓN: ${d.versionDoc}`,
    `NOMENCLATURA: ${d.nomenclatura}`,
    ...(c.mostrar_codigo && d.codigo ? [`CÓDIGO: ${d.codigo}`] : []),
    ...extras,
  ].join('   •   ');

  const datosEmpresa = [
    c.mostrar_nit && d.nit ? `NIT ${d.nit}` : null,
    c.mostrar_direccion && d.direccion ? d.direccion : null,
  ].filter(Boolean).join('   •   ');

  /* ---------- Tabla de tres celdas (la típica de un SG-SST) ---------- */
  if (c.plantilla === 'tabla') {
    return (
      <View style={s.tabla}>
        <View style={s.celdaLogo}>
          {d.logo
            ? <Image src={d.logo} style={s.logoTabla} />
            : <Text style={s.sinLogo}>{d.empresa.toUpperCase()}</Text>}
        </View>

        <View style={s.celdaTitulo}>
          <Text style={s.tituloTabla}>{d.titulo.toUpperCase()}</Text>
          <Text style={s.empresaTabla}>{d.empresa.toUpperCase()}</Text>
          {datosEmpresa !== '' && <Text style={s.datosTabla}>{datosEmpresa}</Text>}
        </View>

        <View style={s.celdaControl}>
          {c.mostrar_codigo && d.codigo && (
            <Text style={s.lineaControl}>CÓDIGO: {d.codigo}</Text>
          )}
          <Text style={s.lineaControl}>NOMENCLATURA: {d.nomenclatura}</Text>
          <Text style={s.lineaControl}>VERSIÓN: {d.versionDoc}</Text>
          {d.campos.map((x) => (
            <Text key={x.etiqueta} style={s.lineaControl}>
              {x.etiqueta.toUpperCase()}: {x.valor}
            </Text>
          ))}
        </View>
      </View>
    );
  }

  /* ---------- Membrete lateral: logo a un lado, datos al otro ---------- */
  if (c.plantilla === 'lateral') {
    const logoIzquierda = c.logo_posicion !== 'derecha';
    const bloqueLogo = (
      <View style={s.lateralLogo} key="logo">
        {d.logo && <Image src={d.logo} style={s.logoLateral} />}
      </View>
    );
    const bloqueTexto = (
      <View style={s.lateralTexto} key="texto">
        <Text style={[s.tituloLateral, { textAlign: logoIzquierda ? 'right' : 'left' }]}>
          {d.titulo.toUpperCase()}
        </Text>
        <Text style={[s.empresaLateral, { textAlign: logoIzquierda ? 'right' : 'left' }]}>
          {d.empresa.toUpperCase()}
        </Text>
        {datosEmpresa !== '' && (
          <Text style={[s.datosLateral, { textAlign: logoIzquierda ? 'right' : 'left' }]}>
            {datosEmpresa}
          </Text>
        )}
        <Text style={[s.controlLateral, { textAlign: logoIzquierda ? 'right' : 'left' }]}>
          {control}
        </Text>
      </View>
    );

    return (
      <View style={s.lateral}>
        {logoIzquierda ? [bloqueLogo, bloqueTexto] : [bloqueTexto, bloqueLogo]}
      </View>
    );
  }

  /* ---------- Línea: el formato de siempre ---------- */
  const alineacion =
    c.logo_posicion === 'izquierda' ? 'flex-start'
    : c.logo_posicion === 'derecha' ? 'flex-end'
    : 'center';

  return (
    <View style={[s.linea, { alignItems: alineacion }]}>
      {d.logo && <Image src={d.logo} style={s.logoLinea} />}
      <Text style={s.tituloLinea}>{d.titulo}</Text>
      <Text style={s.controlLinea}>{control}</Text>
      {datosEmpresa !== '' && <Text style={s.datosLinea}>{datosEmpresa}</Text>}
    </View>
  );
}

const estilos = (color: string) => StyleSheet.create({
  // Línea
  linea: {
    borderBottomWidth: 1.2, borderBottomColor: color,
    paddingBottom: 8, marginBottom: 14,
  },
  logoLinea: { maxHeight: 40, maxWidth: 140, objectFit: 'contain', marginBottom: 8 },
  tituloLinea: {
    fontSize: 13, fontFamily: 'Helvetica-Bold', color, textAlign: 'center',
  },
  controlLinea: { fontSize: 7, color: '#5B6470', marginTop: 3, textAlign: 'center' },
  datosLinea: { fontSize: 7.5, color: '#5B6470', marginTop: 2, textAlign: 'center' },

  // Tabla de tres celdas
  tabla: {
    flexDirection: 'row', borderWidth: 1, borderColor: color,
    marginBottom: 14, minHeight: 54,
  },
  celdaLogo: {
    width: '22%', borderRightWidth: 1, borderRightColor: color,
    alignItems: 'center', justifyContent: 'center', padding: 5,
  },
  logoTabla: { maxHeight: 42, maxWidth: 95, objectFit: 'contain' },
  sinLogo: { fontSize: 7, fontFamily: 'Helvetica-Bold', color, textAlign: 'center' },
  celdaTitulo: {
    width: '52%', borderRightWidth: 1, borderRightColor: color,
    alignItems: 'center', justifyContent: 'center', padding: 6,
  },
  tituloTabla: {
    fontSize: 11, fontFamily: 'Helvetica-Bold', color, textAlign: 'center',
  },
  empresaTabla: { fontSize: 8, color: '#14263F', marginTop: 3, textAlign: 'center' },
  datosTabla: { fontSize: 6.5, color: '#5B6470', marginTop: 2, textAlign: 'center' },
  celdaControl: { width: '26%', justifyContent: 'center', padding: 6 },
  lineaControl: { fontSize: 6.5, color: '#5B6470', marginBottom: 1.5 },

  // Membrete lateral
  lateral: {
    flexDirection: 'row', alignItems: 'center',
    borderBottomWidth: 1.2, borderBottomColor: color,
    paddingBottom: 9, marginBottom: 14,
  },
  lateralLogo: { width: '28%', justifyContent: 'center' },
  logoLateral: { maxHeight: 46, maxWidth: 130, objectFit: 'contain' },
  lateralTexto: { width: '72%', justifyContent: 'center' },
  tituloLateral: { fontSize: 12.5, fontFamily: 'Helvetica-Bold', color },
  empresaLateral: { fontSize: 8.5, color: '#14263F', marginTop: 2 },
  datosLateral: { fontSize: 7, color: '#5B6470', marginTop: 1.5 },
  controlLateral: { fontSize: 6.5, color: '#5B6470', marginTop: 3 },
});
