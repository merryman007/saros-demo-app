import { PublicKey, Transaction, Connection, SystemProgram } from "@solana/web3.js";
import { createMint, getOrCreateAssociatedTokenAccount, TOKEN_2022_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { LiquidityBookServices, MODE } from "@saros-finance/dlmm-sdk";
import { utils, BN } from "@coral-xyz/anchor";

export interface BinLiquidityDistribution {
  relativeBinId: number;    // Relative bin ID from active bin
  distributionX: number;    // Distribution of token X (0-10000)
  distributionY: number;    // Distribution of token Y (0-10000)
}

export interface AddLiquidityRequest {
  poolAddress: string;
  amountX: string;          // Amount of token X to add
  amountY: string;          // Amount of token Y to add
  liquidityDistribution: BinLiquidityDistribution[];
  walletPublicKey: string;
  tokenXMint: string;
  tokenYMint: string;
  relativeBinIdLeft?: number;   // For new positions
  relativeBinIdRight?: number;  // For new positions
  existingPositionMint?: string; // For adding to existing position
}

export interface AddLiquidityResult {
  positionMint?: string;    // Only for new positions
  transactionSignature: string;
}

class AddLiquidityService {
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
    
    console.log('💧 Initializing Add Liquidity Service');
  }

  // Get program configuration
  private getProgramConfig() {
    try {
      const programId = new PublicKey("1qbkdrr3z4ryLA7pZykqxvxWPoeifcVKo6ZG9CfkvVE");
      const config = new PublicKey("9aXo79uWCtxxxmssuTmAjCSGyP1sMxhQZdKZhrcMxGzz");
      
      return { programId, config };
    } catch (error) {
      console.error('Error getting program configuration:', error);
      throw new Error('Failed to get program configuration');
    }
  }

  // Create a new position and add liquidity
  async createNewPosition(request: AddLiquidityRequest): Promise<Transaction> {
    const { 
      poolAddress, 
      amountX, 
      amountY, 
      liquidityDistribution,
      walletPublicKey,
      tokenXMint,
      tokenYMint,
      relativeBinIdLeft = -5,
      relativeBinIdRight = 5
    } = request;

    console.log('🆕 Creating new position...');
    
    const { programId } = this.getProgramConfig();
    const payer = new PublicKey(walletPublicKey);
    const pairPda = new PublicKey(poolAddress);
    const tokenXPubkey = new PublicKey(tokenXMint);
    const tokenYPubkey = new PublicKey(tokenYMint);

    // Create position mint
    console.log('🪙 Creating position mint...');
    const positionMint = await createMint(
      this.connection,
      // Note: This would need to be signed by the wallet
      payer as any, // This is a placeholder - actual implementation needs proper wallet integration
      payer,
      null,
      0,
      undefined,
      undefined,
      TOKEN_2022_PROGRAM_ID
    );

    // Derive PDAs
    const [positionPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("position"), positionMint.toBuffer()],
      programId
    );

    const [positionTokenAccount] = PublicKey.findProgramAddressSync(
      [
        payer.toBuffer(),
        TOKEN_2022_PROGRAM_ID.toBuffer(),
        positionMint.toBuffer(),
      ],
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    // Create transaction (simplified - in practice would use Anchor program)
    const transaction = new Transaction();
    
    // Add create position instruction (placeholder)
    // In practice, this would use the actual program instruction
    console.log('📍 Position created at:', positionPda.toString());
    
    return transaction;
  }

  // Add liquidity to existing position using SDK
  async addLiquidityWithSDK(request: AddLiquidityRequest): Promise<AddLiquidityResult> {
    try {
      const { poolAddress, amountX, amountY, walletPublicKey } = request;
      
      console.log('💧 Adding liquidity with SDK...');
      console.log('📊 Liquidity parameters:', {
        poolAddress,
        amountX,
        amountY,
        payer: walletPublicKey
      });

      const payer = new PublicKey(walletPublicKey);
      
      // Use SDK's addLiquidity method (this is a simplified version)
      // In practice, you'd need to handle the actual SDK interface
      const result = await (this.dlmmService as any).addLiquidity({
        poolAddress,
        amountX: new BN(amountX),
        amountY: new BN(amountY),
        payer,
        // Additional parameters would go here
      });

      console.log('✅ Liquidity addition prepared');
      
      return {
        transactionSignature: 'placeholder-signature', // Would be actual signature
      };

    } catch (error) {
      console.error("❌ Error adding liquidity with SDK:", error);
      throw new Error(`Add liquidity failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Validate add liquidity parameters
  validateAddLiquidityParameters(request: AddLiquidityRequest): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate pool address
    try {
      new PublicKey(request.poolAddress);
    } catch {
      errors.push("Invalid pool address");
    }

    // Validate token amounts
    if (!request.amountX || parseFloat(request.amountX) <= 0) {
      errors.push("Amount X must be greater than 0");
    }

    if (!request.amountY || parseFloat(request.amountY) <= 0) {
      errors.push("Amount Y must be greater than 0");
    }

    // Validate liquidity distribution
    if (!request.liquidityDistribution || request.liquidityDistribution.length === 0) {
      errors.push("Liquidity distribution is required");
    } else {
      const totalDistribution = request.liquidityDistribution.reduce(
        (sum, dist) => sum + dist.distributionX + dist.distributionY, 
        0
      );
      
      if (totalDistribution !== 10000) {
        errors.push("Total distribution must equal 10000 (100%)");
      }

      // Validate distribution rules
      for (const dist of request.liquidityDistribution) {
        if (dist.relativeBinId < 0 && dist.distributionY > 0) {
          errors.push("Negative bin IDs can only have token X distribution");
        }
        if (dist.relativeBinId > 0 && dist.distributionX > 0) {
          errors.push("Positive bin IDs can only have token Y distribution");
        }
      }
    }

    // Validate wallet address
    try {
      new PublicKey(request.walletPublicKey);
    } catch {
      errors.push("Invalid wallet address");
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Generate default liquidity distribution
  generateDefaultDistribution(binsLeft: number = 5, binsRight: number = 5): BinLiquidityDistribution[] {
    const distribution: BinLiquidityDistribution[] = [];
    const totalBins = binsLeft + binsRight + 1; // +1 for active bin
    
    // Distribute liquidity in a bell curve pattern
    for (let i = -binsLeft; i <= binsRight; i++) {
      const distance = Math.abs(i);
      const weight = Math.max(1, totalBins - distance);
      const normalizedWeight = Math.floor((weight / (totalBins * totalBins)) * 10000);
      
      if (i < 0) {
        // Left side - only token X
        distribution.push({
          relativeBinId: i,
          distributionX: normalizedWeight,
          distributionY: 0
        });
      } else if (i > 0) {
        // Right side - only token Y  
        distribution.push({
          relativeBinId: i,
          distributionX: 0,
          distributionY: normalizedWeight
        });
      } else {
        // Active bin - both tokens
        distribution.push({
          relativeBinId: 0,
          distributionX: normalizedWeight / 2,
          distributionY: normalizedWeight / 2
        });
      }
    }

    // Normalize to ensure total equals 10000
    const total = distribution.reduce((sum, d) => sum + d.distributionX + d.distributionY, 0);
    const factor = 10000 / total;
    
    return distribution.map(d => ({
      ...d,
      distributionX: Math.floor(d.distributionX * factor),
      distributionY: Math.floor(d.distributionY * factor)
    }));
  }
}

export const addLiquidityService = new AddLiquidityService();