// Token registry to map contract addresses to proper symbols and metadata

interface TokenInfo {
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
  coingeckoId?: string;
}

// Known token registry - commonly used tokens on Solana/Saros
export const KNOWN_TOKENS: Record<string, TokenInfo> = {
  // USDC
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v": {
    symbol: "USDC",
    name: "USD Coin",
    decimals: 6,
    coingeckoId: "usd-coin"
  },

  // USDT
  "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB": {
    symbol: "USDT",
    name: "Tether",
    decimals: 6,
    coingeckoId: "tether"
  },

  // PYUSD
  "2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo": {
    symbol: "PYUSD",
    name: "PayPal USD",
    decimals: 6,
    coingeckoId: "paypal-usd"
  },

  // SOL (Wrapped)
  "So11111111111111111111111111111111111111112": {
    symbol: "SOL",
    name: "Solana",
    decimals: 9,
    coingeckoId: "solana"
  },

  // SAROS
  "SARoSWNg4ja7djdmzk9eD5GFuaJCR6jf9hCBWHc3GfE": {
    symbol: "SAROS",
    name: "Saros Finance",
    decimals: 6
  },

  // JUP
  "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN": {
    symbol: "JUP",
    name: "Jupiter",
    decimals: 6,
    coingeckoId: "jupiter-exchange-solana"
  },

  // BONK
  "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263": {
    symbol: "BONK",
    name: "Bonk",
    decimals: 5,
    coingeckoId: "bonk"
  },

  // WIF
  "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm": {
    symbol: "WIF",
    name: "dogwifhat",
    decimals: 6,
    coingeckoId: "dogwifcoin"
  },

  // RAY
  "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R": {
    symbol: "RAY",
    name: "Raydium",
    decimals: 6,
    coingeckoId: "raydium"
  },

  // ORCA
  "orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE": {
    symbol: "ORCA",
    name: "Orca",
    decimals: 6,
    coingeckoId: "orca"
  },

  // STEP
  "StepAscQoEioFxxWGnh2sLBDFp9d8rvKz2Yp39iDpyT": {
    symbol: "STEP",
    name: "Step Finance",
    decimals: 9,
    coingeckoId: "step-finance"
  }
};

export function getTokenInfo(mintAddress: string, fallbackSymbol?: string, fallbackName?: string, fallbackDecimals?: number): TokenInfo {
  const knownToken = KNOWN_TOKENS[mintAddress];

  if (knownToken) {
    return knownToken;
  }

  // If we have a fallback symbol and it's not a contract address, use it
  if (fallbackSymbol && !isContractAddress(fallbackSymbol)) {
    return {
      symbol: fallbackSymbol,
      name: fallbackName || fallbackSymbol,
      decimals: fallbackDecimals || 6
    };
  }

  // Generate a short symbol from the contract address
  const shortSymbol = generateShortSymbol(mintAddress);

  return {
    symbol: shortSymbol,
    name: fallbackName || `Token ${shortSymbol}`,
    decimals: fallbackDecimals || 6
  };
}

function isContractAddress(symbol: string): boolean {
  // Check if the symbol looks like a Solana contract address (base58, length 32-44)
  return symbol.length >= 32 && symbol.length <= 44 && /^[1-9A-HJ-NP-Za-km-z]+$/.test(symbol);
}

function generateShortSymbol(mintAddress: string): string {
  // Generate a short, readable symbol from the contract address
  // Take first 4 chars and last 4 chars
  return `${mintAddress.slice(0, 4)}...${mintAddress.slice(-4)}`.toUpperCase();
}

export function isStablecoin(symbol: string): boolean {
  return ['USDC', 'USDT', 'PYUSD', 'DAI', 'FRAX'].includes(symbol.toUpperCase());
}

export function getTokenDisplayName(token: TokenInfo): string {
  return `${token.symbol} - ${token.name}`;
}