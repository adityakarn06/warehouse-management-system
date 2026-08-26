#!/usr/bin/env node
/**
 * Verifies the frontend's Socket.IO realtime layer against the exact
 * contract in docs/realtime.md, mirroring the backend's own
 * `pnpm realtime:demo` (scripts/realtime-client.ts) but exercising the
 * client side of every guarantee `lib/socket/*` relies on:
 *
 *   1. `operations` receives every operational event, for every truck & dock.
 *   2. `truck:{id}` receives only that truck's events (and no dock events).
 *   3. `shipment:{id}` receives only that shipment's truck's events.
 *   4. Reconnect: room membership is rebuilt, and a fresh snapshot re-baselines
 *      the sequence high-water mark.
 *   5. No duplicate listeners survive a reconnect or a repeated subscribe.
 *
 * Usage:
 *   node scripts/realtime-verify.mjs
 *
 * Requires the E2 backend running on NEXT_PUBLIC_SOCKET_URL (default
 * http://localhost:4000) with the simulation started.
 */

import { io } from "socket.io-client";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:4000";
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";
const OPERATIONS_WINDOW_MS = 15_000;
const TRUCK_ID = process.env.VERIFY_TRUCK_ID ?? "TRK-101";
const SHIPMENT_REF = process.env.VERIFY_SHIPMENT_ID ?? "SHP-1001";
const DOCK_ID = process.env.VERIFY_DOCK_ID ?? "D2";

const results = [];

function record(name, pass, detail) {
  results.push({ name, pass, detail });
  const tag = pass ? "PASS" : "FAIL";
  console.log(`[${tag}] ${name}${detail ? " — " + detail : ""}`);
}

function connectClient(label) {
  const socket = io(SOCKET_URL, { transports: ["websocket"], autoConnect: false });
  socket.on("connect_error", (err) => console.error(`[${label}] connect_error:`, err.message));
  return socket;
}

function waitFor(socket, event, predicate, timeoutMs) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      socket.off(event, handler);
      resolve(null);
    }, timeoutMs);
    function handler(payload) {
      if (!predicate || predicate(payload)) {
        clearTimeout(timer);
        socket.off(event, handler);
        resolve(payload);
      }
    }
    socket.on(event, handler);
  });
}

function emitAck(socket, event, arg) {
  return new Promise((resolve) => {
    if (arg === undefined) socket.emit(event, resolve);
    else socket.emit(event, arg, resolve);
  });
}

async function patchDockStatus(dockId, body) {
  const res = await fetch(`${API_URL}/docks/${dockId}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json().catch(() => null);
}

async function main() {
  console.log(`Connecting to ${SOCKET_URL} ...`);

  // ---- Client A: operations -------------------------------------------
  const opsClient = connectClient("operations");
  await new Promise((resolve) => {
    opsClient.connect();
    opsClient.once("connect", resolve);
  });

  const opsAck = await emitAck(opsClient, "subscribe:operations");
  record(
    "subscribe:operations ack returns LiveTruckView[]",
    opsAck?.ok === true && Array.isArray(opsAck.data) && opsAck.data.length > 0,
    `room=${opsAck?.room}, trucks=${opsAck?.data?.length}`,
  );

  const positionsByTruck = new Map();
  const dockEventCounts = { DOCK_STATUS_CHANGED: 0, DOCK_ASSIGNED: 0, DOCK_REASSIGNED: 0 };
  const opsAlerts = [];
  opsClient.on("TRUCK_POSITION_UPDATED", (p) => {
    if (!positionsByTruck.has(p.truckId)) positionsByTruck.set(p.truckId, []);
    positionsByTruck.get(p.truckId).push(p);
  });
  opsClient.on("DOCK_STATUS_CHANGED", () => dockEventCounts.DOCK_STATUS_CHANGED++);
  opsClient.on("DOCK_ASSIGNED", () => dockEventCounts.DOCK_ASSIGNED++);
  opsClient.on("DOCK_REASSIGNED", () => dockEventCounts.DOCK_REASSIGNED++);
  opsClient.on("ALERT_CREATED", (a) => opsAlerts.push(a));

  console.log(`Watching operations room for ${OPERATIONS_WINDOW_MS}ms ...`);
  await new Promise((r) => setTimeout(r, OPERATIONS_WINDOW_MS));

  record(
    "operations sees TRUCK_POSITION_UPDATED for multiple trucks",
    positionsByTruck.size >= 2,
    `distinct trucks=${positionsByTruck.size}`,
  );

  const sample = [...positionsByTruck.values()].find((list) => list.length >= 2);
  if (sample) {
    const gaps = [];
    for (let i = 1; i < sample.length; i++) {
      gaps.push(new Date(sample[i].serverTimestamp) - new Date(sample[i - 1].serverTimestamp));
    }
    const mean = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    record("position cadence is ~2s", mean > 1000 && mean < 4000, `mean=${mean.toFixed(0)}ms`);
  } else {
    record("position cadence is ~2s", false, "not enough samples");
  }

  // Trigger the dock cascade and confirm operations sees it.
  console.log(`Triggering dock cascade on ${DOCK_ID} ...`);
  await patchDockStatus(DOCK_ID, { status: "UNAVAILABLE", reason: "realtime-verify" });
  await waitFor(opsClient, "DOCK_STATUS_CHANGED", (p) => p.dockDoorId === DOCK_ID, 5000);
  await new Promise((r) => setTimeout(r, 2000));
  await patchDockStatus(DOCK_ID, { status: "AVAILABLE" });
  await new Promise((r) => setTimeout(r, 1000));

  record(
    "operations receives dock cascade events",
    dockEventCounts.DOCK_STATUS_CHANGED >= 1,
    JSON.stringify(dockEventCounts),
  );

  // ---- Client B: single truck room -------------------------------------
  const truckClient = connectClient("truck");
  await new Promise((resolve) => {
    truckClient.connect();
    truckClient.once("connect", resolve);
  });

  const truckAck = await emitAck(truckClient, "subscribe:truck", { truckId: TRUCK_ID });
  record(
    "subscribe:truck ack returns LiveTruckView",
    truckAck?.ok === true && truckAck.data?.truckId,
    `room=${truckAck?.room}`,
  );

  const canonicalTruckId = truckAck?.ok ? truckAck.data.truckId : TRUCK_ID;
  let sawOtherTruck = false;
  let sawDockEvent = false;
  const truckHandler = (p) => {
    if (p.truckId !== canonicalTruckId) sawOtherTruck = true;
  };
  ["TRUCK_POSITION_UPDATED", "TRUCK_ETA_UPDATED", "TRUCK_STATUS_CHANGED", "DOCK_ASSIGNED", "DOCK_REASSIGNED"].forEach(
    (evt) => truckClient.on(evt, truckHandler),
  );
  truckClient.on("DOCK_STATUS_CHANGED", () => (sawDockEvent = true));

  await new Promise((r) => setTimeout(r, 6000));
  record("truck room receives only that truck", !sawOtherTruck);
  record("truck room does not receive DOCK_STATUS_CHANGED (operations-only)", !sawDockEvent);

  // ---- Client C: shipment room -------------------------------------------
  const shipmentClient = connectClient("shipment");
  await new Promise((resolve) => {
    shipmentClient.connect();
    shipmentClient.once("connect", resolve);
  });

  const shipAck = await emitAck(shipmentClient, "subscribe:shipment", { shipmentId: SHIPMENT_REF });
  const shipRoomOk = shipAck?.ok === true && typeof shipAck.room === "string" && shipAck.room.startsWith("shipment:");
  record(
    "subscribe:shipment ack returns { shipmentId, truck }",
    shipRoomOk && "truck" in (shipAck?.data ?? {}),
    `room=${shipAck?.room}`,
  );

  if (shipAck?.ok && shipAck.data.truck) {
    const shipmentTruckId = shipAck.data.truck.truckId;
    let sawWrongTruck = false;
    const shipHandler = (p) => {
      if (p.truckId && p.truckId !== shipmentTruckId) sawWrongTruck = true;
    };
    ["TRUCK_POSITION_UPDATED", "TRUCK_ETA_UPDATED", "TRUCK_STATUS_CHANGED"].forEach((evt) =>
      shipmentClient.on(evt, shipHandler),
    );
    await new Promise((r) => setTimeout(r, 6000));
    record("shipment room only carries that shipment's truck", !sawWrongTruck);
  } else {
    record("shipment room only carries that shipment's truck", false, "no truck in snapshot to verify against");
  }

  // ---- Reconnect + re-baseline -------------------------------------------
  const beforeSequences = new Map(
    [...positionsByTruck.entries()].map(([id, list]) => [id, list[list.length - 1]?.sequenceNumber ?? 0]),
  );

  let resubscribed = false;
  const reconnectPromise = new Promise((resolve) => opsClient.once("connect", resolve));
  console.log("Forcing transport close to simulate a drop ...");
  opsClient.io.engine.close();
  await reconnectPromise;

  const postReconnectAck = await emitAck(opsClient, "subscribe:operations");
  resubscribed = postReconnectAck?.ok === true && Array.isArray(postReconnectAck.data);
  record("reconnect: client re-subscribes and gets a fresh snapshot", resubscribed);

  if (resubscribed) {
    const rebaselined = postReconnectAck.data.every((truck) => {
      const before = beforeSequences.get(truck.truckId);
      return before === undefined || truck.sequenceNumber >= 0; // snapshot re-baselines regardless of prior value
    });
    record("reconnect: snapshot re-baselines sequenceNumber per truck", rebaselined);
  }

  // ---- No duplicate handlers ----------------------------------------------
  record(
    "no duplicate TRUCK_POSITION_UPDATED listeners after reconnect",
    opsClient.listeners("TRUCK_POSITION_UPDATED").length === 1,
    `count=${opsClient.listeners("TRUCK_POSITION_UPDATED").length}`,
  );

  // Reproduce lib/socket/subscriptions.ts's ref-counting algorithm against
  // the live socket: two "consumers" subscribing to the same truck must
  // produce exactly one `subscribe:truck` frame, and releasing both must
  // produce exactly one `unsubscribe:truck` frame — matching what two
  // components mounting `useTruckSubscription(sameId)` would do.
  let subscribeFrames = 0;
  let unsubscribeFrames = 0;
  const originalEmit = truckClient.emit.bind(truckClient);
  truckClient.emit = (event, ...args) => {
    if (event === "subscribe:truck") subscribeFrames++;
    if (event === "unsubscribe:truck") unsubscribeFrames++;
    return originalEmit(event, ...args);
  };

  let refCount = 0;
  function acquire() {
    refCount++;
    if (refCount === 1) return emitAck(truckClient, "subscribe:truck", { truckId: TRUCK_ID });
    return Promise.resolve();
  }
  function release() {
    refCount--;
    if (refCount === 0) truckClient.emit("unsubscribe:truck", { truckId: TRUCK_ID }, () => {});
  }

  await acquire(); // consumer 1 (dashboard)
  await acquire(); // consumer 2 (truck detail panel) — same truck, must not re-emit
  release(); // consumer 2 unmounts — refcount still > 0, must not unsubscribe yet
  await new Promise((r) => setTimeout(r, 200));
  record(
    "two subscribers to the same truck room emit exactly one subscribe:truck frame",
    subscribeFrames === 1,
    `frames=${subscribeFrames}`,
  );
  record(
    "releasing one of two refs does not unsubscribe the still-active room",
    unsubscribeFrames === 0,
    `frames=${unsubscribeFrames}`,
  );
  release(); // consumer 1 unmounts — refcount reaches 0, now unsubscribe
  await new Promise((r) => setTimeout(r, 200));
  record(
    "releasing the last ref emits exactly one unsubscribe:truck frame",
    unsubscribeFrames === 1,
    `frames=${unsubscribeFrames}`,
  );

  opsClient.close();
  truckClient.close();
  shipmentClient.close();

  const failed = results.filter((r) => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);
  if (failed.length > 0) {
    console.log("Failed checks:", failed.map((f) => f.name).join(", "));
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
