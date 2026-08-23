/**
 * REGISTRO DE ARTÍCULO
 * La primera decisión es el tipo, porque determina el resto del
 * formulario: un consumible tiene vida útil y stock; un retornable
 * tiene unidades con serial.
 */
import Link from 'next/link';
import { obtenerPerfil } from '@/lib/sesion';
import { empresaActiva } from '@/lib/empresa-activa';
import FormularioArticulo from '../FormularioArticulo';

export default async function PaginaNuevoArticulo({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string }>;
}) {
  const { tipo } = await searchParams;
  const perfil = await obtenerPerfil();
  const empresa = await empresaActiva();
  if (!perfil || !empresa) return null;

  const inicial = tipo === 'retornable' ? 'retornable' : 'consumible';

  return (
    <>
      <Link href="/panel/dotacion" style={s.volver}>← Dotación</Link>
      <h1 style={s.titulo}>Nuevo artículo</h1>
      <p style={s.sub}>
        El código se genera solo: <span style={s.mono}>EPP-26-001</span> para
        consumibles, <span style={s.mono}>EQ-26-001</span> para equipos.
      </p>

      <FormularioArticulo
        tipoInicial={inicial}
        orgId={perfil.organizacion.id}
        color={empresa.color_primario}
      />
    </>
  );
}

const s: Record<string, React.CSSProperties> = {
  volver: { fontSize: 13, color: '#5B6470', textDecoration: 'none' },
  titulo: { fontSize: 22, margin: '12px 0 3px', letterSpacing: -0.4 },
  sub: { fontSize: 13, color: '#5B6470', margin: '0 0 22px' },
  mono: { fontFamily: 'ui-monospace,SFMono-Regular,Menlo,monospace', fontSize: 12 },
};
