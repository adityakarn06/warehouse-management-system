# `/truck-ops` — what the page shows, field by field

A per-truck operations screen. It answers three questions about one truck on
one page:

1. **What is this truck and what is it carrying?** — the left column.
2. **Where is it right now?** — the render and its live overlay, top right.
3. **Which door should it take, and can I commit it?** — the rail underneath.

Built from the supplied visual reference. It is a re-presentation of endpoints
that already existed — no new backend contract, no new business logic, and no
new query or mutation hook.

Everything below is a backend value rendered as sent. Nothing on this page
computes an ETA, scores a door, ranks a recommendation, or derives progress
(`AGENTS.md`). The one drawn proportion — the dial — is labelled as what it is.

---

## Routes

| Route | File | Purpose |
| --- | --- | --- |
| `/truck-ops` | `app/(shell)/truck-ops/page.tsx` | Searchable roster; a row links into the detail |
| `/truck-ops/[truckId]` | `app/(shell)/truck-ops/[truckId]/page.tsx` | The detail screen |

The segment accepts a truck id, its `reference` (`TRK-101`) or its `trailerId`
(`TRL-101`) — `GET /trucks/:id` tries all three in that order (`flows/api.md`,
"Lookup by id or human reference"). The page validates the segment for *shape*
only (non-empty after decoding) and 404s on a malformed URL; whether a
well-formed identifier exists is the backend's answer, rendered as a not-found
state inside `TruckOpsView`. Same split as `/track/[trackingNumber]`.

Links in come from the sidebar ("Truck Ops"), from each `/fleet` card's "Open
operations" button, and from any `/truck-ops/{reference}` URL.

---

## Where the data comes from

| Endpoint | Hook | Feeds |
| --- | --- | --- |
| `GET /trucks/:id` | `useTruck` | Everything in the left column, the canvas's REST fallback, both activity tabs |
| `GET /shipments/:id` | `useShipment` | `weightKg`, `palletCount`, `description`, lane names — the four fields the truck row's trimmed shipment does not carry |
| `GET /trucks/:id/dock-recommendations` | `useDockRecommendations` | The whole rail |
| `POST /trucks/:id/dock-assignment` | `useAssignDock` | "Assign top recommendation", and each card's "Assign {code}" |
| `POST /docks/:id/release` | `useReleaseDock` via `DockStatusAction` | "Release door" |
| `GET /fleet` | `useFleet` | The roster on the index page |

`useTruck` and `useShipment` carry `staleTime: Infinity` — they are the house
convention for socket-covered reads. `useDockRecommendations` deliberately has
none: the endpoint is documented side-effect free, so the rail's "Re-check"
button can refetch it as often as an operator likes.

### Realtime — two rooms, not one

`TruckOpsView` joins **both** `truck:{id}` (`useTruckSubscription`) and
`operations` (`useOperationsSubscription`).

`subscribe:truck` alone is not enough. `flows/realtime.md` is explicit that
`DOCK_STATUS_CHANGED` is emitted to the operations room **only** — a truck room
learns about a door failure through the `ALERT_CREATED` and `DOCK_REASSIGNED`
that follow it, never the status change itself. This page renders a door's live
status in its command bar, so it needs the room that carries it. Both
subscriptions are ref-counted in `lib/socket/subscriptions.ts`, so joining a
room another mounted view already holds costs nothing.

Subscription uses the **resolved** `truck.id`, not the URL segment: rooms are
always named with canonical ids, and the truck store is keyed the same way.

---

## 1. Truck information — left column, top

`components/truck-ops/truck-information-card.tsx`. Every identity, crew and
route field on the `GET /trucks/:id` row: `driverName`, `driverPhone`,
`reference`, `trailerId`, `id`, `carrier`, `departedAt`, `arrivedAt`,
`lastUpdatedAt`, `createdAt`, and `route`'s `code`, `originName`,
`destinationName`, `distanceKm`, `estimatedDurationMinutes`,
`averageSpeedKmph`.

The reference's **"Change driver"** and **"Edit route"** buttons are not built.
This API exposes no driver or route mutation at all, so they would be dead
controls. The two things an operator can actually do from here take their
place: call the driver on the `driverPhone` the backend sent (a `tel:` link),
and open `/track/{trackingNumber}` for the customer-facing view of the same
shipment.

## 2. Shipment & load — left column, middle

`components/truck-ops/shipment-load-card.tsx`, the reference's "Capacity &
load" slot.

Two sources, because the truck row carries only a trimmed shipment
(`shipmentSummarySchema` + `customerName` + `appointment`): identity, priority,
load type and the appointment come from `GET /trucks/:id`; `weightKg`,
`palletCount`, `description` and the lane names only exist on
`GET /shipments/:id`. The shipment-detail fetch has its **own** state ladder
rather than blocking the card — the truck row above it is already useful
without those four fields.

The appointment renders `windowStart`–`windowEnd`, `expectedDurationMinutes`,
`reference` and `notes`, or states that none is booked (which the scorer treats
as a neutral 15 on `appointmentFit`).

> **The dial is route progress, not load-versus-capacity.**
> The reference reads "48% Weight · 6.5 of 13.5 tons". **No truck capacity field
> exists anywhere in this API** — not on `truckDetailSchema`, not on
> `fleetTruckSchema`, not in `flows/api.md`. Rendering a percentage-of-capacity
> would mean inventing the denominator. So `LoadDonut` shows `progress`, the one
> 0–100 figure the backend does send for a truck, labelled "Route", and the load
> itself sits beside it as the plain figures it is: `formatWeightKg(weightKg)`
> and `palletCount`.

## 3. Activity — left column, bottom

`components/truck-ops/truck-activity-card.tsx`, the reference's "Loading
activity log". Two tabs, because `GET /trucks/:id` returns two distinct
histories and neither subsumes the other.

**Operations.** Each `dockAssignments[]` row is *expanded* into the events it
records — a single row carries up to three instants (`assignedAt`,
`releasedAt`, `reassignedAt`) that happened at different times, and flattening
them is the only way the timeline reads in order. A null instant produces no
event; nothing is inferred. Each assignment event carries `dockDoor.code`,
`dockDoor.name`, `zone`, `score`, the scheduled window, and the backend's own
`reasons[]` verbatim.

Merged into the same list: this truck's alerts, read from the Zustand alert
store via `useAlertsForTruck` (`stores/selectors.ts`). The store is seeded
app-wide from `GET /alerts` by `AlertProvider` and updated on `ALERT_CREATED`,
so a delay or a reassignment appears here with no refetch. Snapshot rows are
included, not just live ones — one truck's own history is exactly what an
operator opening this page is asking for, and it is bounded by the one truck.
Same reasoning as `useAlertsForDock`.

**Movement.** The 20 most recent `locationHistory[]` snapshots, as sent:
`recordedAt`, `progress`, `speedKmph`, `status`, `eta`, and the backend's own
`reason` string for the tick ("rain", "ARRIVED").

Both `truckDockAssignmentSchema.status` and `locationHistoryEntrySchema.status`
are plain `z.string()`, not the enums, so each is **narrowed** before it reaches
a badge (`isAssignmentState`, `truckStatusSchema.safeParse`) and printed as-is
when it falls outside. `COMPLETED` and `CANCELLED` are both real assignment
statuses and neither is an `AssignmentState`.

## 4. The truck canvas — right column, top

`components/truck-ops/truck-canvas.tsx`. `public/active-truck.png` on a card,
with this truck's live figures around it: status badge, delay badge, the door it
holds, the ETA countdown and its absolute time, `speedKmph`, and an
origin → destination progress bar with `distanceKm` and
`estimatedDurationMinutes`.

Every one of those values is live. `useLiveTruckFields` prefers the truck
store's socket-fed `status` / `eta` / `progress` / `speedKmph` over the REST
row, falling back to REST when the truck is not held live;
`useAssignmentForTruck` is the dock store's current-assignment fact. So the
panel moves on a `TRUCK_POSITION_UPDATED` or `DOCK_ASSIGNED` tick with no
refetch. `toMapTruck` (`components/truck-ops/live-truck.ts`) adapts the detail
row to the structural `MapTruck` the overlay hook takes — it renames
`currentLatitude`/`currentLongitude` and nothing else.

The countdown is a *display format* of the backend's `eta` instant, not a
second opinion about it.

> **Nothing is drawn onto the trailer.** The reference sketches a cargo slot
> grid (`A1 · 500kg · SHP-5839`, `B2 · 1,000kg · SHP-4434`). This backend
> carries **one shipment per truck** and no box- or slot-level manifest anywhere
> in `flows/api.md` — slot ids, per-slot weights and per-slot shipment
> references would all have to be invented. So the image stays a fixed
> illustration, exactly as `/new-yard` treats `dock-background.png`, and the
> space around it carries values the backend actually sends.

## 5. Recommended dock assignment — right column, bottom

`components/truck-ops/dock-recommendation-rail.tsx` +
`dock-option-card.tsx`. The whole `GET /trucks/:id/dock-recommendations`
response.

- **Header line**: `requestedWindow.start`–`end` and `minutes` (the slot the
  doors were scored against — the later of ETA and the booked window, plus the
  expected dock time, computed by the backend), `currentAssignment.dockCode` or
  "No dock assigned", and the shipment's `priority` / `loadType`.
- **The rail**: one `DockOptionCard` per entry in `recommendations[]`, **in the
  array order the backend returned**. Rank number, `dockCode`, `dockName`,
  `zone`, `status`, `score`/100, `availableFrom` (or "Now" — `null` means free
  right now, which is the backend's own distinction, not a missing value), the
  `reasons[]` verbatim, and `ScoreBreakdown`.
- **`ScoreBreakdown`** is `components/docks/score-breakdown.tsx` reused
  unchanged, so this rail and `/yard`'s panel cannot disagree about what a score
  means. It encodes no component maximum — sizing each segment as its share of
  the *returned* score, so the bar stays a pure restatement of the response.
- **Exclusions**: a collapsible list of `excluded[]`, each with the backend's own
  sentence. A door that failed a hard filter is never silently dropped.

`DockOptionCard` is a wider sibling of
`components/docks/dock-recommendation-card.tsx` rather than a replacement:
that card is built for `/yard`'s 20rem sidebar and stacks vertically, this one
sits in a horizontally scrolling strip and has room for the detail grid.

### Committing

Two entry points, one mutation (`useAssignDock`):

- **"Assign top recommendation"** in the header posts with **no body**, which
  `flows/api.md` defines as "commit the top-ranked recommendation". The ranking
  stays the backend's; the frontend never names a door it chose itself.
- **"Assign {code}"** on a card posts `{ dockId }`.

The response is a *superset* of the recommendations response
(`dockAssignmentResultSchema` extends it) and `useAssignDock` writes it straight
into the recommendations query key, so the rail re-renders the backend's own
post-commit ranking with no refetch. `created` distinguishes a new row (`201`)
from "the truck already held that door" (`200`), and `previousAssignment.dockCode`
gives the "Moved from D2" line.

Failures render the backend's sentence unedited — a `400` for a named excluded
door quotes the exact exclusion reason, and `dockCommandError`'s `isConflict`
flag (a `409`) is rendered distinctly, with a "Re-check recommendations" button,
rather than as a hard failure.

No optimistic UI. Every response is applied to the store directly rather than
assumed, and the matching socket event re-applies the same fact idempotently.

### Release

`DockStatusAction`, reused from `/yard` and `/new-yard` unchanged, shown only
when the truck actually holds a door. `hasAssignment` is read from the server's
assignment row, never inferred from the door's status.

---

## A cache fix this page forced

`useAssignDock` and `useReleaseDock` (`features/docks/mutations.ts`) previously
invalidated the three yard snapshot keys but **not** `queryKeys.trucks.*`.

Nothing rendered a truck's `dockAssignments` array before this page, so it never
showed. But the truck detail is a fourth view nothing overlays with live Zustand
state: a commit writes a row into `dockAssignments[]` and cancels the one it
superseded, and a release closes one out. Without the invalidation this page's
operations timeline would keep rendering the pre-commit history until something
else evicted the cache. `useAssignDock` now invalidates
`queryKeys.trucks.detail(truckId)`; `useReleaseDock` invalidates
`queryKeys.trucks.all`, since its response names only the door, not the trucks
it freed.

---

## Deliberately not built

Three things in the visual reference have no endpoint behind them, and were left
out rather than faked:

- **The cargo slot grid** — no box/slot manifest exists. See §4.
- **The capacity donut** — no truck capacity field exists. See §2.
- **"Dispatch truck" and "View manifest"** — `flows/api.md` has no dispatch,
  depart or manifest route. The only writes in this domain are the assignment
  commit, the dock status toggle and the release, and the header carries the two
  of those that apply to a truck.

---

## Layout and styling notes

- Unlike `/new-yard`, this page **does** use `PageShell` — it has a real title
  (`{reference} operations`), a subtitle (`{carrier} · Trailer {trailerId}`) and
  a command bar, which is exactly what that shell's `actions` slot is for.
- Body is `grid gap-3 lg:grid-cols-[20rem_1fr]`; below `lg` the two columns
  stack and the left column's cards come first.
- The rail is a plain `overflow-x-auto` container, **not** `ScrollArea`: that
  primitive as wrapped here is vertical-only (its Root renders its own vertical
  scrollbar and takes no `orientation`), and a horizontal strip wants the
  platform scrollbar anyway.
- `LoadDonut` is a hand-rolled `conic-gradient`. There is no charting library in
  this project; `ScoreBreakdown` and `ProgressBar` set that precedent.
- `active-truck.png` is ~2 MB, so it goes through `next/image` with an explicit
  `sizes` and `priority` — the same treatment `YardBackdrop` gives
  `dock-background.png`, and it is this page's largest contentful paint.

## Relationship to `/yard`

`/yard` remains the yard-wide view: the dock board, the schedule, the
reassignment cascade feed, the docking queue. `/truck-ops` is the same
assignment decision seen from **one truck** instead of from the yard, and both
commit through the same `useAssignDock` and the same `DockStatusAction`, so the
two cannot drift apart.
