import { create } from "zustand";

interface MapViewState {
  longitude: number;
  latitude: number;
  zoom: number;
}

interface UIState {
  isSidebarCollapsed: boolean;
  selectedTruckId: string | null;
  selectedShipmentId: string | null;
  selectedDockId: string | null;
  mapViewState: MapViewState | null;
  isCommandPaletteOpen: boolean;
}

interface UIActions {
  setSidebarCollapsed: (collapsed: boolean) => void;
  selectTruck: (truckId: string | null) => void;
  selectShipment: (shipmentId: string | null) => void;
  selectDock: (dockId: string | null) => void;
  setMapViewState: (view: MapViewState | null) => void;
  setCommandPaletteOpen: (open: boolean) => void;
  reset: () => void;
}

type UIStore = UIState & UIActions;

const initialState: UIState = {
  isSidebarCollapsed: false,
  selectedTruckId: null,
  selectedShipmentId: null,
  selectedDockId: null,
  mapViewState: null,
  isCommandPaletteOpen: false,
};

export const useUIStore = create<UIStore>()((set) => ({
  ...initialState,
  setSidebarCollapsed: (collapsed) => set({ isSidebarCollapsed: collapsed }),
  selectTruck: (truckId) => set({ selectedTruckId: truckId }),
  selectShipment: (shipmentId) => set({ selectedShipmentId: shipmentId }),
  selectDock: (dockId) => set({ selectedDockId: dockId }),
  setMapViewState: (view) => set({ mapViewState: view }),
  setCommandPaletteOpen: (open) => set({ isCommandPaletteOpen: open }),
  reset: () => set(initialState),
}));
