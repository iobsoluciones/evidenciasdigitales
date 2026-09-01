/**
 * PÁGINA PÚBLICA
 * ---------------------------------------------------------------
 * DIRECCIÓN DE DISEÑO: la página se construye como un documento
 * oficial, no como una landing de software. El bloque de control
 * documental —código, versión, vigencia— es el elemento estructural
 * que separa secciones, porque es exactamente lo que el producto
 * produce. Estructura que informa, no que decora.
 *
 * QUÉ CUENTA: hasta agosto de 2026 esta página vendía un registro de
 * asistencia a capacitaciones, que es lo que la aplicación era. Hoy es
 * el SG-SST completo, así que lo primero que tiene que hacer la página
 * es decir eso sin rodeos: qué es, qué cubre y qué se lleva el cliente.
 * Cada módulo que se nombra existe; cada norma que se cita es la que
 * ese módulo aplica. Una página comercial que promete de más se
 * desmonta en la primera demostración.
 *
 * Paleta: tinta #14263F, papel #F7F7F4, grafito #5B6470,
 * sello #6D3B8E (el violeta de los sellos de radicado, usado una
 * sola vez en toda la página).
 */
import Link from 'next/link';
import { crearClienteServidor } from '@/lib/supabase/servidor';

type Plan = {
  codigo: string;
  nombre: string;
  precio_mensual: number;
  max_empresas: number | null;
  max_usuarios: number | null;
  max_preguntas_evaluacion: number | null;
};

const TINTA = '#14263F';
const PAPEL = '#F7F7F4';
const GRAFITO = '#5B6470';
const SELLO = '#6D3B8E';
const LINEA = '#DFDFD8';

export default async function PaginaInicio() {
  const supabase = await crearClienteServidor();
  const { data } = await supabase
    .from('planes')
    .select('*')
    .eq('activo', true)
    .neq('codigo', 'prueba')
    .order('orden');

  const planes = (data ?? []) as Plan[];

  return (
    <main style={s.pagina}>
      {/* ================= CABECERA ================= */}
      <header style={s.cabecera}>
        <div style={s.marca}>
          <span style={s.marcaTexto}>Rúbrica</span>
          <span style={s.marcaMono}>SG-SST</span>
        </div>
        <nav style={s.nav}>
          <Link href="/login" style={s.enlaceNav}>Ingresar</Link>
          <Link href="/registro" style={s.botonNav}>Solicitar prueba</Link>
        </nav>
      </header>

      {/* ================= TESIS ================= */}
      <section style={s.hero}>
        <div style={s.heroTexto}>
          <p style={s.eyebrow}>Para consultores de SST · Varias empresas, un solo sistema</p>
          <h1 style={s.titular}>
            El SG-SST de tus clientes,<br />
            <span style={{ color: SELLO }}>con la firma puesta.</span>
          </h1>
          <p style={s.entrada}>
            Rúbrica administra el Sistema de Gestión de SST de todas las
            empresas que llevas: peligros, capacitaciones, dotación,
            inspecciones, accidentes, emergencias, permisos de alto riesgo y
            la autoevaluación de la Resolución 0312.
          </p>
          <p style={s.entrada}>
            <b>Cada cosa termina en un documento firmado.</b> Con el membrete
            de cada empresa, su código de control documental, y la firma
            pedida por enlace a quien tenga que darla — esté donde esté.
          </p>
          <div style={s.acciones}>
            <Link href="/registro" style={s.botonPrincipal}>Empezar con 14 días de prueba</Link>
            <Link href="#planes" style={s.botonSecundario}>Ver planes</Link>
          </div>
        </div>

        {/* -------- Firma: el acta como objeto -------- */}
        <div style={s.documento} aria-hidden="true">
          <div style={s.docCabecera}>
            <div style={s.docLogo} />
            <div style={s.docTitulo}>REPORTE DE ASISTENCIA A CAPACITACIÓN</div>
            <div style={s.docControl}>
              VERSIÓN: V1 · NOMENCLATURA: IOB-25-2026 · APROBADO POR: COORD. SST
            </div>
          </div>

          <div style={s.docCuerpo}>
            <div style={s.docDato}><b>TEMA:</b> MANEJO SEGURO DE MONTACARGAS</div>
            <div style={s.docDato}><b>INSTRUCTOR:</b> CARLOS RAMÍREZ</div>
            <div style={s.docDato}><b>PARTICIPACIÓN:</b> 24 DE 26 · 92%</div>
          </div>

          <table style={s.docTabla}>
            <thead>
              <tr>
                <th style={s.docTh}>NOMBRE</th>
                <th style={s.docTh}>ÁREA</th>
                <th style={s.docTh}>FIRMA</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['PEDRO GÓMEZ', 'BODEGA'],
                ['ANA TORRES', 'CALIDAD'],
                ['LUIS HERRERA', 'BODEGA'],
              ].map(([n, a]) => (
                <tr key={n}>
                  <td style={s.docTd}>{n}</td>
                  <td style={s.docTd}>{a}</td>
                  <td style={s.docTd}><Rubrica /></td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={s.docPie}>
            ID: MSDY1L3S · IOB-25-2026 · V1 · PÁGINA 1 DE 2
          </div>
        </div>
      </section>

      {/* ================= DIVISOR: bloque de control ================= */}
      <BloqueControl items={[
        ['ALCANCE', 'TODO EL SG-SST'],
        ['SOPORTE', 'PDF FIRMADO'],
        ['FIRMA', 'EN SITIO O POR ENLACE'],
        ['NORMA', 'DEC. 1072 · RES. 0312'],
      ]} />

      {/* ================= QUÉ ES ================= */}
      <section style={s.seccion}>
        <h2 style={s.h2}>En una frase</h2>
        <p style={s.frase}>
          Un consultor lleva ocho empresas. Rúbrica le da, para cada una, el
          sistema de gestión completo y la carpeta de evidencias que pide una
          visita del Ministerio o de la ARL.
        </p>
        <div style={s.dos}>
          <div>
            <p style={s.parrafo}>
              <b>Sin Rúbrica</b> son ocho carpetas de Excel, ocho formatos
              distintos y la misma conversación cada mes: dónde quedó el acta de
              marzo, quién firmó la entrega de dotación, si el examen de
              ingreso de ese trabajador está vigente.
            </p>
          </div>
          <div>
            <p style={s.parrafo}>
              <b>Con Rúbrica</b> cada empresa tiene su expediente vivo, y la
              primera pantalla te dice qué le falta a cada una, ordenado por
              gravedad. Los documentos existen antes de que alguien los pida.
            </p>
          </div>
        </div>
      </section>

      {/* ================= QUÉ CUBRE ================= */}
      <section style={{ ...s.seccion, borderTop: `1px solid ${LINEA}` }}>
        <h2 style={s.h2}>Qué cubre</h2>
        <p style={s.subtitulo}>
          Organizado por el ciclo PHVA, que es como lo recorre un auditor. Cada
          módulo termina en un documento o en un indicador obligatorio.
        </p>

        <div style={s.fases}>
          <Fase
            titulo="Planear"
            color="#2A6F97"
            items={[
              ['Matriz de peligros', 'GTC 45, con el riesgo calculado en la base'],
              ['Plan anual de trabajo', 'Cronograma de 12 meses, firmado por el empleador'],
              ['Matriz legal', 'Catálogo de normas editable e importable'],
              ['COPASST, convivencia y brigada', 'Con el validador de la composición que exige la norma'],
            ]}
          />
          <Fase
            titulo="Hacer"
            color="#1B5E4A"
            items={[
              ['Capacitaciones', 'Asistencia por QR, evaluación y acta firmada'],
              ['Dotación y EPP', 'Entrega, devolución, kardex y vencimientos'],
              ['Salud de los trabajadores', 'Exámenes, ausentismo y horas-hombre'],
              ['Emergencias', 'Análisis de amenazas y acta de simulacro'],
              ['Alto riesgo y contratistas', 'Permisos de alturas y espacios confinados'],
            ]}
          />
          <Fase
            titulo="Verificar"
            color="#B45309"
            items={[
              ['Inspecciones', 'Un criterio por pantalla, pensado para el celular'],
              ['Autoevaluación 0312', 'Puntaje, criterio de valoración e informe'],
              ['Indicadores del art. 30', 'Los seis de la norma, con su fórmula al lado'],
            ]}
          />
          <Fase
            titulo="Actuar"
            color="#7A3E9D"
            items={[
              ['Investigación de accidentes', 'Res. 1401, con el plazo de 15 días a la vista'],
              ['Plan de acción', 'Las acciones salen de los hallazgos, no se escriben aparte'],
              ['Rendición de cuentas', 'Cada responsable escribe lo suyo y firma'],
            ]}
          />
        </div>
      </section>

      {/* ================= POR QUÉ ES DISTINTO ================= */}
      <section style={{ ...s.seccion, borderTop: `1px solid ${LINEA}` }}>
        <h2 style={s.h2}>Por qué no es un archivador con formularios</h2>
        <p style={s.subtitulo}>
          Cuatro cosas que un Excel no puede hacer, y que son las que ahorran
          el trabajo de verdad.
        </p>

        <div style={s.dos}>
          <Medida
            titulo="Nadie persigue a nadie para firmar"
            texto="El gerente que aprueba el plan anual, el jefe de área que acompañó la inspección, el evaluador del simulacro, el trabajador en otra sede: cada uno recibe un enlace y firma desde su celular. Una firma virtual que obliga a juntar a la gente no ahorró nada frente al papel."
          />
          <Medida
            titulo="Te dice qué falta, sin que preguntes"
            texto="La primera pantalla reúne los pendientes de la empresa ordenados por gravedad: el accidente sin investigar antes que la inspección de la semana entrante. Y llega un resumen al correo los días hábiles, solo cuando hay algo urgente."
          />
          <Medida
            titulo="Cruza lo que en papel nadie cruza"
            texto="Al autorizar un permiso de trabajo en alturas, comprueba que cada ejecutante tenga examen médico vigente. Al retirar un empleado, exige el examen de egreso y lo saca de sus comités. En papel esas comprobaciones dependen de que alguien se acuerde."
          />
          <Medida
            titulo="Los catálogos son tuyos"
            texto="Los estándares mínimos y la matriz legal llegan cargados, pero se editan y se importan desde Excel. Cuando el Ministerio publica una resolución nueva no tienes que esperar a que nosotros la agreguemos."
          />
        </div>
      </section>

      {/* ================= DIVISOR ================= */}
      <BloqueControl items={[
        ['PLANES', 'TRES NIVELES'],
        ['PRUEBA', '14 DÍAS'],
        ['PERMANENCIA', 'SIN CLÁUSULA'],
        ['SOPORTE', 'BOGOTÁ, COLOMBIA'],
      ]} />

      {/* ================= PLANES ================= */}
      <section style={s.seccion} id="planes">
        <h2 style={s.h2}>Planes</h2>
        <p style={s.subtitulo}>
          Todos incluyen los módulos completos, los documentos en PDF y las
          firmas por enlace. Lo que cambia es cuántas empresas administras.
        </p>

        <div style={s.planes}>
          {planes.map((p) => (
            <div key={p.codigo} style={s.plan}>
              <div style={s.planCabecera}>
                <h3 style={s.planNombre}>{p.nombre}</h3>
                <div style={s.planPrecio}>
                  {p.precio_mensual > 0 ? (
                    <>
                      <span style={s.planCifra}>
                        ${p.precio_mensual.toLocaleString('es-CO')}
                      </span>
                      <span style={s.planMes}>/ mes</span>
                    </>
                  ) : (
                    <span style={s.planConvenir}>A convenir</span>
                  )}
                </div>
              </div>

              <dl style={s.planLista}>
                <Fila
                  k="Empresas a cargo"
                  v={p.max_empresas ? String(p.max_empresas) : 'Sin límite'}
                />
                <Fila k="Módulos del SG-SST" v="Todos" />
                <Fila k="Capacitaciones y documentos" v="Sin límite" />
                <Fila
                  k="Usuarios"
                  v={p.max_usuarios ? String(p.max_usuarios) : 'Sin límite'}
                />
                <Fila
                  k="Preguntas por evaluación"
                  v={p.max_preguntas_evaluacion ? String(p.max_preguntas_evaluacion) : 'Sin límite'}
                />
                <Fila k="Membrete propio por empresa" v="Sí" />
                <Fila k="Firma por enlace" v="Sí" />
                <Fila k="Reporte ejecutivo" v="Sí" />
              </dl>

              <Link href="/registro" style={s.planBoton}>Empezar</Link>
            </div>
          ))}
        </div>
      </section>

      {/* ================= PIE ================= */}
      <footer style={s.pie}>
        <div style={s.pieFila}>
          <div>
            <div style={s.marca}>
              <span style={{ ...s.marcaTexto, fontSize: 15 }}>Rúbrica</span>
              <span style={s.marcaMono}>SG-SST</span>
            </div>
            <p style={s.pieTexto}>
              Un producto de IOB Soluciones · Bogotá, Colombia
            </p>
          </div>
          <p style={s.pieLegal}>
            Tratamos datos personales conforme a la Ley 1581 de 2012.<br />
            Las firmas y documentos de identidad se almacenan cifrados y
            son accesibles únicamente por la organización que los recolecta.
          </p>
        </div>
      </footer>
    </main>
  );
}

/* ---------------------------------------------------------------
   Bloque de control documental usado como divisor entre secciones.
   Es el mismo dispositivo que encabeza cada acta: la estructura de
   la página repite la estructura del documento que produce.
   --------------------------------------------------------------- */
function BloqueControl({ items }: { items: Array<[string, string]> }) {
  return (
    <div style={s.control}>
      {items.map(([k, v]) => (
        <div key={k} style={s.controlItem}>
          <span style={s.controlClave}>{k}</span>
          <span style={s.controlValor}>{v}</span>
        </div>
      ))}
    </div>
  );
}

/** Rúbrica dibujada: sugiere una firma sin imitar ninguna real. */
function Rubrica() {
  return (
    <svg width="52" height="18" viewBox="0 0 52 18" fill="none">
      <path
        d="M2 13c4-8 7 2 10-3s5 4 8-1 5 3 9-2 6 4 11-1"
        stroke={TINTA}
        strokeWidth="1.3"
        strokeLinecap="round"
        opacity=".75"
      />
    </svg>
  );
}

/** Una fase del PHVA con sus módulos. El color es el mismo del menú. */
function Fase({
  titulo, color, items,
}: {
  titulo: string; color: string; items: Array<[string, string]>;
}) {
  return (
    <div style={{ ...s.fase, borderTopColor: color }}>
      <h3 style={{ ...s.faseTitulo, color }}>{titulo}</h3>
      <ul style={s.faseLista}>
        {items.map(([n, d]) => (
          <li key={n} style={s.faseItem}>
            <span style={s.faseNombre}>{n}</span>
            <span style={s.faseDetalle}>{d}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Medida({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div>
      <h3 style={s.medidaTitulo}>{titulo}</h3>
      <p style={s.medidaTexto}>{texto}</p>
    </div>
  );
}

function Fila({ k, v }: { k: string; v: string }) {
  return (
    <div style={s.planFila}>
      <dt style={s.planClave}>{k}</dt>
      <dd style={s.planValor}>{v}</dd>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  pagina: {
    background: PAPEL, color: TINTA, minHeight: '100vh',
    fontFamily: "'Inter','Segoe UI',Roboto,Helvetica,Arial,sans-serif",
    lineHeight: 1.55,
  },

  cabecera: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '20px 32px', maxWidth: 1120, margin: '0 auto',
    borderBottom: `1px solid ${LINEA}`, flexWrap: 'wrap', gap: 14,
  },
  marca: { display: 'flex', alignItems: 'baseline', gap: 6 },
  marcaTexto: { fontSize: 17, fontWeight: 700, letterSpacing: -0.3 },
  marcaMono: {
    fontSize: 10, fontFamily: 'ui-monospace,SFMono-Regular,Menlo,monospace',
    letterSpacing: 1.4, color: SELLO, border: `1px solid ${SELLO}`,
    padding: '1px 5px', borderRadius: 2,
  },
  nav: { display: 'flex', gap: 20, alignItems: 'center' },
  enlaceNav: { fontSize: 13.5, color: GRAFITO, textDecoration: 'none' },
  botonNav: {
    fontSize: 13, fontWeight: 600, color: '#fff', background: TINTA,
    padding: '9px 18px', textDecoration: 'none', borderRadius: 3,
  },

  hero: {
    maxWidth: 1120, margin: '0 auto', padding: '64px 32px 72px',
    display: 'grid', gridTemplateColumns: 'minmax(300px,1fr) minmax(280px,420px)',
    gap: 56, alignItems: 'start',
  },
  heroTexto: {},
  eyebrow: {
    fontSize: 10.5, letterSpacing: 1.3, textTransform: 'uppercase',
    color: GRAFITO, margin: '0 0 22px',
    fontFamily: 'ui-monospace,SFMono-Regular,Menlo,monospace',
  },
  titular: {
    fontSize: 46, lineHeight: 1.08, letterSpacing: -1.4,
    fontWeight: 700, margin: '0 0 22px',
  },
  entrada: { fontSize: 16, color: GRAFITO, maxWidth: 470, margin: '0 0 30px' },
  acciones: { display: 'flex', gap: 14, flexWrap: 'wrap' },
  botonPrincipal: {
    background: TINTA, color: '#fff', padding: '14px 24px',
    fontSize: 14, fontWeight: 600, textDecoration: 'none', borderRadius: 3,
  },
  botonSecundario: {
    color: TINTA, padding: '14px 4px', fontSize: 14, fontWeight: 500,
    textDecoration: 'none', borderBottom: `1px solid ${TINTA}`,
  },

  /* -------- El acta -------- */
  documento: {
    background: '#fff', border: `1px solid ${LINEA}`,
    boxShadow: '0 1px 2px rgba(20,38,63,.05), 0 12px 34px rgba(20,38,63,.07)',
    padding: '20px 18px 14px',
  },
  docCabecera: { textAlign: 'center', borderBottom: `1px solid ${LINEA}`, paddingBottom: 12 },
  docLogo: {
    width: 46, height: 16, background: '#E7E7E1', margin: '0 auto 10px', borderRadius: 2,
  },
  docTitulo: { fontSize: 10.5, fontWeight: 700, letterSpacing: .3, color: TINTA },
  docControl: {
    fontSize: 6.8, color: '#9AA1AA', marginTop: 5,
    fontFamily: 'ui-monospace,SFMono-Regular,Menlo,monospace',
  },
  docCuerpo: { padding: '12px 0' },
  docDato: { fontSize: 8, color: GRAFITO, marginBottom: 3 },
  docTabla: { width: '100%', borderCollapse: 'collapse' },
  docTh: {
    fontSize: 6.5, letterSpacing: .5, textAlign: 'left', color: '#fff',
    background: TINTA, padding: '5px 6px', fontWeight: 600,
  },
  docTd: {
    fontSize: 7.5, padding: '7px 6px', borderBottom: `1px solid #EFEFEA`, color: TINTA,
  },
  docPie: {
    fontSize: 6.2, color: '#A8AEB6', textAlign: 'center', marginTop: 12,
    paddingTop: 8, borderTop: `1px solid ${LINEA}`,
    fontFamily: 'ui-monospace,SFMono-Regular,Menlo,monospace',
  },

  /* -------- Divisor de control -------- */
  control: {
    borderTop: `1px solid ${TINTA}`, borderBottom: `1px solid ${TINTA}`,
    display: 'flex', maxWidth: 1120, margin: '0 auto',
  },
  controlItem: {
    flex: 1, padding: '13px 20px', borderRight: `1px solid ${LINEA}`,
    display: 'flex', flexDirection: 'column', gap: 3,
  },
  controlClave: {
    fontSize: 9, letterSpacing: 1, color: GRAFITO,
    fontFamily: 'ui-monospace,SFMono-Regular,Menlo,monospace',
  },
  controlValor: { fontSize: 12, fontWeight: 600, letterSpacing: -0.1 },

  /* -------- Secciones -------- */
  seccion: { maxWidth: 1120, margin: '0 auto', padding: '60px 32px' },
  h2: { fontSize: 27, letterSpacing: -0.7, margin: '0 0 6px', fontWeight: 700 },
  subtitulo: { fontSize: 14.5, color: GRAFITO, margin: '0 0 34px', maxWidth: 560 },
  dos: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 40, marginTop: 26 },
  tres: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 36 },
  parrafo: { fontSize: 15, color: GRAFITO, margin: '0 0 16px' },

  pasos: { listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 2 },
  paso: {
    display: 'grid', gridTemplateColumns: '58px 1fr', gap: 20,
    padding: '20px 0', borderTop: `1px solid ${LINEA}`, alignItems: 'start',
  },
  pasoNum: {
    fontSize: 12, color: SELLO, fontWeight: 600, paddingTop: 2,
    fontFamily: 'ui-monospace,SFMono-Regular,Menlo,monospace',
  },
  pasoTitulo: { fontSize: 16, margin: '0 0 5px', fontWeight: 600 },
  pasoTexto: { fontSize: 14, color: GRAFITO, margin: 0, maxWidth: 620 },

  frase: {
    fontSize: 19, lineHeight: 1.6, color: TINTA, margin: '0 0 30px',
    maxWidth: 720, fontWeight: 500,
  },

  fases: {
    display: 'grid', gap: 24,
    gridTemplateColumns: 'repeat(auto-fit,minmax(230px,1fr))',
  },
  fase: { borderTopWidth: 3, borderTopStyle: 'solid', paddingTop: 14 },
  faseTitulo: {
    fontSize: 11, fontWeight: 800, letterSpacing: 1.2,
    textTransform: 'uppercase', margin: '0 0 14px',
  },
  faseLista: { listStyle: 'none', padding: 0, margin: 0 },
  faseItem: {
    display: 'flex', flexDirection: 'column', gap: 2,
    padding: '9px 0', borderTop: `1px solid ${LINEA}`,
  },
  faseNombre: { fontSize: 13.5, fontWeight: 600 },
  faseDetalle: { fontSize: 12, color: GRAFITO, lineHeight: 1.5 },

  medidaTitulo: { fontSize: 15.5, margin: '0 0 8px', fontWeight: 600 },
  medidaTexto: { fontSize: 13.5, color: GRAFITO, margin: 0 },

  /* -------- Planes -------- */
  planes: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(270px,1fr))', gap: 20 },
  plan: {
    background: '#fff', border: `1px solid ${LINEA}`,
    display: 'flex', flexDirection: 'column', padding: 24,
  },
  planCabecera: { borderBottom: `1px solid ${LINEA}`, paddingBottom: 18, marginBottom: 18 },
  planNombre: { fontSize: 16, margin: '0 0 10px', fontWeight: 600 },
  planPrecio: { display: 'flex', alignItems: 'baseline', gap: 6 },
  planCifra: { fontSize: 30, fontWeight: 700, letterSpacing: -1 },
  planMes: { fontSize: 13, color: GRAFITO },
  planConvenir: { fontSize: 20, fontWeight: 600, color: GRAFITO },
  planLista: { margin: '0 0 22px', flex: 1 },
  planFila: {
    display: 'flex', justifyContent: 'space-between', gap: 12,
    padding: '7px 0', borderBottom: `1px solid #F0F0EB`, fontSize: 13,
  },
  planClave: { color: GRAFITO, margin: 0 },
  planValor: { margin: 0, fontWeight: 600, textAlign: 'right' },
  planBoton: {
    display: 'block', textAlign: 'center', background: TINTA, color: '#fff',
    padding: '12px', fontSize: 13.5, fontWeight: 600,
    textDecoration: 'none', borderRadius: 3,
  },

  /* -------- Pie -------- */
  pie: { borderTop: `1px solid ${TINTA}`, background: '#fff', marginTop: 40 },
  pieFila: {
    maxWidth: 1120, margin: '0 auto', padding: '34px 32px',
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 28,
  },
  pieTexto: { fontSize: 12.5, color: GRAFITO, margin: '10px 0 0' },
  pieLegal: { fontSize: 11.5, color: '#8A929C', margin: 0, lineHeight: 1.7 },
};
