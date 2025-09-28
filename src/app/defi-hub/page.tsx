"use client";

import { useSearchParams } from "next/navigation";
import { DeFiHubInterface } from "@/components/defi-hub/defi-hub-interface";

export default function DeFiHubPage() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") || "positions";

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2">DeFi Hub</h1>
        <p className="text-gray-400">
          Create new pools, provide liquidity, and manage your positions
        </p>
      </div>
      
      <DeFiHubInterface initialTab={initialTab} />
    </div>
  );
}