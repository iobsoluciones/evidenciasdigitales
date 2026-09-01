/**
 * SIMULACROS — listado
 * Estándar 5.1.1 · Decreto 1072 de 2015, art. 2.2.4.6.25.
 */
import { redirect } from 'next/navigation';
import { obtenerPerfil } from '@/lib/sesion';
import { empresaActiva } from '@/lib/empresa-activa';
import { listarSimulacros, listarAmenazas } from '@/lib/acciones-emergencias';
import VistaSimulacros from './VistaSimulacros';

export const dynamic = 'force-dynamic';

export default async function PaginaSimulacros() {
  const perfil = await obtenerPerfil();
  if (!perfil) redirect('/login');

  const empresa = await empresaActiva();
  if (!empresa) {
    return (
      <>
        <h1 style={s.titulo}>Simulacros</h1>
        <p style={s.sub}>Agrega una empresa para registrar sus simulacros.</p>
      </>
    );
  }

  const lista = await listarSimulacros();
  const { items: amenazas } = await listarAmenazas();

  return (
    <>
      <h1 style={s.titulo}>Simulacros</h1>
      <p style={s.sub}>
        {empresa.nombre} · El acta firmada es la evidencia del estándar 5.1.1:
        tener el plan de emergencias escrito no prueba que se haya probado. Las
        firmas del equipo evaluador se piden por enlace al correo.
      </p>

      <p style={s.enlace}>
        <a href="/panel/emergencias" style={s.a}>Volver al análisis de amenazas</a>
      </p>

      <VistaSimulacros
        key={empresa.id}
        lista={lista}
        amenazas={amenazas}
        color={empresa.color_primario}
      />
    </>
  );
}

const s: Record<string, React.CSSProperties> = {
  titulo: { fontSize: 23, fontWeight: 700, color: 'var(--texto)', margin: '0 0 4px' },
  sub: { fontSize: 13.5, color: 'var(--texto-suave)', margin: '0 0 10px', maxWidth: 720, lineHeight: 1.6 },
  enlace: { fontSize: 12.5, color: 'var(--texto-tenue)', margin: '0 0 18px' },
  a: { color: 'var(--texto)', fontWeight: 600 },
};
