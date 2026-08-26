<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project conventions (E2: Where's My Truck?)

This is the frontend for a real-time warehouse execution / control-tower system. The backend is already implemented and is the source of truth — see `docs/api.md` (REST contract), `docs/realtime.md` (Socket.IO rooms/events/payloads), and `docs/architecture.md` (system design rationale).

### Directory structure
No `src/` — `app/`, `components/`, `hooks/`, `lib/`, `features/`, `providers/`, `schemas/`, `stores/`, `types/` all live at repo root, aliased via `@/*`.

- `components/ui/` — shadcn primitives + shared presentational primitives (`status-badge`, `empty-state`, `error-state`, `loading-skeleton`).
- `components/layout/` — header/page-shell, the app chrome.
- `components/{dashboard,map,trucks,docks,alerts,tracking}/` — domain-specific presentational components.
- `features/{trucks,shipments,docks,simulation,alerts,tracking}/` — domain hooks/queries/mutations, colocated with their consuming domain.
- `schemas/` — Zod schemas, the source of truth for domain types; `types/` re-exports `z.infer` results for app-facing imports. `types/realtime.ts` is hand-written (not Zod-derived) since validating every high-frequency socket tick is a perf decision, not a compile-time one.
- `stores/` — Zustand stores for client/UI/realtime state only.

### The strict data-layer boundary
- **TanStack Query**: REST fetches, server snapshots, loading/error states, caching. Never used for anything pushed over Socket.IO.
- **Zustand**: UI state (selection, map viewport, command palette), realtime connection state, and *raw* live data as pushed by Socket.IO (live truck positions, live dock status, live alerts). Stores hold exactly the fields the server sends — they format/merge but never invent or derive new domain values.
- **Socket.IO**: transport only. No business logic in socket handlers beyond dispatching payloads into Zustand actions.
- **Mapbox**: rendering only. Reads truck positions from `stores/use-truck-store.ts`; the map component performs client-side interpolation for *animation smoothness* between `current*` and `target*` fields, but this is a rendering interpolation (visual lerp), never fed back as an authoritative position.

### Frontend never computes business state
The backend is the sole source of truth for: truck position, ETA, progress percentage, dock recommendations/scores, and assignment decisions. The frontend must not calculate ETA, compute route progress, choose or score a dock, or invent a dock assignment. `sequenceNumber` from `TRUCK_POSITION_UPDATED` is the per-truck high-water mark; drop any update with a lower sequence than the last applied one, and re-baseline it fresh on every `subscribe:*` snapshot (including reconnects).
