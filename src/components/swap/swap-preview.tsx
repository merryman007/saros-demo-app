"use client";

import { useMemo } from "react";
import { Pool } from "@/lib/pools";
import { Info, AlertTriangle } from "lucide-react";

interface Token {
  symbol: string;
  name: string;
  mintAddress: string;
  decimals: number;
}

interface SwapPreviewProps {
  fromToken: Token;
  toToken: Token;
  fromAmount: string;
  toAmount: string;
  pool: Pool;
  slippage: number;
}

export function SwapPreview({
  fromToken,
  toToken,
  fromAmount,
  toAmount,
  pool,
  slippage
}: SwapPreviewProps) {
  const calculations = useMemo(() => {
    const fromAmountNum = parseFloat(fromAmount);
    const toAmountNum = parseFloat(toAmount);

    if (isNaN(fromAmountNum) || isNaN(toAmountNum) || fromAmountNum <= 0) {
      return null;
    }

    // Calculate rates and impacts (simplified calculations)
    const rate = toAmountNum / fromAmountNum;
    const reverseRate = fromAmountNum / toAmountNum;

    // Estimate price impact (simplified - real calculation would use DLMM math)
    const poolTvlImpact = fromAmountNum / pool.tvl;
    const priceImpact = Math.min(poolTvlImpact * 100, 15); // Cap at 15%

    // Calculate minimum received with slippage
    const minReceived = toAmountNum * (1 - slippage / 100);

    // Estimate fees (simplified)
    const protocolFee = fromAmountNum * 0.0002; // 0.02%
    const lpFee = fromAmountNum * (pool.binStep / 10000); // Based on bin step

    return {
      rate,
      reverseRate,
      priceImpact,
      minReceived,
      protocolFee,
      lpFee,
      totalFees: protocolFee + lpFee,
    };
  }, [fromAmount, toAmount, pool, slippage, fromToken, toToken]);

  if (!calculations) {
    return null;
  }

  const isHighImpact = calculations.priceImpact > 5;
  const isVeryHighImpact = calculations.priceImpact > 10;

  return (
    <div className="mt-4 space-y-4">
      {/* Rate Display */}
      <div className="p-4 bg-gray-800 rounded-lg">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">Rate</span>
          <div className="text-right">
            <div className="text-white">
              1 {fromToken.symbol} = {calculations.rate.toFixed(6)} {toToken.symbol}
            </div>
            <div className="text-gray-400 text-xs">
              1 {toToken.symbol} = {calculations.reverseRate.toFixed(6)} {fromToken.symbol}
            </div>
          </div>
        </div>
      </div>

      {/* Swap Details */}
      <div className="p-4 bg-gray-800 rounded-lg space-y-3">
        <div className="flex items-center gap-2 mb-2">
          <Info className="h-4 w-4 text-blue-400" />
          <span className="text-sm font-medium text-gray-300">Swap Details</span>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Price Impact</span>
            <span className={`font-medium ${
              isVeryHighImpact ? 'text-red-400' : isHighImpact ? 'text-yellow-400' : 'text-green-400'
            }`}>
              {calculations.priceImpact < 0.01 ? '<0.01' : calculations.priceImpact.toFixed(2)}%
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-gray-400">Minimum received</span>
            <span className="text-white">
              {calculations.minReceived.toFixed(6)} {toToken.symbol}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-gray-400">Slippage tolerance</span>
            <span className="text-white">{slippage}%</span>
          </div>

          <div className="border-t border-gray-700 pt-2">
            <div className="flex justify-between">
              <span className="text-gray-400">Protocol fee</span>
              <span className="text-white">
                {calculations.protocolFee.toFixed(6)} {fromToken.symbol}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-400">LP fee</span>
              <span className="text-white">
                {calculations.lpFee.toFixed(6)} {fromToken.symbol}
              </span>
            </div>

            <div className="flex justify-between font-medium">
              <span className="text-gray-300">Total fees</span>
              <span className="text-white">
                {calculations.totalFees.toFixed(6)} {fromToken.symbol}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Pool Information */}
      <div className="p-4 bg-gray-800 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <Info className="h-4 w-4 text-blue-400" />
          <span className="text-sm font-medium text-gray-300">Pool Information</span>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-gray-400">TVL</div>
            <div className="text-white font-medium">${pool.tvl.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-gray-400">24h Volume</div>
            <div className="text-white font-medium">${pool.volume24h.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-gray-400">Bin Step</div>
            <div className="text-white font-medium">{pool.binStep}bp</div>
          </div>
          <div>
            <div className="text-gray-400">APR</div>
            <div className="text-white font-medium">{pool.apr24h.toFixed(2)}%</div>
          </div>
        </div>
      </div>

      {/* Warnings */}
      {isHighImpact && (
        <div className={`p-4 rounded-lg border ${
          isVeryHighImpact
            ? 'bg-red-900/20 border-red-700/50'
            : 'bg-yellow-900/20 border-yellow-700/50'
        }`}>
          <div className="flex items-start gap-2">
            <AlertTriangle className={`h-4 w-4 mt-0.5 ${
              isVeryHighImpact ? 'text-red-400' : 'text-yellow-400'
            }`} />
            <div className="flex-1">
              <div className={`font-medium ${
                isVeryHighImpact ? 'text-red-400' : 'text-yellow-400'
              }`}>
                {isVeryHighImpact ? 'Very High Price Impact' : 'High Price Impact'}
              </div>
              <div className={`text-sm mt-1 ${
                isVeryHighImpact ? 'text-red-300' : 'text-yellow-300'
              }`}>
                {isVeryHighImpact
                  ? 'This swap will have a very significant impact on the token price. Consider reducing the swap amount.'
                  : 'This swap will significantly impact the token price. Double-check the details before proceeding.'
                }
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Route Information */}
      <div className="p-4 bg-gray-800 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <Info className="h-4 w-4 text-blue-400" />
          <span className="text-sm font-medium text-gray-300">Route</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="bg-gray-700 px-2 py-1 rounded text-white font-medium">
            {fromToken.symbol}
          </span>
          <div className="w-4 h-px bg-gray-600" />
          <span className="text-gray-400 text-xs">
            DLMM Pool (Bin Step: {pool.binStep}bp)
          </span>
          <div className="w-4 h-px bg-gray-600" />
          <span className="bg-gray-700 px-2 py-1 rounded text-white font-medium">
            {toToken.symbol}
          </span>
        </div>
      </div>
    </div>
  );
}