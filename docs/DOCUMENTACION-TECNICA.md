# Rúbrica — Documentación técnica

> Estado del sistema a **29 de agosto de 2026**. Describe lo que está
> implementado y verificado, no lo planeado. El plan está en
> [PLAN-DE-TRABAJO.md](PLAN-DE-TRABAJO.md); el contexto de trabajo para Claude Code,
> en [../CLAUDE.md](../CLAUDE.md).
>
> Levantada contra la base de datos y el código, no de memoria: los conteos de
> tablas, funciones, políticas y rutas salen de consultas al catálogo de Postgres
> y del árbol de archivos.

---

## 1. Qué es

Plataforma **SaaS multiempresa de HSEQ / SST**. Un consultor administra el SG-SST
de varias empresas cliente desde una sola cuenta.

El eje del producto es **capturar firmas que sirvan como prueba** ante una ARL o
una auditoría. Todo módulo termina en un documento firmado: acta de capacitación,
acta de entrega de dotación, acta de devolución, informe de inspección.

- **Autor:** Iván Ocón Barrios — IOB Soluciones (Bogotá, Colombia).
- **Repositorio:** `iobsoluciones/evidenciasdigitales`.
- **Producción:** `evidenciasdigitales.vercel.app`.
- **Idioma:** español en código, comentarios e interfaz.

---

## 2. Arquitectura

| Capa | Tecnología |
|---|---|
| Framework | Next.js 16.3 + Turbopack, App Router |
| Lenguaje | TypeScript, React (Server Components + Server Actions) |
| Base de datos | Supabase / PostgreSQL — proyecto `thqjfindzmifeepxuwhp`, `us-west-2` |
| Sesión | `@supabase/ssr`, cookies validadas en `middleware.ts` |
| Estilos | Inline (`Record<string, React.CSSProperties>`). Sin Tailwind ni CSS externo |
| PDF | `@react-pdf/renderer` |
| Excel | `xlsx` (SheetJS) |
| QR | `qrcode.react` |
| Correo | Resend |
| Despliegue | Vercel, automático desde `main` |

### Variables de entorno

Las seis viven en Vercel, nunca en el repositorio (`.gitignore` cubre `.env*`).

| Variable | Alcance | Uso |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Production + Preview | Cliente y servidor |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Production + Preview | Cliente y servidor |
| `NEXT_PUBLIC_APP_URL` | Production + Preview | Enlaces absolutos (QR, firma remota) |
| `RESEND_API_KEY` | Production + Preview | Envío de correo |
| `RESEND_FROM` | Production + Preview | Remitente |
| `SUPABASE_SERVICE_ROLE_KEY` | **Solo Production** | Registro directo. Secreta, solo servidor |

> Las `NEXT_PUBLIC_*` se incrustan **en el build**: al cambiarlas hay que redeployar.
>
> `SUPABASE_SERVICE_ROLE_KEY` no está en el alcance *Preview*: en despliegues de
> vista previa el registro directo responde con el aviso de variable ausente.
> Es una decisión consciente, no un olvido.

### Estructura del proyecto

`app/` y `lib/` están en la **raíz**, no bajo `src/`. `middleware.ts` también.

```
app/
  page.tsx            # portada pública de producto
  login/  registro/  registro/directo/  clave/
  r/[slug]/           # PÚBLICA — registro de asistencia (sin sesión)
  d/[token]/          # PÚBLICA — firma remota de entrega (sin sesión)
  f/[id]/             # PÚBLICA — firma del instructor por token
  panel/              # zona con sesión
  superadmin/
  api/                # 14 rutas de descarga (PDF y Excel)
lib/
  supabase/{servidor,cliente,admin}.ts
  sesion.ts  empresa-activa.ts  nomenclaturas.ts  tipos.ts
  acciones-*.ts       # 29 archivos 'use server', uno por dominio
  pdf/                # 7 documentos + generadores
  excel/              # 3 generadores
```

**Convención de páginas:** cada pantalla del panel es una *página servidor*
(`page.tsx`, hace el fetch) más un *componente cliente* (`Vista*.tsx` /
`Formulario*.tsx`). La página pasa props ya resueltas.

**Volumen actual:** 52 páginas, 14 rutas de API, 63 componentes cliente,
29 archivos de Server Actions, 33 tablas, ~110 funciones de base, 15 triggers.

---

## 3. Modelo de seguridad

Es la parte del sistema donde se invirtió primero, y la que sostiene todo lo demás.

### 3.1 `org_id` es la única frontera

Toda tabla lleva `org_id` y toda política filtra por `org_id = public.mi_org_id()`.
`empresa_id` es **contexto de trabajo, no de seguridad**: define sobre qué cliente
se opera (cookie `empresa_activa`), pero no aísla nada.

Consecuencia práctica: no hace falta filtrar por `org_id` en las consultas de la
aplicación. Un `select * from organizaciones` devuelve solo la del usuario.

`mi_org_id()` es `SECURITY DEFINER` y solo tiene `execute` para `authenticated`.

### 3.2 RLS y GRANT son capas independientes

Ambas deben concederse. Una tabla con RLS correcto pero sin `grant` a
`authenticated` falla igual, y el error no dice cuál de las dos falta.

**Estado real de las políticas** (33 tablas, todas con RLS habilitado):

| Políticas | Tablas |
|---|---|
| 4 (select/insert/update/delete) | 24 tablas — el patrón estándar |
| 5 | `empresas` |
| 3 | `convocados`, `participantes`, `perfil_profesional`, `perfiles` |
| 2 | `organizaciones`, `envios` |
| 1 | `planes` (solo lectura), `respuestas` |

Las de menos de cuatro son deliberadas: `planes` es un catálogo de solo lectura,
`organizaciones` no se borra desde la aplicación.

### 3.3 Acceso público sin sesión

Tres flujos operan sin usuario autenticado: el registro de asistencia
(`/r/[slug]`), la firma remota de una entrega (`/d/[token]`) y la firma del
instructor (`/f/[id]`).

El rol `anon` **nunca toca tablas directamente**. Solo ejecuta funciones
`SECURITY DEFINER` acotadas, con `grant execute … to anon`:

`capacitacion_activa_publica` · `verificar_empleado` ·
`registrar_asistencia_con_evaluacion` · `evaluacion_publica` · `reintentar_evaluacion` ·
`entrega_publica` · `entrega_por_token` · `firmar_entrega_publica` ·
`capacitacion_para_firma` · `firmar_como_instructor` · `catalogos_publicos`

### 3.4 Funciones deliberadamente cerradas

Revocadas de `PUBLIC` y `anon` porque revelarían datos de otras cuentas o
permitirían escalar privilegios:

| Función | Por qué |
|---|---|
| `slug_empresa_libre`, `sugerir_slug_empresa` | Revelarían nombres de empresas de otros consultores |
| `crear_organizacion_directa` | Solo `service_role`; con `anon` permitiría vincular una organización a un usuario ajeno |
| `marcar_clave_cambiada` | Solo `authenticated` |
| `nomenclatura_doc` | Solo `authenticated` y `service_role` |
| `siguiente_codigo_devolucion` | Solo la llama el trigger |

### 3.5 Clave de servicio

`lib/supabase/admin.ts` crea un cliente con `SUPABASE_SERVICE_ROLE_KEY` que
**salta RLS por completo**. Solo puede importarse desde Server Actions o Route
Handlers. Importarlo desde un componente `'use client'` filtraría la clave al
navegador.

Un único caso de uso hoy: crear la cuenta en el registro directo.

### 3.6 Storage

| Bucket | Visibilidad | Contenido |
|---|---|---|
| `logos` | Público | Logos de empresa, fotos de artículos, fotos de hallazgos |
| `firmas` | **Privado** | Se lee con `createSignedUrl` (120 s) |

**El primer segmento de toda ruta debe ser `org_id`** — lo exige la política de
lectura. Para las subidas anónimas (firma remota, registro público) hay políticas
específicas para `anon`.

---

## 4. Modelo de datos

33 tablas. Agrupadas por dominio:

### Salud y accidentalidad (Fase 1)

| Tabla | Contenido |
|---|---|
| `horas_hombre` | Horas, promedio de trabajadores y días programados por empresa y mes. Denominador de los indicadores del art. 30 |
| `eventos` | Accidentes, incidentes, casi accidentes y enfermedades laborales. El hecho |
| `evento_investigacion` | El análisis: metodología, causas inmediatas y básicas, conclusiones |
| `evento_equipo` | Quién investiga, con correo, token de firma remota y firma |
| `evento_testigos` | Testigos y su versión |
| `examenes_medicos` | Concepto de aptitud y restricciones. **Nunca el diagnóstico** |
| `ausencias` | Origen y días de cada ausencia. **Nunca el diagnóstico.** `dias` y `causa_medica` son columnas generadas; `evento_id` la enlaza con el accidente ya investigado |

### Planeación y verificación (Fase 2)

| Tabla | Contenido |
|---|---|
| `peligros` | Matriz GTC 45. `np`, `nr`, `nivel` y aceptabilidad son **columnas generadas**: se calculan en la base, así que dos pantallas no pueden discrepar |
| `peligro_controles` | Enlaza un peligro con el artículo, la capacitación o la plantilla de inspección que lo controla. Es lo que permite justificar *por qué ese EPP* |
| `plan_anual` | Plan anual de trabajo. `estado` borrador/aprobado, firma del empleador |
| `plan_actividades` | `meses_programados` y `meses_ejecutados` como `int[]`: el cronograma es el documento |
| `estandar_conjuntos` | Conjuntos de estándares. **`org_id NULL` = del sistema**, de solo lectura por RLS |
| `estandar_items` | Las filas de cada conjunto: código, ciclo, capítulo, nombre, peso |
| `autoevaluaciones` | Una por año y empresa, sobre un conjunto copiado |
| `autoevaluacion_items` | Resultado por estándar, con justificación del «no aplica» |

### Comités (Fase 3)

| Tabla | Contenido |
|---|---|
| `comites` | `tipo` = copasst \| vigia \| convivencia \| **brigada**. Periodo, acta, estado |
| `comite_miembros` | Empleado o persona externa; `parte`, `suplente`, `rol`, **`frente`** (solo brigada), foto, `activo` y `motivo_salida` |

### Emergencias (Fase 3.2)

| Tabla | Contenido |
|---|---|
| `emergencia_amenazas` | Análisis por metodología de colores. `v_personas`, `v_recursos`, `v_sistemas`, `rombos_rojos`, `rombos_amarillos` y `nivel_riesgo` son **columnas generadas**. `evaluada` distingue lo sembrado de lo calificado |
| `simulacros` | Fecha, tipo, alcance, punto de encuentro, participantes, evacuados y **tiempo de evacuación en segundos**; aciertos y oportunidades de mejora. Control documental completo |
| `simulacro_evaluadores` | Quién firma el acta: nombre, cargo, correo, rol, `token_firma`, `firma_url` |

### Alto riesgo (Fase 3.3)

| Tabla | Contenido |
|---|---|
| `permisos_trabajo` | Tipo de tarea, fecha y **franja horaria**, lugar, descripción, ejecutor propio o contratista, estado (borrador/autorizado/cerrado/cancelado) y la constancia por falta de aptitud. La vigencia **no se guarda**: se deriva al leer |
| `permiso_requisitos` | La lista de verificación **copiada** al crear el permiso. `obligatorio` separa lo que exige la norma de lo que es criterio técnico |
| `permiso_participantes` | Quién autoriza, ejecuta, vigila o coordina; con el resultado del cruce de aptitud **congelado al autorizar** y su `token_firma` |

### Matriz legal (Fase 3.4)

| Tabla | Contenido |
|---|---|
| `norma_catalogo` | Catálogo reutilizable de normas. **`org_id NULL` = del sistema**, de solo lectura por RLS; el resto es del consultor. 29 normas base precargadas |
| `rendiciones` | Acta anual, una por empresa y año (restricción única). Marco del periodo y control documental |
| `rendicion_responsables` | Quién rinde cuentas: responsabilidades asignadas por el consultor e **informe escrito por la propia persona**, con su `token_firma` |
| `matriz_legal` | La matriz de cada empresa: **copia** de la norma más `aplica`, `cumplimiento`, **`evidencia`**, responsable y fecha de verificación. `norma_id` queda como enlace blando al catálogo |

### Núcleo

| Tabla | Contenido |
|---|---|
| `organizaciones` | La cuenta del consultor: estado, plan, `fecha_expiracion` (licencia) |
| `planes` | Capacidades por plan: `encabezado_personalizable`, límites |
| `empresas` | Los clientes. `slug` **único global**, color, nomenclatura, `campos_encabezado`, `encabezado_config`, `nomenclaturas`, declaración de dotación |
| `usuarios` | Perfil ligado a `auth.users`. `rol`, `super_admin`, `debe_cambiar_clave` |
| `perfil_profesional` | Ficha del consultor: firma guardada, licencia SST, formación, experiencia |
| `empleados` | Personal de cada empresa. `fecha_retiro` no nula = retirado |
| `catalogos` | Listas configurables (áreas, cargos, ciudades) |
| `agenda` | Anotaciones del calendario |
| `envios` | Historial de correos enviados |

### Capacitaciones

`capacitaciones` (30 columnas) · `participantes` · `convocados` · `evaluaciones` ·
`preguntas` · `opciones` · `respuestas` · `plantillas_capacitacion` ·
`plantillas_evaluacion` · `plantilla_preguntas` · `plantilla_opciones`

### Dotación

`articulos` · `articulo_unidades` · `articulo_movimientos` ·
`articulo_mantenimientos` · `entregas` · `entrega_items`

### Inspecciones

`inspeccion_plantillas` · `inspeccion_items` · `inspecciones` ·
`inspeccion_respuestas` · `inspeccion_programaciones` · `acciones_correctivas`

### Columnas de control documental

`capacitaciones`, `entregas` e `inspecciones` llevan las mismas cuatro:
`codigo`, `nomenclatura`, `version_doc`, `titulo_doc`, más `campos_encabezado`
y `encabezado_config` (jsonb). Se congelan al emitir (§6.1).

`entrega_items` lleva el juego equivalente para la devolución:
`devolucion_codigo`, `devolucion_nomenclatura`, `devolucion_version`,
`devolucion_encabezado_config`.

---

## 5. Funciones de base

~110 funciones. Las relevantes por dominio:

**Núcleo** — `mi_org_id`, `soy_admin`, `soy_superadmin`, `mi_perfil`,
`puede_crear_empresa`, `puede_crear_capacitacion`, `crear_organizacion`,
`crear_organizacion_directa`, `marcar_clave_cambiada`, `slug_empresa_libre`,
`sugerir_slug_empresa`, `resumen_empresas`, `nomenclatura_doc`

**Códigos** — `siguiente_codigo` (capacitaciones), `siguiente_codigo_articulo`,
`siguiente_codigo_entrega`, `siguiente_codigo_inspeccion`,
`siguiente_codigo_accion`, `siguiente_codigo_devolucion`

> Todos usan `max(número) + 1` sobre los códigos existentes, **no una secuencia**.
> Consecuencia: un código no se «gasta» si la creación falla, y probar la creación
> real no consume numeración.

**Capacitaciones** — `activar_capacitacion` (copia la firma del responsable),
`empleados_con_participacion`, `empleados_para_convocar`, `convocar_empleados`,
`aplicar_plantilla_evaluacion`, `estadisticas_evaluacion`, `matriz_capacitaciones`,
`reporte_capacitacion`, `reporte_global`, `calendario`, `trayectoria_profesional`

**Dotación** — `catalogo_articulos`, `registrar_ingreso`, `articulos_entregables_edicion`,
`crear_entrega`, `actualizar_entrega`, `firmar_entrega`, `firmar_entrega_publica`,
`detalle_entrega`, `listar_entregas`, `items_por_devolver`, `devolver_item`,
`historial_devoluciones`, `detalle_devolucion`, `matriz_dotacion`,
`kardex_dotacion`, `alertas_dotacion`, `expediente_empleado`, `ficha_articulo`

**Inspecciones** — `sembrar_plantillas_inspeccion`, `crear_plantilla_inspeccion`,
`guardar_items_inspeccion`, `duplicar_plantilla_inspeccion`,
`detalle_plantilla_inspeccion`, `listar_plantillas_inspeccion`, `crear_inspeccion`,
`guardar_respuesta_inspeccion`, `cerrar_inspeccion`, `detalle_inspeccion`,
`listar_inspecciones`, `programar_inspeccion`, `listar_programaciones`,
`cumplir_programacion`, `intervalo_periodicidad`

**Plan de acción e indicadores** — `crear_accion`, `generar_acciones_inspeccion`,
`actualizar_accion`, `eliminar_accion`, `listar_acciones`, `indicadores_inspecciones`

### Triggers (15)

| Tabla | Trigger | Qué hace |
|---|---|---|
| `capacitaciones` | `trg_nomenclatura_capacitacion` | Estampa nomenclatura al pasar a `activa`/`cerrada` |
| `entregas` | `trg_nomenclatura_entrega` | Estampa nomenclatura al pasar a `firmada` |
| `inspecciones` | `trg_nomenclatura_inspeccion` | Estampa nomenclatura al pasar a `cerrada` |
| `entrega_items` | `trg_nomenclatura_devolucion` | Asigna código `DEV26-xxx`, nomenclatura y encabezado al devolver |
| `capacitaciones`, `participantes` | `trg_normalizar_*` | Normaliza texto a mayúsculas |
| `empleados`, `agenda`, `catalogos`, `evaluaciones`, `preguntas`, `opciones` | `trg_norm_*` | Normalización |
| `participantes` | `trg_primer_intento` | Marca el primer intento de evaluación |
| `capacitaciones`, `organizaciones` | `trg_upd_*` | `updated_at` |

---

## 6. Reglas de negocio implementadas

Las decisiones que no son evidentes leyendo el código, con su porqué.

### 6.1 Se congela al EMITIR, nunca al crear

Un borrador no es un documento. El membrete, la nomenclatura, la versión, los
criterios, la declaración y la firma del responsable se **copian** al registro
en el momento en que el documento se emite —cerrar, firmar, activar—, no al
crear el registro.

- `resolverEncabezado(congelado, vigenteEmpresa, emitido)` devuelve el congelado
  **solo si ya se emitió**; mientras sea borrador, lo vigente de la empresa.
- `resolverNomenclatura(...)` aplica la misma regla.
- La escritura la hacen los cuatro triggers de la §5.

**Por qué en triggers y no dentro de cada función:** un documento se emite por
varios caminos (`firmar_entrega` y `firmar_entrega_publica`; activar y cerrar una
capacitación). Un trigger garantiza que la identificación quede igual por todos,
incluido cualquier camino que se agregue después.

### 6.2 Nomenclatura por tipo de documento

`empresas.nomenclaturas` (jsonb) guarda nomenclatura y versión para cinco tipos:
`capacitacion`, `entrega`, `devolucion`, `inspeccion`, `reporte`. Cada formato del
SG-SST tiene su propio código de control documental y avanza de versión a su ritmo.

Lo que falte cae en `empresas.nomenclatura` / `version_doc`, el par antiguo, que
se conserva como respaldo.

### 6.3 Borrador → firma

El inventario se descuenta y las unidades se asignan **solo al firmar**, nunca al
crear el borrador. Si se descontara al armarlo, cualquier borrador abandonado
dejaría faltantes fantasma en el stock.

El stock se calcula de `articulo_movimientos`; **no existe como columna**.

### 6.4 Veredicto de inspección

- Un **ítem crítico incumplido reprueba la inspección completa**, sin importar el
  puntaje. El veredicto no es el porcentaje.
- **Lo marcado «no aplica» sale del denominador.** Contarlo como incumplido
  castigaría a quien no tenía nada que cumplir ahí.

### 6.5 Capacitaciones

- Estados: **`activa` / `inactiva`**. En el listado se resalta solo la siguiente
  a la fecha actual.
- **Una sola activa por empresa**, no por organización: el enlace público resuelve
  por `empresa_slug` y con dos activas no sabría dónde registrar al asistente.
- Convocatoria y evaluación quedan desactivadas si no se marcaron al crear.
- **Eliminar** solo desde *Editar*, y solo si no hay registros de asistencia **ni
  ninguna firma**: una firma sin registros significa que la sesión sí se ejecutó.

### 6.6 Estados derivados en lectura

Una acción «vencida» se calcula al listar
(`fecha_limite < current_date and estado <> 'cerrada'`), no se persiste. Nunca
queda un estado obsoleto en la base.

### 6.7 Slug público único a nivel global

`/r/[slug]` resuelve sin sesión y no tiene contexto de quién pregunta. Si dos
empresas se llamaran `capacitaciones` no habría forma de distinguirlas.

### 6.8 Prefijos de código

`C26-xxx` capacitaciones · `D26-xxx` entregas · `DEV26-xxx` devoluciones ·
`INS26-xxx` inspecciones · `EPP-26-xxx` / `EQ-26-xxx` artículos.

La devolución usa `DEV` y no `D` a propósito: con la misma letra convivirían dos
códigos indistinguibles en la misma acta.

---

## 7. Generación documental

### PDF (`@react-pdf/renderer`)

| Documento | Componente | Ruta |
|---|---|---|
| Acta de asistencia | `DocumentoAsistencia` | `/api/pdf/[id]` |
| Acta de entrega | `ActaEntrega` | `/api/pdf-entrega/[id]` |
| Acta de devolución | `ActaDevolucion` | `/api/pdf-devolucion/[id]` |
| Informe de inspección | `InformeInspeccion` | `/api/pdf-inspeccion/[id]` |
| Informe de evaluación | `InformeEvaluacion` | `/api/pdf-evaluacion/[id]` |
| Cronograma | `Cronograma` | `/api/pdf-cronograma/[empresaId]` |
| Reporte ejecutivo | `ReporteEjecutivo` | `/api/pdf-ejecutivo/[empresaId]` |
| Hoja de vida | `HojaDeVida` | `/api/pdf-perfil` |
| Informe de investigación | `InformeInvestigacion` | `/api/pdf-investigacion/[id]` |
| Organigrama del comité | `Organigrama` | `/api/pdf-organigrama/[id]` |
| Autoevaluación | `InformeAutoevaluacion` | `/api/pdf-autoevaluacion/[id]` |
| Análisis de amenazas | `AnalisisAmenazas` | `/api/pdf-amenazas/[empresaId]` |
| Acta de simulacro | `ActaSimulacro` | `/api/pdf-simulacro/[id]` |
| Permiso de alto riesgo | `PermisoTrabajo` | `/api/pdf-permiso/[id]` |
| Matriz legal | `MatrizLegal` | `/api/pdf-matriz-legal/[empresaId]` |
| Rendición de cuentas | `ActaRendicion` | `/api/pdf-rendicion/[id]` |

**`EncabezadoDoc`** es el encabezado único de todos: tres plantillas
(`linea` / `tabla` / `lateral`), posición del logo y qué datos se muestran. Se
habilita con `planes.encabezado_personalizable`; el plan básico usa el estándar.
El código del documento no va en el encabezado — ya aparece en el pie.

> **Dos trampas de react-pdf**, ambas silenciosas:
> 1. Un estilo inexistente (`s.filaTabla`) se **ignora sin error**: el render
>    «pasa» con el estilo perdido. Solo `tsc` lo detecta.
> 2. Las fuentes estándar usan codificación **WinAnsi**. Un carácter fuera de ese
>    juego —la flecha `→` (U+2192)— **no se dibuja y no avisa**. El bullet `•`
>    (U+2022) sí está y funciona.
> 3. react-pdf **parte palabras con guion** cuando no caben en la columna, y
>    produce «CARLOS RAMÍREZ TOR-RES» en un organigrama. Se desactiva con
>    `Font.registerHyphenationCallback((p) => [p])`, puesto en `EncabezadoDoc`
>    porque todos los documentos pasan por ahí.

El **organigrama** y la **autoevaluación** se envían además por correo con el PDF
adjunto (`enviarOrganigrama`, `enviarAutoevaluacion`), según la regla de firma y
soporte del §5.21 de CLAUDE.md.

### Excel (SheetJS)

| Libro | Ruta | Hojas |
|---|---|---|
| Kardex de dotación | `/api/kardex` | Tabla cronológica única con autofiltro |
| Inspecciones | `/api/excel/inspecciones` | Inspecciones · Hallazgos · Plan de acción |
| Matriz de capacitaciones | `/api/excel/matriz-capacitaciones` | Rejilla · Detalle |
| Matriz de dotación | `/api/excel/matriz-dotacion` | Rejilla · Detalle · Equipos |

**Regla:** un Excel de matriz lleva siempre una **hoja plana** junto a la rejilla.
La rejilla es un dibujo; la tabla larga es lo que se puede filtrar, cruzar y llevar
a dinámica. Por lo mismo el kardex es una sola tabla cronológica con `!autofilter`
y `!freeze`: nada de filas separadoras ni títulos intercalados.

Estados reales de la matriz de dotación:
`vigente | por_vencer | vencido | sin_vencimiento | nunca`.

---

## 8. Autenticación

### Dos métodos de registro

1. **Por correo** (`/registro`) — `signUp` + `crear_organizacion`. Es el definitivo.
2. **Directo, TEMPORAL** (`/registro/directo`) — el servidor crea la cuenta ya
   confirmada con la clave de servicio y **genera la contraseña**, que se muestra
   una sola vez en pantalla.

**Por qué existe el segundo:** el proyecto tiene `mailer_autoconfirm = false`
(confirmación de correo activada) y usa el SMTP compartido de Supabase, limitado a
unos pocos mensajes por hora y con alta probabilidad de caer en spam. Quien se
registra por correo puede quedarse esperando un mensaje que no llega.

Se descartó apagar la confirmación en el proyecto: habría dejado sin verificación
**también** al método por correo.

**Para retirarlo** cuando haya dominio y cuenta de envío: borrar
`lib/acciones-registro.ts`, `app/registro/directo/` y el enlace en `/registro`.
La columna y las funciones de base pueden quedarse sin estorbar.

### Cambio obligatorio de contraseña

Las cuentas del registro directo nacen con `usuarios.debe_cambiar_clave = true`.
El layout del panel redirige a `/clave` mientras la marca siga puesta. La pantalla
vive **fuera de `/panel`** a propósito, para que el bloqueo no se pueda esquivar
navegando a otra ruta.

`/clave` no pide la contraseña actual: el usuario acaba de usarla para entrar y la
sesión que sostiene la pantalla es la prueba. En cambio, el cambio voluntario desde
*Perfil* **sí la exige**: tener la sesión abierta no prueba quién está frente al
equipo, y un portátil sin bloquear no debería bastar para quedarse con la cuenta.

---

## 9. Interfaz

- **Estilos inline**, nunca Tailwind ni CSS externo. Paleta base: azul `#14263F`,
  texto secundario `#5B6470`, bordes `#E4E4DF`. El acento sale de
  `empresa.color_primario`, que además tiñe la interfaz para recordar en qué
  empresa se está trabajando.
- **`key={entity.id}`** en componentes con estado, para forzar remount al cambiar
  de entidad.
- **Responsive:** bajo 900 px el menú lateral se convierte en cajón sobre el
  contenido, abierto desde un botón de la barra superior. El botón solo emite un
  evento (`rubrica:menu`); quien abre y cierra es el menú, para no subir estado a
  un layout que es Server Component.
- **Manual de uso** en `/panel/manual`: nueve submanuales con figuras dibujadas
  (`Figuras.tsx`), no capturas. Una captura envejece con el primer cambio de estilo.

---

## 10. Estado de verificación

Qué está comprobado y cómo. Importa porque `next.config` tiene
`typescript.ignoreBuildErrors: true`: **`npm run build` no valida tipos**.

| Área | Estado |
|---|---|
| Tipos | `npx tsc --noEmit` en **0 errores** |
| Build | `npm run build` correcto |
| Triggers de nomenclatura | **Probados contra la base** con transacciones que revierten, en los cuatro casos |
| `crear_entrega` / `crear_inspeccion` parcheadas | Probadas con llamada real y datos reales |
| Acta de devolución | **Renderizada de verdad**, con datos completos y con todos los opcionales nulos |
| Registro directo | Formulario, validación y Server Action probados de extremo a extremo. Clave de servicio **confirmada en producción** |
| Manual | Los nueve submanuales renderizados en navegador |
| Menú móvil y barra superior | Verificados a 375 px |
| Descargas `/api/excel/*` | **No probadas con sesión real.** Compilan y la forma de los datos está validada contra la base |

### Método de prueba en base

Bloque `DO $$ … RAISE EXCEPTION $$` que revierte la transacción, y después
comprobar que no quedaron restos. Permite ejecutar la función real con datos
reales sin ensuciar la base del usuario.

Para parchear funciones SQL largas: `pg_get_functiondef` + `replace` + `execute`,
con una excepción si el texto a reemplazar no aparece. Evita transcribir miles de
caracteres a mano, que es como se han perdido versiones antes.

---

## 11. Deuda técnica conocida

| Punto | Detalle |
|---|---|
| `ignoreBuildErrors: true` | El build oculta errores de tipo. Hay que correr `tsc` aparte. Varios fallos visibles en producción (`"undefined%"` en un KPI, la licencia SST que no salía) estaban ahí |
| Tabla `perfiles` | 17 columnas, 3 políticas, **sin una sola referencia en el código**. Probable resto de un renombrado a `perfil_profesional`. Verificar y eliminar |
| Funciones duplicadas | `calendario` / `datos_calendario`; `convocar_empleados` / `guardar_convocatoria`; `articulos_entregables` / `articulos_entregables_edicion`; `registrar_asistencia` / `registrar_asistencia_con_evaluacion`; `entrega_publica` / `entrega_por_token`. Confirmar cuál usa el código y retirar la otra |
| `detalle_entrega`, `firmar_entrega` | Tienen `grant` a `anon` pero **no** son `SECURITY DEFINER`: RLS bloquea las filas, así que el grant no sirve para nada. Es superficie innecesaria |
| Navegación duplicada | Dos pantallas de «Indicadores» y dos de «Matriz»; dos bancos de plantillas en sitios distintos; «Empleados» dentro de Capacitaciones siendo transversal |
| **Resend en modo de pruebas** | `RESEND_FROM = onboarding@resend.dev`, el remitente sandbox: la API acepta el envío pero **solo entrega al correo dueño de la cuenta** (`iobsoluciones@gmail.com`); cualquier otro destinatario se rechaza con 403. Es el mismo bloqueo que motivó el registro sin correo. Se sale verificando un dominio propio en Resend y poniendo `RESEND_FROM` con ese dominio |
| Notificaciones | Recordatorios de inspecciones programadas y aviso a responsables de acciones: **sin implementar**. Requiere decidir si se agrega `correo` a `empleados` |
| Clave de servicio en Preview | No está en ese alcance; el registro directo no funciona en despliegues de vista previa |
| Carpeta del proyecto | Se llama `evidenciasdigitales`; la marca es **Rúbrica** |

---

## 11b. Bugs de producción encontrados (agosto de 2026)

Los dos primeros llevaban meses en producción sin que nadie los notara, porque el
flujo que rompían —la firma remota de entregas— nunca se había ejecutado entero.

| Bug | Causa | Arreglo |
|---|---|---|
| `generar_token_entrega` fallaba: «`gen_random_bytes` does not exist» | pgcrypto vive en el esquema `extensions`, y las funciones fijan `search_path = 'public'` | Calificar el esquema: `extensions.gen_random_bytes`. **No** ensanchar el `search_path`, que abriría superficie |
| `/d/[token]` redirigía a `/login` | Faltaba `/d` en `RUTAS_PUBLICAS` del middleware | Añadido. Lección: un flujo público se rompe en varios sitios a la vez |
| El enlace de firma salía sin dominio | `NEXT_PUBLIC_APP_URL` se incrusta en el build y no estaba en `.env.local` | `lib/url-base.ts` lo reconstruye de las cabeceras de la petición |
| Los correos «se enviaban» y no llegaban | `RESEND_FROM = onboarding@resend.dev` es el remitente de prueba: la API acepta y solo entrega al dueño de la cuenta | Se detecta el modo prueba y se muestra el enlace copiable siempre. **Pendiente verificar un dominio en Resend** |
| `guardarEquipo` borraba e insertaba de nuevo todo el equipo investigador | Habría destruido firmas capturadas e invalidado enlaces ya enviados | Actualiza por id, inserta lo nuevo, borra solo lo quitado |

## 12. Protocolo de verificación pre-entrega

Seis comprobaciones antes de dar por terminado cualquier cambio. Nacieron de
errores reales y costosos:

1. No hay `export const/let/var/function` en archivos `'use server'` (solo exports
   async; los `export type` se borran al compilar y sí valen).
2. Los imports coinciden con los exports del archivo destino.
3. Las props que pasa la página coinciden con las que declara el componente.
4. Las rutas relativas resuelven a archivos existentes.
5. Paréntesis y llaves balanceados en el JSX.
6. **`npx tsc --noEmit` sin errores nuevos.**

Además:

- **PDF:** renderizar de verdad antes de entregar, y verificar que los estilos
  usados existen en la hoja del documento.
- **Funciones de base:** probar la llamada real con datos; después comprobar que
  no quedaron restos.
- **No dar por buena una conclusión sacada solo del código** cuando hay un dato
  observable que la contradice.
