/**
 * RENDICIÓN DE CUENTAS — listado
 * Estándar 2.8.1 · Dec. 1072 art. 2.2.4.6.8 num. 3.
 */
import { redirect } from 'next/navigation';
import { obtenerPerfil } from '@/lib/sesion';
import { empresaActiva } from '@/lib/empresa-activa';
import { listarRendiciones } from '@/lib/acciones-rendicion';
import VistaRendiciones from './VistaRendiciones';

export const dynamic = 'force-dynamic';

export default async function PaginaRendicion() {
  const perfil = await obtenerPerfil();
  if (!perfil) redirect('/login');

  const empresa = await empresaActiva();
  if (!empresa) {
    return (
      <>
        <h1 style={s.titulo}>Rendición de cuentas</h1>
        <p style={s.sub}>Agrega una empresa para registrar su rendición anual.</p>
      </>
    );
  }

  const lista = await listarRendiciones();

  return (
    <>
      <h1 style={s.titulo}>Rendición de cuentas del SG-SST</h1>
      <p style={s.sub}>
        {empresa.nombre} · Estándar 2.8.1. Quienes tienen responsabilidades en el
        SG-SST deben rendir cuentas <strong>anualmente y por escrito</strong>.
        Cada uno escribe su propio informe desde su enlace: si lo redacta el
        consultor y los demás solo firman, no hubo rendición de cuentas.
      </p>

      <VistaRendiciones key={empresa.id} lista={lista} color={empresa.color_primario} />
    </>
  );
}

const s: Record<string, React.CSSProperties> = {
  titulo: { fontSize: 23, fontWeight: 700, color: 'var(--texto)', margin: '0 0 4px' },
  sub: { fontSize: 13.5, color: 'var(--texto-suave)', margin: '0 0 18px', maxWidth: 720, lineHeight: 1.6 },
};
