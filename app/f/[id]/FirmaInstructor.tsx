'use client';

import { useState, useRef } from 'react';
import { crearClienteNavegador } from '@/lib/supabase/cliente';
import LienzoFirma, { type LienzoFirmaRef } from '../../LienzoFirma';

export default function FirmaInstructor({
  capacitacionId,
  orgId,
  token,
  color,
}: {
  capacitacionId: string;
  orgId: string;
  token: string;
  color: string;
}) {
  const supabase = crearClienteNavegador();
  const firmaRef = useRef<LienzoFirmaRef>(null);

  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [listo, setListo] = useState(false);

  async function guardar() {
    setError('');

    if (!firmaRef.current?.tieneFirma()) {
      setError('Dibuja tu firma antes de continuar.');
      return;
    }

    setGuardando(true);
    const blob = await firmaRef.current.obtenerBlob();

    if (!blob) {
      setGuardando(false);
      setError('No se pudo procesar la firma.');
      return;
    }

    // La ruta empieza por org_id para respetar las políticas de Storage
    const ruta = `${orgId}/${capacitacionId}/instructor-${Date.now()}.png`;
    const { error: errSubida } = await supabase.storage
      .from('firmas')
      .upload(ruta, blob, { contentType: 'image/png', upsert: false });

    if (errSubida) {
      setGuardando(false);
      setError('No se pudo guardar la firma. Intenta de nuevo.');
      return;
    }

    // El token se vuelve a validar en la base de datos
    const { data, error: errRpc } = await supabase.rpc('firmar_como_instructor', {
      p_capacitacion_id: capacitacionId,
      p_token: token,
      p_firma_url: ruta,
    });

    setGuardando(false);

    if (errRpc) {
      setError('Error de conexión. Intenta de nuevo.');
      return;
    }

    const r = data as { ok: boolean; error?: string };
    if (!r.ok) {
      setError(r.error ?? 'No se pudo registrar la firma.');
      return;
    }

    setListo(true);
  }

  if (listo) {
    return (
      <div style={{ textAlign: 'center', padding: '26px 0' }}>
        <div style={{
          width: 60, height: 60, borderRadius: '50%', background: '#dcfce7',
          color: '#15803d', fontSize: 30, lineHeight: '60px', margin: '0 auto 16px',
        }}>
          ✓
        </div>
        <h2 style={{ fontSize: 18, color: '#15803d', margin: '0 0 6px' }}>
          Firma registrada
        </h2>
        <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>
          Gracias. Ya puedes cerrar esta página.
        </p>
      </div>
    );
  }

  return (
    <>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
        Dibuja tu firma en el recuadro
      </label>
      <LienzoFirma ref={firmaRef} color={color} />

      {error && (
        <div style={{
          marginTop: 14, padding: '11px 14px', background: '#fef2f2',
          color: '#dc2626', borderRadius: 8, fontSize: 13,
        }}>
          {error}
        </div>
      )}

      <button onClick={guardar} disabled={guardando} style={{
        width: '100%', marginTop: 20, padding: 14, color: '#fff', border: 'none',
        borderRadius: 10, fontSize: 15, fontWeight: 600,
        background: guardando ? '#cbd5e1' : color,
        cursor: guardando ? 'not-allowed' : 'pointer',
      }}>
        {guardando ? 'Guardando…' : 'Registrar mi firma'}
      </button>
    </>
  );
}
