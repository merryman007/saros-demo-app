import { PublicKey } from '@solana/web3.js';

export interface Token {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
  verified?: boolean;
}

export class TokenService {
  private static tokenRegistry: Record<string, Token> = {};
  private static popularTokens: Token[] = [];
  private static isLoaded = false;

  static async loadTokenRegistry() {
    if (this.isLoaded) return;
    
    // Only load on client side
    if (typeof window === 'undefined') return;

    try {
      const response = await fetch('/token-registry.json');
      const data = await response.json();
      this.tokenRegistry = data.tokens;
      this.popularTokens = this.getPopularTokens();
      this.isLoaded = true;
    } catch (error) {
      console.error('Failed to load token registry:', error);
      // Fallback to known tokens if registry fails
      this.popularTokens = this.getKnownTokens();
      this.isLoaded = true;
    }
  }

  private static getKnownTokens(): Token[] {
    return [
      {
        address: 'So11111111111111111111111111111111111111112',
        symbol: 'SOL',
        name: 'Solana',
        decimals: 9,
        logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png',
        verified: true,
      },
      {
        address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        symbol: 'USDC',
        name: 'USD Coin',
        decimals: 6,
        logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png',
        verified: true,
      },
      {
        address: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
        symbol: 'USDT',
        name: 'USDT',
        decimals: 6,
        logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB/logo.svg',
        verified: true,
      },
    ];
  }

  private static getPopularTokens(): Token[] {
    // Define popular tokens with their known addresses
    const popularTokenAddresses = [
      // SOL (wrapped SOL)
      'So11111111111111111111111111111111111111112',
      // USDC
      'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      // USDT  
      'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
      // RAY
      '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R',
      // ORCA
      'orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE',
    ];

    const popularTokens: Token[] = [];

    // Add popular tokens from registry
    popularTokenAddresses.forEach(address => {
      if (this.tokenRegistry[address]) {
        popularTokens.push(this.tokenRegistry[address]);
      }
    });

    // Add well-known tokens that might not be in registry
    const knownTokens: Token[] = [
      {
        address: 'So11111111111111111111111111111111111111112',
        symbol: 'SOL',
        name: 'Solana',
        decimals: 9,
        logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png',
        verified: true,
      },
      {
        address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        symbol: 'USDC',
        name: 'USD Coin',
        decimals: 6,
        logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png',
        verified: true,
      },
    ];

    // Add known tokens if not already in popular list
    knownTokens.forEach(token => {
      if (!popularTokens.find(t => t.address === token.address)) {
        popularTokens.unshift(token); // Add at beginning
      }
    });

    // Also add other verified tokens from the registry
    const verifiedTokens = Object.values(this.tokenRegistry)
      .filter(token => 
        token.verified && 
        token.symbol && 
        !token.symbol.includes('...') && // Skip truncated symbols
        !popularTokens.find(p => p.address === token.address)
      )
      .slice(0, 10); // Limit to 10 additional

    return [...popularTokens, ...verifiedTokens];
  }

  static getPopularTokens(): Token[] {
    if (this.popularTokens.length === 0) {
      return this.getKnownTokens();
    }
    return this.popularTokens;
  }

  static searchTokens(query: string): Token[] {
    if (!query.trim()) return this.getPopularTokens();

    const searchTerm = query.toLowerCase();
    
    // Check if it looks like a valid Solana address (44 characters, base58)
    const isValidAddress = this.isValidSolanaAddress(query);
    
    // First check if it's a valid address in registry
    if (query.length >= 32 && this.tokenRegistry[query]) {
      return [this.tokenRegistry[query]];
    }

    // If it looks like a valid address but not in registry, create a custom token entry
    if (isValidAddress && !this.tokenRegistry[query]) {
      const customToken: Token = {
        address: query,
        symbol: `${query.slice(0, 4)}...${query.slice(-4)}`,
        name: `Custom Token (${query.slice(0, 4)}...${query.slice(-4)})`,
        decimals: 9, // Default to 9, user can adjust
        verified: false,
      };
      return [customToken];
    }

    // If registry not loaded, search in known tokens
    if (Object.keys(this.tokenRegistry).length === 0) {
      const knownTokens = this.getKnownTokens();
      const filtered = knownTokens.filter(token => {
        const symbolMatch = token.symbol?.toLowerCase().includes(searchTerm);
        const nameMatch = token.name?.toLowerCase().includes(searchTerm);
        const addressMatch = token.address.toLowerCase().includes(searchTerm);
        return symbolMatch || nameMatch || addressMatch;
      });
      
      // If no matches and looks like address, add custom token
      if (filtered.length === 0 && isValidAddress) {
        const customToken: Token = {
          address: query,
          symbol: `${query.slice(0, 4)}...${query.slice(-4)}`,
          name: `Custom Token (${query.slice(0, 4)}...${query.slice(-4)})`,
          decimals: 9,
          verified: false,
        };
        filtered.push(customToken);
      }
      
      return filtered;
    }

    // Search by symbol and name in full registry
    const allTokens = Object.values(this.tokenRegistry);
    const results = allTokens.filter(token => {
      const symbolMatch = token.symbol?.toLowerCase().includes(searchTerm);
      const nameMatch = token.name?.toLowerCase().includes(searchTerm);
      const addressMatch = token.address.toLowerCase().includes(searchTerm);
      
      return symbolMatch || nameMatch || addressMatch;
    }).slice(0, 20); // Limit results

    // If no matches and looks like address, add custom token
    if (results.length === 0 && isValidAddress) {
      const customToken: Token = {
        address: query,
        symbol: `${query.slice(0, 4)}...${query.slice(-4)}`,
        name: `Custom Token (${query.slice(0, 4)}...${query.slice(-4)})`,
        decimals: 9,
        verified: false,
      };
      results.push(customToken);
    }

    // Sort by relevance: exact symbol matches first, then verified tokens
    results.sort((a, b) => {
      const aSymbolExact = a.symbol?.toLowerCase() === searchTerm;
      const bSymbolExact = b.symbol?.toLowerCase() === searchTerm;
      
      if (aSymbolExact && !bSymbolExact) return -1;
      if (!aSymbolExact && bSymbolExact) return 1;
      
      const aVerified = a.verified || false;
      const bVerified = b.verified || false;
      
      if (aVerified && !bVerified) return -1;
      if (!aVerified && bVerified) return 1;
      
      return 0;
    });

    return results;
  }

  private static isValidSolanaAddress(address: string): boolean {
    try {
      // Basic checks for Solana address format
      if (address.length < 32 || address.length > 44) return false;
      
      // Check if it contains only valid base58 characters
      const base58Regex = /^[1-9A-HJ-NP-Za-km-z]+$/;
      if (!base58Regex.test(address)) return false;
      
      // Try to create a PublicKey to validate
      new PublicKey(address);
      return true;
    } catch {
      return false;
    }
  }

  static getTokenByAddress(address: string): Token | undefined {
    return this.tokenRegistry[address];
  }
}