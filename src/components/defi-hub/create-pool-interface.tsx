"use client";

import { useState, useEffect } from "react";
import { useWallet } from '@solana/wallet-adapter-react';
import { useConnection } from '@solana/wallet-adapter-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap, AlertCircle, CheckCircle, Loader2, Info } from "lucide-react";
import { createPoolService, CreatePoolRequest } from "@/lib/create-pool-service";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { TokenSelector } from "@/components/ui/token-selector";
import { Token } from "@/lib/token-service";

interface FormData {
  tokenXAddress: string;
  tokenXDecimals: number;
  tokenYAddress: string;
  tokenYDecimals: number;
  binStep: number;
  activeId: number;
}

interface SelectedTokens {
  tokenX?: Token;
  tokenY?: Token;
}

export function CreatePoolInterface() {
  const { connected, publicKey, signTransaction } = useWallet();
  const { connection } = useConnection();
  const [formData, setFormData] = useState<FormData>({
    tokenXAddress: "",
    tokenXDecimals: 9,
    tokenYAddress: "",
    tokenYDecimals: 6,
    binStep: 1, // Smallest fee tier (0.01%)
    activeId: 8388608, // Center bin (2^23)
  });

  const [selectedTokens, setSelectedTokens] = useState<SelectedTokens>({});

  const [binStepConfigs, setBinStepConfigs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [poolExists, setPoolExists] = useState(false);
  const [checkingPool, setCheckingPool] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    // Load bin step configurations
    const configs = createPoolService.getBinStepConfigs();
    setBinStepConfigs(configs);
  }, []);

  useEffect(() => {
    // Check if pool exists when form data changes
    const checkPool = async () => {
      if (formData.tokenXAddress && formData.tokenYAddress && formData.binStep) {
        setCheckingPool(true);
        try {
          const exists = await createPoolService.checkPoolExists(
            formData.tokenXAddress,
            formData.tokenYAddress,
            formData.binStep
          );
          setPoolExists(exists);
        } catch (error) {
          console.error('Error checking pool:', error);
        }
        setCheckingPool(false);
      }
    };

    const timeoutId = setTimeout(checkPool, 500); // Debounce
    return () => clearTimeout(timeoutId);
  }, [formData.tokenXAddress, formData.tokenYAddress, formData.binStep]);

  const handleInputChange = (field: keyof FormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setValidationErrors([]);
    setSuccessMessage("");
  };

  const handleTokenXSelect = (token: Token) => {
    setSelectedTokens(prev => ({ ...prev, tokenX: token }));
    setFormData(prev => ({
      ...prev,
      tokenXAddress: token.address,
      tokenXDecimals: token.decimals,
    }));
    setValidationErrors([]);
    setSuccessMessage("");
  };

  const handleTokenYSelect = (token: Token) => {
    setSelectedTokens(prev => ({ ...prev, tokenY: token }));
    setFormData(prev => ({
      ...prev,
      tokenYAddress: token.address,
      tokenYDecimals: token.decimals,
    }));
    setValidationErrors([]);
    setSuccessMessage("");
  };

  const validateAndCreatePool = async () => {
    if (!connected || !publicKey || !signTransaction) {
      setValidationErrors(["Please connect your wallet first"]);
      return;
    }

    const request: CreatePoolRequest = {
      tokenX: {
        mintAddress: formData.tokenXAddress,
        decimals: formData.tokenXDecimals,
      },
      tokenY: {
        mintAddress: formData.tokenYAddress,
        decimals: formData.tokenYDecimals,
      },
      binStep: formData.binStep,
      activeId: formData.activeId,
      walletPublicKey: publicKey.toString(),
    };

    // Validate parameters
    const validation = createPoolService.validatePoolParameters(request);
    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      return;
    }

    if (poolExists) {
      setValidationErrors(["A pool with these parameters already exists"]);
      return;
    }

    setIsLoading(true);
    setValidationErrors([]);

    try {
      console.log('🚀 Creating pool...');
      const result = await createPoolService.createPoolWithSDK(request);
      
      console.log('✅ Pool creation transaction ready');
      
      // Sign and send transaction
      const signedTransaction = await signTransaction(result.transaction);
      
      console.log('📝 Transaction signed, sending to network...');
      
      // Send the signed transaction to the network
      const signature = await connection.sendRawTransaction(signedTransaction.serialize());
      
      console.log('📡 Transaction sent, signature:', signature);
      
      // Wait for confirmation
      await connection.confirmTransaction(signature, 'confirmed');
      
      console.log('✅ Transaction confirmed!');
      
      setSuccessMessage(
        `Pool created successfully! Pair address: ${result.pairAddress}, Transaction: ${signature}`
      );
      
      // Reset form
      setFormData({
        tokenXAddress: "",
        tokenXDecimals: 9,
        tokenYAddress: "",
        tokenYDecimals: 6,
        binStep: 1, // Smallest fee tier (0.01%)
        activeId: 8388608,
      });
      setSelectedTokens({});

    } catch (error) {
      console.error('❌ Pool creation failed:', error);
      
      // Handle specific error cases
      let errorMessage = 'Pool creation failed';
      if (error instanceof Error) {
        if (error.message.includes('already in use')) {
          errorMessage = 'This pool already exists. Please use different tokens or bin step.';
        } else if (error.message.includes('custom program error: 0x0')) {
          errorMessage = 'Pool creation failed: Account already exists. Try different token pair or bin step.';
        } else {
          errorMessage = error.message;
        }
      }
      
      setValidationErrors([errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Zap className="h-5 w-5 text-purple-400" />
            Create New DLMM Pool
          </CardTitle>
          <CardDescription className="text-gray-400">
            Create a new Dynamic Liquidity Market Maker pool for any token pair
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {/* First Token Configuration */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-medium text-white">First Token (Token A)</h4>
              <InfoTooltip
                content={
                  <div className="space-y-2">
                    <p className="font-medium">First Token in Your Pool</p>
                    <p>This is one of the two tokens people will be able to trade. 
                    For example, if creating a SOL/USDC pool, you could choose SOL as your first token.</p>
                    <p className="text-xs text-gray-300">
                      💡 Search by ticker (SOL, USDC) or paste contract address
                    </p>
                  </div>
                }
              />
            </div>
            <TokenSelector
              selectedToken={selectedTokens.tokenX}
              onTokenSelect={handleTokenXSelect}
              placeholder="Search for token (e.g. SOL, USDC) or paste address"
            />
            {selectedTokens.tokenX && (
              <div className="text-xs text-gray-400 space-y-1">
                <p><strong>Address:</strong> {selectedTokens.tokenX.address}</p>
                <p><strong>Decimals:</strong> {selectedTokens.tokenX.decimals} 
                  {!selectedTokens.tokenX.verified && (
                    <span className="text-yellow-400 ml-1">(Verify this is correct for your token)</span>
                  )}
                </p>
              </div>
            )}
          </div>

          {/* Second Token Configuration */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-medium text-white">Second Token (Token B)</h4>
              <InfoTooltip
                content={
                  <div className="space-y-2">
                    <p className="font-medium">Second Token in Your Pool</p>
                    <p>The other token in your trading pair. This is often the "quote" token that others are priced against.</p>
                    <p className="text-xs text-gray-300">
                      💡 Popular quote tokens: USDC, SOL, USDT
                    </p>
                  </div>
                }
              />
            </div>
            <TokenSelector
              selectedToken={selectedTokens.tokenY}
              onTokenSelect={handleTokenYSelect}
              placeholder="Search for token (e.g. USDC, USDT) or paste address"
            />
            {selectedTokens.tokenY && (
              <div className="text-xs text-gray-400 space-y-1">
                <p><strong>Address:</strong> {selectedTokens.tokenY.address}</p>
                <p><strong>Decimals:</strong> {selectedTokens.tokenY.decimals}
                  {!selectedTokens.tokenY.verified && (
                    <span className="text-yellow-400 ml-1">(Verify this is correct for your token)</span>
                  )}
                </p>
              </div>
            )}
          </div>

          {/* Trading Fee Configuration */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-medium text-white">Trading Fee Tier</h4>
              <InfoTooltip
                content={
                  <div className="space-y-2">
                    <p className="font-medium">Trading Fee Structure</p>
                    <p>How much fee traders pay when using your pool. Lower fees = more trading volume. Higher fees = more revenue per trade.</p>
                    <div className="text-xs space-y-1">
                      <p>• <strong>0.10%</strong> - Ultra-low fee (stable pairs)</p>
                      <p>• <strong>0.20%</strong> - Low fee (major pairs)</p>
                      <p>• <strong>0.50%</strong> - Medium fee (most tokens)</p>
                      <p>• <strong>1.00%</strong> - High fee (volatile/new tokens)</p>
                    </div>
                  </div>
                }
              />
            </div>
            <select
              value={formData.binStep}
              onChange={(e) => handleInputChange('binStep', parseInt(e.target.value))}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:border-purple-500 focus:outline-none"
            >
              {binStepConfigs.map((config) => (
                <option key={config.binStep} value={config.binStep}>
                  {config.description}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-400">
              💡 Most pools use 0.20% or 0.50% fees. Choose based on your token volatility.
            </p>
          </div>

          {/* Starting Price Configuration */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-medium text-white">Starting Price</h4>
              <InfoTooltip
                content={
                  <div className="space-y-2">
                    <p className="font-medium">Initial Pool Price</p>
                    <p>This sets the starting exchange rate between your two tokens when the pool is created.</p>
                    <div className="text-xs space-y-1">
                      <p>• <strong>8388608</strong> - Standard starting point (1:1 ratio)</p>
                      <p>• Higher numbers = Token A costs more Token B</p>
                      <p>• Lower numbers = Token A costs less Token B</p>
                    </div>
                    <p className="text-xs text-yellow-200">💡 You can usually keep the default unless you know the exact market price</p>
                  </div>
                }
              />
            </div>
            <input
              type="number"
              placeholder="8388608 (recommended default)"
              value={formData.activeId}
              onChange={(e) => handleInputChange('activeId', parseInt(e.target.value) || 8388608)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none"
              min="0"
              max="16777215"
            />
            <p className="text-xs text-gray-400">
              ⚡ Tip: Use 8388608 for most new pools - this represents a balanced starting point
            </p>
          </div>

          {/* Pool Status Check */}
          {checkingPool && (
            <div className="flex items-center gap-2 text-yellow-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Checking if pool exists...</span>
            </div>
          )}

          {poolExists && !checkingPool && (
            <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
              <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="text-red-200 font-medium">Pool Already Exists</p>
                <p className="text-red-300/80">
                  A pool with these tokens and bin step already exists.
                </p>
              </div>
            </div>
          )}

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
              <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="text-red-200 font-medium mb-1">Validation Errors</p>
                <ul className="space-y-1">
                  {validationErrors.map((error, index) => (
                    <li key={index} className="text-red-300/80">• {error}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Success Message */}
          {successMessage && (
            <div className="flex items-start gap-3 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="text-green-200 font-medium mb-1">Success!</p>
                <p className="text-green-300/80">{successMessage}</p>
              </div>
            </div>
          )}

          {/* Info Box */}
          <div className="flex items-start gap-3 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <Info className="h-5 w-5 text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="text-blue-200 font-medium mb-1">How Pool Creation Works</p>
              <p className="text-blue-300/80">
                When you create a pool, you're setting up a new market where people can trade your two tokens. 
                The pool will earn fees from every trade, which get distributed to liquidity providers.
              </p>
            </div>
          </div>

          {/* Create Pool Button */}
          <Button
            onClick={validateAndCreatePool}
            disabled={!connected || isLoading || poolExists}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Pool...
              </>
            ) : !connected ? (
              'Connect Wallet to Create Pool'
            ) : poolExists ? (
              'Pool Already Exists'
            ) : (
              'Create Pool'
            )}
          </Button>

        </CardContent>
      </Card>
    </div>
  );
}