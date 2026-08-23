'use client';

/**
 * CARGA DE FOTOGRAFÍA
 * ---------------------------------------------------------------
 * Se usa tanto para el artículo del catálogo como para cada unidad.
 *
 * Comprime EN EL NAVEGADOR antes de subir: una foto de celular son
 * 4-8 MB; a 800 px y calidad 0,8 quedan bajo 200 KB. Con 200 artículos
 * la diferencia es entre 1,6 GB y 40 MB, y eso decide si el módulo
 * cabe en el plan contratado.
 *
 * En móvil, `capture="environment"` abre la cámara trasera: quien
 * registra el inventario está en la bodega, no en un escritorio.
 */
import { useState, useRef } from 'react';
import { crearClienteNavegador } from '@/lib/supabase/cliente';

const MAX_ANCHO = 800;
const CALIDAD = 0.8;

/** Redimensiona y comprime a JPEG antes de subir. */
async function comprimir(archivo: File): Promise<Blob | null> {
  try {
    const bitmap = await createImageBitmap(archivo);
    const escala = Math.min(1, MAX_ANCHO / bitmap.width);

    const lienzo = document.createElement('canvas');
    lienzo.width = Math.round(bitmap.width * escala);
    lienzo.height = Math.round(bitmap.height * escala);

    const ctx = lienzo.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(bitmap, 0, 0, lienzo.width, lienzo.height);

    return await new Promise((resolver) =>
      lienzo.toBlob((b) => resolver(b), 'image/jpeg', CALIDAD)
    );
  } catch {
    return null;
  }
}

export default function CargaFoto({
  orgId,
  carpeta,
  fotoActual,
  onGuardar,
  alto = 200,
  etiqueta = 'Fotografía',
}: {
  orgId: string;
  /** Subcarpeta dentro de la organización, p. ej. `articulos/{id}` */
  carpeta: string;
  fotoActual: string | null;
  onGuardar: (url: string | null) => Promise<{ ok: boolean; mensaje: string }>;
  alto?: number;
  etiqueta?: string;
}) {
  const supabase = crearClienteNavegador();
  const entrada = useRef<HTMLInputElement>(null);

  const [previa, setPrevia] = useState(fotoActual);
  const [subiendo, setSubiendo] = useState(false);
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  async function subir(archivo: File) {
    if (!archivo.type.startsWith('image/')) {
      setAviso({ tipo: 'error', texto: 'El archivo debe ser una imagen.' });
      return;
    }

    setSubiendo(true);
    setAviso(null);

    const comprimida = await comprimir(archivo);
    if (!comprimida) {
      setSubiendo(false);
      setAviso({ tipo: 'error', texto: 'No se pudo procesar la imagen.' });
      return;
    }

    // El primer segmento debe ser org_id: las políticas del bucket lo
    // comparan contra mi_org_id().
    const ruta = `${orgId}/${carpeta}/foto-${Date.now()}.jpg`;

    const { error } = await supabase.storage
      .from('logos')
      .upload(ruta, comprimida, { contentType: 'image/jpeg', upsert: true });

    if (error) {
      setSubiendo(false);
      setAviso({ tipo: 'error', texto: 'No se pudo subir la imagen.' });
      return;
    }

    const { data } = supabase.storage.from('logos').getPublicUrl(ruta);
    const r = await onGuardar(data.publicUrl);

    setSubiendo(false);
    setAviso({ tipo: r.ok ? 'ok' : 'error', texto: r.mensaje });
    if (r.ok) setPrevia(data.publicUrl);
    if (entrada.current) entrada.current.value = '';

    const kb = Math.round(comprimida.size / 1024);
    if (r.ok) setAviso({ tipo: 'ok', texto: `Fotografía guardada (${kb} KB).` });
  }

  async function quitar() {
    setSubiendo(true);
    const r = await onGuardar(null);
    setSubiendo(false);
    setAviso({ tipo: r.ok ? 'ok' : 'error', texto: r.mensaje });
    if (r.ok) setPrevia(null);
  }

  return (
    <div>
      <label style={e.label}>{etiqueta}</label>

      <div style={{ ...e.marco, height: alto }}>
        {previa
          ? <img src={previa} alt={etiqueta} style={e.imagen} />
          : <span style={e.vacio}>Sin fotografía</span>}
      </div>

      <div style={e.acciones}>
        <label style={{ ...e.btn, cursor: subiendo ? 'not-allowed' : 'pointer' }}>
          {subiendo ? 'Procesando…' : previa ? 'Cambiar' : 'Agregar fotografía'}
          <input
            ref={entrada}
            type="file"
            accept="image/*"
            capture="environment"
            disabled={subiendo}
            onChange={(ev) => {
              const a = ev.target.files?.[0];
              if (a) subir(a);
            }}
            style={{ display: 'none' }}
          />
        </label>

        {previa && (
          <button onClick={quitar} disabled={subiendo} style={e.btnQuitar}>
            Quitar
          </button>
        )}
      </div>

      {aviso && (
        <p style={{
          ...e.aviso,
          color: aviso.tipo === 'ok' ? '#15803D' : '#9B1C1C',
        }}>
          {aviso.texto}
        </p>
      )}

      <p style={e.nota}>
        Se comprime automáticamente antes de subir. En el celular abre la cámara.
      </p>
    </div>
  );
}

const e: Record<string, React.CSSProperties> = {
  label: { display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 },
  marco: {
    width: '100%', background: '#FBFBF9',
    borderWidth: 1, borderStyle: 'dashed', borderColor: '#DFDFD8', borderRadius: 6,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    marginBottom: 10, overflow: 'hidden',
  },
  imagen: { maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' },
  vacio: { fontSize: 12, color: '#A3AAB3' },
  acciones: { display: 'flex', gap: 8 },
  btn: {
    background: '#14263F', color: '#fff', padding: '8px 16px', borderRadius: 4,
    fontSize: 12.5, fontWeight: 600, textAlign: 'center', flex: 1,
  },
  btnQuitar: {
    background: '#fff', color: '#9B1C1C',
    borderWidth: 1, borderStyle: 'solid', borderColor: '#F5C6C6',
    padding: '8px 16px', borderRadius: 4, fontSize: 12.5,
    fontWeight: 600, cursor: 'pointer',
  },
  aviso: { fontSize: 11.5, margin: '8px 0 0' },
  nota: { fontSize: 11, color: '#8A929C', margin: '6px 0 0', lineHeight: 1.5 },
};
