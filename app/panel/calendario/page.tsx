/**
 * CALENDARIO DE PLANEACIÓN
 * ---------------------------------------------------------------
 * Vista de tres meses con las capacitaciones ya creadas y las
 * anotaciones de agenda. Es informativo: no crea capacitaciones.
 */
import { obtenerPerfil } from '@/lib/sesion';
import { listarEmpresas, empresaActiva } from '@/lib/empresa-activa';
import { obtenerCalendario } from '@/lib/acciones-agenda';
import VistaCalendario from './VistaCalendario';
import AccionesCronograma from './AccionesCronograma';

export default async function PaginaCalendario({
  searchParams,
}: {
  searchParams: Promise<{ desde?: string; todas?: string }>;
}) {
  const { desde, todas } = await searchParams;
  const perfil = await obtenerPerfil();
  const empresas = await listarEmpresas();
  const activa = await empresaActiva();

  // Mes de inicio: el actual salvo que se navegue
  const base = desde ? new Date(desde + 'T12:00:00') : new Date();
  const inicio = new Date(base.getFullYear(), base.getMonth(), 1);
  // Dos meses: el actual y el siguiente
  const fin = new Date(base.getFullYear(), base.getMonth() + 2, 0);

  const iso = (d: Date) => d.toISOString().slice(0, 10);

  // "todas" muestra la agenda de todas las empresas del consultor
  const verTodas = todas === '1';
  const eventos = await obtenerCalendario(
    iso(inicio),
    iso(fin),
    verTodas ? undefined : activa?.id
  );

  return (
    <>
      <AccionesCronograma
        empresaId={activa?.id ?? null}
        empresaNombre={activa?.nombre ?? ''}
        correoContacto={activa?.correo ?? null}
        desde={iso(inicio)}
        hasta={iso(fin)}
        verTodas={verTodas}
        color={activa?.color_primario ?? '#14263F'}
      />

      <VistaCalendario
      eventos={eventos}
      empresas={empresas}
      empresaActiva={activa}
      mesInicio={iso(inicio)}
      verTodas={verTodas}
      color={activa?.color_primario ?? '#14263F'}
      />
    </>
  );
}
