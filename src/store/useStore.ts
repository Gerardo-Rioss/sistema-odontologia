import { create, type StateCreator } from "zustand";
import type { AppointmentStatus } from "@/types";

// ─── Tipos ────────────────────────────────────────────────────

export type UserRole = "ADMIN" | "DENTIST";

export interface StoreUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export type CalendarView = "month" | "week" | "day";

// ─── Slices ───────────────────────────────────────────────────

/**
 * Slice de autenticación.
 * Sincroniza el estado de NextAuth con el store de Zustand.
 */
interface AuthSlice {
  user: StoreUser | null;
  isAuthenticated: boolean;

  setUser: (user: StoreUser | null) => void;
  hydrateFromSession: (
    sessionUser:
      | { id?: string; email?: string | null; name?: string | null; role?: string }
      | undefined
      | null
  ) => void;
}

/**
 * Slice de UI (sidebar).
 */
interface UISlice {
  sidebarOpen: boolean;

  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
}

/**
 * Slice de modales.
 * Maneja la visibilidad de los modales de formulario y confirmación,
 * y el ID de la cita seleccionada.
 */
interface ModalSlice {
  /** ID de la cita seleccionada para editar/eliminar. null = sin selección. */
  selectedAppointmentId: string | null;
  /** Modal de creación/edición de cita abierto. */
  isFormOpen: boolean;
  /** Modal de confirmación de eliminación abierto. */
  isConfirmOpen: boolean;

  setSelectedAppointment: (id: string | null) => void;
  openForm: (appointmentId?: string | null) => void;
  closeForm: () => void;
  openConfirm: (appointmentId: string) => void;
  closeConfirm: () => void;
}

/**
 * Slice de filtros.
 * Estado de los filtros aplicados en las vistas de citas y pacientes.
 */
interface FilterSlice {
  /** Filtro por estado de cita. null = todos. */
  statusFilter: AppointmentStatus | null;
  /** Filtro por fecha (ISO string). null = sin filtro de fecha. */
  dateFilter: string | null;
  /** Búsqueda por texto (nombre de paciente). */
  searchQuery: string;

  setStatusFilter: (status: AppointmentStatus | null) => void;
  setDateFilter: (date: string | null) => void;
  setSearchQuery: (query: string) => void;
  /** Reinicia todos los filtros a sus valores por defecto. */
  resetFilters: () => void;
}

/**
 * Slice de vista del calendario.
 * Controla el modo de vista (mes/semana/día) y la fecha actual.
 */
interface CalendarSlice {
  /** Vista activa del calendario. */
  currentView: CalendarView;
  /** Fecha de referencia del calendario (ISO string). */
  currentDate: string;

  setCurrentView: (view: CalendarView) => void;
  setCurrentDate: (date: string) => void;
  /** Vuelve a la fecha de hoy y vista mensual. */
  goToToday: () => void;
}

// ─── Estado completo ──────────────────────────────────────────

interface AppState
  extends AuthSlice,
    UISlice,
    ModalSlice,
    FilterSlice,
    CalendarSlice {}

// ─── Creadores de slices ──────────────────────────────────────

const createAuthSlice: StateCreator<AppState, [], [], AuthSlice> = (set) => ({
  user: null,
  isAuthenticated: false,

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
});

const createUISlice: StateCreator<AppState, [], [], UISlice> = (set) => ({
  sidebarOpen: true,

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  setSidebarOpen: (open) => set({ sidebarOpen: open }),
});

const createModalSlice: StateCreator<AppState, [], [], ModalSlice> = (set) => ({
  selectedAppointmentId: null,
  isFormOpen: false,
  isConfirmOpen: false,

  setSelectedAppointment: (id) => set({ selectedAppointmentId: id }),

  openForm: (appointmentId = null) =>
    set({
      isFormOpen: true,
      selectedAppointmentId: appointmentId,
    }),

  closeForm: () =>
    set({ isFormOpen: false, selectedAppointmentId: null }),

  openConfirm: (appointmentId) =>
    set({
      isConfirmOpen: true,
      selectedAppointmentId: appointmentId,
    }),

  closeConfirm: () =>
    set({ isConfirmOpen: false, selectedAppointmentId: null }),
});

const createFilterSlice: StateCreator<AppState, [], [], FilterSlice> = (
  set
) => ({
  statusFilter: null,
  dateFilter: null,
  searchQuery: "",

  setStatusFilter: (status) => set({ statusFilter: status }),
  setDateFilter: (date) => set({ dateFilter: date }),
  setSearchQuery: (query) => set({ searchQuery: query }),

  resetFilters: () =>
    set({ statusFilter: null, dateFilter: null, searchQuery: "" }),
});

const createCalendarSlice: StateCreator<AppState, [], [], CalendarSlice> = (
  set
) => ({
  currentView: "month",
  currentDate: new Date().toISOString().slice(0, 10),

  setCurrentView: (view) => set({ currentView: view }),
  setCurrentDate: (date) => set({ currentDate: date }),

  goToToday: () =>
    set({
      currentDate: new Date().toISOString().slice(0, 10),
      currentView: "month",
    }),
});

// ─── Store unificado ──────────────────────────────────────────

/**
 * Store global de Zustand.
 * Combina slices de autenticación, UI, modales, filtros y calendario
 * en un único store atómico.
 */
export const useStore = create<AppState>()((...a) => ({
  ...createAuthSlice(...a),
  ...createUISlice(...a),
  ...createModalSlice(...a),
  ...createFilterSlice(...a),
  ...createCalendarSlice(...a),
}));
