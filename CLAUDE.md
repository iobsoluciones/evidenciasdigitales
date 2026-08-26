# Rúbrica — Contexto del proyecto

> Documento de referencia para Claude Code. Describe el estado del proyecto, sus decisiones de arquitectura y sus convenciones. **Léelo completo antes de tocar código.**

---

## 1. Nombre y propósito

**Rúbrica** (nombre anterior de la carpeta: `crm-asistencia`).

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

`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_APP_URL`, `RESEND_API_KEY`, `RESEND_FROM`.

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
    capacitaciones/           # listado, creación, evaluación, indicadores, matriz
    dotacion/                 # inventario EPP+equipos unificado
      [id]/                   # ficha de artículo + carga masiva de unidades
      entregas/[id]/          # entregas con firma + acta PDF
      devoluciones/, alertas/, matriz/
    inspecciones/             # módulo de inspecciones y auditorías
      plantillas/[id]/        # banco de listas + editor de criterios
      [id]/                   # ejecución (un criterio por pantalla) + veredicto
      nueva/, indicadores/
    acciones/                 # plan de acción (acciones correctivas)
    calendario/, reportes/, configuracion/, perfil/
  r/[slug]/                   # PÚBLICA: registro de asistencia a capacitación (sin sesión)
  d/[token]/                  # PÚBLICA: firma remota de una entrega (sin sesión)
  api/
    pdf-entrega/[id]/         # genera el acta de entrega
    pdf-inspeccion/[id]/      # genera el informe de inspección
    kardex/                   # exporta kardex Excel

lib/
  supabase/servidor.ts        # createServerClient (cookies). Uno nuevo por petición.
  supabase/cliente.ts         # createBrowserClient
  sesion.ts                   # obtenerPerfil()
  empresa-activa.ts           # empresaActiva(), listarEmpresas(), COOKIE_EMPRESA, tipo Empresa
  acciones-empresas.ts        # 'use server' — CRUD empresas + seleccionarEmpresa
  acciones-*.ts               # 'use server' — una por dominio (entregas, unidades, expediente,
                              #   inspecciones, ejecutar-inspeccion, plan, indicadores…)
  graficos.tsx                # BarrasHorizontales, Columnas, Panel (gráficos con divs)
  pdf/                        # ActaEntrega, InformeInspeccion + sus generadores
  excel/                      # generarKardex
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
CRUD, configuración documental (nomenclatura, versión, campos de encabezado), logo, declaración de dotación, exportación. Selector de empresa activa.

### Capacitaciones (completo)
Capacitaciones con participantes; **evaluaciones** con banco de preguntas y subtemas (consolida falencias por subtema); **registro público de asistencia** en `/r/[slug]` con QR; validación contra base de empleados; PDF de acta; indicadores; matriz de capacitaciones por empleado.

### Dotación — EPP + equipos unificados (completo)
Un solo módulo porque el documento de entrega es idéntico. Discriminador `articulos.tipo`:
- `consumible` (EPP): control por cantidad, vence, se repone.
- `retornable` (equipos): control por unidad con serial/placa, se devuelve.

Incluye: catálogo con foto, ingreso, **entregas con firma + acta PDF**, **firma remota** (`/d/[token]`), **devoluciones** (compara estado entrega vs devolución), **alertas** (por vencer / bajo mínimo / de retirados / garantías), **matriz de dotación** (vigencia por empleado × artículo), **kardex Excel** con saldo corrido, **carga masiva de unidades** desde Excel, y **expediente del empleado** (cruza formación + EPP + equipos con un veredicto "Al día / Requiere atención").

### Inspecciones y auditorías (fases 1–7 completas)
- **Banco de plantillas** (listas de verificación) reutilizables entre empresas. **11 plantillas precargadas** (Extintores NTC 2885, Botiquines Res. 0705/2007, Camillas, Orden y aseo, Señalización NTC 1461, Rutas de evacuación, Arnés/alturas Res. 4272/2021, Escaleras ANSI A14, Herramienta eléctrica, EPP en uso, Estándares mínimos SG-SST Res. 0312/2019) = **121 criterios, 59 críticos**. Editables; se pueden duplicar y adaptar. Vista lista/tarjetas.
- **Ejecución**: un criterio por pantalla (pensado para el celular en planta), hallazgo + foto solo al marcar "no cumple", cierre con firmas.
- **Veredicto**: puntaje (excluye "no aplica") + `cumple` (un crítico incumplido reprueba, sin importar el puntaje).
- **Informe PDF** con membrete, veredicto, detalle por sección, evidencia fotográfica y firmas.
- **Plan de acción** (`acciones_correctivas`): genera acciones desde los hallazgos, con responsable/fecha/severidad; cerrar exige quién verificó.
- **Indicadores**: cumplimiento por tipo, tendencia mensual, **hallazgos recurrentes**, objetos con más hallazgos, estado del plan.

### Storage (Supabase)
- Bucket **`logos`** — público (logos de empresa, fotos de artículos, fotos de hallazgos).
- Bucket **`firmas`** — privado (se lee con `createSignedUrl`).
- **El primer segmento de toda ruta de Storage debe ser `org_id`** (lo exige la política de lectura). Para subidas anónimas (firma remota, registro público) hay políticas específicas para `anon`.

---

## 5. Decisiones de arquitectura clave

1. **`org_id` = única frontera RLS.** Toda tabla lo lleva y toda política filtra por `org_id = public.mi_org_id()`. `empresa_id` es solo contexto de trabajo, no de seguridad.
2. **El stock se calcula de los movimientos** (`articulo_movimientos`), no se guarda como columna.
3. **Borrador → firma.** El inventario se descuenta y las unidades se asignan **solo al firmar**, nunca al crear el borrador.
4. **Control documental congelado.** Membrete, nomenclatura, versión, criterios y declaración se **copian** al crear/aplicar (inspección, entrega, acta), no se referencian: si la plantilla o la empresa cambian después, lo ya emitido no se altera.
5. **Ítem crítico incumplido reprueba la inspección completa**, sin importar el puntaje. El veredicto ≠ el porcentaje.
6. **El puntaje excluye lo marcado "no aplica"** (sale del denominador).
7. **Patrón plantilla → instancia** (evaluaciones, capacitaciones, inspecciones): se copia al aplicar.
8. **Objeto polimórfico** en inspecciones: `tipo_objeto` (area/unidad/empresa/otro) + `objeto_id`, no cuatro tablas paralelas.
9. **Estados derivados en lectura, no almacenados.** Ej.: una acción "vencida" se calcula al listar (`fecha_limite < current_date and estado <> 'cerrada'`), no se persiste stale.
10. **Acceso público sin sesión** vía funciones **`SECURITY DEFINER`** (registro de asistencia, firma remota, datos públicos de entrega). El rol `anon` no toca tablas directamente; solo ejecuta esas funciones, que deben tener `grant execute ... to anon`.
11. **`'use server'`**: un archivo con esa directiva **solo puede exportar funciones async**. Tipos, constantes y helpers síncronos van en el componente o como funciones **no exportadas** dentro del mismo archivo.
12. **`key={entity.id}`** en componentes con estado para forzar remount al cambiar de entidad (empresa/inspección).
13. **RLS y GRANT son capas independientes**: ambas deben concederse.

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

---

## 7. Protocolo de verificación pre-entrega (5 comprobaciones)

Aplicar a **cada** cambio de código antes de darlo por terminado — nacieron de errores costosos reales:

1. **No hay `export const/let/var/function` en archivos `'use server'`** (solo exports async).
2. **Los imports coinciden con los exports** del archivo destino (nombre y módulo correctos).
3. **Las props que pasa la página == las que declara el componente.**
4. **Las rutas relativas resuelven** a archivos existentes.
5. **Paréntesis y llaves balanceados** en el JSX.

Además, para PDFs: **renderizar de verdad** (react-pdf) antes de entregar; para funciones de base: **probar la llamada real** con datos y luego limpiar los datos de prueba (sin borrar datos del usuario).

---

## 8. Modelo de datos (tablas principales)

```
organizaciones      # cuenta del consultor (estado, fecha_expiracion = licencia)
empresas            # clientes (slug, activa, color_primario, nomenclatura, version_doc,
                    #   campos_encabezado jsonb, declaracion_dotacion, direccion)
usuarios            # perfil ligado a auth.users
empleados           # personal de cada empresa cliente

# Capacitaciones
capacitaciones · participantes · convocados · preguntas · respuestas

# Dotación
articulos · articulo_unidades · articulo_movimientos
entregas · entrega_items · articulo_mantenimientos

# Inspecciones
inspeccion_plantillas · inspeccion_items
inspecciones · inspeccion_respuestas · acciones_correctivas
```

Funciones clave por dominio: `mi_org_id()`; dotación (`existencias`, `crear_entrega`, `firmar_entrega`, `firmar_entrega_publica`, `matriz_dotacion`, `expediente_empleado`, `kardex_dotacion`); inspecciones (`crear_inspeccion`, `guardar_respuesta_inspeccion`, `cerrar_inspeccion`, `detalle_inspeccion`, `listar_inspecciones`, `sembrar_plantillas_inspeccion`); plan e indicadores (`crear_accion`, `generar_acciones_inspeccion`, `actualizar_accion`, `listar_acciones`, `indicadores_inspecciones`); público (`capacitacion_activa_publica`, `entrega_publica`).

---

## 9. Pendientes por hacer

### Inmediato — despliegue en Vercel
- Verificar que las **5 variables de entorno** estén en Vercel (scope Production) y **redeployar** tras cambiarlas.
- Desplegar la página `app/r/[slug]/page.tsx` endurecida (captura de error + `force-dynamic`).

### Inspecciones — fase 8 (única fase pendiente del módulo)
- **Programación de inspecciones** y **recordatorios** antes del vencimiento.
- Requiere decidir si se agrega **`correo` a `empleados`** para notificar a los responsables de las acciones correctivas (hoy la notificación es el eslabón que falta).

### Proyecto
- **Renombrar la carpeta** `crm-asistencia` → `rubrica` (`Rename-Item crm-asistencia rubrica`; no afecta código). Actualizar nombre de marca en la UI.
- Considerar registrar dominio (`rubrica.co` / `rubricahseq.com` / `rubricasst.co`).

### Backlog de capacitaciones (del documento de ideas del cliente)
Formato imprimible de asistencia (encabezado + hoja de firmas), reportes visuales por mes, exportación Excel de todos los registros, calendario/cronograma con alertas por correo, integración con Meet/Teams, banco de evaluaciones reutilizables, capacitaciones recurrentes/reprogramables, material de enseñanza cargable con modo presentación, cursos precargados, ficha profesional del consultor con firma digital guardada, historial de envío de correos como soporte.

---

## 10. Cómo trabajar en este repo (para Claude Code)

- **Responde y comenta en español.**
- **Estilos inline**, nunca Tailwind ni CSS externo. Paleta base: azul `#14263F`, texto secundario `#5B6470`, bordes `#E4E4DF`; el color de acento sale de `empresa.color_primario`.
- Server Actions en `lib/acciones-*.ts` con `'use server'` (solo exports async).
- Toda tabla nueva: RLS habilitado + 4 políticas (select/insert/update/delete con `org_id = mi_org_id()`) + `grant` a `authenticated`.
- Antes de dar por terminado un cambio, corre mentalmente las **5 comprobaciones del §7**.
- No borres datos del usuario en la base al probar; crea, verifica y limpia solo lo que creaste.

   ## Convenciones de Git
   - Tras cada cambio verificado, crea UN commit con mensaje convencional
     (feat:, fix:, refactor:, docs:).
   - Ejecuta `npm run build` antes de commitear; no commitees si falla.
   - Haz push a GitHub después de cada commit.
   - No incluyas secretos ni .env en los commits.