'use client';

/**
 * FORMULARIO DE ARTÍCULO
 * ---------------------------------------------------------------
 * El tipo es la primera decisión porque determina el resto: un
 * consumible tiene vida útil, talla y stock mínimo; un retornable
 * tiene unidades con serial, que se registran en su ficha.
 *
 * La foto se sube DESPUÉS de crear, porque la ruta necesita el id
 * del artículo para agrupar los archivos.
 */
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  crearArticulo, actualizarArticulo, guardarFotoArticulo,
  type TipoArticulo, type Articulo,
} from '@/lib/acciones-dotacion';
import CargaFoto from './CargaFoto';

const CATEGORIAS: Record<TipoArticulo, string[]> = {
  consumible: ['CABEZA', 'OJOS Y ROSTRO', 'AUDITIVA', 'RESPIRATORIA', 'MANOS',
               'CUERPO', 'PIES', 'ALTURAS', 'DOTACIÓN'],
  retornable: ['CÓMPUTO', 'COMUNICACIONES', 'HERRAMIENTA', 'MEDICIÓN',
               'VEHÍCULO', 'MOBILIARIO', 'OTRO'],
};

const UNIDADES = ['UNIDAD', 'PAR', 'CAJA', 'PAQUETE', 'ROLLO', 'METRO'];

export default function FormularioArticulo({
  tipoInicial,
  orgId,
  color,
  articulo,
}: {
  tipoInicial: TipoArticulo;
  orgId: string;
  color: string;
  articulo?: Articulo;
}) {
  const router = useRouter();
  const [pendiente, startTransition] = useTransition();
  const edicion = Boolean(articulo);

  const [f, setF] = useState({
    nombre: articulo?.nombre ?? '',
    tipo: (articulo?.tipo ?? tipoInicial) as TipoArticulo,
    categoria: articulo?.categoria ?? '',
    descripcion: articulo?.descripcion ?? '',
    marca: articulo?.marca ?? '',
    modelo: articulo?.modelo ?? '',
    norma: articulo?.norma ?? '',
    valor: articulo?.valor ? String(articulo.valor) : '',
    unidad: articulo?.unidad ?? 'UNIDAD',
    vida_util_dias: articulo?.vida_util_dias ? String(articulo.vida_util_dias) : '',
    requiere_talla: articulo?.requiere_talla ?? false,
    stock_minimo: articulo?.stock_minimo ? String(articulo.stock_minimo) : '',
  });

  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  function guardar() {
    startTransition(async () => {
      const r = edicion
        ? await actualizarArticulo(articulo!.id, f)
        : await crearArticulo(f);

      setAviso({ tipo: r.ok ? 'ok' : 'error', texto: r.mensaje });

      if (r.ok && !edicion && r.id) {
        // Se va a la ficha: ahí se cargan la foto y las unidades
        router.push(`/panel/dotacion/${r.id}`);
      } else if (r.ok) {
        router.refresh();
      }
    });
  }

  const esConsumible = f.tipo === 'consumible';

  return (
    <>
      {/* ---------- Paso 1: tipo ---------- */}
      {!edicion && (
        <section style={e.card}>
          <h2 style={e.h2}>1. Tipo de artículo</h2>
          <p style={e.nota}>
            Determina cómo se controla: por cantidad o por unidad individual.
          </p>

          <div style={e.opciones}>
            <Opcion
              activa={esConsumible}
              onClick={() => setF({ ...f, tipo: 'consumible', categoria: '' })}
              color={color}
              titulo="Elemento de protección"
              texto="Se entrega y se consume. Control por cantidad, con vida útil y reposición."
              ejemplos="Casco, guantes, botas, tapabocas"
            />
            <Opcion
              activa={!esConsumible}
              onClick={() => setF({ ...f, tipo: 'retornable', categoria: '' })}
              color={color}
              titulo="Equipo"
              texto="Se entrega y debe devolverse. Cada unidad tiene placa, serial e historial."
              ejemplos="Portátil, celular, radio, taladro"
            />
          </div>
        </section>
      )}

      {/* ---------- Paso 2: identificación ---------- */}
      <section style={e.card}>
        <h2 style={e.h2}>{edicion ? 'Identificación' : '2. Identificación'}</h2>

        <label style={e.label}>Nombre *</label>
        <input
          value={f.nombre}
          onChange={(x) => setF({ ...f, nombre: x.target.value.toUpperCase() })}
          placeholder={esConsumible ? 'CASCO DIELÉCTRICO CLASE E' : 'PORTÁTIL DELL LATITUDE 5420'}
          style={{ ...e.input, textTransform: 'uppercase' }}
        />

        <div style={e.dos}>
          <div>
            <label style={e.label}>Categoría</label>
            <select
              value={f.categoria}
              onChange={(x) => setF({ ...f, categoria: x.target.value })}
              style={e.input}
            >
              <option value="">Sin especificar</option>
              {CATEGORIAS[f.tipo].map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label style={e.label}>Valor unitario</label>
            <input
              type="number" min={0} value={f.valor}
              onChange={(x) => setF({ ...f, valor: x.target.value })}
              placeholder="Opcional"
              style={e.input}
            />
          </div>
        </div>

        <div style={e.tres}>
          <div>
            <label style={e.label}>Marca</label>
            <input value={f.marca}
              onChange={(x) => setF({ ...f, marca: x.target.value.toUpperCase() })}
              style={{ ...e.input, textTransform: 'uppercase' }} />
          </div>
          <div>
            <label style={e.label}>Modelo</label>
            <input value={f.modelo}
              onChange={(x) => setF({ ...f, modelo: x.target.value.toUpperCase() })}
              style={{ ...e.input, textTransform: 'uppercase' }} />
          </div>
          <div>
            <label style={e.label}>Norma técnica</label>
            <input value={f.norma}
              onChange={(x) => setF({ ...f, norma: x.target.value.toUpperCase() })}
              placeholder="ANSI Z89.1"
              style={{ ...e.input, textTransform: 'uppercase' }} />
          </div>
        </div>

        <label style={e.label}>Descripción</label>
        <textarea
          value={f.descripcion}
          rows={2}
          onChange={(x) => setF({ ...f, descripcion: x.target.value })}
          placeholder="Opcional"
          style={{ ...e.input, resize: 'vertical' }}
        />
      </section>

      {/* ---------- Paso 3: control ---------- */}
      <section style={e.card}>
        <h2 style={e.h2}>{edicion ? 'Control' : '3. Control de inventario'}</h2>

        {esConsumible ? (
          <>
            <div style={e.tres}>
              <div>
                <label style={e.label}>Unidad de medida</label>
                <select value={f.unidad}
                  onChange={(x) => setF({ ...f, unidad: x.target.value })}
                  style={e.input}>
                  {UNIDADES.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div>
                <label style={e.label}>Vida útil (días)</label>
                <input type="number" min={1} value={f.vida_util_dias}
                  onChange={(x) => setF({ ...f, vida_util_dias: x.target.value })}
                  placeholder="Sin vencimiento"
                  style={e.input} />
              </div>
              <div>
                <label style={e.label}>Stock mínimo</label>
                <input type="number" min={0} value={f.stock_minimo}
                  onChange={(x) => setF({ ...f, stock_minimo: x.target.value })}
                  placeholder="0"
                  style={e.input} />
              </div>
            </div>

            <p style={e.nota}>
              La vida útil calcula la fecha de vencimiento al entregar. El stock
              mínimo dispara la alerta de reposición.
            </p>

            <label style={e.check}>
              <input
                type="checkbox"
                checked={f.requiere_talla}
                onChange={(x) => setF({ ...f, requiere_talla: x.target.checked })}
                style={{ marginRight: 8 }}
              />
              Requiere talla al entregar
            </label>
          </>
        ) : (
          <p style={e.nota}>
            Los equipos se controlan por unidad. Después de crear el artículo
            podrás registrar cada unidad con su placa, serial y fotografía en
            la ficha.
          </p>
        )}
      </section>

      {/* ---------- Foto: solo en edición ---------- */}
      {edicion && (
        <section style={e.card}>
          <CargaFoto
            orgId={orgId}
            carpeta={`articulos/${articulo!.id}`}
            fotoActual={articulo!.foto_url}
            onGuardar={(url) => guardarFotoArticulo(articulo!.id, url)}
            etiqueta="Fotografía de referencia"
          />
        </section>
      )}

      {aviso && (
        <div style={{
          ...e.aviso,
          background: aviso.tipo === 'ok' ? 'var(--bien-fondo)' : 'var(--mal-fondo)',
          color: aviso.tipo === 'ok' ? 'var(--bien)' : 'var(--mal)',
        }}>
          {aviso.texto}
        </div>
      )}

      <div style={{ display: 'flex', gap: 10 }}>
        <button
          onClick={guardar}
          disabled={pendiente}
          style={{ ...e.btn, background: pendiente ? 'var(--borde-fuerte)' : color }}
        >
          {pendiente ? 'Guardando…' : edicion ? 'Guardar cambios' : 'Crear artículo'}
        </button>
        <Link href="/panel/dotacion" style={e.btnSec}>Cancelar</Link>
      </div>

      {!edicion && (
        <p style={e.pie}>
          Al crear el artículo se abre su ficha, donde podrás agregar la
          fotografía{esConsumible ? ' y registrar el ingreso de mercancía' : ' y las unidades'}.
        </p>
      )}
    </>
  );
}

function Opcion({
  activa, onClick, color, titulo, texto, ejemplos,
}: {
  activa: boolean; onClick: () => void; color: string;
  titulo: string; texto: string; ejemplos: string;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        ...e.opcion,
        borderColor: activa ? color : 'var(--borde-fuerte)',
        background: activa ? 'var(--superficie-3)' : 'var(--superficie)',
      }}
    >
      <strong style={{ fontSize: 13.5, color: activa ? color : 'var(--texto)' }}>
        {titulo}
      </strong>
      <p style={e.opcionTexto}>{texto}</p>
      <p style={e.opcionEjemplos}>{ejemplos}</p>
    </button>
  );
}

const e: Record<string, React.CSSProperties> = {
  card: {
    background: 'var(--superficie)', borderWidth: 1, borderStyle: 'solid', borderColor: 'var(--borde)',
    borderRadius: 8, padding: 22, marginBottom: 16, maxWidth: 720,
  },
  h2: { fontSize: 14.5, margin: '0 0 5px', fontWeight: 600 },
  nota: { fontSize: 11.5, color: 'var(--texto-tenue)', margin: '10px 0 0', lineHeight: 1.55 },

  opciones: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 12, marginTop: 14 },
  opcion: {
    borderWidth: 2, borderStyle: 'solid', borderRadius: 8, padding: 16,
    cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
  },
  opcionTexto: { fontSize: 11.5, color: 'var(--texto-suave)', margin: '6px 0 0', lineHeight: 1.5 },
  opcionEjemplos: { fontSize: 10.5, color: 'var(--texto-tenue)', margin: '6px 0 0', fontStyle: 'italic' },

  label: { display: 'block', fontSize: 12, fontWeight: 600, margin: '14px 0 5px' },
  input: {
    width: '100%', padding: '9px 11px', borderWidth: 1, borderStyle: 'solid',
    borderColor: 'var(--borde-fuerte)', borderRadius: 4, fontSize: 13,
    boxSizing: 'border-box', fontFamily: 'inherit',
  },
  dos: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12 },
  tres: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12 },
  check: { display: 'flex', alignItems: 'center', fontSize: 12.5, marginTop: 14, cursor: 'pointer' },

  aviso: { padding: '10px 14px', borderRadius: 6, fontSize: 13, marginBottom: 16, maxWidth: 720 },
  btn: {
    color: 'var(--sobre-marca)', border: 'none', padding: '11px 22px', borderRadius: 4,
    fontSize: 13, fontWeight: 600, cursor: 'pointer',
  },
  btnSec: {
    background: 'var(--superficie)', color: 'var(--texto)',
    borderWidth: 1, borderStyle: 'solid', borderColor: 'var(--borde-fuerte)',
    padding: '11px 22px', borderRadius: 4, fontSize: 13, fontWeight: 600,
    textDecoration: 'none', display: 'inline-block',
  },
  pie: { fontSize: 11.5, color: 'var(--texto-tenue)', marginTop: 14, maxWidth: 720 },
};
