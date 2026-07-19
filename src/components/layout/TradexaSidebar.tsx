import {
  BarChart3,
  BookOpen,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  FileText,
  Gauge,
  Goal,
  Settings,
  Target,
} from "lucide-react";
import { useState } from "react";

import tradexaIcon from "../../assets/logo/icon.svg";
import tradexaLogo from "../../assets/logo/logo.svg";

type NavigationItem = {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
};

type TradexaSidebarProps = {
  activePage?: string;
  onNavigate?: (page: string) => void;
};

const navigationItems: NavigationItem[] = [
  { id: "dashboard", label: "Dashboard", icon: Gauge },
  { id: "journal", label: "Journal", icon: BookOpen },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "calendar", label: "Calendar", icon: CalendarDays },
  { id: "reports", label: "Reports", icon: FileText },
  { id: "review", label: "Trade Review", icon: Target },
  { id: "goals", label: "Goals", icon: Goal },
  { id: "settings", label: "Settings", icon: Settings },
];

export default function TradexaSidebar({
  activePage = "journal",
  onNavigate,
}: TradexaSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`
        sticky top-0 hidden h-screen shrink-0 flex-col
        border-r border-[#262626] bg-[#090909]
        transition-[width] duration-200 lg:flex
        ${collapsed ? "w-20" : "w-64"}
      `}
    >
      <div className="flex h-20 items-center border-b border-[#262626] px-4">
        <img
          src={collapsed ? tradexaIcon : tradexaLogo}
          alt="TRADEXA"
          className={collapsed ? "mx-auto h-11 w-11" : "h-11 w-auto"}
        />
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.id === activePage;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate?.(item.id)}
              title={collapsed ? item.label : undefined}
              className={`
                flex w-full items-center rounded-xl py-3
                text-sm font-medium transition-colors
                focus-visible:outline-none
                focus-visible:ring-2 focus-visible:ring-[#E5C158]/60
                ${
                  collapsed
                    ? "justify-center px-2"
                    : "justify-start gap-3 px-3"
                }
                ${
                  isActive
                    ? "border border-[#E5C158]/30 bg-[#E5C158]/10 text-[#E5C158]"
                    : "border border-transparent text-zinc-400 hover:bg-[#151515] hover:text-white"
                }
              `}
            >
              <Icon size={20} className="shrink-0" />

              {!collapsed && <span>{item.label}</span>}
            </button>
          );
        })}
      </nav>

      <div className="border-t border-[#262626] p-3">
        {!collapsed && (
          <div className="mb-3 rounded-xl border border-[#262626] bg-[#111111] p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#E5C158]">
              System Status
            </p>

            <div className="mt-2 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-xs text-zinc-400">
                All systems operational
              </span>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => setCollapsed((value) => !value)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="
            flex w-full items-center justify-center gap-2 rounded-xl
            border border-[#262626] bg-[#111111] px-3 py-3
            text-zinc-400 transition-colors
            hover:border-[#E5C158]/40 hover:text-[#E5C158]
          "
        >
          {collapsed ? (
            <ChevronRight size={18} />
          ) : (
            <>
              <ChevronLeft size={18} />
              <span className="text-sm">Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}