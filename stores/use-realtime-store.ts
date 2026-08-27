import { create } from "zustand";

export type ConnectionStatus =
  | "IDLE"
  | "CONNECTING"
  | "CONNECTED"
  | "RECONNECTING"
  | "DISCONNECTED"
  | "ERROR";

/**
 * What the server resolved a `subscribe:shipment` request into.
 *
 * A client may subscribe with a shipment id, a reference or a tracking number;
 * only the ack reports the canonical room actually joined, the canonical
 * shipment id, and the truck carrying it (docs/realtime.md). `GET /tracking/
 * :trackingNumber` returns no truck id at all, so this ack is the *only*
 * authoritative link from a tracking number to the truck whose live entry the
 * map and the status overlay read. Raw ack fields only — nothing derived.
 */
export interface ShipmentResolution {
  /** `res.room`, e.g. `shipment:SHP-1001`. */
  room: string;
  shipmentId: string;
  /** `null` when the ack carried no truck — nothing is moving this shipment yet. */
  truckId: string | null;
}

interface RealtimeState {
  connectionStatus: ConnectionStatus;
  socketId: string | null;
  lastConnectedAt: string | null;
  lastError: string | null;
  /** Rooms this socket currently holds. A plain array, not a `Set` — so
   * selectors can compare it with `useShallow` instead of by reference. */
  subscribedRooms: readonly string[];
  /** Epoch ms of the last event dispatched into any store, for a "feed looks
   * stale" indicator. Not a domain value — purely a client-side liveness signal. */
  lastEventAt: number | null;
  /** Keyed by the argument the *caller* subscribed with (a tracking number,
   * reference or id) — that is what a consumer holds; the canonical ids are
   * the value, not the key. */
  shipmentResolutions: Readonly<Record<string, ShipmentResolution>>;
}

interface RealtimeActions {
  setConnectionStatus: (status: ConnectionStatus) => void;
  setSocketId: (socketId: string | null) => void;
  setError: (message: string | null) => void;
  addSubscribedRoom: (room: string) => void;
  removeSubscribedRoom: (room: string) => void;
  clearSubscribedRooms: () => void;
  recordShipmentResolution: (requestedArg: string, resolution: ShipmentResolution) => void;
  clearShipmentResolution: (requestedArg: string) => void;
  markEventReceived: () => void;
  reset: () => void;
}

type RealtimeStore = RealtimeState & RealtimeActions;

const initialState: RealtimeState = {
  connectionStatus: "IDLE",
  socketId: null,
  lastConnectedAt: null,
  lastError: null,
  subscribedRooms: [],
  lastEventAt: null,
  shipmentResolutions: {},
};

export const useRealtimeStore = create<RealtimeStore>()((set) => ({
  ...initialState,
  setConnectionStatus: (status) =>
    set((state) => ({
      connectionStatus: status,
      lastConnectedAt: status === "CONNECTED" ? new Date().toISOString() : state.lastConnectedAt,
    })),
  setSocketId: (socketId) => set({ socketId }),
  setError: (message) => set({ lastError: message }),
  addSubscribedRoom: (room) =>
    set((state) =>
      state.subscribedRooms.includes(room)
        ? state
        : { subscribedRooms: [...state.subscribedRooms, room] },
    ),
  removeSubscribedRoom: (room) =>
    set((state) => ({ subscribedRooms: state.subscribedRooms.filter((r) => r !== room) })),
  clearSubscribedRooms: () => set({ subscribedRooms: [] }),
  recordShipmentResolution: (requestedArg, resolution) =>
    set((state) => {
      // Re-acked on every reconnect with (normally) identical values. Bail on
      // an unchanged resolution so subscribers do not re-render for it.
      const existing = state.shipmentResolutions[requestedArg];
      if (
        existing &&
        existing.room === resolution.room &&
        existing.shipmentId === resolution.shipmentId &&
        existing.truckId === resolution.truckId
      ) {
        return state;
      }
      return { shipmentResolutions: { ...state.shipmentResolutions, [requestedArg]: resolution } };
    }),
  clearShipmentResolution: (requestedArg) =>
    set((state) => {
      if (!(requestedArg in state.shipmentResolutions)) return state;
      const next = { ...state.shipmentResolutions };
      delete next[requestedArg];
      return { shipmentResolutions: next };
    }),
  markEventReceived: () => set({ lastEventAt: Date.now() }),
  reset: () => set(initialState),
}));
