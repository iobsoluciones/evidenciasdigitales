# Rúbrica

**Evidencia firmada para el SG-SST.**

Plataforma SaaS multiempresa de HSEQ / SST: un consultor administra desde aquí el
Sistema de Gestión de Seguridad y Salud en el Trabajo de todas sus empresas cliente.
Todo el producto gira alrededor de una idea — **capturar firmas que sirvan como
prueba** ante una ARL o una auditoría — y de una regla: quien firma no tiene que
estar delante de ti, así que toda firma se puede pedir por enlace al correo y todo
documento firmado sale en PDF.

Construida por **Iván Ocón Barrios — IOB Soluciones** (Bogotá, Colombia).

## Cómo se levanta

```bash
npm install
npm run dev
```

Abre <http://localhost:3000>.

Variables de entorno (en `.env.local` para desarrollo y en Vercel para producción):

| Variable | Para qué |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` · `NEXT_PUBLIC_SUPABASE_ANON_KEY` | conexión a Supabase |
| `NEXT_PUBLIC_APP_URL` | dominio con el que se arman los enlaces de firma |
| `RESEND_API_KEY` · `RESEND_FROM` | envío de correos |
| `SUPABASE_SERVICE_ROLE_KEY` | **secreta**, solo servidor: registro directo y cron |
| `CRON_SECRET` | **secreta**: sin ella el cron de recordatorios se niega a correr |

Las `NEXT_PUBLIC_*` se incrustan **en el build**: si cambian, hay que redeployar.

## Stack

Next.js 16 (App Router, Server Actions) · TypeScript · Supabase (PostgreSQL + RLS +
Storage) · `@react-pdf/renderer` · SheetJS · Resend · Vercel.
Estilos **en línea**, sin Tailwind.

## Documentación

- [`CLAUDE.md`](CLAUDE.md) — contexto del proyecto, decisiones de arquitectura y
  convenciones. **Es el documento que hay que leer antes de tocar código.**
- [`docs/DOCUMENTACION-TECNICA.md`](docs/DOCUMENTACION-TECNICA.md) — inventario de
  lo implementado y deuda técnica.
- [`docs/PLAN-DE-TRABAJO.md`](docs/PLAN-DE-TRABAJO.md) — ruta de trabajo por fases.
- Manual de uso para el usuario final: dentro de la aplicación, en `/panel/manual`.
