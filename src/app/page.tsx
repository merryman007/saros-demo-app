"use client";

import { BinDistributionChart } from "@/components/bin-distribution/chart";
import { BinDistributionTable } from "@/components/bin-distribution/table";
import { getBinLiquidity } from "@/lib/dlmm";
import { BinLiquidityData } from "@/lib/types";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function LiveWorkshopDemo() {
  const [binData, setBinData] = useState<BinLiquidityData[]>([]);

  const getActiveBinData = async () => {
    const data = await getBinLiquidity();
    setBinData(data);
  };

  useEffect(() => {
    getActiveBinData();
  }, []);

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-white">Bin Distribution</h1>
            <p className="text-gray-400 mt-1">
              Analyze liquidity distribution across price bins
            </p>
          </div>
          <Link
            href="/pools"
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            View Pools
          </Link>
        </div>
        <BinDistributionChart binData={binData} />
        <BinDistributionTable binData={binData} />
      </div>
    </div>
  );
}
