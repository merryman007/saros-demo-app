"use client";

import { useState } from "react";
import { Pool } from "@/lib/pools";
import { generateHistoricalData } from "@/lib/analytics-data";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart, Area, AreaChart, Bar } from "recharts";

interface PoolPerformanceAnalyticsProps {
  pools: Pool[];
}

export function PoolPerformanceAnalytics({ pools }: PoolPerformanceAnalyticsProps) {
  const [selectedPool, setSelectedPool] = useState<string>(pools[0]?.address || "");
  const [timeRange, setTimeRange] = useState<string>("7d");

  const pool = pools.find(p => p.address === selectedPool);

  if (!pool) {
    return <div className="text-gray-400">No pool selected</div>;
  }

  // Generate historical data for the selected pool and time range
  const historicalData = generateHistoricalData(pool, timeRange);

  // Calculate metrics
  const currentTVL = pool.tvl;
  const previousTVL = historicalData[0]?.tvl || currentTVL;
  const tvlChange = ((currentTVL - previousTVL) / previousTVL) * 100;

  const totalVolume = historicalData.reduce((sum, day) => sum + day.volume, 0);
  const totalFees = historicalData.reduce((sum, day) => sum + day.fees, 0);
  const averageAPR = historicalData.reduce((sum, day) => sum + day.apr, 0) / historicalData.length;

  // Chart configurations
  const tvlChartConfig: ChartConfig = {
    tvl: {
      label: "TVL",
      color: "#8b5cf6",
    },
  };

  const volumeFeesChartConfig: ChartConfig = {
    volume: {
      label: "Volume",
      color: "#06b6d4",
    },
    fees: {
      label: "Fees",
      color: "#10b981",
    },
  };

  const aprChartConfig: ChartConfig = {
    apr: {
      label: "APR %",
      color: "#f59e0b",
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
        <div className="sm:w-48">
          <label className="block text-sm font-medium text-gray-300 mb-2">Time Range</label>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-900 border-gray-700">
              <SelectItem value="7d" className="text-white hover:bg-gray-800">7 Days</SelectItem>
              <SelectItem value="30d" className="text-white hover:bg-gray-800">30 Days</SelectItem>
              <SelectItem value="90d" className="text-white hover:bg-gray-800">90 Days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <div className="text-gray-400 text-sm font-medium">Current TVL</div>
          <div className="text-2xl font-bold text-white mt-1">
            ${currentTVL.toLocaleString()}
          </div>
          <div className={`text-sm mt-1 ${tvlChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {tvlChange >= 0 ? '+' : ''}{tvlChange.toFixed(2)}%
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <div className="text-gray-400 text-sm font-medium">Total Volume</div>
          <div className="text-2xl font-bold text-white mt-1">
            ${totalVolume.toLocaleString()}
          </div>
          <div className="text-gray-400 text-sm mt-1">{timeRange}</div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <div className="text-gray-400 text-sm font-medium">Total Fees</div>
          <div className="text-2xl font-bold text-white mt-1">
            ${totalFees.toLocaleString()}
          </div>
          <div className="text-gray-400 text-sm mt-1">{timeRange}</div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <div className="text-gray-400 text-sm font-medium">Average APR</div>
          <div className="text-2xl font-bold text-white mt-1">
            {averageAPR.toFixed(2)}%
          </div>
          <div className="text-gray-400 text-sm mt-1">{timeRange} average</div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* TVL Trend */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">TVL Trend</h3>
          <div className="h-64">
            <ChartContainer config={tvlChartConfig}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={historicalData}>
                  <defs>
                    <linearGradient id="tvlGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} />
                  <YAxis stroke="#9ca3af" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#111827',
                      border: '1px solid #374151',
                      borderRadius: '8px'
                    }}
                    labelStyle={{ color: '#e5e7eb' }}
                  />
                  <Area type="monotone" dataKey="tvl" stroke="#8b5cf6" fillOpacity={1} fill="url(#tvlGradient)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>
        </div>

        {/* Volume & Fees */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Volume & Fees</h3>
          <div className="h-64">
            <ChartContainer config={volumeFeesChartConfig}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={historicalData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} />
                  <YAxis stroke="#9ca3af" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#111827',
                      border: '1px solid #374151',
                      borderRadius: '8px'
                    }}
                    labelStyle={{ color: '#e5e7eb' }}
                  />
                  <Bar dataKey="volume" fill="#06b6d4" opacity={0.7} />
                  <Line type="monotone" dataKey="fees" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981', strokeWidth: 2 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>
        </div>

        {/* APR Trend */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">APR Trend</h3>
          <div className="h-64">
            <ChartContainer config={aprChartConfig}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={historicalData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} />
                  <YAxis stroke="#9ca3af" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#111827',
                      border: '1px solid #374151',
                      borderRadius: '8px'
                    }}
                    labelStyle={{ color: '#e5e7eb' }}
                  />
                  <Line type="monotone" dataKey="apr" stroke="#f59e0b" strokeWidth={2} dot={{ fill: '#f59e0b', strokeWidth: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>
        </div>

        {/* Pool Comparison Table */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Pool Comparison</h3>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {pools.slice(0, 8).map((p) => (
              <div key={p.address} className="flex items-center justify-between py-2 px-3 rounded bg-gray-800/50">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-white">
                    {p.tokenX.symbol}-{p.tokenY.symbol}
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-white">
                    ${p.tvl.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-400">
                    {p.apr24h.toFixed(2)}% APR
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}