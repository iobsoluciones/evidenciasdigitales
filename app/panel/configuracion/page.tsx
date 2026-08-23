/**
 * CONFIGURACIÓN DE LA EMPRESA ACTIVA
 * ---------------------------------------------------------------
 * Membrete y logo van lado a lado: son las dos mitades de la misma
 * decisión —cómo se ve el documento— y verlas juntas evita bajar y
 * subir para comparar. El espacio a la derecha del membrete estaba
 * desaprovechado.
 */
import Link from 'next/link';
import { obtenerPerfil } from '@/lib/sesion';
import { empresaActiva } from '@/lib/empresa-activa';
import { listarCatalogos } from '@/lib/acciones-catalogos';
import EditorMembrete from './EditorMembrete';
import CamposEncabezado from './CamposEncabezado';
import CargaLogo from './CargaLogo';
import GestorCatalogos from './GestorCatalogos';
import {
  listarPlantillasEvaluacion, listarPlantillasCapacitacion,
} from '@/lib/acciones-plantillas';
import VistaPlantillas from '../plantillas/VistaPlantillas';

export default async function PaginaConfiguracion() {
  const perfil = await obtenerPerfil();
  const empresa = await empresaActiva();
  if (!perfil) return null;

  if (!empresa) {
    return (
      <div style={s.vacio}>
        <p style={{ margin: '0 0 14px', fontSize: 14 }}>
          Agrega una empresa para configurar sus documentos.
        </p>
        <Link href="/panel/empresas/nueva" style={s.btn}>Agregar empresa</Link>
      </div>
    );
  }

  const catalogos = await listarCatalogos();
  const [plEvaluacion, plCapacitacion] = await Promise.all([
    listarPlantillasEvaluacion(),
    listarPlantillasCapacitacion(),
  ]);
  const esAdmin = perfil.rol === 'admin';

  return (
    <>
      <h1 style={s.titulo}>Configuración</h1>
      <p style={s.sub}>
        Aplica a <strong>{empresa.nombre}</strong>. Cada empresa tiene su propio
        membrete y sus propias listas.
      </p>

      {/* Membrete y logo lado a lado: las dos mitades del documento */}
      <div style={s.dosColumnas}>
        <EditorMembrete
          key={`membrete-${empresa.id}`}
          empresaId={empresa.id}
          titulo={empresa.titulo_doc}
          nomenclatura={empresa.nomenclatura ?? ''}
          version={empresa.version_doc}
          color={empresa.color_primario}
          esAdmin={esAdmin}
        />

        <CargaLogo
          key={`logo-${empresa.id}`}
          orgId={perfil.organizacion.id}
          empresaId={empresa.id}
          logoActual={empresa.logo_url}
          esAdmin={esAdmin}
        />
      </div>

      <CamposEncabezado
        key={`campos-${empresa.id}`}
        empresaId={empresa.id}
        campos={empresa.campos_encabezado ?? []}
        version={empresa.version_doc}
        nomenclatura={empresa.nomenclatura ?? ''}
        titulo={empresa.titulo_doc}
        color={empresa.color_primario}
        esAdmin={esAdmin}
      />

      <GestorCatalogos
        key={`catalogos-${empresa.id}`}
        catalogos={catalogos}
        color={empresa.color_primario}
        esAdmin={esAdmin}
      />

      {/* Las plantillas son de la CUENTA, no de la empresa: se
          reutilizan entre todos los clientes. */}
      <section style={s.seccionPlantillas}>
        <h2 style={s.h2}>Plantillas</h2>
        <p style={s.notaSeccion}>
          Contenido reutilizable entre <strong>todas</strong> tus empresas.
          Se guarda desde una capacitación o evaluación ya creada.
        </p>
        <VistaPlantillas
          evaluaciones={plEvaluacion}
          capacitaciones={plCapacitacion}
          color={empresa.color_primario}
        />
      </section>

      <p style={s.pie}>
        ¿Necesitas cambiar razón social, NIT o datos de contacto?{' '}
        <Link href={`/panel/empresas/${empresa.id}`} style={{ color: '#5B6470' }}>
          Editar datos de la empresa →
        </Link>
      </p>
    </>
  );
}

const s: Record<string, React.CSSProperties> = {
  titulo: { fontSize: 22, margin: '0 0 3px', letterSpacing: -0.4 },
  sub: { fontSize: 13, color: '#5B6470', margin: '0 0 22px' },
  // Se apilan por debajo de 900 px: el logo necesita ancho para verse
  dosColumnas: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: 16,
    alignItems: 'start',
    maxWidth: 900,
  },
  pie: { fontSize: 12.5, color: '#8A929C', marginTop: 20, maxWidth: 640 },
  seccionPlantillas: { marginTop: 28, paddingTop: 24, borderTop: '1px solid #E4E4DF' },
  h2: { fontSize: 16, margin: '0 0 3px', letterSpacing: -0.2 },
  notaSeccion: { fontSize: 12.5, color: '#5B6470', margin: '0 0 18px' },
  vacio: { background: '#fff', border: '1px dashed #DFDFD8', borderRadius: 8, padding: '40px 24px', textAlign: 'center' },
  btn: { background: '#14263F', color: '#fff', padding: '10px 18px', borderRadius: 4, fontSize: 13, fontWeight: 600, textDecoration: 'none' },
};
