import { create } from "zustand";

export type ConnectionStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "disconnected"
  | "error";

interface RealtimeState {
  status: ConnectionStatus;
  lastConnectedAt: string | null;
  lastError: string | null;
  subscribedRooms: Set<string>;
}

interface RealtimeActions {
  setStatus: (status: ConnectionStatus) => void;
  setError: (message: string | null) => void;
  addSubscribedRoom: (room: string) => void;
  removeSubscribedRoom: (room: string) => void;
  reset: () => void;
}

type RealtimeStore = RealtimeState & RealtimeActions;

const initialState: RealtimeState = {
  status: "idle",
  lastConnectedAt: null,
  lastError: null,
  subscribedRooms: new Set(),
};

export const useRealtimeStore = create<RealtimeStore>()((set) => ({
  ...initialState,
  setStatus: (status) =>
    set((state) => ({
      status,
      lastConnectedAt: status === "connected" ? new Date().toISOString() : state.lastConnectedAt,
    })),
  setError: (message) => set({ lastError: message }),
  addSubscribedRoom: (room) =>
    set((state) => ({ subscribedRooms: new Set(state.subscribedRooms).add(room) })),
  removeSubscribedRoom: (room) =>
    set((state) => {
      const next = new Set(state.subscribedRooms);
      next.delete(room);
      return { subscribedRooms: next };
    }),
  reset: () => set({ ...initialState, subscribedRooms: new Set() }),
}));
