/**
 * PÁGINA PÚBLICA
 * ---------------------------------------------------------------
 * DIRECCIÓN DE DISEÑO: la página se construye como un documento
 * oficial, no como una landing de software. El bloque de control
 * documental —código, versión, vigencia— es el elemento estructural
 * que separa secciones, porque es exactamente lo que el producto
 * produce. Estructura que informa, no que decora.
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
          <span style={s.marcaTexto}>Registro</span>
          <span style={s.marcaMono}>SST</span>
        </div>
        <nav style={s.nav}>
          <Link href="/login" style={s.enlaceNav}>Ingresar</Link>
          <Link href="/registro" style={s.botonNav}>Solicitar prueba</Link>
        </nav>
      </header>

      {/* ================= TESIS ================= */}
      <section style={s.hero}>
        <div style={s.heroTexto}>
          <p style={s.eyebrow}>Para consultores HSEQ · Varias empresas, un solo sistema</p>
          <h1 style={s.titular}>
            Ocho empresas a cargo,<br />
            <span style={{ color: SELLO }}>una sola</span> carpeta digital.
          </h1>
          <p style={s.entrada}>
            Cada cliente con su membrete, su nomenclatura y sus indicadores.
            Los asistentes escanean un código y firman en el celular; el acta
            queda armada al instante. Cuando llega la auditoría, el documento
            ya existe.
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
        ['ALCANCE', 'MULTIEMPRESA'],
        ['SOPORTE', 'PDF CON FIRMAS'],
        ['VIGENCIA', 'PERMANENTE'],
      ]} />

      {/* ================= LO QUE PASA HOY ================= */}
      <section style={s.seccion}>
        <h2 style={s.h2}>Lo que pasa hoy</h2>
        <div style={s.dos}>
          <div>
            <p style={s.parrafo}>
              Ocho empresas a cargo son ocho carpetas de Excel, ocho formatos
              distintos y ocho conversaciones al mes explicando dónde quedó el
              acta de la capacitación de marzo.
            </p>
            <p style={s.parrafo}>
              El instructor firma tres días después, o no firma. Cuando la ARL
              pide los soportes, aparecen actas incompletas, ilegibles o
              sencillamente perdidas.
            </p>
          </div>
          <div>
            <p style={s.parrafo}>
              Y hay una pregunta que nadie puede responder con hojas de papel:
              en qué áreas participa menos la gente, qué temas no quedaron
              claros, quién lleva dos años sin asistir a nada.
            </p>
            <p style={s.parrafo}>
              Esa información existe. Está en las hojas, dispersa y en un
              formato que no permite sumarla.
            </p>
          </div>
        </div>
      </section>

      {/* ================= EL FLUJO ================= */}
      <section style={{ ...s.seccion, borderTop: `1px solid ${LINEA}` }}>
        <h2 style={s.h2}>El flujo completo</h2>
        <p style={s.subtitulo}>
          Cuatro pasos en orden. Cada uno depende del anterior.
        </p>

        <ol style={s.pasos}>
          {[
            ['Se programa', 'Tema, instructor, horario y cuántas personas se esperan. El código del acta se genera solo, correlativo por año.'],
            ['Se comparte', 'Un código impreso en la sala o proyectado. Quien llega lo escanea con su celular; no instala nada.'],
            ['Se firma', 'Nombre, cargo, área y firma con el dedo. Si hay evaluación, la responde antes de enviar.'],
            ['Queda archivada', 'El acta en PDF con las firmas incrustadas, y el informe de resultados si hubo evaluación.'],
          ].map(([t, d], i) => (
            <li key={t} style={s.paso}>
              <span style={s.pasoNum}>{String(i + 1).padStart(2, '0')}</span>
              <div>
                <h3 style={s.pasoTitulo}>{t}</h3>
                <p style={s.pasoTexto}>{d}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* ================= LO QUE SE PUEDE MEDIR ================= */}
      <section style={{ ...s.seccion, borderTop: `1px solid ${LINEA}` }}>
        <h2 style={s.h2}>Lo que se puede medir después</h2>
        <div style={s.tres}>
          <Medida
            titulo="Participación real"
            texto="Cuántos asistieron sobre cuántos se esperaban, por capacitación y acumulado. Ponderado, no promediado: una sesión de 50 personas no pesa igual que una de 2."
          />
          <Medida
            titulo="Dónde falla el aprendizaje"
            texto="Si la capacitación se evalúa, cada pregunta lleva un subtema. El informe ordena los subtemas de peor a mejor: lo primero de la lista es lo que hay que reforzar."
          />
          <Medida
            titulo="Quién no está llegando"
            texto="Distribución por área y por ciudad, y el listado de personas ordenado por número de capacitaciones asistidas."
          />
        </div>
      </section>

      {/* ================= DIVISOR ================= */}
      <BloqueControl items={[
        ['PLANES', 'TRES NIVELES'],
        ['PRUEBA', '14 DÍAS'],
        ['PERMANENCIA', 'SIN CLÁUSULA'],
      ]} />

      {/* ================= PLANES ================= */}
      <section style={s.seccion} id="planes">
        <h2 style={s.h2}>Planes</h2>
        <p style={s.subtitulo}>
          Todos incluyen capacitaciones ilimitadas, actas en PDF, evaluaciones
          y reporte ejecutivo. Lo que cambia es cuántas empresas administras.
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
                <Fila k="Capacitaciones" v="Sin límite" />
                <Fila
                  k="Usuarios"
                  v={p.max_usuarios ? String(p.max_usuarios) : 'Sin límite'}
                />
                <Fila
                  k="Preguntas por evaluación"
                  v={p.max_preguntas_evaluacion ? String(p.max_preguntas_evaluacion) : 'Sin límite'}
                />
                <Fila k="Membrete propio por empresa" v="Sí" />
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
              <span style={{ ...s.marcaTexto, fontSize: 15 }}>Registro</span>
              <span style={s.marcaMono}>SST</span>
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
