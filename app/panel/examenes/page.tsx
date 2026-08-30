/**
 * EXÁMENES MÉDICOS OCUPACIONALES
 * Resolución 2346 de 2007 · Estándares 3.1.2 a 3.1.6
 */
import { redirect } from 'next/navigation';
import { obtenerPerfil } from '@/lib/sesion';
import { empresaActiva } from '@/lib/empresa-activa';
import { listarExamenes } from '@/lib/acciones-examenes';
import VistaExamenes from './VistaExamenes';

export const dynamic = 'force-dynamic';

export default async function PaginaExamenes() {
  const perfil = await obtenerPerfil();
  if (!perfil) redirect('/login');

  const empresa = await empresaActiva();
  if (!empresa) {
    return (
      <>
        <h1 style={s.titulo}>Exámenes médicos</h1>
        <p style={s.sub}>Agrega una empresa para registrar sus exámenes ocupacionales.</p>
      </>
    );
  }

  const filas = await listarExamenes();

  return (
    <>
      <h1 style={s.titulo}>Exámenes médicos ocupacionales</h1>
      <p style={s.sub}>
        {empresa.nombre} · la lista es de trabajadores, no de exámenes: así se ve
        a quién le falta, que es lo que un listado de exámenes no mostraría.
      </p>

      <VistaExamenes key={empresa.id} filas={filas} color={empresa.color_primario} />
    </>
  );
}

const s: Record<string, React.CSSProperties> = {
  titulo: { fontSize: 23, fontWeight: 700, color: '#14263F', margin: '0 0 4px' },
  sub: { fontSize: 13.5, color: '#5B6470', margin: '0 0 18px', maxWidth: 620, lineHeight: 1.6 },
};
