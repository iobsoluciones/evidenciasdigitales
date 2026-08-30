/**
 * MATRIZ DE PELIGROS — GTC 45
 * Estándar 4.1.2 de la Resolución 0312 de 2019.
 */
import { redirect } from 'next/navigation';
import { obtenerPerfil } from '@/lib/sesion';
import { empresaActiva } from '@/lib/empresa-activa';
import {
  listarPeligros, resumenPeligros, opcionesDeControl,
} from '@/lib/acciones-peligros';
import VistaPeligros from './VistaPeligros';

export const dynamic = 'force-dynamic';

export default async function PaginaPeligros() {
  const perfil = await obtenerPerfil();
  if (!perfil) redirect('/login');

  const empresa = await empresaActiva();
  if (!empresa) {
    return (
      <>
        <h1 style={s.titulo}>Matriz de peligros</h1>
        <p style={s.sub}>Agrega una empresa para identificar sus peligros.</p>
      </>
    );
  }

  const [peligros, resumen, opciones] = await Promise.all([
    listarPeligros(),
    resumenPeligros(),
    opcionesDeControl(),
  ]);

  return (
    <>
      <h1 style={s.titulo}>Matriz de peligros</h1>
      <p style={s.sub}>
        {empresa.nombre} · metodología GTC 45. De aquí deberían salir el EPP que se
        entrega, la capacitación que se dicta y la inspección que se programa: es lo
        que permite responderle a un auditor <em>por qué</em> ese control y no otro.
      </p>

      <VistaPeligros
        key={empresa.id}
        peligros={peligros}
        resumen={resumen}
        opciones={opciones}
        color={empresa.color_primario}
      />
    </>
  );
}

const s: Record<string, React.CSSProperties> = {
  titulo: { fontSize: 23, fontWeight: 700, color: '#14263F', margin: '0 0 4px' },
  sub: { fontSize: 13.5, color: '#5B6470', margin: '0 0 18px', maxWidth: 680, lineHeight: 1.6 },
};
