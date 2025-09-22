// Token metadata for display
export interface TokenInfo {
  symbol: string;
  name: string;
  mintAddress: string;
  decimals: number;
}

// Pool metadata for user-friendly display
export interface PoolMetadata {
  tokenX: TokenInfo;
  tokenY: TokenInfo;
  binStep: number;
  poolAddress: string;
}

// type used for aggregate pool info and used to display in BinDistributionChart
export interface BinLiquidityData {
  binId: number;
  price: number;
  reserveXAmount: number;
  reserveYAmount: number;
  totalLiquidity: number;
  totalSupply: string;
  isActive: boolean;
  // Add pool metadata for display
  poolMetadata?: PoolMetadata;
}
