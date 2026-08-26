import { create } from "zustand";

export interface MapViewState {
  longitude: number;
  latitude: number;
  zoom: number;
}

export type DashboardPanel = "fleet" | "docks" | "alerts";

type PanelOpenState = Record<DashboardPanel, boolean>;

interface UIState {
  isSidebarCollapsed: boolean;
  selectedTruckId: string | null;
  selectedShipmentId: string | null;
  selectedDockId: string | null;
  activeDashboardPanel: DashboardPanel | null;
  openPanels: PanelOpenState;
  mapViewState: MapViewState | null;
  isMapInteracting: boolean;
  followSelectedTruck: boolean;
  isCommandPaletteOpen: boolean;
}

interface UIActions {
  setSidebarCollapsed: (collapsed: boolean) => void;
  selectTruck: (truckId: string | null) => void;
  selectShipment: (shipmentId: string | null) => void;
  selectDock: (dockId: string | null) => void;
  setActiveDashboardPanel: (panel: DashboardPanel | null) => void;
  togglePanel: (panel: DashboardPanel) => void;
  setPanelOpen: (panel: DashboardPanel, open: boolean) => void;
  setMapViewState: (view: MapViewState | null) => void;
  setMapInteracting: (interacting: boolean) => void;
  setFollowSelectedTruck: (follow: boolean) => void;
  setCommandPaletteOpen: (open: boolean) => void;
  reset: () => void;
}

type UIStore = UIState & UIActions;

const initialState: UIState = {
  isSidebarCollapsed: false,
  selectedTruckId: null,
  selectedShipmentId: null,
  selectedDockId: null,
  activeDashboardPanel: null,
  openPanels: { fleet: true, docks: true, alerts: true },
  mapViewState: null,
  isMapInteracting: false,
  followSelectedTruck: false,
  isCommandPaletteOpen: false,
};

export const useUIStore = create<UIStore>()((set) => ({
  ...initialState,
  setSidebarCollapsed: (collapsed) => set({ isSidebarCollapsed: collapsed }),
  selectTruck: (truckId) => set({ selectedTruckId: truckId }),
  selectShipment: (shipmentId) => set({ selectedShipmentId: shipmentId }),
  selectDock: (dockId) => set({ selectedDockId: dockId }),
  setActiveDashboardPanel: (panel) => set({ activeDashboardPanel: panel }),
  togglePanel: (panel) =>
    set((state) => ({ openPanels: { ...state.openPanels, [panel]: !state.openPanels[panel] } })),
  setPanelOpen: (panel, open) =>
    set((state) => ({ openPanels: { ...state.openPanels, [panel]: open } })),
  setMapViewState: (view) => set({ mapViewState: view }),
  setMapInteracting: (interacting) => set({ isMapInteracting: interacting }),
  setFollowSelectedTruck: (follow) => set({ followSelectedTruck: follow }),
  setCommandPaletteOpen: (open) => set({ isCommandPaletteOpen: open }),
  reset: () => set(initialState),
}));
