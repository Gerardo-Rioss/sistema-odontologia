import { create } from "zustand";

/**
 * Tipos de rol de usuario en el sistema.
 */
export type UserRole = "ADMIN" | "DENTIST";

/**
 * Usuario autenticado en el store de Zustand.
 */
export interface StoreUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

/**
 * Estado global de la aplicación.
 * Maneja autenticación (user, isAuthenticated, login, logout) y UI (sidebar).
 */
interface AppState {
  // ─── Auth state ────────────────────────────────────────────
  user: StoreUser | null;
  isAuthenticated: boolean;

  // ─── UI state ──────────────────────────────────────────────
  sidebarOpen: boolean;

  // ─── Auth actions ──────────────────────────────────────────
  login: (user: StoreUser) => void;
  logout: () => void;

  // ─── UI actions ────────────────────────────────────────────
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
}

export const useStore = create<AppState>((set) => ({
  // Defaults
  user: null,
  isAuthenticated: false,
  sidebarOpen: true,

  // Auth
  login: (user) => set({ user, isAuthenticated: true }),
  logout: () => set({ user: null, isAuthenticated: false }),

  // UI
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
}));
