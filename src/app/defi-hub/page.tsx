"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { DeFiHubInterface } from "@/components/defi-hub/defi-hub-interface";

function DeFiHubContent() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") || "positions";

  return <DeFiHubInterface initialTab={initialTab} />;
}

export default function DeFiHubPage() {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2">DeFi Hub</h1>
        <p className="text-gray-400">
          Create new pools, provide liquidity, and manage your positions
        </p>
      </div>
      
      <Suspense fallback={<div>Loading...</div>}>
        <DeFiHubContent />
      </Suspense>
    </div>
  );
}