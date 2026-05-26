import { create } from 'zustand';

type PortalUiState = {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
};

export const usePortalUiStore = create<PortalUiState>((set) => ({
  sidebarOpen: true,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
}));
