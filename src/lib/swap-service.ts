import { LiquidityBookServices, MODE } from "@saros-finance/dlmm-sdk";
import { PublicKey, Transaction, Connection } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { Pool } from "./pools";

interface SwapQuoteRequest {
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
}

interface SwapQuote {
  amountIn: string;
  amountOut: string;
  priceImpact: number;
  minimumReceived: string;
  fee: string;
  route: string[];
}

interface SwapExecuteRequest extends SwapQuoteRequest {
  walletPublicKey: string;
}

class SwapService {
  private dlmmService: LiquidityBookServices;

  constructor() {
    // Use Helius RPC endpoint for better performance and rate limits
    const heliusRPC = "https://mainnet.helius-rpc.com/?api-key=25eb7563-a303-4783-8e62-535586261018";
    const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || heliusRPC;
    
    console.log('🌐 Initializing DLMM service with Helius RPC');
    
    this.dlmmService = new LiquidityBookServices({
      mode: MODE.MAINNET,
      options: {
        rpcUrl,
      },
    });
  }

  async getSwapQuote(request: SwapQuoteRequest): Promise<SwapQuote> {
    try {
      const { fromToken, toToken, amount, isExactInput, pool, slippage } = request;

      console.log('🔍 Getting swap quote for:', {
        fromToken: fromToken.mintAddress,
        toToken: toToken.mintAddress,
        amount,
        poolAddress: pool.address,
        isExactInput,
        slippage
      });

      // Validate amount
      const amountFloat = parseFloat(amount);
      if (isNaN(amountFloat) || amountFloat <= 0) {
        throw new Error("Invalid amount provided");
      }

      // Check for minimum swap amounts to avoid division by zero
      const minSwapAmount = fromToken.decimals === 9 ? 0.001 : 0.01; // Higher minimum for SOL
      if (amountFloat < minSwapAmount) {
        throw new Error(`Minimum swap amount is ${minSwapAmount} ${fromToken.mintAddress === "So11111111111111111111111111111111111111112" ? "SOL" : "tokens"}`);
      }

      // Convert amount to correct decimals
      const amountBigInt = BigInt(
        Math.floor(amountFloat * Math.pow(10, fromToken.decimals))
      );

      console.log('💰 Amount in smallest units:', amountBigInt.toString());

      // Determine swap direction
      const swapForY = fromToken.mintAddress === pool.tokenX.mintAddress;
      console.log('🔄 Swap direction (swapForY):', swapForY);

      // Validate pool addresses
      if (!pool.address || !pool.tokenX.mintAddress || !pool.tokenY.mintAddress) {
        throw new Error("Invalid pool configuration");
      }

      // Validate PublicKey strings before creating PublicKey objects
      let pairPublicKey, tokenBasePublicKey, tokenQuotePublicKey;
      
      try {
        pairPublicKey = new PublicKey(pool.address);
        tokenBasePublicKey = new PublicKey(pool.tokenX.mintAddress);
        tokenQuotePublicKey = new PublicKey(pool.tokenY.mintAddress);
      } catch (error) {
        console.error('❌ Invalid PublicKey format:', {
          poolAddress: pool.address,
          tokenX: pool.tokenX.mintAddress,
          tokenY: pool.tokenY.mintAddress
        });
        throw new Error("Invalid token or pool address format");
      }

      const quoteParams = {
        amount: amountBigInt,
        isExactInput,
        swapForY,
        pair: pairPublicKey,
        tokenBase: tokenBasePublicKey,
        tokenQuote: tokenQuotePublicKey,
        tokenBaseDecimal: pool.tokenX.decimals,
        tokenQuoteDecimal: pool.tokenY.decimals,
        slippage,
      };

      console.log('📊 Quote parameters:', quoteParams);

      const quoteData = await this.dlmmService.getQuote(quoteParams);

      console.log('✅ Quote received:', quoteData);

      const { amountIn, amountOut, priceImpact } = quoteData;

      // Convert back to human readable amounts
      const amountInFormatted = (Number(amountIn) / Math.pow(10, fromToken.decimals)).toString();
      const amountOutFormatted = (Number(amountOut) / Math.pow(10, toToken.decimals)).toString();

      // Calculate minimum received with slippage
      const minimumReceived = (
        Number(amountOutFormatted) * (1 - slippage / 100)
      ).toString();

      // Estimate fee (feeRate is typically in basis points or decimal)
      const feeRate = pool.feeRate || 0.003; // 0.3% default
      const estimatedFee = (Number(amountInFormatted) * feeRate).toString();

      const result = {
        amountIn: amountInFormatted,
        amountOut: amountOutFormatted,
        priceImpact: Number(priceImpact) / 100, // Convert to percentage
        minimumReceived,
        fee: estimatedFee,
        route: [fromToken.mintAddress, toToken.mintAddress],
      };

      console.log('📈 Final quote result:', result);
      return result;

    } catch (error) {
      console.error("❌ Error getting swap quote:", error);
      
      // Provide more specific error messages
      if (error instanceof Error) {
        if (error.message.includes('fetch')) {
          throw new Error("Network error: Unable to connect to Solana RPC. Please check your internet connection.");
        } else if (error.message.includes('Cannot divide by 0') || error.message.includes('divide by 0')) {
          throw new Error("This pool has no liquidity for this swap direction. Try a different token pair or pool.");
        } else if (error.message.includes('insufficient')) {
          throw new Error("Insufficient liquidity in the pool for this swap amount. Try a smaller amount.");
        } else if (error.message.includes('invalid')) {
          throw new Error("Invalid token or pool configuration. Please select different tokens.");
        } else {
          throw new Error(`Swap quote failed: ${error.message}`);
        }
      }
      
      throw new Error("Failed to get swap quote. Please check your input and try again.");
    }
  }

  async prepareSwapTransaction(request: SwapExecuteRequest): Promise<Transaction> {
    try {
      const { fromToken, toToken, amount, isExactInput, pool, slippage, walletPublicKey } = request;

      console.log('🔧 Preparing swap transaction with params:', {
        fromToken: fromToken.mintAddress,
        toToken: toToken.mintAddress,
        amount,
        poolAddress: pool.address,
        walletPublicKey,
        isExactInput,
        slippage
      });

      // Convert amount to correct decimals
      const amountBigInt = BigInt(
        Math.floor(parseFloat(amount) * Math.pow(10, fromToken.decimals))
      );

      // Determine swap direction
      const swapForY = fromToken.mintAddress === pool.tokenX.mintAddress;

      console.log('💰 Transaction amount:', amountBigInt.toString());
      console.log('🔄 Swap direction (swapForY):', swapForY);

      // Validate PublicKey strings before creating PublicKey objects
      let pairPublicKey, tokenXPublicKey, tokenYPublicKey, payerPublicKey;
      
      try {
        console.log('🔍 Creating PublicKey objects from:', {
          poolAddress: pool.address,
          tokenX: pool.tokenX.mintAddress,
          tokenY: pool.tokenY.mintAddress,
          wallet: walletPublicKey
        });

        pairPublicKey = new PublicKey(pool.address);
        tokenXPublicKey = new PublicKey(pool.tokenX.mintAddress);
        tokenYPublicKey = new PublicKey(pool.tokenY.mintAddress);
        payerPublicKey = new PublicKey(walletPublicKey);

        // Verify all PublicKeys were created successfully
        if (!pairPublicKey || !tokenXPublicKey || !tokenYPublicKey || !payerPublicKey) {
          throw new Error("Failed to create one or more PublicKey objects");
        }

        console.log('✅ All PublicKey objects created successfully');
        
      } catch (error) {
        console.error('❌ Invalid PublicKey format in transaction:', {
          poolAddress: pool.address,
          tokenX: pool.tokenX.mintAddress,
          tokenY: pool.tokenY.mintAddress,
          wallet: walletPublicKey,
          error: error
        });
        throw new Error("Invalid address format for transaction");
      }

      // Get quote first to get the otherAmountOffset
      console.log('📊 Getting quote for transaction...');
      const quoteData = await this.dlmmService.getQuote({
        amount: amountBigInt,
        isExactInput,
        swapForY,
        pair: pairPublicKey,
        tokenBase: tokenXPublicKey,
        tokenQuote: tokenYPublicKey,
        tokenBaseDecimal: pool.tokenX.decimals,
        tokenQuoteDecimal: pool.tokenY.decimals,
        slippage,
      });

      console.log('✅ Quote for transaction received:', quoteData);

      const { otherAmountOffset } = quoteData;

      // Create swap transaction using the correct SDK method
      console.log('🔨 Creating swap transaction...');
      
      // Log the actual PublicKey objects to debug
      console.log('🔍 Debugging PublicKey objects:');
      console.log('- Pair:', pairPublicKey?.toString());
      console.log('- TokenX:', tokenXPublicKey?.toString());
      console.log('- TokenY:', tokenYPublicKey?.toString());
      console.log('- User:', payerPublicKey?.toString());
      
      // Use the SDK's swap method following Bharath's pattern
      console.log('🔄 Attempting SDK swap method following group chat pattern...');
      
      // Get the hooks config from the SDK to avoid hook-related errors
      // This fixes the "AccountOwnedByWrongProgram" error mentioned in group chat
      // Use liquidityBookServices.hooksConfig instead of poolmetadata.extra.hook
      const hooksConfig = (this.dlmmService as any).hooksConfig;
      console.log('🪝 Using hooks config:', hooksConfig?.toString());
      
      // Build swap parameters following Bharath's example
      const swapParams: any = {
        tokenMintX: tokenXPublicKey,
        tokenMintY: tokenYPublicKey,
        amount: quoteData.amount, // Use amount from quote
        otherAmountOffset: otherAmountOffset,
        swapForY,
        isExactInput,
        pair: pairPublicKey,
        payer: payerPublicKey,
      };

      // Add hook using SDK's hooksConfig (lido's fix)
      if (hooksConfig) {
        swapParams.hook = new PublicKey(hooksConfig);
        console.log('✅ Added hook from SDK config:', hooksConfig);
      } else {
        console.log('⚠️  No hooks config found in SDK');
      }

      console.log('🔨 Calling SDK swap with params:', {
        ...swapParams,
        tokenMintX: swapParams.tokenMintX.toString(),
        tokenMintY: swapParams.tokenMintY.toString(),
        pair: swapParams.pair.toString(),
        payer: swapParams.payer.toString(),
        hook: swapParams.hook?.toString(),
      });

      const transaction = await (this.dlmmService as any).swap(swapParams);
      return transaction;

    } catch (error) {
      console.error("❌ Error preparing swap transaction:", error);
      
      // Provide more specific error messages
      if (error instanceof Error) {
        if (error.message.includes('fetch')) {
          throw new Error("Network error: Unable to connect to prepare transaction. Please check your connection.");
        } else if (error.message.includes('insufficient')) {
          throw new Error("Insufficient balance or liquidity for this swap.");
        } else if (error.message.includes('invalid')) {
          throw new Error("Invalid transaction parameters. Please try different tokens or amounts.");
        } else {
          throw new Error(`Transaction preparation failed: ${error.message}`);
        }
      }
      
      throw new Error("Failed to prepare swap transaction. Please try again.");
    }
  }

  async executeSwap(
    transaction: Transaction,
    signTransaction: (tx: Transaction) => Promise<Transaction>
  ): Promise<string> {
    try {
      // Sign the transaction
      const signedTransaction = await signTransaction(transaction);

      // Send transaction
      const signature = await this.dlmmService.connection.sendRawTransaction(
        signedTransaction.serialize(),
        {
          skipPreflight: false,
          preflightCommitment: "confirmed",
        }
      );

      // Confirm transaction
      const { blockhash, lastValidBlockHeight } =
        await this.dlmmService.connection.getLatestBlockhash();

      await this.dlmmService.connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight,
      });

      return signature;
    } catch (error) {
      console.error("Error executing swap:", error);
      throw new Error("Swap execution failed. Please try again.");
    }
  }
}

// Export singleton instance
export const swapService = new SwapService();