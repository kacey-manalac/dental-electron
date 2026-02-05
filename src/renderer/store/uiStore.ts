import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { NotationType } from '../types';

interface UIState {
  sidebarOpen: boolean;
  darkMode: boolean;
  dentalNotation: NotationType;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleDarkMode: () => void;
  setDentalNotation: (notation: NotationType) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      darkMode: true,
      dentalNotation: 'fdi',

      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

      setSidebarOpen: (open) => set({ sidebarOpen: open }),

      toggleDarkMode: () =>
        set((state) => {
          const newDarkMode = !state.darkMode;
          if (newDarkMode) {
            document.documentElement.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
          }
          return { darkMode: newDarkMode };
        }),

      setDentalNotation: (notation) => set({ dentalNotation: notation }),
    }),
    {
      name: 'dental-ui-storage',
      onRehydrateStorage: () => (state) => {
        if (state?.darkMode !== false) {
          document.documentElement.classList.add('dark');
        }
      },
    }
  )
);
