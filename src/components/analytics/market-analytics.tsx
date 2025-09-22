"use client";

import { useState } from "react";
import { Pool } from "@/lib/pools";
import { generateTradingPatterns, generateTokenPriceTrends, generateFeeAnalytics } from "@/lib/analytics-data";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, ComposedChart, Bar } from "recharts";

interface MarketAnalyticsProps {
  pools: Pool[];
}

export function MarketAnalytics({ pools }: MarketAnalyticsProps) {
  const [timeRange, setTimeRange] = useState<string>("7d");
  const [selectedMetric, setSelectedMetric] = useState<string>("volume");
  const [activeDataPoint, setActiveDataPoint] = useState<string | null>(null);

  // Generate market data
  const tradingPatterns = generateTradingPatterns(pools, timeRange);
  const tokenPriceTrends = generateTokenPriceTrends(pools, timeRange);
  const feeAnalytics = generateFeeAnalytics(pools, timeRange);

  // Calculate market metrics
  const totalMarketVolume = pools.reduce((sum, pool) => sum + pool.volume24h, 0);
  const totalMarketTVL = pools.reduce((sum, pool) => sum + pool.tvl, 0);
  const totalMarketFees = pools.reduce((sum, pool) => sum + pool.fees24h, 0);
  const averageMarketAPR = pools.reduce((sum, pool) => sum + pool.apr24h, 0) / pools.length;

  // Volume change calculation
  const currentVolume = tradingPatterns[tradingPatterns.length - 1]?.volume || 0;
  const previousVolume = tradingPatterns[0]?.volume || currentVolume;
  const volumeChange = ((currentVolume - previousVolume) / previousVolume) * 100;

  // Peak trading hours analysis
  const hourlyData = timeRange === "24h" ? tradingPatterns : [];
  const peakHour = hourlyData.length > 0
    ? hourlyData.reduce((max, current) => current.volume > max.volume ? current : max)
    : null;

  // Chart configurations (commented out as unused)
  // const volumeChartConfig: ChartConfig = {
  //   volume: {
  //     label: "Volume",
  //     color: "#06b6d4",
  //   },
  //   trades: {
  //     label: "Trades",
  //     color: "#10b981",
  //   },
  // };

  const priceChartConfig: ChartConfig = {};

  // Dynamically create price chart config for each pool
  pools.slice(0, 5).forEach((pool, index) => {
    const colors = ["#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#ef4444"];
    priceChartConfig[`${pool.tokenX.symbol}_${pool.tokenY.symbol}`] = {
      label: `${pool.tokenX.symbol}/${pool.tokenY.symbol}`,
      color: colors[index],
    };
  });

  const feeChartConfig: ChartConfig = {
    totalFees: {
      label: "Total Fees",
      color: "#8b5cf6",
    },
    avgFeeRate: {
      label: "Avg Fee Rate",
      color: "#f59e0b",
    },
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="sm:w-48">
          <label className="block text-sm font-medium text-gray-300 mb-2">Time Range</label>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-900 border-gray-700">
              <SelectItem value="24h" className="text-white hover:bg-gray-800">24 Hours</SelectItem>
              <SelectItem value="7d" className="text-white hover:bg-gray-800">7 Days</SelectItem>
              <SelectItem value="30d" className="text-white hover:bg-gray-800">30 Days</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="sm:w-48">
          <label className="block text-sm font-medium text-gray-300 mb-2">Metric Focus</label>
          <Select value={selectedMetric} onValueChange={setSelectedMetric}>
            <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-900 border-gray-700">
              <SelectItem value="volume" className="text-white hover:bg-gray-800">Trading Volume</SelectItem>
              <SelectItem value="fees" className="text-white hover:bg-gray-800">Fee Generation</SelectItem>
              <SelectItem value="prices" className="text-white hover:bg-gray-800">Price Trends</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Pool Info Banner */}
      <div className="bg-purple-900/20 border border-purple-700/50 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-white font-medium">Analyzing {pools.length} Active Pools</h4>
            <p className="text-gray-400 text-sm mt-1">
              Top pools: {pools.slice(0, 3).map(p => `${p.tokenX.symbol}-${p.tokenY.symbol}`).join(', ')}
              {pools.length > 3 && ` +${pools.length - 3} more`}
            </p>
          </div>
          <div className="text-purple-400 text-sm">
            Click chart elements to explore data
          </div>
        </div>
      </div>

      {/* Key Market Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <div className="text-gray-400 text-sm font-medium">Market Volume</div>
          <div className="text-2xl font-bold text-white mt-1">
            ${totalMarketVolume.toLocaleString()}
          </div>
          <div className={`text-sm mt-1 ${volumeChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {volumeChange >= 0 ? '+' : ''}{volumeChange.toFixed(2)}% (24h)
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <div className="text-gray-400 text-sm font-medium">Market TVL</div>
          <div className="text-2xl font-bold text-white mt-1">
            ${totalMarketTVL.toLocaleString()}
          </div>
          <div className="text-gray-400 text-sm mt-1">Total locked</div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <div className="text-gray-400 text-sm font-medium">Daily Fees</div>
          <div className="text-2xl font-bold text-white mt-1">
            ${totalMarketFees.toLocaleString()}
          </div>
          <div className="text-gray-400 text-sm mt-1">24h generated</div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <div className="text-gray-400 text-sm font-medium">Avg Market APR</div>
          <div className="text-2xl font-bold text-white mt-1">
            {averageMarketAPR.toFixed(2)}%
          </div>
          <div className="text-gray-400 text-sm mt-1">Across all pools</div>
        </div>
      </div>

      {/* Trading Activity Patterns */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">
          Trading Activity {timeRange === "24h" ? "by Hour" : "Over Time"}
          {peakHour && (
            <span className="text-sm font-normal text-gray-400 ml-2">
              • Peak: {peakHour.time} (${peakHour.volume.toLocaleString()})
            </span>
          )}
          {activeDataPoint && (
            <span className="text-sm font-normal text-green-400 ml-2">
              • Selected: {activeDataPoint}
            </span>
          )}
        </h3>
        <div className="h-80 w-full" style={{ minHeight: '320px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={tradingPatterns}
              margin={{ top: 20, right: 50, left: 70, bottom: 30 }}
            >
                <defs>
                  <linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" strokeOpacity={0.5} />
                <XAxis
                  dataKey="time"
                  stroke="#9ca3af"
                  fontSize={11}
                  tick={{ fontSize: 10 }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  yAxisId="volume"
                  stroke="#06b6d4"
                  fontSize={11}
                  tick={{ fontSize: 10 }}
                  tickFormatter={(value) => `$${(value / 1000000).toFixed(0)}M`}
                  domain={['dataMin * 0.95', 'dataMax * 1.05']}
                />
                <YAxis
                  yAxisId="trades"
                  orientation="right"
                  stroke="#10b981"
                  fontSize={11}
                  tick={{ fontSize: 10 }}
                  tickFormatter={(value) => `${Math.round(value)}`}
                  domain={['dataMin * 0.95', 'dataMax * 1.05']}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#111827',
                    border: '1px solid #374151',
                    borderRadius: '8px'
                  }}
                  labelStyle={{ color: '#e5e7eb' }}
                  formatter={(value, name) => [
                    name === 'volume' ? `$${Number(value).toLocaleString()}` : `${value} trades`,
                    name === 'volume' ? 'Volume' : 'Trades'
                  ]}
                />
                <Area
                  yAxisId="volume"
                  type="monotone"
                  dataKey="volume"
                  stroke="#06b6d4"
                  fillOpacity={1}
                  fill="url(#volumeGradient)"
                  strokeWidth={2}
                  onClick={(data: { payload?: { time: string; volume: number } }) => {
                    if (data && data.payload) {
                      const time = data.payload.time;
                      setActiveDataPoint(time);
                      console.log(`Selected ${time}: ${data.payload.volume.toLocaleString()} volume`);
                    }
                  }}
                  style={{ cursor: 'pointer' }}
                />
                <Line
                  yAxisId="trades"
                  type="monotone"
                  dataKey="trades"
                  stroke="#10b981"
                  strokeWidth={3}
                  dot={false}
                  onClick={(data) => {
                    const time = data.payload.time;
                    setActiveDataPoint(time);
                    console.log(`Selected ${time}: ${data.payload.trades} trades`);
                  }}
                  style={{ cursor: 'pointer' }}
                />
              </ComposedChart>
            </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Token Price Trends */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Token Price Trends</h3>
          <div className="h-64">
            <ChartContainer config={priceChartConfig}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={tokenPriceTrends}>
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
                  {pools.slice(0, 5).map((pool, index) => {
                    const colors = ["#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#ef4444"];
                    const dataKey = `${pool.tokenX.symbol}_${pool.tokenY.symbol}`;
                    return (
                      <Line
                        key={dataKey}
                        type="monotone"
                        dataKey={dataKey}
                        stroke={colors[index]}
                        strokeWidth={2}
                        dot={false}
                      />
                    );
                  })}
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>
        </div>

        {/* Fee Generation Analytics */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Fee Generation Analytics</h3>
          <div className="h-64">
            <ChartContainer config={feeChartConfig}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={feeAnalytics}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="period" stroke="#9ca3af" fontSize={12} />
                  <YAxis yAxisId="fees" stroke="#9ca3af" fontSize={12} />
                  <YAxis yAxisId="rate" orientation="right" stroke="#9ca3af" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#111827',
                      border: '1px solid #374151',
                      borderRadius: '8px'
                    }}
                    labelStyle={{ color: '#e5e7eb' }}
                  />
                  <Bar yAxisId="fees" dataKey="totalFees" fill="#8b5cf6" opacity={0.7} />
                  <Line
                    yAxisId="rate"
                    type="monotone"
                    dataKey="avgFeeRate"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    dot={{ fill: '#f59e0b', strokeWidth: 2 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>
        </div>
      </div>

      {/* Market Summary Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Market Summary by Pool</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Pool</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Volume (24h)</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">TVL</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Fees (24h)</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">APR</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Market Share</th>
              </tr>
            </thead>
            <tbody>
              {pools.slice(0, 10).map((pool) => {
                const marketShare = (pool.volume24h / totalMarketVolume) * 100;
                return (
                  <tr key={pool.address} className="border-b border-gray-800 hover:bg-gray-800/50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <div className="w-4 h-4 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xs font-bold">
                            {pool.tokenX.symbol.charAt(0)}
                          </div>
                          <div className="w-4 h-4 rounded-full bg-gradient-to-br from-green-500 to-blue-600 flex items-center justify-center text-xs font-bold">
                            {pool.tokenY.symbol.charAt(0)}
                          </div>
                        </div>
                        <span className="text-white font-medium">
                          {pool.tokenX.symbol}-{pool.tokenY.symbol}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-white">${pool.volume24h.toLocaleString()}</td>
                    <td className="py-3 px-4 text-white">${pool.tvl.toLocaleString()}</td>
                    <td className="py-3 px-4 text-white">${pool.fees24h.toFixed(2)}</td>
                    <td className="py-3 px-4 text-green-400">{pool.apr24h.toFixed(2)}%</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-purple-500 rounded-full"
                            style={{ width: `${Math.min(100, marketShare)}%` }}
                          />
                        </div>
                        <span className="text-white text-xs">{marketShare.toFixed(1)}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}