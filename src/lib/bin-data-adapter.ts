export interface BinData {
  binId: number;
  price: number;
  reserveXAmount: number;
  reserveYAmount: number;
  totalLiquidity: number;
  isActive: boolean;
  utilization: number;
  poolMetadata: {
    address: string;
    name: string;
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
  };
}

export interface PoolBinData {
  poolAddress: string;
  poolName: string;
  tokenPair: string;
  activeBinId: number;
  binStep: number;
  totalBins: number;
  totalLiquidity: number;
  bins: BinData[];
}

export interface BinsDatabase {
  metadata: {
    fetchedAt: string;
    poolCount: number;
    rpcEndpoint: string;
    dataVersion: string;
  };
  pools: PoolBinData[];
}

let binsCache: PoolBinData[] = [];
let lastBinsFetch = 0;
const BINS_CACHE_DURATION = 300000; // 5 minutes cache

export const loadBinData = async (): Promise<PoolBinData[]> => {
  const now = Date.now();

  // Return cached data if still fresh
  if (binsCache.length > 0 && (now - lastBinsFetch) < BINS_CACHE_DURATION) {
    console.log("Using cached bin data");
    return binsCache;
  }

  try {
    console.log("Loading DLMM bin data...");

    // Try to load from public/bins_data.json
    const response = await fetch('/bins_data.json');

    if (!response.ok) {
      console.warn("Bin data file not found. Run 'npm run fetch_bins' to generate real bin data.");
      return [];
    }

    const binsDatabase: BinsDatabase = await response.json();

    if (!binsDatabase.pools || binsDatabase.pools.length === 0) {
      console.warn("No bin data available in bins database.");
      return [];
    }

    binsCache = binsDatabase.pools;
    lastBinsFetch = now;

    console.log(`Successfully loaded bin data for ${binsCache.length} pools`);
    return binsCache;

  } catch (error) {
    console.error("Error loading bin data:", error);
    console.error("Run 'npm run fetch_bins' to generate bin data files.");
    return [];
  }
};

export const getBinDataForPool = async (poolAddress: string): Promise<BinData[]> => {
  console.log("🔧 DEBUG: getBinDataForPool called for:", poolAddress);
  const allBinData = await loadBinData();
  console.log("🔧 DEBUG: loadBinData returned:", allBinData.length, "pools");
  console.log("🔧 DEBUG: Available pool addresses:", allBinData.map(p => p.poolAddress));

  const poolBinData = allBinData.find(pool => pool.poolAddress === poolAddress);
  console.log("🔧 DEBUG: Found matching pool:", !!poolBinData);

  if (!poolBinData) {
    console.warn(`No bin data found for pool ${poolAddress}`);
    return [];
  }

  console.log("🔧 DEBUG: Returning", poolBinData.bins.length, "bins for pool");
  return poolBinData.bins;
};

export const getAvailablePoolsWithBinData = async (): Promise<string[]> => {
  const allBinData = await loadBinData();
  return allBinData.map(pool => pool.poolAddress);
};