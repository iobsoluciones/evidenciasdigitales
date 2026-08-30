/**
 * AUTOEVALUACIÓN DE ESTÁNDARES MÍNIMOS
 * Resolución 0312 de 2019, artículos 27 y 28.
 */
import { redirect } from 'next/navigation';
import { obtenerPerfil } from '@/lib/sesion';
import { empresaActiva } from '@/lib/empresa-activa';
import {
  listarAutoevaluaciones, obtenerAutoevaluacion,
} from '@/lib/acciones-autoevaluacion';
import VistaAutoevaluacion from './VistaAutoevaluacion';

export const dynamic = 'force-dynamic';

export default async function PaginaAutoevaluacion({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const perfil = await obtenerPerfil();
  if (!perfil) redirect('/login');

  const empresa = await empresaActiva();
  if (!empresa) {
    return (
      <>
        <h1 style={s.titulo}>Autoevaluación de estándares mínimos</h1>
        <p style={s.sub}>Agrega una empresa para evaluarla.</p>
      </>
    );
  }

  const { id } = await searchParams;
  const lista = await listarAutoevaluaciones();

  const actual = new Date().getFullYear();
  const elegida = id ?? lista.find((x) => x.anio === actual)?.id;
  const detalle = elegida ? await obtenerAutoevaluacion(elegida) : null;

  return (
    <>
      <h1 style={s.titulo}>Autoevaluación de estándares mínimos</h1>
      <p style={s.sub}>
        {empresa.nombre} · Resolución 0312 de 2019. Es anual y obligatoria, y su
        puntaje decide el criterio de valoración de la empresa y si hay que
        presentar plan de mejoramiento.
      </p>

      <VistaAutoevaluacion
        key={elegida ?? 'nueva'}
        lista={lista}
        detalle={detalle}
        color={empresa.color_primario}
      />
    </>
  );
}

const s: Record<string, React.CSSProperties> = {
  titulo: { fontSize: 23, fontWeight: 700, color: '#14263F', margin: '0 0 4px' },
  sub: { fontSize: 13.5, color: '#5B6470', margin: '0 0 18px', maxWidth: 680, lineHeight: 1.6 },
};
