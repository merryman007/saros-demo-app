// Token metadata mapping based on common Solana tokens
export const TOKEN_METADATA: Record<string, { name: string; symbol: string }> = {
  // SOL
  "So11111111111111111111111111111111111111112": {
    name: "Solana",
    symbol: "SOL"
  },

  // USDC
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v": {
    name: "USD Coin",
    symbol: "USDC"
  },

  // USDT
  "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB": {
    name: "Tether USD",
    symbol: "USDT"
  },

  // SAROS
  "SarosY6Vscao718M4A778z4CGtvcwcGef5M9MEH1LGL": {
    name: "Saros",
    symbol: "SAROS"
  },

  // C98
  "C98A4nkJXhpVZNAZdHUA95RpTF3T4whtQubL3YobiUX9": {
    name: "Coin98",
    symbol: "C98"
  },

  // RAY
  "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R": {
    name: "Raydium",
    symbol: "RAY"
  },

  // JUP
  "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN": {
    name: "Jupiter",
    symbol: "JUP"
  },

  // ORCA
  "orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE": {
    name: "Orca",
    symbol: "ORCA"
  },

  // WBTC
  "3NZ9JMVBmGAqocybic2c7LQCJScmgsAZ6vQqTDzcqmJh": {
    name: "Wrapped Bitcoin",
    symbol: "WBTC"
  },

  // META
  "METAewgxyPbgwsseH8T16a39CQ5VyVxZi9zXiDPY18m": {
    name: "Metaplex",
    symbol: "META"
  },

  // USD1
  "USD1ttGY1N17NEEHLmELoaybftRBUSErhqYiQzvEmuB": {
    name: "USD1",
    symbol: "USD1"
  },

  // SENTR
  "SENBBKVCM7homnf5RX9zqpf1GFe935hnbU4uVzY1Y6M": {
    name: "Sentre",
    symbol: "SNTR"
  },

  // DEBUT
  "DEBUTr2WcEsjkwKhqbRLqnuFKstX1MrEuvaz5xcoQTgn": {
    name: "Debut",
    symbol: "DEBUT"
  },

  // DEZU
  "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263": {
    name: "Dezu",
    symbol: "DEZU"
  },

  // LAYER
  "LAYER4xPpTCb3QL8S9u41EAhAX7mhBn8Q6xMTwY2Yzc": {
    name: "Layer",
    symbol: "LAYER"
  },

  // jtoSOL
  "J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn": {
    name: "Jito Staked SOL",
    symbol: "jtoSOL"
  },

  // PUMP
  "pumpCmXqMfrsAkQ5r49WcJnRayYRqmXz6ae8H7H9Dfn": {
    name: "Pump",
    symbol: "PUMP"
  }
};

export function getTokenInfo(mintAddress: string): { name: string; symbol: string } {
  const metadata = TOKEN_METADATA[mintAddress];
  if (metadata) {
    return metadata;
  }

  // Fallback: create readable names from mint address
  const shortAddress = `${mintAddress.slice(0, 4)}...${mintAddress.slice(-4)}`;
  return {
    name: `Token ${shortAddress}`,
    symbol: shortAddress.toUpperCase()
  };
}

export function getPoolDisplayName(tokenX: string, tokenY: string): string {
  const tokenXInfo = getTokenInfo(tokenX);
  const tokenYInfo = getTokenInfo(tokenY);
  return `${tokenXInfo.symbol}/${tokenYInfo.symbol}`;
}