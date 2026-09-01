/**
 * FICHA DEL CONTRATISTA
 * Estándar 2.6.1 · Decreto 1072 de 2015, art. 2.2.4.6.28.
 */
import { redirect, notFound } from 'next/navigation';
import { obtenerPerfil } from '@/lib/sesion';
import { empresaActiva } from '@/lib/empresa-activa';
import { obtenerContratista } from '@/lib/acciones-contratistas';
import EditorContratista from './EditorContratista';

export const dynamic = 'force-dynamic';

export default async function PaginaContratista({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const perfil = await obtenerPerfil();
  if (!perfil) redirect('/login');

  const { id } = await params;
  const detalle = await obtenerContratista(id);
  if (!detalle.ok || !detalle.contratista) notFound();

  const empresa = await empresaActiva();
  const c = detalle.contratista;

  return (
    <>
      <p style={s.migas}>
        <a href="/panel/contratistas" style={s.a}>Contratistas</a> · {c.nombre}
      </p>

      <h1 style={s.titulo}>{c.nombre}</h1>
      <p style={s.sub}>
        {c.objeto}
        {c.nit ? ` · NIT ${c.nit}` : ''}
      </p>

      <EditorContratista
        key={c.id}
        contratista={c}
        requisitos={detalle.requisitos ?? []}
        personal={detalle.personal ?? []}
        color={empresa?.color_primario ?? '#14263F'}
      />
    </>
  );
}

const s: Record<string, React.CSSProperties> = {
  migas: { fontSize: 12.5, color: 'var(--texto-tenue)', margin: '0 0 6px' },
  a: { color: 'var(--texto)', fontWeight: 600 },
  titulo: { fontSize: 23, fontWeight: 700, color: 'var(--texto)', margin: '0 0 4px' },
  sub: { fontSize: 13.5, color: 'var(--texto-suave)', margin: '0 0 18px', lineHeight: 1.6 },
};
