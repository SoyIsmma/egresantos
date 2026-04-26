# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## EGRESANTOS Ticketera (artifacts/egresantos)

Vanilla HTML SPA + admin panel + scanner for nightlife event ticketing in Pocito, San Juan.

### Pages (Vite multi-page)
- `index.html` — Public ticketera. Reads `config/event` via onSnapshot. Sold-out logic disables buy button when `cupoMaximo` reached. NO QR codes; pays via transfer.
- `admin.html` — Tabbed dashboard (Configurar Evento | RRPP | Ventas). Live stats: Recaudado, Tickets, En local, Operaciones, RRPP activos. Capacity progress bar. CSV export with BOM.
- `scanner.html` — Door validation. Login-protected. Camera scanner via html5-qrcode (QR + PDF417 for Argentine DNI). Manual DNI fallback. Updates `estado` to "ingresado" with sound + colored result modal (green ok / red used / yellow not found).

### Firestore schema
- `config/event` — title, organizer, eventDate (YYYY-MM-DD), eventTime (HH:MM), date (computed Spanish label), location, googleMapsUrl, publico, cupoMaximo, description, priceGeneral, priceVIP, titular, alias, cvu, whatsapp, instagram, bannerUrl (Base64 ≤ 700KB).
- `config/rrpp` — `{ list: string[] }` array of promoter names.
- `ventas` — { nombre, dni, tipo, cantidad, general, vip, total, promotor, evento, estado (pendiente|confirmada|ingresado), createdAt, ingresadoAt }.

### Tech
Tailwind CDN, Firebase v10 (Firestore + Auth), Inter italic 900, magenta #c2007e, dark #0a0a0a glassmorphism. RRPP tracking via `?ref=` URL param.
