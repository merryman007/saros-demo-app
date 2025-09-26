"use client";

import { useState, useEffect } from "react";
import { Pool } from "@/lib/pools";
import { loadRealBinData } from "@/lib/analytics-data";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ScatterChart, Scatter, PieChart, Pie, Cell } from "recharts";

interface LiquidityDistributionAnalyticsProps {
  pools: Pool[];
}

export function LiquidityDistributionAnalytics({ pools }: LiquidityDistributionAnalyticsProps) {
  const [selectedPool, setSelectedPool] = useState<string>(pools[0]?.address || "");
  const [binData, setBinData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const pool = pools.find(p => p.address === selectedPool);

  // Load bin data when pool changes
  useEffect(() => {
    if (!pool) return;

    const loadBinData = async () => {
      console.log("🔧 DEBUG: Loading bin data for pool:", pool.address, pool.name);
      setLoading(true);
      try {
        const data = await loadRealBinData(pool);
        console.log("🔧 DEBUG: Received bin data:", data?.length || 0, "bins");
        console.log("🔧 DEBUG: Sample data:", data?.[0]);
        setBinData(data);
      } catch (error) {
        console.error("Error loading bin data:", error);
        setBinData([]);
      } finally {
        setLoading(false);
      }
    };

    loadBinData();
  }, [pool]);

  if (!pool) {
    return <div className="text-gray-400">No pool selected</div>;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Loading bin data...</div>
      </div>
    );
  }

  if (binData.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col items-center justify-center h-64 border border-dashed border-gray-700 rounded-lg bg-gray-900/50">
          <div className="text-center space-y-3">
            <div className="text-gray-400 text-lg font-medium">No Bin Data Available</div>
            <div className="text-gray-500 text-sm max-w-md">
              Real DLMM bin data is required to display liquidity distribution analytics.
            </div>
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 font-mono text-sm text-gray-300">
              <div className="text-gray-400 mb-2">Generate bin data:</div>
              <code className="text-purple-400">npm run fetch_bins</code>
              <div className="text-gray-500 mt-2 text-xs">
                Fetches real bin data for top pools by TVL
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Calculate analytics
  const totalLiquidity = binData.reduce((sum, bin) => sum + bin.totalLiquidity, 0);
  const activeBins = binData.filter(bin => bin.totalLiquidity > 0).length;
  const concentrationRatio = Math.max(...binData.map(bin => bin.totalLiquidity)) / totalLiquidity;
  const averageUtilization = binData.reduce((sum, bin) => sum + (bin.utilization || 0), 0) / binData.length;

  // Prepare data for different charts
  const liquidityDistribution = binData.map(bin => ({
    binId: bin.binId,
    price: bin.price,
    liquidity: bin.totalLiquidity,
    utilization: bin.utilization || 0,
    isActive: bin.isActive,
  }));

  // Price impact analysis data
  const priceImpactData = binData.map((bin, index) => ({
    price: bin.price,
    depth: binData.slice(0, index + 1).reduce((sum, b) => sum + b.totalLiquidity, 0),
    impact: index * 0.1, // Simulated price impact
  }));

  // Concentration analysis
  const concentrationData = [
    { name: "Top 3 Bins", value: binData.slice(0, 3).reduce((sum, bin) => sum + bin.totalLiquidity, 0), color: "#8b5cf6" },
    { name: "Next 5 Bins", value: binData.slice(3, 8).reduce((sum, bin) => sum + bin.totalLiquidity, 0), color: "#06b6d4" },
    { name: "Remaining Bins", value: binData.slice(8).reduce((sum, bin) => sum + bin.totalLiquidity, 0), color: "#10b981" },
  ];

  // ChartContainer configurations
  const liquidityChartConfig: ChartConfig = {
    liquidity: {
      label: "Liquidity",
      color: "#8b5cf6",
    },
  };

  const utilizationChartConfig: ChartConfig = {
    utilization: {
      label: "Utilization %",
      color: "#f59e0b",
    },
  };

  const depthChartConfig: ChartConfig = {
    depth: {
      label: "Cumulative Depth",
      color: "#06b6d4",
    },
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-300 mb-2">Select Pool</label>
          <Select value={selectedPool} onValueChange={setSelectedPool}>
            <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
              <SelectValue placeholder="Choose a pool" />
            </SelectTrigger>
            <SelectContent className="bg-gray-900 border-gray-700">
              {pools.map((pool) => (
                <SelectItem key={pool.address} value={pool.address} className="text-white hover:bg-gray-800">
                  {pool.tokenX.symbol}-{pool.tokenY.symbol}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <div className="text-gray-400 text-sm font-medium">Total Liquidity</div>
          <div className="text-2xl font-bold text-white mt-1">
            ${totalLiquidity.toLocaleString()}
          </div>
          <div className="text-gray-400 text-sm mt-1">Across all bins</div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <div className="text-gray-400 text-sm font-medium">Active Bins</div>
          <div className="text-2xl font-bold text-white mt-1">
            {activeBins}
          </div>
          <div className="text-gray-400 text-sm mt-1">With liquidity</div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <div className="text-gray-400 text-sm font-medium">Concentration</div>
          <div className="text-2xl font-bold text-white mt-1">
            {(concentrationRatio * 100).toFixed(1)}%
          </div>
          <div className="text-gray-400 text-sm mt-1">Top bin ratio</div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <div className="text-gray-400 text-sm font-medium">Avg Utilization</div>
          <div className="text-2xl font-bold text-white mt-1">
            {averageUtilization.toFixed(1)}%
          </div>
          <div className="text-gray-400 text-sm mt-1">Efficiency score</div>
        </div>
      </div>

      {/* ChartContainers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Liquidity Distribution */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Liquidity Distribution by Price</h3>
          <div className="h-64">
            <ChartContainer config={liquidityChartConfig}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={liquidityDistribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis
                    dataKey="price"
                    stroke="#9ca3af"
                    fontSize={12}
                    tickFormatter={(value) => `$${value}`}
                  />
                  <YAxis stroke="#9ca3af" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#111827',
                      border: '1px solid #374151',
                      borderRadius: '8px'
                    }}
                    labelStyle={{ color: '#e5e7eb' }}
                    formatter={(value) => [`$${value.toLocaleString()}`, 'Liquidity']}
                    labelFormatter={(label) => `Price: $${label}`}
                  />
                  <Bar
                    dataKey="liquidity"
                    fill="#8b5cf6"
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>
        </div>

        {/* Bin Utilization Efficiency */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Bin Utilization Efficiency</h3>
          <div className="h-64">
            <ChartContainer config={utilizationChartConfig}>
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart data={liquidityDistribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis
                    dataKey="price"
                    stroke="#9ca3af"
                    fontSize={12}
                    tickFormatter={(value) => `$${value}`}
                  />
                  <YAxis
                    dataKey="utilization"
                    stroke="#9ca3af"
                    fontSize={12}
                    label={{ value: 'Utilization %', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#111827',
                      border: '1px solid #374151',
                      borderRadius: '8px'
                    }}
                    labelStyle={{ color: '#e5e7eb' }}
                    formatter={(value) => [`${Number(value).toFixed(1)}%`, 'Utilization']}
                    labelFormatter={(label) => `Price: $${label}`}
                  />
                  <Scatter dataKey="utilization" fill="#f59e0b" />
                </ScatterChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>
        </div>

        {/* Price Impact Analysis */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Cumulative Liquidity Depth</h3>
          <div className="h-64">
            <ChartContainer config={depthChartConfig}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={priceImpactData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis
                    dataKey="price"
                    stroke="#9ca3af"
                    fontSize={12}
                    tickFormatter={(value) => `$${value}`}
                  />
                  <YAxis stroke="#9ca3af" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#111827',
                      border: '1px solid #374151',
                      borderRadius: '8px'
                    }}
                    labelStyle={{ color: '#e5e7eb' }}
                    formatter={(value) => [`$${value.toLocaleString()}`, 'Cumulative Depth']}
                    labelFormatter={(label) => `Price: $${label}`}
                  />
                  <Bar dataKey="depth" fill="#06b6d4" />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>
        </div>

        {/* Liquidity Concentration */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Liquidity Concentration</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={concentrationData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                  labelLine={false}
                >
                  {concentrationData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#111827',
                    border: '1px solid #374151',
                    borderRadius: '8px'
                  }}
                  labelStyle={{ color: '#e5e7eb' }}
                  formatter={(value) => [`$${value.toLocaleString()}`, 'Liquidity']}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Detailed Bin Analysis Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Detailed Bin Analysis</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Bin ID</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Price Range</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Liquidity</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Utilization</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {binData.slice(0, 10).map((bin) => (
                <tr key={bin.binId} className="border-b border-gray-800 hover:bg-gray-800/50">
                  <td className="py-3 px-4 text-white font-mono">{bin.binId}</td>
                  <td className="py-3 px-4 text-white">${bin.price.toFixed(4)}</td>
                  <td className="py-3 px-4 text-white">${bin.totalLiquidity.toLocaleString()}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-12 h-2 bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-purple-500 rounded-full"
                          style={{ width: `${Math.min(100, bin.utilization || 0)}%` }}
                        />
                      </div>
                      <span className="text-white text-xs">{(bin.utilization || 0).toFixed(1)}%</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      bin.isActive
                        ? 'bg-green-900 text-green-300'
                        : bin.totalLiquidity > 0
                        ? 'bg-blue-900 text-blue-300'
                        : 'bg-gray-800 text-gray-400'
                    }`}>
                      {bin.isActive ? 'Active' : bin.totalLiquidity > 0 ? 'Has Liquidity' : 'Empty'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}