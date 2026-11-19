"use client";

import React from "react";
import {
  Bell,
  BarChart2,
  LayoutDashboard,
  Server,
  Settings,
  ShieldAlert,
} from "lucide-react";

export type NavTab = "overview" | "alerts" | "analytics" | "services" | "settings";

interface SidebarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  activeAlertCount?: number;
}

export function Sidebar({
  activeTab,
  onSelectTab,
  activeAlertCount = 0,
}: SidebarProps) {
  const navItems: Array<{
    id: NavTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
  }> = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    {
      id: "alerts",
      label: "Alerts",
      icon: Bell,
      badge: activeAlertCount,
    },
    { id: "analytics", label: "Analytics", icon: BarChart2 },
    { id: "services", label: "Services", icon: Server },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <aside className="w-56 shrink-0 bg-[#10131a] border-r border-[#1e232e] flex flex-col justify-between select-none">
      {/* Top Branding */}
      <div>
        <div className="h-14 px-4 flex items-center gap-2.5 border-b border-[#1e232e]">
          <div className="h-7 w-7 rounded bg-[#182030] border border-[#2a3754] flex items-center justify-center shrink-0">
            <ShieldAlert className="h-4 w-4 text-blue-400" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-sm tracking-tight text-zinc-100 font-mono">
                AlertPulse
              </span>
              <span className="text-[9px] font-mono font-medium px-1 py-0.2 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                SRE
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="p-2 space-y-0.5">
          <div className="px-2 py-1 text-[10px] font-mono font-semibold uppercase tracking-wider text-zinc-500">
            Incident Ops
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded text-xs font-medium transition-colors cursor-pointer ${
                  isActive
                    ? "bg-[#182132] text-blue-400 font-semibold"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-[#151922]"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon
                    className={`h-4 w-4 shrink-0 ${
                      isActive ? "text-blue-400" : "text-zinc-500"
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </div>

                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-semibold ${
                      isActive
                        ? "bg-blue-500/20 text-blue-300"
                        : "bg-zinc-800 text-zinc-400"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Sidebar Footer / System Telemetry Status */}
      <div className="p-3 border-t border-[#1e232e] text-[11px] font-mono text-zinc-500 space-y-1 bg-[#0d0f14]/40">
        <div className="flex items-center justify-between">
          <span>Pipeline</span>
          <span className="flex items-center gap-1.5 text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Healthy
          </span>
        </div>
        <div className="flex items-center justify-between text-zinc-500">
          <span>Engine</span>
          <span className="text-zinc-400">Gemini 3.5</span>
        </div>
        <div className="flex items-center justify-between text-zinc-500">
          <span>Store</span>
          <span className="text-zinc-400">PostgreSQL</span>
        </div>
      </div>
    </aside>
  );
}
