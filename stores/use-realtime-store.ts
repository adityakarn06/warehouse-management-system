import { create } from "zustand";

export type ConnectionStatus =
  | "IDLE"
  | "CONNECTING"
  | "CONNECTED"
  | "RECONNECTING"
  | "DISCONNECTED"
  | "ERROR";

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
}

interface RealtimeActions {
  setConnectionStatus: (status: ConnectionStatus) => void;
  setSocketId: (socketId: string | null) => void;
  setError: (message: string | null) => void;
  addSubscribedRoom: (room: string) => void;
  removeSubscribedRoom: (room: string) => void;
  clearSubscribedRooms: () => void;
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
  markEventReceived: () => set({ lastEventAt: Date.now() }),
  reset: () => set(initialState),
}));
