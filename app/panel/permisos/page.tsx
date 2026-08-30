/**
 * PERMISOS DE TRABAJO DE ALTO RIESGO — listado
 * Res. 4272 de 2021 · Res. 491 de 2020 · Dec. 1072 art. 2.2.4.6.24.
 */
import { redirect } from 'next/navigation';
import { obtenerPerfil } from '@/lib/sesion';
import { empresaActiva } from '@/lib/empresa-activa';
import { listarPermisos } from '@/lib/acciones-permisos';
import VistaPermisos from './VistaPermisos';

export const dynamic = 'force-dynamic';

export default async function PaginaPermisos() {
  const perfil = await obtenerPerfil();
  if (!perfil) redirect('/login');

  const empresa = await empresaActiva();
  if (!empresa) {
    return (
      <>
        <h1 style={s.titulo}>Permisos de alto riesgo</h1>
        <p style={s.sub}>Agrega una empresa para emitir permisos.</p>
      </>
    );
  }

  const lista = await listarPermisos();

  return (
    <>
      <h1 style={s.titulo}>Permisos de trabajo de alto riesgo</h1>
      <p style={s.sub}>
        {empresa.nombre} · Un permiso es una autorización que <strong>vence</strong>:
        vale para una tarea y una franja horaria, y no habilita nada hasta que
        todos firman. Al emitirlo, la aplicación comprueba que quien va a ejecutar
        tenga aptitud médica vigente.
      </p>

      <VistaPermisos key={empresa.id} lista={lista} color={empresa.color_primario} />
    </>
  );
}

const s: Record<string, React.CSSProperties> = {
  titulo: { fontSize: 23, fontWeight: 700, color: '#14263F', margin: '0 0 4px' },
  sub: { fontSize: 13.5, color: '#5B6470', margin: '0 0 18px', maxWidth: 720, lineHeight: 1.6 },
};
