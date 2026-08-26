/**
 * CALENDARIO DE PLANEACIÓN
 * ---------------------------------------------------------------
 * Un mes a la vez, o una sola semana. El rango que se consulta es
 * exactamente el que se pinta, para que el PDF del cronograma no
 * discrepe de lo que hay en pantalla.
 */
import { obtenerPerfil } from '@/lib/sesion';
import { listarEmpresas, empresaActiva } from '@/lib/empresa-activa';
import { obtenerCalendario } from '@/lib/acciones-agenda';
import VistaCalendario from './VistaCalendario';
import AccionesCronograma from './AccionesCronograma';

export default async function PaginaCalendario({
  searchParams,
}: {
  searchParams: Promise<{ desde?: string; todas?: string; modo?: string }>;
}) {
  const { desde, todas, modo } = await searchParams;
  const perfil = await obtenerPerfil();
  const empresas = await listarEmpresas();
  const activa = await empresaActiva();

  const porSemana = modo === 'semana';

  // Fecha de referencia: hoy salvo que se navegue.
  const base = desde ? new Date(desde + 'T12:00:00') : new Date();

  let inicio: Date;
  let fin: Date;

  if (porSemana) {
    // Lunes a domingo de la semana que contiene a `base`.
    // getDay() da 0 para domingo, de ahi el desplazamiento.
    const desplazamiento = (base.getDay() + 6) % 7;
    inicio = new Date(base.getFullYear(), base.getMonth(), base.getDate() - desplazamiento);
    fin = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + 6);
  } else {
    inicio = new Date(base.getFullYear(), base.getMonth(), 1);
    fin = new Date(base.getFullYear(), base.getMonth() + 1, 0);
  }

  // Fecha local, no UTC: toISOString desplazaria el dia en Colombia.
  const iso = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

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
      porSemana={porSemana}
      color={activa?.color_primario ?? '#14263F'}
      />
    </>
  );
}
