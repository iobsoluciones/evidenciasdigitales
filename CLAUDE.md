# Rúbrica — Contexto del proyecto

> Documento de referencia para Claude Code. Describe el estado del proyecto, sus decisiones de arquitectura y sus convenciones. **Léelo completo antes de tocar código.**
>
> Documentación de apoyo en `docs/`:
> - **[docs/DOCUMENTACION-TECNICA.md](docs/DOCUMENTACION-TECNICA.md)** — inventario completo de lo implementado (33 tablas, ~110 funciones, 15 triggers, 52 páginas), modelo de seguridad, estado de verificación y deuda técnica.
> - **[docs/PLAN-DE-TRABAJO.md](docs/PLAN-DE-TRABAJO.md)** — ruta de trabajo por fases derivada de la evaluación contra la Res. 0312. **Consúltalo antes de proponer funcionalidad nueva.**

---

## 1. Nombre y propósito

**Rúbrica** (nombre anterior de la carpeta: `asistencia`).

Plataforma **SaaS multiempresa de HSEQ / SST** (Seguridad y Salud en el Trabajo) que un consultor usa para administrar el SG-SST de varias empresas cliente. La construye **Iván Ocón Barrios — IOB Soluciones** (Bogotá, Colombia).

- **Bajada:** "Evidencia firmada para el SG-SST".
- **Idea central:** todo el producto gira en torno a **capturar firmas que sirvan como prueba** ante una ARL o una auditoría: actas de capacitación, entregas de dotación, informes de inspección.
- **Idioma:** todo en español (código comentado en español, UI en español).
- **Nota:** Iván no tenía experiencia previa en Next.js, por lo que la disciplina de contratos import/export y el manejo de nulos son áreas de riesgo históricas (ver §6 y §8).

---

## 2. Tecnologías

| Capa | Tecnología |
|---|---|
| Framework | **Next.js 16.3 + Turbopack**, App Router |
| Lenguaje | TypeScript, React (Server Components + Server Actions) |
| Backend / BD | **Supabase** — proyecto `thqjfindzmifeepxuwhp`, región `us-west-2` |
| Auth / sesión | `@supabase/ssr` (sesión por cookies, validada en middleware) |
| Estilos | **Inline styles** — objeto `const e/s/est: Record<string, React.CSSProperties>`. **No hay Tailwind.** |
| PDF | `@react-pdf/renderer` |
| Excel | `xlsx` (SheetJS) |
| QR | `qrcode.react` |
| Correo | **Resend** |
| Despliegue | **Vercel**, desde GitHub |

### Variables de entorno (declarar en Vercel, no viven en el repo)

`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_APP_URL`, `RESEND_API_KEY`, `RESEND_FROM`, **`SUPABASE_SERVICE_ROLE_KEY`** (secreta, solo servidor — la usan el registro directo y el cron), **`CRON_SECRET`** (secreta — sin ella el cron de recordatorios se niega a correr).

> Las `NEXT_PUBLIC_*` se incrustan **en el build**: si se agregan o cambian en Vercel, hay que **redeployar**.

---

## 3. Estructura de archivos

**`app/` y `lib/` están en la RAÍZ del proyecto, no bajo `src/`.** `middleware.ts` también en la raíz.

```
app/
  layout.tsx, page.tsx, login/, LienzoFirma.tsx     # captura de firma (Canvas → Base64)
  panel/                                            # zona con sesión (consultor)
    layout.tsx, MenuLateral.tsx
    empresas/                 # CRUD de empresas cliente + selector
    empleados/[id]/expediente/# expediente que cruza formación + dotación + equipos
    empleados/retirados/      # auditoría de retirados + reincorporación
    capacitaciones/           # listado, creación, evaluación, indicadores, matriz
    dotacion/                 # inventario EPP+equipos unificado
      [id]/                   # ficha de artículo + carga masiva de unidades
      entregas/[id]/          # entregas con firma + acta PDF
      devoluciones/, alertas/, matriz/
    inspecciones/             # módulo de inspecciones y auditorías
      plantillas/[id]/        # banco de listas + editor de criterios
      [id]/                   # ejecución (un criterio por pantalla) + veredicto
      nueva/, indicadores/
      programadas/            # fase 8: programación y vencimientos
    acciones/                 # plan de acción (acciones correctivas)
    calendario/, reportes/, configuracion/, perfil/
    manual/[modulo]/          # manual de uso gráfico (9 submanuales)
  clave/                      # cambio obligatorio de clave del registro directo
  registro/, registro/directo/# alta por correo y alta temporal sin correo
  r/[slug]/                   # PÚBLICA: registro de asistencia a capacitación (sin sesión)
  d/[token]/                  # PÚBLICA: firma remota de una entrega (sin sesión)
  api/
    pdf-*/                    # actas, informes, cronograma, ejecutivo, hoja de vida
    kardex/                   # exporta kardex Excel
    excel/                    # inspecciones, matriz-capacitaciones, matriz-dotacion

docs/                         # DOCUMENTACION-TECNICA.md · PLAN-DE-TRABAJO.md

lib/
  supabase/servidor.ts        # createServerClient (cookies). Uno nuevo por petición.
  supabase/admin.ts           # clave de servicio: SALTA RLS. Solo servidor (§5.20)
  supabase/cliente.ts         # createBrowserClient
  sesion.ts                   # obtenerPerfil()
  empresa-activa.ts           # empresaActiva(), listarEmpresas(), COOKIE_EMPRESA, tipo Empresa
  acciones-empresas.ts        # 'use server' — CRUD empresas + seleccionarEmpresa
  acciones-*.ts               # 'use server' — una por dominio (entregas, unidades, expediente,
                              #   inspecciones, ejecutar-inspeccion, plan, indicadores…)
  graficos.tsx                # BarrasHorizontales, Columnas, Panel (gráficos con divs)
  pdf/                        # ActaEntrega, ActaDevolucion, InformeInspeccion, DocumentoAsistencia,
                              #   Cronograma, HojaDeVida, ReporteEjecutivo + generadores
    EncabezadoDoc.tsx         # encabezado ÚNICO de los 6 PDFs (3 plantillas)
    resolverEncabezado.ts     # decide congelado vs. vigente (ver §5.14)
  excel/                      # generarKardex, generarInspecciones, generarMatrices
```

### Convención de páginas
Cada pantalla del panel es **página servidor** (`page.tsx`, hace el fetch) + **componente cliente** (`Vista*.tsx` / `Formulario*.tsx`, `'use client'`). La página pasa props ya resueltas al componente.

---

## 4. Funcionalidades implementadas

### Núcleo multiempresa
- **`organizaciones`** = la cuenta del consultor. **`empresas`** = los clientes que administra.
- `org_id` es la **única frontera de RLS**; `empresa_id` es el contexto de trabajo (se elige con el selector, guardado en la cookie `empresa_activa`).
- Empresa demo: **ALIMENTOS DEL NORTE SAS** (slug `alimentos-del-norte`, NIT 901.234.567-8, color `#1B5E4A`). Superadmin: `iobsoluciones@gmail.com`.

### Empresas
CRUD, configuración documental (nomenclatura, versión, campos de encabezado), logo, declaración de dotación, exportación. Selector de empresa activa. **Slug validado como único a nivel global** al crear/editar (ver §5.15).

### Nomenclatura por tipo de documento
`empresas.nomenclaturas` (jsonb) guarda **nomenclatura + versión por tipo**: `capacitacion`,
`entrega`, `devolucion`, `inspeccion`, `reporte`. Cada formato del SG-SST tiene su propio código
de control documental y avanza de versión a su ritmo. Se edita en *Configuración → Nomenclatura
por documento*; lo que falte cae en `empresas.nomenclatura` / `version_doc` (el par antiguo, que
se conserva como respaldo). La lee `nomenclatura_doc(empresa, tipo)`.

**Congelado al emitir por triggers**, no dentro de cada función: `estampar_nomenclatura` sobre
capacitaciones (a `activa`/`cerrada`), entregas (a `firmada`) e inspecciones (a `cerrada`), y
`estampar_devolucion` sobre `entrega_items` (cuando `fecha_devolucion` deja de ser null). Va en
triggers porque un documento se emite por varios caminos —`firmar_entrega` y
`firmar_entrega_publica`, activar y cerrar— y la identificación debe quedar igual por todos.
La devolución además estrena código propio (`DEV26-001`, prefijo distinto del `D26-xxx` de las
entregas) vía `siguiente_codigo_devolucion`.

### Diseño de encabezado por empresa (según plan)
`empresas.encabezado_config` (jsonb) define **plantilla** (`linea` / `tabla` / `lateral`), posición del logo y qué datos se muestran (NIT, dirección). Lo consume `EncabezadoDoc` en los 6 PDFs. Se habilita con `planes.encabezado_personalizable`: el plan básico usa el estándar. El código del documento **no va en el encabezado** (ya aparece en el pie).

### Empleados
Alta/edición con **validación de documento duplicado**; retiro con `fecha_retiro`; **panel de retirados** para auditoría, con reincorporación. Los listados y la convocatoria filtran activos (`empleados_con_participacion(p_activos)`), agrupan por área y tienen buscador.

### Capacitaciones (completo)
Capacitaciones con participantes; **evaluaciones** con banco de preguntas y subtemas (consolida falencias por subtema); **registro público de asistencia** en `/r/[slug]` con QR (el QR y el enlace viven en el **listado**, no en el detalle); validación contra base de empleados; PDF de acta; indicadores; matriz de capacitaciones por empleado.

Reglas propias del módulo:
- Estados **`activa` / `inactiva`** — no hay "cerrada" ni "programada". En el listado se **resalta solo la siguiente** a la fecha actual.
- **Una sola capacitación activa por empresa** (no por organización), porque el enlace público resuelve por `empresa_slug`.
- Convocatoria y evaluación quedan **desactivadas** si no se marcaron al crear.
- **Eliminar** solo desde *Editar*, y solo si no tiene registros de asistencia **ni ninguna firma** (una firma sin registros significa que sí se ejecutó).

### Dotación — EPP + equipos unificados (completo)
Un solo módulo porque el documento de entrega es idéntico. Discriminador `articulos.tipo`:
- `consumible` (EPP): control por cantidad, vence, se repone.
- `retornable` (equipos): control por unidad con serial/placa, se devuelve.

Incluye: catálogo con foto, ingreso, **entregas con firma + acta PDF**, **firma remota** (`/d/[token]`), **devoluciones** por elemento, con **acta en PDF** propia (`detalle_devolucion`, código `DEV26-xxx`, compara estado de entrega vs. devolución y enlaza con el acta de entrega de origen), **alertas** (por vencer / bajo mínimo / de retirados / garantías), **matriz de dotación** (vigencia por empleado × artículo), **kardex Excel** con saldo corrido, **carga masiva de unidades** desde Excel, y **expediente del empleado** (cruza formación + EPP + equipos con un veredicto "Al día / Requiere atención").

### Inspecciones y auditorías (fases 1–8; falta solo la notificación por correo)
- **Banco de plantillas** (listas de verificación) reutilizables entre empresas. **11 plantillas precargadas** (Extintores NTC 2885, Botiquines Res. 0705/2007, Camillas, Orden y aseo, Señalización NTC 1461, Rutas de evacuación, Arnés/alturas Res. 4272/2021, Escaleras ANSI A14, Herramienta eléctrica, EPP en uso, Estándares mínimos SG-SST Res. 0312/2019) = **121 criterios, 59 críticos**. Editables; se pueden duplicar y adaptar. Vista lista/tarjetas.
- **Ejecución**: un criterio por pantalla (pensado para el celular en planta), hallazgo + foto solo al marcar "no cumple", cierre con firmas.
- **Veredicto**: puntaje (excluye "no aplica") + `cumple` (un crítico incumplido reprueba, sin importar el puntaje).
- **Informe PDF** con membrete, veredicto, detalle por sección, evidencia fotográfica y firmas.
- **Plan de acción** (`acciones_correctivas`): genera acciones desde los hallazgos, con responsable/fecha/severidad; cerrar exige quién verificó.
- **Indicadores**: cumplimiento por tipo, tendencia mensual, **hallazgos recurrentes**, objetos con más hallazgos, estado del plan.
- **Programación (fase 8)**: `inspeccion_programaciones` con frecuencia y próxima fecha; al ejecutar una inspección se llama `cumplir_programacion`, que corre la fecha. Los vencimientos se muestran en pantalla; **la notificación por correo está pendiente**.
- **Plan de acción agrupado por inspección** en la vista de acciones.

### Accidentalidad e investigación (fase 1)
`eventos` (accidente / incidente / casi-accidente / enfermedad laboral) con investigación
según la **Res. 1401 de 2007**: plazo de 15 días calculado al leer, equipo investigador,
testigos, causas, y generación de acciones correctivas desde las causas. Informe en PDF.
**Las firmas del equipo se piden por enlace al correo** (`/i/[token]`) — ver §5.21.
Cerrar una investigación exige que **todas** las firmas del equipo estén capturadas.

### Horas-hombre y exámenes médicos (fase 1)
- `horas_hombre`: rejilla de doce meses. Un mes vacío ≠ un mes en cero, y **un mes ya
  guardado queda bloqueado**: es el denominador de los indicadores del art. 30 y un
  tropiezo con el teclado cambiaría la frecuencia de todo el año. Se desbloquea mes a mes.
- `examenes_medicos`: **solo concepto de aptitud y restricciones. NUNCA diagnóstico** —
  la historia clínica es reservada y la custodia el médico (Res. 2346 de 2007). No hay
  columna de diagnóstico y no debe agregarse. `retirar_empleado` exige examen de egreso
  o una razón documentada.

### Indicadores del artículo 30 (fase 1)
`indicadores_legales(empresa, anio)` calcula los seis indicadores que exige el
Dec. 1072 art. 2.2.4.6.20-22, **cada uno con su fórmula escrita al lado**: frecuencia,
severidad y mortalidad de accidentalidad, prevalencia e incidencia de enfermedad laboral
y ausentismo. Son los de la norma, no los propios de la aplicación.

### Matriz de peligros GTC 45 (fase 2)
`peligros` con la valoración como **columnas generadas**: `np = nd*ne`, `nr = np*nc`,
`nivel` (I–IV) y aceptabilidad. Se calculan en la base, así que ninguna pantalla puede
mostrar un nivel distinto al de otra. `peligro_controles` enlaza cada peligro con el EPP,
la capacitación o la inspección que lo controla: es lo que permite justificar **por qué
ese EPP y no otro**.

### Plan anual y bandeja de pendientes (fase 2)
- `plan_anual` + `plan_actividades` con `meses_programados` y `meses_ejecutados` (int[]):
  el cronograma es el documento, no un adorno. **Aprobar es firmar**: `aprobar_plan_anual`
  exige al menos una actividad, nombre y firma del empleador.
- `pendientes(empresa)` une **trece fuentes** en una sola bandeja ordenada por severidad
  (accidentes sin investigar y sin reportar a la ARL, acciones vencidas, inspecciones
  programadas, exámenes por vencer, peligros I y II sin control, dotación por vencer,
  plan anual y autoevaluación del año, y **comités mal conformados o inexistentes**).
  Es la primera pantalla del panel principal, con `semaforo_cumplimiento(empresa)`.

### Autoevaluación de estándares mínimos (fase 2)
`autoevaluaciones` + `autoevaluacion_items` sobre un **conjunto** de estándares.
El puntaje y el criterio (crítico / moderadamente aceptable / aceptable) se derivan al
leer, nunca se guardan. `responder_estandar` **rechaza «no aplica» sin justificación**,
que es lo que más puntos cuesta en una visita. `generar_plan_mejoramiento` convierte cada
incumplimiento en una acción del plan que ya existe. Informe en PDF y envío por correo.

### Conjuntos de estándares editables (fase 2)
`estandar_conjuntos` con `org_id NULL` = conjunto del sistema, de solo lectura por RLS.
El profesional **duplica** (y puede cambiar nombre, norma, descripción y cada fila),
**crea** desde cero o **importa desde Excel** (`importar_conjunto_estandares` valida todas
las filas antes de escribir: o entra el archivo entero o no entra nada, con el número de
fila en el error). Así las tablas de 7 y 21 estándares no dependen del programador — ver §5.22.

### Comités, vigía y brigada de emergencia (fase 3.1)
`comites` + `comite_miembros` para **COPASST / Vigía**, **Comité de Convivencia** y
**Brigada de emergencia**. Lo que aporta no es el dibujo sino el **validador**:
`composicion_requerida(empresa, tipo)` calcula lo que exige la norma según los
trabajadores activos y `validar_comite(comite)` dice qué falta.

| Tipo | Composición | Norma |
|---|---|---|
| Vigía | menos de 10 trabajadores | Res. 2013/1986 art. 2 · Dec. 1295/1994 art. 35 |
| COPASST | 10–49: 1+1 · 50–499: 2+2 · 500–999: 3+3 · 1000+: 4+4, **por cada parte** | Res. 2013 de 1986 |
| Convivencia | menos de 20: 1+1 · 20 o más: 2+2, por cada parte | Res. 652/2012 mod. 1356/2012 |
| Brigada | **la norma no fija número**: conformar, capacitar y dotar «acorde con el nivel de riesgo» | Dec. 1072 art. 2.2.4.6.25 num. 9 · Res. 0312 est. 5.1.2 |

- Periodo de **dos años** en COPASST y convivencia; **un año** en la brigada, que no lo
  tiene en la norma pero se revisa anualmente junto con capacitación y dotación.
- La brigada no se agrupa por parte sino por **frente** (primeros auxilios, control de
  incendios, evacuación y rescate); su rol es jefe o brigadista. En la brigada nadie
  representa a nadie, y `guardar_miembro_comite` lo fuerza venga de donde venga la llamada.
- **Organigrama en PDF** pensado como cartelera (se imprime y se publica), con envío por
  correo. Al **retirar un empleado** sale de sus comités pero **no se borra**: queda
  inactivo con su motivo, porque el acta de conformación sigue nombrándolo.
- **Acta de conformación** aparte del organigrama: el organigrama demuestra quién está, el
  acta demuestra que se conformó, cómo se eligió y que los integrantes lo aceptaron. Cada
  uno firma desde `/m/[token]`, y `cerrar_acta_comite` exige **todas** las firmas.
  El acta **imprime la validación aunque salga en contra**: ocultar que faltan dos
  suplentes no engaña al auditor, solo le quita credibilidad al documento entero.

### Emergencias — amenazas y simulacros (fase 3.2)
Estándar 5.1.1 · Dec. 1072 art. 2.2.4.6.25.

- **`emergencia_amenazas`** — análisis por la **metodología de colores** (guía FOPAE,
  Res. 004/09). La trampa está en la escala: el número mide la **vulnerabilidad, no el
  control**. «Sí, existe» puntúa **0.0** y «No existe» **1.0**, así que la suma de los tres
  aspectos se lee 0.0–1.0 baja (verde) · 1.1–2.0 media (amarillo) · 2.1–3.0 alta (rojo).
  Invertirla pintaría de verde justo lo que está mal, y por eso la pantalla dice el valor
  de cada opción en voz alta.
- El **diamante** (amenaza + personas + recursos + sistemas) y el `nivel_riesgo` son
  **columnas generadas**: 3 o 4 rombos en alto → alto; 1 o 2 en alto, o 3 en medio → medio.
- `sembrar_amenazas` precarga catorce amenazas típicas **sin calificar**: el sistema
  propone la lista, el profesional la califica. Proponer una calificación sería inventarle
  el análisis, y `evaluada = false` evita que los valores por omisión pinten de rojo un
  análisis que nadie ha hecho.
- **`simulacros`** + **`simulacro_evaluadores`** — el acta es la evidencia del estándar:
  tener el plan escrito no prueba que se haya probado. **Cerrar exige todas las firmas**,
  y las firmas se piden **por enlace al correo** (`/s/[token]`), porque los evaluadores
  están repartidos por la planta y uno suele ser el asesor de la ARL.
- El listado muestra **tiempo de evacuación y cobertura**, que son los dos números que se
  comparan con el simulacro anterior. Una lista de fechas no dice si la empresa mejoró.
- Dos PDF: **análisis de amenazas** (apaisado, con la letra A/M/B dentro de cada color para
  que sobreviva a una fotocopia) y **acta de simulacro**. Ambos se envían por correo.

### Permisos de trabajo de alto riesgo (fase 3.3)
Res. 4272 de 2021 (alturas) · Res. 491 de 2020 (espacios confinados) ·
Dec. 1072 art. 2.2.4.6.24.

- Un permiso **no es un formato más: es una autorización que vence**. Vale para una tarea
  y una franja horaria, y fuera de ahí no autoriza nada. La vigencia se **deriva al leer**
  (§5.9): `vencido = estado 'autorizado' y (fecha + hora_fin) ya pasó`.
- **El cruce es lo que aporta**: `aptitud_participante` consulta `examenes_medicos` y, al
  autorizar, comprueba que cada ejecutante tenga aptitud vigente. En papel esa
  comprobación depende de que el supervisor se acuerde.
- Si a alguien le falta la aptitud, **se puede autorizar dejando constancia escrita** del
  motivo. Mismo patrón que `retirar_empleado`: prohibirlo del todo llevaría a trabajar
  sin permiso, que es peor. La constancia sale impresa en el PDF.
- **Autorizar es emitir**, y exige: requisitos de norma verificados y ninguno en «no
  cumple», los roles que pide cada tarea (alturas → coordinador **y** vigía; espacios
  confinados → vigía) y **todas las firmas**.
- La lista de verificación se **copia al crear** (plantilla → instancia, §5.7) desde
  `requisitos_permiso(tipo)`, con 44 requisitos en seis tipos de tarea. Cada uno marcado
  **NORMA** o **criterio técnico** (§5.23) — y lo de norma es lo único que bloquea.
- Firma remota en `/p/[token]`. Es la pantalla de firma que **sí muestra la lista de
  verificación completa**: quien firma un permiso da fe de esas condiciones, y ocultárselas
  sería pedirle que firme en blanco.
- El PDF grita la **vigencia** arriba del todo: un permiso vencido pegado en la pared
  parece uno vigente.

### Matriz legal (fase 3.4)
Estándar 2.7.1 · Dec. 1072 art. 2.2.4.6.8 num. 3.

Es la primera aplicación completa de la regla §5.22 —**método, no contenido**— y por eso
tiene **dos capas**:

1. **`norma_catalogo` con `org_id NULL`** = catálogo del sistema, de solo lectura por RLS.
   Llega con **29 normas transversales** del SG-SST colombiano para no arrancar de cero.
2. Encima, el consultor **crea sus propias normas** (las del sector de su cliente) o
   **importa un Excel completo**. Cuando el Ministerio publique algo nuevo no espera al
   programador. `importar_normas` valida todas las filas antes de escribir: entra el
   archivo entero o no entra nada, con el número de fila en el error.

- La matriz de cada empresa **copia** la identificación de la norma (plantilla → instancia,
  §5.7) y guarda `norma_id` como enlace blando: corregir el catálogo no cambia sola una
  matriz ya entregada.
- **«Cumple» exige escribir la evidencia.** Una matriz que dice que cumple sin decir con
  qué se demuestra es lo que un auditor desarma en la primera pregunta, y por eso
  `guardar_item_matriz` la rechaza.
- Lo que **no aplica se conserva marcado como tal**, no se borra: mostrar que se analizó y
  se descartó es parte de haber hecho la identificación.
- PDF apaisado —la columna de evidencia es la que importa y tiene que caber— y envío por
  correo. Alertas en la bandeja: sin matriz, requisitos incumplidos y normas sin evaluar.

> El catálogo base es un **punto de partida que el profesional revisa**, no una lista
> cerrada: la matriz depende del sector, la actividad y el nivel de riesgo de cada cliente,
> y ninguna lista genérica puede saber eso.

### Ausentismo (fase 3.6)
Dec. 1072 art. 2.2.4.6.22 · Res. 0312 art. 30.

Cierra el sexto indicador legal, que hasta ahora **mentía por defecto**: se calculaba con
los días de incapacidad de los accidentes, que son una fracción. El grueso del ausentismo
es enfermedad general.

- `ausencias` guarda **origen y días, nunca el diagnóstico** — misma regla que
  `examenes_medicos` (Res. 2346 de 2007). No hay columna de diagnóstico y no debe agregarse.
- `causa_medica` es **columna generada**: enfermedad general, laboral, accidente de trabajo
  y accidente común cuentan; las licencias de ley y los permisos no. Meterlas inflaría el
  indicador y lo volvería incomparable con el del sector.
- `guardar_ausencia` **rechaza el solapamiento** de fechas de una misma persona: casi
  siempre es la misma incapacidad cargada dos veces, y duplicaría el indicador.
- Una incapacidad que **cruza el 31 de diciembre** aporta todos sus días al listado pero
  solo los del año al indicador (`least`/`greatest` sobre el rango).

### Rendición de cuentas (fase 3.8)
Estándar 2.8.1 · Dec. 1072 art. 2.2.4.6.8 num. 3.

La norma pide que quienes tienen responsabilidades en el SG-SST rindan cuentas
**anualmente y por escrito**. Las dos cosas importan, y de ahí sale todo el diseño:

- El consultor arma el marco (alcance, logros, dificultades, compromisos) y asigna a cada
  responsable **lo que le correspondía**. Lo que no escribe es el informe de cada uno.
- Cada responsable **escribe su propio informe** desde `/c/[token]` y firma en la misma
  pantalla. Es la única pantalla pública donde la persona escribe algo, no solo firma.
- `cerrar_rendicion` exige que **todos hayan escrito Y firmado**: un acta donde los
  informes los redactó una sola persona no es una rendición de cuentas, es una lista de
  asistencia con párrafos.
- Una por año (restricción única sobre `empresa_id, anio`). El PDF se organiza **por
  persona**, no por tema, porque eso es lo que la norma pide demostrar.

### Contratistas (fase 3.5)
Estándar 2.6.1 · Dec. 1072 art. 2.2.4.6.28.

En muchas empresas medianas los contratistas son la mitad de la gente en planta, y hasta
ahora la aplicación no sabía que existían: `empleados` eran solo los de nómina.

- Lo que aporta no es la ficha sino que **los soportes vencen**. Una planilla de aportes de
  hace cuatro meses no prueba nada, y la afiliación a la ARL verificada en enero puede
  estar cancelada hoy. Cada requisito lleva su `fecha_vence` y el vencimiento entra a la
  bandeja de pendientes.
- **12 requisitos** copiados al crear (plantilla → instancia, §5.7), 10 marcados NORMA.
- `guardar_contratista` **impide aprobar con un requisito de norma pendiente**: si la
  evaluación se puede firmar con documentos faltantes, no significa nada. Queda la salida
  honesta de *aprobado con condiciones*, que exige escribir cuáles.
- `contratista_personal` registra quién entra a planta, con su aptitud médica y su
  inducción. Personal con **examen vencido** genera alerta crítica: está adentro sin
  aptitud vigente.

### Recordatorios por correo (fase 3.7)

`/api/cron/recordatorios` lo dispara el **cron de Vercel** (`vercel.json`, días hábiles a
las 7:00 de Bogotá), no una persona: no hay sesión, usa la clave de servicio y se
autentica con **`CRON_SECRET`**.

- Manda **un solo correo por consultor** con lo crítico y lo alto de todas sus empresas.
- **No manda nada cuando no hay pendientes.** Un recordatorio que llega todos los días
  diga lo que diga se deja de leer en una semana, y entonces falla justo el día que trae
  algo urgente.
- `resumen_recordatorios()` es `SECURITY DEFINER` y está **revocada de `authenticated` y
  `anon`**: devuelve la cartera de todas las organizaciones a la vez, así que solo la
  puede llamar el cron. Un consultor que pudiera ejecutarla vería los clientes de otro.
- `/api/cron` va en `RUTAS_PUBLICAS` del middleware —no lo abre una persona— pero **no
  queda desprotegido**: la autenticación es `CRON_SECRET` dentro de la propia ruta, que es
  la capa que le corresponde.

> **Sigue bloqueado por Resend.** Con el remitente de pruebas esto solo llega al correo
> dueño de la cuenta. Avisar a jefes de área o a responsables de acciones exige verificar
> un dominio propio, y además decidir si `empleados` gana una columna `correo`.

### Plan anual: PDF y aprobación remota (regla §5.21)
El plan anual **es el primer documento que pide un auditor** y hasta ahora no se podía
imprimir. Ahora sale en PDF apaisado, porque el cronograma —doce meses por actividad— *es*
el documento: una lista de actividades sin los meses es un listado de buenas intenciones.
Cada mes se marca con **letra**, no con color: `P` programado, `E` ejecutado.

Y lo que convierte el plan en plan es **la firma del empleador**, que casi nunca está
sentado al lado del consultor: `/a/[token]` le muestra objetivo, alcance, recursos y el
cronograma completo, y firma desde donde esté. Enseñarle solo el recuadro de firma sería
pedirle que firme en blanco un compromiso de recursos y fechas.

### Reportes Excel
Tres libros descargables (`/api/excel/*`) además del kardex:
- **Inspecciones**: 3 hojas — inspecciones con veredicto, hallazgos (solo los incumplimientos, uno por fila) y plan de acción.
- **Matriz de capacitaciones** y **matriz de dotación**: cada libro trae la **rejilla** que se ve en pantalla *y* una hoja **Detalle** con una fila por cruce empleado × elemento, porque una rejilla no se puede filtrar ni cruzar. La de dotación suma una hoja de equipos asignados (un empleado puede tener varios, cada uno con placa).
- Estados reales de la matriz de dotación: `vigente | por_vencer | vencido | sin_vencimiento | nunca`.

### Registro de cuentas — dos métodos
1. **Por correo** (`/registro`): `signUp` + `crear_organizacion`. Es el definitivo.
2. **Directo, TEMPORAL** (`/registro/directo`): el servidor crea la cuenta ya confirmada con la
   clave de servicio y **genera la contraseña**, que se muestra una sola vez. Marca
   `usuarios.debe_cambiar_clave`, y el layout del panel redirige a `/clave` hasta que se cambie.
   Existe porque el proyecto tiene `mailer_autoconfirm = false` y usa el SMTP compartido de
   Supabase: quien se registra por correo puede quedarse esperando un mensaje que no llega.
   **Se retira** borrando `lib/acciones-registro.ts`, `app/registro/directo/` y el enlace en
   `/registro`; el método por correo no se toca.

### Navegación
El menú lateral va agrupado por **PHVA** (Planear, Hacer, Verificar, Actuar). El beneficio
no es estético: **hace evidente lo que falta**, y es el mismo lenguaje con el que un auditor
recorre el SG-SST.

**La barra superior se pinta con el color de la empresa activa.** Es la señal más barata
contra el error más caro: cargarle un accidente o una entrega a la empresa equivocada. El
nombre ya estaba en el selector, pero un nombre hay que leerlo y un cambio de color se ve
sin querer. El color lo elige el consultor, así que el texto se decide con la **luminancia
relativa** (`lib/color.ts`): sobre un azul oscuro va blanco, sobre un amarillo va oscuro.
La misma función oscurece el color cuando se usa como **texto sobre blanco** en el menú,
donde un amarillo claro sería invisible.

Cada fase del PHVA tiene **color e icono propios**, y sus módulos cuelgan de una línea de
ese color. Son los cuatro del ciclo y **no** el de la empresa: dos señales distintas no
pueden compartir el mismo canal.

Los cinco accesos transversales —Panel principal, Empleados, Calendario, Reportes y
Plantillas— viven en la **barra superior**, no en el lateral: allí se comían la mitad del
alto y obligaban a subir y bajar para llegar a los módulos. `AccesosRapidos` los dibuja con
**SVG en línea** porque los cuadrados geométricos anteriores (▦ ▤ ▥ ▧ ◫) eran
indistinguibles entre sí. Bajo 1180 px queda solo el icono; bajo 900 px la barra
desaparece y los accesos vuelven al lateral, que en móvil es el único menú que hay.

### Manual de uso (`/panel/manual`)
**21 submanuales agrupados por fase del PHVA**, con los mismos colores del menú: el submanual se
busca donde se busca el módulo. Figuras dibujadas (no capturas: una captura envejece con el primer
cambio de estilo). `Figuras.tsx` da las piezas — `Ventana`, `Flujo`, `Decision`, `Jerarquia`,
`Regla`, `Ojo` — y `contenido.tsx` el texto. Se entra desde el botón **Manual**, junto a *Salir*.
Cada submanual responde: para qué sirve → cómo se hace → **por qué se comporta así**; ese tercer
punto es el que evita las preguntas de soporte.

Dos submanuales no corresponden a un módulo del menú y existen a propósito:
**Panel principal y pendientes** (la bandeja es la primera pantalla y nadie la lee como módulo) y
**Firmas, PDF y correo**, que explica la regla del §5.21 una sola vez en lugar de repetirla en
cada capítulo. Añadir un módulo al manual es añadir una ficha a `MANUALES` —con su `fase`— y su
función al mapa `CONTENIDOS`; el índice y las páginas se generan de ahí.

### Storage (Supabase)
- Bucket **`logos`** — público (logos de empresa, fotos de artículos, fotos de hallazgos).
- Bucket **`firmas`** — privado (se lee con `createSignedUrl`).
- **El primer segmento de toda ruta de Storage debe ser `org_id`** (lo exige la política de lectura). Para subidas anónimas (firma remota, registro público) hay políticas específicas para `anon`.

---

## 5. Decisiones de arquitectura clave

1. **`org_id` = única frontera RLS.** Toda tabla lo lleva y toda política filtra por `org_id = public.mi_org_id()`. `empresa_id` es solo contexto de trabajo, no de seguridad.
2. **El stock se calcula de los movimientos** (`articulo_movimientos`), no se guarda como columna.
3. **Borrador → firma.** El inventario se descuenta y las unidades se asignan **solo al firmar**, nunca al crear el borrador.
4. **Control documental congelado.** Membrete, nomenclatura, versión, criterios y declaración se **copian**, no se referencian: si la plantilla o la empresa cambian después, lo ya emitido no se altera.
5. **Ítem crítico incumplido reprueba la inspección completa**, sin importar el puntaje. El veredicto ≠ el porcentaje.
6. **El puntaje excluye lo marcado "no aplica"** (sale del denominador).
7. **Patrón plantilla → instancia** (evaluaciones, capacitaciones, inspecciones): se copia al aplicar.
8. **Objeto polimórfico** en inspecciones: `tipo_objeto` (area/unidad/empresa/otro) + `objeto_id`, no cuatro tablas paralelas.
9. **Estados derivados en lectura, no almacenados.** Ej.: una acción "vencida" se calcula al listar (`fecha_limite < current_date and estado <> 'cerrada'`), no se persiste stale.
10. **Acceso público sin sesión** vía funciones **`SECURITY DEFINER`** (registro de asistencia, firma remota, datos públicos de entrega). El rol `anon` no toca tablas directamente; solo ejecuta esas funciones, que deben tener `grant execute ... to anon`.
11. **`'use server'`**: un archivo con esa directiva **solo puede exportar funciones async**. Tipos, constantes y helpers síncronos van en el componente o como funciones **no exportadas** dentro del mismo archivo.
12. **`key={entity.id}`** en componentes con estado para forzar remount al cambiar de entidad (empresa/inspección).
13. **RLS y GRANT son capas independientes**: ambas deben concederse.
14. **Se congela al EMITIR, nunca al crear el registro.** Matiz caro de la decisión 3 y 4: un borrador aún no es un documento. `resolverEncabezado(congelado, vigenteEmpresa, emitido)` devuelve el congelado **solo si el documento ya se emitió**; mientras no lo esté, usa lo vigente de la empresa. El congelado se escribe al **cerrar / firmar / activar**. La misma regla aplica a la firma del responsable.
15. **El slug público es único a nivel GLOBAL**, no por organización: `/r/[slug]` resuelve sin sesión y no tiene contexto de quién pregunta. `slug_empresa_libre()` y `sugerir_slug_empresa()` lo validan; ambas están **revocadas de `PUBLIC` y `anon`** (revelarían nombres de empresas de otros consultores).
16. **Las capacidades se leen del plan**, no del código: `planes.encabezado_personalizable` y, cuando exista B2B, `max_clientes_por_empresa` / `clientes_descargan`.
17. **Un Excel de matriz lleva siempre una hoja plana** junto a la rejilla. La rejilla es un dibujo; la tabla larga es lo que el usuario puede filtrar, cruzar y llevar a dinámica. El kardex, por lo mismo, es **una sola tabla cronológica** con `!autofilter` y `!freeze`: nada de filas separadoras ni títulos intercalados.
18. **`next.config` tiene `typescript.ignoreBuildErrors: true`** — `npm run build` **no valida tipos**. Hay que correr `npx tsc --noEmit` aparte. Varios errores visibles en producción (`"undefined%"` en un KPI, la licencia SST que no salía bajo la firma) estaban ahí y el build los ocultaba.

18b. **Revocar un permiso de `anon` no basta: hay que quitarlo de `PUBLIC`.** Postgres
    concede `EXECUTE` a `PUBLIC` en cada función nueva, y `anon` hereda de ahí. Un
    `revoke … from anon` se ejecuta sin error y no cambia nada — comprobado con
    `has_function_privilege`. Lo que cierra de verdad es
    `revoke … from public` + `grant … to authenticated`.

19. **Los invariantes de emisión van en triggers, no repetidos en cada función.** La nomenclatura
    se estampa al emitir desde un trigger por tabla: cualquier camino nuevo que emita el documento
    queda cubierto sin acordarse de copiar la línea. Es lo contrario del error del §6 con la firma
    del responsable, que solo se copiaba en `activar_capacitacion`.
20. **La clave de servicio solo vive en el servidor.** `lib/supabase/admin.ts` salta RLS por
    completo, así que solo puede importarse desde Server Actions o Route Handlers, nunca desde
    un componente `'use client'`. La alternativa al registro directo —apagar la confirmación de
    correo del proyecto— habría dejado sin verificación **también** al registro por correo.

21. **Toda firma se puede pedir por enlace al correo, y todo documento firmado sale en
    PDF y por correo.** Regla del producto, no una comodidad. El personal que tiene que
    firmar —equipo investigador, jefe de área, trabajador en otra sede— casi nunca está
    en el mismo sitio: si la firma virtual obliga a buscar a la gente, no ahorró nada
    frente al papel. Y una firma que no se puede sacar de la aplicación no sirve como
    soporte ante la ARL o una auditoría. Cada pantalla de firma nueva nace con las tres
    cosas: captura en sitio, **enlace por correo** y **PDF descargable y enviable**.
    Estado por módulo en §9.

22. **A un catálogo normativo se le entrega el MÉTODO, no el contenido.** Las tablas de
    estándares (7, 21, 60) cambian con cada resolución. Precargarlas deja al profesional
    esperando al programador cada vez que el Ministerio publica algo. Por eso lo que se
    entrega es duplicar + editar + **importar desde Excel**, y el conjunto del sistema es
    de solo lectura. La misma regla aplicará a la matriz legal.

23. **Lo que la norma exige va en `fallas`; lo que es criterio técnico va en
    `recomendaciones`.** La brigada obligó a separarlos: el Decreto 1072 no fija número ni
    paridad, así que presentar el 10 % del personal como incumplimiento sería inventar una
    exigencia legal. `conforme` solo mira las fallas.

24. **Cambiar la firma de una función RPC exige `drop function` de la anterior.** Añadir un
    parámetro con valor por omisión crea una **sobrecarga**: las dos quedan vivas y
    PostgREST no sabe cuál llamar. Se borra la vieja en la misma migración.

---

## 6. Problemas resueltos (y sus lecciones)

| Problema | Lección / arreglo |
|---|---|
| Migraciones con rollback silencioso dejaban versiones viejas de funciones activas | **Verificar end-to-end contra la base** tras cada migración, no confiar en que aplicó |
| Renombres de parámetros/campos desalineaban código y base (`guardarRespuesta`→`responderCriterio`; `resumen.cumplen`→`cumple`) | Alinear **nombres exactos** RPC↔TS; `CREATE OR REPLACE` no cambia el nombre del parámetro |
| Firma remota guardada en `publico/…` quedaba ilegible para el consultor | Toda ruta de Storage **empieza por `org_id`**; `entrega_publica` devuelve `orgId` |
| `crearEmpresa` reventaba en `datos.sector.trim()` con campo ausente | Helper `limpiar()` que tolera `undefined/null`; **endurecer en la acción** (frontera de confianza) |
| `EditorCriterios` fallaba: `input` controlado con `value={null}` | Normalizar campos opcionales a `''` al cargar el estado |
| Página pública mostraba "No hay capacitaciones activas" ante **cualquier** fallo | Descartaba el `error` de la RPC; ahora lo **captura, registra y muestra mensaje distinto** + `force-dynamic` |
| Tarjetas de reportes con altura colapsada | Contenedor flex + `minHeight` + `flexShrink:0` |
| El encabezado nuevo no aparecía en los documentos: se congelaba **al crear** el registro | Congelar **al emitir** (cerrar/firmar/activar), con `resolverEncabezado` — ver §5.14 |
| La firma del responsable no salía en C26-006 pese a estar marcada | `activar_capacitacion` copiaba la firma **solo al activar**, y la capacitación ya estaba activa. **Mismo error conceptual que el encabezado** |
| Estilos de react-pdf inexistentes (`s.filaTabla`) | react-pdf **los ignora en silencio**: el render "pasa" con el estilo perdido. Solo `tsc` lo detecta |
| "Indica la empresa capacitada" al crear en Vercel | La constante de formulario vacío mandaba `esEmpresaPropia:false` con `empresa:''`. Nació de **no probar la creación real** por una premisa falsa (`siguiente_codigo` usa `max+1`, no una secuencia que se gaste) |
| Clic en el calendario que no abría nada | `abrirEdicion` hacía `return` mudo para capacitaciones y la agenda estaba vacía, así que **todos** los clics caían ahí. El dato (0 anotaciones) ya estaba a la vista |
| `generar_token_entrega` fallaba con «`gen_random_bytes` does not exist» | pgcrypto vive en el esquema `extensions` y las funciones fijan `search_path='public'`. **Bug de producción preexistente**: la firma remota de entregas nunca había funcionado. Se **califica el esquema** (`extensions.gen_random_bytes`), no se ensancha el `search_path` |
| `/d/[token]` redirigía a `/login` | Faltaba `/d` en `RUTAS_PUBLICAS` del middleware. Segundo bug preexistente **en la misma función**: un flujo público se rompe en dos sitios distintos, y hay que probarlo entero |
| El enlace de firma llegaba como `/i/<token>` sin dominio | `NEXT_PUBLIC_APP_URL` se incrusta **en el build** y no estaba en `.env.local`. Se creó `lib/url-base.ts`, que lo reconstruye de las cabeceras de la petición |
| El correo "se enviaba" pero no llegaba | `RESEND_FROM = onboarding@resend.dev` es el remitente de **prueba**: la API acepta y solo entrega al dueño de la cuenta. La evidencia estaba en la tabla `envios` (dos envíos en toda la vida, ambos al mismo correo). Se detecta el modo prueba y **el enlace siempre se muestra copiable** |
| `guardarEquipo` borraba e insertaba de nuevo todo el equipo | Habría destruido firmas ya capturadas e invalidado enlaces enviados. Ahora **actualiza por id**, inserta lo nuevo y borra solo lo quitado |
| `pr.proxima_fecha` / `pr.activa` no existían | Se **supusieron** los nombres en vez de consultarlos: eran `fecha_programada` y `estado='pendiente'`. Exactamente el error contra el que avisa este archivo |
| `text[] \|\| 'literal'` → "malformed array literal" | Concatenar un literal a un `text[]` necesita `::text`. Con `format()` no falla porque devuelve text, y por eso el error aparece solo en algunas líneas |
| `format()` con un `%` literal → "unrecognized format() type specifier" | Se escribe con `\|\|` o se duplica el signo |
| Las funciones con `mi_org_id()` devolvían vacío al probarlas por SQL | En una sesión SQL no hay JWT. Se simula con `set_config('request.jwt.claims', …, true)` antes de probar |
| Una regla CSS correcta que no hacía nada | El elemento traía `display:flex` **en línea**, y un estilo en línea le gana a la hoja: el `@media` se escribía sin error y se ignoraba. Se comprueba con `getComputedStyle`, no leyendo el código |
| «Expected '</', got 'ident'» al añadir un comentario a un `<style>` | Un **backtick** dentro del comentario cerró la plantilla de texto de JSX. `tsc` no lo vio porque el archivo se editó después de correrlo; lo cazó el navegador |
| `→` (U+2192) invisible en los PDF | Las fuentes estándar de react-pdf usan **WinAnsi**: el carácter no existe, no se dibuja y **no da error**. Solo se ve renderizando de verdad. `•` y `·` sí existen |
| «CARLOS RAMÍREZ TOR-RES» en el organigrama | react-pdf **parte palabras con guion** cuando no caben. Se desactiva con `Font.registerHyphenationCallback((p) => [p])` en `EncabezadoDoc`, por donde pasan todos los documentos |
| Vercel devolvió `504 MIDDLEWARE_INVOCATION_TIMEOUT` con Supabase sano | El middleware llamaba a `getUser()` —un viaje de red— **en toda petición**, incluidas las anónimas y las públicas, sin reloj. Un solo retardo de Supabase tumbaba el sitio entero. Ahora **sin cookie de sesión no se pregunta** (una petición anónima no tiene nada que validar) y la validación corre contra un límite de 5 s: si vence, el middleware **decide** —a `/login` en ruta protegida, de largo en pública— en vez de colgarse hasta que Vercel la mate |
| Reportar "dos capacitaciones activas" como anomalía | El límite de una activa es **por empresa**, no por organización: mirar el total ignora la frontera de trabajo |

---

## 7. Protocolo de verificación pre-entrega (6 comprobaciones)

Aplicar a **cada** cambio de código antes de darlo por terminado — nacieron de errores costosos reales:

1. **No hay `export const/let/var/function` en archivos `'use server'`** (solo exports async).
2. **Los imports coinciden con los exports** del archivo destino (nombre y módulo correctos).
3. **Las props que pasa la página == las que declara el componente.**
4. **Las rutas relativas resuelven** a archivos existentes.
5. **Paréntesis y llaves balanceados** en el JSX.
6. **`npx tsc --noEmit` sin errores nuevos** — el build no valida tipos (§5.18).

Además:
- **PDFs**: renderizar de verdad (react-pdf) antes de entregar, y verificar que los estilos usados **existen** en la hoja del documento.
- **Funciones de base**: probar la llamada real con datos. Método seguro: un bloque `DO $$ … RAISE EXCEPTION $$` que revierte la transacción, y después comprobar que no quedaron restos.
- **Parchear funciones SQL largas** con `pg_get_functiondef` + `replace` + `execute`, en vez de transcribir miles de caracteres a mano.
- **No dar por buena una conclusión sacada solo del código** cuando hay un dato observable que la contradice (§6, fila del calendario).

---

## 8. Modelo de datos (tablas principales)

```
organizaciones      # cuenta del consultor (estado, fecha_expiracion = licencia, plan)
planes              # capacidades por plan (encabezado_personalizable, límites)
empresas            # clientes (slug ÚNICO GLOBAL, activa, color_primario, nomenclatura,
                    #   version_doc, campos_encabezado jsonb, encabezado_config jsonb,
                    #   declaracion_dotacion, direccion)
usuarios            # perfil ligado a auth.users
perfil_profesional  # ficha del consultor (firma, licencia SST)
empleados           # personal de cada empresa cliente (fecha_retiro = retirado)

# Capacitaciones
capacitaciones · participantes · convocados · preguntas · respuestas · evaluaciones
plantillas_capacitacion · plantillas_evaluacion (+ plantilla_preguntas/opciones)
agenda              # anotaciones del calendario

# Dotación
articulos · articulo_unidades · articulo_movimientos
entregas · entrega_items · articulo_mantenimientos

# Inspecciones
inspeccion_plantillas · inspeccion_items
inspecciones · inspeccion_respuestas · acciones_correctivas
inspeccion_programaciones   # fase 8: frecuencia + próxima fecha

# Fase 1 — accidentalidad, salud e indicadores
eventos · evento_investigacion · evento_equipo · evento_testigos
horas_hombre                # denominador de los indicadores del art. 30
examenes_medicos            # aptitud y restricciones, NUNCA diagnóstico
ausencias                   # origen y días, NUNCA diagnóstico; causa_medica generada

# Fase 2 — planeación y verificación
peligros (np/nr/nivel generadas) · peligro_controles
plan_anual · plan_actividades
estandar_conjuntos · estandar_items     # org_id NULL = del sistema, solo lectura
autoevaluaciones · autoevaluacion_items

# Fase 3 — comités y emergencias
comites · comite_miembros   # copasst | vigia | convivencia | brigada
emergencia_amenazas         # metodología de colores; nivel_riesgo generado
simulacros · simulacro_evaluadores   # acta firmada, con token de firma remota
permisos_trabajo · permiso_requisitos · permiso_participantes   # alto riesgo
norma_catalogo              # org_id NULL = del sistema, solo lectura
matriz_legal                # copia por empresa, con evidencia de cumplimiento
rendiciones · rendicion_responsables   # acta anual; cada quien escribe lo suyo
contratistas · contratista_requisitos · contratista_personal   # soportes con vigencia
```

`capacitaciones`, `inspecciones`, `entregas`, `eventos`, `plan_anual`, `autoevaluaciones`
y `comites` llevan además **`encabezado_config` jsonb** (el congelado del §5.14).

Funciones clave por dominio:
- **Base:** `mi_org_id()`, `siguiente_codigo`, `puede_crear_empresa`, `slug_empresa_libre`, `sugerir_slug_empresa`.
- **Dotación:** `existencias`, `crear_entrega`, `firmar_entrega`, `firmar_entrega_publica`, `matriz_dotacion`, `expediente_empleado`, `kardex_dotacion`, `devolver_item`.
- **Capacitaciones:** `activar_capacitacion` (copia firma y congela encabezado), `empleados_con_participacion(p_activos)`, `convocar_empleados`, `matriz_capacitaciones`, `resumen_empresas` (trae `proxima`), `calendario`, `trayectoria_profesional`.
- **Inspecciones:** `crear_inspeccion`, `guardar_respuesta_inspeccion`, `cerrar_inspeccion`, `detalle_inspeccion`, `listar_inspecciones`, `sembrar_plantillas_inspeccion`, `programar_inspeccion`, `listar_programaciones`, `cumplir_programacion`.
- **Plan e indicadores:** `crear_accion`, `generar_acciones_inspeccion`, `actualizar_accion`, `listar_acciones`, `indicadores_inspecciones`.
- **Fase 1:** `crear_evento`, `guardar_investigacion`, `cerrar_investigacion`,
  `generar_acciones_evento`, `listar_eventos`, `detalle_evento`,
  `generar_token_firma_evento`, `guardar_horas_hombre`, `horas_hombre_periodo`,
  `guardar_examen`, `alertas_examenes`, `retirar_empleado`, `indicadores_legales`,
  `guardar_ausencia`, `listar_ausencias`, `eliminar_ausencia`.
- **Fase 2:** `guardar_peligro`, `matriz_peligros`, `guardar_plan_anual`,
  `aprobar_plan_anual`, `pendientes`, `semaforo_cumplimiento`, `crear_autoevaluacion`,
  `responder_estandar`, `detalle_autoevaluacion`, `generar_plan_mejoramiento`,
  `duplicar_conjunto_estandares`, `actualizar_conjunto_estandares`,
  `guardar_item_conjunto`, `importar_conjunto_estandares`.
- **Fase 3:** `crear_comite`, `guardar_miembro_comite`, `eliminar_miembro_comite`,
  `listar_comites`, `detalle_comite`, `composicion_requerida`, `validar_comite`,
  `guardar_amenaza`, `listar_amenazas`, `sembrar_amenazas`, `eliminar_amenaza`,
  `crear_simulacro`, `guardar_simulacro`, `guardar_evaluador_simulacro`,
  `cerrar_simulacro`, `listar_simulacros`, `detalle_simulacro`,
  `generar_token_firma_simulacro`, `crear_permiso`, `guardar_permiso`,
  `requisitos_permiso`, `responder_requisito_permiso`, `aptitud_participante`,
  `guardar_participante_permiso`, `autorizar_permiso`, `cerrar_permiso`,
  `cancelar_permiso`, `listar_permisos`, `detalle_permiso`,
  `generar_token_firma_permiso`, `listar_normas_catalogo`,
  `guardar_norma_catalogo`, `importar_normas`, `sembrar_matriz_legal`,
  `agregar_norma_matriz`, `guardar_item_matriz`, `listar_matriz_legal`,
  `crear_rendicion`, `guardar_responsable_rendicion`, `cerrar_rendicion`,
  `listar_rendiciones`, `detalle_rendicion`, `generar_token_rendicion`,
  `crear_contratista`, `guardar_contratista`, `requisitos_contratista`,
  `responder_requisito_contratista`, `guardar_personal_contratista`,
  `listar_contratistas`, `detalle_contratista`.
- **Público (`SECURITY DEFINER` + `grant … to anon`):** `capacitacion_activa_publica`, `entrega_publica`, `evaluacion_publica`, `verificar_empleado`, `registrar_asistencia_con_evaluacion`.

---

## 8b. Alcance frente al SG-SST (evaluación del 29-ago-2026)

**Rúbrica es hoy un sistema de evidencias, no un sistema de gestión.** Cubre el
*Hacer* del ciclo PHVA y deja casi vacíos el *Planear* y el *Verificar*. Aporta
evidencia directa para **~12 de los 60 estándares mínimos** de la Res. 0312.

Cubre bien: capacitación (est. 3.2.1, 1.2.x), entrega de EPP (4.2.6), inspecciones
(4.1.3), acciones correctivas (7.1.x) y control documental (art. 2.2.4.6.12/13).

**Vacíos críticos** — ver el plan para el detalle y el orden:
1. **Investigación de accidentes** (Res. 1401/2007; 15 días) — hoy el consultor
   sale de la app justo cuando el SG-SST se pone a prueba.
2. **Matriz de peligros GTC 45** (est. 4.1.2) — sin ella los módulos quedan
   huérfanos: no se puede justificar *por qué* ese EPP y no otro.
3. **Exámenes médicos** (Res. 2346/2007) — y hoy se puede retirar a un empleado
   **sin exigir el examen de egreso**, que es un hallazgo esperando.
4. **Indicadores del art. 30** — los actuales son propios, no los que exige la norma.

**Regla de admisión para funcionalidad nueva:** cada módulo debe terminar en un
**documento firmado** o en un **dato que alimente un indicador obligatorio**. Si no
hace ninguna de las dos, no entra.

---

## 9. Pendientes por hacer

### Inmediato — verificar en Vercel
- **Añadir `SUPABASE_SERVICE_ROLE_KEY`** (Supabase → Settings → API → `service_role`) en Vercel y en
  `.env.local`, y redeployar. Sin ella `/registro/directo` responde con el aviso correspondiente y
  no crea cuentas. Es secreta: nunca en el repo ni con prefijo `NEXT_PUBLIC_`.
- Verificar que las **variables de entorno** estén en Vercel (scope Production) y **redeployar** tras cambiarlas.
- **Probar de extremo a extremo las tres descargas de `/api/excel/*`**: se validó la forma de los datos contra la base y compilan, pero no se ejecutaron con sesión real.

### Ruta de trabajo
El detalle vive en **[docs/PLAN-DE-TRABAJO.md](docs/PLAN-DE-TRABAJO.md)**. Resumen:
- **Fase 0** — decisiones de Iván, limpieza (tabla `perfiles` huérfana, funciones duplicadas) y **reorganización del menú por PHVA antes de agregar módulos**.
- **Fase 1** — horas-hombre → investigación de accidentes → exámenes médicos → indicadores del art. 30. *Es la fase en curso.*
- **Fase 2** — matriz de peligros, autoevaluación con puntaje, plan anual, bandeja de pendientes.
- **Fase 3** — COPASST, emergencias, permisos de alto riesgo, matriz legal, contratistas.

### Firma remota y PDF por módulo (regla §5.21)

| Documento | Firma en sitio | Enlace por correo | PDF | Envío |
|---|---|---|---|---|
| Asistencia a capacitación | sí | sí (`/r/[slug]` + QR) | sí | sí |
| Entrega de dotación | sí | sí (`/d/[token]`) | sí | sí |
| Devolución | sí | — | sí | sí |
| Investigación de evento | sí | sí (`/i/[token]`) | sí | sí |
| Inspección | sí | sí (`/v/[token]`, el acompañante) | sí | sí |
| Plan anual (firma del empleador) | sí | sí (`/a/[token]`) | sí | sí |
| Acta de conformación de comité | sí | sí (`/m/[token]`) | sí | sí |
| Acta de simulacro | sí | sí (`/s/[token]`) | sí | sí |
| Permiso de alto riesgo | sí | sí (`/p/[token]`) | sí | sí |
| Análisis de amenazas | no lleva firma capturada | — | sí | sí |
| Matriz legal | no lleva firma capturada | — | sí | sí |
| Rendición de cuentas | sí | sí (`/c/[token]`) | sí | sí |
| Autoevaluación | no lleva firma capturada | — | sí | sí |

Lo marcado **falta** es trabajo pendiente que abre esta regla, en ese orden.

### Notificaciones (el eslabón que falta)
Los recordatorios de inspecciones programadas y el aviso a los responsables de acciones correctivas siguen sin enviarse. Requiere decidir si se agrega **`correo` a `empleados`**.
**Resend sigue en modo de prueba** (`onboarding@resend.dev`): hay que verificar un dominio
para que los correos lleguen a alguien distinto del dueño de la cuenta.

### Usuarios B2B de solo consulta (analizado, sin implementar)
Enfoque recomendado (**C**): `usuarios` gana `rol='cliente'` + `empresa_id`, y `mi_org_id()` añade `and rol <> 'cliente'` para que **las 117 políticas fallen cerradas** ante un cliente; el acceso se da solo por funciones `SECURITY DEFINER` acotadas. En `planes`: `max_clientes_por_empresa` (0 básico / 1 pro / ilimitado enterprise) y `clientes_descargan` (solo enterprise). **Obstáculo:** falta `SUPABASE_SERVICE_ROLE_KEY` en Vercel, o hay que invitar por correo con Resend.
**Pendiente de confirmar con Iván:** si se acepta el enfoque C (tocar `mi_org_id()`) y qué ve exactamente un cliente — el mínimo defendible sería sus capacitaciones con asistentes, sus inspecciones con veredicto y su plan de acción.

> **La regla §5.21 quedó saldada el 31-ago-2026**: los ocho documentos con firma tienen
> captura en sitio, enlace por correo, PDF y envío. Lo que sigue faltando no es código
> sino el dominio verificado en Resend — sin él ningún enlace llega a su destinatario.

### Deuda técnica (detalle en docs/DOCUMENTACION-TECNICA.md §11)
Lo de la Fase 0 quedó **saldado el 31-ago-2026**: se eliminaron la tabla `perfiles` y
`mi_perfil()`, las cinco funciones duplicadas y los permisos de más. La navegación se
reagrupó por PHVA. Queda:
- Las tres pantallas de indicadores y las cuatro de matriz siguen **separadas**; se
  desambiguaron los nombres en el menú, pero no se unificaron en una con pestañas.
- Los dos bancos de plantillas (capacitación e inspección) siguen separados.

### Proyecto
- **Renombrar la carpeta** `asistencia` → `rubrica` (`Rename-Item asistencia rubrica`; no afecta código). Actualizar nombre de marca en la UI.
- Considerar registrar dominio (`rubrica.co` / `rubricahseq.com` / `rubricasst.co`).

### Backlog de capacitaciones (del documento de ideas del cliente)
Pendiente: alertas por correo del cronograma, integración con Meet/Teams, capacitaciones recurrentes/reprogramables, material de enseñanza cargable con modo presentación, cursos precargados.
Ya hecho: formato imprimible de asistencia, exportación Excel, calendario/cronograma, banco de evaluaciones reutilizables, ficha profesional con firma guardada, historial de envíos.

---

## 10. Cómo trabajar en este repo (para Claude Code)

- **Responde y comenta en español.**
- **Estilos inline**, nunca Tailwind ni CSS externo. Paleta base: azul `#14263F`, texto secundario `#5B6470`, bordes `#E4E4DF`; el color de acento sale de `empresa.color_primario`.
- Server Actions en `lib/acciones-*.ts` con `'use server'` (solo exports async).
- Toda tabla nueva: RLS habilitado + 4 políticas (select/insert/update/delete con `org_id = mi_org_id()`) + `grant` a `authenticated`.
- Antes de dar por terminado un cambio, corre las **6 comprobaciones del §7**.
- No borres datos del usuario en la base al probar; crea, verifica y limpia solo lo que creaste.
- **Ediciones quirúrgicas**: cambia solo las líneas necesarias, nunca reescribas un archivo completo.

   ## Convenciones de Git
   - Tras cada cambio verificado, crea UN commit con mensaje convencional
     (feat:, fix:, refactor:, docs:).
   - Ejecuta `npm run build` **y `npx tsc --noEmit`** antes de commitear; no commitees si fallan.
   - Haz push a GitHub después de cada commit.
   - No incluyas secretos ni .env en los commits.