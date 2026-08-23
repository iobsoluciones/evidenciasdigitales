'use client';

/**
 * CARGA DEL LOGO DE LA ORGANIZACIÓN
 * ---------------------------------------------------------------
 * El archivo se sube a Supabase Storage desde el navegador, en la
 * carpeta {org_id}/. Las políticas del bucket verifican que ese
 * primer segmento coincida con la organización del usuario, así que
 * nadie puede escribir en la carpeta de otra empresa.
 *
 * En la base de datos solo se guarda la URL pública.
 */
import { useState, useRef, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { crearClienteNavegador } from '@/lib/supabase/cliente';
import { guardarLogoEmpresa } from '@/lib/acciones-empresas';

const MAX_BYTES = 2 * 1024 * 1024; // 2 MB
const TIPOS = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];

export default function CargaLogo({
  orgId,
  empresaId,
  logoActual,
  esAdmin,
}: {
  orgId: string;
  empresaId: string;
  logoActual: string | null;
  esAdmin: boolean;
}) {
  const router = useRouter();
  const supabase = crearClienteNavegador();
  const inputRef = useRef<HTMLInputElement>(null);

  const [pendiente, startTransition] = useTransition();
  const [subiendo, setSubiendo] = useState(false);
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);
  const [previa, setPrevia] = useState<string | null>(logoActual);

  async function subir(archivo: File) {
    setAviso(null);

    if (!TIPOS.includes(archivo.type)) {
      setAviso({ tipo: 'error', texto: 'Formato no admitido. Usa PNG, JPG, GIF o WEBP.' });
      return;
    }
    if (archivo.size > MAX_BYTES) {
      setAviso({ tipo: 'error', texto: 'La imagen supera el máximo de 2 MB.' });
      return;
    }

    setSubiendo(true);

    // La extensión se toma del nombre original; el nombre lleva marca de
    // tiempo para que el navegador no muestre el logo anterior cacheado.
    const ext = archivo.name.split('.').pop()?.toLowerCase() ?? 'png';
    // El PRIMER segmento debe ser org_id: las politicas del bucket lo
    // comparan contra mi_org_id(). La empresa va como segundo nivel.
    const ruta = `${orgId}/${empresaId}/logo-${Date.now()}.${ext}`;

    const { error: errSubida } = await supabase.storage
      .from('logos')
      .upload(ruta, archivo, { cacheControl: '3600', upsert: false });

    if (errSubida) {
      setSubiendo(false);
      setAviso({ tipo: 'error', texto: 'No se pudo subir: ' + errSubida.message });
      return;
    }

    const { data } = supabase.storage.from('logos').getPublicUrl(ruta);

    startTransition(async () => {
      const r = await guardarLogoEmpresa(empresaId, data.publicUrl);
      setSubiendo(false);
      setAviso({ tipo: r.ok ? 'ok' : 'error', texto: r.mensaje });
      if (r.ok) {
        setPrevia(data.publicUrl);
        if (inputRef.current) inputRef.current.value = '';
        router.refresh();
      }
    });
  }

  function quitar() {
    startTransition(async () => {
      const r = await guardarLogoEmpresa(empresaId, null);
      setAviso({ tipo: r.ok ? 'ok' : 'error', texto: r.mensaje });
      if (r.ok) {
        setPrevia(null);
        router.refresh();
      }
    });
  }

  const ocupado = subiendo || pendiente;

  return (
    <section style={est.card}>
      <h2 style={est.h2}>Logo de la empresa</h2>

      <div style={est.previa}>
        {previa ? (
          <img src={previa} alt="Logo" style={{ maxHeight: 110, maxWidth: '100%', objectFit: 'contain' }} />
        ) : (
          <span style={{ color: '#9ca3af', fontSize: 12 }}>Sin logo cargado</span>
        )}
      </div>

      {esAdmin && (
        <>
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/gif,image/webp"
            disabled={ocupado}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) subir(f);
            }}
            style={{ fontSize: 12, marginTop: 10 }}
          />
          <p style={{ fontSize: 11, color: '#6b7280', margin: '6px 0 0' }}>
            PNG, JPG, GIF o WEBP · máximo 2 MB. Aparece en las actas de esta empresa.
          </p>

          {previa && (
            <button onClick={quitar} disabled={ocupado} style={est.btnQuitar}>
              Quitar logo
            </button>
          )}
        </>
      )}

      {subiendo && (
        <p style={{ fontSize: 12, color: '#3b82f6', marginTop: 8 }}>Subiendo imagen…</p>
      )}

      {aviso && (
        <div style={{
          ...est.aviso,
          background: aviso.tipo === 'ok' ? '#f0fdf4' : '#fef2f2',
          color: aviso.tipo === 'ok' ? '#15803d' : '#b91c1c',
        }}>
          {aviso.texto}
        </div>
      )}
    </section>
  );
}

const est: Record<string, React.CSSProperties> = {
  card: {
    background: '#fff', border: '1px solid #E4E4DF', borderRadius: 8,
    padding: 22, marginBottom: 0,
  },
  h2: { fontSize: 14.5, margin: '0 0 14px', fontWeight: 600 },
  label: { display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 8 },
  previa: {
    border: '1px dashed #DFDFD8', borderRadius: 6, padding: 20,
    background: '#FBFBF9', textAlign: 'center', minHeight: 150,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  btnQuitar: {
    display: 'block', marginTop: 10, background: '#f1f5f9',
    color: '#b91c1c', border: '1px solid #fca5a5', padding: '7px 14px',
    borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
  },
  aviso: { marginTop: 12, padding: '10px 14px', borderRadius: 8, fontSize: 13 },
};
