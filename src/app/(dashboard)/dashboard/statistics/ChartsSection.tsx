"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  ResponsiveContainer,
} from "recharts";

// ─── Colores para los gráficos ─────────────────────────────────

const PIE_COLORS = ["#3b82f6", "#22c55e", "#eab308", "#a855f7", "#6b7280"];

const BAR_COLOR = "#3b82f6";
const LINE_COLOR = "#22c55e";

// ─── Tooltip personalizado en español ──────────────────────────

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload) return null;
  return (
    <div className="rounded-lg border bg-card px-3 py-2 text-sm shadow-lg">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="text-sm font-semibold" style={{ color: entry.color }}>
          {entry.name}: {entry.value}
        </p>
      ))}
    </div>
  );
}

// ─── Props ─────────────────────────────────────────────────────

interface ChartsSectionProps {
  appointmentsByMonth: Array<{ month: string; count: number }>;
  byType: Array<{ type: string; count: number }>;
  completionTrend: Array<{ month: string; rate: number }>;
}

// ─── Componente ────────────────────────────────────────────────

/**
 * Sección de gráficos Recharts para la página de estadísticas.
 *
 * Se importa dinámicamente con `next/dynamic({ ssr: false })` para
 * excluir Recharts (~200KB gzipped) del bundle del servidor.
 */
export function ChartsSection({
  appointmentsByMonth,
  byType,
  completionTrend,
}: ChartsSectionProps) {
  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      {/* Gráfico de barras: Citas por mes */}
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-foreground">
          Citas por mes
        </h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={appointmentsByMonth}
            margin={{ top: 5, right: 10, left: -10, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11, fill: "#6b7280" }}
              tickLine={false}
              angle={-35}
              textAnchor="end"
              height={60}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#6b7280" }}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar
              dataKey="count"
              name="Citas"
              fill={BAR_COLOR}
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Gráfico de torta: Distribución por tipo */}
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-foreground">
          Tipos de cita
        </h2>
        {byType.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={byType}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="count"
                nameKey="type"
                label={({
                  payload,
                }: {
                  payload?: { type: string; count: number };
                }) =>
                  payload ? `${payload.type} (${payload.count})` : ""
                }
                labelLine={false}
              >
                {byType.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={PIE_COLORS[index % PIE_COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
            Sin datos de tipos de cita
          </div>
        )}
      </div>

      {/* Gráfico de líneas: Tendencia de completadas */}
      <div className="rounded-xl border bg-card p-6 shadow-sm xl:col-span-2">
        <h2 className="mb-4 text-lg font-semibold text-foreground">
          Tendencia de tasa de completadas
        </h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart
            data={completionTrend}
            margin={{ top: 5, right: 10, left: -10, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11, fill: "#6b7280" }}
              tickLine={false}
              angle={-35}
              textAnchor="end"
              height={60}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#6b7280" }}
              tickLine={false}
              domain={[0, 100]}
              tickFormatter={(value) => `${value}%`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              formatter={() => "Tasa de citas completadas"}
              wrapperStyle={{ fontSize: 12 }}
            />
            <Line
              type="monotone"
              dataKey="rate"
              name="Tasa de completadas"
              stroke={LINE_COLOR}
              strokeWidth={2}
              dot={{ r: 4, fill: LINE_COLOR }}
              activeDot={{ r: 6, fill: LINE_COLOR, stroke: "white", strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
