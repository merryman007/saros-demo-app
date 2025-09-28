"use client";

import {
  BarChart3,
  Layers,
  Menu,
  X,
  Settings,
  TrendingUp,
  Zap,
  Activity,
  ArrowLeftRight,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const menuItems = [
  {
    icon: Layers,
    label: "Pools",
    href: "/",
    description: "DLMM pool overview",
  },
  {
    icon: ArrowLeftRight,
    label: "Swap",
    href: "/swap",
    description: "Trade tokens",
  },
  {
    icon: TrendingUp,
    label: "Analytics",
    href: "/analytics",
    description: "Performance metrics",
  },
  {
    icon: Zap,
    label: "DeFi Hub",
    href: "/defi-hub",
    description: "Create pools, add/remove liquidity",
    disabled: false,
  },
  {
    icon: Activity,
    label: "Trading",
    href: "/trading",
    description: "Trade interface",
    disabled: true,
  },
  {
    icon: Settings,
    label: "Settings",
    href: "/settings",
    description: "App configuration",
    disabled: true,
  },
];

interface SidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}

export function Sidebar({ isCollapsed, setIsCollapsed }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile overlay */}
      {!isCollapsed && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsCollapsed(true)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed left-0 top-0 h-full bg-gray-950 border-r border-gray-800 z-50 transition-all duration-300 ${
          isCollapsed ? "-translate-x-full md:translate-x-0 md:w-16" : "w-64"
        }`}
      >
        {/* Header */}
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} p-4 border-b border-gray-800`}>
          {!isCollapsed && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg flex items-center justify-center">
                <BarChart3 className="h-4 w-4 text-white" />
              </div>
              <span className="font-bold text-white">DLMM Dashboard</span>
            </div>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
          >
            {isCollapsed ? <Menu className="h-5 w-5" /> : <X className="h-5 w-5" />}
          </button>
        </div>

        {/* Navigation */}
        <nav className={`p-4 space-y-2 ${isCollapsed ? 'px-2' : ''}`}>
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.disabled ? "#" : item.href}
                className={`flex items-center rounded-lg transition-colors group ${
                  isCollapsed
                    ? `justify-center p-3 ${
                        item.disabled
                          ? "opacity-50 cursor-not-allowed"
                          : isActive
                          ? "bg-purple-600 text-white"
                          : "text-gray-400 hover:bg-gray-800 hover:text-white"
                      }`
                    : `gap-3 p-3 ${
                        item.disabled
                          ? "opacity-50 cursor-not-allowed"
                          : isActive
                          ? "bg-purple-600 text-white"
                          : "text-gray-400 hover:bg-gray-800 hover:text-white"
                      }`
                }`}
                onClick={(e) => item.disabled && e.preventDefault()}
                title={isCollapsed ? item.label : undefined}
              >
                <Icon className={`flex-shrink-0 ${isCollapsed ? 'h-6 w-6' : 'h-5 w-5'}`} />
                {!isCollapsed && (
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{item.label}</div>
                    <div className="text-xs opacity-70 truncate">
                      {item.description}
                    </div>
                  </div>
                )}
                {item.disabled && !isCollapsed && (
                  <span className="text-xs bg-gray-700 px-1.5 py-0.5 rounded">
                    Soon
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        {!isCollapsed && (
          <div className="absolute bottom-4 left-4 right-4">
            <div className="text-xs text-gray-500 text-center">
              DLMM Analytics Dashboard
              <br />
              Version 1.0.0
            </div>
          </div>
        )}
      </div>

      {/* Toggle button for collapsed state - always visible when collapsed */}
      {isCollapsed && (
        <button
          onClick={() => setIsCollapsed(false)}
          className="fixed left-4 top-4 z-50 p-2 rounded-lg bg-gray-900 border border-gray-700 hover:bg-gray-800 text-gray-400 hover:text-white transition-colors shadow-lg"
        >
          <Menu className="h-5 w-5" />
        </button>
      )}
    </>
  );
}