/**
 * CONJUNTOS DE ESTÁNDARES
 * El contenido normativo lo mantiene el profesional, no el programador.
 */
import { redirect } from 'next/navigation';
import { obtenerPerfil } from '@/lib/sesion';
import { empresaActiva } from '@/lib/empresa-activa';
import { listarConjuntos, obtenerConjunto } from '@/lib/acciones-conjuntos';
import VistaEstandares from './VistaEstandares';

export const dynamic = 'force-dynamic';

export default async function PaginaEstandares({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const perfil = await obtenerPerfil();
  if (!perfil) redirect('/login');

  const empresa = await empresaActiva();
  const { id } = await searchParams;

  const conjuntos = await listarConjuntos();
  const elegido = id ?? conjuntos[0]?.id;
  const detalle = elegido ? await obtenerConjunto(elegido) : null;

  return (
    <>
      <h1 style={s.titulo}>Conjuntos de estándares</h1>
      <p style={s.sub}>
        Aquí vive el contenido normativo de la autoevaluación. El conjunto de 60
        viene con la aplicación y sus pesos están verificados contra la tabla del
        artículo 27. Para los de 7 y 21 estándares, duplícalo y adáptalo o
        impórtalos desde Excel: no dependes de nadie para cargar una resolución
        nueva.
      </p>

      <VistaEstandares
        conjuntos={conjuntos}
        detalle={detalle}
        color={empresa?.color_primario ?? '#14263F'}
      />
    </>
  );
}

const s: Record<string, React.CSSProperties> = {
  titulo: { fontSize: 23, fontWeight: 700, color: '#14263F', margin: '0 0 4px' },
  sub: { fontSize: 13.5, color: '#5B6470', margin: '0 0 18px', maxWidth: 700, lineHeight: 1.6 },
};
