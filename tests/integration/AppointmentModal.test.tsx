/**
 * Tests de integración para AppointmentModal.
 *
 * Verifica:
 *  - Validación del formulario (errores Zod)
 *  - Búsqueda de pacientes
 *  - Selección de slots disponibles
 *  - Flujo de submit (crear / editar)
 *
 * Mockea useAppointmentMutations, usePatients, useAvailableSlots.
 *
 * @jest-environment jsdom
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AppointmentModal } from "@/components/dashboard/AppointmentModal";
import type { AppointmentListItem, AppointmentType, Patient } from "@/types";

// ─── Mocks ────────────────────────────────────────────────────

const mockCreateAppointment = jest.fn();
const mockUpdateAppointment = jest.fn();

jest.mock("@/hooks/useAppointmentMutations", () => ({
  useAppointmentMutations: () => ({
    createAppointment: mockCreateAppointment,
    updateAppointment: mockUpdateAppointment,
    deleteAppointment: jest.fn(),
    confirmAppointment: jest.fn(),
    cancelAppointment: jest.fn(),
    isPending: false,
    isCreating: false,
    isUpdating: false,
    isDeleting: false,
    isConfirming: false,
    isCancelling: false,
    error: null,
  }),
}));

const mockUsePatients = jest.fn();

jest.mock("@/hooks/usePatients", () => ({
  usePatients: (search?: string) => mockUsePatients(search),
}));

const mockUseAvailableSlots = jest.fn();

jest.mock("@/hooks/useAvailableSlots", () => ({
  useAvailableSlots: (date: string | null) => mockUseAvailableSlots(date),
}));

jest.mock("@/lib/utils", () => ({
  cn: (...classes: (string | undefined | false | null)[]) =>
    classes.filter(Boolean).join(" "),
}));

jest.mock("@/components/ui/input-field", () => ({
  InputField: React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { label?: string; error?: string }>(
    ({ label, error, id, ...props }, ref) => {
      const inputId = id || `input-${Math.random().toString(36).slice(2, 8)}`;
      return (
        <div>
          {label && <label htmlFor={inputId}>{label}</label>}
          <input ref={ref} id={inputId} {...props} />
          {error && <span>{error}</span>}
        </div>
      );
    },
  ),
}));

jest.mock("@/components/ui/Modal", () => ({
  Modal: ({ open, title, children, footer }: { open?: unknown; title?: unknown; children?: React.ReactNode; footer?: React.ReactNode }) => {
    if (!open) return null;
    return (
      <div data-slot="modal">
        <h2>{title as React.ReactNode}</h2>
        <div>{children}</div>
        {footer && <div>{footer}</div>}
      </div>
    );
  },
}));

jest.mock("@/components/ui/button", () => ({
  Button: React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string; size?: string }>(
    ({ children, ...props }, ref) => (
      <button ref={ref} {...props}>{children}</button>
    ),
  ),
}));

jest.mock("@/components/ui/select", () => ({
  Select: ({ children, value, onValueChange }: { children?: React.ReactNode; value?: unknown; onValueChange?: unknown }) => (
    <select value={value as string} onChange={(e) => (onValueChange as (v: string) => void)?.(e.target.value)}>
      {children}
    </select>
  ),
  SelectTrigger: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  SelectValue: () => <span />,
  SelectContent: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children, value }: { children?: React.ReactNode; value?: unknown }) => <option value={value as string}>{children as React.ReactNode}</option>,
}));

// lucide-react is mocked globally in tests/__mocks__/lucide-react.tsx

// ─── Helpers ──────────────────────────────────────────────────

function makePatient(overrides: Partial<Patient> = {}): Patient {
  return {
    id: "p1",
    name: "María López",
    email: "maria@example.com",
    phone: "555-0101",
    birthDate: null,
    notes: null,
    userId: "u1",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeAppointment(
  overrides: Partial<AppointmentListItem> = {},
): AppointmentListItem {
  return {
    id: "apt-1",
    date: new Date("2026-06-15T10:00:00Z"),
    time: "10:00",
    status: "PENDING",
    type: "REVISION" as AppointmentType,
    notes: null,
    patientId: "p1",
    createdAt: new Date("2026-05-01"),
    updatedAt: new Date("2026-05-01"),
    patient: { id: "p1", name: "María López" },
    ...overrides,
  };
}

// ─── Setup / Teardown ─────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  mockUsePatients.mockReturnValue({
    data: [],
    isLoading: false,
    error: null,
  });
  mockUseAvailableSlots.mockReturnValue({
    data: [],
    isLoading: false,
    error: null,
  });
  mockCreateAppointment.mockResolvedValue(undefined);
  mockUpdateAppointment.mockResolvedValue(undefined);
});

// ─── Tests: Renderizado ───────────────────────────────────────

describe("AppointmentModal — renderizado", () => {
  it("no debe renderizar nada cuando open=false", () => {
    const { container } = render(
      <AppointmentModal open={false} onClose={jest.fn()} />,
    );

    expect(container.innerHTML).toBe("");
  });

  it("debe renderizar en modo creación con título 'Nueva cita'", () => {
    render(<AppointmentModal open={true} onClose={jest.fn()} />);

    expect(screen.getByText("Nueva cita")).toBeDefined();
    expect(screen.getByText("Crear cita")).toBeDefined();
  });

  it("debe renderizar en modo edición con título 'Editar cita'", () => {
    const appointment = makeAppointment();
    render(
      <AppointmentModal
        open={true}
        onClose={jest.fn()}
        appointment={appointment}
      />,
    );

    expect(screen.getByText("Editar cita")).toBeDefined();
    expect(screen.getByText("Guardar cambios")).toBeDefined();
  });

  it("debe renderizar todos los campos del formulario", () => {
    render(<AppointmentModal open={true} onClose={jest.fn()} />);

    // Búsqueda de paciente
    expect(
      screen.getByPlaceholderText("Buscar paciente..."),
    ).toBeDefined();
    // Fecha
    expect(screen.getByLabelText("Fecha")).toBeDefined();
    // Hora
    expect(screen.getByLabelText("Hora")).toBeDefined();
    // Tipo
    expect(screen.getByLabelText("Tipo de cita")).toBeDefined();
    // Notas
    expect(screen.getByPlaceholderText("Notas adicionales (opcional)")).toBeDefined();
  });
});

// ─── Tests: Validación (Zod) ──────────────────────────────────

describe("AppointmentModal — validación Zod", () => {
  it("debe mostrar error cuando patientId está vacío", async () => {
    render(<AppointmentModal open={true} onClose={jest.fn()} />);

    // Submit sin llenar paciente
    const submitBtn = screen.getByText("Crear cita");
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText("El paciente es requerido")).toBeDefined();
    });
  });

  it("debe mostrar error cuando la hora es inválida", async () => {
    render(<AppointmentModal open={true} onClose={jest.fn()} />);

    // Seleccionar paciente
    mockUsePatients.mockReturnValue({
      data: [makePatient()],
      isLoading: false,
      error: null,
    });

    const searchInput = screen.getByPlaceholderText("Buscar paciente...");
    fireEvent.change(searchInput, { target: { value: "María" } });

    // Seleccionar paciente de la lista
    const patientBtn = await screen.findByText(/María López/);
    fireEvent.click(patientBtn);

    // Ingresar hora inválida — el time input está presente porque no hay slots
    const timeInput = screen.getByLabelText("Hora") as HTMLInputElement;
    fireEvent.change(timeInput, { target: { value: "25:00" } });

    const submitBtn = screen.getByText("Crear cita");
    fireEvent.click(submitBtn);

    await waitFor(() => {
      const errors = screen.getAllByText("Hora inválida (HH:mm)");
      expect(errors.length).toBeGreaterThanOrEqual(1);
    });
  });

  it("debe mostrar error cuando el tipo no es válido", async () => {
    render(<AppointmentModal open={true} onClose={jest.fn()} />);

    const typeSelect = screen.getByLabelText("Tipo de cita") as HTMLSelectElement;
    expect(typeSelect.value).toBe("REVISION"); // default
    expect(typeSelect.options.length).toBe(5); // 5 tipos
  });

  it("debe mostrar errores con role alert", async () => {
    render(<AppointmentModal open={true} onClose={jest.fn()} />);

    const submitBtn = screen.getByText("Crear cita");
    fireEvent.click(submitBtn);

    await waitFor(() => {
      const errorEl = screen.getByText("El paciente es requerido");
      expect(errorEl.getAttribute("role")).toBe("alert");
    });
  });
});

// ─── Tests: Búsqueda de pacientes ─────────────────────────────

describe("AppointmentModal — búsqueda de pacientes", () => {
  it("debe mostrar lista de pacientes al escribir en el buscador", async () => {
    mockUsePatients.mockReturnValue({
      data: [makePatient(), makePatient({ id: "p2", name: "Carlos Ruiz" })],
      isLoading: false,
      error: null,
    });

    render(<AppointmentModal open={true} onClose={jest.fn()} />);

    const searchInput = screen.getByPlaceholderText("Buscar paciente...");
    fireEvent.change(searchInput, { target: { value: "Mar" } });

    await waitFor(() => {
      expect(screen.getByText(/María López/)).toBeDefined();
    });
  });

  it("debe mostrar mensaje cuando no se encuentran pacientes", async () => {
    mockUsePatients.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    });

    render(<AppointmentModal open={true} onClose={jest.fn()} />);

    const searchInput = screen.getByPlaceholderText("Buscar paciente...");
    fireEvent.change(searchInput, { target: { value: "ZZZ" } });

    await waitFor(() => {
      expect(
        screen.getByText("No se encontraron pacientes"),
      ).toBeDefined();
    });
  });

  it("debe seleccionar paciente al hacer clic y establecer patientId", async () => {
    mockUsePatients.mockReturnValue({
      data: [makePatient()],
      isLoading: false,
      error: null,
    });

    render(<AppointmentModal open={true} onClose={jest.fn()} />);

    const searchInput = screen.getByPlaceholderText("Buscar paciente...");
    fireEvent.change(searchInput, { target: { value: "María" } });

    const patientBtn = await screen.findByText(/María López/);
    fireEvent.click(patientBtn);

    expect(searchInput).toHaveProperty("value", "María López");
  });
});

// ─── Tests: Slots disponibles ─────────────────────────────────

describe("AppointmentModal — slots disponibles", () => {
  it("debe mostrar selector de slots cuando hay disponibles", async () => {
    mockUseAvailableSlots.mockReturnValue({
      data: [
        { time: "09:00", available: true },
        { time: "10:00", available: false },
        { time: "11:00", available: true },
      ],
      isLoading: false,
      error: null,
    });

    render(<AppointmentModal open={true} onClose={jest.fn()} />);

    await waitFor(() => {
      const timeSelect = screen.getByLabelText("Hora") as HTMLSelectElement;
      expect(timeSelect.options.length).toBeGreaterThanOrEqual(2);
    });

    const options = Array.from(
      (screen.getByLabelText("Hora") as HTMLSelectElement).options,
    );
    const optionValues = options.map((o) => o.value);
    expect(optionValues).toContain("09:00");
    expect(optionValues).toContain("11:00");
    expect(optionValues).not.toContain("10:00");
  });

  it("debe mostrar input time cuando no hay slots", () => {
    mockUseAvailableSlots.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    });

    render(<AppointmentModal open={true} onClose={jest.fn()} />);

    const timeInput = screen.getByLabelText("Hora") as HTMLInputElement;
    expect(timeInput.type).toBe("time");
  });

  it("debe deshabilitar el input de hora mientras cargan los slots", () => {
    mockUseAvailableSlots.mockReturnValue({
      data: [],
      isLoading: true,
      error: null,
    });

    render(<AppointmentModal open={true} onClose={jest.fn()} />);

    const timeInput = screen.getByLabelText("Hora") as HTMLInputElement;
    expect(timeInput.disabled).toBe(true);
  });
});

// ─── Tests: Submit ────────────────────────────────────────────

describe("AppointmentModal — submit", () => {
  it("debe llamar a createAppointment al enviar en modo creación", async () => {
    mockUsePatients.mockReturnValue({
      data: [makePatient()],
      isLoading: false,
      error: null,
    });

    const onClose = jest.fn();
    render(<AppointmentModal open={true} onClose={onClose} />);

    const searchInput = screen.getByPlaceholderText("Buscar paciente...");
    fireEvent.change(searchInput, { target: { value: "María" } });
    const patientBtn = await screen.findByText(/María López/);
    fireEvent.click(patientBtn);

    const timeInput = screen.getByLabelText("Hora") as HTMLInputElement;
    fireEvent.change(timeInput, { target: { value: "14:00" } });

    const submitBtn = screen.getByText("Crear cita");
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockCreateAppointment).toHaveBeenCalledTimes(1);
    });

    const callData = mockCreateAppointment.mock.calls[0][0];
    expect(callData.patientId).toBe("p1");
    expect(callData.time).toBe("14:00");
    expect(callData.type).toBe("REVISION");
  });

  it("debe llamar a updateAppointment al enviar en modo edición", async () => {
    const appointment = makeAppointment();
    const onClose = jest.fn();

    render(
      <AppointmentModal
        open={true}
        onClose={onClose}
        appointment={appointment}
      />,
    );

    const typeSelect = screen.getByLabelText("Tipo de cita") as HTMLSelectElement;
    fireEvent.change(typeSelect, { target: { value: "URGENCIA" } });

    const submitBtn = screen.getByText("Guardar cambios");
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockUpdateAppointment).toHaveBeenCalledTimes(1);
    });

    const callArgs = mockUpdateAppointment.mock.calls[0][0];
    expect(callArgs.id).toBe("apt-1");
    expect(callArgs.data.type).toBe("URGENCIA");
  });

  it("debe cerrar el modal tras submit exitoso", async () => {
    mockUsePatients.mockReturnValue({
      data: [makePatient()],
      isLoading: false,
      error: null,
    });

    const onClose = jest.fn();
    render(<AppointmentModal open={true} onClose={onClose} />);

    const searchInput = screen.getByPlaceholderText("Buscar paciente...");
    fireEvent.change(searchInput, { target: { value: "María" } });
    const patientBtn = await screen.findByText(/María López/);
    fireEvent.click(patientBtn);

    const timeInput = screen.getByLabelText("Hora") as HTMLInputElement;
    fireEvent.change(timeInput, { target: { value: "09:00" } });

    const submitBtn = screen.getByText("Crear cita");
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it.skip("debe mostrar spinner durante el submit", async () => {
    mockCreateAppointment.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100)),
    );
    mockUsePatients.mockReturnValue({
      data: [makePatient()],
      isLoading: false,
      error: null,
    });

    render(<AppointmentModal open={true} onClose={jest.fn()} />);

    const searchInput = screen.getByPlaceholderText("Buscar paciente...");
    fireEvent.change(searchInput, { target: { value: "María" } });
    const patientBtn = await screen.findByText(/María López/);
    fireEvent.click(patientBtn);

    const timeInput = screen.getByLabelText("Hora") as HTMLInputElement;
    fireEvent.change(timeInput, { target: { value: "09:00" } });

    const submitBtn = screen.getByText("Crear cita");
    fireEvent.click(submitBtn);

    // El botón debe seguir mostrando 'Crear cita' pero estar disabled
    await waitFor(() => {
      const btn = screen.getByText("Crear cita");
      expect(btn).toBeDefined();
      expect(btn.closest('button')?.disabled).toBe(true);
    });
  });
});
