'use client';

/**
 * NUEVA INSPECCIÓN
 * ---------------------------------------------------------------
 * El tipo de la lista determina qué se pide como objeto: una lista de
 * equipo se aplica a una unidad concreta del inventario; una de área,
 * a una zona escrita a mano.
 *
 * Esa diferencia importa: si la inspección queda ligada a la unidad,
 * su ficha muestra el historial de inspecciones junto al de entregas
 * y mantenimientos — que es lo que pide una auditoría de alturas.
 */
import { useState, useTransition, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { crearInspeccion } from '@/lib/acciones-ejecutar-inspeccion';
import type { PlantillaInspeccion } from '@/lib/acciones-inspecciones';

type Unidad = { id: string; placa: string; serial: string | null; articulo: string };

const TIPOS: Record<string, string> = {
  planeada: 'Planeada',
  area: 'De área',
  equipo: 'De equipo',
  auditoria: 'Auditoría',
};

export default function FormularioInspeccion({
  plantillas,
  plantillaInicial = '',
  unidades,
  inspectorPorDefecto,
  color,
}: {
  plantillas: PlantillaInspeccion[];
  /** Preseleccionada al venir del cronograma. */
  plantillaInicial?: string;
  unidades: Unidad[];
  inspectorPorDefecto: string;
  color: string;
}) {
  const router = useRouter();
  const [pendiente, startTransition] = useTransition();

  const [plantillaId, setPlantillaId] = useState(
    // Solo si existe: un id invalido en la URL dejaria el select en un
    // valor que no esta entre las opciones.
    plantillas.some((p) => p.id === plantillaInicial) ? plantillaInicial : ''
  );
  const [inspector, setInspector] = useState(inspectorPorDefecto);
  const [acompanante, setAcompanante] = useState('');
  const [unidadId, setUnidadId] = useState('');
  const [objetoNombre, setObjetoNombre] = useState('');
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  const elegida = useMemo(
    () => plantillas.find((p) => p.id === plantillaId),
    [plantillas, plantillaId]
  );

  const conCriterios = plantillas.filter((p) => p.items > 0);
  const esEquipo = elegida?.tipo === 'equipo';

  function crear() {
    if (!plantillaId) {
      setAviso({ tipo: 'error', texto: 'Elige una lista de verificación.' });
      return;
    }

    const unidad = unidades.find((u) => u.id === unidadId);

    startTransition(async () => {
      const r = await crearInspeccion({
        plantillaId,
        inspector,
        acompanante,
        tipoObjeto: esEquipo ? 'unidad' : elegida?.tipo === 'auditoria' ? 'empresa' : 'area',
        objetoId: esEquipo && unidadId ? unidadId : null,
        objetoNombre: esEquipo && unidad
          ? `${unidad.placa} · ${unidad.articulo}`
          : objetoNombre,
      });

      setAviso({ tipo: r.ok ? 'ok' : 'error', texto: r.mensaje });
      if (r.ok && r.id) router.push(`/panel/inspecciones/${r.id}`);
    });
  }

  if (conCriterios.length === 0) {
    return (
      <div style={e.vacio}>
        <p style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 600 }}>
          No hay listas de verificación con criterios
        </p>
        <p style={e.explicacion}>
          Una lista sin criterios no se puede ejecutar. Carga las once listas
          base o crea la tuya.
        </p>
        <Link
          href="/panel/inspecciones/plantillas"
          style={{ ...e.btn, background: color, marginTop: 14 }}
        >
          Ir a listas de verificación
        </Link>
      </div>
    );
  }

  return (
    <section style={e.card}>
      <label style={e.label}>Lista de verificación</label>
      <select
        value={plantillaId}
        onChange={(x) => { setPlantillaId(x.target.value); setUnidadId(''); }}
        style={e.input}
      >
        <option value="">Elige una…</option>
        {conCriterios.map((p) => (
          <option key={p.id} value={p.id}>
            {p.nombre} · {p.items} criterios
          </option>
        ))}
      </select>

      {elegida && (
        <div style={e.previa}>
          <div style={e.filaPrevia}>
            <span style={e.clave}>Tipo</span>
            <span>{TIPOS[elegida.tipo] ?? elegida.tipo}</span>
          </div>
          <div style={e.filaPrevia}>
            <span style={e.clave}>Criterios</span>
            <span>{elegida.items}</span>
          </div>
          <div style={e.filaPrevia}>
            <span style={e.clave}>Críticos</span>
            <span style={{ color: elegida.criticos > 0 ? '#9B1C1C' : '#5B6470', fontWeight: 600 }}>
              {elegida.criticos}
            </span>
          </div>
          {elegida.norma && (
            <div style={e.filaPrevia}>
              <span style={e.clave}>Norma</span>
              <span>{elegida.norma}</span>
            </div>
          )}
          {elegida.criticos > 0 && (
            <p style={e.notaCriticos}>
              Un criterio crítico incumplido reprueba la inspección completa,
              sin importar el puntaje.
            </p>
          )}
        </div>
      )}

      {/* El objeto depende del tipo de lista */}
      {esEquipo ? (
        <>
          <label style={e.label}>Equipo a inspeccionar</label>
          {unidades.length === 0 ? (
            <p style={e.aviso}>
              No hay unidades registradas en el inventario. Regístralas en
              Dotación para poder inspeccionarlas.
            </p>
          ) : (
            <>
              <select
                value={unidadId}
                onChange={(x) => setUnidadId(x.target.value)}
                style={e.input}
              >
                <option value="">Elige una unidad…</option>
                {unidades.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.placa} · {u.articulo}{u.serial ? ` · ${u.serial}` : ''}
                  </option>
                ))}
              </select>
              <p style={e.ayuda}>
                La inspección queda ligada a esa unidad: aparecerá en su ficha
                junto al historial de entregas.
              </p>
            </>
          )}
        </>
      ) : (
        <>
          <label style={e.label}>
            {elegida?.tipo === 'auditoria' ? 'Alcance' : 'Área o ubicación'}
          </label>
          <input
            value={objetoNombre}
            onChange={(x) => setObjetoNombre(x.target.value.toUpperCase())}
            placeholder={
              elegida?.tipo === 'auditoria'
                ? 'SISTEMA DE GESTIÓN COMPLETO'
                : 'BODEGA 2, PLANTA DE PRODUCCIÓN…'
            }
            style={{ ...e.input, textTransform: 'uppercase' }}
          />
        </>
      )}

      <div style={e.dos}>
        <div>
          <label style={e.label}>Quién inspecciona</label>
          <input
            value={inspector}
            onChange={(x) => setInspector(x.target.value.toUpperCase())}
            style={{ ...e.input, textTransform: 'uppercase' }}
          />
        </div>
        <div>
          <label style={e.label}>Quién acompaña</label>
          <input
            value={acompanante}
            onChange={(x) => setAcompanante(x.target.value.toUpperCase())}
            placeholder="Opcional"
            style={{ ...e.input, textTransform: 'uppercase' }}
          />
          <p style={e.ayuda}>
            Por parte del cliente. Firmará el informe junto contigo.
          </p>
        </div>
      </div>

      {aviso && (
        <div style={{
          ...e.avisoCaja,
          background: aviso.tipo === 'ok' ? '#F0FDF4' : '#FDF2F2',
          color: aviso.tipo === 'ok' ? '#15803D' : '#9B1C1C',
        }}>
          {aviso.texto}
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
        <button
          onClick={crear}
          disabled={pendiente || !plantillaId}
          style={{
            ...e.btn,
            background: pendiente || !plantillaId ? '#C5C5BD' : color,
            border: 'none',
            cursor: pendiente || !plantillaId ? 'not-allowed' : 'pointer',
          }}
        >
          {pendiente ? 'Creando…' : 'Comenzar inspección'}
        </button>
        <Link href="/panel/inspecciones" style={e.btnSec}>Cancelar</Link>
      </div>
    </section>
  );
}

const e: Record<string, React.CSSProperties> = {
  card: {
    background: '#fff', borderWidth: 1, borderStyle: 'solid', borderColor: '#E4E4DF',
    borderRadius: 8, padding: 22, maxWidth: 660,
  },
  label: { display: 'block', fontSize: 12, fontWeight: 600, margin: '16px 0 6px' },
  input: {
    width: '100%', padding: '10px 12px', borderWidth: 1, borderStyle: 'solid',
    borderColor: '#DFDFD8', borderRadius: 5, fontSize: 13.5,
    boxSizing: 'border-box', fontFamily: 'inherit', background: '#fff',
  },
  ayuda: { fontSize: 11, color: '#8A929C', margin: '5px 0 0', lineHeight: 1.5 },
  dos: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 14 },

  previa: {
    background: '#FBFBF9', borderRadius: 6, padding: 14, marginTop: 12,
  },
  filaPrevia: {
    display: 'flex', justifyContent: 'space-between', gap: 12,
    padding: '4px 0', fontSize: 12.5,
  },
  clave: { color: '#8A929C' },
  notaCriticos: {
    fontSize: 11.5, color: '#9B1C1C', margin: '8px 0 0',
    paddingTop: 8, borderTopWidth: 1, borderTopStyle: 'solid',
    borderTopColor: '#EFEFEA', lineHeight: 1.55,
  },

  aviso: {
    fontSize: 12, color: '#8A6100', background: '#FEFCE8',
    padding: '10px 12px', borderRadius: 6, margin: '4px 0 0', lineHeight: 1.55,
  },
  avisoCaja: { marginTop: 16, padding: '10px 14px', borderRadius: 6, fontSize: 13 },

  btn: {
    color: '#fff', padding: '11px 22px', borderRadius: 5, fontSize: 13,
    fontWeight: 600, textDecoration: 'none', display: 'inline-block',
  },
  btnSec: {
    background: '#fff', color: '#14263F',
    borderWidth: 1, borderStyle: 'solid', borderColor: '#DFDFD8',
    padding: '11px 22px', borderRadius: 5, fontSize: 13, fontWeight: 600,
    textDecoration: 'none', display: 'inline-block',
  },
  vacio: {
    background: '#fff', borderWidth: 1, borderStyle: 'dashed', borderColor: '#DFDFD8',
    borderRadius: 8, padding: '40px 24px', textAlign: 'center',
  },
  explicacion: {
    fontSize: 12.5, color: '#5B6470', margin: 0, lineHeight: 1.6,
    maxWidth: 420, marginLeft: 'auto', marginRight: 'auto',
  },
};
