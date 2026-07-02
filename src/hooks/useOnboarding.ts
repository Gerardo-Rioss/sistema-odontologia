"use client";

import { useState, useCallback, useEffect } from "react";

export interface OnboardingStep {
  target: string;
  title: string;
  description: string;
}

const STEPS: OnboardingStep[] = [
  {
    target: "sidebar",
    title: "Navegación",
    description:
      "Usá el menú lateral para moverte entre secciones: Dashboard, Citas, Pacientes, Estadísticas y Configuración.",
  },
  {
    target: "new-appointment",
    title: "Nueva cita",
    description:
      "Creá citas para tus pacientes desde aquí. También podés verlas en calendario o lista.",
  },
  {
    target: "stats",
    title: "Métricas clave",
    description:
      "Visualizá de un vistazo las citas del día, pacientes nuevos y tasas de actividad de tu consultorio.",
  },
  {
    target: "user-menu",
    title: "Tu perfil",
    description:
      "Cambiá entre modo claro/oscuro, gestioná tu cuenta o cerrá sesión desde este menú.",
  },
];

const STORAGE_KEY = "onboarding-dismissed";

export function useOnboarding() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [isDismissed, setIsDismissed] = useState(true);

  useEffect(() => {
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (!dismissed) {
      const timer = setTimeout(() => setIsActive(true), 600);
      setIsDismissed(false);
      return () => clearTimeout(timer);
    }
  }, []);

  const next = useCallback(() => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      localStorage.setItem(STORAGE_KEY, "true");
      setIsActive(false);
      setIsDismissed(true);
    }
  }, [currentStep]);

  const prev = useCallback(() => {
    if (currentStep > 0) setCurrentStep((s) => s - 1);
  }, [currentStep]);

  const dismiss = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, "true");
    setIsActive(false);
    setIsDismissed(true);
  }, []);

  return {
    steps: STEPS,
    currentStep,
    isActive,
    isDismissed,
    next,
    prev,
    dismiss,
    currentStepData: STEPS[currentStep] ?? null,
    isLast: currentStep === STEPS.length - 1,
  };
}
