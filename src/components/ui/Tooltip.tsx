"use client";

import type { ReactNode } from "react";

interface TooltipProps {
  content: string;
  children: ReactNode;
  side?: "right" | "top" | "bottom" | "left";
}

/**
 * Tooltip minimal que aparece al hacer hover.
 * Solo visible en sidebar colapsado para identificar íconos.
 */
export function Tooltip({ content, children, side = "right" }: TooltipProps) {
  return (
    <div className="group relative inline-flex">
      {children}
      <div
        role="tooltip"
        className={`
          pointer-events-none absolute z-50
          opacity-0 transition-opacity duration-150
          group-hover:opacity-100
          rounded-md bg-popover px-2.5 py-1.5
          text-xs font-medium text-popover-foreground shadow-md
          whitespace-nowrap
          ${side === "right" ? "left-full ml-2 top-1/2 -translate-y-1/2" : ""}
          ${side === "top" ? "bottom-full mb-2 left-1/2 -translate-x-1/2" : ""}
          ${side === "bottom" ? "top-full mt-2 left-1/2 -translate-x-1/2" : ""}
          ${side === "left" ? "right-full mr-2 top-1/2 -translate-y-1/2" : ""}
        `}
      >
        {content}
      </div>
    </div>
  );
}
