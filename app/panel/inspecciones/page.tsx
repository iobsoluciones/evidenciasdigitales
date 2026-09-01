/**
 * LISTADO DE INSPECCIONES
 */
import Link from 'next/link';
import { empresaActiva } from '@/lib/empresa-activa';
import { listarInspecciones } from '@/lib/acciones-ejecutar-inspeccion';
import { listarProgramaciones } from '@/lib/acciones-programacion';
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

  const [inspecciones, programaciones] = await Promise.all([
    listarInspecciones(),
    listarProgramaciones(),
  ]);

  // Aviso visual del cronograma: es el "recordatorio" de la fase 8.
  const vencidas = programaciones.filter((p) => p.estado_real === 'vencida').length;
  const proximas = programaciones.filter((p) => p.estado_real === 'proxima').length;

  return (
    <>
      <div style={s.cabecera}>
        <div>
          <h1 style={s.titulo}>Inspecciones</h1>
          <p style={s.sub}>
            Realizadas en <strong>{empresa.nombre}</strong>.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <Link href="/panel/inspecciones/programadas" style={s.btnSec}>
            Cronograma
            {vencidas > 0 && (
              <span style={{ ...s.pastilla, background: 'var(--mal-fondo)', color: 'var(--mal)' }}>
                {vencidas} vencida{vencidas !== 1 ? 's' : ''}
              </span>
            )}
            {vencidas === 0 && proximas > 0 && (
              <span style={{ ...s.pastilla, background: 'var(--ambar-fondo)', color: 'var(--ambar)' }}>
                {proximas} esta semana
              </span>
            )}
          </Link>
          <Link
            href="/panel/inspecciones/nueva"
            style={{ ...s.btn, background: empresa.color_primario }}
          >
            + Nueva inspección
          </Link>
        </div>
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
  btnSec: {
    display: 'inline-flex', alignItems: 'center', gap: 8,
    background: 'var(--superficie)', color: 'var(--texto)', border: '1px solid var(--borde-fuerte)',
    padding: '9px 15px', borderRadius: 4, fontSize: 13, fontWeight: 600,
    textDecoration: 'none',
  },
  pastilla: {
    borderRadius: 8, padding: '1px 8px', fontSize: 11, fontWeight: 700,
  },
  cabecera: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    gap: 16, flexWrap: 'wrap', marginBottom: 20,
  },
  titulo: { fontSize: 22, margin: '0 0 3px', letterSpacing: -0.4 },
  sub: { fontSize: 13, color: 'var(--texto-suave)', margin: 0 },
  vacio: { background: 'var(--superficie)', border: '1px dashed var(--borde-fuerte)', borderRadius: 8, padding: '40px 24px', textAlign: 'center' },
  btn: { background: 'var(--marca)', color: 'var(--sobre-marca)', padding: '10px 18px', borderRadius: 4, fontSize: 13, fontWeight: 600, textDecoration: 'none' },
};
