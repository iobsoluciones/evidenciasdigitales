/**
 * EMERGENCIAS — análisis de amenazas y vulnerabilidad
 * Estándar 5.1.1 · Decreto 1072 de 2015, art. 2.2.4.6.25.
 */
import { redirect } from 'next/navigation';
import { obtenerPerfil } from '@/lib/sesion';
import { empresaActiva } from '@/lib/empresa-activa';
import { listarAmenazas } from '@/lib/acciones-emergencias';
import VistaAmenazas from './VistaAmenazas';

export const dynamic = 'force-dynamic';

export default async function PaginaEmergencias() {
  const perfil = await obtenerPerfil();
  if (!perfil) redirect('/login');

  const empresa = await empresaActiva();
  if (!empresa) {
    return (
      <>
        <h1 style={s.titulo}>Emergencias</h1>
        <p style={s.sub}>Agrega una empresa para analizar sus amenazas.</p>
      </>
    );
  }

  const { items, resumen } = await listarAmenazas();

  return (
    <>
      <h1 style={s.titulo}>Análisis de amenazas y vulnerabilidad</h1>
      <p style={s.sub}>
        {empresa.nombre} · Metodología de colores. Es el anexo técnico que
        sustenta el plan de prevención, preparación y respuesta ante emergencias
        (estándar 5.1.1). El documento narrativo —procedimientos, rutas, roles—
        lo escribes tú; esto es la tabla que lo justifica.
      </p>

      <p style={s.enlace}>
        <a href="/panel/emergencias/simulacros" style={s.a}>Simulacros</a> ·{' '}
        <a href="/panel/comites" style={s.a}>Brigada de emergencia</a> — el análisis
        dice qué puede pasar, la brigada es quién responde y el simulacro prueba
        que se sabe hacer.
      </p>

      <VistaAmenazas
        key={empresa.id}
        items={items}
        resumen={resumen}
        empresaId={empresa.id}
        color={empresa.color_primario}
      />
    </>
  );
}

const s: Record<string, React.CSSProperties> = {
  titulo: { fontSize: 23, fontWeight: 700, color: '#14263F', margin: '0 0 4px' },
  sub: { fontSize: 13.5, color: '#5B6470', margin: '0 0 10px', maxWidth: 720, lineHeight: 1.6 },
  enlace: { fontSize: 12.5, color: '#8A929C', margin: '0 0 18px' },
  a: { color: '#14263F', fontWeight: 600 },
};
