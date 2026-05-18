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
 * Maneja autenticación (user, isAuthenticated, setUser, hydrateFromSession) y UI (sidebar).
 */
interface AppState {
  // ─── Auth state ────────────────────────────────────────────
  user: StoreUser | null;
  isAuthenticated: boolean;

  // ─── UI state ──────────────────────────────────────────────
  sidebarOpen: boolean;

  // ─── Auth actions ──────────────────────────────────────────
  /** Establece el usuario directamente. user === null cierra la sesión. */
  setUser: (user: StoreUser | null) => void;
  /**
   * Sincroniza el store con los datos de sesión de NextAuth.
   * Se llama desde el dashboard layout cuando useSession() retorna datos.
   */
  hydrateFromSession: (
    sessionUser:
      | {
          id?: string;
          email?: string | null;
          name?: string | null;
          role?: string;
        }
      | undefined
      | null
  ) => void;

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
  setUser: (user) => set({ user, isAuthenticated: user !== null }),

  hydrateFromSession: (sessionUser) => {
    if (!sessionUser?.id || !sessionUser?.email) {
      set({ user: null, isAuthenticated: false });
      return;
    }

    set({
      user: {
        id: sessionUser.id,
        email: sessionUser.email,
        name: sessionUser.name ?? sessionUser.email,
        role: (sessionUser.role as UserRole) ?? "DENTIST",
      },
      isAuthenticated: true,
    });
  },

  // UI
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
}));
