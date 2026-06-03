"use client";

import React, { type ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { AlertCircle, TrendingUp, TrendingDown } from "lucide-react";

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
  loading?: boolean;
  error?: string;
  className?: string;
}

const accentStyles: Record<NonNullable<StatsCardProps["accent"]>, { border: string; icon: string; bg: string }> = {
  blue: {
    border: "border-l-blue-500",
    icon: "text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-950",
    bg: "bg-blue-50/50 dark:bg-blue-950/50",
  },
  green: {
    border: "border-l-green-500",
    icon: "text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-950",
    bg: "bg-green-50/50 dark:bg-green-950/50",
  },
  yellow: {
    border: "border-l-yellow-500",
    icon: "text-yellow-600 bg-yellow-50 dark:text-yellow-400 dark:bg-yellow-950",
    bg: "bg-yellow-50/50 dark:bg-yellow-950/50",
  },
  red: {
    border: "border-l-red-500",
    icon: "text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950",
    bg: "bg-red-50/50 dark:bg-red-950/50",
  },
  purple: {
    border: "border-l-purple-500",
    icon: "text-purple-600 bg-purple-50 dark:text-purple-400 dark:bg-purple-950",
    bg: "bg-purple-50/50 dark:bg-purple-950/50",
  },
};

export const StatsCard = React.memo(function StatsCard({
  icon,
  label,
  value,
  accent = "blue",
  trend,
  loading = false,
  error,
  className,
}: StatsCardProps) {
  const styles = accentStyles[accent];

  if (error) {
    return (
      <Alert variant="destructive" className={className}>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <Card
      className={cn(
        "border-l-4 p-6 transition-shadow hover:shadow-md",
        styles.border,
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-lg",
            styles.icon
          )}
        >
          {icon}
        </div>

        <div className="text-right">
          {loading ? (
            <Skeleton className="ml-auto h-8 w-16" />
          ) : (
            <p className="text-2xl font-bold">{value}</p>
          )}
          <p className="text-sm text-muted-foreground">{label}</p>
        </div>
      </div>

      {trend && (
        <div className="mt-4 flex items-center gap-1">
          {trend.direction === "up" ? (
            <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
          ) : (
            <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
          )}
          <span
            className={cn(
              "text-xs font-medium",
              trend.direction === "up" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
            )}
          >
            {trend.value}%
          </span>
          {trend.label && (
            <span className="text-xs text-muted-foreground">{trend.label}</span>
          )}
        </div>
      )}
    </Card>
  );
});
