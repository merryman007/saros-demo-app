"use client";

import { useState, useEffect } from "react";
import { fetchAllPools, Pool } from "@/lib/pools";
import { SwapInterface } from "@/components/swap/swap-interface";

export default function SwapPage() {
  const [pools, setPools] = useState<Pool[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPools = async () => {
      try {
        const poolData = await fetchAllPools();
        setPools(poolData);
      } catch (error) {
        console.error("Error loading pools for swap:", error);
        setError("Failed to load available pools");
      } finally {
        setLoading(false);
      }
    };

    loadPools();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen p-6">
        <div className="max-w-2xl mx-auto">
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-2 border-gray-600 border-t-purple-400 rounded-full animate-spin"></div>
            <div className="mt-3 text-gray-400">Loading trading interface...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen p-6">
        <div className="max-w-2xl mx-auto">
          <div className="text-center py-12">
            <div className="text-red-400 mb-3">{error}</div>
            <button
              onClick={() => window.location.reload()}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">Swap Tokens</h1>
          <p className="text-gray-400">
            Trade tokens across DLMM pools with dynamic pricing
          </p>
        </div>

        <SwapInterface pools={pools} />
      </div>
    </div>
  );
}