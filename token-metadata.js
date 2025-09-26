// Token metadata fetching service for Node.js scripts
// Fetches real token names, symbols, and metadata from Jupiter's token list and Solana Token Registry

import fetch from 'node-fetch';
import fs from 'fs';

class TokenMetadataService {
  constructor() {
    this.jupiterTokens = new Map();
    this.solanaTokens = new Map();
    this.cache = new Map();
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    console.log("🔍 Fetching token metadata from registries...");

    try {
      // Fetch Jupiter token list (most comprehensive for Solana)
      await this.fetchJupiterTokens();

      // Fetch Solana Token Registry as fallback
      await this.fetchSolanaTokens();

      this.initialized = true;
      console.log(`✅ Token metadata initialized: ${this.jupiterTokens.size} Jupiter tokens, ${this.solanaTokens.size} Solana tokens`);
    } catch (error) {
      console.error("❌ Failed to fetch token metadata:", error);
    }
  }

  async fetchJupiterTokens() {
    try {
      console.log("📡 Fetching Jupiter token list...");
      const response = await fetch('https://token.jup.ag/all');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const tokens = await response.json();

      tokens.forEach(token => {
        this.jupiterTokens.set(token.address, token);
      });

      console.log(`📊 Loaded ${tokens.length} tokens from Jupiter`);
    } catch (error) {
      console.warn("⚠️ Failed to fetch Jupiter token list:", error);
    }
  }

  async fetchSolanaTokens() {
    try {
      console.log("📡 Fetching Solana token registry...");
      const response = await fetch('https://raw.githubusercontent.com/solana-labs/token-list/main/src/tokens/solana.tokenlist.json');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const tokens = data.tokens || [];

      tokens.forEach(token => {
        this.solanaTokens.set(token.address, token);
      });

      console.log(`📊 Loaded ${tokens.length} tokens from Solana Registry`);
    } catch (error) {
      console.warn("⚠️ Failed to fetch Solana token list:", error);
    }
  }

  async getTokenMetadata(mintAddress) {
    await this.initialize();

    // Check cache first
    if (this.cache.has(mintAddress)) {
      return this.cache.get(mintAddress);
    }

    let metadata;

    // Try Jupiter first (most comprehensive)
    const jupiterToken = this.jupiterTokens.get(mintAddress);
    if (jupiterToken) {
      metadata = {
        address: mintAddress,
        symbol: jupiterToken.symbol,
        name: jupiterToken.name,
        decimals: jupiterToken.decimals,
        logoURI: jupiterToken.logoURI,
        tags: jupiterToken.tags || [],
        verified: true,
        source: 'jupiter'
      };
    } else {
      // Try Solana registry
      const solanaToken = this.solanaTokens.get(mintAddress);
      if (solanaToken) {
        metadata = {
          address: mintAddress,
          symbol: solanaToken.symbol,
          name: solanaToken.name,
          decimals: solanaToken.decimals,
          logoURI: solanaToken.logoURI,
          tags: solanaToken.tags || [],
          verified: true,
          source: 'solana-registry'
        };
      } else {
        // For unknown tokens, try to fetch from additional sources
        console.log(`🔍 Attempting additional token resolution for ${mintAddress}...`);

        // Try a direct API call to get fresh data (in case registries are outdated)
        try {
          // This could be expanded to include more token APIs like CoinGecko, etc.
          metadata = await this.tryAlternativeTokenSources(mintAddress);
        } catch (error) {
          console.warn(`⚠️ Alternative sources failed for ${mintAddress}`);
        }

        // If still no metadata, generate fallback
        if (!metadata) {
          metadata = this.generateFallbackMetadata(mintAddress);
        }
      }
    }

    // Cache the result (even fallbacks, to avoid repeated lookups)
    this.cache.set(mintAddress, metadata);
    return metadata;
  }

  // Try alternative token data sources
  async tryAlternativeTokenSources(mintAddress) {
    // Could expand this to include:
    // - Token program queries
    // - Additional token registries
    // - On-chain metadata parsing
    // - Community token lists

    // For now, return null to use fallback
    return null;
  }

  generateFallbackMetadata(mintAddress) {
    // Use full address as symbol instead of shortened version
    console.log(`⚠️ No metadata found for ${mintAddress} - using full address as symbol`);

    return {
      address: mintAddress,
      symbol: mintAddress, // Use full address as symbol
      name: `Unknown Token (${mintAddress})`,
      decimals: 6, // Default for most Solana tokens
      tags: ['unregistered'],
      verified: false,
      source: 'fallback'
    };
  }

  async getMultipleTokenMetadata(mintAddresses) {
    await this.initialize();

    const results = new Map();

    for (const address of mintAddresses) {
      try {
        const metadata = await this.getTokenMetadata(address);
        results.set(address, metadata);
      } catch (error) {
        console.warn(`Failed to get metadata for ${address}:`, error);
        results.set(address, this.generateFallbackMetadata(address));
      }
    }

    return results;
  }

  // Save token metadata to file for use by frontend
  saveTokenRegistry(filename = 'public/token-registry.json') {
    const registryData = {
      generated_at: new Date().toISOString(),
      jupiter_tokens: this.jupiterTokens.size,
      solana_tokens: this.solanaTokens.size,
      tokens: Object.fromEntries(this.cache)
    };

    fs.writeFileSync(filename, JSON.stringify(registryData, null, 2));
    console.log(`💾 Saved token registry to ${filename} (${this.cache.size} tokens)`);
  }
}

// Export singleton instance
export const tokenMetadataService = new TokenMetadataService();