/**
 * MATRIZ LEGAL — estándar 2.7.1
 * Decreto 1072 de 2015, art. 2.2.4.6.8 numeral 3.
 */
import { redirect } from 'next/navigation';
import { obtenerPerfil } from '@/lib/sesion';
import { empresaActiva } from '@/lib/empresa-activa';
import { listarMatriz, listarCatalogo } from '@/lib/acciones-matriz-legal';
import VistaMatrizLegal from './VistaMatrizLegal';

export const dynamic = 'force-dynamic';

export default async function PaginaMatrizLegal() {
  const perfil = await obtenerPerfil();
  if (!perfil) redirect('/login');

  const empresa = await empresaActiva();
  if (!empresa) {
    return (
      <>
        <h1 style={s.titulo}>Matriz legal</h1>
        <p style={s.sub}>Agrega una empresa para armar su matriz de requisitos legales.</p>
      </>
    );
  }

  const { items, resumen } = await listarMatriz();
  const catalogo = await listarCatalogo();

  return (
    <>
      <h1 style={s.titulo}>Matriz de requisitos legales</h1>
      <p style={s.sub}>
        {empresa.nombre} · Estándar 2.7.1. El catálogo base llega hecho, pero es
        un <strong>punto de partida</strong>: la matriz depende del sector, la
        actividad y el nivel de riesgo de cada cliente. Agrega tus propias normas
        o impórtalas desde Excel — el catálogo es tuyo, no depende de nosotros.
      </p>

      <VistaMatrizLegal
        key={empresa.id}
        items={items}
        resumen={resumen}
        catalogo={catalogo}
        empresaId={empresa.id}
        color={empresa.color_primario}
      />
    </>
  );
}

const s: Record<string, React.CSSProperties> = {
  titulo: { fontSize: 23, fontWeight: 700, color: '#14263F', margin: '0 0 4px' },
  sub: { fontSize: 13.5, color: '#5B6470', margin: '0 0 18px', maxWidth: 740, lineHeight: 1.6 },
};
