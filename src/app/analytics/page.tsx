"use client";

import { useState, useEffect } from "react";
import { fetchAllPools, Pool } from "@/lib/pools";
import { PoolPerformanceAnalytics } from "@/components/analytics/pool-performance";
import { LiquidityDistributionAnalytics } from "@/components/analytics/liquidity-distribution";
import { MarketAnalytics } from "@/components/analytics/market-analytics";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function AnalyticsPage() {
  const [pools, setPools] = useState<Pool[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPools = async () => {
      try {
        const poolData = await fetchAllPools();
        setPools(poolData);
      } catch (error) {
        console.error("Error loading pools for analytics:", error);
      } finally {
        setLoading(false);
      }
    };

    loadPools();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-2 border-gray-600 border-t-purple-400 rounded-full animate-spin"></div>
            <div className="mt-3 text-gray-400">Loading analytics data...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Analytics Dashboard</h1>
          <p className="text-gray-400 mt-1">
            Comprehensive analytics for DLMM pools and market performance
          </p>
        </div>

        <Tabs defaultValue="pool-performance" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-gray-900 border border-gray-800">
            <TabsTrigger
              value="pool-performance"
              className="data-[state=active]:bg-purple-600 data-[state=active]:text-white"
            >
              Pool Performance
            </TabsTrigger>
            <TabsTrigger
              value="liquidity-distribution"
              className="data-[state=active]:bg-purple-600 data-[state=active]:text-white"
            >
              Liquidity Distribution
            </TabsTrigger>
            <TabsTrigger
              value="market-analytics"
              className="data-[state=active]:bg-purple-600 data-[state=active]:text-white"
            >
              Market Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pool-performance" className="mt-6">
            <PoolPerformanceAnalytics pools={pools} />
          </TabsContent>

          <TabsContent value="liquidity-distribution" className="mt-6">
            <LiquidityDistributionAnalytics pools={pools} />
          </TabsContent>

          <TabsContent value="market-analytics" className="mt-6">
            <MarketAnalytics pools={pools} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}