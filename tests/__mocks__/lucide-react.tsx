/**
 * Mock for lucide-react icons in Jest tests.
 * Returns a simple span for any icon import.
 * IMPORTANTE: si agregás un ícono nuevo en el código, agregalo acá también.
 */
import React from "react";

const MockIcon = (props: Record<string, unknown>) => {
  return React.createElement("span", {
    ...props,
    "data-lucide-icon": "mock",
  });
};

export const CalendarDays = MockIcon;
export const Users = MockIcon;
export const DollarSign = MockIcon;
export const AlertTriangle = MockIcon;
export const Plus = MockIcon;
export const UserPlus = MockIcon;
export const BarChart3 = MockIcon;
export const Menu = MockIcon;
export const Sun = MockIcon;
export const Moon = MockIcon;
export const LogOut = MockIcon;
export const Search = MockIcon;
export const X = MockIcon;
export const ChevronLeft = MockIcon;
export const ChevronRight = MockIcon;
export const Smile = MockIcon;
export const LayoutDashboard = MockIcon;
export const Settings = MockIcon;
export const Calendar = MockIcon;
export const List = MockIcon;
export const Loader2 = MockIcon;
export const CircleCheck = MockIcon;
export const Info = MockIcon;
export const TriangleAlert = MockIcon;
export const OctagonX = MockIcon;
export const Eye = MockIcon;
export const EyeOff = MockIcon;
export const ChevronDown = MockIcon;
export const ChevronUp = MockIcon;
export const Check = MockIcon;
export const ChevronsUpDown = MockIcon;
export const MoreHorizontal = MockIcon;
export const Pencil = MockIcon;
export const Trash2 = MockIcon;
export const UserRound = MockIcon;
export const AlertCircle = MockIcon;
export const TrendingUp = MockIcon;
export const TrendingDown = MockIcon;
export const CheckCircle2 = MockIcon;
export const XCircle = MockIcon;
export const Minus = MockIcon;
export const MessageCircle = MockIcon;
export const ShieldCheck = MockIcon;
export const Zap = MockIcon;
export const ArrowRight = MockIcon;
export const GitBranch = MockIcon;
export const Building2 = MockIcon;
export const Bell = MockIcon;
export const Stethoscope = MockIcon;
export const Save = MockIcon;
export const CornerDownLeft = MockIcon;
export const CalendarCheck = MockIcon;

export default MockIcon;
