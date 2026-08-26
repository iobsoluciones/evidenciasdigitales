/**
 * CRONOGRAMA DE INSPECCIONES — fase 8
 * Programación de lo que se repite, con aviso visual de lo vencido.
 */
import Link from 'next/link';
import { empresaActiva } from '@/lib/empresa-activa';
import { listarProgramaciones } from '@/lib/acciones-programacion';
import { listarPlantillasInspeccion } from '@/lib/acciones-inspecciones';
import VistaProgramadas from './VistaProgramadas';

export default async function PaginaProgramadas() {
  const empresa = await empresaActiva();

  if (!empresa) {
    return (
      <div style={s.vacio}>
        <p style={{ margin: '0 0 14px', fontSize: 14 }}>
          Selecciona una empresa para programar sus inspecciones.
        </p>
        <Link href="/panel/inspecciones" style={s.btn}>Ir a Inspecciones</Link>
      </div>
    );
  }

  const [programaciones, plantillas] = await Promise.all([
    listarProgramaciones(),
    listarPlantillasInspeccion(),
  ]);

  return (
    <>
      <Link href="/panel/inspecciones" style={s.volver}>← Inspecciones</Link>

      <h1 style={s.titulo}>Cronograma de inspecciones</h1>
      <p style={s.sub}>
        Lo que se debe inspeccionar en <strong>{empresa.nombre}</strong> y cuándo.
        Al marcar una como realizada, si se repite queda creada la siguiente.
      </p>

      <VistaProgramadas
        key={`programadas-${empresa.id}`}
        programaciones={programaciones}
        plantillas={plantillas}
        color={empresa.color_primario}
      />
    </>
  );
}

const s: Record<string, React.CSSProperties> = {
  volver: { fontSize: 12.5, color: '#5B6470', textDecoration: 'none', display: 'inline-block', marginBottom: 10 },
  titulo: { fontSize: 22, margin: '0 0 3px', letterSpacing: -0.4 },
  sub: { fontSize: 13, color: '#5B6470', margin: '0 0 22px', maxWidth: 640 },
  vacio: { background: '#fff', border: '1px dashed #DFDFD8', borderRadius: 8, padding: '40px 24px', textAlign: 'center' },
  btn: { background: '#14263F', color: '#fff', padding: '10px 18px', borderRadius: 4, fontSize: 13, fontWeight: 600, textDecoration: 'none' },
};
