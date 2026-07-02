"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, ChevronLeft, X } from "lucide-react";
import { useOnboarding } from "@/hooks/useOnboarding";

/**
 * Tour de onboarding que muestra un overlay con spotlight + tooltip.
 * Guía al usuario nuevo por 4 pasos clave del dashboard.
 * Se cierra automáticamente al completar y persiste en localStorage.
 */
export function OnboardingTour() {
  const {
    steps,
    currentStep,
    isActive,
    isDismissed,
    next,
    prev,
    dismiss,
    currentStepData,
    isLast,
  } = useOnboarding();

  const [spotlight, setSpotlight] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);

  const updateSpotlight = useCallback(() => {
    if (!isActive || !currentStepData) {
      setSpotlight(null);
      return;
    }

    const el = document.querySelector(
      `[data-onboarding="${currentStepData.target}"]`
    ) as HTMLElement | null;

    if (el) {
      const rect = el.getBoundingClientRect();
      setSpotlight({
        top: rect.top - 4,
        left: rect.left - 4,
        width: rect.width + 8,
        height: rect.height + 8,
      });
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    } else {
      setSpotlight(null);
    }
  }, [isActive, currentStepData]);

  useEffect(() => {
    updateSpotlight();
    window.addEventListener("resize", updateSpotlight);
    window.addEventListener("scroll", updateSpotlight);
    return () => {
      window.removeEventListener("resize", updateSpotlight);
      window.removeEventListener("scroll", updateSpotlight);
    };
  }, [updateSpotlight]);

  if (isDismissed || !isActive) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50">
        {/* Overlay semi-transparente */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50"
          onClick={(e) => e.stopPropagation()}
        />

        {/* Spotlight cutout */}
        {spotlight && (
          <div
            className="absolute rounded-xl ring-4 ring-primary/60 transition-all duration-300"
            style={{
              top: spotlight.top,
              left: spotlight.left,
              width: spotlight.width,
              height: spotlight.height,
              boxShadow: "0 0 0 9999px rgba(0,0,0,0.5)",
            }}
          />
        )}

        {/* Tooltip card */}
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          className="absolute bottom-8 left-1/2 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-xl border bg-card p-6 shadow-2xl"
        >
          {/* Step counter */}
          <p className="mb-1 text-xs font-medium text-muted-foreground">
            Paso {currentStep + 1} de {steps.length}
          </p>

          <h3 className="text-lg font-semibold text-foreground">
            {currentStepData?.title}
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {currentStepData?.description}
          </p>

          {/* Navigation */}
          <div className="mt-5 flex items-center justify-between">
            <button
              onClick={dismiss}
              className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:text-foreground"
              aria-label="Cerrar tour"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-2">
              {/* Dots indicator */}
              <div className="mr-3 flex gap-1.5">
                {steps.map((_, i) => (
                  <span
                    key={i}
                    className={`block h-1.5 w-1.5 rounded-full transition-colors ${
                      i === currentStep
                        ? "bg-primary"
                        : "bg-muted-foreground/30"
                    }`}
                  />
                ))}
              </div>

              {currentStep > 0 && (
                <button
                  onClick={prev}
                  className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Anterior
                </button>
              )}

              <button
                onClick={next}
                className="inline-flex items-center gap-1 rounded-lg bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                {isLast ? "Finalizar" : "Siguiente"}
                {!isLast && <ChevronRight className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
