/**
 * ENTREGAS DE DOTACIÓN
 */
import Link from 'next/link';
import { empresaActiva } from '@/lib/empresa-activa';
import { listarEntregas } from '@/lib/acciones-entregas';
import ListaEntregas from './ListaEntregas';

export default async function PaginaEntregas() {
  const empresa = await empresaActiva();

  if (!empresa) {
    return (
      <div style={s.vacio}>
        <p style={{ margin: '0 0 14px', fontSize: 14 }}>
          Agrega una empresa para registrar entregas.
        </p>
        <Link href="/panel/empresas/nueva" style={s.btn}>Agregar empresa</Link>
      </div>
    );
  }

  const entregas = await listarEntregas();

  return (
    <>
      <div style={s.cabecera}>
        <div>
          <h1 style={s.titulo}>Entregas</h1>
          <p style={s.sub}>
            Actas de dotación de <strong>{empresa.nombre}</strong>.
          </p>
        </div>
        <Link
          href="/panel/dotacion/entregas/nueva"
          style={{ ...s.btn, background: empresa.color_primario }}
        >
          + Nueva entrega
        </Link>
      </div>

      <ListaEntregas
        key={`entregas-${empresa.id}`}
        entregas={entregas}
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
  sub: { fontSize: 13, color: 'var(--texto-suave)', margin: 0 },
  vacio: { background: 'var(--superficie)', border: '1px dashed var(--borde-fuerte)', borderRadius: 8, padding: '40px 24px', textAlign: 'center' },
  btn: { background: 'var(--marca)', color: 'var(--superficie)', padding: '10px 18px', borderRadius: 4, fontSize: 13, fontWeight: 600, textDecoration: 'none' },
};
