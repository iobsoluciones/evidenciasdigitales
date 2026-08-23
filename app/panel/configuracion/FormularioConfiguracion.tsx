'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { guardarConfiguracion } from '@/lib/acciones';
import type { Organizacion } from '@/lib/sesion';
import CargaLogo from './CargaLogo';

export default function FormularioConfiguracion({
  organizacion,
  esAdmin,
}: {
  organizacion: Organizacion;
  esAdmin: boolean;
}) {
  const router = useRouter();
  const [pendiente, startTransition] = useTransition();
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  const [form, setForm] = useState({
    titulo_doc: organizacion.titulo_doc ?? '',
    nomenclatura: organizacion.nomenclatura ?? '',
    version_doc: organizacion.version_doc ?? 'V1',
    color_primario: organizacion.color_primario ?? '#1e3a8a',
  });

  function guardar() {
    startTransition(async () => {
      const r = await guardarConfiguracion(form);
      setAviso({ tipo: r.ok ? 'ok' : 'error', texto: r.mensaje });
      if (r.ok) router.refresh();
    });
  }

  return (
    <section style={est.tarjeta}>
      {!esAdmin && (
        <div style={{ ...est.aviso, background: '#fef9c3', color: '#a16207' }}>
          Solo los administradores pueden modificar esta configuración.
        </div>
      )}

      <label style={est.label}>Título del documento</label>
      <input
        value={form.titulo_doc}
        onChange={(e) => setForm({ ...form, titulo_doc: e.target.value })}
        disabled={!esAdmin}
        style={est.input}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label style={est.label}>Nomenclatura</label>
          <input
            value={form.nomenclatura}
            onChange={(e) => setForm({ ...form, nomenclatura: e.target.value })}
            placeholder="Ej: IOB-25-2026"
            disabled={!esAdmin}
            style={est.input}
          />
        </div>
        <div>
          <label style={est.label}>Versión</label>
          <input
            value={form.version_doc}
            onChange={(e) => setForm({ ...form, version_doc: e.target.value })}
            placeholder="V1"
            disabled={!esAdmin}
            style={est.input}
          />
        </div>
      </div>

      <label style={est.label}>Color de marca</label>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <input
          type="color"
          value={form.color_primario}
          onChange={(e) => setForm({ ...form, color_primario: e.target.value })}
          disabled={!esAdmin}
          style={{ width: 54, height: 38, padding: 2, border: '1px solid #cbd5e1', borderRadius: 8 }}
        />
        <input
          value={form.color_primario}
          onChange={(e) => setForm({ ...form, color_primario: e.target.value })}
          disabled={!esAdmin}
          style={{ ...est.input, maxWidth: 140 }}
        />
      </div>

      <CargaLogo
        orgId={organizacion.id}
        logoActual={organizacion.logo_url}
        esAdmin={esAdmin}
      />

      <div style={{ marginTop: 16, padding: 12, background: '#fefce8', borderRadius: 8, fontSize: 11.5, color: '#a16207' }}>
        Los cambios aquí aplican solo a las capacitaciones <strong>nuevas</strong>.
        Las actas ya creadas conservan la nomenclatura y versión con las que
        nacieron: un documento emitido no puede cambiar de identificación
        documental después.
      </div>

      <div style={{ marginTop: 18, padding: 14, background: '#f8fafc', borderRadius: 10, fontSize: 12, color: '#6b7280' }}>
        <strong style={{ color: '#1f2937' }}>Vista previa del encabezado:</strong>
        <div style={{ marginTop: 8, textAlign: 'center' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: form.color_primario }}>
            {form.titulo_doc || 'TÍTULO DEL DOCUMENTO'}
          </div>
          <div style={{ fontSize: 10, marginTop: 3 }}>
            VERSIÓN: {form.version_doc} · NOMENCLATURA: {form.nomenclatura || '—'}
          </div>
        </div>
      </div>

      {aviso && (
        <div style={{
          ...est.aviso,
          marginTop: 16,
          background: aviso.tipo === 'ok' ? '#f0fdf4' : '#fef2f2',
          color: aviso.tipo === 'ok' ? '#15803d' : '#b91c1c',
        }}>
          {aviso.texto}
        </div>
      )}

      {esAdmin && (
        <button onClick={guardar} disabled={pendiente} style={{ ...est.btn, marginTop: 18 }}>
          {pendiente ? 'Guardando…' : 'Guardar configuración'}
        </button>
      )}
    </section>
  );
}

const est: Record<string, React.CSSProperties> = {
  tarjeta: { background: '#fff', borderRadius: 14, padding: 22, marginTop: 20, maxWidth: 560, boxShadow: '0 6px 18px rgba(0,0,0,.05)' },
  label: { display: 'block', fontSize: 12, fontWeight: 600, margin: '14px 0 4px' },
  input: { width: '100%', padding: '9px 10px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' },
  btn: { background: '#1e3a8a', color: '#fff', border: 'none', padding: '11px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  aviso: { padding: '10px 14px', borderRadius: 8, fontSize: 13 },
};
