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

export type FichaManual = {
  id: string;
  titulo: string;
  resumen: string;
  color: string;
  /** Pantallas del sistema que cubre, para orientar desde el índice. */
  cubre: string[];
};

export const MANUALES: FichaManual[] = [
  {
    id: 'ingreso',
    titulo: 'Ingreso y primeros pasos',
    resumen: 'Crear la cuenta, entrar, entender el menú y elegir sobre qué empresa trabajas.',
    color: '#14263F',
    cubre: ['Registro', 'Ingreso', 'Selector de empresa', 'Menú'],
  },
  {
    id: 'empresas',
    titulo: 'Cartera de empresas',
    resumen: 'Dar de alta las empresas que administras y su identidad documental.',
    color: '#1B5E4A',
    cubre: ['Cartera', 'Empresas', 'Nueva empresa'],
  },
  {
    id: 'empleados',
    titulo: 'Empleados',
    resumen: 'El personal de cada empresa: alta, retiro, reincorporación y expediente.',
    color: '#2A6F97',
    cubre: ['Empleados', 'Retirados', 'Expediente'],
  },
  {
    id: 'capacitaciones',
    titulo: 'Capacitaciones',
    resumen: 'Del acta en papel al registro firmado: convocar, tomar asistencia con QR, evaluar y emitir.',
    color: '#7A4E9B',
    cubre: ['Listado', 'Detalle', 'Registro público', 'Evaluaciones', 'Matriz'],
  },
  {
    id: 'dotacion',
    titulo: 'Dotación y equipos',
    resumen: 'Inventario, entregas con firma, devoluciones y control de vencimientos.',
    color: '#B45309',
    cubre: ['Inventario', 'Entregas', 'Devoluciones', 'Alertas', 'Matriz'],
  },
  {
    id: 'inspecciones',
    titulo: 'Inspecciones y auditorías',
    resumen: 'Listas de verificación, ejecución en planta desde el celular y veredicto.',
    color: '#0F766E',
    cubre: ['Inspecciones', 'Listas de verificación', 'Programadas'],
  },
  {
    id: 'acciones',
    titulo: 'Plan de acción',
    resumen: 'Convertir hallazgos en acciones con responsable, fecha y cierre verificado.',
    color: '#9B1C1C',
    cubre: ['Plan de acción'],
  },
  {
    id: 'reportes',
    titulo: 'Reportes, calendario e indicadores',
    resumen: 'Lo que se entrega a la ARL o al cliente: PDF, Excel y tableros.',
    color: '#4338CA',
    cubre: ['Reportes', 'Calendario', 'Indicadores', 'Matrices'],
  },
  {
    id: 'configuracion',
    titulo: 'Configuración y perfil',
    resumen: 'Encabezado de los documentos, tu firma, tu hoja de vida y tu contraseña.',
    color: '#5B6470',
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
        <Figura
          pasos={[
            '*Menú lateral:* eres tú. Agrupa los módulos por dominio — Capacitaciones, Dotación, Inspecciones — y no cambia al cambiar de empresa.',
            '*Selector de empresa:* es el contexto. Todo lo que crees se guarda contra la empresa que esté elegida aquí.',
            '*Manual y Salir:* el manual está siempre a un clic, en cualquier pantalla.',
            '*Área de trabajo:* el módulo que hayas abierto.',
          ]}
        >
          <Ventana titulo="panel">
            <Fila justificar="space-between">
              <Campo etiqueta="Empresa activa" valor="ALIMENTOS DEL NORTE SAS" marca={2} />
              <Fila gap={6}>
                <Boton fantasma marca={3}>Manual</Boton>
                <Boton fantasma>Salir</Boton>
              </Fila>
            </Fila>
            <Titulo marca={4}>Cartera</Titulo>
            <Fila gap={8}>
              <Tarjeta titulo="Empresas" dato="3" />
              <Tarjeta titulo="Empleados" dato="128" />
              <Tarjeta titulo="Capacitaciones" dato="17" />
            </Fila>
          </Ventana>
        </Figura>
        <Ojo>
          El color de la interfaz cambia con la empresa activa. Es deliberado:
          te dice en cuál estás trabajando sin que tengas que leer el nombre.
          Si el color no es el que esperas, revisa el selector antes de guardar.
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
              <Tarjeta titulo="AUTOSNACK SAS" dato="31" pie="empleados · próxima: 3 oct" color="#B45309" />
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
              border: '1px dashed #E4E4DF', borderRadius: 8, height: 46,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, color: '#5B6470',
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
            colorSi="#B45309"
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
            color="#B45309"
            pasos={[
              { titulo: 'Borrador', detalle: 'Empleado y elementos' },
              { titulo: 'Firma', detalle: 'En pantalla o remota' },
              { titulo: 'Descuento', detalle: 'Se mueve el inventario' },
              { titulo: 'Acta PDF', detalle: 'Documento firmado' },
            ]}
          />
        </Figura>
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
              <Tarjeta titulo="Por vencer" dato="7" color="#B45309" marca={1} />
              <Tarjeta titulo="Bajo mínimo" dato="3" color="#9B1C1C" marca={2} />
              <Tarjeta titulo="De retirados" dato="2" color="#5B6470" marca={3} />
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
              <Boton fantasma color="#1E6B3A" marca={1}>Cumple</Boton>
              <Boton fantasma color="#9B1C1C" marca={2}>No cumple</Boton>
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
            colorSi="#9B1C1C"
            colorNo="#1E6B3A"
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
            color="#9B1C1C"
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
            <div style={{ border: '1px solid #E4E4DF', borderRadius: 8, padding: 10 }}>
              <Fila gap={8}>
                <div style={{
                  width: 34, height: 26, border: '1px dashed #E4E4DF',
                  borderRadius: 4, fontSize: 8, color: '#5B6470',
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

/* ================================================================ */

const CONTENIDOS: Record<string, () => React.ReactElement> = {
  ingreso: ManualIngreso,
  empresas: ManualEmpresas,
  empleados: ManualEmpleados,
  capacitaciones: ManualCapacitaciones,
  dotacion: ManualDotacion,
  inspecciones: ManualInspecciones,
  acciones: ManualAcciones,
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
    fontSize: 17, fontWeight: 700, color: '#14263F', margin: '0 0 10px',
    paddingBottom: 8, borderBottom: '1px solid #E4E4DF',
  },
  // marginTop en vez de bottom: los márgenes adyacentes colapsan, así
  // que un párrafo tras una figura o una regla queda igual de separado
  // que tras un título, sin acumular espacios.
  p: { fontSize: 14, color: '#374151', lineHeight: 1.7, margin: '16px 0 0' },
};
