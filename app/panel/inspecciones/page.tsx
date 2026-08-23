/**
 * LISTADO DE INSPECCIONES
 */
import Link from 'next/link';
import { empresaActiva } from '@/lib/empresa-activa';
import { listarInspecciones } from '@/lib/acciones-ejecutar-inspeccion';
import ListaInspecciones from './ListaInspecciones';

export default async function PaginaInspecciones() {
  const empresa = await empresaActiva();

  if (!empresa) {
    return (
      <div style={s.vacio}>
        <p style={{ margin: '0 0 14px', fontSize: 14 }}>
          Agrega una empresa para registrar inspecciones.
        </p>
        <Link href="/panel/empresas/nueva" style={s.btn}>Agregar empresa</Link>
      </div>
    );
  }

  const inspecciones = await listarInspecciones();

  return (
    <>
      <div style={s.cabecera}>
        <div>
          <h1 style={s.titulo}>Inspecciones</h1>
          <p style={s.sub}>
            Realizadas en <strong>{empresa.nombre}</strong>.
          </p>
        </div>
        <Link
          href="/panel/inspecciones/nueva"
          style={{ ...s.btn, background: empresa.color_primario }}
        >
          + Nueva inspección
        </Link>
      </div>

      <ListaInspecciones
        key={`inspecciones-${empresa.id}`}
        inspecciones={inspecciones}
        color={empresa.color_primario}
      />
    </>
  );
}

const s: Record<string, React.CSSProperties> = {
  cabecera: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    gap: 16, flexWrap: 'wrap', marginBottom: 20,
  },
  titulo: { fontSize: 22, margin: '0 0 3px', letterSpacing: -0.4 },
  sub: { fontSize: 13, color: '#5B6470', margin: 0 },
  vacio: { background: '#fff', border: '1px dashed #DFDFD8', borderRadius: 8, padding: '40px 24px', textAlign: 'center' },
  btn: { background: '#14263F', color: '#fff', padding: '10px 18px', borderRadius: 4, fontSize: 13, fontWeight: 600, textDecoration: 'none' },
};
