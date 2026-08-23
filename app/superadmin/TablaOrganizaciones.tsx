'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { crearClienteNavegador } from '@/lib/supabase/cliente';
import type { OrgResumen } from './page';

const PLANES = ['prueba', 'basico', 'pro', 'enterprise'];
const ESTADOS = ['activo', 'suspendido'];

export default function TablaOrganizaciones({
  organizaciones,
}: {
  organizaciones: OrgResumen[];
}) {
  const router = useRouter();
  const supabase = crearClienteNavegador();
  const [pendiente, startTransition] = useTransition();
  const [aviso, setAviso] = useState('');
  const [filtro, setFiltro] = useState('');

  function cambiarPlan(org: OrgResumen, plan: string) {
    // Al pasar de prueba a un plan pago se quita la fecha de vencimiento;
    // el cobro pasa a gestionarse por fuera.
    const vence = plan === 'prueba'
      ? new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10)
      : null;

    startTransition(async () => {
      const { data } = await supabase.rpc('cambiar_plan_organizacion', {
        p_org: org.id, p_plan: plan, p_fecha_expiracion: vence,
      });
      const r = data as { ok: boolean; mensaje?: string; error?: string };
      setAviso(r.ok ? `${org.nombre}: plan cambiado a ${plan}.` : (r.error ?? 'Error.'));
      router.refresh();
    });
  }

  function cambiarEstado(org: OrgResumen, estado: string) {
    startTransition(async () => {
      const { data } = await supabase.rpc('cambiar_estado_organizacion', {
        p_org: org.id, p_estado: estado,
      });
      const r = data as { ok: boolean; mensaje?: string; error?: string };
      setAviso(r.ok ? `${org.nombre}: ${estado}.` : (r.error ?? 'Error.'));
      router.refresh();
    });
  }

  const lista = organizaciones.filter((o) =>
    !filtro || (o.nombre + ' ' + o.slug).toLowerCase().includes(filtro.toLowerCase())
  );

  const fmt = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString('es-CO', { dateStyle: 'medium' }) : '—';

  /** Días restantes: negativo significa vencida. */
  function dias(iso: string | null): number | null {
    if (!iso) return null;
    return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
  }

  return (
    <section style={s.card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, gap: 12, flexWrap: 'wrap' }}>
        <h2 style={{ fontSize: 15, margin: 0 }}>Organizaciones ({lista.length})</h2>
        <input
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          placeholder="Buscar…"
          style={s.input}
        />
      </div>

      {aviso && <div style={s.aviso}>{aviso}</div>}

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr>
              {['Cuenta', 'Identificador', 'Plan', 'Estado', 'Vence', 'Empresas', 'Usuarios', 'Capac.', 'Particip.', 'Última actividad'].map((h) => (
                <th key={h} style={s.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lista.map((o) => {
              const d = dias(o.fecha_expiracion);
              const critico = d !== null && d <= 7;
              return (
                <tr key={o.id}>
                  <td style={s.td}><strong>{o.nombre}</strong></td>
                  <td style={s.td}><code style={s.code}>{o.slug}</code></td>
                  <td style={s.td}>
                    <select
                      value={o.plan}
                      disabled={pendiente}
                      onChange={(e) => cambiarPlan(o, e.target.value)}
                      style={s.select}
                    >
                      {PLANES.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </td>
                  <td style={s.td}>
                    <select
                      value={o.estado}
                      disabled={pendiente}
                      onChange={(e) => cambiarEstado(o, e.target.value)}
                      style={{
                        ...s.select,
                        background: o.estado === 'activo' ? '#f0fdf4' : '#fef2f2',
                        color: o.estado === 'activo' ? '#15803d' : '#b91c1c',
                      }}
                    >
                      {ESTADOS.map((e) => <option key={e} value={e}>{e}</option>)}
                    </select>
                  </td>
                  <td style={{ ...s.td, color: critico ? '#b91c1c' : undefined, fontWeight: critico ? 600 : 400 }}>
                    {fmt(o.fecha_expiracion)}
                    {d !== null && (
                      <span style={{ fontSize: 11, display: 'block', opacity: .8 }}>
                        {d < 0 ? `vencida hace ${-d} d` : `${d} d`}
                      </span>
                    )}
                  </td>
                  <td style={s.td}>
                    <span style={{
                      fontWeight: 600,
                      color: o.max_empresas !== null && o.empresas >= o.max_empresas
                        ? '#9B1C1C' : '#14263F',
                    }}>
                      {o.empresas}
                    </span>
                    <span style={{ color: '#8A929C' }}>
                      {o.max_empresas !== null ? ` / ${o.max_empresas}` : ' / ∞'}
                    </span>
                  </td>
                  <td style={s.td}>{o.usuarios}</td>
                  <td style={s.td}>{o.capacitaciones}</td>
                  <td style={s.td}>{o.participantes}</td>
                  <td style={s.td}>{fmt(o.ultima_actividad)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {lista.length === 0 && (
        <p style={{ textAlign: 'center', color: '#6b7280', padding: '30px 0', fontSize: 13 }}>
          Sin organizaciones registradas.
        </p>
      )}
    </section>
  );
}

const s: Record<string, React.CSSProperties> = {
  card: { background: '#fff', borderRadius: 14, padding: 20, boxShadow: '0 6px 18px rgba(0,0,0,.05)' },
  th: { background: '#f8fafc', color: '#6b7280', fontSize: 11, textTransform: 'uppercase', padding: '9px 8px', textAlign: 'left', borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap' },
  td: { padding: '10px 8px', borderBottom: '1px solid #e5e7eb', verticalAlign: 'middle' },
  code: { background: '#f1f5f9', padding: '2px 6px', borderRadius: 4, fontSize: 12 },
  select: { padding: '5px 8px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 12 },
  input: { padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 13, minWidth: 200 },
  aviso: { padding: '10px 14px', background: '#f0fdf4', color: '#15803d', borderRadius: 8, fontSize: 13, marginBottom: 14 },
};
