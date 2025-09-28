import { PublicKey, Connection } from "@solana/web3.js";
import { LiquidityBookServices, MODE } from "@saros-finance/dlmm-sdk";
import { PositionInfo } from "@saros-finance/dlmm-sdk/types/services";
import { Token, TokenService } from "./token-service";

export interface DetailedPosition {
  // Position identifiers
  position: string;
  positionMint: string;
  poolAddress: string;
  
  // Bin information
  lowerBinId: number;
  upperBinId: number;
  activeBinId?: number;
  
  // Token information
  tokenX: {
    mint: string;
    symbol: string;
    decimals: number;
    amount: string;
    usdValue?: string;
  };
  tokenY: {
    mint: string;
    symbol: string;
    decimals: number;
    amount: string;
    usdValue?: string;
  };
  
  // Financial metrics
  totalValue: string; // USD value
  feesEarned: {
    tokenX: string;
    tokenY: string;
    totalUsd?: string;
  };
  
  // Performance metrics
  performance: {
    apy?: number;
    dailyFees?: string;
    weeklyFees?: string;
    monthlyFees?: string;
    impermanentLoss?: number;
  };
  
  // Position status
  isInRange: boolean;
  utilizationRate: number; // How much of the position is being used
  lastUpdated: number; // Timestamp
}

export interface PortfolioSummary {
  totalPositions: number;
  totalValueUsd: string;
  totalFeesEarnedUsd: string;
  activePools: number;
  positionsInRange: number;
  positionsOutOfRange: number;
  averageApy?: number;
  performanceData: {
    daily: {
      fees: string;
      volume: string;
      change: number;
    };
    weekly: {
      fees: string;
      volume: string;
      change: number;
    };
    monthly: {
      fees: string;
      volume: string;
      change: number;
    };
  };
}

export interface PoolPositionGroup {
  poolAddress: string;
  tokenX: Token;
  tokenY: Token;
  positions: DetailedPosition[];
  combinedValue: string;
  combinedFees: string;
  positionCount: number;
}

class PositionManagementService {
  private connection: Connection;
  private dlmmService: LiquidityBookServices;

  constructor() {
    const heliusRPC = "https://mainnet.helius-rpc.com/?api-key=25eb7563-a303-4783-8e62-535586261018";
    const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || heliusRPC;
    
    this.connection = new Connection(rpcUrl, "confirmed");
    this.dlmmService = new LiquidityBookServices({
      mode: MODE.MAINNET,
      options: {
        rpcUrl,
      },
    });
    
    console.log('📊 Initializing Position Management Service');
  }

  // Get all positions for a wallet using the REST API (more efficient)
  async getAllUserPositions(walletPublicKey: string): Promise<DetailedPosition[]> {
    try {
      console.log('📋 Fetching user positions via REST API...');
      
      // Use the REST API to fetch pool-level positions first
      const poolPositions = await this.fetchPoolPositions(walletPublicKey);
      console.log(`🏊 Found positions in ${poolPositions.length} pools`);
      
      const allPositions: DetailedPosition[] = [];
      
      // For each pool with positions, get detailed bin-level data
      for (const poolPos of poolPositions) {
        try {
          const binPositions = await this.fetchBinPositions(walletPublicKey, poolPos.pair_id);
          
          // Convert bin positions to our DetailedPosition format
          const detailedPositions = await Promise.all(
            binPositions.map((binPos: any) => 
              this.convertBinPositionToDetailed(binPos, poolPos)
            )
          );
          
          allPositions.push(...detailedPositions);
        } catch (error) {
          console.error(`Error fetching bin positions for pool ${poolPos.pair_id}:`, error);
        }
      }
      
      console.log(`✅ Total detailed positions: ${allPositions.length}`);
      return allPositions;
      
    } catch (error) {
      console.error("❌ Error fetching user positions:", error);
      throw new Error(`Failed to fetch positions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Fetch pool-level positions using REST API
  private async fetchPoolPositions(userId: string, pairId?: string): Promise<any[]> {
    const params = new URLSearchParams({
      user_id: userId,
      page_num: "1",
      page_size: "100",
    });

    if (pairId) {
      params.append("pair_id", pairId);
    }

    const response = await fetch(`/api/pool-position?${params.toString()}`);
    if (!response.ok) {
      throw new Error("Failed to fetch pool positions");
    }

    const result = await response.json();
    return result.data || [];
  }

  // Fetch bin-level positions using REST API
  private async fetchBinPositions(userId: string, pairId?: string): Promise<any[]> {
    const params = new URLSearchParams({
      user_id: userId,
      page_num: "1", 
      page_size: "100",
    });

    if (pairId) {
      params.append("pair_id", pairId);
    }

    const response = await fetch(`/api/bin-position?${params.toString()}`);
    if (!response.ok) {
      throw new Error("Failed to fetch bin positions");
    }

    const result = await response.json();
    return result.data || [];
  }

  // Convert REST API bin position to our DetailedPosition format
  private async convertBinPositionToDetailed(
    binPosition: any, 
    poolPosition: any
  ): Promise<DetailedPosition> {
    try {
      // Get token information
      const tokenXInfo = await TokenService.getTokenByAddress(poolPosition.token_x?.mint_address || "");
      const tokenYInfo = await TokenService.getTokenByAddress(poolPosition.token_y?.mint_address || "");
      
      // Calculate if position is in range
      const activeBinId = poolPosition.active_bin_id || 0;
      const isInRange = activeBinId >= binPosition.bin_id_lower && activeBinId <= binPosition.bin_id_upper;
      
      // Calculate utilization rate
      const binRange = (binPosition.bin_id_upper || 0) - (binPosition.bin_id_lower || 0) + 1;
      const utilizationRate = isInRange ? Math.random() * 0.8 + 0.2 : 0; // Mock for now
      
      return {
        position: binPosition.position_address || "",
        positionMint: binPosition.position_mint || "",
        poolAddress: poolPosition.pair_address || "",
        lowerBinId: binPosition.bin_id_lower || 0,
        upperBinId: binPosition.bin_id_upper || 0,
        activeBinId,
        tokenX: {
          mint: tokenXInfo?.address || poolPosition.token_x?.mint_address || "",
          symbol: tokenXInfo?.symbol || poolPosition.token_x?.symbol || "Unknown",
          decimals: tokenXInfo?.decimals || poolPosition.token_x?.decimals || 9,
          amount: binPosition.token_x_amount || "0",
          usdValue: binPosition.token_x_usd_value || "0",
        },
        tokenY: {
          mint: tokenYInfo?.address || poolPosition.token_y?.mint_address || "",
          symbol: tokenYInfo?.symbol || poolPosition.token_y?.symbol || "Unknown",
          decimals: tokenYInfo?.decimals || poolPosition.token_y?.decimals || 6,
          amount: binPosition.token_y_amount || "0",
          usdValue: binPosition.token_y_usd_value || "0",
        },
        totalValue: binPosition.total_usd_value || "0",
        feesEarned: {
          tokenX: binPosition.fees_earned_x || "0",
          tokenY: binPosition.fees_earned_y || "0",
          totalUsd: binPosition.total_fees_usd || "0",
        },
        performance: {
          apy: binPosition.apy || Math.random() * 50 + 10, // Use API data or mock
          dailyFees: binPosition.daily_fees || (Math.random() * 10).toFixed(4),
          weeklyFees: binPosition.weekly_fees || (Math.random() * 70).toFixed(4),
          monthlyFees: binPosition.monthly_fees || (Math.random() * 300).toFixed(4),
          impermanentLoss: binPosition.impermanent_loss || Math.random() * 5 - 2.5,
        },
        isInRange,
        utilizationRate,
        lastUpdated: Date.now(),
      };
      
    } catch (error) {
      console.error("Error converting bin position:", error);
      throw error;
    }
  }

  // Enrich basic position data with additional metrics and token information
  private async enrichPositionData(
    position: PositionInfo, 
    poolAddress: string, 
    poolMetadata: any
  ): Promise<DetailedPosition> {
    try {
      // Get token information
      const tokenXInfo = await TokenService.getTokenByAddress(poolMetadata.tokenX || "");
      const tokenYInfo = await TokenService.getTokenByAddress(poolMetadata.tokenY || "");
      
      // Calculate basic amounts (simplified for now)
      const tokenXAmount = "0"; // Would need complex calculation from position data
      const tokenYAmount = "0"; // Would need complex calculation from position data
      
      // Get current active bin from pool
      const pairInfo = await this.dlmmService.getPairAccount(new PublicKey(poolAddress));
      const activeBinId = pairInfo.activeId;
      
      // Determine if position is in range
      const isInRange = activeBinId >= position.lowerBinId && activeBinId <= position.upperBinId;
      
      // Calculate utilization rate (simplified)
      const binRange = position.upperBinId - position.lowerBinId + 1;
      const utilizationRate = isInRange ? Math.random() * 0.8 + 0.2 : 0; // Mock calculation
      
      return {
        position: position.position.toString(),
        positionMint: position.positionMint.toString(),
        poolAddress,
        lowerBinId: position.lowerBinId,
        upperBinId: position.upperBinId,
        activeBinId,
        tokenX: {
          mint: tokenXInfo?.address || poolMetadata.tokenX || "",
          symbol: tokenXInfo?.symbol || "Unknown",
          decimals: tokenXInfo?.decimals || 9,
          amount: tokenXAmount,
          usdValue: "0", // Would calculate based on current price
        },
        tokenY: {
          mint: tokenYInfo?.address || poolMetadata.tokenY || "",
          symbol: tokenYInfo?.symbol || "Unknown", 
          decimals: tokenYInfo?.decimals || 6,
          amount: tokenYAmount,
          usdValue: "0", // Would calculate based on current price
        },
        totalValue: "0", // Would calculate total USD value
        feesEarned: {
          tokenX: "0", // Would calculate from position data
          tokenY: "0", // Would calculate from position data
          totalUsd: "0",
        },
        performance: {
          apy: Math.random() * 50 + 10, // Mock APY between 10-60%
          dailyFees: (Math.random() * 10).toFixed(4),
          weeklyFees: (Math.random() * 70).toFixed(4),
          monthlyFees: (Math.random() * 300).toFixed(4),
          impermanentLoss: Math.random() * 5 - 2.5, // Mock IL between -2.5% to +2.5%
        },
        isInRange,
        utilizationRate,
        lastUpdated: Date.now(),
      };
      
    } catch (error) {
      console.error("Error enriching position data:", error);
      
      // Return minimal position data if enrichment fails
      return {
        position: position.position.toString(),
        positionMint: position.positionMint.toString(),
        poolAddress,
        lowerBinId: position.lowerBinId,
        upperBinId: position.upperBinId,
        tokenX: {
          mint: "",
          symbol: "Unknown",
          decimals: 9,
          amount: "0",
        },
        tokenY: {
          mint: "",
          symbol: "Unknown",
          decimals: 6,
          amount: "0",
        },
        totalValue: "0",
        feesEarned: {
          tokenX: "0",
          tokenY: "0",
        },
        performance: {},
        isInRange: false,
        utilizationRate: 0,
        lastUpdated: Date.now(),
      };
    }
  }

  // Get portfolio summary with aggregated metrics
  async getPortfolioSummary(positions: DetailedPosition[]): Promise<PortfolioSummary> {
    try {
      const totalPositions = positions.length;
      const positionsInRange = positions.filter(p => p.isInRange).length;
      const positionsOutOfRange = totalPositions - positionsInRange;
      
      // Get unique pools
      const uniquePools = new Set(positions.map(p => p.poolAddress));
      const activePools = uniquePools.size;
      
      // Calculate aggregated values (simplified mock calculations)
      const totalValueUsd = positions.reduce((sum, pos) => {
        return sum + parseFloat(pos.totalValue || "0");
      }, 0).toFixed(2);
      
      const totalFeesEarnedUsd = positions.reduce((sum, pos) => {
        return sum + parseFloat(pos.feesEarned.totalUsd || "0");
      }, 0).toFixed(2);
      
      // Calculate average APY
      const validApys = positions
        .map(p => p.performance.apy)
        .filter(apy => apy !== undefined) as number[];
      const averageApy = validApys.length > 0 
        ? validApys.reduce((sum, apy) => sum + apy, 0) / validApys.length 
        : undefined;
      
      // Mock performance data
      const performanceData = {
        daily: {
          fees: (Math.random() * 100).toFixed(2),
          volume: (Math.random() * 10000).toFixed(2),
          change: (Math.random() * 20 - 10), // -10% to +10%
        },
        weekly: {
          fees: (Math.random() * 700).toFixed(2),
          volume: (Math.random() * 70000).toFixed(2),
          change: (Math.random() * 30 - 15), // -15% to +15%
        },
        monthly: {
          fees: (Math.random() * 3000).toFixed(2),
          volume: (Math.random() * 300000).toFixed(2),
          change: (Math.random() * 50 - 25), // -25% to +25%
        },
      };
      
      return {
        totalPositions,
        totalValueUsd,
        totalFeesEarnedUsd,
        activePools,
        positionsInRange,
        positionsOutOfRange,
        averageApy,
        performanceData,
      };
      
    } catch (error) {
      console.error("Error calculating portfolio summary:", error);
      
      // Return empty summary if calculation fails
      return {
        totalPositions: 0,
        totalValueUsd: "0",
        totalFeesEarnedUsd: "0",
        activePools: 0,
        positionsInRange: 0,
        positionsOutOfRange: 0,
        performanceData: {
          daily: { fees: "0", volume: "0", change: 0 },
          weekly: { fees: "0", volume: "0", change: 0 },
          monthly: { fees: "0", volume: "0", change: 0 },
        },
      };
    }
  }

  // Group positions by pool for better organization
  async groupPositionsByPool(positions: DetailedPosition[]): Promise<PoolPositionGroup[]> {
    try {
      const poolGroups = new Map<string, DetailedPosition[]>();
      
      // Group positions by pool address
      positions.forEach(position => {
        const poolAddress = position.poolAddress;
        if (!poolGroups.has(poolAddress)) {
          poolGroups.set(poolAddress, []);
        }
        poolGroups.get(poolAddress)!.push(position);
      });
      
      // Convert to PoolPositionGroup objects
      const groups: PoolPositionGroup[] = [];
      
      for (const [poolAddress, poolPositions] of poolGroups) {
        // Get token information from first position
        const firstPosition = poolPositions[0];
        
        const tokenX = await TokenService.getTokenByAddress(firstPosition.tokenX.mint);
        const tokenY = await TokenService.getTokenByAddress(firstPosition.tokenY.mint);
        
        // Calculate combined metrics
        const combinedValue = poolPositions.reduce((sum, pos) => {
          return sum + parseFloat(pos.totalValue || "0");
        }, 0).toFixed(2);
        
        const combinedFees = poolPositions.reduce((sum, pos) => {
          return sum + parseFloat(pos.feesEarned.totalUsd || "0");
        }, 0).toFixed(2);
        
        groups.push({
          poolAddress,
          tokenX: tokenX || {
            address: firstPosition.tokenX.mint,
            symbol: firstPosition.tokenX.symbol,
            name: firstPosition.tokenX.symbol,
            decimals: firstPosition.tokenX.decimals,
            verified: false,
          },
          tokenY: tokenY || {
            address: firstPosition.tokenY.mint,
            symbol: firstPosition.tokenY.symbol,
            name: firstPosition.tokenY.symbol,
            decimals: firstPosition.tokenY.decimals,
            verified: false,
          },
          positions: poolPositions,
          combinedValue,
          combinedFees,
          positionCount: poolPositions.length,
        });
      }
      
      // Sort by combined value (highest first)
      groups.sort((a, b) => parseFloat(b.combinedValue) - parseFloat(a.combinedValue));
      
      return groups;
      
    } catch (error) {
      console.error("Error grouping positions by pool:", error);
      return [];
    }
  }

  // Get position details for a specific position
  async getPositionDetails(positionMint: string): Promise<DetailedPosition | null> {
    try {
      // This would fetch detailed position information
      // For now, return null as placeholder
      return null;
    } catch (error) {
      console.error("Error fetching position details:", error);
      return null;
    }
  }

  // Calculate position performance metrics
  calculatePositionMetrics(position: DetailedPosition): {
    roi: number;
    totalReturn: string;
    annualizedReturn: number;
  } {
    try {
      // Mock calculations - in reality would use historical data
      const roi = Math.random() * 30 - 10; // -10% to +20% ROI
      const totalReturn = (parseFloat(position.totalValue) * (roi / 100)).toFixed(2);
      const annualizedReturn = position.performance.apy || 0;
      
      return {
        roi,
        totalReturn,
        annualizedReturn,
      };
    } catch (error) {
      console.error("Error calculating position metrics:", error);
      return {
        roi: 0,
        totalReturn: "0",
        annualizedReturn: 0,
      };
    }
  }
}

export const positionManagementService = new PositionManagementService();