/**
 * ADMINISTRAR EMPRESAS
 * Listado con el uso frente al límite del plan.
 */
import Link from 'next/link';
import { crearClienteServidor } from '@/lib/supabase/servidor';
import { obtenerPerfil } from '@/lib/sesion';
import { listarEmpresas } from '@/lib/empresa-activa';

export default async function PaginaEmpresas() {
  const perfil = await obtenerPerfil();
  const empresas = await listarEmpresas();
  const supabase = await crearClienteServidor();

  const { data: limite } = await supabase.rpc('puede_crear_empresa');
  const lim = (limite ?? { puede: true }) as {
    puede: boolean; usadas?: number; limite?: number | null; motivo?: string;
  };

  const { data: plan } = await supabase
    .from('planes')
    .select('nombre, max_empresas')
    .eq('codigo', perfil?.organizacion.plan ?? '')
    .maybeSingle();

  return (
    <>
      <div style={s.cabecera}>
        <div>
          <h1 style={s.titulo}>Empresas</h1>
          <p style={s.sub}>
            {plan?.max_empresas
              ? `Plan ${plan.nombre}: ${empresas.length} de ${plan.max_empresas} empresas.`
              : `Plan ${plan?.nombre ?? '—'}: sin límite de empresas.`}
          </p>
        </div>
        {lim.puede ? (
          <Link href="/panel/empresas/nueva" style={s.btn}>+ Agregar empresa</Link>
        ) : (
          <span style={s.btnBloqueado} title={lim.motivo}>Límite alcanzado</span>
        )}
      </div>

      {!lim.puede && <div style={s.aviso}>{lim.motivo}</div>}

      <div style={s.grid}>
        {empresas.map((e) => (
          <Link key={e.id} href={`/panel/empresas/${e.id}`} style={s.tarjeta}>
            <div style={{ ...s.franja, background: e.color_primario }} />
            <div style={s.cuerpo}>
              <h2 style={s.nombre}>{e.nombre}</h2>
              <dl style={s.datos}>
                <Fila k="Identificador" v={e.slug} mono />
                {e.nit && <Fila k="NIT" v={e.nit} />}
                {e.ciudad && <Fila k="Ciudad" v={e.ciudad} />}
                <Fila k="Nomenclatura" v={e.nomenclatura ?? 'Sin definir'} mono />
              </dl>
            </div>
          </Link>
        ))}
      </div>

      {empresas.length === 0 && (
        <div style={s.vacio}>
          <p style={{ margin: '0 0 14px', fontSize: 14 }}>
            Aún no administras ninguna empresa.
          </p>
          <Link href="/panel/empresas/nueva" style={s.btn}>Agregar la primera</Link>
        </div>
      )}
    </>
  );
}

function Fila({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div style={s.fila}>
      <dt style={s.clave}>{k}</dt>
      <dd style={{
        ...s.valor,
        fontFamily: mono ? 'ui-monospace,SFMono-Regular,Menlo,monospace' : 'inherit',
        fontSize: mono ? 11.5 : 12.5,
      }}>
        {v}
      </dd>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  cabecera: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap', marginBottom: 22 },
  titulo: { fontSize: 22, margin: '0 0 3px', letterSpacing: -0.4 },
  sub: { fontSize: 13, color: '#5B6470', margin: 0 },
  btn: { background: '#14263F', color: '#fff', padding: '10px 18px', borderRadius: 4, fontSize: 13, fontWeight: 600, textDecoration: 'none' },
  btnBloqueado: { background: '#EFEFEA', color: '#8A929C', padding: '10px 18px', borderRadius: 4, fontSize: 13, fontWeight: 600, cursor: 'not-allowed' },
  aviso: { background: '#FEFCE8', color: '#8A6100', padding: '11px 15px', borderRadius: 6, fontSize: 13, marginBottom: 20 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 16 },
  tarjeta: { background: '#fff', border: '1px solid #E4E4DF', borderRadius: 8, overflow: 'hidden', textDecoration: 'none', color: 'inherit', display: 'block' },
  franja: { height: 3 },
  cuerpo: { padding: 18 },
  nombre: { fontSize: 15, margin: '0 0 12px', fontWeight: 600 },
  datos: { margin: 0 },
  fila: { display: 'flex', justifyContent: 'space-between', gap: 10, padding: '5px 0', borderBottom: '1px solid #F4F4F0' },
  clave: { fontSize: 11.5, color: '#8A929C', margin: 0 },
  valor: { margin: 0, textAlign: 'right', color: '#14263F' },
  vacio: { background: '#fff', border: '1px dashed #DFDFD8', borderRadius: 8, padding: '40px 24px', textAlign: 'center' },
};
