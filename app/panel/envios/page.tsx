/**
 * BITÁCORA DE ENVÍOS
 * El soporte del consultor: el correo no sale de su cuenta.
 */
import { empresaActiva } from '@/lib/empresa-activa';
import { listarEnvios } from '@/lib/acciones-envios';
import VistaEnvios from './VistaEnvios';

export default async function PaginaEnvios({
  searchParams,
}: {
  searchParams: Promise<{ todas?: string }>;
}) {
  const { todas } = await searchParams;
  const verTodas = todas === '1';

  const empresa = await empresaActiva();
  const envios = await listarEnvios(verTodas);

  return (
    <>
      <h1 style={s.titulo}>Envíos</h1>
      <p style={s.sub}>
        Registro de los correos enviados desde el sistema. Sirve como
        soporte: los mensajes salen del dominio del servicio, no de tu
        cuenta de correo.
      </p>

      <VistaEnvios
        envios={envios}
        empresaNombre={empresa?.nombre ?? ''}
        verTodas={verTodas}
      />
    </>
  );
}

const s: Record<string, React.CSSProperties> = {
  titulo: { fontSize: 22, margin: '0 0 3px', letterSpacing: -0.4 },
  sub: { fontSize: 13, color: 'var(--texto-suave)', margin: '0 0 22px', maxWidth: 600 },
};
