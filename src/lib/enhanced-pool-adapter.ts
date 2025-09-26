import { Pool } from "./pools";

// Enhanced pool data structure from fetch_pools_enhanced.js
interface EnhancedPoolData {
  address: string;
  name: string;
  description: string;
  tokenX: {
    mintAddress: string;
    symbol: string;
    name: string;
    decimals: number;
    logoURI: string | null;
    tags: string[];
    isRegistered: boolean;
  };
  tokenY: {
    mintAddress: string;
    symbol: string;
    name: string;
    decimals: number;
    logoURI: string | null;
    tags: string[];
    isRegistered: boolean;
  };
  binStep: number;
  feeRate: number;
  reserves: {
    base: {
      raw: string;
      normalized: number;
      decimals: number;
    };
    quote: {
      raw: string;
      normalized: number;
      decimals: number;
    };
  };
  tvl: number;
  liquidityScore: number;
  isActive: boolean;
  priceInfo?: {
    currentPrice: number;
    activeBinId: number;
    binStep: number;
    hasBinData: boolean;
  };
  binAnalytics?: {
    binData: Array<{
      binId: number;
      price: number;
      reserveX: number;
      reserveY: number;
      totalLiquidity: number;
      totalSupply: string;
      isActive: boolean;
      binArrayIndex: number;
    }>;
    binArraysRaw: any[];
  };
  analytics: {
    estimatedVolume24h: number;
    estimatedFees24h: number;
    liquidityDistribution: number;
    activeBinPrice: number;
    priceRange: {
      min: number;
      max: number;
    } | null;
  };
  fetchedAt: string;
  rawMetadata: any;
}

// Enhanced database structure from fetch_pools_enhanced.js
interface EnhancedDatabase {
  metadata: {
    fetchedAt: string;
    rpcEndpoint: string;
    totalPools: number;
    activePools: number;
    totalTVL: number;
    dataVersion: string;
  };
  pools: EnhancedPoolData[];
  analytics: {
    topPoolsByTVL: Array<{
      name: string;
      address: string;
      tvl: number;
    }>;
    topPoolsByVolume: any[];
    binDistributionSummary: any;
    liquidityMetrics: any;
  };
}

// Convert enhanced pool data to our standard Pool interface
export function convertEnhancedPoolToPool(enhancedPool: EnhancedPoolData): Pool {
  // Calculate APR from fee estimates
  const apr24h = enhancedPool.tvl > 0
    ? (enhancedPool.analytics.estimatedFees24h * 365 / enhancedPool.tvl) * 100
    : 0;

  return {
    address: enhancedPool.address,
    name: enhancedPool.name,
    description: enhancedPool.description,
    tokenX: {
      symbol: enhancedPool.tokenX.symbol,
      name: enhancedPool.tokenX.name,
      mintAddress: enhancedPool.tokenX.mintAddress,
      decimals: enhancedPool.tokenX.decimals,
    },
    tokenY: {
      symbol: enhancedPool.tokenY.symbol,
      name: enhancedPool.tokenY.name,
      mintAddress: enhancedPool.tokenY.mintAddress,
      decimals: enhancedPool.tokenY.decimals,
    },
    binStep: enhancedPool.binStep,
    tvl: Math.round(enhancedPool.tvl * 100) / 100,
    volume24h: Math.round(enhancedPool.analytics.estimatedVolume24h * 100) / 100,
    fees24h: Math.round(enhancedPool.analytics.estimatedFees24h * 100) / 100,
    apr24h: Math.round(apr24h * 100) / 100,
    isActive: enhancedPool.isActive,
  };
}

// Load enhanced pool database
export async function loadEnhancedPools(): Promise<Pool[]> {
  try {
    // Try to load enhanced database first
    const enhancedResponse = await fetch('/enhanced_pools.json');

    if (enhancedResponse.ok) {
      const enhancedDb: EnhancedDatabase = await enhancedResponse.json();

      const pools = enhancedDb.pools
        .filter(pool => pool.isActive && pool.tvl > 1)
        .map(convertEnhancedPoolToPool)
        .sort((a, b) => b.tvl - a.tvl);

      console.log(`✅ Loaded ${pools.length} pools from enhanced database (${enhancedDb.metadata.dataVersion})`);
      console.log(`📊 Database stats - Total Pools: ${enhancedDb.metadata.totalPools}, Active: ${enhancedDb.metadata.activePools}, TVL: $${enhancedDb.metadata.totalTVL.toFixed(2)}`);

      return pools;
    }

    // Fallback to analytics JSONL if enhanced JSON not available
    console.log("Enhanced database not found, trying analytics JSONL...");

    const jsonlResponse = await fetch('/pools_analytics.jsonl');
    if (jsonlResponse.ok) {
      const text = await jsonlResponse.text();
      const lines = text.trim().split('\n').filter(line => line.trim());

      const enhancedPools: EnhancedPoolData[] = lines.map(line => JSON.parse(line));

      const pools = enhancedPools
        .filter(pool => pool.isActive && pool.tvl > 1)
        .map(convertEnhancedPoolToPool)
        .sort((a, b) => b.tvl - a.tvl);

      console.log(`✅ Loaded ${pools.length} pools from analytics JSONL`);
      return pools;
    }

    // Final fallback to original pools.jsonl
    console.log("Enhanced data not found, falling back to original pools.jsonl...");

    const { loadRealPools } = await import('./real-pool-adapter');
    const fallbackPools = await loadRealPools();

    if (fallbackPools.length > 0) {
      console.log(`⚠️  Using fallback data: ${fallbackPools.length} pools from pools.jsonl`);
      return fallbackPools;
    }

    console.error("❌ No pool data available. Please run enhanced data fetch.");
    return [];

  } catch (error) {
    console.error("Error loading enhanced pools:", error);
    return [];
  }
}

// Get enhanced analytics data for bin distribution charts
export async function getEnhancedBinData(poolAddress?: string) {
  try {
    console.log("Loading enhanced bin data from database...");

    // Try enhanced database first
    const enhancedResponse = await fetch('/enhanced_pools.json');

    if (enhancedResponse.ok) {
      const enhancedDb: EnhancedDatabase = await enhancedResponse.json();

      // Find pool with bin data, prefer specified pool or use first available
      const targetPool = poolAddress
        ? enhancedDb.pools.find(p => p.address === poolAddress)
        : enhancedDb.pools.find(p => p.binAnalytics && p.binAnalytics.binData.length > 0);

      if (targetPool && targetPool.binAnalytics) {
        console.log(`✅ Found enhanced bin data for ${targetPool.name}: ${targetPool.binAnalytics.binData.length} bins`);

        // Convert to expected format for bin distribution component
        return targetPool.binAnalytics.binData.map((bin, index) => ({
          binId: bin.binId,
          price: bin.price,
          reserveXAmount: bin.reserveX,
          reserveYAmount: bin.reserveY,
          totalLiquidity: bin.totalLiquidity,
          totalSupply: bin.totalSupply,
          isActive: bin.isActive,
          poolMetadata: {
            tokenX: targetPool.tokenX,
            tokenY: targetPool.tokenY,
            binStep: targetPool.binStep,
            poolAddress: targetPool.address,
          },
        }));
      }
    }

    // Fallback to original method if enhanced data not available
    console.log("No enhanced bin data found, using fallback generation...");
    const { getBinLiquidity } = await import('./dlmm');
    return await getBinLiquidity();

  } catch (error) {
    console.error("Error loading enhanced bin data:", error);

    // Final fallback
    const { getBinLiquidity } = await import('./dlmm');
    return await getBinLiquidity();
  }
}

// Get database metadata and analytics summary
export async function getDatabaseMetadata() {
  try {
    const enhancedResponse = await fetch('/enhanced_pools.json');

    if (enhancedResponse.ok) {
      const enhancedDb: EnhancedDatabase = await enhancedResponse.json();

      return {
        ...enhancedDb.metadata,
        analytics: enhancedDb.analytics,
        isEnhanced: true
      };
    }

    return {
      fetchedAt: new Date().toISOString(),
      totalPools: 0,
      activePools: 0,
      totalTVL: 0,
      dataVersion: "fallback",
      isEnhanced: false
    };

  } catch (error) {
    console.error("Error loading database metadata:", error);
    return {
      fetchedAt: new Date().toISOString(),
      totalPools: 0,
      activePools: 0,
      totalTVL: 0,
      dataVersion: "error",
      isEnhanced: false
    };
  }
}