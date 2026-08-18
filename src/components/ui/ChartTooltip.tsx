"use client";

/**
 * Tooltip personalizado para Recharts con tema del sistema.
 * Compatible con shadcn/ui (bg-popover text-popover-foreground).
 */
export function ChartTooltip({ active, payload, label, valuePrefix = "", valueSuffix = "" }: any) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border bg-popover px-3.5 py-2.5 text-sm shadow-lg">
      {label && (
        <p className="mb-1.5 font-semibold text-popover-foreground border-b pb-1.5">
          {label}
        </p>
      )}
      <div className="space-y-1">
        {payload.map((entry: any, i: number) => (
          <div key={i} className="flex items-center gap-2">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
              style={{ backgroundColor: entry.color || entry.stroke || entry.fill }}
            />
            <span className="text-muted-foreground">{entry.name ?? entry.dataKey}:</span>
            <span className="font-semibold tabular-nums text-popover-foreground">
              {valuePrefix}
              {typeof entry.value === "number"
                ? entry.value.toLocaleString("es-AR")
                : entry.value}
              {valueSuffix}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
