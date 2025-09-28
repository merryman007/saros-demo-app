User Position
Overview
Once liquidity has been provided, you can retrieve your positions via the Saros DLMM REST API. Two endpoints are offered:

Bin-Level Positions: Retrieves granular details for each bin in your positions.

Pool-Level Positions: Returns aggregated summaries per pool.

Fetching User Positions
After adding liquidity, you can fetch your positions using the Liquidity Book API. There are two endpoints available

1. Fetch Bin-Level Positions
This endpoint returns detailed information about each bin in your positions:

Copy
// Fetch bin-level positions
const fetchBinPositions = async (userId: string, pairId?: string) => {
  const params = new URLSearchParams({
    user_id: userId,
    page_num: "1",
    page_size: "100",
  });

  if (pairId) {
    params.append("pair_id", pairId);
  }

  const response = await fetch(`/api/bin-position?${params.toString()}`);
  if (!response.ok) {
    throw new Error("Failed to fetch bin positions");
  }

  return await response.json();
};

// Example usage
const binPositions = await fetchBinPositions(wallet.publicKey.toString());
console.log("Bin positions:", binPositions);
The response includes detailed information about each bin in your positions, including:

Bin ID

Token amounts in each bin

Liquidity shares

Price information

2. Fetch Pool-Level Positions
This endpoint aggregates your positions by pool, providing a summary of your total liquidity in each pool:

Copy
// Fetch pool-level positions
const fetchPoolPositions = async (userId: string, pairId?: string) => {
  const params = new URLSearchParams({
    user_id: userId,
    page_num: "1",
    page_size: "100",
  });

  if (pairId) {
    params.append("pair_id", pairId);
  }

  const response = await fetch(`/api/pool-position?${params.toString()}`);
  if (!response.ok) {
    throw new Error("Failed to fetch pool positions");
  }

  return await response.json();
};

// Example usage
const poolPositions = await fetchPoolPositions(wallet.publicKey.toString());
console.log("Pool positions:", poolPositions);
The response includes aggregated information about your positions in each pool, including:

Total liquidity

Total token amounts

Pool information (fees, token details)

Price information