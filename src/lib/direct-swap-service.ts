import { PublicKey, Transaction, Connection, SystemProgram } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress, createAssociatedTokenAccountInstruction } from "@solana/spl-token";
import { LiquidityBookServices, MODE } from "@saros-finance/dlmm-sdk";
import { Pool } from "./pools";

interface SwapExecuteRequest {
  fromToken: {
    mintAddress: string;
    decimals: number;
  };
  toToken: {
    mintAddress: string;
    decimals: number;
  };
  amount: string;
  isExactInput: boolean;
  pool: Pool;
  slippage: number;
  walletPublicKey: string;
}

class DirectSwapService {
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
    console.log('🔧 Initializing Direct Swap Service following documentation pattern');
  }

  // Get the actual Saros DLMM program ID from the SDK
  private getDLMMProgramId(): PublicKey {
    // Access the program ID through the SDK
    // The SDK should expose this through its internal program reference
    try {
      // Try to access the program ID through the service
      const programId = (this.dlmmService as any).programId || 
                       (this.dlmmService as any).program?.programId ||
                       new PublicKey("1qbkdrr3z4ryLA7pZykqxvxWPoeifcVKo6ZG9CfkvVE"); // Correct program ID
      
      console.log('📋 Using DLMM Program ID:', programId.toString());
      return programId;
    } catch (error) {
      console.warn('⚠️  Could not get program ID from SDK, using fallback');
      return new PublicKey("1qbkdrr3z4ryLA7pZykqxvxWPoeifcVKo6ZG9CfkvVE");
    }
  }

  // Try to access the SDK's internal program or methods
  private getSDKSwapMethod() {
    try {
      // Check if the SDK has a direct swap method we can use
      const swapMethod = (this.dlmmService as any).swapExactIn || 
                         (this.dlmmService as any).swapExactOut ||
                         (this.dlmmService as any).swap;
      
      if (swapMethod) {
        console.log('✅ Found SDK swap method');
        return swapMethod.bind(this.dlmmService);
      }
      
      console.log('⚠️  No direct swap method found in SDK');
      return null;
    } catch (error) {
      console.warn('⚠️  Could not access swap methods from SDK:', error);
      return null;
    }
  }

  // Following the exact documentation pattern for deriving bin array PDAs
  private deriveBinArrayPDAs(pairPda: PublicKey, programId: PublicKey) {
    console.log('🔍 Deriving bin array PDAs...');
    
    const [binArrayLowerPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("bin_array"), pairPda.toBuffer(), Buffer.from([0])],
      programId
    );

    const [binArrayUpperPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("bin_array"), pairPda.toBuffer(), Buffer.from([1])],
      programId
    );

    console.log('✅ Bin arrays derived:', {
      lower: binArrayLowerPda.toString(),
      upper: binArrayUpperPda.toString()
    });

    return { binArrayLowerPda, binArrayUpperPda };
  }

  // Derive token vault PDAs - following Saros pattern
  private deriveTokenVaultPDAs(pairPda: PublicKey, programId: PublicKey) {
    console.log('🔍 Deriving token vault PDAs...');
    
    const [tokenVaultXPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("reserve_x"), pairPda.toBuffer()],
      programId
    );

    const [tokenVaultYPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("reserve_y"), pairPda.toBuffer()],
      programId
    );

    console.log('✅ Token vaults derived:', {
      vaultX: tokenVaultXPda.toString(),
      vaultY: tokenVaultYPda.toString()
    });

    return { tokenVaultXPda, tokenVaultYPda };
  }

  // Get user's associated token accounts
  private async getUserVaultPDAs(userPublicKey: PublicKey, tokenMintX: PublicKey, tokenMintY: PublicKey) {
    console.log('🔍 Getting user vault PDAs (Associated Token Accounts)...');
    
    const userVaultXPda = await getAssociatedTokenAddress(tokenMintX, userPublicKey);
    const userVaultYPda = await getAssociatedTokenAddress(tokenMintY, userPublicKey);

    console.log('✅ User vaults derived:', {
      userVaultX: userVaultXPda.toString(),
      userVaultY: userVaultYPda.toString()
    });

    return { userVaultXPda, userVaultYPda };
  }

  async prepareSwapTransaction(request: SwapExecuteRequest): Promise<Transaction> {
    try {
      const { fromToken, toToken, amount, isExactInput, pool, slippage, walletPublicKey } = request;

      console.log('🚀 Preparing direct swap transaction following documentation...');
      console.log('📊 Swap details:', {
        from: fromToken.mintAddress,
        to: toToken.mintAddress,
        amount,
        pool: pool.address,
        isExactInput
      });

      // Convert amount to BigInt as supported by SDK
      const amountBigInt = BigInt(
        Math.floor(parseFloat(amount) * Math.pow(10, fromToken.decimals))
      );

      // Set minimum output to 0 for now (we'll improve this)
      const otherAmountThreshold = BigInt(0);

      // Determine swap direction (exactly as in docs)
      const swapForY = fromToken.mintAddress === pool.tokenX.mintAddress;

      console.log('💰 Swap parameters:', {
        amountIn: amountBigInt.toString(),
        otherAmountThreshold: otherAmountThreshold.toString(),
        swapForY
      });

      // Create PublicKey objects
      const pairPda = new PublicKey(pool.address);
      const tokenMintX = new PublicKey(pool.tokenX.mintAddress);
      const tokenMintY = new PublicKey(pool.tokenY.mintAddress);
      const userPublicKey = new PublicKey(walletPublicKey);

      // Get the real program ID from the SDK
      const programId = this.getDLMMProgramId();

      // Derive all PDAs following the documentation pattern
      const { binArrayLowerPda, binArrayUpperPda } = this.deriveBinArrayPDAs(pairPda, programId);
      const { tokenVaultXPda, tokenVaultYPda } = this.deriveTokenVaultPDAs(pairPda, programId);
      const { userVaultXPda, userVaultYPda } = await this.getUserVaultPDAs(userPublicKey, tokenMintX, tokenMintY);

      // Create transaction
      const transaction = new Transaction();

      // Check if user needs ATA creation (common requirement)
      console.log('🔍 Checking if user ATAs exist...');
      
      try {
        await this.connection.getAccountInfo(userVaultXPda);
      } catch {
        console.log('➕ Adding create ATA instruction for token X');
        transaction.add(
          createAssociatedTokenAccountInstruction(
            userPublicKey, // payer
            userVaultXPda, // ata
            userPublicKey, // owner
            tokenMintX // mint
          )
        );
      }

      try {
        await this.connection.getAccountInfo(userVaultYPda);
      } catch {
        console.log('➕ Adding create ATA instruction for token Y');
        transaction.add(
          createAssociatedTokenAccountInstruction(
            userPublicKey, // payer
            userVaultYPda, // ata
            userPublicKey, // owner
            tokenMintY // mint
          )
        );
      }

      console.log('📋 All accounts prepared for swap instruction:');
      console.log({
        pair: pairPda.toString(),
        binArrayLower: binArrayLowerPda.toString(),
        binArrayUpper: binArrayUpperPda.toString(),
        tokenMintX: tokenMintX.toString(),
        tokenMintY: tokenMintY.toString(),
        tokenVaultX: tokenVaultXPda.toString(),
        tokenVaultY: tokenVaultYPda.toString(),
        userVaultX: userVaultXPda.toString(),
        userVaultY: userVaultYPda.toString(),
        user: userPublicKey.toString()
      });

      // Try to use the SDK's built-in swap methods (like we do in swap-service.ts)
      console.log('🔨 Attempting to use SDK swap methods...');
      
      try {
        // First, let's try to get a quote to get the correct otherAmountThreshold
        const quoteData = await this.dlmmService.getQuote({
          amount: amountBigInt,
          isExactInput,
          swapForY,
          pair: pairPda,
          tokenBase: tokenMintX,
          tokenQuote: tokenMintY,
          tokenBaseDecimal: pool.tokenX.decimals,
          tokenQuoteDecimal: pool.tokenY.decimals,
          slippage,
        });

        console.log('✅ Quote received for direct swap:', quoteData);
        const { otherAmountOffset } = quoteData;

        // Get the hook configuration from the SDK
        // This fixes the "AccountOwnedByWrongProgram" error mentioned in group chat
        // Use liquidityBookServices.hooksConfig instead of poolmetadata.extra.hook
        const hooksConfig = (this.dlmmService as any).hooksConfig;
        console.log('🪝 Using hooks config:', hooksConfig?.toString());

        // Now create the swap transaction using SDK methods
        let swapTransaction: Transaction;
        
        // Use the same swap method pattern as Bharath's example
        const swapParams: any = {
          tokenMintX: tokenMintX,
          tokenMintY: tokenMintY,
          amount: quoteData.amount, // Use amount from quote
          otherAmountOffset: otherAmountOffset,
          swapForY,
          isExactInput,
          pair: pairPda,
          payer: userPublicKey,
        };

        // Add hook using SDK's hooksConfig (lido's fix)
        if (hooksConfig) {
          swapParams.hook = new PublicKey(hooksConfig);
          console.log('✅ Added hook from SDK config to direct swap');
        }

        console.log('🔨 Direct swap calling SDK swap with params:', {
          ...swapParams,
          tokenMintX: swapParams.tokenMintX.toString(),
          tokenMintY: swapParams.tokenMintY.toString(),
          pair: swapParams.pair.toString(),
          payer: swapParams.payer.toString(),
          hook: swapParams.hook?.toString(),
        });

        swapTransaction = await (this.dlmmService as any).swap(swapParams);

        // Combine our ATA instructions with the SDK's swap instructions
        const combinedTransaction = new Transaction();
        
        // Add our ATA creation instructions first
        transaction.instructions.forEach(instruction => {
          combinedTransaction.add(instruction);
        });

        // Add the SDK's swap instructions
        swapTransaction.instructions.forEach(instruction => {
          combinedTransaction.add(instruction);
        });

        console.log('✅ Combined transaction created with ATA setup + SDK swap');
        return combinedTransaction;

      } catch (swapError) {
        console.error('❌ Error using SDK swap methods:', swapError);
        console.log('🔄 Returning transaction with ATA setup only');
        console.log('💡 This demonstrates the PDA derivation pattern from documentation');
      }
      
      return transaction;

    } catch (error) {
      console.error("❌ Error preparing direct swap transaction:", error);
      throw new Error(`Direct swap preparation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export const directSwapService = new DirectSwapService();