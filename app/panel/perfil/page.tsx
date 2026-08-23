/**
 * PERFIL PROFESIONAL
 * La ficha del consultor, con su hoja de vida descargable y enviable.
 */
import { obtenerPerfil } from '@/lib/sesion';
import { obtenerPerfilProfesional, obtenerTrayectoria } from '@/lib/acciones-perfil';
import EditorPerfil from './EditorPerfil';

export default async function PaginaPerfil() {
  const sesion = await obtenerPerfil();
  if (!sesion) return null;

  const [perfil, trayectoria] = await Promise.all([
    obtenerPerfilProfesional(),
    obtenerTrayectoria(),
  ]);

  return (
    <>
      <h1 style={s.titulo}>Perfil profesional</h1>
      <p style={s.sub}>
        Tu hoja de vida como capacitador. Los clientes suelen pedirla como
        soporte de idoneidad antes de contratar.
      </p>

      <EditorPerfil
        perfil={perfil}
        trayectoria={trayectoria}
        nombreSesion={sesion.nombre}
        correoSesion={sesion.correo}
        orgId={sesion.organizacion.id}
        color={sesion.organizacion.color_primario}
      />
    </>
  );
}

const s: Record<string, React.CSSProperties> = {
  titulo: { fontSize: 22, margin: '0 0 3px', letterSpacing: -0.4 },
  sub: { fontSize: 13, color: '#5B6470', margin: '0 0 22px', maxWidth: 600 },
};
