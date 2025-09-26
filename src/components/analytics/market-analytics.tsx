"use client";

import { Pool } from "@/lib/pools";

interface MarketAnalyticsProps {
  pools: Pool[];
}

export function MarketAnalytics({ pools }: MarketAnalyticsProps) {
  // Calculate real market metrics from actual pool data
  const totalMarketVolume = pools.reduce((sum, pool) => sum + pool.volume24h, 0);
  const totalMarketTVL = pools.reduce((sum, pool) => sum + pool.tvl, 0);
  const totalMarketFees = pools.reduce((sum, pool) => sum + pool.fees24h, 0);
  const averageMarketAPR = pools.reduce((sum, pool) => sum + pool.apr24h, 0) / pools.length;

  // Find top performing pools
  const topPoolsByTVL = [...pools].sort((a, b) => b.tvl - a.tvl).slice(0, 5);
  const topPoolsByVolume = [...pools].sort((a, b) => b.volume24h - a.volume24h).slice(0, 5);
  const topPoolsByAPR = [...pools].sort((a, b) => b.apr24h - a.apr24h).slice(0, 5);

  // Calculate market efficiency metrics
  const totalActivePools = pools.filter(p => p.isActive).length;
  const averagePoolSize = totalMarketTVL / totalActivePools;
  const feeToVolumeRatio = totalMarketFees / totalMarketVolume * 100;

  return (
    <div className="space-y-6">
      {/* Market Overview Banner */}
      <div className="bg-purple-900/20 border border-purple-700/50 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-white font-medium">Market Overview - {totalActivePools} Active Pools</h4>
            <p className="text-gray-400 text-sm mt-1">
              Real-time metrics from your DLMM pools database
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-400">Average Pool Size</div>
            <div className="text-lg font-bold text-purple-400">${averagePoolSize.toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* Key Market Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <div className="text-gray-400 text-sm font-medium">Market Volume (24h)</div>
          <div className="text-2xl font-bold text-white mt-1">
            ${totalMarketVolume.toLocaleString()}
          </div>
          <div className="text-gray-400 text-sm mt-1">Total trading volume</div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <div className="text-gray-400 text-sm font-medium">Market TVL</div>
          <div className="text-2xl font-bold text-white mt-1">
            ${totalMarketTVL.toLocaleString()}
          </div>
          <div className="text-gray-400 text-sm mt-1">Total value locked</div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <div className="text-gray-400 text-sm font-medium">Daily Fees</div>
          <div className="text-2xl font-bold text-white mt-1">
            ${totalMarketFees.toLocaleString()}
          </div>
          <div className="text-gray-400 text-sm mt-1">24h fees generated</div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <div className="text-gray-400 text-sm font-medium">Average APR</div>
          <div className="text-2xl font-bold text-white mt-1">
            {averageMarketAPR.toFixed(2)}%
          </div>
          <div className="text-gray-400 text-sm mt-1">Across all pools</div>
        </div>
      </div>

      {/* Market Efficiency */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <div className="text-gray-400 text-sm font-medium">Active Pools</div>
          <div className="text-xl font-bold text-white mt-1">{totalActivePools}</div>
          <div className="text-gray-400 text-sm mt-1">Currently active</div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <div className="text-gray-400 text-sm font-medium">Fee Efficiency</div>
          <div className="text-xl font-bold text-white mt-1">{feeToVolumeRatio.toFixed(3)}%</div>
          <div className="text-gray-400 text-sm mt-1">Fee to volume ratio</div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <div className="text-gray-400 text-sm font-medium">Total Pools</div>
          <div className="text-xl font-bold text-white mt-1">{pools.length}</div>
          <div className="text-gray-400 text-sm mt-1">In database</div>
        </div>
      </div>

      {/* Top Performers Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Pools by TVL */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Top Pools by TVL</h3>
          <div className="space-y-3">
            {topPoolsByTVL.map((pool, index) => (
              <div key={pool.address} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 text-sm w-4">{index + 1}.</span>
                  <span className="text-white font-medium">
                    {pool.tokenX.symbol}-{pool.tokenY.symbol}
                  </span>
                </div>
                <span className="text-green-400">${pool.tvl.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Pools by Volume */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Top Pools by Volume (24h)</h3>
          <div className="space-y-3">
            {topPoolsByVolume.map((pool, index) => (
              <div key={pool.address} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 text-sm w-4">{index + 1}.</span>
                  <span className="text-white font-medium">
                    {pool.tokenX.symbol}-{pool.tokenY.symbol}
                  </span>
                </div>
                <span className="text-blue-400">${pool.volume24h.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Pools by APR */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Top Pools by APR</h3>
          <div className="space-y-3">
            {topPoolsByAPR.map((pool, index) => (
              <div key={pool.address} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 text-sm w-4">{index + 1}.</span>
                  <span className="text-white font-medium">
                    {pool.tokenX.symbol}-{pool.tokenY.symbol}
                  </span>
                </div>
                <span className="text-purple-400">{pool.apr24h.toFixed(2)}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Detailed Market Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Market Overview by Pool</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Pool</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">TVL</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Volume (24h)</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Fees (24h)</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">APR</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Market Share</th>
              </tr>
            </thead>
            <tbody>
              {pools.slice(0, 15).map((pool) => {
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
                    <td className="py-3 px-4 text-white">${pool.tvl.toLocaleString()}</td>
                    <td className="py-3 px-4 text-white">${pool.volume24h.toLocaleString()}</td>
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