'use client';

/**
 * PERFIL PROFESIONAL — hoja de vida del consultor
 * ---------------------------------------------------------------
 * Lo que distingue esta hoja de vida de una normal: la sección de
 * trayectoria se llena con cifras del propio sistema —capacitaciones
 * dictadas, personas formadas, empresas atendidas—. No son afirmaciones
 * del candidato, son datos verificables, y eso es exactamente lo que
 * un cliente quiere ver antes de contratar.
 */
import { useState, useTransition, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  guardarPerfilProfesional, guardarFotoPerfil, guardarFirmaProfesional,
  enviarHojaVida,
  type PerfilProfesional, type Trayectoria,
  type ItemFormacion, type ItemExperiencia, type ItemCertificacion,
} from '@/lib/acciones-perfil';
import { crearClienteNavegador } from '@/lib/supabase/cliente';
import LienzoFirma, { type LienzoFirmaRef } from '@/app/LienzoFirma';

export default function EditorPerfil({
  perfil,
  trayectoria,
  nombreSesion,
  correoSesion,
  orgId,
  color,
}: {
  perfil: PerfilProfesional | null;
  /** obtenerTrayectoria() puede devolver null si la RPC falla. */
  trayectoria: Trayectoria | null;
  nombreSesion: string;
  correoSesion: string;
  orgId: string;
  color: string;
}) {
  const router = useRouter();
  const supabase = crearClienteNavegador();
  const [pendiente, startTransition] = useTransition();
  const fotoRef = useRef<HTMLInputElement>(null);
  const firmaRef = useRef<LienzoFirmaRef>(null);

  const [f, setF] = useState({
    nombre: perfil?.nombre ?? nombreSesion,
    titulo: perfil?.titulo ?? '',
    profesion: perfil?.profesion ?? '',
    tarjeta_profesional: perfil?.tarjeta_profesional ?? '',
    licencia_sst: perfil?.licencia_sst ?? '',
    vigencia_licencia: perfil?.vigencia_licencia ?? '',
    correo: perfil?.correo ?? correoSesion,
    telefono: perfil?.telefono ?? '',
    ciudad: perfil?.ciudad ?? '',
    resumen: perfil?.resumen ?? '',
  });

  const [formacion, setFormacion] = useState<ItemFormacion[]>(perfil?.formacion ?? []);
  const [experiencia, setExperiencia] = useState<ItemExperiencia[]>(perfil?.experiencia ?? []);
  const [certificaciones, setCertificaciones] = useState<ItemCertificacion[]>(
    perfil?.certificaciones ?? []
  );

  const [foto, setFoto] = useState(perfil?.foto_url ?? null);
  const [subiendo, setSubiendo] = useState(false);
  const [firma, setFirma] = useState(perfil?.firma_url ?? null);
  const [firmando, setFirmando] = useState(false);
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  // Envío por correo
  const [enviando, setEnviando] = useState(false);
  const [destinos, setDestinos] = useState('');
  const [mensaje, setMensaje] = useState('');

  function guardar() {
    startTransition(async () => {
      const r = await guardarPerfilProfesional({
        ...f, formacion, experiencia, certificaciones,
      });
      setAviso({ tipo: r.ok ? 'ok' : 'error', texto: r.mensaje });
      if (r.ok) router.refresh();
    });
  }

  async function subirFoto(archivo: File) {
    if (archivo.size > 2 * 1024 * 1024) {
      setAviso({ tipo: 'error', texto: 'La imagen no puede superar 2 MB.' });
      return;
    }
    setSubiendo(true);

    const ext = archivo.name.split('.').pop() ?? 'jpg';
    // El primer segmento debe ser org_id: las políticas del bucket lo
    // comparan contra mi_org_id().
    const ruta = `${orgId}/perfil/foto-${Date.now()}.${ext}`;

    const { error } = await supabase.storage
      .from('logos')
      .upload(ruta, archivo, { contentType: archivo.type, upsert: true });

    if (error) {
      setSubiendo(false);
      setAviso({ tipo: 'error', texto: 'No se pudo subir la imagen.' });
      return;
    }

    const { data } = supabase.storage.from('logos').getPublicUrl(ruta);

    startTransition(async () => {
      const r = await guardarFotoPerfil(data.publicUrl);
      setSubiendo(false);
      setAviso({ tipo: r.ok ? 'ok' : 'error', texto: r.mensaje });
      if (r.ok) { setFoto(data.publicUrl); router.refresh(); }
      if (fotoRef.current) fotoRef.current.value = '';
    });
  }

  /**
   * Sube la firma al bucket privado. Se guarda una vez y se reutiliza:
   * el consultor no tiene que volver a dibujarla en cada acta.
   */
  async function subirFirma() {
    if (!firmaRef.current?.tieneFirma()) {
      setAviso({ tipo: 'error', texto: 'Dibuja tu firma antes de guardarla.' });
      return;
    }

    const blob = await firmaRef.current.obtenerBlob();
    if (!blob) return;

    setSubiendo(true);
    // El primer segmento debe ser org_id: las políticas del bucket lo
    // comparan contra mi_org_id().
    const ruta = `${orgId}/perfil/firma-${Date.now()}.png`;

    const { error } = await supabase.storage
      .from('firmas')
      .upload(ruta, blob, { contentType: 'image/png', upsert: true });

    if (error) {
      setSubiendo(false);
      setAviso({ tipo: 'error', texto: 'No se pudo guardar la firma.' });
      return;
    }

    startTransition(async () => {
      const r = await guardarFirmaProfesional(ruta);
      setSubiendo(false);
      setAviso({ tipo: r.ok ? 'ok' : 'error', texto: r.mensaje });
      if (r.ok) { setFirma(ruta); setFirmando(false); router.refresh(); }
    });
  }

  function quitarFirma() {
    startTransition(async () => {
      const r = await guardarFirmaProfesional(null);
      setAviso({ tipo: r.ok ? 'ok' : 'error', texto: r.mensaje });
      if (r.ok) { setFirma(null); router.refresh(); }
    });
  }

  function enviar() {
    if (!destinos.trim()) {
      setAviso({ tipo: 'error', texto: 'Escribe al menos un correo.' });
      return;
    }
    startTransition(async () => {
      const r = await enviarHojaVida(destinos, mensaje);
      setAviso({ tipo: r.ok ? 'ok' : 'error', texto: r.mensaje });
      if (r.ok) { setEnviando(false); setMensaje(''); }
    });
  }

  return (
    <>
      {/* ---------- Trayectoria verificable ---------- */}
      {trayectoria && (
      <section style={{ ...e.card, borderLeftWidth: 3, borderLeftColor: color }}>
        <h2 style={e.h2}>Trayectoria en el sistema</h2>
        <p style={e.nota}>
          Estas cifras se calculan con tus registros y se incluyen en la hoja
          de vida. No son afirmaciones: son datos verificables.
        </p>
        <div style={e.kpis}>
          <Kpi v={String(trayectoria.capacitaciones)} l="Capacitaciones" color={color} />
          <Kpi v={String(trayectoria.personas)} l="Personas formadas" />
          <Kpi v={String(trayectoria.empresas)} l="Empresas atendidas" />
          <Kpi v={String(trayectoria.horas)} l="Horas dictadas" />
          <Kpi
            v={trayectoria.promedio !== null ? `${trayectoria.promedio}%` : '—'}
            l="Promedio evaluaciones"
          />
        </div>
      </section>
      )}

      {/* ---------- Acciones ---------- */}
      <section style={e.card}>
        <div style={e.filaAcciones}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <h2 style={e.h2}>Hoja de vida</h2>
            <p style={e.nota}>Se genera en PDF con los datos de abajo.</p>
          </div>
          <a href="/api/pdf-perfil" style={{ ...e.btn, background: color }}>
            Descargar PDF
          </a>
          <button onClick={() => setEnviando(!enviando)} style={e.btnSec}>
            {enviando ? 'Cancelar' : 'Enviar por correo'}
          </button>
        </div>

        {enviando && (
          <div style={e.bloque}>
            <label style={e.label}>Destinatarios</label>
            <input
              value={destinos}
              onChange={(ev) => setDestinos(ev.target.value)}
              placeholder="cliente@empresa.com"
              style={e.input}
            />
            <label style={{ ...e.label, marginTop: 12 }}>Mensaje</label>
            <textarea
              value={mensaje}
              rows={3}
              onChange={(ev) => setMensaje(ev.target.value)}
              placeholder="Opcional"
              style={{ ...e.input, resize: 'vertical' }}
            />
            <button
              onClick={enviar}
              disabled={pendiente}
              style={{ ...e.btn, background: pendiente ? 'var(--borde-fuerte)' : color, marginTop: 12, border: 'none', cursor: 'pointer' }}
            >
              {pendiente ? 'Enviando…' : 'Enviar hoja de vida'}
            </button>
          </div>
        )}
      </section>

      {aviso && (
        <div style={{
          ...e.aviso,
          background: aviso.tipo === 'ok' ? 'var(--bien-fondo)' : 'var(--mal-fondo)',
          color: aviso.tipo === 'ok' ? 'var(--bien)' : 'var(--mal)',
        }}>
          {aviso.texto}
        </div>
      )}

      {/* ---------- Datos personales ---------- */}
      <div style={e.dos}>
        <section style={e.card}>
          <h2 style={e.h2}>Datos personales</h2>

          <Campo etiqueta="Nombre completo" valor={f.nombre}
            onChange={(v) => setF({ ...f, nombre: v })} mayus />
          <Campo etiqueta="Título profesional" valor={f.titulo}
            onChange={(v) => setF({ ...f, titulo: v })}
            marcador="Ingeniero Industrial · Esp. en SST" />
          <Campo etiqueta="Profesión" valor={f.profesion}
            onChange={(v) => setF({ ...f, profesion: v })}
            marcador="Consultor HSEQ" />

          <div style={e.dosCampos}>
            <Campo etiqueta="Tarjeta profesional" valor={f.tarjeta_profesional}
              onChange={(v) => setF({ ...f, tarjeta_profesional: v })} />
            <Campo etiqueta="Licencia SST" valor={f.licencia_sst}
              onChange={(v) => setF({ ...f, licencia_sst: v })} />
          </div>

          <label style={e.label}>Vigencia de la licencia</label>
          <input type="date" value={f.vigencia_licencia}
            onChange={(ev) => setF({ ...f, vigencia_licencia: ev.target.value })}
            style={e.input} />

          <div style={e.dosCampos}>
            <Campo etiqueta="Correo" valor={f.correo} tipo="email"
              onChange={(v) => setF({ ...f, correo: v })} />
            <Campo etiqueta="Teléfono" valor={f.telefono}
              onChange={(v) => setF({ ...f, telefono: v })} />
          </div>

          <Campo etiqueta="Ciudad" valor={f.ciudad}
            onChange={(v) => setF({ ...f, ciudad: v })} mayus />

          <label style={e.label}>Perfil profesional</label>
          <textarea
            value={f.resumen}
            rows={5}
            onChange={(ev) => setF({ ...f, resumen: ev.target.value })}
            placeholder="Dos o tres frases sobre tu experiencia y enfoque."
            style={{ ...e.input, resize: 'vertical' }}
          />
        </section>

        {/* ---------- Foto ---------- */}
        <section style={e.card}>
          <h2 style={e.h2}>Fotografía</h2>
          <div style={e.previaFoto}>
            {foto
              ? <img src={foto} alt="Perfil" style={e.foto} />
              : <span style={{ fontSize: 12, color: 'var(--texto-tenue)' }}>Sin fotografía</span>}
          </div>
          <label style={{ ...e.btn, background: color, display: 'block', textAlign: 'center', cursor: 'pointer' }}>
            {subiendo ? 'Subiendo…' : 'Cambiar fotografía'}
            <input
              ref={fotoRef}
              type="file"
              accept="image/*"
              disabled={subiendo}
              onChange={(ev) => {
                const a = ev.target.files?.[0];
                if (a) subirFoto(a);
              }}
              style={{ display: 'none' }}
            />
          </label>
          <p style={e.nota}>
            Preferible cuadrada y de rostro. Máximo 2 MB.
          </p>

          <h2 style={{ ...e.h2, marginTop: 22 }}>Firma digital</h2>
          <p style={e.nota}>
            Se dibuja una vez y se reutiliza. Al crear una capacitación
            puedes anexarla al acta como responsable técnico.
          </p>

          {firma && !firmando ? (
            <>
              <div style={e.firmaGuardada}>
                <span style={{ fontSize: 12, color: 'var(--bien)', fontWeight: 600 }}>
                  ✓ Firma registrada
                </span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setFirmando(true)} style={e.btnSec}>
                  Volver a firmar
                </button>
                <button onClick={quitarFirma} disabled={pendiente} style={e.btnQuitar}>
                  Quitar
                </button>
              </div>
            </>
          ) : firmando ? (
            <>
              <LienzoFirma ref={firmaRef} color={color} />
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <button
                  onClick={subirFirma}
                  disabled={subiendo || pendiente}
                  style={{ ...e.btn, background: subiendo ? 'var(--borde-fuerte)' : color, border: 'none', cursor: 'pointer' }}
                >
                  {subiendo ? 'Guardando…' : 'Guardar firma'}
                </button>
                <button onClick={() => setFirmando(false)} style={e.btnSec}>
                  Cancelar
                </button>
              </div>
            </>
          ) : (
            <button onClick={() => setFirmando(true)} style={{ ...e.btnSec, width: '100%' }}>
              Dibujar mi firma
            </button>
          )}
        </section>
      </div>

      {/* ---------- Listas ---------- */}
      <Lista
        titulo="Formación académica"
        items={formacion}
        campos={[
          { k: 'titulo', et: 'Título', ancho: 2 },
          { k: 'institucion', et: 'Institución', ancho: 2 },
          { k: 'anio', et: 'Año', ancho: 1 },
        ]}
        onChange={setFormacion}
        color={color}
      />

      <Lista
        titulo="Experiencia"
        items={experiencia}
        campos={[
          { k: 'cargo', et: 'Cargo', ancho: 2 },
          { k: 'empresa', et: 'Empresa', ancho: 2 },
          { k: 'periodo', et: 'Periodo', ancho: 1 },
          { k: 'detalle', et: 'Descripción del cargo', ancho: 3 },
          { k: 'logros', et: 'Logros — uno por línea', ancho: 3, area: true },
        ]}
        onChange={setExperiencia}
        color={color}
      />

      <Lista
        titulo="Certificaciones"
        items={certificaciones}
        campos={[
          { k: 'nombre', et: 'Certificación', ancho: 2 },
          { k: 'entidad', et: 'Entidad', ancho: 2 },
          { k: 'anio', et: 'Año', ancho: 1 },
        ]}
        onChange={setCertificaciones}
        color={color}
      />

      <button
        onClick={guardar}
        disabled={pendiente}
        style={{ ...e.btn, background: pendiente ? 'var(--borde-fuerte)' : color, border: 'none', cursor: 'pointer', padding: '12px 26px' }}
      >
        {pendiente ? 'Guardando…' : 'Guardar perfil'}
      </button>
    </>
  );
}

/* ---------------------------------------------------------------- */

type CampoLista = { k: string; et: string; ancho: number; area?: boolean };

function Lista<T extends Record<string, string>>({
  titulo, items, campos, onChange, color,
}: {
  titulo: string;
  items: T[];
  campos: CampoLista[];
  onChange: (v: T[]) => void;
  color: string;
}) {
  function agregar() {
    const vacio = Object.fromEntries(campos.map((c) => [c.k, ''])) as T;
    onChange([...items, vacio]);
  }

  return (
    <section style={e.card}>
      <h2 style={e.h2}>{titulo}</h2>

      {items.length === 0 && (
        <p style={e.nota}>Sin registros. Esta sección no aparecerá en el PDF.</p>
      )}

      {items.map((item, i) => (
        <div key={i} style={e.itemLista}>
          <div style={e.gridItem}>
            {campos.map((c) => {
              const alCambiar = (v: string) => {
                const copia = [...items];
                copia[i] = { ...copia[i], [c.k]: v };
                onChange(copia);
              };
              // Los logros van en varias líneas: se listan como viñetas
              return c.area ? (
                <textarea
                  key={c.k}
                  value={item[c.k] ?? ''}
                  placeholder={c.et}
                  rows={3}
                  onChange={(ev) => alCambiar(ev.target.value)}
                  style={{ ...e.input, gridColumn: `span ${c.ancho}`, resize: 'vertical' }}
                />
              ) : (
                <input
                  key={c.k}
                  value={item[c.k] ?? ''}
                  placeholder={c.et}
                  onChange={(ev) => alCambiar(ev.target.value)}
                  style={{ ...e.input, gridColumn: `span ${c.ancho}` }}
                />
              );
            })}
          </div>
          <button
            onClick={() => onChange(items.filter((_, j) => j !== i))}
            style={e.x}
            title="Quitar"
          >
            ×
          </button>
        </div>
      ))}

      <button onClick={agregar} style={{ ...e.enlace, color }}>
        + Agregar
      </button>
    </section>
  );
}

function Campo({
  etiqueta, valor, onChange, tipo = 'text', mayus, marcador,
}: {
  etiqueta: string; valor: string; onChange: (v: string) => void;
  tipo?: string; mayus?: boolean; marcador?: string;
}) {
  return (
    <div>
      <label style={e.label}>{etiqueta}</label>
      <input
        type={tipo}
        value={valor}
        placeholder={marcador}
        onChange={(ev) => onChange(ev.target.value)}
        style={{ ...e.input, textTransform: mayus ? 'uppercase' : 'none' }}
      />
    </div>
  );
}

function Kpi({ v, l, color }: { v: string; l: string; color?: string }) {
  return (
    <div style={e.kpi}>
      <div style={{ fontSize: 20, fontWeight: 700, color: color ?? 'var(--texto)' }}>{v}</div>
      <div style={e.kpiL}>{l}</div>
    </div>
  );
}

const e: Record<string, React.CSSProperties> = {
  card: {
    background: 'var(--superficie)', borderWidth: 1, borderStyle: 'solid', borderColor: 'var(--borde)',
    borderRadius: 8, padding: 20, marginBottom: 16,
  },
  h2: { fontSize: 14.5, margin: '0 0 5px', fontWeight: 600 },
  nota: { fontSize: 11.5, color: 'var(--texto-tenue)', margin: '0 0 14px', lineHeight: 1.5 },

  kpis: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(112px,1fr))', gap: 10 },
  kpi: { background: 'var(--superficie-2)', borderRadius: 6, padding: 12, textAlign: 'center' },
  kpiL: { fontSize: 10, color: 'var(--texto-tenue)', textTransform: 'uppercase', letterSpacing: .3, marginTop: 2 },

  filaAcciones: { display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' },
  bloque: { marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--borde)', maxWidth: 480 },

  dos: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 16, alignItems: 'start' },
  dosCampos: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },

  label: { display: 'block', fontSize: 12, fontWeight: 600, margin: '12px 0 5px' },
  input: {
    width: '100%', padding: '9px 11px', borderWidth: 1, borderStyle: 'solid',
    borderColor: 'var(--borde-fuerte)', borderRadius: 4, fontSize: 13,
    boxSizing: 'border-box', fontFamily: 'inherit',
  },

  previaFoto: {
    width: '100%', height: 170, background: 'var(--superficie-2)',
    borderWidth: 1, borderStyle: 'dashed', borderColor: 'var(--borde-fuerte)', borderRadius: 6,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    marginBottom: 12, overflow: 'hidden',
  },
  foto: { maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' },

  itemLista: { display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 8 },
  gridItem: { flex: 1, display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 },
  x: { background: 'none', border: 'none', color: 'var(--mal)', fontSize: 18, cursor: 'pointer', padding: '6px 4px' },
  enlace: { background: 'none', border: 'none', fontSize: 12.5, cursor: 'pointer', padding: '6px 0', fontWeight: 600 },

  btn: {
    color: 'var(--sobre-marca)', padding: '10px 18px', borderRadius: 4, fontSize: 13,
    fontWeight: 600, textDecoration: 'none', display: 'inline-block',
  },
  btnSec: {
    background: 'var(--superficie)', color: 'var(--texto)', borderWidth: 1, borderStyle: 'solid',
    borderColor: 'var(--borde-fuerte)', padding: '10px 18px', borderRadius: 4,
    fontSize: 13, fontWeight: 600, cursor: 'pointer',
  },
  firmaGuardada: {
    background: 'var(--bien-fondo)', borderWidth: 1, borderStyle: 'solid',
    borderColor: 'var(--bien)', borderRadius: 6, padding: '12px 14px',
    marginBottom: 10, textAlign: 'center',
  },
  btnQuitar: {
    background: 'var(--superficie)', color: 'var(--mal)', borderWidth: 1, borderStyle: 'solid',
    borderColor: 'var(--mal)', padding: '10px 16px', borderRadius: 4,
    fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
  },
  aviso: { padding: '10px 14px', borderRadius: 6, fontSize: 13, marginBottom: 16 },
};
