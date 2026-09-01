"use client";

import React, { type ReactNode } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { AlertCircle, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useCountUp } from "@/hooks/useCountUp";

interface StatsCardProps {
  icon: ReactNode;
  label: string;
  value: string | number;
  accent?: "blue" | "green" | "yellow" | "red" | "purple";
  trend?: {
    value: number;
    direction: "up" | "down";
    label?: string;
  };
  /** Serie numérica opcional para mini-sparkline (último valor a la derecha). */
  sparkline?: number[];
  /** Si se pasa, la tarjeta se convierte en link a esa ruta. */
  href?: string;
  loading?: boolean;
  error?: string;
  className?: string;
}

type AccentKey = NonNullable<StatsCardProps["accent"]>;

const accentStyles: Record<AccentKey, { border: string; icon: string; glow: string; dot: string }> = {
  blue: {
    border: "border-l-teal-500",
    icon: "text-teal-600 bg-teal-50 dark:text-teal-300 dark:bg-teal-950",
    glow: "bg-[radial-gradient(ellipse_at_top_right,hsl(var(--info)/0.12),transparent_65%)]",
    dot: "bg-teal-500",
  },
  green: {
    border: "border-l-emerald-500",
    icon: "text-emerald-600 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-950",
    glow: "bg-[radial-gradient(ellipse_at_top_right,hsl(var(--success)/0.12),transparent_65%)]",
    dot: "bg-emerald-500",
  },
  yellow: {
    border: "border-l-amber-500",
    icon: "text-amber-600 bg-amber-50 dark:text-amber-300 dark:bg-amber-950",
    glow: "bg-[radial-gradient(ellipse_at_top_right,hsl(var(--warning)/0.12),transparent_65%)]",
    dot: "bg-amber-500",
  },
  red: {
    border: "border-l-rose-500",
    icon: "text-rose-600 bg-rose-50 dark:text-rose-300 dark:bg-rose-950",
    glow: "bg-[radial-gradient(ellipse_at_top_right,hsl(var(--destructive)/0.12),transparent_65%)]",
    dot: "bg-rose-500",
  },
  purple: {
    border: "border-l-violet-500",
    icon: "text-violet-600 bg-violet-50 dark:text-violet-300 dark:bg-violet-950",
    glow: "bg-[radial-gradient(ellipse_at_top_right,hsl(var(--primary)/0.12),transparent_65%)]",
    dot: "bg-violet-500",
  },
};

/** Mini-sparkline SVG (área + línea) sin dependencias externas. */
function Sparkline({ data, className }: { data: number[]; className?: string }) {
  const id = React.useId();
  if (data.length < 2) return null;
  const w = 96;
  const h = 32;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - 4 - ((v - min) / range) * (h - 8);
    return [x, y] as const;
  });
  const line = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `0,${h} ${line} ${w},${h}`;
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className={cn("h-8 w-24", className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.25" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#${id})`} />
      <polyline
        points={line}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export const StatsCard = React.memo(function StatsCard({
  icon,
  label,
  value,
  accent = "blue",
  trend,
  sparkline,
  href,
  loading = false,
  error,
  className,
}: StatsCardProps) {
  const styles = accentStyles[accent];
  const animatedValue = useCountUp(value);

  if (error) {
    return (
      <Alert variant="destructive" className={className}>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  const card = (
    <Card
      className={cn(
        "group relative overflow-hidden border-l-4 p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg",
        href && "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        styles.border,
        className
      )}
    >
      {/* Resplandor sutil de acento */}
      <div className={cn("pointer-events-none absolute inset-0", styles.glow)} aria-hidden="true" />

      <div className="relative flex items-start justify-between">
        <div
          className={cn(
            "flex h-11 w-11 items-center justify-center rounded-xl shadow-sm transition-transform group-hover:scale-105",
            styles.icon
          )}
        >
          {icon}
        </div>

        <div className="text-right">
          {loading ? (
            <Skeleton className="ml-auto h-8 w-16" />
          ) : (
            <p className="text-2xl font-bold tabular-nums tracking-tight">{animatedValue}</p>
          )}
          <p className="mt-0.5 text-xs font-medium text-muted-foreground">{label}</p>
        </div>
      </div>

      <div className="relative mt-4 flex items-end justify-between gap-2">
        {/* Sparkline opcional */}
        {sparkline ? (
          <Sparkline data={sparkline} className={cn("text-foreground/40", `dark:text-foreground/60`)} />
        ) : (
          <span className={cn("h-1.5 w-1.5 rounded-full", styles.dot)} aria-hidden="true" />
        )}

        {/* Pill de tendencia */}
        {trend && (
          <div
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
              trend.direction === "up"
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                : trend.direction === "down"
                  ? "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                  : "bg-muted text-muted-foreground"
            )}
          >
            {trend.direction === "up" ? (
              <TrendingUp className="h-3 w-3" />
            ) : trend.direction === "down" ? (
              <TrendingDown className="h-3 w-3" />
            ) : (
              <Minus className="h-3 w-3" />
            )}
            <span className="tabular-nums">{trend.value}%</span>
            {trend.label && (
              <span className="font-normal text-muted-foreground">{trend.label}</span>
            )}
          </div>
        )}
      </div>

      {/* Indicador de navegación */}
      {href && (
        <span
          className="absolute right-3 top-3 text-muted-foreground/0 transition-colors group-hover:text-primary"
          aria-hidden="true"
        >
          →
        </span>
      )}
    </Card>
  );

  if (href) {
    return (
      <Link href={href} className="block">
        {card}
      </Link>
    );
  }

  return card;
});
