import { LiquidityBookServices, MODE } from "@saros-finance/dlmm-sdk";
import { PublicKey, Transaction } from "@solana/web3.js";
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
    this.dlmmService = new LiquidityBookServices({
      mode: MODE.MAINNET,
      options: {
        rpcUrl: process.env.NEXT_PUBLIC_RPC_URL || "https://rpc.ankr.com/solana",
      },
    });
  }

  async getSwapQuote(request: SwapQuoteRequest): Promise<SwapQuote> {
    try {
      const { fromToken, toToken, amount, isExactInput, pool, slippage } = request;

      // Convert amount to correct decimals
      const amountBigInt = BigInt(
        Math.floor(parseFloat(amount) * Math.pow(10, fromToken.decimals))
      );

      // Determine swap direction
      const swapForY = fromToken.mintAddress === pool.tokenX.mintAddress;

      const quoteData = await this.dlmmService.getQuote({
        amount: amountBigInt,
        isExactInput,
        swapForY,
        pair: new PublicKey(pool.address),
        tokenBase: new PublicKey(pool.tokenX.mintAddress),
        tokenQuote: new PublicKey(pool.tokenY.mintAddress),
        tokenBaseDecimal: pool.tokenX.decimals,
        tokenQuoteDecimal: pool.tokenY.decimals,
        slippage,
      });

      const { amountIn, amountOut, priceImpact } = quoteData;

      // Convert back to human readable amounts
      const amountInFormatted = (Number(amountIn) / Math.pow(10, fromToken.decimals)).toString();
      const amountOutFormatted = (Number(amountOut) / Math.pow(10, toToken.decimals)).toString();

      // Calculate minimum received with slippage
      const minimumReceived = (
        Number(amountOutFormatted) * (1 - slippage / 100)
      ).toString();

      // Estimate fee (rough calculation)
      const estimatedFee = (Number(amountInFormatted) * (pool.feeRate / 10000)).toString();

      return {
        amountIn: amountInFormatted,
        amountOut: amountOutFormatted,
        priceImpact: Number(priceImpact) / 100, // Convert to percentage
        minimumReceived,
        fee: estimatedFee,
        route: [fromToken.mintAddress, toToken.mintAddress],
      };
    } catch (error) {
      console.error("Error getting swap quote:", error);
      throw new Error("Failed to get swap quote. Please check your input and try again.");
    }
  }

  async prepareSwapTransaction(request: SwapExecuteRequest): Promise<Transaction> {
    try {
      const { fromToken, toToken, amount, isExactInput, pool, slippage, walletPublicKey } = request;

      // Convert amount to correct decimals
      const amountBigInt = BigInt(
        Math.floor(parseFloat(amount) * Math.pow(10, fromToken.decimals))
      );

      // Determine swap direction
      const swapForY = fromToken.mintAddress === pool.tokenX.mintAddress;

      // Get quote first to get the otherAmountOffset
      const quoteData = await this.dlmmService.getQuote({
        amount: amountBigInt,
        isExactInput,
        swapForY,
        pair: new PublicKey(pool.address),
        tokenBase: new PublicKey(pool.tokenX.mintAddress),
        tokenQuote: new PublicKey(pool.tokenY.mintAddress),
        tokenBaseDecimal: pool.tokenX.decimals,
        tokenQuoteDecimal: pool.tokenY.decimals,
        slippage,
      });

      const { otherAmountOffset } = quoteData;

      // Create swap transaction
      const transaction = await this.dlmmService.swap({
        amount: amountBigInt,
        tokenMintX: new PublicKey(pool.tokenX.mintAddress),
        tokenMintY: new PublicKey(pool.tokenY.mintAddress),
        otherAmountOffset,
        isExactInput,
        swapForY,
        pair: new PublicKey(pool.address),
        payer: new PublicKey(walletPublicKey),
      });

      return transaction;
    } catch (error) {
      console.error("Error preparing swap transaction:", error);
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