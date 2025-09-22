import { Pool } from "./pools";

// Generate realistic historical data for analytics based on real pool data
export function generateHistoricalData(pool: Pool, timeRange: string) {
  const days = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : 90;
  const data = [];

  const now = new Date();
  // Use actual pool metrics from real DLMM data
  const baseVolume = pool.volume24h || 10000; // Fallback if no volume data
  const baseTVL = pool.tvl || 50000; // Fallback if no TVL data
  const baseAPR = pool.apr24h || 15; // Fallback APR

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);

    // Add some realistic variance
    const volumeVariance = 0.7 + Math.random() * 0.6; // 70% to 130% of base
    const tvlVariance = 0.85 + Math.random() * 0.3; // 85% to 115% of base
    const aprVariance = 0.8 + Math.random() * 0.4; // 80% to 120% of base

    // Add some trending for more recent data
    const trendFactor = 1 + (days - i) * 0.01; // Slight upward trend

    data.push({
      date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      tvl: Math.round(baseTVL * tvlVariance * trendFactor),
      volume: Math.round(baseVolume * volumeVariance),
      fees: Math.round(baseVolume * volumeVariance * 0.001), // 0.1% fee
      apr: parseFloat((baseAPR * aprVariance).toFixed(2)),
    });
  }

  return data;
}

// Generate bin distribution data for liquidity analytics using real pool characteristics
export function generateBinDistributionData(pool: Pool) {
  const bins = [];

  // Use real pool characteristics to determine price and liquidity distribution
  const poolTVL = pool.tvl || 50000;
  const binStep = pool.binStep || 10; // Use real bin step from pool

  // Estimate current price based on pool token pair (simplified)
  let currentPrice = 1; // Default
  if (pool.tokenY.symbol === "USDC" || pool.tokenY.symbol === "USDT" || pool.tokenY.symbol === "PYUSD") {
    // Quote is USD stablecoin
    if (pool.tokenX.symbol === "SOL") currentPrice = 150; // SOL price
    else if (pool.tokenX.symbol === "JUP") currentPrice = 1.2;
    else if (pool.tokenX.symbol === "SAROS") currentPrice = 0.05;
    else currentPrice = 10; // Generic token price
  }

  for (let i = -10; i <= 10; i++) {
    // Use real bin step for price calculations
    const priceMultiplier = Math.pow(1 + binStep/10000, i); // Bin step based price
    const price = currentPrice * priceMultiplier;

    // Generate liquidity distribution (more liquidity near current price)
    const distanceFromCurrent = Math.abs(i);
    const liquidityFactor = Math.exp(-distanceFromCurrent * 0.3);
    const baseLiquidity = poolTVL * 0.05; // 5% of TVL per bin on average

    bins.push({
      binId: 8388608 + i, // Use DLMM standard center bin ID
      price: parseFloat(price.toFixed(6)),
      reserveXAmount: Math.round(baseLiquidity * liquidityFactor * (0.8 + Math.random() * 0.4)),
      reserveYAmount: Math.round(baseLiquidity * liquidityFactor * (0.8 + Math.random() * 0.4)),
      totalLiquidity: Math.round(baseLiquidity * liquidityFactor * 2),
      totalSupply: (baseLiquidity * liquidityFactor * 1000).toString(),
      isActive: i === 0, // Only current price bin is active
      utilization: Math.min(100, liquidityFactor * 100 + Math.random() * 20),
      poolMetadata: {
        tokenX: pool.tokenX,
        tokenY: pool.tokenY,
        binStep: binStep,
        poolAddress: pool.address,
      },
    });
  }

  return bins;
}

// Generate trading activity patterns for market analytics
export function generateTradingPatterns(pools: Pool[], timeRange: string) {
  const points = timeRange === "24h" ? 24 : timeRange === "7d" ? 7 : 30;
  const data = [];

  for (let i = 0; i < points; i++) {
    const time = new Date();

    if (timeRange === "24h") {
      time.setHours(time.getHours() - (points - i - 1));
    } else {
      time.setDate(time.getDate() - (points - i - 1));
    }

    // Simulate trading patterns with more controlled variance
    let activityMultiplier = 1;

    if (timeRange === "24h") {
      const hour = time.getHours();
      // Higher activity during US/EU trading hours
      if ((hour >= 8 && hour <= 12) || (hour >= 14 && hour <= 18)) {
        activityMultiplier = 1.3;
      } else if (hour >= 0 && hour <= 6) {
        activityMultiplier = 0.7; // Lower activity during night
      }
    }

    const totalVolume = pools.reduce((sum, pool) => sum + pool.volume24h, 0);
    const baseVolume = timeRange === "24h" ? totalVolume / 24 : totalVolume;
    const volumeVariance = 0.8 + Math.random() * 0.4; // Reduced variance for cleaner chart

    data.push({
      time: timeRange === "24h"
        ? time.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
        : time.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      volume: Math.round(baseVolume * volumeVariance * activityMultiplier),
      trades: Math.round(40 + (20 * volumeVariance * activityMultiplier)), // More stable trade count
      avgSize: Math.round((baseVolume * volumeVariance * activityMultiplier) / (40 + (20 * volumeVariance * activityMultiplier))),
    });
  }

  return data;
}

// Generate token price trends
export function generateTokenPriceTrends(pools: Pool[], timeRange: string) {
  const days = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : 90;
  const data = [];

  const now = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);

    // Generate price data for top pools
    const entry: Record<string, string | number> = {
      date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    };

    pools.slice(0, 5).forEach((pool, index) => {
      const basePrice = 1 + index * 0.1; // Different base prices
      const variance = 0.9 + Math.random() * 0.2; // 90% to 110%
      const trend = 1 + (days - i) * 0.005; // Slight trend

      entry[`${pool.tokenX.symbol}_${pool.tokenY.symbol}`] = parseFloat((basePrice * variance * trend).toFixed(4));
    });

    data.push(entry);
  }

  return data;
}

// Generate fee analytics data
export function generateFeeAnalytics(pools: Pool[], timeRange: string) {
  const periods = timeRange === "24h" ? 24 : timeRange === "7d" ? 7 : 30;
  const data = [];

  for (let i = periods - 1; i >= 0; i--) {
    const date = new Date();
    if (timeRange === "24h") {
      date.setHours(date.getHours() - i);
    } else {
      date.setDate(date.getDate() - i);
    }

    const totalFees = pools.reduce((sum, pool) => sum + pool.fees24h, 0) / periods;
    const variance = 0.7 + Math.random() * 0.6;

    data.push({
      period: timeRange === "24h"
        ? date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
        : date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      totalFees: Math.round(totalFees * variance),
      avgFeeRate: parseFloat((0.001 + Math.random() * 0.002).toFixed(4)), // 0.1% to 0.3%
      feesPerPool: Math.round(totalFees * variance / pools.length),
    });
  }

  return data;
}