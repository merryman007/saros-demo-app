import { Connection, PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddress, getAccount } from "@solana/spl-token";

interface TokenBalance {
  mintAddress: string;
  balance: number;
  decimals: number;
  uiAmount: number;
}

class WalletBalanceService {
  private connection: Connection;

  constructor() {
    // Use same RPC as swap service
    const heliusRPC = "https://mainnet.helius-rpc.com/?api-key=25eb7563-a303-4783-8e62-535586261018";
    const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || heliusRPC;
    this.connection = new Connection(rpcUrl, "confirmed");
  }

  async getTokenBalance(walletAddress: string, mintAddress: string, decimals: number): Promise<TokenBalance> {
    try {
      const walletPublicKey = new PublicKey(walletAddress);
      const mintPublicKey = new PublicKey(mintAddress);

      // Handle SOL separately
      if (mintAddress === "So11111111111111111111111111111111111111112") {
        const balance = await this.connection.getBalance(walletPublicKey);
        return {
          mintAddress,
          balance,
          decimals: 9,
          uiAmount: balance / Math.pow(10, 9),
        };
      }

      // Get associated token account address
      const associatedTokenAddress = await getAssociatedTokenAddress(
        mintPublicKey,
        walletPublicKey
      );

      try {
        // Get token account info
        const tokenAccount = await getAccount(this.connection, associatedTokenAddress);
        
        return {
          mintAddress,
          balance: Number(tokenAccount.amount),
          decimals,
          uiAmount: Number(tokenAccount.amount) / Math.pow(10, decimals),
        };
      } catch (error) {
        // Token account doesn't exist, balance is 0
        return {
          mintAddress,
          balance: 0,
          decimals,
          uiAmount: 0,
        };
      }
    } catch (error) {
      console.error("Error getting token balance:", error);
      return {
        mintAddress,
        balance: 0,
        decimals,
        uiAmount: 0,
      };
    }
  }

  async getMultipleTokenBalances(
    walletAddress: string, 
    tokens: Array<{ mintAddress: string; decimals: number }>
  ): Promise<Record<string, TokenBalance>> {
    const balances: Record<string, TokenBalance> = {};
    
    // Process tokens in small batches with delays to avoid rate limits
    const batchSize = 3; // Smaller batches
    const delay = 200; // 200ms delay between batches
    
    for (let i = 0; i < tokens.length; i += batchSize) {
      const batch = tokens.slice(i, i + batchSize);
      
      // Process batch in parallel
      const balancePromises = batch.map(token => 
        this.getTokenBalance(walletAddress, token.mintAddress, token.decimals)
      );

      try {
        const results = await Promise.all(balancePromises);
        
        results.forEach(balance => {
          balances[balance.mintAddress] = balance;
        });
      } catch (error) {
        console.warn(`Error loading batch ${i / batchSize + 1}:`, error);
        // Continue with next batch even if this one fails
      }
      
      // Add delay between batches (except for the last batch)
      if (i + batchSize < tokens.length) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    return balances;
  }
}

export const walletBalanceService = new WalletBalanceService();