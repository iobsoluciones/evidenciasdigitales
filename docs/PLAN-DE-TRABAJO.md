# Rúbrica — Plan de trabajo

> Deriva de la evaluación técnica del **29 de agosto de 2026**, hecha contra la
> Resolución 0312 de 2019 y el Decreto 1072 de 2015.
> Estado del sistema: [DOCUMENTACION-TECNICA.md](DOCUMENTACION-TECNICA.md).

---

## Diagnóstico en una frase

**Rúbrica es hoy un sistema de evidencias, no un sistema de gestión.** Cubre el
*Hacer* del ciclo PHVA con calidad por encima del mercado y deja casi vacíos el
*Planear* y el *Verificar*, que son las dos cosas que un auditor revisa primero.

Aporta evidencia directa para aproximadamente **12 de los 60 estándares mínimos**.

## Criterio de priorización

El orden **no es por dificultad técnica sino por dependencia y exposición legal**.

- Los indicadores del artículo 30 no se pueden calcular sin registro de accidentes.
- La matriz de peligros no rinde hasta que existan los módulos que va a enlazar
  — y ya existen.
- Todo lo de la Fase 3 es barato porque reutiliza el motor de firmas y actas.

## Regla de admisión

> **Cada módulo nuevo debe terminar en un documento firmado o en un dato que
> alimente un indicador obligatorio.** Si no hace ninguna de las dos cosas, no entra.

Es el filtro que ha mantenido coherente lo construido hasta ahora y el que evita
que la aplicación se convierta en un ERP.

---

# FASE 0 — Antes de escribir código

Decisiones y limpieza que condicionan todo lo demás. Ninguna toma más de una sesión.

### 0.1 Decisiones pendientes de Iván

| # | Decisión | Por qué bloquea |
|---|---|---|
| 1 | ¿Se agrega `correo` a `empleados`? | Bloquea notificaciones **y** el aviso a responsables de acciones e investigaciones |
| 2 | ¿B2B de solo consulta con el enfoque C? | Toca `mi_org_id()`, que es la frontera de seguridad. No se decide a mitad de otra fase |
| 3 | ¿La app guarda solo el concepto de aptitud médica, nunca el diagnóstico? | Define el modelo de datos de exámenes médicos y la exposición frente a la reserva de la historia clínica |
| 4 | ¿Se cobra por empresa o por plan con límite de empresas? | Define si `planes` gana columnas ahora o después |

### 0.2 Limpieza previa

- [ ] Verificar y eliminar la tabla **`perfiles`** (sin referencias en el código).
- [ ] Resolver las **funciones duplicadas** listadas en la documentación técnica.
- [ ] Quitar el `grant … to anon` de `detalle_entrega` y `firmar_entrega`.
- [ ] Añadir `SUPABASE_SERVICE_ROLE_KEY` al alcance *Preview* en Vercel, o dejar
      constancia de que se decidió no hacerlo.

### 0.3 Reorganización de navegación

Se hace **antes** de agregar módulos, no después: añadir nueve módulos a un menú
que ya tiene duplicados produce un producto que nadie usa.

- [ ] Unificar las dos pantallas de **Indicadores** en una con pestañas.
- [ ] Unificar las dos pantallas de **Matriz** en una con pestañas.
- [ ] Unificar los dos bancos de plantillas (capacitación e inspección).
- [ ] Subir **Empleados** al primer nivel del menú: es transversal.
- [ ] Reagrupar el menú por **PHVA**:

| Fase | Agrupa |
|---|---|
| PLANEAR | Matriz de peligros · Plan anual · Matriz legal · Objetivos |
| HACER | Capacitaciones · Dotación · Exámenes médicos · Emergencias · Permisos |
| VERIFICAR | Inspecciones · Indicadores · Autoevaluación |
| ACTUAR | Plan de acción · Investigación de accidentes · Plan de mejoramiento |

> El beneficio no es estético: **hace evidente lo que falta**. Un menú donde
> «Planear» tiene un solo ítem le dice al consultor y al cliente dónde está débil
> el sistema, sin que nadie se lo explique.

---

# FASE 1 — Cerrar la exposición legal

**Objetivo:** que el consultor no tenga que salirse de Rúbrica en el peor momento.
Hoy, cuando ocurre un accidente —cuando el SG-SST se pone a prueba— vuelve a Word.

## Paso 1.1 · Horas-hombre trabajadas

Es el paso más pequeño y desbloquea seis indicadores obligatorios. Va primero
porque no depende de nada.

**Base**

- [ ] Tabla `horas_hombre` — `org_id`, `empresa_id`, `anio`, `mes`,
      `horas` (numeric), `trabajadores` (int), `created_at`.
      Único por `(empresa_id, anio, mes)`.
- [ ] RLS + 4 políticas con `org_id = mi_org_id()` + `grant` a `authenticated`.
- [ ] `guardar_horas_hombre(p_empresa, p_anio, p_mes, p_horas, p_trabajadores)`
      con *upsert*.
- [ ] `horas_hombre_periodo(p_empresa, p_desde, p_hasta)` → total del rango.

**Aplicación**

- [ ] `lib/acciones-horas.ts`.
- [ ] Pantalla simple: rejilla de 12 meses del año, editable en línea.
      Se llega desde Indicadores, no desde el menú principal.

**Criterio de aceptación:** cargar 12 meses y que el total del año cuadre.

---

## Paso 1.2 · Registro e investigación de accidentes

El módulo más importante de toda la ruta.
<sub>Resolución 1401 de 2007 · Decreto 1072 art. 2.2.4.6.32 · Resolución 156 de 2005</sub>

### Modelo

- [ ] Tabla **`eventos`** — el hecho:
  `org_id`, `empresa_id`, `codigo` (`AT26-xxx`), `empleado_id`, `tipo`
  (`accidente` | `incidente` | `casi_accidente` | `enfermedad`), `fecha_evento`,
  `fecha_reporte`, `lugar`, `descripcion`, `parte_cuerpo`, `mecanismo`,
  `dias_incapacidad`, `grave` (bool), `mortal` (bool), `reportado_arl` (bool),
  `fecha_reporte_arl`, `estado` (`abierto` | `en_investigacion` | `cerrado`),
  más las cuatro columnas de control documental y `encabezado_config`.

- [ ] Tabla **`evento_investigacion`** — el análisis:
  `evento_id`, `metodologia` (`5_porques` | `arbol_causas` | `espina_pescado`),
  `causas_inmediatas` (jsonb), `causas_basicas` (jsonb), `conclusiones`,
  `fecha_cierre`, firmas.

- [ ] Tabla **`evento_equipo`** — quién investiga:
  `evento_id`, `nombre`, `rol` (`responsable_sst` | `copasst` | `jefe_inmediato` | `otro`),
  `firma_url`.
  <sub>La norma exige responsable con licencia + representante del COPASST.</sub>

- [ ] Tabla **`evento_testigos`** — `evento_id`, `nombre`, `identificacion`, `version`.

- [ ] RLS + 4 políticas + `grant` en las cuatro tablas.

### Funciones

- [ ] `siguiente_codigo_evento(p_empresa)` → `AT26-001`.
- [ ] `crear_evento(...)` — devuelve id y código.
- [ ] `guardar_investigacion(...)`.
- [ ] `cerrar_investigacion(p_evento, firmas…)` — valida que haya al menos una
      causa básica y un miembro del equipo con rol `responsable_sst`.
- [ ] `detalle_evento(p_evento)` — fuente única para pantalla y PDF.
- [ ] `listar_eventos(p_empresa)` — incluye **días restantes** del plazo de 15 días,
      derivado en lectura (§6.6 de la doc técnica).
- [ ] Trigger `trg_nomenclatura_evento` sobre `eventos`, con el tipo
      `investigacion` en `empresas.nomenclaturas`.

### Integración con lo que ya existe

- [ ] Al cerrar la investigación, **generar acciones correctivas** desde las causas
      básicas, reutilizando `crear_accion` y el plan de acción actual.
- [ ] `expediente_empleado` suma un bloque de eventos.
- [ ] `acciones_correctivas` gana `evento_id` (hoy solo enlaza a inspecciones).

### Interfaz

- [ ] `/panel/eventos` — listado con **reloj de 15 días** visible y semáforo:
      verde >7 días, ámbar 3–7, rojo <3 o vencido.
- [ ] `/panel/eventos/nuevo` — reporte rápido: lo mínimo para dejar constancia
      inmediata. **Separado de la investigación**, que se hace después.
- [ ] `/panel/eventos/[id]` — investigación por pasos, patrón móvil de inspecciones.
- [ ] Recordatorio visible del plazo de **2 días hábiles** para reportar a ARL y EPS.

### Documento

- [ ] `lib/pdf/InformeInvestigacion.tsx` + generador + `/api/pdf-investigacion/[id]`.
      Usa `EncabezadoDoc` y el mismo lienzo de firma.

**Criterio de aceptación:** registrar un accidente ficticio, investigarlo, cerrarlo
con firmas, comprobar que genera acciones en el plan y que el PDF renderiza de
verdad —con datos completos y con los opcionales nulos—. Después, limpiar.

---

## Paso 1.3 · Exámenes médicos ocupacionales

<sub>Resolución 2346 de 2007 · Estándares 3.1.2 – 3.1.6</sub>

> **Reserva de la historia clínica:** la app guarda el **concepto de aptitud** y
> las **recomendaciones/restricciones**. Nunca el diagnóstico. La historia clínica
> la custodia el médico, no el consultor. (Decisión 0.1.3.)

### Modelo

- [ ] Tabla **`examenes_medicos`** — `org_id`, `empresa_id`, `empleado_id`,
      `tipo` (`ingreso` | `periodico` | `retiro` | `post_incapacidad` | `reubicacion`),
      `fecha`, `fecha_vence`, `entidad`, `medico`, `licencia_medico`,
      `concepto` (`apto` | `apto_con_restricciones` | `no_apto` | `aplazado`),
      `restricciones` (text), `recomendaciones` (text), `soporte_url`.
- [ ] RLS + 4 políticas + `grant`.

### Funciones

- [ ] `guardar_examen(...)`, `listar_examenes(p_empresa)`,
      `examenes_empleado(p_empleado)`.
- [ ] **Extender `alertas_dotacion`** o crear `alertas_examenes(p_empresa, p_dias)`:
      el motor de alertas ya sabe avisar por vencimiento; un examen es el mismo
      problema con otra fecha.

### Regla dura

- [ ] **Al marcar el retiro de un empleado, exigir el examen de egreso.**
      Hoy la app permite retirar sin él, y ese examen es la principal defensa del
      empleador ante una reclamación por enfermedad laboral posterior a la
      desvinculación. Es un hallazgo esperando.
      Con opción de registrar «el trabajador no asistió», que también es evidencia.

### Interfaz

- [ ] Bloque de exámenes en el **expediente del empleado**, que ya cruza formación
      y dotación.
- [ ] Alertas de vencimiento en la misma pantalla que las de dotación.
- [ ] Las **restricciones activas** deben ser visibles al convocar a una
      capacitación o al entregar dotación: es la información que evita reubicar mal.

**Criterio de aceptación:** cargar los tres tipos de examen, ver la alerta de
vencimiento y comprobar que el retiro queda bloqueado sin examen de egreso.

---

## Paso 1.4 · Indicadores mínimos del artículo 30

<sub>Resolución 0312 de 2019, art. 30. Depende de 1.1, 1.2 y 1.3.</sub>

Los seis, con la fórmula oficial:

| Indicador | Fórmula |
|---|---|
| Frecuencia de accidentalidad | (N.º AT en el mes ÷ N.º trabajadores en el mes) × 100 |
| Severidad de accidentalidad | (N.º días de incapacidad + días cargados ÷ N.º trabajadores) × 100 |
| Proporción de AT mortales | (N.º AT mortales en el año ÷ Total AT en el año) × 100 |
| Prevalencia de enfermedad laboral | (N.º casos nuevos y antiguos EL ÷ Promedio de trabajadores) × 100 000 |
| Incidencia de enfermedad laboral | (N.º casos nuevos EL ÷ Promedio de trabajadores) × 100 000 |
| Ausentismo por causa médica | (N.º días de ausencia por incapacidad ÷ N.º días programados) × 100 |

- [ ] `indicadores_legales(p_empresa, p_anio)` — devuelve los seis, mensual y anual.
- [ ] Pantalla dentro de Indicadores unificados, con **la fórmula visible** junto a
      cada resultado: un auditor pregunta cómo se calculó.
- [ ] Exportable a Excel, hoja plana.
- [ ] Registrar días de incapacidad y días programados (deriva de `horas_hombre`).

**Criterio de aceptación:** con datos de prueba, verificar cada fórmula a mano.

---

## Cierre de la Fase 1

- [ ] `npx tsc --noEmit` en 0 y `npm run build` correcto.
- [ ] Cada función de base probada con llamada real y transacción que revierte.
- [ ] El PDF de investigación renderizado de verdad.
- [ ] Manual de uso: submanual nuevo de **Eventos y accidentes**, y ampliación del
      de Empleados con exámenes médicos.
- [ ] `CLAUDE.md` y esta documentación actualizados.
- [ ] Un commit por cambio verificado, con push.

---

# FASE 2 — Dar columna vertebral al sistema

Aquí los módulos sueltos se vuelven un sistema de gestión.

## 2.1 · Matriz de identificación de peligros (IPEVR)
<sub>Estándar 4.1.2 · GTC 45</sub>

- Tablas `peligros` y `peligro_controles`.
- Valoración estándar: **ND × NE = NP**, **NP × NC = NR**, nivel I–IV y
  aceptabilidad.
- **Lo importante no es la matriz, son los enlaces.** Cada peligro se conecta con
  los controles que ya existen: al abrirlo se ve *«requiere estos 3 EPP, esta
  capacitación, esta inspección trimestral»*, con semáforo de qué está al día.
- Eso convierte cinco módulos sueltos en un sistema, y permite responderle al
  auditor **por qué** se entrega ese EPP y no otro.

## 2.2 · Autoevaluación de estándares mínimos
<sub>Resolución 0312, art. 27</sub>

- La lista de verificación **ya está cargada** como plantilla de inspección.
  Falta el paso final: puntaje oficial con sus tres bandas
  (**crítico** <60 · **moderadamente aceptable** 60–85 · **aceptable** >85) y el
  **plan de mejoramiento** derivado.
- Selección de 7 / 21 / 60 estándares según tamaño y clase de riesgo.

## 2.3 · Plan anual de trabajo
<sub>Estándar 2.4.1</sub>

- Objetivos, metas, responsables, recursos, cronograma y **firma del empleador**.
- Se alimenta del cronograma y el calendario que ya existen.
- Es el primer documento que pide cualquier auditor.

## 2.4 · Bandeja de pendientes y semáforo

- **La portada del panel deja de ser un directorio de empresas.** Un consultor no
  abre la app para ver sus empresas —ya sabe cuáles son—, la abre para saber qué
  tiene que hacer hoy.
- *3 inspecciones vencidas · 2 exámenes vencen esta semana · 5 acciones atrasadas ·
  1 accidente sin investigar, faltan 4 días.* Con severidad por color y cada línea
  llevando a su pantalla.
- Es información que la app **ya calcula**; solo está repartida en seis sitios.
- **Semáforo de cumplimiento** permanente por empresa: el % de la autoevaluación.
  Es el número que el gerente entiende sin formación en SST y el que el consultor
  usa para justificar su contrato.

---

# FASE 3 — Completar los estándares restantes

Barata en esfuerzo: casi todo reutiliza el motor de firmas y actas.

| # | Módulo | Norma | Nota |
|---|---|---|---|
| 3.1 | **COPASST / Vigía y Comité de Convivencia** | Res. 2013/1986 · Res. 652/2012 · Est. 1.1.6, 1.1.8 | Conformación, votación, cronograma y actas firmadas. Es el vacío **más barato** de cerrar: un acta con firmas es exactamente lo que la app ya sabe hacer |
| 3.2 | **Plan de emergencias, brigada y simulacros** | Est. 5.1.1, 5.1.2 · Dec. 1072 art. 2.2.4.6.25 | Las inspecciones de extintores, botiquines, camillas y rutas **ya existen**: hay que enlazarlas a este estándar en vez de dejarlas sueltas |
| 3.3 | **Permisos de trabajo de alto riesgo** | Res. 4272/2021 · Res. 491/2020 | Alturas, espacios confinados, trabajo en caliente, bloqueo de energías. Es el caso de uso **más móvil** del SG-SST: se diligencia de pie y se firma. La pantalla de ejecución de inspecciones ya es ese patrón |
| 3.4 | **Matriz legal** | Est. 2.7.1 | Precargada por sector: además de cumplir, es argumento comercial — llega hecha |
| 3.5 | **Contratistas** | Est. 2.6.1 | Hoy `empleados` son de la empresa; no hay forma de registrar personal tercerizado ni exigirle afiliación y EPP. En muchas empresas medianas es la mitad de la gente en planta |
| 3.6 | **Ausentismo** | Art. 30 | Alimenta el sexto indicador |
| 3.7 | **Notificaciones por correo** | — | Depende de la decisión 0.1.1 y de tener dominio propio |
| 3.8 | **Rendición de cuentas** | Est. 2.8.1 | Acta anual firmada |

---

## Riesgos del plan

| Riesgo | Mitigación |
|---|---|
| Crecer el menú más rápido que la claridad | La Fase 0.3 va **antes** que cualquier módulo nuevo |
| Guardar diagnósticos médicos | Solo concepto de aptitud y restricciones. Decidido en 0.1.3 |
| La matriz de peligros se vuelve un formulario que nadie llena | Se construye **después** de los módulos que enlaza, para que aporte valor desde el primer peligro cargado |
| Fórmulas de indicadores mal implementadas | Verificación a mano contra el texto del art. 30, con la fórmula visible en pantalla |
| Perder la sencillez | La regla de admisión: documento firmado o indicador obligatorio |

## Definición de «terminado»

Un módulo está terminado cuando cumple las **seis comprobaciones** de la
documentación técnica §12, su PDF —si lo tiene— se renderizó de verdad, sus
funciones de base se probaron con datos reales y se limpiaron, el manual de uso
lo cubre, y hay un commit con push.
