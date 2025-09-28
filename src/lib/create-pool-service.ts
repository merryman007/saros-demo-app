import { PublicKey, Transaction, Connection, SystemProgram } from "@solana/web3.js";
import { getOrCreateAssociatedTokenAccount, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { LiquidityBookServices, MODE, BIN_STEP_CONFIGS } from "@saros-finance/dlmm-sdk";
import { utils } from "@coral-xyz/anchor";

export interface CreatePoolRequest {
  tokenX: {
    mintAddress: string;
    decimals: number;
  };
  tokenY: {
    mintAddress: string;
    decimals: number;
  };
  binStep: number;
  activeId: number;
  walletPublicKey: string;
}

export interface CreatePoolResult {
  pairAddress: string;
  binArrayLowerAddress: string;
  binArrayUpperAddress: string;
  transaction: Transaction;
}

export interface CreatePoolSignedResult {
  pairAddress: string;
  binArrayLowerAddress: string;
  binArrayUpperAddress: string;
  transactionSignature: string;
}

class CreatePoolService {
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
    
    console.log('🏗️ Initializing Create Pool Service');
  }

  // Get available bin step configurations
  getBinStepConfigs() {
    return BIN_STEP_CONFIGS.map(config => ({
      binStep: config.binStep,
      baseFactor: config.baseFactor,
      maxVolatilityAccumulated: config.maxVolatilityAccumulated,
      description: `${config.binStep} basis points (${(config.binStep / 100).toFixed(2)}%)`
    }));
  }

  // Get the program ID and configuration
  private getProgramConfig() {
    try {
      const programId = new PublicKey("1qbkdrr3z4ryLA7pZykqxvxWPoeifcVKo6ZG9CfkvVE");
      // This would typically be fetched from the SDK or configuration
      const config = new PublicKey("9aXo79uWCtxxxmssuTmAjCSGyP1sMxhQZdKZhrcMxGzz");
      
      return { programId, config };
    } catch (error) {
      console.error('Error getting program configuration:', error);
      throw new Error('Failed to get program configuration');
    }
  }

  // Derive all required PDAs following the documentation pattern
  private derivePDAs(
    config: PublicKey,
    tokenX: PublicKey,
    tokenY: PublicKey,
    binStep: number,
    programId: PublicKey
  ) {
    console.log('🔍 Deriving PDAs for pool creation...');

    // Derive bin step config PDA
    const [binStepConfig] = PublicKey.findProgramAddressSync(
      [
        Buffer.from(utils.bytes.utf8.encode("bin_step_config")),
        config.toBuffer(),
        new Uint8Array([binStep]),
      ],
      programId
    );

    // Derive quote asset badge PDA (for token Y)
    const [quoteAssetBadge] = PublicKey.findProgramAddressSync(
      [
        Buffer.from(utils.bytes.utf8.encode("quote_asset_badge")),
        config.toBuffer(),
        tokenY.toBuffer(),
      ],
      programId
    );

    // Derive pair PDA
    const [pair] = PublicKey.findProgramAddressSync(
      [
        Buffer.from(utils.bytes.utf8.encode("pair")),
        config.toBuffer(),
        tokenX.toBuffer(),
        tokenY.toBuffer(),
        new Uint8Array([binStep]),
      ],
      programId
    );

    const BIN_ARRAY_INDEX = 0;

    // Derive bin array PDAs
    const [binArrayLower] = PublicKey.findProgramAddressSync(
      [
        Buffer.from(utils.bytes.utf8.encode("bin_array")),
        pair.toBuffer(),
        new Uint8Array(new Int32Array([BIN_ARRAY_INDEX]).buffer),
      ],
      programId
    );

    const [binArrayUpper] = PublicKey.findProgramAddressSync(
      [
        Buffer.from(utils.bytes.utf8.encode("bin_array")),
        pair.toBuffer(),
        new Uint8Array(new Int32Array([BIN_ARRAY_INDEX + 1]).buffer),
      ],
      programId
    );

    console.log('✅ PDAs derived:', {
      binStepConfig: binStepConfig.toString(),
      quoteAssetBadge: quoteAssetBadge.toString(),
      pair: pair.toString(),
      binArrayLower: binArrayLower.toString(),
      binArrayUpper: binArrayUpper.toString(),
    });

    return {
      binStepConfig,
      quoteAssetBadge,
      pair,
      binArrayLower,
      binArrayUpper,
      BIN_ARRAY_INDEX
    };
  }

  // Use SDK's createPairWithConfig method (simpler approach)
  async createPoolWithSDK(request: CreatePoolRequest): Promise<CreatePoolResult> {
    try {
      const { tokenX, tokenY, binStep, activeId, walletPublicKey } = request;

      console.log('🏗️ Creating pool with SDK method...');
      console.log('📊 Pool parameters:', {
        tokenX: tokenX.mintAddress,
        tokenY: tokenY.mintAddress,
        binStep,
        activeId,
        payer: walletPublicKey
      });

      const payer = new PublicKey(walletPublicKey);

      // Calculate rate price based on active ID
      // Active ID represents the current price bin
      const ratePrice = Math.pow(1.0001, activeId - 8388608); // 8388608 is the center bin (2^23)

      console.log('💰 Calculated rate price:', ratePrice);

      // Use SDK's createPairWithConfig method first to get the actual pair address
      console.log('🔨 Generating pool configuration with SDK...');
      const { tx, pair } = await (this.dlmmService as any).createPairWithConfig({
        tokenBase: {
          mintAddress: tokenX.mintAddress,
          decimal: tokenX.decimals,
        },
        tokenQuote: {
          mintAddress: tokenY.mintAddress,
          decimal: tokenY.decimals,
        },
        ratePrice,
        binStep,
        payer,
      });

      console.log('✅ Pool creation transaction prepared');
      console.log('📍 Pool address:', pair.toString());

      // Now check if this specific pair address already exists
      const pairPublicKey = typeof pair === 'string' ? new PublicKey(pair) : pair;
      const pairAccountInfo = await this.connection.getAccountInfo(pairPublicKey);
      if (pairAccountInfo !== null) {
        throw new Error(`Pool already exists at address: ${pairPublicKey.toString()}`);
      }

      console.log('✅ Confirmed SDK-generated pair address does not exist');

      // Set recent blockhash for the transaction
      const { blockhash } = await this.connection.getLatestBlockhash();
      tx.recentBlockhash = blockhash;
      tx.feePayer = payer;

      console.log('🔗 Transaction blockhash set:', blockhash);

      // For bin arrays, we'll derive them since they're not returned by the SDK
      const { programId } = this.getProgramConfig();
      const tokenXPubkey = new PublicKey(tokenX.mintAddress);
      const tokenYPubkey = new PublicKey(tokenY.mintAddress);
      
      const [pairPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from(utils.bytes.utf8.encode("pair")),
          // Note: We'd need the actual config address here
          new PublicKey("9aXo79uWCtxxxmssuTmAjCSGyP1sMxhQZdKZhrcMxGzz").toBuffer(),
          tokenXPubkey.toBuffer(),
          tokenYPubkey.toBuffer(),
          new Uint8Array([binStep]),
        ],
        programId
      );

      const [binArrayLower] = PublicKey.findProgramAddressSync(
        [
          Buffer.from(utils.bytes.utf8.encode("bin_array")),
          pairPda.toBuffer(),
          new Uint8Array(new Int32Array([0]).buffer),
        ],
        programId
      );

      const [binArrayUpper] = PublicKey.findProgramAddressSync(
        [
          Buffer.from(utils.bytes.utf8.encode("bin_array")),
          pairPda.toBuffer(),
          new Uint8Array(new Int32Array([1]).buffer),
        ],
        programId
      );

      return {
        pairAddress: pairPublicKey.toString(),
        binArrayLowerAddress: binArrayLower.toString(),
        binArrayUpperAddress: binArrayUpper.toString(),
        transaction: tx,
      };

    } catch (error) {
      console.error("❌ Error creating pool with SDK:", error);
      throw new Error(`Pool creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Validate pool creation parameters
  validatePoolParameters(request: CreatePoolRequest): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate token addresses
    try {
      new PublicKey(request.tokenX.mintAddress);
    } catch {
      errors.push("Invalid Token X address");
    }

    try {
      new PublicKey(request.tokenY.mintAddress);
    } catch {
      errors.push("Invalid Token Y address");
    }

    // Validate tokens are different
    if (request.tokenX.mintAddress === request.tokenY.mintAddress) {
      errors.push("Token X and Token Y must be different");
    }

    // Validate bin step
    const validBinSteps = BIN_STEP_CONFIGS.map(config => config.binStep);
    if (!validBinSteps.includes(request.binStep)) {
      errors.push(`Invalid bin step. Valid options: ${validBinSteps.join(', ')}`);
    }

    // Validate active ID range
    if (request.activeId < 0 || request.activeId > 16777215) { // 2^24 - 1
      errors.push("Active ID must be between 0 and 16777215");
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

  // Check if pool already exists
  async checkPoolExists(tokenX: string, tokenY: string, binStep: number): Promise<boolean> {
    try {
      const { programId, config } = this.getProgramConfig();
      
      console.log('🔍 Checking pool existence:', {
        tokenX,
        tokenY,
        binStep,
        config: config.toString(),
        programId: programId.toString()
      });
      
      // Check with tokenX, tokenY order
      const [pair1] = PublicKey.findProgramAddressSync(
        [
          Buffer.from(utils.bytes.utf8.encode("pair")),
          config.toBuffer(),
          new PublicKey(tokenX).toBuffer(),
          new PublicKey(tokenY).toBuffer(),
          new Uint8Array([binStep]),
        ],
        programId
      );

      // Check with tokenY, tokenX order (reversed)
      const [pair2] = PublicKey.findProgramAddressSync(
        [
          Buffer.from(utils.bytes.utf8.encode("pair")),
          config.toBuffer(),
          new PublicKey(tokenY).toBuffer(),
          new PublicKey(tokenX).toBuffer(),
          new Uint8Array([binStep]),
        ],
        programId
      );

      console.log('📍 Checking pair addresses:', {
        pair1: pair1.toString(),
        pair2: pair2.toString()
      });

      const [accountInfo1, accountInfo2] = await Promise.all([
        this.connection.getAccountInfo(pair1),
        this.connection.getAccountInfo(pair2)
      ]);

      const exists = accountInfo1 !== null || accountInfo2 !== null;
      console.log('💫 Pool existence result:', exists);
      
      return exists;
    } catch (error) {
      console.error('Error checking pool existence:', error);
      return false;
    }
  }
}

export const createPoolService = new CreatePoolService();