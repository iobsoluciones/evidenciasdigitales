# Rúbrica — Contexto del proyecto

> Documento de referencia para Claude Code. Describe el estado del proyecto, sus decisiones de arquitectura y sus convenciones. **Léelo completo antes de tocar código.**

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

`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_APP_URL`, `RESEND_API_KEY`, `RESEND_FROM`, **`SUPABASE_SERVICE_ROLE_KEY`** (secreta, solo servidor — la usa el registro directo).

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

lib/
  supabase/servidor.ts        # createServerClient (cookies). Uno nuevo por petición.
  supabase/cliente.ts         # createBrowserClient
  sesion.ts                   # obtenerPerfil()
  empresa-activa.ts           # empresaActiva(), listarEmpresas(), COOKIE_EMPRESA, tipo Empresa
  acciones-empresas.ts        # 'use server' — CRUD empresas + seleccionarEmpresa
  acciones-*.ts               # 'use server' — una por dominio (entregas, unidades, expediente,
                              #   inspecciones, ejecutar-inspeccion, plan, indicadores…)
  graficos.tsx                # BarrasHorizontales, Columnas, Panel (gráficos con divs)
  pdf/                        # ActaEntrega, InformeInspeccion, DocumentoAsistencia,
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

Incluye: catálogo con foto, ingreso, **entregas con firma + acta PDF**, **firma remota** (`/d/[token]`), **devoluciones** (compara estado entrega vs devolución), **alertas** (por vencer / bajo mínimo / de retirados / garantías), **matriz de dotación** (vigencia por empleado × artículo), **kardex Excel** con saldo corrido, **carga masiva de unidades** desde Excel, y **expediente del empleado** (cruza formación + EPP + equipos con un veredicto "Al día / Requiere atención").

### Inspecciones y auditorías (fases 1–8; falta solo la notificación por correo)
- **Banco de plantillas** (listas de verificación) reutilizables entre empresas. **11 plantillas precargadas** (Extintores NTC 2885, Botiquines Res. 0705/2007, Camillas, Orden y aseo, Señalización NTC 1461, Rutas de evacuación, Arnés/alturas Res. 4272/2021, Escaleras ANSI A14, Herramienta eléctrica, EPP en uso, Estándares mínimos SG-SST Res. 0312/2019) = **121 criterios, 59 críticos**. Editables; se pueden duplicar y adaptar. Vista lista/tarjetas.
- **Ejecución**: un criterio por pantalla (pensado para el celular en planta), hallazgo + foto solo al marcar "no cumple", cierre con firmas.
- **Veredicto**: puntaje (excluye "no aplica") + `cumple` (un crítico incumplido reprueba, sin importar el puntaje).
- **Informe PDF** con membrete, veredicto, detalle por sección, evidencia fotográfica y firmas.
- **Plan de acción** (`acciones_correctivas`): genera acciones desde los hallazgos, con responsable/fecha/severidad; cerrar exige quién verificó.
- **Indicadores**: cumplimiento por tipo, tendencia mensual, **hallazgos recurrentes**, objetos con más hallazgos, estado del plan.
- **Programación (fase 8)**: `inspeccion_programaciones` con frecuencia y próxima fecha; al ejecutar una inspección se llama `cumplir_programacion`, que corre la fecha. Los vencimientos se muestran en pantalla; **la notificación por correo está pendiente**.
- **Plan de acción agrupado por inspección** en la vista de acciones.

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

### Manual de uso (`/panel/manual`)
Nueve submanuales, uno por módulo, con figuras dibujadas (no capturas: una captura envejece con
el primer cambio de estilo). `Figuras.tsx` da las piezas — `Ventana`, `Flujo`, `Decision`,
`Jerarquia`, `Regla`, `Ojo` — y `contenido.tsx` el texto. Se entra desde el botón **Manual**,
junto a *Salir*. Cada submanual responde: para qué sirve → cómo se hace → **por qué se comporta
así**; ese tercer punto es el que evita las preguntas de soporte.

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

19. **Los invariantes de emisión van en triggers, no repetidos en cada función.** La nomenclatura
    se estampa al emitir desde un trigger por tabla: cualquier camino nuevo que emita el documento
    queda cubierto sin acordarse de copiar la línea. Es lo contrario del error del §6 con la firma
    del responsable, que solo se copiaba en `activar_capacitacion`.
20. **La clave de servicio solo vive en el servidor.** `lib/supabase/admin.ts` salta RLS por
    completo, así que solo puede importarse desde Server Actions o Route Handlers, nunca desde
    un componente `'use client'`. La alternativa al registro directo —apagar la confirmación de
    correo del proyecto— habría dejado sin verificación **también** al registro por correo.

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
| Reportar "dos capacitaciones activas" como anomalía | El límite de una activa es **por empresa**, no por organización: mirar el total ignora la frontera de trabajo |

---

## 7. Protocolo de verificación pre-entrega (5 comprobaciones)

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
```

`capacitaciones`, `inspecciones` y `entregas` llevan además **`encabezado_config` jsonb** (el congelado del §5.14).

Funciones clave por dominio:
- **Base:** `mi_org_id()`, `siguiente_codigo`, `puede_crear_empresa`, `slug_empresa_libre`, `sugerir_slug_empresa`.
- **Dotación:** `existencias`, `crear_entrega`, `firmar_entrega`, `firmar_entrega_publica`, `matriz_dotacion`, `expediente_empleado`, `kardex_dotacion`, `devolver_item`.
- **Capacitaciones:** `activar_capacitacion` (copia firma y congela encabezado), `empleados_con_participacion(p_activos)`, `convocar_empleados`, `matriz_capacitaciones`, `resumen_empresas` (trae `proxima`), `calendario`, `trayectoria_profesional`.
- **Inspecciones:** `crear_inspeccion`, `guardar_respuesta_inspeccion`, `cerrar_inspeccion`, `detalle_inspeccion`, `listar_inspecciones`, `sembrar_plantillas_inspeccion`, `programar_inspeccion`, `listar_programaciones`, `cumplir_programacion`.
- **Plan e indicadores:** `crear_accion`, `generar_acciones_inspeccion`, `actualizar_accion`, `listar_acciones`, `indicadores_inspecciones`.
- **Público (`SECURITY DEFINER` + `grant … to anon`):** `capacitacion_activa_publica`, `entrega_publica`, `evaluacion_publica`, `verificar_empleado`, `registrar_asistencia_con_evaluacion`.

---

## 9. Pendientes por hacer

### Inmediato — verificar en Vercel
- **Añadir `SUPABASE_SERVICE_ROLE_KEY`** (Supabase → Settings → API → `service_role`) en Vercel y en
  `.env.local`, y redeployar. Sin ella `/registro/directo` responde con el aviso correspondiente y
  no crea cuentas. Es secreta: nunca en el repo ni con prefijo `NEXT_PUBLIC_`.
- Verificar que las **variables de entorno** estén en Vercel (scope Production) y **redeployar** tras cambiarlas.
- **Probar de extremo a extremo las tres descargas de `/api/excel/*`**: se validó la forma de los datos contra la base y compilan, pero no se ejecutaron con sesión real.

### Notificaciones (el eslabón que falta)
Los recordatorios de inspecciones programadas y el aviso a los responsables de acciones correctivas siguen sin enviarse. Requiere decidir si se agrega **`correo` a `empleados`**.

### Usuarios B2B de solo consulta (analizado, sin implementar)
Enfoque recomendado (**C**): `usuarios` gana `rol='cliente'` + `empresa_id`, y `mi_org_id()` añade `and rol <> 'cliente'` para que **las 117 políticas fallen cerradas** ante un cliente; el acceso se da solo por funciones `SECURITY DEFINER` acotadas. En `planes`: `max_clientes_por_empresa` (0 básico / 1 pro / ilimitado enterprise) y `clientes_descargan` (solo enterprise). **Obstáculo:** falta `SUPABASE_SERVICE_ROLE_KEY` en Vercel, o hay que invitar por correo con Resend.
**Pendiente de confirmar con Iván:** si se acepta el enfoque C (tocar `mi_org_id()`) y qué ve exactamente un cliente — el mínimo defendible sería sus capacitaciones con asistentes, sus inspecciones con veredicto y su plan de acción.

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