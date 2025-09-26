/* eslint-disable @typescript-eslint/no-unused-vars */
import { LiquidityBookServices, MODE } from "@saros-finance/dlmm-sdk";
import { PublicKey } from "@solana/web3.js";
import { utils } from "@coral-xyz/anchor";
import { BinLiquidityData, TokenInfo, PoolMetadata } from "./types";

// Simple cache for bin data (5 minute expiry)
let cachedBinData: BinLiquidityData[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// WORKSHOP POOL - Using example from guide (derivable pair address)
const CONFIG_ADDRESS = "9aXo79uWCtxxxmssuTmAjCSGyP1sMxhQZdKZhrcMxGzz";
const TOKEN_X = "FtJADTW8HSB4t6QQ4WsR8kcrrZ6oVaoVJk7KEWQZDJqt";
const TOKEN_Y = "Chc7CkBPvBsyNAmxAcupVox6pB5wcU2yuXD5PJAqQteb";
const BIN_STEP = 20;

// Use a popular real pool for demonstration (SOL/USDC)
const REAL_SOL_TOKEN: TokenInfo = {
  symbol: "SOL",
  name: "Solana",
  mintAddress: "So11111111111111111111111111111111111111112",
  decimals: 9,
};

const REAL_USDC_TOKEN: TokenInfo = {
  symbol: "USDC",
  name: "USD Coin",
  mintAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  decimals: 6,
};

// Enhanced token metadata based on popular Solana tokens
const WELL_KNOWN_TOKENS: Record<string, TokenInfo> = {
  "So11111111111111111111111111111111111111112": {
    symbol: "SOL",
    name: "Solana",
    mintAddress: "So11111111111111111111111111111111111111112",
    decimals: 9,
  },
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v": {
    symbol: "USDC",
    name: "USD Coin",
    mintAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    decimals: 6,
  },
  "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB": {
    symbol: "USDT",
    name: "Tether USD",
    mintAddress: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
    decimals: 6,
  },
  "SarosY6Vscao718M4A778z4CGtvcwcGef5M9MEH1LGL": {
    symbol: "SAROS",
    name: "Saros Finance",
    mintAddress: "SarosY6Vscao718M4A778z4CGtvcwcGef5M9MEH1LGL",
    decimals: 6,
  },
  "C98A4nkJXhpVZNAZdHUA95RpTF3T4whtQubL3YobiUX9": {
    symbol: "C98",
    name: "Coin98",
    mintAddress: "C98A4nkJXhpVZNAZdHUA95RpTF3T4whtQubL3YobiUX9",
    decimals: 6,
  },
  "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN": {
    symbol: "JUP",
    name: "Jupiter",
    mintAddress: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN",
    decimals: 6,
  },
  "orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE": {
    symbol: "ORCA",
    name: "Orca",
    mintAddress: "orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE",
    decimals: 6,
  },
  "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R": {
    symbol: "RAY",
    name: "Raydium",
    mintAddress: "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R",
    decimals: 6,
  },
  "METAewgxyPbgwsseH8T16a39CQ5VyVxZi9zXiDPY18m": {
    symbol: "META",
    name: "Metaplex",
    mintAddress: "METAewgxyPbgwsseH8T16a39CQ5VyVxZi9zXiDPY18m",
    decimals: 6,
  },
  "DEBUTr2WcEsjkwKhqbRLqnuFKstX1MrEuvaz5xcoQTgn": {
    symbol: "DEBUT",
    name: "Debut",
    mintAddress: "DEBUTr2WcEsjkwKhqbRLqnuFKstX1MrEuvaz5xcoQTgn",
    decimals: 6,
  },
  "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263": {
    symbol: "DEZU",
    name: "Dezu",
    mintAddress: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
    decimals: 5,
  },
  "3NZ9JMVBmGAqocybic2c7LQCJScmgsAZ6vQqTDzcqmJh": {
    symbol: "WBTC",
    name: "Wrapped Bitcoin",
    mintAddress: "3NZ9JMVBmGAqocybic2c7LQCJScmgsAZ6vQqTDzcqmJh",
    decimals: 8,
  },
};

// Removed DEMO_POOLS - using only real pool data from pools.jsonl

// Function removed - using only real pool data from pools.jsonl

// Shared DLMM service instance
const dlmmService = new LiquidityBookServices({
  mode: MODE.MAINNET,
  options: {
    rpcUrl:
      process.env.NEXT_PUBLIC_RPC_URL || "https://rpc.ankr.com/solana",
  },
});

// Helper function to derive pair address (from the guide)
const derivePairAddress = (
  config: string,
  tokenX: string,
  tokenY: string,
  binStep: number,
  programId: PublicKey
): PublicKey => {
  const [pair] = PublicKey.findProgramAddressSync(
    [
      Buffer.from(utils.bytes.utf8.encode("pair")),
      new PublicKey(config).toBuffer(),
      new PublicKey(tokenX).toBuffer(),
      new PublicKey(tokenY).toBuffer(),
      new Uint8Array([binStep]),
    ],
    programId
  );
  return pair;
};

// helper functions we will define
export const fetchPoolInfo = async (poolAddress: string) => {
  try {
    console.log("fetching pool info", poolAddress);
  } catch (error) {
    console.error("Error fetching pool data:", error);
    throw error;
  }
};

export const getBinLiquidity = async (): Promise<BinLiquidityData[]> => {
  console.log("getBinLiquidity function called - using enhanced DLMM data...");

  // Check cache first
  const now = Date.now();
  if (cachedBinData && (now - cacheTimestamp) < CACHE_DURATION) {
    console.log("Returning cached bin data");
    return cachedBinData;
  }

  try {
    // Try enhanced bin data first
    const { getEnhancedBinData } = await import('./enhanced-pool-adapter');
    const enhancedBinData = await getEnhancedBinData();

    if (enhancedBinData && enhancedBinData.length > 0) {
      cachedBinData = enhancedBinData;
      cacheTimestamp = Date.now();
      console.log(`✅ Using enhanced bin data: ${enhancedBinData.length} bins`);
      return cachedBinData;
    }

    // Fallback to algorithmic generation with real pool data
    console.log("Enhanced bin data not available, generating from real pool data...");

    const { loadRealPools } = await import('./real-pool-adapter');
    const realPools = await loadRealPools();

    if (realPools.length === 0) {
      console.error("No pool data available. Please run data fetching script:");
      console.error("- Enhanced: 'node fetch_pools_enhanced.js'");
      console.error("- Basic: 'npm run fetch_pools'");
      return [];
    }

    // Use the first real pool for bin data
    const pool = realPools[0];
    const poolMetadata: PoolMetadata = {
      tokenX: pool.tokenX,
      tokenY: pool.tokenY,
      binStep: pool.binStep,
      poolAddress: pool.address,
    };

    console.log(`Using real pool: ${pool.name} (${pool.address})`);

    // Generate realistic bin data with real pool metadata
    console.log("Generating algorithmic bin data using real pool information...");
    const binData = generateAlgorithmicBinData(undefined, poolMetadata);

    // Cache the data
    cachedBinData = binData;
    cacheTimestamp = Date.now();

    console.log(`Successfully generated ${binData.length} bins for ${pool.name}`);
    return binData;

  } catch (error) {
    console.error("Error loading bin data:", error);
    console.error("Run 'node fetch_pools_enhanced.js' for best results, or 'npm run fetch_pools' for basic data.");
    return [];
  }
};

// Algorithmic bin data generation based on DLMM math
const generateAlgorithmicBinData = (centerBinId?: number, poolMetadata?: PoolMetadata): BinLiquidityData[] => {
  console.log("Generating algorithmic bin data using real pool metadata...");

  // Use workshop active bin or default center
  const activeBinId = centerBinId || 8388608; // Default DLMM center
  const binData: BinLiquidityData[] = [];

  // Default pool metadata if not provided
  const defaultPoolMetadata: PoolMetadata = poolMetadata || {
    tokenX: REAL_SOL_TOKEN,
    tokenY: REAL_USDC_TOKEN,
    binStep: BIN_STEP,
    poolAddress: "algorithmic",
  };

  console.log(`Generating bins for ${defaultPoolMetadata.tokenX.symbol}/${defaultPoolMetadata.tokenY.symbol} pool`);

  // Generate 25 bins around the active bin (-12 to +12)
  for (let i = -12; i <= 12; i++) {
    const binId = activeBinId + i;
    const price = Math.pow(1.0001, binId - 8388608);

    // Algorithmic liquidity distribution (more realistic)
    const distanceFromActive = Math.abs(i);
    const baseAmount = 50000 + Math.random() * 100000;

    // Exponential decay from active bin + some randomness
    const liquidityMultiplier = Math.exp(-distanceFromActive * 0.3) * (0.5 + Math.random() * 0.5);
    const reserveX = baseAmount * liquidityMultiplier;
    const reserveY = baseAmount * liquidityMultiplier * 0.8;

    binData.push({
      binId: binId,
      price: price,
      reserveXAmount: reserveX,
      reserveYAmount: reserveY,
      totalLiquidity: reserveX + reserveY,
      totalSupply: (reserveX + reserveY).toString(),
      isActive: i === 0, // Center bin is active
      poolMetadata: defaultPoolMetadata,
    });
  }

  console.log(`Generated ${binData.length} algorithmic bins for ${defaultPoolMetadata.tokenX.symbol}/${defaultPoolMetadata.tokenY.symbol} (active: ${activeBinId})`);
  return binData.sort((a, b) => a.binId - b.binId);
};
