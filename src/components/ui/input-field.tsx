"use client";

import { forwardRef, type InputHTMLAttributes, useId } from "react";
import { Input as ShadcnInput } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface InputFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

/**
 * Input con label y error integrados (compatibilidad con API anterior).
 * Usa shadcn Input + Label por debajo.
 */
export const InputField = forwardRef<HTMLInputElement, InputFieldProps>(
  ({ label, error, className, id, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const errorId = `${inputId}-error`;
    const describedBy = error ? errorId : undefined;

    return (
      <div className="w-full space-y-2">
        {label && <Label htmlFor={inputId}>{label}</Label>}
        <ShadcnInput
          ref={ref}
          id={inputId}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={describedBy}
          className={cn(error && "border-destructive", className)}
          {...props}
        />
        {error && (
          <p id={errorId} className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);

InputField.displayName = "InputField";
