/**
 * PIEZAS GRÁFICAS DEL MANUAL
 * ---------------------------------------------------------------
 * El manual se dibuja, no se fotografía. Una captura de pantalla
 * envejece con el primer cambio de estilo y hay que rehacerla módulo
 * por módulo; un esquema muestra la ESTRUCTURA de la pantalla (dónde
 * está el botón, qué columna es cuál) y sigue siendo cierto aunque
 * cambien los colores.
 *
 * Son componentes de presentación puros: sin estado, sin 'use client'.
 */

const AZUL = 'var(--marca)';
const GRIS = 'var(--texto-suave)';
const BORDE = 'var(--borde)';
const FONDO = 'var(--fondo)';

/* ---------------------------------------------------------------- *
 *  Ventana: el marco de una pantalla del sistema
 * ---------------------------------------------------------------- */

export function Ventana({
  titulo,
  menu = true,
  children,
}: {
  titulo: string;
  /** Muestra la franja del menú lateral. */
  menu?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div style={f.ventana}>
      <div style={f.ventanaBarra}>
        <span style={{ ...f.punto, background: '#F0A8A0' }} />
        <span style={{ ...f.punto, background: '#F2D08A' }} />
        <span style={{ ...f.punto, background: '#A8D5B5' }} />
        <span style={f.ventanaTitulo}>{titulo}</span>
      </div>
      <div style={{ display: 'flex', minHeight: 150 }}>
        {menu && (
          <div style={f.menu}>
            <div style={{ ...f.menuItem, background: '#2A3C55' }} />
            <div style={f.menuItem} />
            <div style={f.menuItem} />
            <div style={f.menuItem} />
            <div style={f.menuItem} />
          </div>
        )}
        <div style={f.lienzo}>{children}</div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- *
 *  Bloques que se colocan dentro de una Ventana
 * ---------------------------------------------------------------- */

/** Título de sección dentro de la pantalla esquematizada. */
export function Titulo({ children, marca }: { children: React.ReactNode; marca?: number }) {
  return (
    <div style={f.tituloFila}>
      <span style={f.tituloTexto}>{children}</span>
      {marca !== undefined && <Marca n={marca} />}
    </div>
  );
}

/** Barra gris: representa un texto cualquiera. */
export function Linea({ ancho = 100, alto = 8 }: { ancho?: number; alto?: number }) {
  return <div style={{ width: `${ancho}%`, height: alto, borderRadius: 4, background: 'var(--superficie-3)' }} />;
}

export function Fila({
  children,
  gap = 8,
  justificar = 'flex-start',
  margen = 0,
}: {
  children: React.ReactNode;
  gap?: number;
  justificar?: React.CSSProperties['justifyContent'];
  margen?: number;
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap,
      justifyContent: justificar, marginTop: margen, flexWrap: 'wrap',
    }}>
      {children}
    </div>
  );
}

/** Botón de acento. `fantasma` lo dibuja como secundario. */
export function Boton({
  children, color = AZUL, fantasma = false, marca,
}: {
  children: React.ReactNode; color?: string; fantasma?: boolean; marca?: number;
}) {
  return (
    <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      <span style={{
        ...f.boton,
        background: fantasma ? 'var(--superficie)' : 'var(--marca)',
        color: fantasma ? color : 'var(--sobre-marca)',
        border: `1px solid ${fantasma ? BORDE : color}`,
      }}>
        {children}
      </span>
      {marca !== undefined && <Marca n={marca} pegado />}
    </span>
  );
}

export function Campo({ etiqueta, valor, marca }: { etiqueta: string; valor?: string; marca?: number }) {
  return (
    <div style={{ flex: '1 1 120px', minWidth: 100 }}>
      <div style={f.campoEtiqueta}>
        {etiqueta}
        {marca !== undefined && <Marca n={marca} pegado />}
      </div>
      <div style={f.campoCaja}>{valor ?? ''}</div>
    </div>
  );
}

export function Tarjeta({
  titulo, dato, pie, color = AZUL, marca,
}: {
  titulo: string; dato?: string; pie?: string; color?: string; marca?: number;
}) {
  return (
    <div style={{ ...f.tarjeta, borderTop: `3px solid ${color}` }}>
      <div style={f.tarjetaTitulo}>
        {titulo}
        {marca !== undefined && <Marca n={marca} pegado />}
      </div>
      {dato && <div style={{ ...f.tarjetaDato, color: 'var(--marca-empresa)' }}>{dato}</div>}
      {pie && <div style={f.tarjetaPie}>{pie}</div>}
    </div>
  );
}

/** Tabla esquemática. La primera fila es el encabezado. */
export function Tabla({
  columnas, filas, marca,
}: {
  columnas: string[]; filas: (string | number)[][]; marca?: number;
}) {
  return (
    <div style={{ position: 'relative', overflowX: 'auto' }}>
      {marca !== undefined && (
        <div style={{ position: 'absolute', right: 0, top: -4 }}><Marca n={marca} /></div>
      )}
      <table style={f.tabla}>
        <thead>
          <tr>
            {columnas.map((c, i) => (
              <th key={i} style={f.th}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.map((fila, i) => (
            <tr key={i}>
              {fila.map((celda, j) => (
                <td key={j} style={f.td}>{celda}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Etiqueta de estado, con el mismo código de color que la aplicación. */
export function Estado({ texto, tono }: { texto: string; tono: 'ok' | 'aviso' | 'mal' | 'neutro' }) {
  const tonos = {
    ok: { background: 'var(--bien-fondo)', color: 'var(--bien)' },
    aviso: { background: 'var(--aviso-fondo)', color: 'var(--aviso)' },
    mal: { background: 'var(--mal-fondo)', color: 'var(--mal)' },
    neutro: { background: 'var(--superficie-3)', color: GRIS },
  } as const;
  return <span style={{ ...f.estado, ...tonos[tono] }}>{texto}</span>;
}

/** Círculo numerado que enlaza la figura con la lista de pasos. */
export function Marca({ n, pegado = false }: { n: number; pegado?: boolean }) {
  return (
    <span style={{ ...f.marca, marginLeft: pegado ? 6 : 0 }} aria-label={`Punto ${n}`}>
      {n}
    </span>
  );
}

/* ---------------------------------------------------------------- *
 *  Diagramas
 * ---------------------------------------------------------------- */

/**
 * Flujo horizontal con flechas. En pantallas estrechas se apila solo,
 * por eso las flechas van en un elemento aparte y no dibujadas encima.
 */
export function Flujo({
  pasos, color = AZUL,
}: {
  pasos: { titulo: string; detalle?: string }[]; color?: string;
}) {
  return (
    <div style={f.flujo}>
      {pasos.map((p, i) => (
        <div key={i} style={f.flujoGrupo}>
          <div style={{ ...f.flujoCaja, borderColor: 'var(--marca)' }}>
            <div style={{ ...f.flujoNumero, background: 'var(--marca)' }}>{i + 1}</div>
            <div style={f.flujoTitulo}>{p.titulo}</div>
            {p.detalle && <div style={f.flujoDetalle}>{p.detalle}</div>}
          </div>
          {i < pasos.length - 1 && <span style={{ ...f.flecha, color: 'var(--marca-empresa)' }}>→</span>}
        </div>
      ))}
    </div>
  );
}

/**
 * Diagrama de decisión: una condición y sus dos salidas.
 * Se usa para las reglas que la gente suele entender al revés
 * (un ítem crítico incumplido reprueba aunque el puntaje sea alto).
 */
export function Decision({
  pregunta, si, no, colorSi = 'var(--bien)', colorNo = 'var(--mal)',
}: {
  pregunta: string; si: string; no: string; colorSi?: string; colorNo?: string;
}) {
  return (
    <div style={f.decision}>
      <div style={f.decisionPregunta}>{pregunta}</div>
      <div style={f.decisionSalidas}>
        <div style={{ ...f.decisionSalida, borderLeft: `3px solid ${colorSi}` }}>
          <span style={{ ...f.decisionEtiqueta, color: colorSi }}>Sí</span>
          <span>{si}</span>
        </div>
        <div style={{ ...f.decisionSalida, borderLeft: `3px solid ${colorNo}` }}>
          <span style={{ ...f.decisionEtiqueta, color: colorNo }}>No</span>
          <span>{no}</span>
        </div>
      </div>
    </div>
  );
}

/** Jerarquía de tres niveles (cuenta → empresas → personal). */
export function Jerarquia({
  raiz, hijos, nietos,
}: {
  raiz: string; hijos: string[]; nietos?: string;
}) {
  return (
    <div style={f.jerarquia}>
      <div style={{ ...f.nodo, background: AZUL, color: 'var(--superficie)', borderColor: AZUL }}>{raiz}</div>
      <div style={{ ...f.flecha, color: GRIS, transform: 'rotate(90deg)', margin: '2px 0' }}>→</div>
      <div style={f.nodoFila}>
        {/* key por posición: dos ramas pueden llamarse igual. */}
        {hijos.map((h, i) => (
          <div key={i} style={f.nodoRama}>
            <div style={f.nodo}>{h}</div>
            {nietos && (
              <>
                <div style={{ ...f.flecha, color: GRIS, transform: 'rotate(90deg)', fontSize: 14 }}>→</div>
                <div style={{ ...f.nodo, ...f.nodoHoja }}>{nietos}</div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- *
 *  Texto del manual
 * ---------------------------------------------------------------- */

/** Figura + su lista de puntos numerados. */
export function Figura({
  children, pasos, pie,
}: {
  children: React.ReactNode;
  pasos?: string[];
  pie?: string;
}) {
  return (
    <figure style={f.figura}>
      {children}
      {pasos && pasos.length > 0 && (
        <ol style={f.pasos}>
          {pasos.map((p, i) => (
            <li key={i} style={f.paso}>
              <Marca n={i + 1} />
              <span dangerouslySetInnerHTML={{ __html: negritas(p) }} />
            </li>
          ))}
        </ol>
      )}
      {pie && <figcaption style={f.pie}>{pie}</figcaption>}
    </figure>
  );
}

/** Caja de regla: el "por qué" detrás de un comportamiento. */
export function Regla({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div style={f.regla}>
      <div style={f.reglaTitulo}>{titulo}</div>
      <div style={f.reglaTexto}>{children}</div>
    </div>
  );
}

/** Caja de advertencia para los errores que la gente comete de verdad. */
export function Ojo({ children }: { children: React.ReactNode }) {
  return (
    <div style={f.ojo}>
      <span style={f.ojoIcono}>!</span>
      <div>{children}</div>
    </div>
  );
}

/** Convierte *texto* en negrita. Evita meter JSX en cada paso. */
function negritas(t: string): string {
  return t
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/\*([^*]+)\*/g, '<strong>$1</strong>');
}

/* ---------------------------------------------------------------- */

const f: Record<string, React.CSSProperties> = {
  ventana: {
    border: `1px solid ${BORDE}`, borderRadius: 8, overflow: 'hidden',
    background: 'var(--superficie)', boxShadow: '0 1px 3px rgba(20,38,63,.06)',
  },
  ventanaBarra: {
    display: 'flex', alignItems: 'center', gap: 6,
    background: FONDO, borderBottom: `1px solid ${BORDE}`, padding: '7px 11px',
  },
  punto: { width: 8, height: 8, borderRadius: '50%', display: 'inline-block' },
  ventanaTitulo: { marginLeft: 8, fontSize: 11, color: GRIS, letterSpacing: .3 },
  menu: {
    width: 54, background: AZUL, padding: '12px 8px',
    display: 'flex', flexDirection: 'column', gap: 7, flexShrink: 0,
  },
  menuItem: { height: 7, borderRadius: 3, background: '#3A4C64' },
  lienzo: { flex: 1, minWidth: 0, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 11 },

  tituloFila: { display: 'flex', alignItems: 'center', gap: 8 },
  tituloTexto: { fontSize: 13, fontWeight: 700, color: AZUL },

  boton: {
    display: 'inline-block', padding: '5px 11px', borderRadius: 7,
    fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap',
  },
  campoEtiqueta: { fontSize: 10, color: GRIS, marginBottom: 3, display: 'flex', alignItems: 'center' },
  campoCaja: {
    border: `1px solid ${BORDE}`, borderRadius: 6, background: 'var(--superficie)',
    padding: '6px 8px', fontSize: 11, color: AZUL, minHeight: 14,
  },

  tarjeta: {
    flex: '1 1 110px', minWidth: 95, border: `1px solid ${BORDE}`,
    borderRadius: 8, padding: '9px 10px', background: 'var(--superficie)',
  },
  tarjetaTitulo: { fontSize: 10, color: GRIS, display: 'flex', alignItems: 'center' },
  tarjetaDato: { fontSize: 19, fontWeight: 700, marginTop: 3, lineHeight: 1.1 },
  tarjetaPie: { fontSize: 9.5, color: GRIS, marginTop: 3 },

  tabla: { width: '100%', borderCollapse: 'collapse', fontSize: 11 },
  th: {
    textAlign: 'left', padding: '6px 8px', background: FONDO, color: GRIS,
    fontSize: 10, fontWeight: 700, borderBottom: `1px solid ${BORDE}`,
    textTransform: 'uppercase', letterSpacing: .3, whiteSpace: 'nowrap',
  },
  td: { padding: '6px 8px', borderBottom: `1px solid ${BORDE}`, color: AZUL, whiteSpace: 'nowrap' },

  estado: {
    display: 'inline-block', padding: '2px 8px', borderRadius: 20,
    fontSize: 10, fontWeight: 700,
  },
  marca: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: 17, height: 17, borderRadius: '50%', background: '#C2410C',
    color: 'var(--sobre-marca)', fontSize: 10.5, fontWeight: 700, flexShrink: 0,
  },

  flujo: { display: 'flex', flexWrap: 'wrap', alignItems: 'stretch', gap: 4 },
  flujoGrupo: { display: 'flex', alignItems: 'center', gap: 4, flex: '1 1 150px' },
  flujoCaja: {
    flex: 1, border: '1px solid', borderRadius: 8, background: 'var(--superficie)',
    padding: '10px 11px', minWidth: 120,
  },
  flujoNumero: {
    width: 19, height: 19, borderRadius: '50%', color: 'var(--sobre-marca)',
    fontSize: 11, fontWeight: 700, display: 'flex',
    alignItems: 'center', justifyContent: 'center', marginBottom: 6,
  },
  flujoTitulo: { fontSize: 12, fontWeight: 700, color: AZUL, lineHeight: 1.35 },
  flujoDetalle: { fontSize: 11, color: GRIS, marginTop: 3, lineHeight: 1.45 },
  flecha: { fontSize: 17, flexShrink: 0 },

  decision: { border: `1px solid ${BORDE}`, borderRadius: 8, overflow: 'hidden', background: 'var(--superficie)' },
  decisionPregunta: {
    padding: '11px 14px', background: FONDO, fontSize: 12.5,
    fontWeight: 700, color: AZUL, borderBottom: `1px solid ${BORDE}`,
  },
  decisionSalidas: { display: 'flex', flexWrap: 'wrap' },
  decisionSalida: {
    flex: '1 1 190px', padding: '11px 14px', fontSize: 12,
    color: AZUL, display: 'flex', gap: 9, lineHeight: 1.5,
  },
  decisionEtiqueta: { fontWeight: 700, flexShrink: 0 },

  jerarquia: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 },
  nodoFila: { display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' },
  nodoRama: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 },
  nodo: {
    border: `1px solid ${BORDE}`, borderRadius: 8, background: 'var(--superficie)',
    padding: '7px 13px', fontSize: 11.5, fontWeight: 600, color: AZUL,
    textAlign: 'center', whiteSpace: 'nowrap',
  },
  nodoHoja: { background: FONDO, fontWeight: 400, color: GRIS },

  figura: { margin: '18px 0 0' },
  pasos: { listStyle: 'none', margin: '14px 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: 9 },
  paso: { display: 'flex', gap: 10, fontSize: 13.5, color: AZUL, lineHeight: 1.55, alignItems: 'flex-start' },
  pie: { fontSize: 11.5, color: GRIS, marginTop: 10, fontStyle: 'italic' },

  regla: {
    border: `1px solid ${BORDE}`, borderLeft: '3px solid #14263F',
    borderRadius: 8, background: FONDO, padding: '12px 15px', margin: '18px 0 0',
  },
  reglaTitulo: { fontSize: 12.5, fontWeight: 700, color: AZUL, marginBottom: 5 },
  reglaTexto: { fontSize: 13, color: 'var(--texto-suave)', lineHeight: 1.6 },

  ojo: {
    display: 'flex', gap: 11, alignItems: 'flex-start',
    background: 'var(--aviso-fondo)', border: '1px solid var(--aviso)', borderRadius: 8,
    padding: '12px 15px', margin: '18px 0 0', fontSize: 13,
    color: 'var(--aviso)', lineHeight: 1.6,
  },
  ojoIcono: {
    width: 19, height: 19, borderRadius: '50%', background: '#C2410C', color: 'var(--superficie)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 12, fontWeight: 700, flexShrink: 0, marginTop: 1,
  },
};
