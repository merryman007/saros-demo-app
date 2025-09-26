"use client";

import { useState } from "react";
import { Pool } from "@/lib/pools";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface PoolPerformanceAnalyticsProps {
  pools: Pool[];
}

export function PoolPerformanceAnalytics({ pools }: PoolPerformanceAnalyticsProps) {
  const [selectedPool, setSelectedPool] = useState<string>(pools[0]?.address || "");

  const pool = pools.find(p => p.address === selectedPool);

  if (!pool) {
    return <div className="text-gray-400">No pool selected</div>;
  }

  // Calculate pool rankings
  const sortedByTVL = [...pools].sort((a, b) => b.tvl - a.tvl);
  const sortedByVolume = [...pools].sort((a, b) => b.volume24h - a.volume24h);
  const sortedByFees = [...pools].sort((a, b) => b.fees24h - a.fees24h);
  const sortedByAPR = [...pools].sort((a, b) => b.apr24h - a.apr24h);

  const tvlRank = sortedByTVL.findIndex(p => p.address === pool.address) + 1;
  const volumeRank = sortedByVolume.findIndex(p => p.address === pool.address) + 1;
  const feesRank = sortedByFees.findIndex(p => p.address === pool.address) + 1;
  const aprRank = sortedByAPR.findIndex(p => p.address === pool.address) + 1;

  // Calculate market share
  const totalMarketTVL = pools.reduce((sum, p) => sum + p.tvl, 0);
  const totalMarketVolume = pools.reduce((sum, p) => sum + p.volume24h, 0);
  const totalMarketFees = pools.reduce((sum, p) => sum + p.fees24h, 0);

  const tvlMarketShare = (pool.tvl / totalMarketTVL) * 100;
  const volumeMarketShare = (pool.volume24h / totalMarketVolume) * 100;
  const feesMarketShare = (pool.fees24h / totalMarketFees) * 100;

  // Calculate efficiency metrics
  const capitalEfficiency = pool.volume24h / pool.tvl;
  const feeYield = (pool.fees24h / pool.tvl) * 365 * 100; // Annualized fee yield

  return (
    <div className="space-y-6">
      {/* Pool Selection */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-300 mb-2">Select Pool for Analysis</label>
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

      {/* Pool Overview */}
      <div className="bg-purple-900/20 border border-purple-700/50 rounded-lg p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold text-white">
              {pool.tokenX.symbol}-{pool.tokenY.symbol}
            </h3>
            <p className="text-gray-400 mt-1">{pool.description}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-sm font-bold">
              {pool.tokenX.symbol.charAt(0)}
            </div>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-blue-600 flex items-center justify-center text-sm font-bold">
              {pool.tokenY.symbol.charAt(0)}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-gray-400 text-sm">Bin Step</div>
            <div className="text-white font-semibold">{pool.binStep}bp</div>
          </div>
          <div>
            <div className="text-gray-400 text-sm">Status</div>
            <div className={`font-semibold ${pool.isActive ? 'text-green-400' : 'text-red-400'}`}>
              {pool.isActive ? 'Active' : 'Inactive'}
            </div>
          </div>
          <div>
            <div className="text-gray-400 text-sm">Token X</div>
            <div className="text-white font-semibold">{pool.tokenX.symbol}</div>
          </div>
          <div>
            <div className="text-gray-400 text-sm">Token Y</div>
            <div className="text-white font-semibold">{pool.tokenY.symbol}</div>
          </div>
        </div>
      </div>

      {/* Key Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <div className="text-gray-400 text-sm font-medium">Total Value Locked</div>
          <div className="text-2xl font-bold text-white mt-1">
            ${pool.tvl.toLocaleString()}
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-purple-400 text-sm">#{tvlRank} of {pools.length}</span>
            <span className="text-gray-400 text-sm">• {tvlMarketShare.toFixed(1)}% share</span>
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <div className="text-gray-400 text-sm font-medium">Volume (24h)</div>
          <div className="text-2xl font-bold text-white mt-1">
            ${pool.volume24h.toLocaleString()}
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-blue-400 text-sm">#{volumeRank} of {pools.length}</span>
            <span className="text-gray-400 text-sm">• {volumeMarketShare.toFixed(1)}% share</span>
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <div className="text-gray-400 text-sm font-medium">Fees (24h)</div>
          <div className="text-2xl font-bold text-white mt-1">
            ${pool.fees24h.toFixed(2)}
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-green-400 text-sm">#{feesRank} of {pools.length}</span>
            <span className="text-gray-400 text-sm">• {feesMarketShare.toFixed(1)}% share</span>
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <div className="text-gray-400 text-sm font-medium">APR (24h)</div>
          <div className="text-2xl font-bold text-white mt-1">
            {pool.apr24h.toFixed(2)}%
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-yellow-400 text-sm">#{aprRank} of {pools.length}</span>
          </div>
        </div>
      </div>

      {/* Performance Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Efficiency Metrics */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Efficiency Metrics</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <div className="text-white font-medium">Capital Efficiency</div>
                <div className="text-gray-400 text-sm">Volume / TVL ratio</div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-blue-400">
                  {capitalEfficiency.toFixed(3)}x
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <div>
                <div className="text-white font-medium">Fee Yield (Annualized)</div>
                <div className="text-gray-400 text-sm">Based on current fee rate</div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-green-400">
                  {feeYield.toFixed(2)}%
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <div>
                <div className="text-white font-medium">Volume/Fee Ratio</div>
                <div className="text-gray-400 text-sm">Trading efficiency</div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-purple-400">
                  {pool.fees24h > 0 ? (pool.volume24h / pool.fees24h).toFixed(0) + ':1' : 'N/A'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Pool Rankings */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Pool Rankings</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-300">TVL Ranking</span>
              <div className="flex items-center gap-2">
                <span className="text-white font-bold">#{tvlRank}</span>
                <span className="text-gray-400">of {pools.length}</span>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-gray-300">Volume Ranking</span>
              <div className="flex items-center gap-2">
                <span className="text-white font-bold">#{volumeRank}</span>
                <span className="text-gray-400">of {pools.length}</span>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-gray-300">Fees Ranking</span>
              <div className="flex items-center gap-2">
                <span className="text-white font-bold">#{feesRank}</span>
                <span className="text-gray-400">of {pools.length}</span>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-gray-300">APR Ranking</span>
              <div className="flex items-center gap-2">
                <span className="text-white font-bold">#{aprRank}</span>
                <span className="text-gray-400">of {pools.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Market Share Visualization */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Market Share Analysis</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <div className="text-gray-300 text-sm mb-2">TVL Market Share</div>
            <div className="w-full h-3 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-500 rounded-full"
                style={{ width: `${Math.min(100, tvlMarketShare)}%` }}
              />
            </div>
            <div className="text-white font-bold mt-1">{tvlMarketShare.toFixed(2)}%</div>
          </div>

          <div>
            <div className="text-gray-300 text-sm mb-2">Volume Market Share</div>
            <div className="w-full h-3 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full"
                style={{ width: `${Math.min(100, volumeMarketShare)}%` }}
              />
            </div>
            <div className="text-white font-bold mt-1">{volumeMarketShare.toFixed(2)}%</div>
          </div>

          <div>
            <div className="text-gray-300 text-sm mb-2">Fees Market Share</div>
            <div className="w-full h-3 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full"
                style={{ width: `${Math.min(100, feesMarketShare)}%` }}
              />
            </div>
            <div className="text-white font-bold mt-1">{feesMarketShare.toFixed(2)}%</div>
          </div>
        </div>
      </div>

      {/* Pool Comparison */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Similar Pools Comparison</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Pool</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">TVL</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Volume (24h)</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">APR</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Capital Efficiency</th>
              </tr>
            </thead>
            <tbody>
              {pools
                .filter(p => p.address !== pool.address) // Exclude current pool
                .sort((a, b) => Math.abs(a.tvl - pool.tvl) - Math.abs(b.tvl - pool.tvl)) // Sort by similar TVL
                .slice(0, 5)
                .map((comparePool) => (
                <tr key={comparePool.address} className="border-b border-gray-800 hover:bg-gray-800/50">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <div className="w-4 h-4 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xs font-bold">
                          {comparePool.tokenX.symbol.charAt(0)}
                        </div>
                        <div className="w-4 h-4 rounded-full bg-gradient-to-br from-green-500 to-blue-600 flex items-center justify-center text-xs font-bold">
                          {comparePool.tokenY.symbol.charAt(0)}
                        </div>
                      </div>
                      <span className="text-white font-medium">
                        {comparePool.tokenX.symbol}-{comparePool.tokenY.symbol}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-white">${comparePool.tvl.toLocaleString()}</td>
                  <td className="py-3 px-4 text-white">${comparePool.volume24h.toLocaleString()}</td>
                  <td className="py-3 px-4 text-green-400">{comparePool.apr24h.toFixed(2)}%</td>
                  <td className="py-3 px-4 text-blue-400">{(comparePool.volume24h / comparePool.tvl).toFixed(3)}x</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}