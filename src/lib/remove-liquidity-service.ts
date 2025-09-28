import { PublicKey, Transaction, Connection } from "@solana/web3.js";
import { LiquidityBookServices, MODE } from "@saros-finance/dlmm-sdk";
import { PositionInfo } from "@saros-finance/dlmm-sdk/types/services";

// Define RemoveLiquidityType to match SDK expectations
export enum RemoveLiquidityType {
  Both = "removeBoth",
  X = "removeBaseToken", 
  Y = "removeQuoteToken"
}

export interface UserPosition {
  position: string;
  positionMint: string;
  lowerBinId: number;
  upperBinId: number;
  totalLiquidityX: string;
  totalLiquidityY: string;
  feeEarnedX: string;
  feeEarnedY: string;
  rewards?: string[];
}

export interface RemoveLiquidityRequest {
  poolAddress: string;
  positions: UserPosition[];
  binRange: [number, number]; // [start, end] bin IDs for partial removal
  removeType: RemoveLiquidityType;
  walletPublicKey: string;
  tokenXMint: string;
  tokenYMint: string;
}

export interface RemoveLiquidityResult {
  transactions: Transaction[];
  removedPositions: UserPosition[];
  estimatedRemovedAmountX?: string;
  estimatedRemovedAmountY?: string;
}

class RemoveLiquidityService {
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
    
    console.log('🗑️ Initializing Remove Liquidity Service');
  }

  // Get all user positions for a specific pool
  async getUserPositions(walletPublicKey: string, poolAddress: string): Promise<UserPosition[]> {
    try {
      console.log('👤 Fetching user positions...');
      
      const payer = new PublicKey(walletPublicKey);
      const pair = new PublicKey(poolAddress);

      const positions = await this.dlmmService.getUserPositions({
        payer,
        pair,
      });

      console.log(`📍 Found ${positions.length} positions`);

      return positions.map((pos: PositionInfo) => ({
        position: pos.position.toString(),
        positionMint: pos.positionMint.toString(),
        lowerBinId: pos.lowerBinId,
        upperBinId: pos.upperBinId,
        totalLiquidityX: "0", // Would need to calculate from position data
        totalLiquidityY: "0", // Would need to calculate from position data
        feeEarnedX: "0", // Would need to calculate from position data
        feeEarnedY: "0", // Would need to calculate from position data
        rewards: [], // Would need to calculate from position data
      }));

    } catch (error) {
      console.error("❌ Error fetching user positions:", error);
      throw new Error(`Failed to fetch positions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Remove liquidity from specific positions within a bin range
  async removeLiquidityFromRange(request: RemoveLiquidityRequest): Promise<RemoveLiquidityResult> {
    try {
      const {
        poolAddress,
        positions,
        binRange,
        removeType,
        walletPublicKey,
        tokenXMint,
        tokenYMint
      } = request;

      console.log('🗑️ Removing liquidity from range...');
      console.log('📊 Remove parameters:', {
        poolAddress,
        binRange,
        removeType,
        positionsCount: positions.length,
        payer: walletPublicKey
      });

      const payer = new PublicKey(walletPublicKey);
      const pair = new PublicKey(poolAddress);
      const tokenMintX = new PublicKey(tokenXMint);
      const tokenMintY = new PublicKey(tokenYMint);

      // Get pair info for active bin ID
      const pairInfo = await this.dlmmService.getPairAccount(pair);
      const activeId = pairInfo.activeId;

      console.log('🎯 Current active bin ID:', activeId);

      // Filter positions that overlap with the specified range
      const relevantPositions = positions.filter((pos) => {
        const overlaps = !(pos.upperBinId < binRange[0] || pos.lowerBinId > binRange[1]);
        console.log(`📍 Position ${pos.positionMint}: bins ${pos.lowerBinId}-${pos.upperBinId}, overlaps: ${overlaps}`);
        return overlaps;
      });

      if (relevantPositions.length === 0) {
        throw new Error("No positions found in the specified range");
      }

      console.log(`✅ Found ${relevantPositions.length} positions in range`);

      // Create position list for SDK with adjusted ranges
      const maxPositionList = relevantPositions.map((pos) => {
        const start = Math.max(binRange[0], pos.lowerBinId);
        const end = Math.min(binRange[1], pos.upperBinId);

        console.log(`🔧 Adjusted position ${pos.positionMint}: ${start}-${end}`);

        return {
          position: pos.position,
          start,
          end,
          positionMint: pos.positionMint,
        };
      });

      // Get latest blockhash
      const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash({
        commitment: "confirmed",
      });

      console.log('🔗 Got blockhash:', blockhash);

      // Call SDK's removeMultipleLiquidity method
      const { txs, txCreateAccount, txCloseAccount } = await this.dlmmService.removeMultipleLiquidity({
        maxPositionList,
        payer,
        type: removeType,
        pair,
        tokenMintX,
        tokenMintY,
        activeId,
      });

      console.log('📦 SDK returned transactions:', {
        mainTxs: txs.length,
        hasCreateAccount: !!txCreateAccount,
        hasCloseAccount: !!txCloseAccount
      });

      // Combine all transactions in correct order
      const allTxs: Transaction[] = [];

      if (txCreateAccount) {
        allTxs.push(txCreateAccount);
      }

      allTxs.push(...txs);

      if (txCloseAccount) {
        allTxs.push(txCloseAccount);
      }

      // Set transaction properties
      allTxs.forEach((tx) => {
        tx.feePayer = payer;
        tx.recentBlockhash = blockhash;
      });

      console.log(`✅ Prepared ${allTxs.length} transactions for removal`);

      return {
        transactions: allTxs,
        removedPositions: relevantPositions,
      };

    } catch (error) {
      console.error("❌ Error removing liquidity:", error);
      throw new Error(`Remove liquidity failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Remove liquidity from entire positions (complete removal)
  async removeAllLiquidityFromPositions(
    poolAddress: string,
    positionMints: string[],
    removeType: RemoveLiquidityType,
    walletPublicKey: string,
    tokenXMint: string,
    tokenYMint: string
  ): Promise<{ transactions: Transaction[], removedPositions: UserPosition[] }> {
    try {
      console.log('🗑️ Removing all liquidity from specific positions...');

      // Get all user positions first
      const allPositions = await this.getUserPositions(walletPublicKey, poolAddress);
      
      // Filter to only the specified position mints
      const targetPositions = allPositions.filter(pos => 
        positionMints.includes(pos.positionMint)
      );

      if (targetPositions.length === 0) {
        throw new Error("No matching positions found");
      }

      // For complete removal, use the full range of each position
      const requests = targetPositions.map(pos => ({
        poolAddress,
        positions: [pos],
        binRange: [pos.lowerBinId, pos.upperBinId] as [number, number],
        removeType,
        walletPublicKey,
        tokenXMint,
        tokenYMint,
      }));

      // Process each position removal
      const allTransactions: Transaction[] = [];
      const allRemovedPositions: UserPosition[] = [];

      for (const request of requests) {
        const result = await this.removeLiquidityFromRange(request);
        allTransactions.push(...result.transactions);
        allRemovedPositions.push(...result.removedPositions);
      }

      return {
        transactions: allTransactions,
        removedPositions: allRemovedPositions,
      };

    } catch (error) {
      console.error("❌ Error removing all liquidity from positions:", error);
      throw new Error(`Complete position removal failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Validate remove liquidity parameters
  validateRemoveParameters(request: RemoveLiquidityRequest): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate pool address
    try {
      new PublicKey(request.poolAddress);
    } catch {
      errors.push("Invalid pool address");
    }

    // Validate wallet address
    try {
      new PublicKey(request.walletPublicKey);
    } catch {
      errors.push("Invalid wallet address");
    }

    // Validate token addresses
    try {
      new PublicKey(request.tokenXMint);
    } catch {
      errors.push("Invalid Token X address");
    }

    try {
      new PublicKey(request.tokenYMint);
    } catch {
      errors.push("Invalid Token Y address");
    }

    // Validate positions
    if (!request.positions || request.positions.length === 0) {
      errors.push("At least one position is required");
    }

    // Validate bin range
    if (request.binRange[0] > request.binRange[1]) {
      errors.push("Invalid bin range: start must be less than or equal to end");
    }

    // Validate remove type
    const validTypes = [RemoveLiquidityType.Both, RemoveLiquidityType.X, RemoveLiquidityType.Y];
    if (!validTypes.includes(request.removeType)) {
      errors.push("Invalid remove type");
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Helper to get remove type options
  getRemoveTypeOptions() {
    return [
      {
        value: RemoveLiquidityType.Both,
        label: "Remove Both Tokens",
        description: "Remove both Token X and Token Y from positions"
      },
      {
        value: RemoveLiquidityType.X,
        label: "Remove Token X Only", 
        description: "Remove only Token X, keeping Token Y in positions"
      },
      {
        value: RemoveLiquidityType.Y,
        label: "Remove Token Y Only",
        description: "Remove only Token Y, keeping Token X in positions"
      }
    ];
  }

  // Helper to calculate estimated removal amounts
  calculateEstimatedRemoval(
    positions: UserPosition[], 
    binRange: [number, number],
    removeType: RemoveLiquidityType
  ): { estimatedX: string, estimatedY: string } {
    // This is a simplified calculation
    // In practice, you'd need to calculate based on the actual bin distributions
    let totalX = 0;
    let totalY = 0;

    positions.forEach(pos => {
      // Check if position overlaps with removal range
      if (!(pos.upperBinId < binRange[0] || pos.lowerBinId > binRange[1])) {
        if (removeType === RemoveLiquidityType.Both || removeType === RemoveLiquidityType.X) {
          totalX += parseFloat(pos.totalLiquidityX);
        }
        if (removeType === RemoveLiquidityType.Both || removeType === RemoveLiquidityType.Y) {
          totalY += parseFloat(pos.totalLiquidityY);
        }
      }
    });

    return {
      estimatedX: totalX.toString(),
      estimatedY: totalY.toString(),
    };
  }
}

export const removeLiquidityService = new RemoveLiquidityService();