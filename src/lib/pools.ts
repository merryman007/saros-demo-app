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
    console.log("Loading DLMM pools from local data...");

    // Try to load real pool data first
    try {
      const { loadRealPools } = await import('./real-pool-adapter');
      const realPools = await loadRealPools();

      if (realPools.length > 0) {
        allPools = realPools;
        lastFetch = now;
        console.log(`Successfully loaded ${allPools.length} real DLMM pools from fetch_pools.js data`);
        return allPools;
      }
    } catch (realPoolError) {
      console.log("Real pool data not available, falling back to pools.json");
    }

    // Fallback to pools.json file
    const response = await fetch('/pools.json');

    if (!response.ok) {
      throw new Error(`Failed to fetch pools.json: ${response.status}`);
    }

    const data = await response.json();
    allPools = data.pools || [];

    lastFetch = now;
    console.log(`Successfully loaded ${allPools.length} pools from pools.json fallback`);
    return allPools;

  } catch (error) {
    console.error("Error loading pools from local data:", error);

    // Return empty array on error to avoid crashes
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