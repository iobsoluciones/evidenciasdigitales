/**
 * CONTENIDO DEL MANUAL
 * ---------------------------------------------------------------
 * Un submanual por módulo. Cada uno responde, en este orden:
 *   para qué sirve → cómo se hace → por qué se comporta así.
 *
 * El tercer punto es el que suele faltar en los manuales y el que
 * evita los tiquetes de soporte: quien entiende que un ítem crítico
 * reprueba la inspección completa no vuelve a preguntar por qué
 * "un 92% salió como no conforme".
 */
import {
  Ventana, Titulo, Linea, Fila, Boton, Campo, Tarjeta, Tabla, Estado,
  Flujo, Decision, Jerarquia, Figura, Regla, Ojo,
} from './Figuras';

export type Fase = 'inicio' | 'planear' | 'hacer' | 'verificar' | 'actuar' | 'cierre';

export type FichaManual = {
  id: string;
  titulo: string;
  resumen: string;
  color: string;
  /** Fase del PHVA, la misma con la que se agrupa el menú. */
  fase: Fase;
  /** Pantallas del sistema que cubre, para orientar desde el índice. */
  cubre: string[];
};

/**
 * El manual se recorre como el menú —y como lo recorre un auditor—, no
 * por orden de antigüedad de los módulos. Los colores son los mismos
 * del menú lateral para que el manual y el producto hablen igual.
 */
export const FASES: { v: Fase; t: string; d: string; color: string }[] = [
  { v: 'inicio', t: 'Para empezar', d: 'La cuenta, las empresas, el personal y la regla que rige todo el producto.', color: 'var(--texto)' },
  { v: 'planear', t: 'Planear', d: 'Lo que hay que tener escrito antes de ejecutar nada.', color: '#2A6F97' },
  { v: 'hacer', t: 'Hacer', d: 'La operación del día a día, que es donde se producen las firmas.', color: '#1B5E4A' },
  { v: 'verificar', t: 'Verificar', d: 'Mirar lo que se hizo y ponerle nota.', color: 'var(--aviso)' },
  { v: 'actuar', t: 'Actuar', d: 'Lo que se corrige y lo que se rinde.', color: '#7A3E9D' },
  { v: 'cierre', t: 'Transversales', d: 'Lo que se entrega y lo que se configura una sola vez.', color: 'var(--texto-suave)' },
];

export const MANUALES: FichaManual[] = [
  {
    id: 'ingreso',
    titulo: 'Ingreso y primeros pasos',
    resumen: 'Crear la cuenta, entrar, entender la barra de arriba y el menú por PHVA.',
    color: 'var(--texto)',
    fase: 'inicio',
    cubre: ['Registro', 'Ingreso', 'Selector de empresa', 'Menú'],
  },
  {
    id: 'empresas',
    titulo: 'Cartera de empresas',
    resumen: 'Dar de alta las empresas que administras y su identidad documental.',
    color: '#1B5E4A',
    fase: 'inicio',
    cubre: ['Cartera', 'Empresas', 'Nueva empresa'],
  },
  {
    id: 'empleados',
    titulo: 'Empleados',
    resumen: 'El personal de cada empresa: alta, retiro, reincorporación y expediente.',
    color: '#2A6F97',
    fase: 'inicio',
    cubre: ['Empleados', 'Retirados', 'Expediente'],
  },
  {
    id: 'pendientes',
    titulo: 'Panel principal y pendientes',
    resumen: 'La bandeja que dice qué hacer hoy y el semáforo de cumplimiento de cada empresa.',
    color: 'var(--mal)',
    fase: 'inicio',
    cubre: ['Panel principal', 'Pendientes', 'Semáforo'],
  },
  {
    id: 'firmas',
    titulo: 'Firmas, PDF y correo',
    resumen: 'La regla que rige todo el producto: quien firma no tiene que estar delante de ti.',
    color: '#0F766E',
    fase: 'inicio',
    cubre: ['Firma en sitio', 'Firma por enlace', 'PDF', 'Envíos'],
  },

  {
    id: 'peligros',
    titulo: 'Matriz de peligros',
    resumen: 'La identificación GTC 45 y el enlace con el EPP, la capacitación y la inspección que controlan cada peligro.',
    color: '#2A6F97',
    fase: 'planear',
    cubre: ['Matriz de peligros', 'Controles'],
  },
  {
    id: 'plan-anual',
    titulo: 'Plan anual de trabajo',
    resumen: 'El cronograma del año, con lo programado y lo ejecutado mes a mes, aprobado con firma del empleador.',
    color: '#2A6F97',
    fase: 'planear',
    cubre: ['Plan anual', 'Actividades', 'Aprobación'],
  },
  {
    id: 'matriz-legal',
    titulo: 'Matriz legal',
    resumen: 'Qué normas le aplican a la empresa, si cumple y con qué evidencia lo demuestra.',
    color: '#2A6F97',
    fase: 'planear',
    cubre: ['Matriz legal', 'Catálogo de normas', 'Importar Excel'],
  },
  {
    id: 'comites',
    titulo: 'Comités, vigía y brigada',
    resumen: 'COPASST, convivencia y brigada de emergencia, con el validador que dice qué falta para que estén bien conformados.',
    color: '#2A6F97',
    fase: 'planear',
    cubre: ['Comités', 'Miembros', 'Organigrama'],
  },

  {
    id: 'capacitaciones',
    titulo: 'Capacitaciones',
    resumen: 'Del acta en papel al registro firmado: convocar, tomar asistencia con QR, evaluar y emitir.',
    color: '#1B5E4A',
    fase: 'hacer',
    cubre: ['Listado', 'Detalle', 'Registro público', 'Evaluaciones', 'Matriz'],
  },
  {
    id: 'dotacion',
    titulo: 'Dotación y equipos',
    resumen: 'Inventario, entregas con firma, devoluciones y control de vencimientos.',
    color: '#1B5E4A',
    fase: 'hacer',
    cubre: ['Inventario', 'Entregas', 'Devoluciones', 'Alertas', 'Matriz'],
  },
  {
    id: 'salud',
    titulo: 'Salud de los trabajadores',
    resumen: 'Exámenes médicos, ausentismo y horas-hombre. Aptitud y días, nunca diagnóstico.',
    color: '#1B5E4A',
    fase: 'hacer',
    cubre: ['Exámenes médicos', 'Ausentismo', 'Horas-hombre'],
  },
  {
    id: 'emergencias',
    titulo: 'Emergencias',
    resumen: 'Análisis de amenazas por metodología de colores y actas de simulacro firmadas.',
    color: '#1B5E4A',
    fase: 'hacer',
    cubre: ['Amenazas', 'Simulacros', 'Evaluadores'],
  },
  {
    id: 'alto-riesgo',
    titulo: 'Alto riesgo y contratistas',
    resumen: 'Permisos que vencen y cruzan la aptitud médica, y contratistas cuyos soportes caducan.',
    color: '#1B5E4A',
    fase: 'hacer',
    cubre: ['Permisos de trabajo', 'Contratistas', 'Personal en planta'],
  },

  {
    id: 'inspecciones',
    titulo: 'Inspecciones y auditorías',
    resumen: 'Listas de verificación, ejecución en planta desde el celular y veredicto.',
    color: 'var(--aviso)',
    fase: 'verificar',
    cubre: ['Inspecciones', 'Listas de verificación', 'Programadas'],
  },
  {
    id: 'autoevaluacion',
    titulo: 'Autoevaluación e indicadores legales',
    resumen: 'La nota de los estándares mínimos y los seis indicadores del artículo 30.',
    color: 'var(--aviso)',
    fase: 'verificar',
    cubre: ['Autoevaluación', 'Conjuntos de estándares', 'Indicadores del art. 30'],
  },

  {
    id: 'eventos',
    titulo: 'Accidentes e investigación',
    resumen: 'Registrar el evento, investigarlo dentro de los 15 días y firmarlo entre todo el equipo.',
    color: '#7A3E9D',
    fase: 'actuar',
    cubre: ['Eventos', 'Investigación', 'Equipo investigador'],
  },
  {
    id: 'acciones',
    titulo: 'Plan de acción',
    resumen: 'Convertir hallazgos en acciones con responsable, fecha y cierre verificado.',
    color: '#7A3E9D',
    fase: 'actuar',
    cubre: ['Plan de acción'],
  },
  {
    id: 'rendicion',
    titulo: 'Rendición de cuentas',
    resumen: 'El acta anual donde cada responsable escribe su propio informe y lo firma.',
    color: '#7A3E9D',
    fase: 'actuar',
    cubre: ['Rendición', 'Responsables'],
  },

  {
    id: 'reportes',
    titulo: 'Reportes, calendario e indicadores',
    resumen: 'Lo que se entrega a la ARL o al cliente: PDF, Excel y tableros.',
    color: 'var(--texto-suave)',
    fase: 'cierre',
    cubre: ['Reportes', 'Calendario', 'Indicadores', 'Matrices'],
  },
  {
    id: 'configuracion',
    titulo: 'Configuración y perfil',
    resumen: 'Encabezado de los documentos, tu firma, tu hoja de vida y tu contraseña.',
    color: 'var(--texto-suave)',
    fase: 'cierre',
    cubre: ['Configuración', 'Perfil', 'Plantillas'],
  },
];

export function fichaDe(id: string): FichaManual | undefined {
  return MANUALES.find((m) => m.id === id);
}

/* ================================================================ *
 *  Estructura común
 * ================================================================ */

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section style={c.seccion}>
      <h2 style={c.h2}>{titulo}</h2>
      {children}
    </section>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p style={c.p}>{children}</p>;
}

/* ================================================================ *
 *  1. Ingreso y primeros pasos
 * ================================================================ */

function ManualIngreso() {
  return (
    <>
      <Seccion titulo="Qué es este sistema">
        <P>
          Rúbrica administra el SG-SST de varias empresas a la vez. Todo lo que
          hace gira alrededor de una idea: <strong>capturar firmas que sirvan
          como prueba</strong> ante una ARL o una auditoría. Un acta sin firmas
          no demuestra nada; por eso las capacitaciones, las entregas de dotación
          y las inspecciones terminan siempre en un documento firmado.
        </P>
        <Figura pie="Tu cuenta agrupa a todas las empresas que atiendes; cada empresa tiene su propio personal.">
          <Jerarquia
            raiz="Tu cuenta (consultor)"
            hijos={['Empresa A', 'Empresa B', 'Empresa C']}
            nietos="Empleados"
          />
        </Figura>
        <Regla titulo="Una cuenta, muchas empresas">
          Los datos de una empresa nunca se mezclan con los de otra, y ninguna
          otra cuenta puede ver las tuyas. Casi todo lo que hagas se guarda
          contra la <strong>empresa activa</strong>, así que conviene mirar
          arriba antes de empezar a escribir.
        </Regla>
      </Seccion>

      <Seccion titulo="Crear la cuenta">
        <P>Hay dos formas de registrarse. Elige según si recibes o no el correo de confirmación.</P>
        <Figura
          pasos={[
            '*Registro con correo:* creas tu contraseña y confirmas la cuenta desde el mensaje que llega a tu bandeja. Es el método definitivo.',
            '*Registro sin correo:* el sistema genera una contraseña y la muestra en pantalla. Es un método temporal, mientras se habilita el envío de correos.',
            'En ambos casos eliges el *identificador*, que es la parte final del enlace público que escanean tus asistentes. No se puede cambiar después.',
          ]}
          pie="La cuenta nace con 14 días de prueba y sin pedir tarjeta."
        >
          <Flujo
            pasos={[
              { titulo: 'Datos de la empresa', detalle: 'Nombre e identificador' },
              { titulo: 'Tus datos', detalle: 'Nombre y correo' },
              { titulo: 'Contraseña', detalle: 'La eliges o la genera el sistema' },
              { titulo: 'Entras al panel', detalle: '14 días de prueba' },
            ]}
          />
        </Figura>
        <Ojo>
          Si te registraste <strong>sin correo</strong>, la contraseña se muestra
          una sola vez y no se puede volver a consultar. Cópiala antes de
          continuar. Al entrar por primera vez el sistema te obliga a cambiarla
          por una tuya: una contraseña que generó el servidor no es secreta.
        </Ojo>
      </Seccion>

      <Seccion titulo="La pantalla de trabajo">
        <P>
          Hay dos zonas de navegación y hacen cosas distintas. Arriba va lo que
          usas desde cualquier módulo; a la izquierda, los módulos del SG-SST.
        </P>
        <Figura
          pasos={[
            '*Selector de empresa:* es el contexto. Todo lo que crees se guarda contra la empresa elegida aquí.',
            '*Accesos rápidos:* Panel principal, Empleados, Calendario, Reportes y Plantillas. Son transversales —no pertenecen a ninguna fase— y por eso viven arriba.',
            '*Menú lateral:* los módulos, agrupados por las cuatro fases del ciclo PHVA, cada una con su color.',
            '*Área de trabajo:* el módulo que hayas abierto.',
          ]}
        >
          <Ventana titulo="panel">
            <Fila justificar="space-between">
              <Campo etiqueta="Empresa activa" valor="ALIMENTOS DEL NORTE SAS" marca={1} />
              <Fila gap={6}>
                <Boton fantasma marca={2}>Panel</Boton>
                <Boton fantasma>Empleados</Boton>
                <Boton fantasma>Calendario</Boton>
                <Boton fantasma>Reportes</Boton>
              </Fila>
            </Fila>
            <Titulo marca={4}>Panel principal</Titulo>
            <Fila gap={8}>
              <Tarjeta titulo="Empresas" dato="3" />
              <Tarjeta titulo="Empleados" dato="128" />
              <Tarjeta titulo="Pendientes" dato="7" color="var(--mal)" />
            </Fila>
          </Ventana>
        </Figura>
        <Figura
          pasos={[
            '*Planear:* matriz de peligros, plan anual, matriz legal y comités.',
            '*Hacer:* capacitaciones, dotación, salud, emergencias, alto riesgo y contratistas.',
            '*Verificar:* inspecciones, autoevaluación e indicadores del artículo 30.',
            '*Actuar:* accidentes, plan de acción y rendición de cuentas.',
          ]}
          pie="El menú se abre por fase; solo una a la vez, para que quepa sin desplazarse."
        >
          <Flujo
            pasos={[
              { titulo: 'Planear', detalle: 'Lo que se escribe antes' },
              { titulo: 'Hacer', detalle: 'La operación' },
              { titulo: 'Verificar', detalle: 'La nota' },
              { titulo: 'Actuar', detalle: 'Lo que se corrige' },
            ]}
          />
        </Figura>
        <Regla titulo="Por qué el menú está ordenado por PHVA y no por módulos">
          Es el orden con el que un auditor recorre el SG-SST, y hace evidente lo
          que falta: si abres <strong>Planear</strong> y está vacío, ya sabes por
          dónde está débil el sistema sin que nadie te lo explique. Un menú
          alfabético no dice nada de eso.
        </Regla>
        <Ojo>
          <strong>La barra de arriba se pinta con el color de la empresa activa.</strong>
          Es deliberado: casi nadie lee el nombre, pero todo el mundo nota que
          cambió el color. Si el color no es el que esperas, estás en otra
          empresa — revisa el selector antes de guardar.
        </Ojo>
      </Seccion>
    </>
  );
}

/* ================================================================ *
 *  2. Empresas
 * ================================================================ */

function ManualEmpresas() {
  return (
    <>
      <Seccion titulo="Para qué sirve">
        <P>
          La cartera es la lista de empresas que administras. Cada una trae su
          propia identidad documental — logo, colores, nomenclatura, versión —
          porque los documentos que emites llevan el membrete del cliente, no el
          tuyo.
        </P>
        <Figura
          pasos={[
            'Cada tarjeta resume una empresa con tres datos y su *próxima capacitación*.',
            'El botón *Trabajar aquí* la convierte en la empresa activa.',
            '*Nueva empresa* abre el formulario de alta.',
          ]}
        >
          <Ventana titulo="panel / empresas">
            <Fila justificar="space-between">
              <Titulo>Cartera de empresas</Titulo>
              <Boton marca={3}>Nueva empresa</Boton>
            </Fila>
            <Fila gap={9}>
              <Tarjeta titulo="ALIMENTOS DEL NORTE" dato="48" pie="empleados · próxima: 12 sep" marca={1} />
              <Tarjeta titulo="AUTOSNACK SAS" dato="31" pie="empleados · próxima: 3 oct" color="var(--aviso)" />
            </Fila>
            <Fila gap={6}>
              <Boton fantasma marca={2}>Trabajar aquí</Boton>
              <Boton fantasma>Editar</Boton>
            </Fila>
          </Ventana>
        </Figura>
      </Seccion>

      <Seccion titulo="Dar de alta una empresa">
        <Figura
          pasos={[
            '*Nombre y NIT:* salen impresos en el encabezado de cada documento.',
            '*Identificador (slug):* la parte final del enlace público de asistencia. Debe ser único en todo el sistema, no solo en tu cuenta.',
            '*Color:* tiñe la interfaz cuando esa empresa está activa y se usa en los documentos.',
            '*Logo:* aparece en el membrete de los PDF.',
          ]}
        >
          <Ventana titulo="panel / empresas / nueva">
            <Titulo>Nueva empresa</Titulo>
            <Fila gap={9}>
              <Campo etiqueta="Razón social" valor="ALIMENTOS DEL NORTE SAS" marca={1} />
              <Campo etiqueta="NIT" valor="901.234.567-8" />
            </Fila>
            <Fila gap={9}>
              <Campo etiqueta="Identificador" valor="alimentos-del-norte" marca={2} />
              <Campo etiqueta="Color" valor="#1B5E4A" marca={3} />
            </Fila>
            <Fila gap={9}>
              <Campo etiqueta="Logo" valor="logo-alimentos.png" marca={4} />
              <Campo etiqueta="Dirección" valor="Cra 45 #12-30, Bogotá" />
            </Fila>
            <Fila justificar="flex-end"><Boton color="#1B5E4A">Guardar</Boton></Fila>
          </Ventana>
        </Figura>
        <Regla titulo="Por qué el identificador no se puede repetir en todo el sistema">
          El enlace público de asistencia se abre <strong>sin iniciar sesión</strong>:
          cuando alguien escanea el QR, el sistema solo tiene el identificador para
          saber a qué empresa pertenece. Si dos empresas se llamaran
          <em> capacitaciones</em>, no habría forma de distinguirlas. Por eso, al
          crear o editar, el sistema comprueba que esté libre y te sugiere otro si
          ya está tomado.
        </Regla>
      </Seccion>
    </>
  );
}

/* ================================================================ *
 *  3. Empleados
 * ================================================================ */

function ManualEmpleados() {
  return (
    <>
      <Seccion titulo="Para qué sirve">
        <P>
          Es el personal de la empresa activa. Sostiene todo lo demás: a quién se
          convoca a una capacitación, quién valida su asistencia en el enlace
          público, a quién se le entrega dotación y de quién se arma el
          expediente.
        </P>
        <Figura
          pasos={[
            'El *buscador* filtra por nombre o documento; a su lado, el selector de área.',
            'La lista se agrupa por *área*, que es como se convoca en la práctica.',
            '*Expediente* abre la ficha completa de esa persona.',
            '*Retirados* lleva al panel de auditoría de quienes ya no están.',
          ]}
        >
          <Ventana titulo="panel / empleados">
            <Fila justificar="space-between">
              <Titulo>Empleados</Titulo>
              <Fila gap={6}>
                <Boton fantasma marca={4}>Retirados</Boton>
                <Boton color="#2A6F97">Nuevo empleado</Boton>
              </Fila>
            </Fila>
            <Fila gap={8}>
              <Campo etiqueta="Buscar" valor="Escribe nombre o documento" marca={1} />
              <Campo etiqueta="Área" valor="Todas" />
            </Fila>
            <Tabla
              marca={2}
              columnas={['Documento', 'Nombre', 'Cargo', 'Área', '']}
              filas={[
                ['1.020.334', 'PÉREZ, ANA', 'Operaria', 'Producción', 'Expediente'],
                ['79.445.221', 'GÓMEZ, LUIS', 'Mecánico', 'Mantenimiento', 'Expediente'],
              ]}
            />
          </Ventana>
        </Figura>
      </Seccion>

      <Seccion titulo="Retiro y reincorporación">
        <P>
          Un empleado que se va <strong>no se borra</strong>: se marca con fecha
          de retiro. Desaparece de los listados y de las convocatorias, pero
          conserva sus actas firmadas, sus entregas y su expediente.
        </P>
        <Figura
          pie="Si la persona vuelve, se reincorpora desde el panel de retirados y recupera su historial."
        >
          <Flujo
            color="#2A6F97"
            pasos={[
              { titulo: 'Activo', detalle: 'Aparece en listas y convocatorias' },
              { titulo: 'Retirado', detalle: 'Sale de las listas; el historial queda' },
              { titulo: 'Reincorporado', detalle: 'Vuelve con todo su expediente' },
            ]}
          />
        </Figura>
        <Regla titulo="Por qué no se borra">
          Un acta de capacitación es evidencia legal. Si se borrara la persona,
          el acta quedaría firmada por alguien que "no existe" y perdería valor
          probatorio justo cuando más se necesita: en una auditoría posterior al
          retiro.
        </Regla>
        <Ojo>
          El sistema no deja crear dos empleados con el mismo documento en la
          misma empresa. Si te dice que ya existe, búscalo en
          <strong> Retirados</strong>: probablemente esté ahí.
        </Ojo>
      </Seccion>

      <Seccion titulo="El expediente">
        <P>
          Cruza en una sola pantalla la formación recibida, la dotación entregada
          y los equipos asignados, y emite un veredicto: <em>Al día</em> o
          <em> Requiere atención</em>. Es la respuesta a la pregunta que hace un
          inspector: “muéstreme todo lo de esta persona”.
        </P>
        <Figura>
          <Ventana titulo="panel / empleados / expediente" menu={false}>
            <Fila justificar="space-between">
              <Titulo>PÉREZ, ANA — Producción</Titulo>
              <Estado texto="Requiere atención" tono="aviso" />
            </Fila>
            <Tabla
              columnas={['Bloque', 'Detalle', 'Estado']}
              filas={[
                ['Formación', '6 capacitaciones', 'Al día'],
                ['Dotación', 'Botas — vence en 12 días', 'Por vencer'],
                ['Equipos', 'Arnés PL-2291', 'Asignado'],
              ]}
            />
          </Ventana>
        </Figura>
      </Seccion>
    </>
  );
}

/* ================================================================ *
 *  4. Capacitaciones
 * ================================================================ */

function ManualCapacitaciones() {
  return (
    <>
      <Seccion titulo="El recorrido completo">
        <Figura
          pie="La asistencia la registra cada asistente desde su celular; tú no transcribes nada."
        >
          <Flujo
            color="#7A4E9B"
            pasos={[
              { titulo: 'Crear', detalle: 'Tema, fecha, empresa' },
              { titulo: 'Convocar', detalle: 'Elegir quién debe asistir' },
              { titulo: 'Activar', detalle: 'Se abre el enlace público' },
              { titulo: 'Registrar', detalle: 'Cada asistente firma con el QR' },
              { titulo: 'Emitir', detalle: 'Acta en PDF' },
            ]}
          />
        </Figura>
      </Seccion>

      <Seccion titulo="Crear una capacitación">
        <Figura
          pasos={[
            '*Tema, fecha y duración:* salen en el acta.',
            '*Empresa capacitada:* marca si es la empresa propia o escribe cuál es. Uno de los dos es obligatorio.',
            '*¿Se evaluará?* y *¿Se valida contra la base de empleados?* deben marcarse AQUÍ. Si no los marcas, esos botones quedan desactivados en el detalle.',
            '*Anexar mi firma como responsable:* toma la firma guardada en tu perfil y la estampa en el acta.',
          ]}
        >
          <Ventana titulo="panel / capacitaciones / nueva">
            <Titulo>Nueva capacitación</Titulo>
            <Fila gap={9}>
              <Campo etiqueta="Tema" valor="Trabajo en alturas" marca={1} />
              <Campo etiqueta="Fecha" valor="12/09/2026" />
            </Fila>
            <Campo etiqueta="Empresa capacitada" valor="ALIMENTOS DEL NORTE SAS" marca={2} />
            <Fila gap={9}>
              <Campo etiqueta="¿Se evaluará?" valor="Sí" marca={3} />
              <Campo etiqueta="¿Validar empleados?" valor="Sí" />
            </Fila>
            <Campo etiqueta="Anexar mi firma como responsable" valor="Sí" marca={4} />
            <Fila justificar="flex-end"><Boton color="#7A4E9B">Crear</Boton></Fila>
          </Ventana>
        </Figura>
        <Ojo>
          <strong>Evaluación y convocatoria se deciden al crear.</strong> Si
          abres el detalle y los botones aparecen apagados, no es un error: es
          que esas casillas no se marcaron. Créala de nuevo o edítala.
        </Ojo>
      </Seccion>

      <Seccion titulo="El enlace público y el QR">
        <P>
          Cada empresa tiene un enlace de registro que se abre <strong>sin
          iniciar sesión</strong>. Se proyecta el QR en la sala, cada asistente
          lo escanea, se identifica con su documento y firma en la pantalla del
          celular.
        </P>
        <Figura
          pasos={[
            'El QR y el enlace están en el *listado*, no dentro del detalle: es lo que necesitas antes de entrar a la sesión.',
            'El asistente escribe su documento y el sistema lo valida contra la base de empleados, si marcaste esa opción.',
            'Firma con el dedo y queda registrado con fecha y hora.',
          ]}
        >
          <Ventana titulo="registro público (celular del asistente)" menu={false}>
            <Titulo marca={2}>Registro de asistencia</Titulo>
            <Campo etiqueta="Número de documento" valor="1.020.334" />
            <Linea ancho={70} />
            <div style={{
              border: '1px dashed var(--borde)', borderRadius: 8, height: 46,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, color: 'var(--texto-suave)',
            }}>
              Área de firma
            </div>
            <Fila justificar="flex-end"><Boton color="#7A4E9B" marca={3}>Registrar</Boton></Fila>
          </Ventana>
        </Figura>
        <Regla titulo="Solo una capacitación activa por empresa">
          El enlace público resuelve por el identificador de la empresa, así que
          si hubiera dos capacitaciones activas a la vez no sabría en cuál
          registrar al asistente. Puedes tener una activa en cada empresa al
          mismo tiempo — el límite es por empresa, no por cuenta.
        </Regla>
      </Seccion>

      <Seccion titulo="Estados y el resaltado del listado">
        <P>
          Solo existen dos estados: <strong>activa</strong> e
          <strong> inactiva</strong>. No hay “cerrada” ni “programada”. Lo que el
          listado resalta es únicamente la <strong>siguiente</strong> a la fecha
          de hoy, para que sepas cuál preparar.
        </P>
        <Figura>
          <Ventana titulo="panel / capacitaciones">
            <Fila justificar="space-between">
              <Titulo>Capacitaciones</Titulo>
              <Boton color="#7A4E9B">Nueva</Boton>
            </Fila>
            <Tabla
              columnas={['Código', 'Tema', 'Fecha', 'Estado', '']}
              filas={[
                ['C26-007', 'Trabajo en alturas', '12/09/2026', 'Activa', 'QR · Enlace'],
                ['C26-006', 'Manejo de extintores', '02/08/2026', 'Inactiva', 'Acta'],
              ]}
            />
          </Ventana>
        </Figura>
      </Seccion>

      <Seccion titulo="Evaluaciones">
        <P>
          Las preguntas se agrupan por <strong>subtema</strong>. Al cerrar, el
          sistema consolida en qué subtema falló el grupo, que es lo que
          realmente sirve para decidir el refuerzo del próximo trimestre: saber
          que el 60% falló en “uso del arnés” vale más que un promedio de 7,8.
        </P>
        <Ojo>
          Eliminar una capacitación solo es posible desde <strong>Editar</strong>,
          y solo si no tiene registros de asistencia ni ninguna firma. Una firma
          sin registros significa que la sesión sí se ejecutó, así que el botón
          queda bloqueado.
        </Ojo>
      </Seccion>
    </>
  );
}

/* ================================================================ *
 *  5. Dotación
 * ================================================================ */

function ManualDotacion() {
  return (
    <>
      <Seccion titulo="Un solo módulo para EPP y equipos">
        <P>
          Los elementos de protección y los equipos viven juntos porque el
          documento de entrega es el mismo. Lo que cambia es cómo se controlan:
        </P>
        <Figura>
          <Decision
            pregunta="¿El elemento se devuelve?"
            si="Retornable (equipos): se controla unidad por unidad, con serial o placa. Se asigna y se devuelve."
            no="Consumible (EPP): se controla por cantidad. Vence y se repone."
            colorSi="var(--aviso)"
            colorNo="#0F766E"
          />
        </Figura>
      </Seccion>

      <Seccion titulo="Entregar dotación">
        <Figura
          pasos={[
            'Eliges el empleado y los elementos: se crea un *borrador*.',
            'El empleado firma en pantalla, o se le envía un *enlace de firma remota*.',
            'Al firmar, y solo entonces, se descuenta el inventario y se asignan las unidades.',
            'Se emite el *acta de entrega* en PDF.',
          ]}
        >
          <Flujo
            color="var(--aviso)"
            pasos={[
              { titulo: 'Borrador', detalle: 'Empleado y elementos' },
              { titulo: 'Firma', detalle: 'En pantalla o remota' },
              { titulo: 'Descuento', detalle: 'Se mueve el inventario' },
              { titulo: 'Acta PDF', detalle: 'Documento firmado' },
            ]}
          />
        </Figura>
        <Ojo>
          La devolución se registra <strong>por elemento</strong>, no por acta
          completa: alguien puede devolver el portátil y quedarse con el celular
          de la misma entrega. Cada devolución emite su propia <strong>acta en
          PDF</strong>, con su código (<em>DEV26-001</em>), la comparación entre
          cómo se entregó y cómo volvió, y el acta de entrega de la que salió.
        </Ojo>

        <Regla titulo="Por qué el inventario se mueve al firmar y no al crear">
          Un borrador no es una entrega: es una intención. Si el inventario se
          descontara al armarlo, cualquier borrador abandonado dejaría faltantes
          fantasma en el stock. La existencia solo cambia cuando hay una firma
          que la respalde.
        </Regla>
      </Seccion>

      <Seccion titulo="Alertas y matriz">
        <Figura
          pasos={[
            '*Por vencer* y *vencido:* elementos cuya vigencia se acaba.',
            '*Bajo mínimo:* el stock cayó por debajo del mínimo del artículo.',
            '*De retirados:* equipos que siguen asignados a alguien que ya se fue.',
          ]}
        >
          <Ventana titulo="panel / dotacion / alertas">
            <Titulo>Alertas</Titulo>
            <Fila gap={8}>
              <Tarjeta titulo="Por vencer" dato="7" color="var(--aviso)" marca={1} />
              <Tarjeta titulo="Bajo mínimo" dato="3" color="var(--mal)" marca={2} />
              <Tarjeta titulo="De retirados" dato="2" color="var(--texto-suave)" marca={3} />
            </Fila>
            <Tabla
              columnas={['Elemento', 'Empleado', 'Vence', 'Estado']}
              filas={[
                ['Botas dieléctricas', 'PÉREZ, ANA', '10/09/2026', 'Por vencer'],
                ['Guantes de carnaza', '—', '—', 'Bajo mínimo'],
              ]}
            />
          </Ventana>
        </Figura>
        <P>
          La <strong>matriz de dotación</strong> cruza empleados contra elementos
          y muestra la vigencia de cada cruce con cinco estados:
        </P>
        <Fila gap={6} margen={10}>
          <Estado texto="Vigente" tono="ok" />
          <Estado texto="Por vencer" tono="aviso" />
          <Estado texto="Vencido" tono="mal" />
          <Estado texto="Sin vencimiento" tono="neutro" />
          <Estado texto="Nunca entregado" tono="neutro" />
        </Fila>
      </Seccion>

      <Seccion titulo="Kardex">
        <P>
          El kardex es el movimiento de entradas y salidas en orden cronológico,
          con el saldo corrido de cada elemento. Se descarga en Excel desde
          Reportes, como una tabla plana con filtro: está pensado para cruzarlo,
          no para imprimirlo.
        </P>
      </Seccion>
    </>
  );
}

/* ================================================================ *
 *  6. Inspecciones
 * ================================================================ */

function ManualInspecciones() {
  return (
    <>
      <Seccion titulo="Listas de verificación">
        <P>
          El sistema trae <strong>11 listas precargadas</strong> con 121
          criterios — extintores, botiquines, camillas, orden y aseo,
          señalización, rutas de evacuación, arnés y alturas, escaleras,
          herramienta eléctrica, EPP en uso y estándares mínimos de la
          Resolución 0312. Son editables: puedes duplicarlas y adaptarlas sin
          tocar la original.
        </P>
        <Figura
          pasos={[
            'El *buscador* filtra entre todas las listas.',
            '*Duplicar* crea una copia tuya para adaptarla.',
            'Los criterios marcados como *críticos* se señalan aquí.',
          ]}
        >
          <Ventana titulo="panel / inspecciones / plantillas">
            <Fila justificar="space-between">
              <Titulo>Listas de verificación</Titulo>
              <Boton color="#0F766E">Nueva lista</Boton>
            </Fila>
            <Campo etiqueta="Buscar" valor="extintores" marca={1} />
            <Tabla
              marca={3}
              columnas={['Lista', 'Criterios', 'Críticos', '']}
              filas={[
                ['Extintores NTC 2885', 12, 7, 'Duplicar'],
                ['Botiquines Res. 0705/2007', 9, 4, 'Duplicar'],
              ]}
            />
          </Ventana>
        </Figura>
      </Seccion>

      <Seccion titulo="Ejecutar en planta">
        <P>
          La ejecución muestra <strong>un criterio por pantalla</strong>, pensada
          para el celular con una mano mientras se camina la planta. El hallazgo
          y la foto solo se piden cuando marcas “no cumple”: preguntarlo siempre
          alargaría cada inspección sin aportar nada.
        </P>
        <Figura
          pasos={[
            'Se responde cumple / no cumple / no aplica.',
            'Al marcar *no cumple* aparecen el hallazgo y la foto.',
            'Al terminar se cierra con las firmas del responsable y del acompañante.',
          ]}
        >
          <Ventana titulo="ejecución (celular)" menu={false}>
            <Linea ancho={40} />
            <Titulo>Criterio 4 de 12</Titulo>
            <P>¿El extintor tiene la señalización visible a 1,5 m?</P>
            <Fila gap={6} margen={4}>
              <Boton fantasma color="var(--bien)" marca={1}>Cumple</Boton>
              <Boton fantasma color="var(--mal)" marca={2}>No cumple</Boton>
              <Boton fantasma>No aplica</Boton>
            </Fila>
          </Ventana>
        </Figura>
      </Seccion>

      <Seccion titulo="El veredicto: puntaje y conformidad no son lo mismo">
        <Figura pie="Es la regla que más confusión genera, y la que sostiene el valor del informe.">
          <Decision
            pregunta="¿Hay algún criterio CRÍTICO incumplido?"
            si="La inspección NO CUMPLE, aunque el puntaje sea del 95%."
            no="El veredicto lo define el puntaje obtenido."
            colorSi="var(--mal)"
            colorNo="var(--bien)"
          />
        </Figura>
        <Regla titulo="Lo marcado “no aplica” sale del cálculo">
          Si una lista de 12 criterios tiene 2 que no aplican al objeto
          inspeccionado, el puntaje se calcula sobre 10, no sobre 12. Contarlos
          como incumplidos castigaría a quien no tenía nada que cumplir ahí.
        </Regla>
      </Seccion>

      <Seccion titulo="Programación">
        <P>
          Una inspección puede programarse con una frecuencia — mensual,
          trimestral — y el sistema lleva la próxima fecha. Cuando ejecutas la
          inspección, la fecha corre sola al siguiente periodo. Los vencimientos
          se ven en pantalla.
        </P>
        <Ojo>
          El aviso por correo de las programadas <strong>todavía no está
          habilitado</strong>. Hoy hay que mirar la pantalla de programadas;
          llegará cuando se habilite el envío de correos.
        </Ojo>
      </Seccion>
    </>
  );
}

/* ================================================================ *
 *  7. Plan de acción
 * ================================================================ */

function ManualAcciones() {
  return (
    <>
      <Seccion titulo="De hallazgo a acción">
        <P>
          Una inspección que solo señala problemas no cierra el ciclo. Desde los
          hallazgos se generan acciones correctivas con responsable, fecha
          límite y severidad.
        </P>
        <Figura
          pasos={[
            'Desde la inspección cerrada, *generar acciones* crea una por cada incumplimiento.',
            'Se asigna responsable y fecha límite.',
            'Al cerrarla, el sistema exige *quién verificó* que quedó resuelta.',
          ]}
        >
          <Flujo
            color="var(--mal)"
            pasos={[
              { titulo: 'Hallazgo', detalle: 'Criterio incumplido' },
              { titulo: 'Acción', detalle: 'Responsable y fecha' },
              { titulo: 'Cierre', detalle: 'Con verificación' },
            ]}
          />
        </Figura>
        <Regla titulo="Cerrar exige quién verificó">
          Sin ese dato, “cerrada” es una afirmación de nadie. Con él, el plan de
          acción resiste una auditoría: cada cierre tiene un nombre detrás.
        </Regla>
      </Seccion>

      <Seccion titulo="La vista del plan">
        <P>
          Las acciones se agrupan <strong>por inspección</strong>, que es como se
          revisan en la práctica: nadie repasa acciones sueltas, se repasa qué
          quedó pendiente de la inspección del 12 de agosto.
        </P>
        <Figura>
          <Ventana titulo="panel / acciones">
            <Titulo>Plan de acción</Titulo>
            <Linea ancho={55} />
            <Tabla
              columnas={['Acción', 'Responsable', 'Límite', 'Estado']}
              filas={[
                ['Reponer señalización de extintor', 'GÓMEZ, LUIS', '20/08/2026', 'Vencida'],
                ['Recargar extintor bodega 2', 'GÓMEZ, LUIS', '15/09/2026', 'Abierta'],
              ]}
            />
            <Fila gap={6}>
              <Estado texto="Abierta" tono="neutro" />
              <Estado texto="Vencida" tono="mal" />
              <Estado texto="Cerrada" tono="ok" />
            </Fila>
          </Ventana>
        </Figura>
        <Ojo>
          <strong>Vencida</strong> no es un estado que alguien marque: se calcula
          cada vez que se lista, comparando la fecha límite con hoy. Por eso una
          acción pasa a vencida sola, sin que nadie la toque.
        </Ojo>
      </Seccion>
    </>
  );
}

/* ================================================================ *
 *  8. Reportes
 * ================================================================ */

function ManualReportes() {
  return (
    <>
      <Seccion titulo="Qué se puede descargar">
        <Figura
          pasos={[
            '*Documentos PDF:* actas de capacitación y de entrega, informes de inspección, cronograma, reporte ejecutivo y tu hoja de vida.',
            '*Reporte de matriz:* capacitaciones y dotación, ambos en Excel.',
            '*Inspecciones y plan de acción:* un libro con tres hojas.',
            '*Kardex de dotación:* movimientos cronológicos con saldo corrido.',
          ]}
        >
          <Ventana titulo="panel / reportes">
            <Titulo>Reportes</Titulo>
            <Fila gap={9}>
              <Tarjeta titulo="Documentos PDF" pie="Actas e informes" color="#4338CA" marca={1} />
              <Tarjeta titulo="Reporte de matriz" pie="Capacitaciones · Dotación" color="#4338CA" marca={2} />
            </Fila>
            <Fila gap={9}>
              <Tarjeta titulo="Inspecciones" pie="3 hojas de Excel" color="#4338CA" marca={3} />
              <Tarjeta titulo="Kardex" pie="Entradas y salidas" color="#4338CA" marca={4} />
            </Fila>
          </Ventana>
        </Figura>
        <Regla titulo="Cada matriz trae la rejilla y una hoja plana">
          La rejilla es la que ves en pantalla: sirve para mirar. La hoja
          <strong> Detalle</strong> trae una fila por cada cruce empleado ×
          elemento, y es la que puedes filtrar, ordenar y llevar a una tabla
          dinámica. Una rejilla es un dibujo; una tabla larga es información.
        </Regla>
      </Seccion>

      <Seccion titulo="Calendario">
        <P>
          Muestra un mes a la vez, con opción de ver solo la semana. Desde él se
          crean capacitaciones y anotaciones, y lo que crees queda tanto en el
          calendario como en el listado del módulo correspondiente.
        </P>
      </Seccion>

      <Seccion titulo="Indicadores">
        <P>
          Hay dos tableros. El de capacitaciones resume cobertura y evaluaciones.
          El de inspecciones muestra cumplimiento por tipo, tendencia mensual,
          <strong> hallazgos recurrentes</strong> — el mismo criterio que falla
          una y otra vez — y el estado del plan de acción.
        </P>
      </Seccion>
    </>
  );
}

/* ================================================================ *
 *  9. Configuración y perfil
 * ================================================================ */

function ManualConfiguracion() {
  return (
    <>
      <Seccion titulo="Encabezado de los documentos">
        <P>
          Cada empresa puede tener su propio diseño de encabezado: tres
          plantillas — línea, tabla o lateral —, posición del logo y qué datos se
          muestran. El plan básico usa el encabezado estándar.
        </P>
        <Figura
          pasos={[
            'Eliges *plantilla*, posición del logo y qué datos aparecen.',
            'La vista previa muestra el resultado antes de guardar.',
            'El código del documento no va en el encabezado: ya aparece en el pie.',
          ]}
        >
          <Ventana titulo="panel / configuracion">
            <Titulo>Diseño del encabezado</Titulo>
            <Fila gap={9}>
              <Campo etiqueta="Plantilla" valor="Tabla" marca={1} />
              <Campo etiqueta="Logo" valor="Izquierda" />
            </Fila>
            <Fila gap={9}>
              <Campo etiqueta="Mostrar NIT" valor="Sí" />
              <Campo etiqueta="Mostrar dirección" valor="No" />
            </Fila>
            <div style={{ border: '1px solid var(--borde)', borderRadius: 8, padding: 10 }}>
              <Fila gap={8}>
                <div style={{
                  width: 34, height: 26, border: '1px dashed var(--borde)',
                  borderRadius: 4, fontSize: 8, color: 'var(--texto-suave)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>logo</div>
                <div style={{ flex: 1 }}>
                  <Linea ancho={60} />
                  <div style={{ height: 5 }} />
                  <Linea ancho={35} alto={6} />
                </div>
              </Fila>
            </div>
          </Ventana>
        </Figura>
        <Regla titulo="Lo emitido no cambia aunque cambies el diseño">
          El encabezado se congela <strong>al emitir</strong> el documento — al
          cerrar la inspección, al firmar la entrega, al activar la capacitación
          —, no al crear el registro. Un acta firmada en marzo conserva el
          membrete de marzo aunque hoy cambies el logo: si cambiara, dejaría de
          coincidir con la copia que el cliente ya tiene archivada.
        </Regla>
        <Ojo>
          El corolario práctico: si cambias el encabezado y quieres verlo, el
          documento tiene que emitirse <strong>después</strong> del cambio. Los
          que ya estaban emitidos no se actualizan, y eso es intencional.
        </Ojo>
      </Seccion>

      <Seccion titulo="Tu perfil profesional">
        <P>
          Guarda tu firma una sola vez y se reutiliza en los documentos donde
          figuras como responsable. También arma tu hoja de vida, cuya trayectoria
          <strong> no se escribe a mano</strong>: se calcula del propio sistema —
          personas capacitadas, sesiones, horas — respaldada por actas firmadas.
        </P>
        <Ojo>
          La firma se copia al documento <strong>en el momento de emitirlo</strong>.
          Si activaste una capacitación y después marcaste “anexar mi firma”, esa
          acta ya se emitió sin ella. Marca la casilla antes de activar.
        </Ojo>
      </Seccion>

      <Seccion titulo="Cambiar tu contraseña">
        <P>
          Está en Perfil. Pide la contraseña actual antes de cambiarla: tener la
          sesión abierta no prueba quién está frente al equipo, y un portátil sin
          bloquear no debería bastar para quedarse con la cuenta.
        </P>
      </Seccion>
    </>
  );
}

/* ================================================================ *
 *  Panel principal y pendientes
 * ================================================================ */

function ManualPendientes() {
  return (
    <>
      <Seccion titulo="Para qué sirve">
        <P>
          Es la primera pantalla al entrar y responde a una sola pregunta:
          <strong> ¿qué tengo que hacer hoy?</strong> No es un resumen bonito;
          es una bandeja que junta trece fuentes distintas del sistema y las
          ordena por gravedad, para que no dependa de tu memoria acordarte de
          que a un contratista se le venció la planilla.
        </P>
        <Figura
          pasos={[
            'El *semáforo* de cada empresa: qué tan al día está su SG-SST.',
            'La *bandeja de pendientes*, ordenada por severidad. Lo crítico primero.',
            'Cada pendiente es un *enlace*: te lleva a la pantalla donde se resuelve.',
          ]}
        >
          <Ventana titulo="panel">
            <Titulo marca={1}>Panel principal</Titulo>
            <Fila gap={8}>
              <Tarjeta titulo="ALIMENTOS DEL NORTE" dato="78%" pie="cumplimiento" color="var(--aviso)" />
              <Tarjeta titulo="AUTOSNACK SAS" dato="94%" pie="cumplimiento" color="#1B5E4A" />
            </Fila>
            <Titulo marca={2}>Pendientes</Titulo>
            <Tabla
              columnas={['Qué', 'Empresa', 'Severidad']}
              filas={[
                ['Accidente sin investigar (día 12 de 15)', 'Alimentos del Norte', 'Crítico'],
                ['COPASST incompleto: falta 1 suplente', 'Alimentos del Norte', 'Alto'],
                ['Examen médico vencido: 3 personas', 'Autosnack', 'Alto'],
              ]}
              marca={3}
            />
          </Ventana>
        </Figura>
      </Seccion>

      <Seccion titulo="Qué vigila la bandeja">
        <P>
          Accidentes sin investigar y sin reportar a la ARL, acciones vencidas,
          inspecciones programadas que ya pasaron de fecha, exámenes médicos por
          vencer, peligros de nivel I y II sin control, dotación por vencer, el
          plan anual y la autoevaluación del año, la matriz legal, los soportes
          de contratistas y los comités mal conformados o inexistentes.
        </P>
        <Regla titulo="Por qué se calcula al abrir y no se guarda">
          Un pendiente no es un dato: es una <strong>conclusión sobre la fecha
          de hoy</strong>. Una acción que ayer estaba en plazo hoy está vencida
          sin que nadie haya tocado nada. Si el estado se guardara, la bandeja
          quedaría mintiendo hasta que alguien la volviera a calcular.
        </Regla>
        <Ojo>
          La bandeja es de la <strong>empresa activa</strong>, salvo el semáforo,
          que muestra tu cartera completa. Si esperabas ver el pendiente de otro
          cliente, cambia de empresa arriba.
        </Ojo>
      </Seccion>
    </>
  );
}

/* ================================================================ *
 *  Firmas, PDF y correo
 * ================================================================ */

function ManualFirmas() {
  return (
    <>
      <Seccion titulo="La regla que rige todo el producto">
        <P>
          Un acta sin firmas no prueba nada. Pero si para conseguir esas firmas
          hay que ir a buscar a la gente por la planta, la firma virtual no
          ahorró nada frente al papel. Por eso <strong>toda firma se puede pedir
          por enlace al correo</strong>, y <strong>todo documento firmado sale en
          PDF y se puede enviar</strong>. Las tres cosas, en todos los módulos.
        </P>
        <Figura
          pasos={[
            '*En sitio:* la persona firma con el dedo o el ratón en tu pantalla. Sirve cuando está delante.',
            '*Por enlace:* el sistema genera una dirección única y la envía por correo. La persona abre, lee y firma desde su celular, sin cuenta ni contraseña.',
            '*PDF:* al quedar completo, el documento se descarga o se envía.',
          ]}
        >
          <Flujo
            pasos={[
              { titulo: 'Documento', detalle: 'Lo preparas tú' },
              { titulo: 'Enlace', detalle: 'Uno por firmante' },
              { titulo: 'Firma', detalle: 'Cada quien desde donde esté' },
              { titulo: 'PDF', detalle: 'Descargar o enviar' },
            ]}
          />
        </Figura>
      </Seccion>

      <Seccion titulo="Qué se puede firmar por enlace">
        <Tabla
          columnas={['Documento', 'Enlace por correo']}
          filas={[
            ['Asistencia a capacitación', 'Sí — con enlace público y código QR'],
            ['Entrega de dotación', 'Sí'],
            ['Investigación de un accidente', 'Sí — uno por integrante del equipo'],
            ['Acta de simulacro', 'Sí — uno por evaluador'],
            ['Permiso de trabajo de alto riesgo', 'Sí — ejecutantes, vigía y coordinador'],
            ['Rendición de cuentas', 'Sí — cada responsable escribe y firma lo suyo'],
          ]}
        />
        <Regla titulo="Por qué el enlace no pide contraseña">
          Quien firma no tiene cuenta en el sistema ni tiene por qué tenerla: es
          un trabajador, un evaluador de la ARL o un jefe de área. El enlace lleva
          un <strong>código único e irrepetible</strong> que solo sirve para ese
          documento y esa persona. Es la misma idea de un enlace de pago: no da
          acceso a nada más.
        </Regla>
        <Ojo>
          El enlace <strong>siempre se muestra en pantalla para copiarlo</strong>,
          aunque también se envíe por correo. Mientras el envío de correos no esté
          habilitado con un dominio propio, copiar el enlace y mandarlo por
          WhatsApp funciona igual de bien.
        </Ojo>
      </Seccion>

      <Seccion titulo="Cuándo queda firmado el documento">
        <P>
          Los documentos que dan fe de un acto colectivo <strong>exigen todas las
          firmas para poder cerrarse</strong>: la investigación de un accidente, el
          acta de simulacro, el permiso de alto riesgo y la rendición de cuentas.
          Falta una y el sistema no deja cerrar.
        </P>
        <Decision
          pregunta="¿Están todas las firmas del documento?"
          si="Se cierra, se congela el membrete y se emite el PDF"
          no="Sigue en borrador, con el pendiente a la vista"
        />
      </Seccion>
    </>
  );
}

/* ================================================================ *
 *  Matriz de peligros
 * ================================================================ */

function ManualPeligros() {
  return (
    <>
      <Seccion titulo="Para qué sirve">
        <P>
          Es la identificación de peligros y valoración de riesgos por la
          <strong> GTC 45</strong>. Sin ella los demás módulos quedan huérfanos:
          no se puede justificar por qué se entrega <em>ese</em> EPP y no otro,
          ni por qué se capacita en <em>ese</em> tema.
        </P>
        <Figura
          pasos={[
            'El peligro, con su clasificación, la tarea y cuánta gente expone.',
            'La *valoración*: deficiencia, exposición y consecuencia. Los demás números salen solos.',
            'El *nivel* (I a IV) y si el riesgo es aceptable, calculados por el sistema.',
            'Los *controles*: el EPP, la capacitación o la inspección que lo controlan.',
          ]}
        >
          <Ventana titulo="panel / peligros">
            <Titulo marca={1}>Matriz de peligros</Titulo>
            <Fila gap={9}>
              <Campo etiqueta="Peligro" valor="Caída de altura — mantenimiento de techos" />
              <Campo etiqueta="Expuestos" valor="4" />
            </Fila>
            <Fila gap={9}>
              <Campo etiqueta="Deficiencia" valor="6" marca={2} />
              <Campo etiqueta="Exposición" valor="3" />
              <Campo etiqueta="Consecuencia" valor="60" />
            </Fila>
            <Fila gap={8}>
              <Tarjeta titulo="Nivel de riesgo" dato="I" pie="No aceptable" color="var(--mal)" marca={3} />
              <Tarjeta titulo="Controles" dato="3" pie="Arnés · Trabajo en alturas · Inspección" marca={4} />
            </Fila>
          </Ventana>
        </Figura>
      </Seccion>

      <Seccion titulo="Cómo se calcula">
        <P>
          Tú calificas tres cosas y el sistema hace el resto: nivel de
          probabilidad, nivel de riesgo, nivel I–IV y aceptabilidad.
        </P>
        <Regla titulo="Por qué la valoración no se puede escribir a mano">
          El cálculo vive en la base de datos, no en la pantalla. Eso significa
          que <strong>ninguna vista puede mostrar un nivel distinto al de otra</strong>:
          la matriz, el informe y la bandeja de pendientes leen el mismo número.
          Una matriz donde el nivel se teclea es una matriz donde, tarde o
          temprano, alguien baja un riesgo a mano.
        </Regla>
        <Ojo>
          Los peligros de <strong>nivel I y II sin ningún control asociado</strong>
          aparecen en la bandeja de pendientes. Es el hallazgo más común en una
          visita: la matriz existe, pero nadie enlazó el riesgo alto con lo que
          se hizo para controlarlo.
        </Ojo>
      </Seccion>
    </>
  );
}

/* ================================================================ *
 *  Plan anual de trabajo
 * ================================================================ */

function ManualPlanAnual() {
  return (
    <>
      <Seccion titulo="Para qué sirve">
        <P>
          Es el cronograma del año: qué actividades se van a hacer, en qué meses
          y con qué responsable. No es un adorno de la carpeta — es uno de los
          documentos que primero se piden, y tiene que estar <strong>firmado por
          el empleador</strong>.
        </P>
        <Figura
          pasos={[
            'Cada actividad con su responsable y su recurso.',
            'Los meses *programados* se marcan al planear.',
            'Los meses *ejecutados* se marcan durante el año: es lo que demuestra que el plan se cumplió.',
            '*Aprobar* pide nombre y firma del empleador.',
          ]}
        >
          <Ventana titulo="panel / plan-anual">
            <Titulo marca={1}>Plan anual 2026</Titulo>
            <Tabla
              columnas={['Actividad', 'Responsable', 'Programado', 'Ejecutado']}
              filas={[
                ['Capacitación en alturas', 'HSEQ', 'Mar · Sep', 'Mar'],
                ['Inspección de extintores', 'Brigada', 'Ene · Abr · Jul · Oct', 'Ene · Abr'],
                ['Simulacro de evacuación', 'Brigada', 'Oct', '—'],
              ]}
              marca={2}
            />
            <Fila justificar="flex-end">
              <Boton marca={4}>Aprobar y firmar</Boton>
            </Fila>
          </Ventana>
        </Figura>
      </Seccion>

      <Seccion titulo="Aprobar es firmar">
        <P>
          El sistema no deja aprobar un plan vacío: exige <strong>al menos una
          actividad, el nombre del empleador y su firma</strong>.
        </P>
        <Regla titulo="Por qué se separa lo programado de lo ejecutado">
          Un plan donde solo se ve lo programado demuestra que se planeó, no que
          se hizo. La comparación entre las dos filas <strong>es</strong> el
          indicador de cumplimiento del plan, y es lo que un auditor mira: doce
          casillas programadas y tres ejecutadas cuentan una historia que ninguna
          frase puede tapar.
        </Regla>
        <Ojo>
          Si el año avanza y no hay plan aprobado, aparece en la bandeja de
          pendientes. No es un recordatorio amable: sin plan anual del año en
          curso el estándar se pierde completo.
        </Ojo>
      </Seccion>
    </>
  );
}

/* ================================================================ *
 *  Matriz legal
 * ================================================================ */

function ManualMatrizLegal() {
  return (
    <>
      <Seccion titulo="Para qué sirve">
        <P>
          Es la lista de normas que le aplican a esa empresa, con el estado de
          cumplimiento de cada una y —lo importante— <strong>la evidencia con la
          que se demuestra</strong>. Tiene dos capas: un catálogo de normas y la
          matriz de cada empresa, que se arma tomando del catálogo.
        </P>
        <Figura
          pasos={[
            'El *catálogo* trae 29 normas transversales del SG-SST colombiano, listas para usar.',
            'Tú puedes *crear* las normas de tu sector o *importar un Excel* completo.',
            'La *matriz* de la empresa toma del catálogo lo que le aplica.',
            'Cada requisito lleva su estado y su *evidencia*.',
          ]}
        >
          <Ventana titulo="panel / matriz-legal">
            <Titulo marca={3}>Matriz legal — Alimentos del Norte</Titulo>
            <Tabla
              columnas={['Norma', 'Requisito', 'Estado', 'Evidencia']}
              filas={[
                ['Res. 0312/2019', 'Autoevaluación anual', 'Cumple', 'Autoevaluación 2026 firmada'],
                ['Res. 2013/1986', 'COPASST conformado', 'Cumple', 'Acta de conformación 12-feb'],
                ['Res. 4272/2021', 'Permisos de alturas', 'No cumple', '—'],
              ]}
              marca={4}
            />
          </Ventana>
        </Figura>
      </Seccion>

      <Seccion titulo="Las tres reglas del módulo">
        <Regla titulo="«Cumple» exige escribir la evidencia">
          Una matriz que dice que cumple sin decir con qué se demuestra es lo
          primero que un auditor desarma. El sistema <strong>no deja guardar</strong>
          un requisito como cumplido con la evidencia en blanco.
        </Regla>
        <Regla titulo="Lo que no aplica se conserva marcado, no se borra">
          Mostrar que se analizó una norma y se descartó con una razón
          <strong> es parte de haber hecho la identificación</strong>. Si se
          borrara, el resultado se vería igual que si nunca se hubiera mirado.
        </Regla>
        <Regla titulo="Corregir el catálogo no cambia una matriz ya entregada">
          La matriz <strong>copia</strong> los datos de la norma en el momento de
          agregarla. Si después corriges el catálogo, las matrices que ya
          entregaste siguen diciendo lo que decían cuando se firmaron.
        </Regla>
        <Ojo>
          El catálogo del sistema es un <strong>punto de partida</strong>, no una
          lista cerrada: la matriz depende del sector, de la actividad y del nivel
          de riesgo de cada cliente. Revísala empresa por empresa.
        </Ojo>
      </Seccion>
    </>
  );
}

/* ================================================================ *
 *  Comités, vigía y brigada
 * ================================================================ */

function ManualComites() {
  return (
    <>
      <Seccion titulo="Para qué sirve">
        <P>
          Administra los tres cuerpos que exige la norma: <strong>COPASST o
          vigía</strong>, <strong>comité de convivencia</strong> y
          <strong> brigada de emergencia</strong>. Lo que aporta no es la lista de
          nombres sino el <strong>validador</strong>: el sistema calcula la
          composición que exige la norma según los trabajadores activos y te dice
          qué falta.
        </P>
        <Figura
          pasos={[
            'Eliges el *tipo* de comité; el sistema calcula lo que exige la norma para ese número de trabajadores.',
            'Agregas miembros desde el empleador o desde los trabajadores. La columna por la que entras *define a quién representa*.',
            'El *validador* dice si está conforme y qué falta exactamente.',
            'El *organigrama en PDF* se imprime y se publica en cartelera.',
          ]}
        >
          <Ventana titulo="panel / comites">
            <Titulo marca={1}>COPASST — periodo 2026-2028</Titulo>
            <Fila gap={8}>
              <Tarjeta titulo="Empleador" dato="2 / 2" pie="principales · suplentes" marca={2} />
              <Tarjeta titulo="Trabajadores" dato="1 / 2" pie="falta 1 suplente" color="var(--aviso)" />
            </Fila>
            <Fila gap={6}>
              <Estado texto="No conforme: falta 1 suplente de los trabajadores" tono="mal" />
            </Fila>
            <Fila justificar="flex-end" gap={6}>
              <Boton fantasma marca={4}>Organigrama PDF</Boton>
              <Boton>Agregar miembro</Boton>
            </Fila>
          </Ventana>
        </Figura>
      </Seccion>

      <Seccion titulo="Qué exige cada uno">
        <Tabla
          columnas={['Tipo', 'Composición', 'Periodo']}
          filas={[
            ['Vigía', 'Menos de 10 trabajadores', '—'],
            ['COPASST', '10-49: 1+1 · 50-499: 2+2 · 500-999: 3+3 · 1000+: 4+4, por cada parte', '2 años'],
            ['Convivencia', 'Menos de 20: 1+1 · 20 o más: 2+2, por cada parte', '2 años'],
            ['Brigada', 'La norma no fija número: conformar, capacitar y dotar según el riesgo', '1 año'],
          ]}
        />
        <Regla titulo="La brigada no se agrupa por parte sino por frente">
          En el COPASST y en convivencia cada miembro <em>representa</em> al
          empleador o a los trabajadores, porque son cuerpos paritarios. En la
          brigada nadie representa a nadie: se organiza por
          <strong> frente</strong> —primeros auxilios, control de incendios,
          evacuación y rescate— y el rol es jefe o brigadista.
        </Regla>
        <Regla titulo="Por qué la brigada no muestra incumplimientos de número">
          El Decreto 1072 no fija cuántos brigadistas ni exige paridad. Presentar
          un porcentaje del personal como <em>incumplimiento legal</em> sería
          inventar una exigencia que la norma no hace. Por eso lo que la norma
          obliga aparece como <strong>falla</strong> y el criterio técnico
          aparece como <strong>recomendación</strong>, separados.
        </Regla>
        <Ojo>
          Al <strong>retirar un empleado</strong> sale de sus comités pero no se
          borra: queda inactivo con su motivo. El acta de conformación que se
          firmó sigue nombrándolo, y borrarlo dejaría el acta sin respaldo.
        </Ojo>
      </Seccion>
    </>
  );
}

/* ================================================================ *
 *  Salud de los trabajadores
 * ================================================================ */

function ManualSalud() {
  return (
    <>
      <Seccion titulo="Para qué sirve">
        <P>
          Reúne tres cosas que alimentan los indicadores obligatorios:
          <strong> exámenes médicos</strong> (la aptitud de cada persona para su
          cargo), <strong>ausentismo</strong> (los días que se pierden) y
          <strong> horas-hombre</strong> (las horas trabajadas, que son el
          denominador de todos los indicadores del artículo 30).
        </P>
        <Figura
          pasos={[
            'El examen se registra con su *tipo*, su fecha, su vigencia y su *concepto de aptitud*.',
            'Las *restricciones*, si las hay, se escriben tal como las dictó el médico.',
            'El sistema avisa cuando la aptitud está por vencer.',
          ]}
        >
          <Ventana titulo="panel / examenes">
            <Titulo>Exámenes médicos</Titulo>
            <Fila gap={9}>
              <Campo etiqueta="Tipo" valor="Periódico" marca={1} />
              <Campo etiqueta="Fecha" valor="12/03/2026" />
              <Campo etiqueta="Vence" valor="12/03/2027" />
            </Fila>
            <Fila gap={9}>
              <Campo etiqueta="Concepto" valor="Apto con restricciones" marca={1} />
              <Campo etiqueta="Restricciones" valor="No manipular cargas > 15 kg" marca={2} />
            </Fila>
            <Fila gap={6}>
              <Estado texto="Vence en 22 días" tono="aviso" />
            </Fila>
          </Ventana>
        </Figura>
      </Seccion>

      <Seccion titulo="Lo que este módulo NO guarda">
        <Regla titulo="Aptitud y restricciones. Nunca diagnóstico">
          La historia clínica es <strong>reservada</strong> y la custodia el
          médico (Res. 2346 de 2007). El empleador tiene derecho a saber si la
          persona es apta para el cargo y qué no puede hacer; no a saber qué
          enfermedad tiene. Por eso <strong>no hay una casilla de diagnóstico</strong>,
          ni en los exámenes ni en las ausencias, y no debe agregarse.
        </Regla>
        <Ojo>
          Al <strong>retirar a un empleado</strong> el sistema pide el examen de
          egreso o una razón escrita de por qué no lo hay. Retirar a alguien sin
          examen de egreso es uno de los hallazgos más fáciles de encontrar en una
          visita.
        </Ojo>
      </Seccion>

      <Seccion titulo="Ausentismo">
        <P>
          Se registra el <strong>origen</strong> y los <strong>días</strong>. El
          sistema decide solo cuáles cuentan para el indicador: enfermedad
          general, enfermedad laboral, accidente de trabajo y accidente común
          cuentan; las licencias de ley y los permisos no.
        </P>
        <Regla titulo="Por qué no se pueden meter las licencias">
          Contarlas inflaría el indicador y lo volvería incomparable con el del
          sector: nadie las cuenta. Una licencia de maternidad no es ausentismo
          por salud, es un derecho.
        </Regla>
        <Ojo>
          El sistema <strong>rechaza dos ausencias que se solapen</strong> en la
          misma persona. Casi siempre es la misma incapacidad cargada dos veces, y
          duplicaría el indicador del año.
        </Ojo>
      </Seccion>

      <Seccion titulo="Horas-hombre">
        <P>
          Es una rejilla de doce meses. Un mes vacío no es lo mismo que un mes en
          cero: vacío significa que no se ha cargado.
        </P>
        <Regla titulo="Por qué un mes guardado queda bloqueado">
          Es el <strong>denominador de todos los indicadores del artículo 30</strong>.
          Un tropiezo con el teclado sobre una casilla ya guardada cambiaría la
          frecuencia y la severidad de todo el año sin que nadie lo note. Si hay
          que corregirlo, se desbloquea ese mes a propósito — que es exactamente
          la diferencia entre corregir y equivocarse.
        </Regla>
      </Seccion>
    </>
  );
}

/* ================================================================ *
 *  Emergencias
 * ================================================================ */

function ManualEmergencias() {
  return (
    <>
      <Seccion titulo="Análisis de amenazas">
        <P>
          Se hace por la <strong>metodología de colores</strong>. El sistema
          precarga catorce amenazas típicas <strong>sin calificar</strong>: la
          lista la propone él, la calificación la pones tú. Proponerte una
          calificación sería inventarte el análisis.
        </P>
        <Figura
          pasos={[
            'Cada amenaza se califica en tres aspectos: personas, recursos y sistemas.',
            'El número mide la *vulnerabilidad*, no el control: «Sí, existe» vale 0.0 y «No existe» vale 1.0.',
            'La suma se lee: 0.0-1.0 baja (verde) · 1.1-2.0 media (amarillo) · 2.1-3.0 alta (rojo).',
            'El *diamante* combina la amenaza con los tres aspectos y da el nivel de riesgo.',
          ]}
        >
          <Ventana titulo="panel / emergencias">
            <Titulo>Análisis de amenazas</Titulo>
            <Tabla
              columnas={['Amenaza', 'Personas', 'Recursos', 'Sistemas', 'Nivel']}
              filas={[
                ['Sismo', '1.5 Media', '2.3 Alta', '1.8 Media', 'Alto'],
                ['Incendio', '0.7 Baja', '1.2 Media', '0.9 Baja', 'Medio'],
                ['Inundación', '0.3 Baja', '0.5 Baja', '0.4 Baja', 'Bajo'],
              ]}
              marca={3}
            />
          </Ventana>
        </Figura>
        <Ojo>
          <strong>La escala se lee al revés de lo que uno espera.</strong> El
          número mide qué tan vulnerable estás, no qué tan bien estás: por eso
          «Sí, existe» puntúa 0.0. Si se invirtiera, el análisis pintaría de verde
          justo lo que está mal. La pantalla dice el valor de cada opción en voz
          alta precisamente por eso.
        </Ojo>
        <Regla titulo="Una amenaza sin calificar no cuenta como calificada">
          Las catorce amenazas sembradas quedan marcadas como <em>no
          evaluadas</em> hasta que alguien las califica. Si arrancaran con un
          valor por omisión, el análisis se vería hecho sin que nadie lo hubiera
          hecho.
        </Regla>
      </Seccion>

      <Seccion titulo="Simulacros">
        <P>
          El acta de simulacro es la evidencia del estándar: tener el plan de
          emergencias escrito no prueba que se haya probado. Se registra el
          <strong> tiempo de evacuación</strong> y la <strong>cobertura</strong>,
          que son los dos números que se comparan con el simulacro anterior.
        </P>
        <Figura
          pasos={[
            'Creas el simulacro y registras qué pasó: tiempo, participantes, dificultades.',
            'Agregas los *evaluadores* — suele haber uno de la ARL.',
            'Cada evaluador firma desde su propio enlace, sin tener que estar contigo.',
            'Con todas las firmas, el acta se cierra y sale en PDF.',
          ]}
        >
          <Flujo
            pasos={[
              { titulo: 'Registrar', detalle: 'Tiempo y cobertura' },
              { titulo: 'Evaluadores', detalle: 'Enlace a cada uno' },
              { titulo: 'Firmas', detalle: 'Todas, sin excepción' },
              { titulo: 'Acta PDF', detalle: 'Evidencia del estándar' },
            ]}
          />
        </Figura>
        <Regla titulo="Por qué el listado muestra tiempo y cobertura, no solo fechas">
          Una lista de fechas demuestra que se hicieron simulacros; no dice si la
          empresa <strong>mejoró</strong>. Ver «8:40 con 62 %» junto a «6:15 con
          88 %» del año anterior es la única forma de saberlo de un vistazo.
        </Regla>
      </Seccion>
    </>
  );
}

/* ================================================================ *
 *  Alto riesgo y contratistas
 * ================================================================ */

function ManualAltoRiesgo() {
  return (
    <>
      <Seccion titulo="Permisos de trabajo">
        <P>
          Un permiso <strong>no es un formato más: es una autorización que
          vence</strong>. Vale para una tarea y una franja horaria, y fuera de ahí
          no autoriza nada. Cubre trabajo en alturas, espacios confinados, trabajo
          en caliente y demás tareas de alto riesgo.
        </P>
        <Figura
          pasos={[
            'Al crear el permiso se *copia la lista de verificación* del tipo de tarea.',
            'Cada requisito se responde; los marcados *NORMA* son los que bloquean.',
            'Se agregan los *ejecutantes* y los roles que pide la tarea: alturas exige coordinador y vigía.',
            '*Autorizar* comprueba todo y pide las firmas. Solo entonces el permiso existe.',
          ]}
        >
          <Ventana titulo="panel / permisos">
            <Titulo>Permiso de trabajo en alturas</Titulo>
            <Fila gap={9}>
              <Campo etiqueta="Fecha" valor="14/09/2026" />
              <Campo etiqueta="Desde" valor="07:00" />
              <Campo etiqueta="Hasta" valor="12:00" />
            </Fila>
            <Fila gap={6}>
              <Estado texto="Autorizado — vigente hasta las 12:00" tono="ok" />
            </Fila>
            <Tabla
              columnas={['Ejecutante', 'Rol', 'Aptitud médica']}
              filas={[
                ['Carlos Ramírez', 'Ejecutante', 'Vigente hasta 03/2027'],
                ['Luis Peña', 'Vigía', 'Vigente hasta 11/2026'],
              ]}
              marca={3}
            />
          </Ventana>
        </Figura>
        <Regla titulo="El cruce con el examen médico es lo que aporta">
          Al autorizar, el sistema consulta los exámenes y comprueba que
          <strong> cada ejecutante tenga aptitud vigente</strong>. En papel esa
          comprobación depende de que el supervisor se acuerde, y el día que no se
          acuerda es el día del accidente.
        </Regla>
        <Ojo>
          Si a alguien le falta la aptitud, el permiso <strong>se puede autorizar
          dejando constancia escrita</strong> del motivo, y esa constancia sale
          impresa en el PDF. Prohibirlo del todo llevaría a trabajar sin permiso,
          que es peor que trabajar con un permiso que dice la verdad.
        </Ojo>
        <Ojo>
          El PDF grita la <strong>vigencia</strong> arriba del todo. Un permiso
          vencido pegado en la pared se parece muchísimo a uno vigente.
        </Ojo>
      </Seccion>

      <Seccion titulo="Contratistas">
        <P>
          En muchas empresas los contratistas son la mitad de la gente en planta.
          Lo que este módulo aporta no es la ficha del contratista sino que
          <strong> sus soportes vencen</strong>: una planilla de aportes de hace
          cuatro meses no prueba nada, y una afiliación verificada en enero puede
          estar cancelada hoy.
        </P>
        <Figura
          pasos={[
            'Al crear el contratista se copian los *12 requisitos*, 10 de ellos de norma.',
            'Cada requisito lleva su *fecha de vencimiento*.',
            'Lo vencido entra a la bandeja de pendientes.',
            'En *personal* se registra quién entra a planta, con su aptitud y su inducción.',
          ]}
        >
          <Ventana titulo="panel / contratistas">
            <Titulo>MANTENIMIENTOS DEL SUR SAS</Titulo>
            <Tabla
              columnas={['Requisito', 'Vence', 'Estado']}
              filas={[
                ['Planilla de aportes', '30/09/2026', 'Vigente'],
                ['Afiliación ARL', '15/08/2026', 'Vencido'],
                ['SG-SST propio', '01/2027', 'Vigente'],
              ]}
              marca={2}
            />
            <Fila gap={6}>
              <Estado texto="No se puede aprobar: 1 requisito de norma vencido" tono="mal" />
            </Fila>
          </Ventana>
        </Figura>
        <Regla titulo="No se aprueba con un requisito de norma pendiente">
          Si la evaluación se pudiera firmar con documentos faltantes, la firma no
          significaría nada. Queda la salida honesta —<strong>aprobado con
          condiciones</strong>— que obliga a escribir cuáles son.
        </Regla>
        <Ojo>
          Personal de contratista con <strong>examen vencido</strong> genera
          alerta crítica: está adentro, trabajando, sin aptitud vigente.
        </Ojo>
      </Seccion>
    </>
  );
}

/* ================================================================ *
 *  Autoevaluación e indicadores legales
 * ================================================================ */

function ManualAutoevaluacion() {
  return (
    <>
      <Seccion titulo="Autoevaluación de estándares mínimos">
        <P>
          Es la nota del SG-SST frente a la Resolución 0312. Se responde estándar
          por estándar y el sistema calcula el puntaje y el criterio —crítico,
          moderadamente aceptable o aceptable— <strong>al leer</strong>, nunca
          guardado, para que no quede una nota vieja pegada a una evaluación que
          ya cambió.
        </P>
        <Figura
          pasos={[
            'Los ciclos del PHVA vienen *colapsados*: se abre el que se está respondiendo.',
            'Cada respuesta se *autoguarda*; no hay botón de guardar que se pueda olvidar.',
            'El puntaje y el criterio se recalculan solos.',
            '*Generar plan de mejoramiento* convierte cada incumplimiento en una acción del plan.',
          ]}
        >
          <Ventana titulo="panel / autoevaluacion">
            <Titulo>Autoevaluación 2026</Titulo>
            <Fila gap={8}>
              <Tarjeta titulo="Puntaje" dato="78,5" pie="Moderadamente aceptable" color="var(--aviso)" marca={3} />
              <Tarjeta titulo="Estándares" dato="60" pie="52 respondidos" />
            </Fila>
            <Fila justificar="flex-end" gap={6}>
              <Boton fantasma>Informe PDF</Boton>
              <Boton marca={4}>Generar plan de mejoramiento</Boton>
            </Fila>
          </Ventana>
        </Figura>
        <Regla titulo="«No aplica» sin justificación se rechaza">
          Es lo que más puntos cuesta en una visita: un estándar marcado como no
          aplicable sin decir por qué se cuenta como incumplido. El sistema
          <strong> no deja guardarlo</strong> sin la justificación escrita.
        </Regla>
      </Seccion>

      <Seccion titulo="Conjuntos de estándares">
        <P>
          Las tablas de estándares —7, 21 o 60 según el tamaño y el riesgo de la
          empresa— vienen como <strong>conjuntos del sistema, de solo lectura</strong>.
          Para adaptarlos: <strong>duplicas</strong> y editas el nombre, la norma y
          cada fila; <strong>creas</strong> uno desde cero; o <strong>importas un
          Excel</strong>.
        </P>
        <Regla titulo="Por qué se entrega el método y no solo el contenido">
          Las tablas cambian cada vez que el Ministerio publica una resolución.
          Si vinieran fijas en el programa, cada cambio te dejaría esperando al
          programador. Con duplicar, editar e importar, la próxima resolución la
          cargas tú el mismo día que sale.
        </Regla>
        <Ojo>
          La importación desde Excel <strong>valida todas las filas antes de
          escribir</strong>: o entra el archivo entero o no entra nada, y el error
          te dice el número de fila. Nunca te deja medio conjunto cargado.
        </Ojo>
      </Seccion>

      <Seccion titulo="Los indicadores del artículo 30">
        <P>
          Son los <strong>seis que exige el Decreto 1072</strong>, no los propios
          de la aplicación: frecuencia, severidad y mortalidad de la
          accidentalidad, prevalencia e incidencia de la enfermedad laboral y
          ausentismo. Cada uno se muestra <strong>con su fórmula escrita al
          lado</strong>, para que cualquiera pueda comprobar el cálculo.
        </P>
        <Ojo>
          Todos se dividen entre las <strong>horas-hombre</strong> del periodo. Si
          faltan meses de horas cargadas, los indicadores del año salen mal — y no
          hay forma de que el sistema lo adivine.
        </Ojo>
      </Seccion>
    </>
  );
}

/* ================================================================ *
 *  Accidentes e investigación
 * ================================================================ */

function ManualEventos() {
  return (
    <>
      <Seccion titulo="Para qué sirve">
        <P>
          Registra accidentes, incidentes, casi-accidentes y enfermedades
          laborales, y los investiga según la <strong>Resolución 1401 de
          2007</strong>. Es el momento en que el SG-SST se pone a prueba: es
          también el papel que primero pide la ARL.
        </P>
        <Figura
          pasos={[
            'Se registra el evento con su fecha, su tipo y los días de incapacidad.',
            'El sistema calcula el *plazo de 15 días* de la investigación y lo muestra en cuenta regresiva.',
            'Se arma el *equipo investigador* y se registran testigos y causas.',
            'Cada integrante firma desde su enlace; sin todas las firmas no se cierra.',
            'De las causas se *generan acciones correctivas* directamente.',
          ]}
        >
          <Ventana titulo="panel / eventos">
            <Titulo>Accidente — 22/08/2026</Titulo>
            <Fila gap={6}>
              <Estado texto="Investigación: quedan 3 días" tono="aviso" />
            </Fila>
            <Tabla
              columnas={['Equipo investigador', 'Rol', 'Firma']}
              filas={[
                ['Iván Ocón', 'Profesional SST', 'Firmado'],
                ['Ana Torres', 'COPASST', 'Firmado'],
                ['Jorge Díaz', 'Jefe de área', 'Pendiente'],
              ]}
              marca={4}
            />
            <Fila justificar="flex-end" gap={6}>
              <Boton fantasma>Reenviar enlace</Boton>
              <Boton marca={5}>Generar acciones</Boton>
            </Fila>
          </Ventana>
        </Figura>
      </Seccion>

      <Seccion titulo="Por qué se comporta así">
        <Regla titulo="El plazo se calcula, no se recuerda">
          Los 15 días calendario corren desde el evento. El sistema los cuenta y
          los pone en la bandeja de pendientes como <strong>crítico</strong>: es
          el único plazo del SG-SST donde pasarse tiene consecuencia inmediata.
        </Regla>
        <Regla titulo="Cerrar exige todas las firmas del equipo">
          Una investigación es un acto colectivo. Si la pudiera cerrar una sola
          persona, el equipo investigador sería una lista de nombres en una hoja.
        </Regla>
        <Ojo>
          Las firmas del equipo <strong>se piden por enlace al correo</strong>. El
          jefe de área y el representante del COPASST casi nunca están en la
          oficina el día que se cierra la investigación.
        </Ojo>
      </Seccion>
    </>
  );
}

/* ================================================================ *
 *  Rendición de cuentas
 * ================================================================ */

function ManualRendicion() {
  return (
    <>
      <Seccion titulo="Para qué sirve">
        <P>
          La norma pide que quienes tienen responsabilidades en el SG-SST rindan
          cuentas <strong>anualmente y por escrito</strong>. Las dos cosas
          importan, y de ahí sale todo el diseño del módulo.
        </P>
        <Figura
          pasos={[
            'Tú armas el marco: alcance, logros, dificultades y compromisos del año.',
            'Asignas a cada responsable *lo que le correspondía*.',
            'Cada uno abre su enlace, *escribe su propio informe* y firma en la misma pantalla.',
            'Con todos escritos y firmados, el acta se cierra y sale en PDF, organizada por persona.',
          ]}
        >
          <Ventana titulo="panel / rendicion">
            <Titulo>Rendición de cuentas 2026</Titulo>
            <Tabla
              columnas={['Responsable', 'Informe', 'Firma']}
              filas={[
                ['Gerencia', 'Escrito', 'Firmado'],
                ['Jefe de producción', 'Escrito', 'Firmado'],
                ['COPASST', 'Pendiente', 'Pendiente'],
              ]}
              marca={3}
            />
            <Fila gap={6}>
              <Estado texto="No se puede cerrar: falta 1 informe" tono="mal" />
            </Fila>
          </Ventana>
        </Figura>
      </Seccion>

      <Seccion titulo="Por qué se comporta así">
        <Regla titulo="Cada quien escribe lo suyo">
          Es la única pantalla pública donde la persona <strong>escribe</strong>,
          no solo firma. Un acta donde los informes los redactó una sola persona y
          los demás firmaron al final no es una rendición de cuentas: es una lista
          de asistencia con párrafos.
        </Regla>
        <Regla titulo="Una por año">
          El sistema no deja crear dos rendiciones del mismo año para la misma
          empresa. La norma habla de una rendición anual, y dos actas del mismo año
          plantean la pregunta de cuál vale.
        </Regla>
        <Ojo>
          El PDF se organiza <strong>por persona</strong>, no por tema. Es lo que
          la norma pide demostrar: que cada responsable rindió cuentas de lo suyo.
        </Ojo>
      </Seccion>
    </>
  );
}

/* ================================================================ */

const CONTENIDOS: Record<string, () => React.ReactElement> = {
  ingreso: ManualIngreso,
  empresas: ManualEmpresas,
  empleados: ManualEmpleados,
  pendientes: ManualPendientes,
  firmas: ManualFirmas,
  peligros: ManualPeligros,
  'plan-anual': ManualPlanAnual,
  'matriz-legal': ManualMatrizLegal,
  comites: ManualComites,
  capacitaciones: ManualCapacitaciones,
  dotacion: ManualDotacion,
  salud: ManualSalud,
  emergencias: ManualEmergencias,
  'alto-riesgo': ManualAltoRiesgo,
  inspecciones: ManualInspecciones,
  autoevaluacion: ManualAutoevaluacion,
  eventos: ManualEventos,
  acciones: ManualAcciones,
  rendicion: ManualRendicion,
  reportes: ManualReportes,
  configuracion: ManualConfiguracion,
};

export function ContenidoManual({ id }: { id: string }) {
  const Cuerpo = CONTENIDOS[id];
  return Cuerpo ? <Cuerpo /> : null;
}

const c: Record<string, React.CSSProperties> = {
  seccion: { marginTop: 34 },
  h2: {
    fontSize: 17, fontWeight: 700, color: 'var(--texto)', margin: '0 0 10px',
    paddingBottom: 8, borderBottom: '1px solid var(--borde)',
  },
  // marginTop en vez de bottom: los márgenes adyacentes colapsan, así
  // que un párrafo tras una figura o una regla queda igual de separado
  // que tras un título, sin acumular espacios.
  p: { fontSize: 14, color: 'var(--texto-suave)', lineHeight: 1.7, margin: '16px 0 0' },
};
