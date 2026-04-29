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
- `index.html` — Public ticketera. Mercado Pago buttons (general $6500 → mpago.la/2XYLdAb, VIP $12980 → mpago.la/14hhewp) + transfer fallback. Generates client-side token `ISM-NNNN-AA` per sale. Live FOMO banner with real confirmed sales + synthetic rotation. Tracks RRPP click on `?ref=` once per session.
- `admin.html` — Tabbed dashboard. Live stats + capacity bar + CSV export. Cash-register beep on every new confirmed sale (toggle in header, persisted in localStorage). RRPP card shows clicks + conversion rate (confirmed sales / clicks).
- `scanner.html` — Door validation. Accepts both EGRESANTOS QR tokens (`ISM-NNNN-AA`, optionally prefixed `EGRESANTOS:`) and Argentine DNI PDF417. Manual entry accepts either format.
- `success.html` — Customer ticket page (`?token=ISM-NNNN-AA`). Subscribes by token. Shows pending state with WhatsApp-to-productora button while `estado=pendiente`. Once confirmed: renders QR (encodes `EGRESANTOS:TOKEN`), live ticking clock + date (anti-screenshot), "Recibir por WhatsApp" to productora (+5493888532881), "Enviar a amigo" if cantidad>1.

### Firestore schema
- `config/event` — title, organizer, eventDate, eventTime, date, location, googleMapsUrl, publico, cupoMaximo, description, priceGeneral, priceVIP, titular, alias, cvu, whatsapp, instagram, bannerUrl.
- `config/rrpp` — `{ list: string[] }` promoter names.
- `config/rrpp_clicks` — `{ [PROMOTER_NAME]: number }` click counters (incremented from index.html).
- `ventas` — { nombre, dni, tipo, cantidad, general, vip, total, promotor, evento, estado (pendiente|confirmada|ingresado), token (ISM-NNNN-AA), metodo (pendiente|mercadopago), mpClickedAt, createdAt, ingresadoAt }.

### Tech
Tailwind CDN, Firebase v10, qrcode.js (CDN). Inter italic 900, magenta #c2007e, dark #0a0a0a glassmorphism.
