"use client";

import { useState } from "react";
import { Sidebar } from "./sidebar";
import { WalletButton, WalletStatus } from "@/components/wallet/wallet-button";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);

  return (
    <div className="flex min-h-screen">
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
      />
      <div
        className={`flex-1 transition-all duration-300 ${
          isSidebarCollapsed ? "md:ml-16" : "ml-64"
        }`}
      >
        {/* Header with wallet button */}
        <header className="bg-gray-900 border-b border-gray-800 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-lg font-semibold text-white">SAROS DLMM</h1>
              <WalletStatus />
            </div>
            <WalletButton />
          </div>
        </header>

        {/* Main content */}
        <div className="h-full">{children}</div>
      </div>
    </div>
  );
}