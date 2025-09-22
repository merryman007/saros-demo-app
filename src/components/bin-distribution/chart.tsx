import {
  ChartConfig,
  ChartContainer,
} from "@/components/ui/chart";
import { BinLiquidityData } from "@/lib/types";
import { formatNumber } from "@/lib/utils";
import { BarChart3 } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts";
import { useState } from "react";

const chartConfig = {
  totalLiquidity: {
    label: "Liquidity ($)",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

export function BinDistributionChart({
  binData,
}: {
  binData: BinLiquidityData[];
}) {
  const [selectedBin, setSelectedBin] = useState<BinLiquidityData | null>(null);
  if (binData.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-base sm:text-lg flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-purple-600" />
            Bin Distribution Chart
          </h4>
          <div className="text-xs italic">No data available</div>
        </div>
        <div className="flex items-center justify-center h-64 border border-dashed rounded-lg bg-muted/10">
          <p className="text-muted-foreground text-sm">
            No liquidity data to display
          </p>
        </div>
      </div>
    );
  }

  // Simple sort by binId - no complex processing needed
  const sortedBinData = [...binData].sort((a, b) => a.binId - b.binId);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h4 className="font-semibold text-base sm:text-lg flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-purple-600" />
            {binData[0]?.poolMetadata ? (
              `${binData[0].poolMetadata.tokenX.name} / ${binData[0].poolMetadata.tokenY.name}`
            ) : (
              "Bin Distribution Chart"
            )}
          </h4>
          {binData[0]?.poolMetadata && (
            <p className="text-xs text-muted-foreground">
              {binData[0].poolMetadata.tokenX.symbol} - {binData[0].poolMetadata.tokenY.symbol} Pool
            </p>
          )}
        </div>
        <div className="text-xs italic">
          Showing {binData.length} bins with liquidity
        </div>
      </div>

      <div className="flex gap-4">
        {/* Chart Section */}
        <div className="flex-1">
          <ChartContainer config={chartConfig} className="h-[30vh] min-h-[240px]">
            <BarChart
              accessibilityLayer
              data={sortedBinData}
              margin={{
                top: 8,
                left: 8,
                right: 8,
                bottom: 8,
              }}
              onMouseMove={(data) => {
                if (data && data.activePayload && data.activePayload[0]) {
                  setSelectedBin(data.activePayload[0].payload);
                }
              }}
              onMouseLeave={() => setSelectedBin(null)}
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="binId"
                tickLine={false}
                axisLine={false}
                tickMargin={4}
                interval="preserveStartEnd"
                tickFormatter={(value, index) => {
                  if (sortedBinData.length > 20) {
                    const step = Math.ceil(sortedBinData.length / 8);
                    if (index % step === 0 || index === 0 || index === sortedBinData.length - 1) {
                      return `#${index + 1}`;
                    }
                    return '';
                  }
                  return `#${index + 1}`;
                }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={4}
                width={60}
                tickFormatter={(value) => `$${formatNumber(value)}`}
              />
              <Bar dataKey="totalLiquidity" radius={2} cursor="pointer">
                {sortedBinData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.isActive ? "#22c55e" : "#3b82f6"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        </div>

        {/* Static Info Box */}
        <div className="w-72 bg-gray-950 border border-gray-800 rounded-lg p-4">
          <h5 className="font-semibold text-sm mb-3 text-gray-300">Bin Details</h5>
          {selectedBin ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  Bin #{sortedBinData.findIndex(b => b.binId === selectedBin.binId) + 1}
                </span>
                {selectedBin.isActive && (
                  <span className="text-xs bg-green-900/30 text-green-400 px-2 py-1 rounded-full border border-green-800">
                    Active
                  </span>
                )}
              </div>

              <div className="text-xs space-y-1 text-gray-300">
                <div className="flex justify-between">
                  <span>Price:</span>
                  <span className="font-mono">${selectedBin.price?.toFixed(6) || "0.000000"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Liquidity:</span>
                  <span className="font-mono">${formatNumber(selectedBin.totalLiquidity)}</span>
                </div>

                <div className="border-t border-gray-700 pt-2 mt-2">
                  <div className="flex justify-between">
                    <span>{selectedBin.poolMetadata?.tokenX.symbol || "Token X"}:</span>
                    <span className="font-mono">{formatNumber(selectedBin.reserveXAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{selectedBin.poolMetadata?.tokenY.symbol || "Token Y"}:</span>
                    <span className="font-mono">{formatNumber(selectedBin.reserveYAmount)}</span>
                  </div>
                </div>

                <div className="border-t border-gray-700 pt-2 mt-2">
                  <div className="flex justify-between">
                    <span>{selectedBin.poolMetadata?.tokenX.symbol || "Token X"} Value:</span>
                    <span className="font-mono">${formatNumber(selectedBin.reserveXAmount * (selectedBin.price || 0))}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{selectedBin.poolMetadata?.tokenY.symbol || "Token Y"} Value:</span>
                    <span className="font-mono">${formatNumber(selectedBin.reserveYAmount)}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-400 text-center py-8">
              Hover over a bar to see details
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
