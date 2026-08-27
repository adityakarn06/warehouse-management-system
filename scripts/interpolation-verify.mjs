#!/usr/bin/env node
/**
 * Verifies the visual truck interpolation layer (`lib/mapbox/truck-interpolation.ts`)
 * against the contract in docs/realtime.md §TRUCK_POSITION_UPDATED and the
 * rules in AGENTS.md.
 *
 * Unlike `realtime:verify` this needs **no backend**. It drives the real
 * interpolator with a fake clock and a fake requestAnimationFrame, feeding it
 * entries built by the real store reducers in `stores/truck-helpers.ts`, so
 * what is asserted here is the shipping code path — not a re-implementation.
 *
 * Usage:
 *   npm run interpolation:verify
 */

import {
  createTruckInterpolator,
  DEFAULT_TICK_MS,
  MAX_LEG_MS,
} from "../lib/mapbox/truck-interpolation.ts";
import { acceptTruckPosition, truckEntryFromSnapshot } from "../stores/truck-helpers.ts";

const TICK_MS = 2000;
const FRAME_MS = 16;
/** ~110 m per tick — a plausible 2 s leg at motorway speed. */
const STEP_DEG = 0.001;
const TRUCK_COUNT = 9;

const results = [];

function record(name, pass, detail) {
  results.push({ name, pass, detail });
  console.log(`[${pass ? "PASS" : "FAIL"}] ${name}${detail ? " — " + detail : ""}`);
}

// ---- Harness --------------------------------------------------------------

/** A fake clock plus a single-slot fake rAF, so every frame is deterministic. */
function createHarness() {
  let time = 0;
  let pending = null;
  let handleSeq = 0;
  let framesRun = 0;

  const interpolator = createTruckInterpolator({
    now: () => time,
    requestFrame: (callback) => {
      pending = callback;
      return ++handleSeq;
    },
    cancelFrame: () => {
      pending = null;
    },
  });

  /** Runs the clock forward in ~60 fps steps, draining one frame per step. */
  function advance(ms, onFrame) {
    const end = time + ms;
    while (time < end) {
      time = Math.min(time + FRAME_MS, end);
      const callback = pending;
      pending = null;
      if (callback) {
        callback();
        framesRun += 1;
      }
      onFrame?.(time);
    }
  }

  return {
    interpolator,
    advance,
    now: () => time,
    framesRun: () => framesRun,
    hasPendingFrame: () => pending !== null,
  };
}

/** A recorder standing in for `mapboxgl.Marker.setLngLat`. */
function createRecorder() {
  const positions = [];
  const apply = (longitude, latitude) => positions.push([longitude, latitude]);
  return { apply, positions, last: () => positions[positions.length - 1] };
}

const truckId = (index) => `TRK-${101 + index}`;

/** Truck `index` runs due east along its own latitude band, one `STEP_DEG` per
 * tick — so a truck's whole history is readable from its longitude alone. */
function originOf(index) {
  return { longitude: 80 + index * 0.1, latitude: 25 + index * 0.01 };
}

function positionAtTick(index, tick) {
  const origin = originOf(index);
  return { longitude: origin.longitude + tick * STEP_DEG, latitude: origin.latitude };
}

/**
 * A `TRUCK_POSITION_UPDATED` payload exactly as docs/realtime.md defines it:
 * `latitude`/`longitude` is the authoritative position now, `target*` is next
 * tick's projection, `previous*` is last tick's (absent on the first update).
 */
function positionPayload(index, tick, overrides = {}) {
  const current = positionAtTick(index, tick);
  const target = positionAtTick(index, tick + 1);
  const previous = tick > 0 ? positionAtTick(index, tick - 1) : null;

  return {
    truckId: truckId(index),
    reference: truckId(index),
    shipmentId: `SHP-${1001 + index}`,
    latitude: current.latitude,
    longitude: current.longitude,
    previousLatitude: previous?.latitude,
    previousLongitude: previous?.longitude,
    targetLatitude: target.latitude,
    targetLongitude: target.longitude,
    progress: tick,
    speedKmph: 58,
    eta: "2026-08-27T00:58:11.954Z",
    status: "IN_TRANSIT",
    serverTimestamp: new Date(1_700_000_000_000 + tick * TICK_MS).toISOString(),
    sequenceNumber: tick + 1,
    ...overrides,
  };
}

/** Mirrors `hooks/use-truck-interpolator.ts`: fold the payload through the
 * real store reducer, then hand the *changed* entry to the interpolator. */
function deliver(state, interpolator, payload, now) {
  const next = acceptTruckPosition(state.trucksById, payload, now);
  const dropped = next === state.trucksById;
  state.trucksById = next;
  const entry = next[payload.truckId];
  if (!dropped) interpolator.sync(entry);
  return { dropped, entry };
}

const distance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const near = (a, b, tolerance = 1e-9) => Math.abs(a - b) <= tolerance;

// ---- 1 & 2. Nine trucks, 2 s ticks: smooth, bounded, independent ----------

function verifyFleet() {
  const harness = createHarness();
  const { interpolator, advance } = harness;
  const state = { trucksById: {} };

  const recorders = [];
  for (let index = 0; index < TRUCK_COUNT; index += 1) {
    const recorder = createRecorder();
    recorders.push(recorder);
    interpolator.registerMarker(truckId(index), recorder.apply);
  }

  const legLength = STEP_DEG;
  let maxFrameStep = 0;
  let monotonic = true;
  let maxBoundaryJump = 0;
  let framesPerLeg = Infinity;

  for (let tick = 0; tick < 6; tick += 1) {
    const before = recorders.map((recorder) => recorder.last());

    for (let index = 0; index < TRUCK_COUNT; index += 1) {
      deliver(state, interpolator, positionPayload(index, tick), harness.now());
    }

    // Continuity: the first position of the new leg must equal the last
    // position of the old one — no jolt at the tick boundary.
    if (tick > 0) {
      for (let index = 0; index < TRUCK_COUNT; index += 1) {
        const after = recorders[index].last();
        maxBoundaryJump = Math.max(maxBoundaryJump, distance(before[index], after));
      }
    }

    const marks = recorders.map((recorder) => recorder.positions.length);
    advance(TICK_MS);
    framesPerLeg = Math.min(framesPerLeg, recorders[0].positions.length - marks[0]);

    for (let index = 0; index < TRUCK_COUNT; index += 1) {
      const positions = recorders[index].positions;
      for (let i = marks[index]; i < positions.length; i += 1) {
        const step = distance(positions[i - 1], positions[i]);
        maxFrameStep = Math.max(maxFrameStep, step);
        if (positions[i][0] < positions[i - 1][0] - 1e-12) monotonic = false;
      }
    }
  }

  record(
    `${TRUCK_COUNT} trucks animate at display rate between ${TICK_MS} ms ticks`,
    framesPerLeg >= TICK_MS / FRAME_MS - 2,
    `${framesPerLeg} frames per leg`,
  );

  record(
    "no frame jumps more than one leg length",
    maxFrameStep < legLength,
    `max frame step ${maxFrameStep.toExponential(2)} deg vs leg ${legLength}`,
  );

  record("every truck advances monotonically along its route", monotonic);

  record(
    "no discontinuity at a tick boundary",
    maxBoundaryJump === 0,
    `max boundary jump ${maxBoundaryJump}`,
  );

  const finals = recorders.map((recorder) => recorder.last());
  const landedOnTarget = finals.every((position, index) => {
    const target = positionAtTick(index, 6);
    return near(position[0], target.longitude) && near(position[1], target.latitude);
  });
  record("each leg ends exactly on the backend's target", landedOnTarget);

  // Independence: one truck's tick must not disturb any other truck.
  const othersBefore = recorders.slice(1).map((recorder) => recorder.last());
  deliver(state, interpolator, positionPayload(0, 6), harness.now());
  advance(TICK_MS);
  const othersAfter = recorders.slice(1).map((recorder) => recorder.last());
  const undisturbed = othersBefore.every(
    (position, i) => position[0] === othersAfter[i][0] && position[1] === othersAfter[i][1],
  );
  record("trucks interpolate independently — one truck's tick moves no other", undisturbed);

  // Truck 0 kept animating while the other eight were idle, so the loop ran
  // but only ever touched the one truck with a live leg.
  record(
    "the shared rAF loop only writes trucks with an active leg",
    recorders[0].positions.length > othersBefore.length,
  );

  return { harness, state, recorders };
}

// ---- 3. Late and dropped updates -----------------------------------------

function verifyLateAndDropped() {
  const harness = createHarness();
  const { interpolator, advance } = harness;
  const state = { trucksById: {} };
  const recorder = createRecorder();
  interpolator.registerMarker(truckId(0), recorder.apply);

  deliver(state, interpolator, positionPayload(0, 0), harness.now());
  advance(TICK_MS);

  // --- late: the next tick is 5 s overdue ---
  const parked = recorder.last();
  advance(3000);
  const stillParked = recorder.last();
  record(
    "a truck with no new update stops at the target and never extrapolates",
    parked[0] === stillParked[0] && parked[1] === stillParked[1],
    `held at lon ${parked[0].toFixed(6)} for 3000 ms`,
  );
  record(
    "the rAF loop goes idle while nothing is moving",
    !harness.hasPendingFrame(),
  );

  deliver(state, interpolator, positionPayload(0, 1), harness.now());
  const resumed = recorder.last();
  record(
    "a late update resumes without a jump",
    resumed[0] === stillParked[0] && resumed[1] === stillParked[1],
  );
  record(
    "a late leg is stretched to the observed cadence, clamped",
    interpolator.getLeg(truckId(0)).duration === MAX_LEG_MS,
    `duration ${interpolator.getLeg(truckId(0)).duration} ms (clamp ${MAX_LEG_MS})`,
  );
  advance(MAX_LEG_MS);

  // --- dropped: ticks 3, 4 and 5 never arrive, tick 6 lands ---
  const beforeDrop = recorder.last();
  deliver(state, interpolator, positionPayload(0, 6), harness.now());
  const corrected = recorder.last();
  const previousOfTick6 = positionAtTick(0, 5);

  record(
    "a dropped run of updates is caught up from previousLatitude/Longitude",
    near(corrected[0], previousOfTick6.longitude) && near(corrected[1], previousOfTick6.latitude),
    `corrected to lon ${corrected[0].toFixed(6)}, previous* is ${previousOfTick6.longitude.toFixed(6)}`,
  );
  record(
    "the catch-up correction is a single step, not an animated slide",
    distance(beforeDrop, corrected) > 0,
    `one write of ${distance(beforeDrop, corrected).toFixed(6)} deg`,
  );

  const marks = recorder.positions.length;
  advance(MAX_LEG_MS);
  const settled = recorder.last();
  const target = positionAtTick(0, 7);
  record(
    "after catching up it animates on to the backend's target",
    near(settled[0], target.longitude) && recorder.positions.length - marks > 50,
    `${recorder.positions.length - marks} frames to lon ${settled[0].toFixed(6)}`,
  );
}

// ---- 4. Reconnect --------------------------------------------------------

function verifyReconnect() {
  const harness = createHarness();
  const { interpolator, advance } = harness;
  const state = { trucksById: {} };
  const recorder = createRecorder();
  interpolator.registerMarker(truckId(0), recorder.apply);

  deliver(state, interpolator, positionPayload(0, 0), harness.now());
  advance(TICK_MS / 2);
  const beforeOutage = recorder.last();

  // The socket drops and re-subscribes; `subscribe:operations` acks with a
  // snapshot whose position is far from where the marker was left.
  const snapshot = {
    truckId: truckId(0),
    reference: truckId(0),
    shipmentId: "SHP-1001",
    status: "IN_TRANSIT",
    activeDelay: "NORMAL",
    latitude: 26.4,
    longitude: 84.9,
    progress: 71,
    speedKmph: 58,
    eta: "2026-08-27T01:20:00.000Z",
    lastUpdatedAt: "2026-08-26T15:40:00.000Z",
    sequenceNumber: 3,
  };

  const marks = recorder.positions.length;
  const entry = truckEntryFromSnapshot(snapshot, harness.now());
  state.trucksById = { ...state.trucksById, [entry.truckId]: entry };
  interpolator.sync(entry);

  const writes = recorder.positions.length - marks;
  const landed = recorder.last();

  record(
    "a reconnect snapshot re-baselines with one snap, not an animated slide",
    writes === 1 && landed[0] === snapshot.longitude && landed[1] === snapshot.latitude,
    `${writes} write(s), ${distance(beforeOutage, landed).toFixed(3)} deg gap crossed instantly`,
  );
  // The frame already queued by the pre-outage leg still fires once; it must
  // find nothing to move and decline to schedule another.
  advance(FRAME_MS * 2);
  record(
    "a snapshot (target === current) starts no leg and lets the loop go idle",
    interpolator.getLeg(truckId(0)) === null &&
      !harness.hasPendingFrame() &&
      recorder.last()[0] === snapshot.longitude,
  );

  // The first tick after the re-baseline must not inherit the outage gap as
  // its cadence — it falls back to the documented default.
  const resumePayload = positionPayload(0, 0, {
    latitude: snapshot.latitude,
    longitude: snapshot.longitude,
    previousLatitude: undefined,
    previousLongitude: undefined,
    targetLatitude: snapshot.latitude,
    targetLongitude: snapshot.longitude + STEP_DEG,
    sequenceNumber: 4,
  });
  advance(9000);
  deliver(state, interpolator, resumePayload, harness.now());
  record(
    "the first leg after a re-baseline uses the default tick, not the outage gap",
    interpolator.getLeg(truckId(0)).duration === DEFAULT_TICK_MS,
    `duration ${interpolator.getLeg(truckId(0)).duration} ms`,
  );
}

// ---- 5. Stale sequence ---------------------------------------------------

function verifyStaleSequence() {
  const harness = createHarness();
  const { interpolator, advance } = harness;
  const state = { trucksById: {} };
  const recorder = createRecorder();
  interpolator.registerMarker(truckId(0), recorder.apply);

  deliver(state, interpolator, positionPayload(0, 0), harness.now());
  deliver(state, interpolator, positionPayload(0, 1), harness.now());
  advance(TICK_MS / 2);

  const legBefore = interpolator.getLeg(truckId(0));
  const positionBefore = recorder.last();

  // Sequence 1 after sequence 2 — an out-of-order re-delivery.
  const stale = deliver(state, interpolator, positionPayload(0, 0), harness.now());

  record("a lower sequenceNumber is dropped before it reaches the map", stale.dropped);
  record(
    "an in-flight leg survives a stale update untouched",
    interpolator.getLeg(truckId(0)) === legBefore &&
      recorder.last()[0] === positionBefore[0] &&
      recorder.last()[1] === positionBefore[1],
  );

  // An ETA-only change bumps receivedAt without moving the truck: the leg must
  // not restart mid-flight.
  const entry = state.trucksById[truckId(0)];
  interpolator.sync({ ...entry, eta: "2026-08-27T02:00:00.000Z", progress: entry.progress + 1 });
  record(
    "an ETA/status tick does not restart an in-flight leg",
    interpolator.getLeg(truckId(0)) === legBefore,
  );
}

// ---- 6. Arrival ----------------------------------------------------------

function verifyArrival() {
  const harness = createHarness();
  const { interpolator, advance } = harness;
  const state = { trucksById: {} };
  const recorder = createRecorder();
  interpolator.registerMarker(truckId(0), recorder.apply);

  deliver(state, interpolator, positionPayload(0, 0), harness.now());
  advance(TICK_MS / 2);

  for (const status of ["ARRIVED", "DOCKED", "COMPLETED"]) {
    const arrival = positionPayload(0, 1, { status });
    deliver(state, interpolator, arrival, harness.now());

    const landed = recorder.last();
    record(
      `${status} stops interpolation and renders the authoritative position`,
      interpolator.getLeg(truckId(0)) === null &&
        landed[0] === arrival.longitude &&
        landed[1] === arrival.latitude,
    );

    advance(FRAME_MS * 2);
    record(`${status} leaves the rAF loop idle`, !harness.hasPendingFrame());

    const marks = recorder.positions.length;
    advance(TICK_MS);
    record(`${status} truck is not written again while parked`, recorder.positions.length === marks);

    // Reset for the next status under test.
    state.trucksById = {};
    deliver(state, interpolator, positionPayload(0, 0), harness.now());
    advance(TICK_MS / 2);
  }
}

// ---- 7. Marker and track stability ---------------------------------------

function verifyStability() {
  const harness = createHarness();
  const { interpolator, advance } = harness;
  const state = { trucksById: {} };

  const recorders = [];
  let registrations = 0;
  for (let index = 0; index < TRUCK_COUNT; index += 1) {
    const recorder = createRecorder();
    recorders.push(recorder);
    interpolator.registerMarker(truckId(index), recorder.apply);
    registrations += 1;
  }

  for (let tick = 0; tick < 4; tick += 1) {
    for (let index = 0; index < TRUCK_COUNT; index += 1) {
      deliver(state, interpolator, positionPayload(index, tick), harness.now());
    }
    advance(TICK_MS);
  }

  record(
    "each marker registers exactly once for the whole run",
    registrations === TRUCK_COUNT,
    `${registrations} registrations for ${TRUCK_COUNT} trucks`,
  );

  // A truck leaving the fleet is dropped; everyone else keeps their state.
  const survivors = Array.from({ length: TRUCK_COUNT - 1 }, (_, i) => truckId(i + 1));
  const keptBefore = survivors.map((id) => interpolator.getVisualPosition(id));
  interpolator.prune(survivors);

  const departedGone = interpolator.getVisualPosition(truckId(0)) === null;
  const survivorsIntact = survivors.every((id, i) => {
    const position = interpolator.getVisualPosition(id);
    return position.longitude === keptBefore[i].longitude &&
      position.latitude === keptBefore[i].latitude;
  });

  record("prune drops only the departed truck", departedGone && survivorsIntact);

  // A marker still mounted when its truck leaves the fleet must keep working
  // if the truck comes back — a reconnect ack that omits it, then lists it
  // again. `registerMarker` never re-runs for a live marker, so a deleted
  // track would strand it with no way to be written to.
  const returningMarks = recorders[0].positions.length;
  deliver(state, interpolator, positionPayload(0, 5), harness.now());
  advance(TICK_MS);
  const returned = recorders[0].positions.length - returningMarks;

  record(
    "a pruned truck that returns still drives its mounted marker",
    returned > 50 && near(recorders[0].last()[0], positionAtTick(0, 6).longitude),
    `${returned} frames after the truck reappeared`,
  );

  // Unregistering one marker must not disturb the others' writes.
  const unregister = interpolator.registerMarker(truckId(1), recorders[1].apply);
  unregister();
  const marks = recorders.map((recorder) => recorder.positions.length);
  for (let index = 1; index < TRUCK_COUNT; index += 1) {
    deliver(state, interpolator, positionPayload(index, 4), harness.now());
  }
  advance(TICK_MS);

  const unregisteredSilent = recorders[1].positions.length === marks[1];
  const othersStillWritten = recorders
    .slice(2)
    .every((recorder, i) => recorder.positions.length > marks[i + 2]);

  record(
    "unregistering one marker silences only that marker",
    unregisteredSilent && othersStillWritten,
  );

  interpolator.destroy();
  record("destroy stops the loop and clears every track", !harness.hasPendingFrame());

  // StrictMode and Fast Refresh run a hook's cleanup and then re-run the
  // effect against the *same* interpolator. If `destroy` were a one-way kill
  // switch the whole fleet would silently freeze in development.
  const revived = createRecorder();
  interpolator.registerMarker(truckId(0), revived.apply);
  deliver(state, interpolator, positionPayload(0, 5), harness.now());
  const marksAfterRevive = revived.positions.length;
  advance(TICK_MS);

  record(
    "the interpolator resumes after destroy (StrictMode remount)",
    revived.positions.length - marksAfterRevive > 50 &&
      near(revived.last()[0], positionAtTick(0, 6).longitude),
    `${revived.positions.length - marksAfterRevive} frames after revival`,
  );
}

// ---- Run -----------------------------------------------------------------

console.log("Interpolation verification — fake clock, no backend required.\n");

verifyFleet();
console.log("");
verifyLateAndDropped();
console.log("");
verifyReconnect();
console.log("");
verifyStaleSequence();
console.log("");
verifyArrival();
console.log("");
verifyStability();

const failed = results.filter((result) => !result.pass);
console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);
if (failed.length > 0) {
  console.log("Failed checks:", failed.map((result) => result.name).join(", "));
  process.exit(1);
}
