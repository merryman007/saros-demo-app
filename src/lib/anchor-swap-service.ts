import { PublicKey, Transaction, Connection } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { BN, Program, AnchorProvider } from "@project-serum/anchor";
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

interface SwapExecuteRequest extends SwapQuoteRequest {
  walletPublicKey: string;
}

// Saros DLMM Program ID (provided by user)
const DLMM_PROGRAM_ID = new PublicKey("1qbkdrr3z4ryLA7pZykqxvxWPoeifcVKo6ZG9CfkvVE");

class AnchorSwapService {
  private connection: Connection;
  private programId: PublicKey;

  constructor() {
    const heliusRPC = "https://mainnet.helius-rpc.com/?api-key=25eb7563-a303-4783-8e62-535586261018";
    const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || heliusRPC;
    
    this.connection = new Connection(rpcUrl, "confirmed");
    this.programId = DLMM_PROGRAM_ID;
    
    console.log('🌐 Initializing Anchor-based swap service');
  }

  // Derive bin array PDAs as shown in the documentation
  private deriveBinArrayPDAs(pairPda: PublicKey) {
    const [binArrayLowerPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("bin_array"), pairPda.toBuffer(), Buffer.from([0])],
      this.programId
    );

    const [binArrayUpperPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("bin_array"), pairPda.toBuffer(), Buffer.from([1])],
      this.programId
    );

    return { binArrayLowerPda, binArrayUpperPda };
  }

  // Derive token vault PDAs
  private deriveTokenVaultPDAs(pairPda: PublicKey, tokenMintX: PublicKey, tokenMintY: PublicKey) {
    const [tokenVaultXPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("token_vault_x"), pairPda.toBuffer()],
      this.programId
    );

    const [tokenVaultYPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("token_vault_y"), pairPda.toBuffer()],
      this.programId
    );

    return { tokenVaultXPda, tokenVaultYPda };
  }

  // Derive user vault PDAs (Associated Token Accounts)
  private async deriveUserVaultPDAs(userPublicKey: PublicKey, tokenMintX: PublicKey, tokenMintY: PublicKey) {
    const { getAssociatedTokenAddress } = await import("@solana/spl-token");
    
    const userVaultXPda = await getAssociatedTokenAddress(tokenMintX, userPublicKey);
    const userVaultYPda = await getAssociatedTokenAddress(tokenMintY, userPublicKey);

    return { userVaultXPda, userVaultYPda };
  }

  async prepareSwapTransaction(request: SwapExecuteRequest): Promise<Transaction> {
    try {
      const { fromToken, toToken, amount, isExactInput, pool, slippage, walletPublicKey } = request;

      console.log('🔧 Preparing Anchor-based swap transaction...');

      // Convert amount to BN
      const amountBN = new BN(
        Math.floor(parseFloat(amount) * Math.pow(10, fromToken.decimals))
      );

      // Determine swap direction
      const swapForY = fromToken.mintAddress === pool.tokenX.mintAddress;

      // Calculate otherAmountThreshold based on slippage
      const estimatedOutput = amountBN.muln(99).divn(100); // Rough 1% estimate
      const otherAmountThreshold = isExactInput 
        ? estimatedOutput.muln(100 - slippage).divn(100) // Minimum output
        : amountBN.muln(100 + slippage).divn(100); // Maximum input

      console.log('📊 Swap parameters:', {
        amount: amountBN.toString(),
        otherAmountThreshold: otherAmountThreshold.toString(),
        swapForY,
        isExactInput
      });

      // Create PublicKey objects
      const pairPda = new PublicKey(pool.address);
      const tokenMintX = new PublicKey(pool.tokenX.mintAddress);
      const tokenMintY = new PublicKey(pool.tokenY.mintAddress);
      const userPublicKey = new PublicKey(walletPublicKey);

      // Derive PDAs
      const { binArrayLowerPda, binArrayUpperPda } = this.deriveBinArrayPDAs(pairPda);
      const { tokenVaultXPda, tokenVaultYPda } = this.deriveTokenVaultPDAs(pairPda, tokenMintX, tokenMintY);
      const { userVaultXPda, userVaultYPda } = await this.deriveUserVaultPDAs(userPublicKey, tokenMintX, tokenMintY);

      console.log('🔑 Derived addresses:', {
        pair: pairPda.toString(),
        binArrayLower: binArrayLowerPda.toString(),
        binArrayUpper: binArrayUpperPda.toString(),
        tokenVaultX: tokenVaultXPda.toString(),
        tokenVaultY: tokenVaultYPda.toString(),
        userVaultX: userVaultXPda.toString(),
        userVaultY: userVaultYPda.toString()
      });

      // Create a minimal transaction with the swap instruction
      const transaction = new Transaction();

      // For now, we'll create a placeholder transaction that shows the structure
      // In a real implementation, you'd need the actual program IDL and use Anchor
      console.log('⚠️  Anchor-based swap requires program IDL and proper Anchor setup');
      console.log('📝 This is a structural example - full implementation needed');

      return transaction;

    } catch (error) {
      console.error("❌ Error preparing Anchor swap transaction:", error);
      throw new Error(`Anchor swap preparation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export const anchorSwapService = new AnchorSwapService();