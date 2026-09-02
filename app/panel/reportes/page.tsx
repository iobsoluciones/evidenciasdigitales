/**
 * PANEL DE REPORTES
 * ---------------------------------------------------------------
 * Reúne los reportes de nivel EMPRESA. Los que dependen de una
 * capacitación concreta —el acta y el informe de evaluación— siguen
 * en su capacitación: desde aquí habría que buscar cuál, y ya la
 * tenías delante cuando la abriste.
 */
import Link from 'next/link';
import { empresaActiva } from '@/lib/empresa-activa';
import { obtenerPerfil } from '@/lib/sesion';
import AccionesEjecutivo from '../indicadores/AccionesEjecutivo';
import { listarArticulosKardex } from '@/lib/acciones-kardex';
import BloqueKardex from './BloqueKardex';

export default async function PaginaReportes() {
  const perfil = await obtenerPerfil();
  const empresa = await empresaActiva();
  if (!perfil) return null;

  if (!empresa) {
    return (
      <div style={s.vacio}>
        <p style={{ margin: '0 0 14px', fontSize: 14 }}>
          Agrega una empresa para generar reportes.
        </p>
        <Link href="/panel/empresas/nueva" style={s.btn}>Agregar empresa</Link>
      </div>
    );
  }

  const hoy = new Date();
  const desde = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
    .toISOString().slice(0, 10);
  const hasta = new Date(hoy.getFullYear(), hoy.getMonth() + 2, 0)
    .toISOString().slice(0, 10);

  const anio = hoy.getFullYear();
  const color = empresa.color_primario;
  const articulosKardex = await listarArticulosKardex();

  return (
    <>
      <h1 style={s.titulo}>Reportes</h1>
      <p style={s.sub}>
        Documentos de <strong>{empresa.nombre}</strong>. Los que dependen de un
        registro concreto —el acta de una capacitación, el informe de una
        inspección, el permiso de un trabajo— se descargan desde ese registro;
        aquí están los de la empresa entera.
      </p>

      {/* ---------- Ejecutivo ---------- */}
      <AccionesEjecutivo
        empresaId={empresa.id}
        empresaNombre={empresa.nombre}
        correoContacto={empresa.correo}
        color={color}
      />

      {/* Los reportes van agrupados como el menú, por fase del ciclo: se
          busca el reporte donde se busca el módulo que lo produce. */}

      <Seccion
        titulo="Del sistema completo"
        texto="Lo que se entrega cuando piden «el SG-SST» sin más."
      />
      <div style={s.grid}>
        <Tarjeta
          titulo="Indicadores del artículo 30"
          texto="Los seis indicadores que exige el Decreto 1072, cada uno con su fórmula, su numerador y su denominador impresos al lado. Si faltan meses de horas-hombre, el informe lo advierte en vez de dar un cero limpio."
          acciones={[
            { texto: 'PDF ' + anio, href: '/api/pdf-indicadores/' + empresa.id + '?anio=' + anio, principal: true },
            { texto: 'PDF ' + (anio - 1), href: '/api/pdf-indicadores/' + empresa.id + '?anio=' + (anio - 1) },
          ]}
          color={color}
        />

        <Tarjeta
          titulo="Personal"
          texto="Activos y retirados en hojas separadas, con su área, su cargo y su participación en formación. Es el anexo del plan anual y el número que decide la composición del COPASST."
          acciones={[{ texto: 'Descargar Excel', href: '/api/excel/personal', principal: true }]}
          color="var(--bien)"
        />

        <Tarjeta
          titulo="Bitácora de envíos"
          texto="Registro de los correos enviados desde la aplicación. Sirve como soporte de que el documento se remitió y a quién."
          acciones={[{ texto: 'Ver envíos', href: '/panel/envios', principal: true }]}
          color={color}
        />
      </div>

      <Seccion
        titulo="Planear"
        texto="Lo que hay que tener escrito antes de ejecutar nada."
      />
      <div style={s.grid}>
        <Tarjeta
          titulo="Matriz de peligros"
          texto="La identificación GTC 45 completa: valoración, nivel, aceptabilidad y la jerarquía de controles. Los números salen tal cual los calcula la base, así que el archivo dice lo mismo que la pantalla."
          acciones={[{ texto: 'Descargar Excel', href: '/api/excel/peligros', principal: true }]}
          color="var(--bien)"
        />

        <Tarjeta
          titulo="Cronograma"
          texto="Capacitaciones programadas y realizadas en el periodo, con su estado."
          acciones={[
            { texto: 'Descargar PDF', href: '/api/pdf-cronograma/' + empresa.id + '?desde=' + desde + '&hasta=' + hasta, principal: true },
            { texto: 'Ver calendario', href: '/panel/calendario' },
          ]}
          color={color}
        />

        <Tarjeta
          titulo="Plan anual y matriz legal"
          texto="Los dos salen en PDF desde su propia pantalla, porque cada uno pertenece a un año y a una versión concretos."
          acciones={[
            { texto: 'Plan anual', href: '/panel/plan-anual', principal: true },
            { texto: 'Matriz legal', href: '/panel/matriz-legal' },
          ]}
          color={color}
        />
      </div>

      <Seccion
        titulo="Hacer"
        texto="La operación del día a día, que es donde se producen las evidencias."
      />
      <div style={s.grid}>
        <Tarjeta
          titulo="Salud de los trabajadores"
          texto="Exámenes médicos con su vigencia, ausentismo con su origen y la rejilla de horas-hombre. Solo concepto de aptitud y restricciones: el diagnóstico es reservado y no sale del consultorio."
          acciones={[
            { texto: 'Excel ' + anio, href: '/api/excel/salud?anio=' + anio, principal: true },
            { texto: 'Excel ' + (anio - 1), href: '/api/excel/salud?anio=' + (anio - 1) },
          ]}
          color="var(--bien)"
        />

        <Tarjeta
          titulo="Contratistas y alto riesgo"
          texto="Contratistas con la fecha en que vence cada soporte, y los permisos de trabajo emitidos con su vigencia y sus firmas pendientes."
          acciones={[{ texto: 'Descargar Excel', href: '/api/excel/alto-riesgo', principal: true }]}
          color="var(--bien)"
        />

        <Tarjeta
          titulo="Matrices por empleado"
          texto="Quién recibió qué formación y quién tiene su dotación al día. Cada libro trae la rejilla y una hoja plana para filtrar y cruzar."
          acciones={[
            { texto: 'Capacitaciones (Excel)', href: '/api/excel/matriz-capacitaciones', principal: true },
            { texto: 'Dotación (Excel)', href: '/api/excel/matriz-dotacion' },
          ]}
          color="var(--bien)"
        />

        <Tarjeta
          titulo="Capacitaciones"
          texto="Capacitaciones, participantes y resumen por persona en un solo libro."
          acciones={[{ texto: 'Descargar Excel', href: '/api/excel/todo', principal: true }]}
          color="var(--bien)"
        />
      </div>

      <Seccion
        titulo="Verificar y actuar"
        texto="Lo que se revisó, lo que falló y lo que se hizo al respecto."
      />
      <div style={s.grid}>
        <Tarjeta
          titulo="Inspecciones y plan de acción"
          texto="Inspecciones con su veredicto, los hallazgos criterio por criterio y el estado de cada acción correctiva."
          acciones={[
            { texto: 'Descargar Excel', href: '/api/excel/inspecciones', principal: true },
            { texto: 'Ver indicadores', href: '/panel/inspecciones/indicadores' },
          ]}
          color="var(--bien)"
        />

        <Tarjeta
          titulo="Accidentalidad"
          texto="Todos los eventos con sus días de incapacidad y, sobre todo, las dos columnas que mira la ARL: si se reportó a tiempo y si la investigación sigue dentro de los 15 días."
          acciones={[{ texto: 'Descargar Excel', href: '/api/excel/accidentalidad', principal: true }]}
          color="var(--bien)"
        />

        <Tarjeta
          titulo="Autoevaluación de estándares"
          texto="El informe con el puntaje y el criterio de valoración sale desde la autoevaluación del año, que es la que lleva su propia versión."
          acciones={[{ texto: 'Ir a autoevaluación', href: '/panel/autoevaluacion', principal: true }]}
          color={color}
        />
      </div>

      {/* ---------- Kardex, al final ---------- */}
      {/* Es el unico que exige elegir un articulo antes de descargar:
          arriba obligaba a pasar por un formulario para llegar a los
          reportes de un clic. */}
      <BloqueKardex articulos={articulosKardex} color={color} />

      <p style={s.nota}>
        Los reportes se generan en el momento de descargarlos: siempre
        reflejan los datos actuales y no ocupan almacenamiento.
      </p>
    </>
  );
}

/** Encabezado de grupo. Los reportes se agrupan como el menú para que no
 *  haya que aprenderse dos ordenaciones distintas. */
function Seccion({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div style={s.seccion}>
      <h2 style={s.seccionTitulo}>{titulo}</h2>
      <p style={s.seccionTexto}>{texto}</p>
    </div>
  );
}

function Tarjeta({
  titulo, texto, acciones, color,
}: {
  titulo: string;
  texto: string;
  acciones: Array<{ texto: string; href: string; principal?: boolean }>;
  color: string;
}) {
  return (
    <article style={s.tarjeta}>
      <div style={{ ...s.franja, background: 'var(--marca)' }} />
      <div style={s.cuerpo}>
        <h2 style={s.tarjetaTitulo}>{titulo}</h2>
        <p style={s.tarjetaTexto}>{texto}</p>
        <div style={s.acciones}>
          {acciones.map((a) => (
            <Link
              key={a.href}
              href={a.href}
              style={a.principal
                ? { ...s.btnAccion, background: 'var(--marca)', color: 'var(--sobre-empresa)' }
                : s.btnSec}
            >
              {a.texto}
            </Link>
          ))}
        </div>
      </div>
    </article>
  );
}

const s: Record<string, React.CSSProperties> = {
  titulo: { fontSize: 22, margin: '0 0 3px', letterSpacing: -0.4 },
  sub: { fontSize: 13, color: 'var(--texto-suave)', margin: '0 0 22px', maxWidth: 620, lineHeight: 1.5 },
  seccion: { marginTop: 30, marginBottom: 4 },
  seccionTitulo: {
    fontSize: 12, fontWeight: 700, letterSpacing: 1,
    textTransform: 'uppercase', color: 'var(--texto)', margin: 0,
  },
  seccionTexto: { fontSize: 12.5, color: 'var(--texto-suave)', margin: '3px 0 0' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(290px,1fr))', gap: 16, alignItems: 'stretch' },
  tarjeta: {
    background: 'var(--superficie)',
    borderWidth: 1, borderStyle: 'solid', borderColor: 'var(--borde)',
    borderRadius: 8, overflow: 'hidden',
    // La tarjeta es el contenedor flex: asi el cuerpo puede crecer y
    // los botones quedan siempre dentro del recuadro.
    display: 'flex', flexDirection: 'column',
    minHeight: 210,
  },
  franja: { height: 3, flexShrink: 0 },
  cuerpo: { padding: 18, display: 'flex', flexDirection: 'column', flex: 1 },
  tarjetaTitulo: { fontSize: 14.5, margin: '0 0 6px', fontWeight: 600 },
  tarjetaTexto: { fontSize: 12.5, color: 'var(--texto-suave)', margin: '0 0 18px', lineHeight: 1.55, flex: 1 },
  acciones: { display: 'flex', gap: 8, flexWrap: 'wrap', flexShrink: 0 },
  btnAccion: {
    padding: '8px 16px', borderRadius: 4, fontSize: 12.5,
    fontWeight: 600, textDecoration: 'none',
  },
  btnSec: {
    background: 'var(--superficie)', color: 'var(--texto)', border: '1px solid var(--borde-fuerte)',
    padding: '8px 16px', borderRadius: 4, fontSize: 12.5,
    fontWeight: 600, textDecoration: 'none',
  },
  nota: { fontSize: 11.5, color: 'var(--texto-tenue)', marginTop: 20, lineHeight: 1.6 },
  vacio: { background: 'var(--superficie)', border: '1px dashed var(--borde-fuerte)', borderRadius: 8, padding: '40px 24px', textAlign: 'center' },
  btn: { background: 'var(--marca)', color: 'var(--sobre-empresa)', padding: '10px 18px', borderRadius: 4, fontSize: 13, fontWeight: 600, textDecoration: 'none' },
};
