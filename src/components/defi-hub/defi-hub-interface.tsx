"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreatePoolInterface } from "./create-pool-interface";
import { AddLiquidityInterface } from "./add-liquidity-interface";
import { RemoveLiquidityInterface } from "./remove-liquidity-interface";
import { PositionsInterface } from "./positions-interface";
import { Plus, Minus, Zap, TrendingUp } from "lucide-react";

interface DeFiHubInterfaceProps {
  initialTab?: string;
}

export function DeFiHubInterface({ initialTab = "positions" }: DeFiHubInterfaceProps) {
  const [activeTab, setActiveTab] = useState(initialTab);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  return (
    <div className="w-full">
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-gray-900 border border-gray-800">
          <TabsTrigger
            value="create-pool"
            className="flex items-center gap-2 data-[state=active]:bg-purple-600 data-[state=active]:text-white"
          >
            <Zap className="h-4 w-4" />
            <span className="hidden sm:inline">Create Pool</span>
          </TabsTrigger>
          <TabsTrigger
            value="add-liquidity"
            className="flex items-center gap-2 data-[state=active]:bg-purple-600 data-[state=active]:text-white"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Add Liquidity</span>
          </TabsTrigger>
          <TabsTrigger
            value="remove-liquidity"
            className="flex items-center gap-2 data-[state=active]:bg-purple-600 data-[state=active]:text-white"
          >
            <Minus className="h-4 w-4" />
            <span className="hidden sm:inline">Remove Liquidity</span>
          </TabsTrigger>
          <TabsTrigger
            value="positions"
            className="flex items-center gap-2 data-[state=active]:bg-purple-600 data-[state=active]:text-white"
          >
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:inline">My Positions</span>
          </TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="create-pool" className="space-y-6">
            <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Create New Pool</h2>
              <p className="text-gray-400 mb-6">
                Create a new DLMM pool for a token pair with custom bin step configuration.
              </p>
              <CreatePoolInterface />
            </div>
          </TabsContent>

          <TabsContent value="add-liquidity" className="space-y-6">
            <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Add Liquidity</h2>
              <p className="text-gray-400 mb-6">
                Provide liquidity to existing pools and earn fees from trading activity.
              </p>
              <AddLiquidityInterface />
            </div>
          </TabsContent>

          <TabsContent value="remove-liquidity" className="space-y-6">
            <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Remove Liquidity</h2>
              <p className="text-gray-400 mb-6">
                Withdraw your liquidity from pools and claim earned fees.
              </p>
              <RemoveLiquidityInterface />
            </div>
          </TabsContent>

          <TabsContent value="positions" className="space-y-6">
            <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
              <h2 className="text-xl font-semibold text-white mb-4">My Positions</h2>
              <p className="text-gray-400 mb-6">
                Monitor your liquidity positions, earned fees, and performance analytics.
              </p>
              <PositionsInterface onNavigateToTab={handleTabChange} />
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}