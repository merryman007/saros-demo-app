"use client";

import { useState, useEffect, useMemo } from "react";
import { useWallet } from '@solana/wallet-adapter-react';
import { Pool } from "@/lib/pools";
import { TokenSelector } from "./token-selector";
import { SwapPreview } from "./swap-preview";
import { getTokenInfo } from "@/lib/token-registry";
import { walletBalanceService } from "@/lib/wallet-balance-service";
import { ArrowUpDown, Settings, Info } from "lucide-react";

interface SwapInterfaceProps {
  pools: Pool[];
}

interface Token {
  symbol: string;
  name: string;
  mintAddress: string;
  decimals: number;
  logoURI?: string;
}

interface SwapState {
  fromToken: Token | null;
  toToken: Token | null;
  fromAmount: string;
  toAmount: string;
  selectedPool: Pool | null;
  slippage: number;
  swapType: 'exactInput' | 'exactOutput';
  isReversed: boolean;
}

export function SwapInterface({ pools }: SwapInterfaceProps) {
  const { connected, publicKey, signTransaction } = useWallet();

  const [swapState, setSwapState] = useState<SwapState>({
    fromToken: null,
    toToken: null,
    fromAmount: '',
    toAmount: '',
    selectedPool: null,
    slippage: 0.5,
    swapType: 'exactInput',
    isReversed: false,
  });

  const [showSettings, setShowSettings] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [tokenBalances, setTokenBalances] = useState<Record<string, number>>({});
  const [loadingBalances, setLoadingBalances] = useState(false);

  // Extract unique tokens from all pools with proper symbol mapping
  const availableTokens = useMemo(() => {
    const tokenSet = new Map<string, Token>();

    pools.forEach(pool => {
      // Add tokenX with proper symbol mapping
      const tokenXInfo = getTokenInfo(
        pool.tokenX.mintAddress,
        pool.tokenX.symbol,
        pool.tokenX.name,
        pool.tokenX.decimals
      );
      tokenSet.set(pool.tokenX.mintAddress, {
        symbol: tokenXInfo.symbol,
        name: tokenXInfo.name,
        mintAddress: pool.tokenX.mintAddress,
        decimals: tokenXInfo.decimals,
        logoURI: tokenXInfo.logoURI,
      });

      // Add tokenY with proper symbol mapping
      const tokenYInfo = getTokenInfo(
        pool.tokenY.mintAddress,
        pool.tokenY.symbol,
        pool.tokenY.name,
        pool.tokenY.decimals
      );
      tokenSet.set(pool.tokenY.mintAddress, {
        symbol: tokenYInfo.symbol,
        name: tokenYInfo.name,
        mintAddress: pool.tokenY.mintAddress,
        decimals: tokenYInfo.decimals,
        logoURI: tokenYInfo.logoURI,
      });
    });

    // Sort tokens: stablecoins first, then alphabetically
    return Array.from(tokenSet.values()).sort((a, b) => {
      const stablecoins = ['USDC', 'USDT', 'PYUSD'];
      const aIsStable = stablecoins.includes(a.symbol);
      const bIsStable = stablecoins.includes(b.symbol);

      if (aIsStable && !bIsStable) return -1;
      if (!aIsStable && bIsStable) return 1;
      return a.symbol.localeCompare(b.symbol);
    });
  }, [pools]);

  // Find available pools for selected token pair
  const availablePools = useMemo(() => {
    if (!swapState.fromToken || !swapState.toToken) return [];

    return pools.filter(pool => {
      const hasTokenPair =
        (pool.tokenX.mintAddress === swapState.fromToken!.mintAddress &&
         pool.tokenY.mintAddress === swapState.toToken!.mintAddress) ||
        (pool.tokenX.mintAddress === swapState.toToken!.mintAddress &&
         pool.tokenY.mintAddress === swapState.fromToken!.mintAddress);

      return hasTokenPair && pool.isActive;
    }).sort((a, b) => b.tvl - a.tvl); // Sort by TVL (best pools first)
  }, [swapState.fromToken, swapState.toToken, pools]);

  // Auto-select best pool when tokens change
  useEffect(() => {
    if (availablePools.length > 0) {
      setSwapState(prev => ({ ...prev, selectedPool: availablePools[0] }));
    } else {
      setSwapState(prev => ({ ...prev, selectedPool: null }));
    }
  }, [availablePools]);

  // Load wallet balances only for selected tokens to avoid rate limits
  useEffect(() => {
    const loadBalances = async () => {
      if (!connected || !publicKey) {
        setTokenBalances({});
        return;
      }

      // Only load balances for currently selected tokens
      const tokensToLoad = [];
      if (swapState.fromToken) {
        tokensToLoad.push({
          mintAddress: swapState.fromToken.mintAddress,
          decimals: swapState.fromToken.decimals,
        });
      }
      if (swapState.toToken) {
        tokensToLoad.push({
          mintAddress: swapState.toToken.mintAddress,
          decimals: swapState.toToken.decimals,
        });
      }

      if (tokensToLoad.length === 0) {
        setTokenBalances({});
        return;
      }

      setLoadingBalances(true);
      try {
        const balances = await walletBalanceService.getMultipleTokenBalances(
          publicKey.toString(),
          tokensToLoad
        );

        const balanceMap: Record<string, number> = {};
        Object.values(balances).forEach(balance => {
          balanceMap[balance.mintAddress] = balance.uiAmount;
        });

        setTokenBalances(prev => ({
          ...prev,
          ...balanceMap
        }));
      } catch (error) {
        console.error("Error loading wallet balances:", error);
      } finally {
        setLoadingBalances(false);
      }
    };

    loadBalances();
  }, [connected, publicKey, swapState.fromToken, swapState.toToken]);

  // Simple estimated output calculation (no API calls to avoid rate limits)
  useEffect(() => {
    const calculateOutput = () => {
      if (
        swapState.fromAmount &&
        swapState.selectedPool &&
        swapState.fromToken &&
        swapState.toToken &&
        swapState.swapType === 'exactInput'
      ) {
        const fromAmountNum = parseFloat(swapState.fromAmount);
        if (!isNaN(fromAmountNum) && fromAmountNum > 0) {
          // Simple estimation based on fee rate to avoid API calls during typing
          const feeRate = swapState.selectedPool.feeRate || 0.003;
          const estimatedOutput = fromAmountNum * (1 - feeRate);
          setSwapState(prev => ({ ...prev, toAmount: estimatedOutput.toFixed(6) }));
        } else {
          setSwapState(prev => ({ ...prev, toAmount: '' }));
        }
      } else {
        setSwapState(prev => ({ ...prev, toAmount: '' }));
      }
    };

    calculateOutput();
  }, [swapState.fromAmount, swapState.selectedPool, swapState.fromToken, swapState.toToken, swapState.swapType, swapState.slippage]);

  const handleTokenSelect = (type: 'from' | 'to', token: Token) => {
    setSwapState(prev => {
      const newState = { ...prev };

      if (type === 'from') {
        newState.fromToken = token;
        // If selecting same token as 'to', swap them
        if (prev.toToken && token.mintAddress === prev.toToken.mintAddress) {
          newState.toToken = prev.fromToken;
        }
      } else {
        newState.toToken = token;
        // If selecting same token as 'from', swap them
        if (prev.fromToken && token.mintAddress === prev.fromToken.mintAddress) {
          newState.fromToken = prev.toToken;
        }
      }

      return newState;
    });
  };

  const handleReverseTokens = () => {
    setSwapState(prev => ({
      ...prev,
      fromToken: prev.toToken,
      toToken: prev.fromToken,
      fromAmount: prev.toAmount,
      toAmount: prev.fromAmount,
      isReversed: !prev.isReversed,
    }));
  };

  const handleAmountChange = (type: 'from' | 'to', value: string) => {
    // Only allow valid number input
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setSwapState(prev => ({
        ...prev,
        [type === 'from' ? 'fromAmount' : 'toAmount']: value,
        swapType: type === 'from' ? 'exactInput' : 'exactOutput',
      }));
    }
  };

  const handleSwap = async () => {
    if (!swapState.fromToken || !swapState.toToken || !swapState.selectedPool || !swapState.fromAmount) {
      return;
    }

    if (!connected || !publicKey || !signTransaction) {
      alert('Please connect your wallet first to perform swaps.');
      return;
    }

    // Check if user has sufficient balance
    const fromAmount = parseFloat(swapState.fromAmount);
    const userBalance = tokenBalances[swapState.fromToken.mintAddress] || 0;
    
    if (fromAmount > userBalance) {
      alert(`Insufficient balance. You have ${userBalance.toFixed(6)} ${swapState.fromToken.symbol} but trying to swap ${fromAmount}`);
      return;
    }

    // For SOL, ensure user keeps enough for transaction fees
    if (swapState.fromToken.mintAddress === "So11111111111111111111111111111111111111112" && 
        fromAmount > (userBalance - 0.01)) {
      alert('Please leave at least 0.01 SOL for transaction fees.');
      return;
    }

    setIsLoading(true);
    try {
      console.log('🚀 Initiating swap with real DLMM SDK...');

      const { swapService } = await import('@/lib/swap-service');

      // Get swap quote first
      console.log('📊 Getting swap quote...');
      const quote = await swapService.getSwapQuote({
        fromToken: {
          mintAddress: swapState.fromToken.mintAddress,
          decimals: swapState.fromToken.decimals,
        },
        toToken: {
          mintAddress: swapState.toToken.mintAddress,
          decimals: swapState.toToken.decimals,
        },
        amount: swapState.fromAmount,
        isExactInput: swapState.swapType === 'exactInput',
        pool: swapState.selectedPool,
        slippage: swapState.slippage,
      });

      console.log('💰 Quote received:', quote);

      // Prepare swap transaction
      console.log('🔧 Preparing swap transaction...');
      const transaction = await swapService.prepareSwapTransaction({
        fromToken: {
          mintAddress: swapState.fromToken.mintAddress,
          decimals: swapState.fromToken.decimals,
        },
        toToken: {
          mintAddress: swapState.toToken.mintAddress,
          decimals: swapState.toToken.decimals,
        },
        amount: swapState.fromAmount,
        isExactInput: swapState.swapType === 'exactInput',
        pool: swapState.selectedPool,
        slippage: swapState.slippage,
        walletPublicKey: publicKey.toString(),
      });

      // Sign and execute with wallet
      console.log('✍️ Signing and executing swap...');
      const signature = await swapService.executeSwap(transaction, signTransaction);

      console.log('✅ Swap successful! Signature:', signature);
      alert(`🎉 Swap completed successfully!\n\nTransaction: ${signature}\n\nYou can view it on Solana Explorer.`);

      // Reset amounts after successful swap
      setSwapState(prev => ({
        ...prev,
        fromAmount: '',
        toAmount: '',
      }));

    } catch (error) {
      console.error('❌ Swap failed:', error);

      let errorMessage = 'Unknown error occurred';
      if (error instanceof Error) {
        errorMessage = error.message;
      }

      alert(`❌ Swap failed: ${errorMessage}\n\nPlease check your wallet connection and try again.`);
    } finally {
      setIsLoading(false);
    }
  };

  const canSwap = connected &&
                  swapState.fromToken &&
                  swapState.toToken &&
                  swapState.selectedPool &&
                  swapState.fromAmount &&
                  parseFloat(swapState.fromAmount) > 0;

  return (
    <div className="space-y-6">
      {/* Swap Card */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-white">Swap</h2>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
          >
            <Settings className="h-5 w-5" />
          </button>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="mb-6 p-4 bg-gray-800 rounded-lg border border-gray-700">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Slippage Tolerance
              </label>
              <div className="flex gap-2">
                {[0.1, 0.5, 1.0].map((value) => (
                  <button
                    key={value}
                    onClick={() => setSwapState(prev => ({ ...prev, slippage: value }))}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      swapState.slippage === value
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {value}%
                  </button>
                ))}
                <input
                  type="number"
                  value={swapState.slippage}
                  onChange={(e) => setSwapState(prev => ({ ...prev, slippage: parseFloat(e.target.value) || 0 }))}
                  className="w-20 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm"
                  step="0.1"
                  min="0"
                  max="50"
                />
              </div>
            </div>
          </div>
        )}

        {/* From Token */}
        <div className="space-y-4">
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-400 text-sm">From</span>
              <span className="text-gray-400 text-sm">
                Balance: {
                  loadingBalances ? "..." : 
                  swapState.fromToken 
                    ? (tokenBalances[swapState.fromToken.mintAddress] || 0).toFixed(6)
                    : "0.00"
                }
              </span>
            </div>
            <div className="flex items-center gap-4">
              <TokenSelector
                selectedToken={swapState.fromToken}
                availableTokens={availableTokens}
                onSelect={(token) => handleTokenSelect('from', token)}
                placeholder="Select token"
              />
              <div className="flex-1 flex items-center gap-2">
                <input
                  type="text"
                  value={swapState.fromAmount}
                  onChange={(e) => handleAmountChange('from', e.target.value)}
                  placeholder="0.0"
                  className="flex-1 bg-transparent text-right text-white text-xl font-semibold placeholder-gray-500 outline-none"
                />
                {swapState.fromToken && tokenBalances[swapState.fromToken.mintAddress] > 0 && (
                  <button
                    onClick={() => {
                      const maxBalance = tokenBalances[swapState.fromToken!.mintAddress];
                      // Leave a small amount for fees if it's SOL
                      const maxAmount = swapState.fromToken!.mintAddress === "So11111111111111111111111111111111111111112" 
                        ? Math.max(0, maxBalance - 0.01)
                        : maxBalance;
                      handleAmountChange('from', maxAmount.toString());
                    }}
                    className="px-2 py-1 bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium rounded transition-colors"
                  >
                    MAX
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Swap Direction Button */}
          <div className="flex justify-center">
            <button
              onClick={handleReverseTokens}
              className="p-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors"
              disabled={!swapState.fromToken || !swapState.toToken}
            >
              <ArrowUpDown className="h-4 w-4" />
            </button>
          </div>

          {/* To Token */}
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-400 text-sm">To</span>
              <span className="text-gray-400 text-sm">
                Balance: {
                  loadingBalances ? "..." : 
                  swapState.toToken 
                    ? (tokenBalances[swapState.toToken.mintAddress] || 0).toFixed(6)
                    : "0.00"
                }
              </span>
            </div>
            <div className="flex items-center gap-4">
              <TokenSelector
                selectedToken={swapState.toToken}
                availableTokens={availableTokens}
                onSelect={(token) => handleTokenSelect('to', token)}
                placeholder="Select token"
              />
              <input
                type="text"
                value={swapState.toAmount}
                onChange={(e) => handleAmountChange('to', e.target.value)}
                placeholder="0.0"
                className="flex-1 bg-transparent text-right text-white text-xl font-semibold placeholder-gray-500 outline-none"
                readOnly={swapState.swapType === 'exactInput'}
              />
            </div>
          </div>
        </div>

        {/* Pool Selection */}
        {availablePools.length > 0 && (
          <div className="mt-4 p-4 bg-gray-800 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Info className="h-4 w-4 text-blue-400" />
              <span className="text-sm font-medium text-gray-300">Pool Selection</span>
            </div>
            {availablePools.length === 1 ? (
              <div className="text-sm text-gray-400">
                Using pool with ${swapState.selectedPool?.tvl.toLocaleString()} TVL
              </div>
            ) : (
              <select
                value={swapState.selectedPool?.address || ''}
                onChange={(e) => {
                  const pool = availablePools.find(p => p.address === e.target.value);
                  setSwapState(prev => ({ ...prev, selectedPool: pool || null }));
                }}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm"
              >
                {availablePools.map((pool) => (
                  <option key={pool.address} value={pool.address}>
                    TVL: ${pool.tvl.toLocaleString()} | Bin Step: {pool.binStep}bp | APR: {pool.apr24h.toFixed(2)}%
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        {/* Swap Preview */}
        {canSwap && swapState.selectedPool && (
          <SwapPreview
            fromToken={swapState.fromToken!}
            toToken={swapState.toToken!}
            fromAmount={swapState.fromAmount}
            toAmount={swapState.toAmount}
            pool={swapState.selectedPool}
            slippage={swapState.slippage}
          />
        )}

        {/* Swap Button */}
        <button
          onClick={handleSwap}
          disabled={!canSwap || isLoading}
          className={`w-full mt-6 py-4 rounded-lg font-semibold text-lg transition-colors ${
            canSwap && !isLoading
              ? 'bg-purple-600 hover:bg-purple-700 text-white'
              : 'bg-gray-700 text-gray-400 cursor-not-allowed'
          }`}
        >
          {isLoading ? (
            <div className="flex items-center justify-center gap-2">
              <div className="w-5 h-5 border-2 border-purple-300 border-t-white rounded-full animate-spin" />
              Processing...
            </div>
          ) : !connected ? (
            'Connect Wallet'
          ) : !swapState.fromToken ? (
            'Select a token'
          ) : !swapState.toToken ? (
            'Select a token'
          ) : availablePools.length === 0 ? (
            'No pool available'
          ) : !swapState.fromAmount ? (
            'Enter an amount'
          ) : (
            'Swap'
          )}
        </button>

        {/* Warning for no pools */}
        {swapState.fromToken && swapState.toToken && availablePools.length === 0 && (
          <div className="mt-4 p-3 bg-yellow-900/20 border border-yellow-700/50 rounded-lg">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-yellow-400" />
              <span className="text-sm text-yellow-400">
                No active pools available for this token pair
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}