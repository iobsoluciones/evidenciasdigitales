/**
 * PANEL PRINCIPAL
 * ---------------------------------------------------------------
 * Ademas de mostrar el estado, esta pantalla sirve como VERIFICACION
 * VISUAL DE AISLAMIENTO: las consultas NO filtran por org_id, asi que
 * si alguna vez aparecen datos de otra empresa, el fallo esta en RLS
 * y se nota de inmediato.
 */
import { obtenerPerfil } from '@/lib/sesion';
import { crearClienteServidor } from '@/lib/supabase/servidor';

export default async function PaginaPanel() {
  const perfil = await obtenerPerfil();
  const supabase = await crearClienteServidor();

  // Sin filtro de organizacion: RLS decide que se ve
  const { count: totalCapacitaciones } = await supabase
    .from('capacitaciones')
    .select('*', { count: 'exact', head: true });

  const { count: totalParticipantes } = await supabase
    .from('participantes')
    .select('*', { count: 'exact', head: true });

  const { data: activa } = await supabase
    .from('capacitaciones')
    .select('codigo, tema, instructor, fecha_inicio, fecha_fin')
    .eq('estado', 'activa')
    .maybeSingle();

  const { data: organizaciones } = await supabase
    .from('organizaciones')
    .select('slug, nombre');

  return (
    <>
      <h1 style={{ fontSize: 22, color: '#1e3a8a', marginBottom: 4 }}>Panel</h1>
      <p style={{ color: '#6b7280', fontSize: 13, marginTop: 0 }}>
        Fase 1 completada: autenticación y contexto de organización funcionando.
      </p>

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))',
        gap: 14, margin: '22px 0',
      }}>
        <Tarjeta valor={String(totalCapacitaciones ?? 0)} etiqueta="Capacitaciones" />
        <Tarjeta valor={String(totalParticipantes ?? 0)} etiqueta="Participantes" />
        <Tarjeta valor={activa ? '1' : '0'} etiqueta="Activa ahora" />
        <Tarjeta valor={String(organizaciones?.length ?? 0)} etiqueta="Organizaciones visibles" />
      </div>

      {activa && (
        <Bloque titulo="Capacitación activa">
          <div style={{ fontSize: 14, fontWeight: 600 }}>{activa.tema}</div>
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
            {activa.codigo} · {activa.instructor}
          </div>
        </Bloque>
      )}

      <Bloque titulo="Verificación de aislamiento">
        <p style={{ fontSize: 13, color: '#374151', marginTop: 0 }}>
          Estas consultas se ejecutan <strong>sin filtrar por organización</strong>.
          Row Level Security es quien limita los resultados.
        </p>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <tbody>
            <Fila
              etiqueta="Organizaciones visibles"
              valor={organizaciones?.map((o) => o.nombre).join(', ') ?? '—'}
              ok={(organizaciones?.length ?? 0) === 1}
            />
            <Fila
              etiqueta="Tu organización"
              valor={perfil!.organizacion.nombre}
              ok
            />
            <Fila
              etiqueta="Nomenclatura documental"
              valor={perfil!.organizacion.nomenclatura ?? '—'}
              ok
            />
          </tbody>
        </table>
        <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 0 }}>
          Si «Organizaciones visibles» muestra más de una, hay una falla de RLS: detén el desarrollo y revísala.
        </p>
      </Bloque>
    </>
  );
}

function Tarjeta({ valor, etiqueta }: { valor: string; etiqueta: string }) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 4px 12px rgba(0,0,0,.04)' }}>
      <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--marca)' }}>{valor}</div>
      <div style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: .3 }}>{etiqueta}</div>
    </div>
  );
}

function Bloque({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section style={{ background: '#fff', borderRadius: 14, padding: 20, marginBottom: 20, boxShadow: '0 6px 18px rgba(0,0,0,.05)' }}>
      <h2 style={{ fontSize: 15, margin: '0 0 12px' }}>{titulo}</h2>
      {children}
    </section>
  );
}

function Fila({ etiqueta, valor, ok }: { etiqueta: string; valor: string; ok: boolean }) {
  return (
    <tr>
      <td style={{ padding: '8px 8px 8px 0', color: '#6b7280', borderBottom: '1px solid #e5e7eb' }}>{etiqueta}</td>
      <td style={{ padding: 8, borderBottom: '1px solid #e5e7eb' }}>{valor}</td>
      <td style={{ padding: 8, borderBottom: '1px solid #e5e7eb', textAlign: 'right' }}>
        <span style={{
          fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 999,
          background: ok ? '#dcfce7' : '#fee2e2', color: ok ? '#15803d' : '#b91c1c',
        }}>
          {ok ? 'Correcto' : 'Revisar'}
        </span>
      </td>
    </tr>
  );
}
