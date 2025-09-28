export interface Pool {
  address: string;
  name: string;
  description: string;
  tokenX: {
    symbol: string;
    name: string;
    mintAddress: string;
    decimals: number;
  };
  tokenY: {
    symbol: string;
    name: string;
    mintAddress: string;
    decimals: number;
  };
  binStep: number;
  feeRate: number;
  tvl: number;
  volume24h: number;
  fees24h: number;
  apr24h: number;
  isActive: boolean;
}

export interface PoolsResponse {
  pools: Pool[];
  total: number;
  hasMore: boolean;
}

let allPools: Pool[] = [];
let lastFetch = 0;
const CACHE_DURATION = 60000; // 1 minute cache

export const fetchAllPools = async (): Promise<Pool[]> => {
  const now = Date.now();

  // Return cached data if still fresh
  if (allPools.length > 0 && (now - lastFetch) < CACHE_DURATION) {
    console.log("Using cached pool data");
    return allPools;
  }

  try {
    console.log("Loading DLMM pools from enhanced database...");

    // Try enhanced database first
    const { loadEnhancedPools } = await import('./enhanced-pool-adapter');
    const enhancedPools = await loadEnhancedPools();

    if (enhancedPools.length > 0) {
      allPools = enhancedPools;
      lastFetch = now;
      console.log(`Successfully loaded ${allPools.length} pools from enhanced database`);
      return allPools;
    }

    // Fallback to original real pool data
    console.log("Enhanced database not available, falling back to pools.jsonl...");

    const { loadRealPools } = await import('./real-pool-adapter');
    const realPools = await loadRealPools();

    if (realPools.length === 0) {
      console.error("No pool data found. Please run data fetching script:");
      console.error("- Enhanced: 'node fetch_pools_enhanced.js'");
      console.error("- Basic: 'npm run fetch_pools'");
      throw new Error("Pool data required. Run data fetch script first.");
    }

    allPools = realPools;
    lastFetch = now;
    console.log(`Successfully loaded ${allPools.length} pools from basic database`);
    return allPools;

  } catch (error) {
    console.error("Error loading pool data:", error);
    console.error("Run 'node fetch_pools_enhanced.js' for best results, or 'npm run fetch_pools' for basic data.");

    // Return empty array - no fallback to demo data
    return [];
  }
};

export const fetchPools = async (offset: number = 0, limit: number = 5): Promise<PoolsResponse> => {
  try {
    const pools = await fetchAllPools();

    // Add small delay to show loading state
    await new Promise(resolve => setTimeout(resolve, 300));

    const startIndex = offset;
    const endIndex = startIndex + limit;
    const paginatedPools = pools.slice(startIndex, endIndex);

    return {
      pools: paginatedPools,
      total: pools.length,
      hasMore: endIndex < pools.length
    };
  } catch (error) {
    console.error("Error in fetchPools:", error);
    return {
      pools: [],
      total: 0,
      hasMore: false
    };
  }
};