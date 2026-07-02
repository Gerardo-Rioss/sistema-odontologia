/**
 * Tests unitarios para componentes presentacionales del dashboard.
 *
 * Verifica:
 *  - StatsCard: renderizado de valor, título, tendencia, estados loading/error
 *  - StatusBadge: colores correctos por estado, role ARIA
 *  - EmptyState: mensaje, ícono opcional, acción opcional
 *  - Spinner: tamaños sm/md/lg, aria-label
 *
 * NOTA: testEnvironment es "node" en jest.config. Estos tests requieren
 * jsdom para ejecutarse. Añadir `@jest-environment jsdom` al inicio
 * si se desea ejecutarlos. TDD deshabilitado — no se ejecutan.
 *
 * @jest-environment jsdom
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";

// ─── Mocks ────────────────────────────────────────────────────

jest.mock("@/lib/utils", () => ({
  cn: (...classes: (string | undefined | false | null)[]) =>
    classes.filter(Boolean).join(" "),
}));

jest.mock("@/components/ui/card", () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
}));

jest.mock("@/components/ui/skeleton", () => ({
  Skeleton: ({ className }: { className?: string }) => (
    <div className={className} data-slot="skeleton" />
  ),
}));

jest.mock("@/components/ui/alert", () => ({
  Alert: ({ children, className, variant }: { children: React.ReactNode; className?: string; variant?: string }) => (
    <div className={className} data-variant={variant} role="alert">{children}</div>
  ),
  AlertDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// lucide-react is mocked globally in tests/__mocks__/lucide-react.tsx

jest.mock("@/hooks/useCountUp", () => ({
  useCountUp: (value) => value,
}));

// ─── StatsCard ────────────────────────────────────────────────

describe("StatsCard", () => {
  const iconFixture = <svg data-testid="icon-fixture" />;

  it("debe renderizar el valor y la etiqueta", () => {
    render(
      <StatsCard
        icon={iconFixture}
        label="Citas hoy"
        value={42}
        accent="blue"
      />,
    );

    expect(screen.getByText("42")).toBeDefined();
    expect(screen.getByText("Citas hoy")).toBeDefined();
  });

  it("debe renderizar valor como string", () => {
    render(
      <StatsCard
        icon={iconFixture}
        label="Tasa"
        value="87%"
        accent="green"
      />,
    );

    expect(screen.getByText("87%")).toBeDefined();
  });

  it("debe mostrar tendencia hacia arriba con valor y color verde", () => {
    render(
      <StatsCard
        icon={iconFixture}
        label="Completadas"
        value={120}
        accent="green"
        trend={{ value: 12, direction: "up", label: "vs mes anterior" }}
      />,
    );

    expect(screen.getByText("12%")).toBeDefined();
    expect(screen.getByText("vs mes anterior")).toBeDefined();
  });

  it("debe mostrar tendencia hacia abajo con valor y color rojo", () => {
    render(
      <StatsCard
        icon={iconFixture}
        label="Canceladas"
        value={5}
        accent="red"
        trend={{ value: 8, direction: "down", label: "vs mes anterior" }}
      />,
    );

    expect(screen.getByText("8%")).toBeDefined();
  });

  it("debe mostrar estado de carga con Skeleton", () => {
    const { container } = render(
      <StatsCard
        icon={iconFixture}
        label="Cargando..."
        value={0}
        accent="blue"
        loading={true}
      />,
    );

    // El Skeleton reemplaza al Spinner en loading
    const skeleton = container.querySelector('[data-slot="skeleton"]');
    expect(skeleton).toBeDefined();
    // No debe mostrar el valor numérico
    expect(screen.queryByText("0")).toBeNull();
  });

  it("debe mostrar estado de error con role alert", () => {
    render(
      <StatsCard
        icon={iconFixture}
        label="Error"
        value={0}
        accent="blue"
        error="Error al cargar métrica"
      />,
    );

    const alert = screen.getByRole("alert");
    expect(alert).toBeDefined();
    expect(screen.getByText("Error al cargar métrica")).toBeDefined();
  });

  it("debe aplicar acento azul por defecto", () => {
    const { container } = render(
      <StatsCard
        icon={iconFixture}
        label="Default"
        value={10}
      />,
    );

    // La tarjeta debe tener la clase de borde azul
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain("border-l-blue-500");
  });

  it("debe aplicar acento rojo cuando se especifica", () => {
    const { container } = render(
      <StatsCard
        icon={iconFixture}
        label="Rojo"
        value={10}
        accent="red"
      />,
    );

    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain("border-l-red-500");
  });

  it("debe aplicar acento púrpura cuando se especifica", () => {
    const { container } = render(
      <StatsCard
        icon={iconFixture}
        label="Púrpura"
        value={10}
        accent="purple"
      />,
    );

    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain("border-l-purple-500");
  });

  it("debe renderizar tendencia sin label opcional", () => {
    render(
      <StatsCard
        icon={iconFixture}
        label="Tendencia"
        value={50}
        trend={{ value: 5, direction: "up" }}
      />,
    );

    expect(screen.getByText("5%")).toBeDefined();
  });
});

// ─── StatusBadge ──────────────────────────────────────────────

describe("StatusBadge", () => {
  it("debe renderizar PENDING con color amarillo", () => {
    const { container } = render(<StatusBadge status="PENDING" />);

    expect(screen.getByText("Pendiente")).toBeDefined();
    const badge = container.firstChild as HTMLElement;
    expect(badge.getAttribute("role")).toBe("status");
    expect(badge.className).toContain("bg-yellow-100");
    expect(badge.className).toContain("text-yellow-800");
  });

  it("debe renderizar CONFIRMED con color verde", () => {
    const { container } = render(<StatusBadge status="CONFIRMED" />);
    const badge = container.firstChild as HTMLElement;
    expect(badge.className).toContain("bg-green-100");
    expect(badge.className).toContain("text-green-800");
    expect(screen.getByText("Confirmada")).toBeDefined();
  });

  it("debe renderizar CANCELLED con color rojo", () => {
    const { container } = render(<StatusBadge status="CANCELLED" />);
    const badge = container.firstChild as HTMLElement;
    expect(badge.className).toContain("bg-red-100");
    expect(badge.className).toContain("text-red-800");
    expect(screen.getByText("Cancelada")).toBeDefined();
  });

  it("debe renderizar COMPLETED con color azul", () => {
    const { container } = render(<StatusBadge status="COMPLETED" />);
    const badge = container.firstChild as HTMLElement;
    expect(badge.className).toContain("bg-blue-100");
    expect(badge.className).toContain("text-blue-800");
    expect(screen.getByText("Completada")).toBeDefined();
  });

  it("debe aceptar className adicional", () => {
    const { container } = render(
      <StatusBadge status="PENDING" className="ml-2" />,
    );
    const badge = container.firstChild as HTMLElement;
    expect(badge.className).toContain("ml-2");
  });
});

// ─── EmptyState ───────────────────────────────────────────────

describe("EmptyState", () => {
  it("debe renderizar el mensaje", () => {
    render(<EmptyState message="No hay datos disponibles" />);

    expect(screen.getByText("No hay datos disponibles")).toBeDefined();
  });

  it("debe tener role status para lectores de pantalla", () => {
    render(<EmptyState message="Vacío" />);

    const el = screen.getByRole("status");
    expect(el).toBeDefined();
  });

  it("debe renderizar ícono cuando se proporciona", () => {
    render(
      <EmptyState
        message="Sin citas"
        icon={<span data-testid="empty-icon">📅</span>}
      />,
    );

    expect(screen.getByTestId("empty-icon")).toBeDefined();
  });

  it("debe renderizar acción cuando se proporciona", () => {
    render(
      <EmptyState
        message="Sin pacientes"
        action={<button data-testid="cta-button">Agregar paciente</button>}
      />,
    );

    expect(screen.getByTestId("cta-button")).toBeDefined();
    expect(screen.getByText("Agregar paciente")).toBeDefined();
  });

  it("no debe renderizar acción si no se proporciona", () => {
    render(<EmptyState message="Vacío" />);

    // Solo el div principal y el párrafo
    const el = screen.getByRole("status");
    const buttons = el.querySelectorAll("button");
    expect(buttons.length).toBe(0);
  });

  it("debe aceptar className adicional", () => {
    const { container } = render(
      <EmptyState message="Test" className="mt-8" />,
    );
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain("mt-8");
  });
});

// ─── Spinner ──────────────────────────────────────────────────

describe("Spinner", () => {
  it("debe renderizar con tamaño md por defecto", () => {
    const { container } = render(<Spinner />);

    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(svg!.className.baseVal).toContain("h-6");
    expect(svg!.className.baseVal).toContain("w-6");
  });

  it("debe renderizar con tamaño sm", () => {
    const { container } = render(<Spinner size="sm" />);

    const svg = container.querySelector("svg");
    expect(svg!.className.baseVal).toContain("h-4");
    expect(svg!.className.baseVal).toContain("w-4");
  });

  it("debe renderizar con tamaño lg", () => {
    const { container } = render(<Spinner size="lg" />);

    const svg = container.querySelector("svg");
    expect(svg!.className.baseVal).toContain("h-10");
    expect(svg!.className.baseVal).toContain("w-10");
  });

  it("debe tener role status", () => {
    render(<Spinner />);

    expect(screen.getByRole("status")).toBeDefined();
  });

  it("debe tener aria-label Cargando", () => {
    render(<Spinner />);

    const el = screen.getByRole("status");
    expect(el.getAttribute("aria-label")).toBe("Cargando");
  });

  it("debe tener texto sr-only para lectores de pantalla", () => {
    render(<Spinner />);

    // El span con clase sr-only contiene "Cargando..."
    expect(screen.getByText("Cargando...")).toBeDefined();
  });

  it("debe tener clase animate-spin en el SVG", () => {
    const { container } = render(<Spinner />);

    const svg = container.querySelector("svg");
    expect(svg!.className.baseVal).toContain("animate-spin");
  });

  it("debe aceptar className adicional en el contenedor", () => {
    const { container } = render(<Spinner className="my-4" />);

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain("my-4");
    expect(wrapper.className).toContain("inline-block");
  });
});
