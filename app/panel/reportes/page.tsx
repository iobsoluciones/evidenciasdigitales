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

  const color = empresa.color_primario;
  const articulosKardex = await listarArticulosKardex();

  return (
    <>
      <h1 style={s.titulo}>Reportes</h1>
      <p style={s.sub}>
        Documentos de <strong>{empresa.nombre}</strong>. El acta de cada
        capacitación y su informe de evaluación se descargan desde la
        capacitación correspondiente.
      </p>

      {/* ---------- Ejecutivo ---------- */}
      <AccionesEjecutivo
        empresaId={empresa.id}
        empresaNombre={empresa.nombre}
        correoContacto={empresa.correo}
        color={color}
      />

      {/* ---------- Los demás ---------- */}
      <div style={s.grid}>
        <Tarjeta
          titulo="Cronograma"
          texto="Capacitaciones programadas y realizadas en el periodo, con su estado."
          acciones={[
            { texto: 'Descargar PDF', href: `/api/pdf-cronograma/${empresa.id}?desde=${desde}&hasta=${hasta}`, principal: true },
            { texto: 'Ver calendario', href: '/panel/calendario' },
          ]}
          color={color}
        />

        <Tarjeta
          titulo="Matriz de capacitaciones"
          texto="Quién recibió qué formación y dónde quedan huecos, por empleado y capacitación."
          acciones={[
            { texto: 'Abrir matriz', href: '/panel/matriz', principal: true },
          ]}
          color={color}
        />

        <Tarjeta
          titulo="Exportación a Excel"
          texto="Capacitaciones, participantes y resumen por persona en un solo libro."
          acciones={[
            { texto: 'Descargar Excel', href: '/api/excel/todo', principal: true },
          ]}
          color="#15803D"
        />

        <Tarjeta
          titulo="Bitácora de envíos"
          texto="Registro de los correos enviados. Sirve como soporte: los mensajes no salen de tu cuenta."
          acciones={[
            { texto: 'Ver envíos', href: '/panel/envios', principal: true },
          ]}
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
      <div style={{ ...s.franja, background: color }} />
      <div style={s.cuerpo}>
        <h2 style={s.tarjetaTitulo}>{titulo}</h2>
        <p style={s.tarjetaTexto}>{texto}</p>
        <div style={s.acciones}>
          {acciones.map((a) => (
            <Link
              key={a.href}
              href={a.href}
              style={a.principal
                ? { ...s.btnAccion, background: color, color: '#fff' }
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
  sub: { fontSize: 13, color: '#5B6470', margin: '0 0 22px', maxWidth: 620, lineHeight: 1.5 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(290px,1fr))', gap: 16, alignItems: 'stretch' },
  tarjeta: {
    background: '#fff',
    borderWidth: 1, borderStyle: 'solid', borderColor: '#E4E4DF',
    borderRadius: 8, overflow: 'hidden',
    // La tarjeta es el contenedor flex: asi el cuerpo puede crecer y
    // los botones quedan siempre dentro del recuadro.
    display: 'flex', flexDirection: 'column',
    minHeight: 210,
  },
  franja: { height: 3, flexShrink: 0 },
  cuerpo: { padding: 18, display: 'flex', flexDirection: 'column', flex: 1 },
  tarjetaTitulo: { fontSize: 14.5, margin: '0 0 6px', fontWeight: 600 },
  tarjetaTexto: { fontSize: 12.5, color: '#5B6470', margin: '0 0 18px', lineHeight: 1.55, flex: 1 },
  acciones: { display: 'flex', gap: 8, flexWrap: 'wrap', flexShrink: 0 },
  btnAccion: {
    padding: '8px 16px', borderRadius: 4, fontSize: 12.5,
    fontWeight: 600, textDecoration: 'none',
  },
  btnSec: {
    background: '#fff', color: '#14263F', border: '1px solid #DFDFD8',
    padding: '8px 16px', borderRadius: 4, fontSize: 12.5,
    fontWeight: 600, textDecoration: 'none',
  },
  nota: { fontSize: 11.5, color: '#8A929C', marginTop: 20, lineHeight: 1.6 },
  vacio: { background: '#fff', border: '1px dashed #DFDFD8', borderRadius: 8, padding: '40px 24px', textAlign: 'center' },
  btn: { background: '#14263F', color: '#fff', padding: '10px 18px', borderRadius: 4, fontSize: 13, fontWeight: 600, textDecoration: 'none' },
};
