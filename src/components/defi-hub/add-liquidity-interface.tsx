"use client";

import { useState, useEffect } from "react";
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Droplets, AlertCircle, CheckCircle, Loader2, Info, Plus, Minus } from "lucide-react";
import { addLiquidityService, AddLiquidityRequest, BinLiquidityDistribution } from "@/lib/add-liquidity-service";
import { InfoTooltip } from "@/components/ui/info-tooltip";

interface FormData {
  poolAddress: string;
  amountX: string;
  amountY: string;
  binsLeft: number;
  binsRight: number;
  positionType: 'new' | 'existing';
  existingPositionMint: string;
}

export function AddLiquidityInterface() {
  const { connected, publicKey, signTransaction } = useWallet();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { connection } = useConnection();
  
  const [formData, setFormData] = useState<FormData>({
    poolAddress: "",
    amountX: "",
    amountY: "",
    binsLeft: 5,
    binsRight: 5,
    positionType: 'new',
    existingPositionMint: ""
  });

  const [liquidityDistribution, setLiquidityDistribution] = useState<BinLiquidityDistribution[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [successMessage, setSuccessMessage] = useState("");

  // Generate default distribution when bins change
  useEffect(() => {
    const defaultDistribution = addLiquidityService.generateDefaultDistribution(
      formData.binsLeft, 
      formData.binsRight
    );
    setLiquidityDistribution(defaultDistribution);
  }, [formData.binsLeft, formData.binsRight]);

  const handleInputChange = (field: keyof FormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setValidationErrors([]);
    setSuccessMessage("");
  };

  const validateAndAddLiquidity = async () => {
    if (!connected || !publicKey || !signTransaction) {
      setValidationErrors(["Please connect your wallet first"]);
      return;
    }

    const request: AddLiquidityRequest = {
      poolAddress: formData.poolAddress,
      amountX: formData.amountX,
      amountY: formData.amountY,
      liquidityDistribution,
      walletPublicKey: publicKey.toString(),
      tokenXMint: "", // Would be fetched from pool info
      tokenYMint: "", // Would be fetched from pool info
      relativeBinIdLeft: -formData.binsLeft,
      relativeBinIdRight: formData.binsRight,
      existingPositionMint: formData.positionType === 'existing' ? formData.existingPositionMint : undefined
    };

    // Validate parameters
    const validation = addLiquidityService.validateAddLiquidityParameters(request);
    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      return;
    }

    setIsLoading(true);
    setValidationErrors([]);

    try {
      console.log('💧 Adding liquidity...');
      const result = await addLiquidityService.addLiquidityWithSDK(request);
      
      console.log('✅ Liquidity added successfully');
      
      setSuccessMessage(
        `Liquidity added successfully! ${result.positionMint ? `Position: ${result.positionMint}` : ''}`
      );
      
      // Reset form
      setFormData({
        poolAddress: "",
        amountX: "",
        amountY: "",
        binsLeft: 5,
        binsRight: 5,
        positionType: 'new',
        existingPositionMint: ""
      });

    } catch (error) {
      console.error('❌ Add liquidity failed:', error);
      setValidationErrors([error instanceof Error ? error.message : 'Add liquidity failed']);
    } finally {
      setIsLoading(false);
    }
  };

  const totalDistribution = liquidityDistribution.reduce(
    (sum, dist) => sum + dist.distributionX + dist.distributionY, 
    0
  );

  return (
    <div className="space-y-6">
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Droplets className="h-5 w-5 text-blue-400" />
            Add Liquidity to DLMM Pool
          </CardTitle>
          <CardDescription className="text-gray-400">
            Provide liquidity to earn trading fees from a DLMM pool
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {/* Position Type Selection */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-medium text-white">Position Type</h4>
              <InfoTooltip
                content={
                  <div className="space-y-2">
                    <p className="font-medium">Position Management</p>
                    <p><strong>New Position:</strong> Create a fresh liquidity position with custom bin range</p>
                    <p><strong>Existing Position:</strong> Add more liquidity to a position you already own</p>
                  </div>
                }
              />
            </div>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="positionType"
                  value="new"
                  checked={formData.positionType === 'new'}
                  onChange={(e) => handleInputChange('positionType', e.target.value)}
                  className="text-blue-500"
                />
                <span className="text-white">New Position</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="positionType"
                  value="existing"
                  checked={formData.positionType === 'existing'}
                  onChange={(e) => handleInputChange('positionType', e.target.value)}
                  className="text-blue-500"
                />
                <span className="text-white">Add to Existing</span>
              </label>
            </div>
          </div>

          {/* Pool Address */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-medium text-white">Pool Address</h4>
              <InfoTooltip
                content={
                  <div className="space-y-2">
                    <p className="font-medium">DLMM Pool Address</p>
                    <p>The contract address of the liquidity pool you want to add liquidity to.</p>
                    <p className="text-xs text-gray-300">
                      💡 You can find pool addresses on DEX aggregators or pool explorers
                    </p>
                  </div>
                }
              />
            </div>
            <input
              type="text"
              placeholder="e.g. 9P3N4QxjMumpTNNdvaNNskXu2t7VHMMXtePQB72kkSAk"
              value={formData.poolAddress}
              onChange={(e) => handleInputChange('poolAddress', e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Existing Position Mint (if adding to existing) */}
          {formData.positionType === 'existing' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-medium text-white">Position Mint Address</h4>
                <InfoTooltip
                  content={
                    <div className="space-y-2">
                      <p className="font-medium">Your Position NFT</p>
                      <p>The mint address of your existing liquidity position NFT.</p>
                      <p className="text-xs text-gray-300">
                        📝 Check your wallet for position NFTs from this pool
                      </p>
                    </div>
                  }
                />
              </div>
              <input
                type="text"
                placeholder="Position mint address"
                value={formData.existingPositionMint}
                onChange={(e) => handleInputChange('existingPositionMint', e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
              />
            </div>
          )}

          {/* Token Amounts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-medium text-white">Amount Token X</h4>
                <InfoTooltip
                  content={
                    <div className="space-y-2">
                      <p className="font-medium">First Token Amount</p>
                      <p>How much of the first token you want to add as liquidity.</p>
                      <p className="text-xs text-gray-300">
                        💡 Enter the amount in token units (not raw decimals)
                      </p>
                    </div>
                  }
                />
              </div>
              <input
                type="number"
                placeholder="0.0"
                value={formData.amountX}
                onChange={(e) => handleInputChange('amountX', e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                min="0"
                step="any"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-medium text-white">Amount Token Y</h4>
                <InfoTooltip
                  content={
                    <div className="space-y-2">
                      <p className="font-medium">Second Token Amount</p>
                      <p>How much of the second token you want to add as liquidity.</p>
                      <p className="text-xs text-gray-300">
                        ⚖️ The ratio should match your liquidity distribution strategy
                      </p>
                    </div>
                  }
                />
              </div>
              <input
                type="number"
                placeholder="0.0"
                value={formData.amountY}
                onChange={(e) => handleInputChange('amountY', e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                min="0"
                step="any"
              />
            </div>
          </div>

          {/* Bin Range Configuration (for new positions) */}
          {formData.positionType === 'new' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-medium text-white">Liquidity Range</h4>
                <InfoTooltip
                  content={
                    <div className="space-y-2">
                      <p className="font-medium">Price Range Configuration</p>
                      <p>Define how many bins on each side of the current price to provide liquidity.</p>
                      <p className="text-xs text-gray-300">
                        📊 More bins = wider range but more diluted liquidity
                      </p>
                    </div>
                  }
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm text-gray-300">Bins Left (Token X)</label>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleInputChange('binsLeft', Math.max(1, formData.binsLeft - 1))}
                      className="px-2"
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <input
                      type="number"
                      value={formData.binsLeft}
                      onChange={(e) => handleInputChange('binsLeft', parseInt(e.target.value) || 1)}
                      className="flex-1 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-center"
                      min="1"
                      max="20"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleInputChange('binsLeft', Math.min(20, formData.binsLeft + 1))}
                      className="px-2"
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-gray-300">Bins Right (Token Y)</label>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleInputChange('binsRight', Math.max(1, formData.binsRight - 1))}
                      className="px-2"
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <input
                      type="number"
                      value={formData.binsRight}
                      onChange={(e) => handleInputChange('binsRight', parseInt(e.target.value) || 1)}
                      className="flex-1 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-center"
                      min="1"
                      max="20"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleInputChange('binsRight', Math.min(20, formData.binsRight + 1))}
                      className="px-2"
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Liquidity Distribution Preview */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-medium text-white">Liquidity Distribution</h4>
              <InfoTooltip
                content={
                  <div className="space-y-2">
                    <p className="font-medium">How Your Liquidity is Spread</p>
                    <p>Shows how your tokens will be distributed across different price bins.</p>
                    <p className="text-xs text-gray-300">
                      📈 Negative bins use Token X, positive bins use Token Y, center bin uses both
                    </p>
                  </div>
                }
              />
            </div>
            
            <div className="bg-gray-700/50 rounded-lg p-4">
              <div className="text-xs text-gray-400 mb-2">
                Total Distribution: {totalDistribution}/10000 ({(totalDistribution/100).toFixed(1)}%)
                {totalDistribution !== 10000 && (
                  <span className="text-red-400 ml-2">⚠️ Must equal 100%</span>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                {liquidityDistribution.map((dist) => (
                  <div key={dist.relativeBinId} className="flex items-center justify-between bg-gray-800 p-2 rounded text-xs">
                    <span className="text-gray-300">
                      Bin {dist.relativeBinId >= 0 ? '+' : ''}{dist.relativeBinId}
                    </span>
                    <div className="flex gap-1">
                      <span className="text-blue-300">X:{dist.distributionX}</span>
                      <span className="text-green-300">Y:{dist.distributionY}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

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
              <p className="text-blue-200 font-medium mb-1">How DLMM Liquidity Works</p>
              <p className="text-blue-300/80">
                Your liquidity is distributed across price bins. When trades happen in those price ranges, 
                you earn fees. Bins to the left use Token X, bins to the right use Token Y.
              </p>
            </div>
          </div>

          {/* Add Liquidity Button */}
          <Button
            onClick={validateAndAddLiquidity}
            disabled={!connected || isLoading || totalDistribution !== 10000}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Adding Liquidity...
              </>
            ) : !connected ? (
              'Connect Wallet to Add Liquidity'
            ) : totalDistribution !== 10000 ? (
              'Fix Distribution to Continue'
            ) : (
              'Add Liquidity'
            )}
          </Button>

        </CardContent>
      </Card>
    </div>
  );
}