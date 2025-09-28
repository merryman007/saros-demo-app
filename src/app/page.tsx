"use client";

import { useState, useEffect } from "react";
import { fetchPools, Pool, PoolsResponse } from "@/lib/pools";
import Link from "next/link";

const PoolRow = ({ pool }: { pool: Pool }) => {
  return (
    <div className="flex items-center justify-between py-4 px-6 border-b border-gray-800 hover:bg-gray-900/50 transition-colors">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-sm font-bold">
            {pool.tokenX.symbol.charAt(0)}
          </div>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-blue-600 flex items-center justify-center text-sm font-bold">
            {pool.tokenY.symbol.charAt(0)}
          </div>
        </div>
        <div>
          <div className="text-white font-medium">
            {pool.tokenX.symbol} - {pool.tokenY.symbol}
          </div>
          <div className="text-gray-400 text-sm">
            Bin Step {pool.binStep} Fee 0.01%
          </div>
        </div>
      </div>

      <div className="text-right">
        <div className="text-white font-medium">
          ${pool.tvl.toLocaleString()}
        </div>
        <div className="text-gray-400 text-sm">Liquidity</div>
      </div>

      <div className="text-right">
        <div className="text-white font-medium">
          ${pool.volume24h.toLocaleString()}
        </div>
        <div className="text-gray-400 text-sm">Volume (24h)</div>
      </div>

      <div className="text-right">
        <div className="text-white font-medium">
          ${pool.fees24h.toFixed(2)}
        </div>
        <div className="text-gray-400 text-sm">Fees (24h)</div>
      </div>

      <div className="text-right">
        <div className="text-green-400 font-medium">
          {pool.apr24h.toFixed(2)}%
        </div>
        <div className="text-gray-400 text-sm">APR (24h)</div>
      </div>
    </div>
  );
};

export default function HomePage() {
  const [pools, setPools] = useState<Pool[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const loadPools = async (offset: number = 0, append: boolean = false) => {
    if (!append) {
      setInitialLoading(true);
    }
    setLoading(true);
    setError(null);

    try {
      const response: PoolsResponse = await fetchPools(offset, 5);

      if (append) {
        setPools(prev => [...prev, ...response.pools]);
      } else {
        setPools(response.pools);
      }

      setHasMore(response.hasMore);
      setTotal(response.total);
    } catch (error) {
      console.error('Error loading pools:', error);
      setError('Failed to load pools. Please try again.');
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  };

  const loadMore = () => {
    if (!loading && hasMore) {
      loadPools(pools.length, true);
    }
  };

  useEffect(() => {
    loadPools();
  }, []);

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-white mb-2">DLMM Pools</h1>
              <p className="text-gray-400">
                Discover active liquidity pools with real-time metrics and performance data
              </p>
            </div>
            <Link 
              href="/defi-hub?tab=create-pool"
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Create Pool
            </Link>
          </div>
          <div className="mt-4 flex justify-end">
            <Link href="/analytics" className="text-purple-400 hover:text-purple-300 text-sm font-medium transition-colors">
              View More →
            </Link>
          </div>
        </div>

        <div className="bg-gray-950 rounded-lg border border-gray-800">
          <div className="flex items-center justify-between py-4 px-6 border-b border-gray-800 bg-gray-900/50">
            <div className="text-gray-400 text-sm font-medium">Pool</div>
            <div className="text-gray-400 text-sm font-medium">Liquidity</div>
            <div className="text-gray-400 text-sm font-medium">Volume (24h)</div>
            <div className="text-gray-400 text-sm font-medium">Fees (24h)</div>
            <div className="text-gray-400 text-sm font-medium">APR (24h)</div>
          </div>

          {initialLoading ? (
            <div className="py-12 text-center">
              <div className="inline-block w-8 h-8 border-2 border-gray-600 border-t-purple-400 rounded-full animate-spin"></div>
              <div className="mt-3 text-gray-400">Loading DLMM pools from local data...</div>
            </div>
          ) : error ? (
            <div className="py-12 text-center">
              <div className="text-red-400 mb-3">{error}</div>
              <button
                onClick={() => loadPools()}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Retry
              </button>
            </div>
          ) : pools.length === 0 ? (
            <div className="py-12 text-center text-gray-400">
              No DLMM pools found
            </div>
          ) : (
            <>
              {pools.map((pool) => (
                <PoolRow key={pool.address} pool={pool} />
              ))}
            </>
          )}
        </div>

        {pools.length > 0 && (
          <div className="mt-6 text-center">
            {hasMore ? (
              <button
                onClick={loadMore}
                disabled={loading}
                className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 disabled:cursor-not-allowed text-white px-8 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 mx-auto"
              >
                {loading && (
                  <div className="w-4 h-4 border-2 border-purple-300 border-t-white rounded-full animate-spin"></div>
                )}
                {loading ? 'Loading...' : 'Load More Pools'}
              </button>
            ) : (
              <div className="text-gray-400 text-sm">
                Showing all {total} DLMM pools
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
