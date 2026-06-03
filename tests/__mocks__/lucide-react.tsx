/**
 * Mock for lucide-react icons in Jest tests.
 * Returns a simple span for any icon import.
 */
const MockIcon = (props: Record<string, unknown>) => {
  return {
    type: "span",
    props: {
      ...props,
      "data-lucide-icon": "mock",
    },
  };
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

export default MockIcon;
