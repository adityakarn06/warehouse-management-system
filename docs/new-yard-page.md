# `/new-yard` — what the page shows, field by field

The reworked yard page. It answers four operational questions on one screen:

1. **What is the yard doing right now?** — the stat rail across the top.
2. **How much door capacity is left?** — the floating summary, top-left.
3. **How much of the yard holds a door?** — the floating summary, top-right.
4. **What needs attention?** — the four working panels along the bottom.

The isometric render behind all of it (`public/dock-background.png`) is a **fixed
illustration, not a live view**. No truck, door, or position is ever drawn onto
it. It replaced the Mapbox `LiveMap` that used to occupy this slot; the map is
still live on `/dashboard` and `/track`.

Everything below is a backend value rendered as sent. Nothing on this page
computes an ETA, scores a door, picks an assignment, or derives progress
(`AGENTS.md`). The two proportional bars are ratios of counts the backend sent,
drawn for reading only — they are not utilisation figures.

---

## Where the data comes from

Three REST endpoints, all via TanStack Query with `staleTime: Infinity`:

| Endpoint | Hook | Feeds |
| --- | --- | --- |
| `GET /yard/overview` | `useDashboardSnapshot` → `useYardOverview` | stat rail |
| `GET /yard/allocation-summary` | `useAllocationSummary` | both floating summaries, door-mix panel, awaiting-a-door panel |
| `GET /yard/docking-queue` | `useDockingQueue` | docking queue panel |

Schemas: `schemas/yard.schema.ts`. Routes: `lib/api/config.ts:22-24`.

They are never polled. `useSnapshotInvalidation` refetches all three (plus the
dock schedule) **only** after a realtime event that makes one of them
definitionally stale — a truck entering `ARRIVED`/`DOCKED`/`COMPLETED`, an
assignment appearing or disappearing, or a door changing status. Position, ETA,
progress and delay ticks never trigger a refetch; they are field overlays.
Qualifying events are debounced into one refetch per 5s
(`features/yard/use-snapshot-invalidation.ts`).

The alerts panel is the exception: it reads the Zustand alert store, seeded
app-wide from `GET /alerts` by `AlertProvider`, **not** from
`overview.alerts` (which is a trimmed slice).

---

## 1. Stat rail — five counts

`components/new-yard/yard-stat-rail.tsx`, values assembled in
`app/(shell)/new-yard/page.tsx`.

| Tile | Value | Source |
| --- | --- | --- |
| Active trucks | `overview.activeTrucks.length` | REST array length |
| Delayed | count of `activeTrucks` whose status is `DELAYED` | REST rows, **live status overlay** |
| Arriving | same, status `ARRIVING` | REST rows, live status overlay |
| Docked | same, status `DOCKED` | REST rows, live status overlay |
| Active assignments | `overview.summary.activeAssignments` | REST scalar, as sent |

The four truck tiles do **not** read `overview.summary.delayedTrucks` and friends,
even though the payload carries them. `useDashboardKpis` recounts from
`overview.activeTrucks`, preferring each truck's live status from the truck store
over the REST row's, falling back to REST when a truck isn't held live. That is
what lets the tiles move on a socket status transition without a refetch.

The membership being counted is always the REST `activeTrucks` list — never the
live store's own membership, which is narrower ("trucks the loop is advancing").

Bucketing is by the backend's `status` string exactly as sent. There is no
client-invented bucket, and a truck in a status not listed above is simply not
counted by any of the three.

## 2. Dock doors — floating, top-left

`components/new-yard/dock-mix-overlay.tsx`. All from
`allocationSummary.totals.docksByStatus`.

- **Headline**: `docksByStatus.AVAILABLE` out of the sum of all four statuses.
- **Hint**: `docksByStatus.UNAVAILABLE` — "N out of service".
- **Bar**: `AVAILABLE / total`, for reading.
- **Legend rows**: every `DockStatus` in `DOCK_STATUS_ORDER` with its count.

A status with no doors in it may be **absent from the payload object entirely**,
so each key defaults to `0` rather than being assumed present.

> **Caveat worth knowing.** This card's "available doors" figure comes from the
> allocation-summary REST snapshot, so it moves only on refetch.
> `useDashboardKpis` separately exposes a `docksAvailable` that *is* live-overlaid
> from the dock store — but this page does not render it. Between a door changing
> status and the debounced refetch landing, this card can lag the truth by up to
> ~5s. That is a deliberate consequence of sourcing the whole card from one
> snapshot rather than mixing two sources inside it.

### "Manage" — the door board

The card's top-right control opens `DockDoorsSheet`
(`components/new-yard/dock-doors-sheet.tsx`), a right-side sheet listing every
door with its detail and the operator's commands. It is the one action surface
on this page.

Its cards come from `GET /docks` (`useDocks()`), not from the page's
`overview.docks`. The list row is the richer of the two shapes: it carries
`availableFrom` and a full assignment — trailer id, the truck's own status and
ETA, the shipment's priority and load type, `assignedAt`, the backend's score
and its ranking reasons — where `yardDockSchema` carries only a reference pair.

That fetch is **lazy**. The board is a child of the sheet's portal, so it mounts
only while the sheet is open: a page load that never opens it costs no request,
and the filter resets for free on close.

`queryKeys.docks.list` is not in `useSnapshotInvalidation`'s `SNAPSHOT_KEYS` and
has `staleTime: Infinity`, so the snapshot itself does not refetch on a realtime
event. The live dock store overlaid on each card is what keeps status, the
unavailable reason and door occupancy true — the same arrangement `/yard`'s
`DockOperationsBoard` has always run on, and the reason `features/docks/mutations.ts`
deliberately does not invalidate the board it just commanded.

Seeding is `mergeFromSnapshot`, never `hydrateFromSnapshot`: the page's overview
snapshot has already hydrated the store, and replacing the whole map here would
clobber it.

The status filter chips bucket by the **live-overlaid** status, read once at
board level rather than per card, so a door taken down inside the sheet leaves
"Available" immediately rather than on the next refetch. The chip counts are
therefore counted from the door list and can briefly disagree with the card's
own legend behind them, which is counted from `allocation-summary` — the same
~5s window the caveat above describes. Neither number is recomputed from the
other to hide it.

Each card is a full detail card in `/yard`'s `DockCard` idiom (`rounded-lg border
bg-card`), not a collapsed row: code, name and zone, load-type chips, "free
from", then an aligned label/value grid for the booking that holds it. The long
tail — the backend's score, its ranking reasons, and the door's alerts — sits
behind a "More" collapsible, so a door with history does not push the next card
off the screen.

Per-door alerts come from the Zustand alert store filtered on `dockDoorId`
(`useAlertsForDock`, `stores/selectors.ts`), not from `GET /docks/:id` — the
store is seeded app-wide and updates on socket push, so a door's alerts appear
with no refetch. Only the newest five are shown; the rest belong to `/alerts`.

Commands are `DockStatusAction` (`components/docks/dock-status-action.tsx`),
reused from `/yard` unchanged: make unavailable (reason box, confirm dialog,
then the backend's own cascade report), make available (no confirmation — the
backend decides the resulting status), and release door when a booking holds it.
`RESERVED` and `OCCUPIED` get no toggle at all; the frontend only ever sends
`AVAILABLE` or `UNAVAILABLE`.

## 3. Trailer allocation — floating, top-right

`components/new-yard/allocation-overlay.tsx`. From
`allocationSummary.totals`.

- **Headline**: `allocatedTrailers` out of `allocatedTrailers + unallocatedTrailers`.
- **Hint**: either "Every trailer holds a door" or "N still waiting on a door".
- **Bar**: `allocated / total`.

"Allocated" means a **committed** (`ASSIGNED`) assignment. A recommendation is
not an allocation and is never counted here.

Both floating cards only float from the `lg` breakpoint up. Below it they fall
into normal flow above the canvas, because two 16rem cards would blanket the
render they annotate. The thin leader lines out onto the render are decorative
and `aria-hidden` — they point at fixed spots in a fixed illustration.

## 4. Door status mix — bottom panel

`components/new-yard/dock-mix-panel.tsx`. Same `docksByStatus` as the top-left
card, rendered as shape rather than as headline: total door count, one
proportional stacked bar, and a two-column legend.

Zero-count statuses are **dropped from the bar** (a 0%-wide segment renders as a
hairline of the wrong colour) but **kept in the legend**, so a status falling to
zero is still visible as a number.

## 5. Docking queue — bottom panel

`components/new-yard/docking-queue-list.tsx`. From `GET /yard/docking-queue`.

The payload is grouped into arrival windows and pre-sorted by the backend
(window, then priority, then ETA). This panel **flattens every window into one
list** and renders it in the order received.

- **Row number** = position in the flattened list — the order the backend put
  the trucks in, not a ranking computed here. Window boundaries are not shown in
  this rendering; `/yard`'s `DockingQueueBoard` is where the grouping is visible.
- **Reference + trailer id**: `truckReference`, `trailerId`.
- **Second line**: `→ {topRecommendation.dockCode}`, or "No dock recommendation".
  The arrow reads as *proposed for* — a recommendation is a proposal, never a
  booking, and committing one still happens on `/yard`'s recommendations panel.
  `topRecommendation` is `null` both when the scorer excluded every door and when
  scoring that truck failed; the payload does not distinguish the two, so neither
  cause is claimed here.
- **Right edge**: `priority` badge, and `eta` formatted as a countdown against a
  ticking clock. The countdown is a *display format* of the backend's timestamp,
  not a computed ETA.
- **Empty state** quotes the backend's own `horizonMinutes`.

Clicking a row writes to the shared UI store's truck selection — the same
selection the map on other routes reads. With the map gone from this page the
click still records selection but has no visible target here.

## 6. Awaiting a door — bottom panel

`components/new-yard/unallocated-trailers-panel.tsx`. Renders
`allocationSummary.unallocated[]` in the order returned, with a count badge from
`totals.unallocatedTrailers`.

Per row: `truckReference`, `trailerId`, `priority`, and the truck `status` badge.
This is the complement of the queue panel — the queue answers "what is coming",
this answers "what is still waiting".

## 7. Live alerts — bottom panel

`components/new-yard/yard-alerts-panel.tsx` wrapping the shared `AlertFeed`,
capped at 20 rows. Reads the alert store, so it updates on socket push with no
refetch. Rows are colour-tinted by severity; read rows recede but keep their
severity colour. `AlertFeed` carries its own header and mark-all-read control,
which is why this panel deliberately has no title of its own.

---

## Deliberately not shown

The visual reference this page was built from includes two panels that have no
backing endpoint here, and they were not built rather than faked:

- **Shipping forecast** — no forecast endpoint exists; producing one on the
  frontend would be inventing business state.
- **System health** — no infrastructure-health endpoint exists.

The reference's map zoom slider and +/− buttons are also absent: with the live
map removed from this page they would be non-functional chrome.

---

## Layout and styling notes

- The page does **not** use `PageShell`. Its title block would land exactly where
  the top-left summary floats, and `DashboardHeader` already names the app. A
  local `YardCanvas` wrapper (`relative isolate … overflow-hidden`) replaces it;
  `isolate` keeps the backdrop's `-z-10` scoped to this route instead of sliding
  under the app shell.
- The backdrop is served through `next/image` (`fill`, `priority`, `sizes="100vw"`)
  deliberately: the source PNG is ~2.4 MB and the optimiser returns a
  viewport-sized WebP (~121 KB at 1920w).
- A single light scrim (`bg-background/15`, `dark:bg-background/55`) sits over the
  render. Light mode needs almost none — the panels carry legibility themselves;
  dark mode needs a real one, since a bright daylight render under a dark UI is
  the opposite problem.
- All panels share one surface, `glassSurface` in
  `components/new-yard/glass-surface.ts` — mostly-opaque card colour, blurred, a
  faint top-edge highlight, and a soft float shadow. It stays on theme tokens and
  the repo's `xl`-for-floating-overlays radius policy rather than becoming a
  full glassmorphic treatment, so the route still reads as the same product as
  the rest of the app.

## Relationship to `/yard`

`/new-yard` is live alongside the existing `/yard` behind a temporary nav entry
in `components/app-sidebar.tsx`, and `/yard`'s functions are being moved across
to it one surface at a time.

**Moved so far** — the two per-door commands, via the "Manage" sheet on the dock
doors card: the `AVAILABLE`/`UNAVAILABLE` toggle (with its cascade report) and
release. They share `DockStatusAction` with `/yard`'s board, so the two pages
cannot drift apart.

**Still only on `/yard`** — the truck picker and trailer lookup, dock
recommendations and the assignment commit, the reassignment panel, and the dock
schedule. `/yard` remains the only place an assignment is actually made.
