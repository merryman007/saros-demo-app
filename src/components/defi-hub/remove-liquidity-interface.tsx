"use client";

import { useState, useEffect } from "react";
import { useWallet } from '@solana/wallet-adapter-react';
import { useConnection } from '@solana/wallet-adapter-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Minus, AlertCircle, CheckCircle, Loader2, Info, Trash2, Percent } from "lucide-react";
import { removeLiquidityService, UserPosition, RemoveLiquidityRequest, RemoveLiquidityType } from "@/lib/remove-liquidity-service";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { Token } from "@/lib/token-service";

interface FormData {
  poolAddress: string;
  selectedPositions: string[]; // position mint addresses
  binRangeStart: number;
  binRangeEnd: number;
  removeType: RemoveLiquidityType;
  removeMode: 'partial' | 'complete';
}

export function RemoveLiquidityInterface() {
  const { connected, publicKey, signAllTransactions } = useWallet();
  const { connection } = useConnection();
  
  const [formData, setFormData] = useState<FormData>({
    poolAddress: "",
    selectedPositions: [],
    binRangeStart: 0,
    binRangeEnd: 0,
    removeType: RemoveLiquidityType.Both,
    removeMode: 'complete'
  });

  const [userPositions, setUserPositions] = useState<UserPosition[]>([]);
  const [filteredPositions, setFilteredPositions] = useState<UserPosition[]>([]);
  const [poolTokens, setPoolTokens] = useState<{ tokenX?: Token, tokenY?: Token }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingPositions, setIsLoadingPositions] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [successMessage, setSuccessMessage] = useState("");
  const [estimatedAmounts, setEstimatedAmounts] = useState<{ x: string, y: string }>({ x: "0", y: "0" });

  // Load user positions when pool address and wallet are available
  useEffect(() => {
    const loadPositions = async () => {
      if (formData.poolAddress && publicKey && connected) {
        setIsLoadingPositions(true);
        try {
          const positions = await removeLiquidityService.getUserPositions(
            publicKey.toString(),
            formData.poolAddress
          );
          setUserPositions(positions);
          setValidationErrors([]);
        } catch (error) {
          console.error('Error loading positions:', error);
          setValidationErrors([`Failed to load positions: ${error instanceof Error ? error.message : 'Unknown error'}`]);
          setUserPositions([]);
        }
        setIsLoadingPositions(false);
      } else {
        setUserPositions([]);
      }
    };

    const timeoutId = setTimeout(loadPositions, 500); // Debounce
    return () => clearTimeout(timeoutId);
  }, [formData.poolAddress, publicKey, connected]);

  // Filter positions based on selected bin range for partial removal
  useEffect(() => {
    if (formData.removeMode === 'partial' && userPositions.length > 0) {
      const filtered = userPositions.filter(pos => {
        return !(pos.upperBinId < formData.binRangeStart || pos.lowerBinId > formData.binRangeEnd);
      });
      setFilteredPositions(filtered);
    } else {
      setFilteredPositions(userPositions);
    }
  }, [userPositions, formData.binRangeStart, formData.binRangeEnd, formData.removeMode]);

  // Calculate estimated removal amounts
  useEffect(() => {
    if (formData.selectedPositions.length > 0) {
      const selectedPosData = userPositions.filter(pos => 
        formData.selectedPositions.includes(pos.positionMint)
      );
      
      const binRange: [number, number] = formData.removeMode === 'partial' 
        ? [formData.binRangeStart, formData.binRangeEnd]
        : [Math.min(...selectedPosData.map(p => p.lowerBinId)), Math.max(...selectedPosData.map(p => p.upperBinId))];
      
      const estimated = removeLiquidityService.calculateEstimatedRemoval(
        selectedPosData,
        binRange,
        formData.removeType
      );
      setEstimatedAmounts({ x: estimated.estimatedX, y: estimated.estimatedY });
    } else {
      setEstimatedAmounts({ x: "0", y: "0" });
    }
  }, [formData.selectedPositions, formData.removeType, formData.removeMode, formData.binRangeStart, formData.binRangeEnd, userPositions]);

  const handleInputChange = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setValidationErrors([]);
    setSuccessMessage("");
  };

  const handlePositionToggle = (positionMint: string) => {
    setFormData(prev => ({
      ...prev,
      selectedPositions: prev.selectedPositions.includes(positionMint)
        ? prev.selectedPositions.filter(p => p !== positionMint)
        : [...prev.selectedPositions, positionMint]
    }));
  };

  const handleSelectAll = () => {
    setFormData(prev => ({
      ...prev,
      selectedPositions: prev.selectedPositions.length === filteredPositions.length
        ? []
        : filteredPositions.map(p => p.positionMint)
    }));
  };

  const validateAndRemoveLiquidity = async () => {
    if (!connected || !publicKey || !signAllTransactions) {
      setValidationErrors(["Please connect your wallet first"]);
      return;
    }

    if (formData.selectedPositions.length === 0) {
      setValidationErrors(["Please select at least one position to remove liquidity from"]);
      return;
    }

    const selectedPosData = userPositions.filter(pos => 
      formData.selectedPositions.includes(pos.positionMint)
    );

    const request: RemoveLiquidityRequest = {
      poolAddress: formData.poolAddress,
      positions: selectedPosData,
      binRange: formData.removeMode === 'partial' 
        ? [formData.binRangeStart, formData.binRangeEnd]
        : [Math.min(...selectedPosData.map(p => p.lowerBinId)), Math.max(...selectedPosData.map(p => p.upperBinId))],
      removeType: formData.removeType,
      walletPublicKey: publicKey.toString(),
      tokenXMint: poolTokens.tokenX?.address || "",
      tokenYMint: poolTokens.tokenY?.address || "",
    };

    // Validate parameters
    const validation = removeLiquidityService.validateRemoveParameters(request);
    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      return;
    }

    setIsLoading(true);
    setValidationErrors([]);

    try {
      console.log('🗑️ Removing liquidity...');
      
      let result;
      if (formData.removeMode === 'complete') {
        result = await removeLiquidityService.removeAllLiquidityFromPositions(
          formData.poolAddress,
          formData.selectedPositions,
          formData.removeType,
          publicKey.toString(),
          poolTokens.tokenX?.address || "",
          poolTokens.tokenY?.address || ""
        );
      } else {
        result = await removeLiquidityService.removeLiquidityFromRange(request);
      }
      
      console.log('✅ Remove liquidity transactions ready');
      
      if (result.transactions.length === 0) {
        setValidationErrors(["No transactions were generated. Please check your positions."]);
        return;
      }

      // Sign all transactions
      const signedTransactions = await signAllTransactions(result.transactions);
      
      console.log('📝 Transactions signed, sending to network...');
      
      const signatures: string[] = [];
      
      // Send transactions in sequence
      for (let i = 0; i < signedTransactions.length; i++) {
        const signedTx = signedTransactions[i];
        console.log(`📡 Sending transaction ${i + 1}/${signedTransactions.length}...`);
        
        const signature = await connection.sendRawTransaction(signedTx.serialize(), {
          skipPreflight: false,
          preflightCommitment: "confirmed",
        });
        
        signatures.push(signature);
        console.log(`✅ Transaction ${i + 1} sent: ${signature}`);
        
        // Wait for confirmation before sending next transaction
        await connection.confirmTransaction(signature, 'confirmed');
        console.log(`✅ Transaction ${i + 1} confirmed`);
      }
      
      console.log('✅ All transactions confirmed!');
      
      setSuccessMessage(
        `Liquidity removed successfully! ${signatures.length} transaction(s) completed. Latest: ${signatures[signatures.length - 1]}`
      );
      
      // Reset form and reload positions
      setFormData({
        poolAddress: formData.poolAddress, // Keep pool address
        selectedPositions: [],
        binRangeStart: 0,
        binRangeEnd: 0,
        removeType: RemoveLiquidityType.Both,
        removeMode: 'complete'
      });
      
      // Reload positions to reflect changes
      if (formData.poolAddress && publicKey) {
        const updatedPositions = await removeLiquidityService.getUserPositions(
          publicKey.toString(),
          formData.poolAddress
        );
        setUserPositions(updatedPositions);
      }

    } catch (error) {
      console.error('❌ Remove liquidity failed:', error);
      
      let errorMessage = 'Remove liquidity failed';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      setValidationErrors([errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const removeTypeOptions = removeLiquidityService.getRemoveTypeOptions();

  return (
    <div className="space-y-6">
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Minus className="h-5 w-5 text-red-400" />
            Remove Liquidity
          </CardTitle>
          <CardDescription className="text-gray-400">
            Withdraw your liquidity from DLMM pools and claim earned fees
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">

          {/* Pool Address */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-medium text-white">Pool Address</h4>
              <InfoTooltip
                content={
                  <div className="space-y-2">
                    <p className="font-medium">DLMM Pool Address</p>
                    <p>Enter the address of the pool where you have liquidity positions.</p>
                    <p className="text-xs text-gray-300">
                      💡 You can find pool addresses in the "My Positions" tab or from when you added liquidity
                    </p>
                  </div>
                }
              />
            </div>
            <input
              type="text"
              placeholder="Enter pool address (e.g. 9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin)"
              value={formData.poolAddress}
              onChange={(e) => handleInputChange('poolAddress', e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:border-red-500 focus:outline-none"
            />
          </div>

          {/* Loading Positions */}
          {isLoadingPositions && (
            <div className="flex items-center gap-2 text-yellow-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Loading your positions...</span>
            </div>
          )}

          {/* Positions Found */}
          {userPositions.length > 0 && !isLoadingPositions && (
            <>
              {/* Remove Mode Selection */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-medium text-white">Removal Mode</h4>
                  <InfoTooltip
                    content={
                      <div className="space-y-2">
                        <p className="font-medium">How to Remove Liquidity</p>
                        <p><strong>Complete Removal:</strong> Remove all liquidity from selected positions</p>
                        <p><strong>Partial Removal:</strong> Remove liquidity only within a specific bin range</p>
                      </div>
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => handleInputChange('removeMode', 'complete')}
                    className={`p-3 rounded-lg border text-left transition-colors ${
                      formData.removeMode === 'complete'
                        ? 'border-red-500 bg-red-500/10 text-red-200'
                        : 'border-gray-600 bg-gray-700 text-gray-300 hover:border-gray-500'
                    }`}
                  >
                    <div className="font-medium">Complete Removal</div>
                    <div className="text-xs text-gray-400">Remove all liquidity from positions</div>
                  </button>
                  <button
                    onClick={() => handleInputChange('removeMode', 'partial')}
                    className={`p-3 rounded-lg border text-left transition-colors ${
                      formData.removeMode === 'partial'
                        ? 'border-red-500 bg-red-500/10 text-red-200'
                        : 'border-gray-600 bg-gray-700 text-gray-300 hover:border-gray-500'
                    }`}
                  >
                    <div className="font-medium">Partial Removal</div>
                    <div className="text-xs text-gray-400">Remove liquidity from specific bin range</div>
                  </button>
                </div>
              </div>

              {/* Bin Range for Partial Removal */}
              {formData.removeMode === 'partial' && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-medium text-white">Bin Range</h4>
                    <InfoTooltip
                      content={
                        <div className="space-y-2">
                          <p className="font-medium">Bin Range for Partial Removal</p>
                          <p>Specify which bin IDs you want to remove liquidity from. Only positions overlapping with this range will be affected.</p>
                        </div>
                      }
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">Start Bin ID</label>
                      <input
                        type="number"
                        placeholder="Start bin"
                        value={formData.binRangeStart}
                        onChange={(e) => handleInputChange('binRangeStart', parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:border-red-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">End Bin ID</label>
                      <input
                        type="number"
                        placeholder="End bin"
                        value={formData.binRangeEnd}
                        onChange={(e) => handleInputChange('binRangeEnd', parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:border-red-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Remove Type Selection */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-medium text-white">What to Remove</h4>
                  <InfoTooltip
                    content={
                      <div className="space-y-2">
                        <p className="font-medium">Token Removal Options</p>
                        <p><strong>Both Tokens:</strong> Remove both tokens from your positions</p>
                        <p><strong>Token X Only:</strong> Remove only the first token, keep the second</p>
                        <p><strong>Token Y Only:</strong> Remove only the second token, keep the first</p>
                      </div>
                    }
                  />
                </div>
                <select
                  value={formData.removeType}
                  onChange={(e) => handleInputChange('removeType', parseInt(e.target.value))}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:border-red-500 focus:outline-none"
                >
                  {removeTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-400">
                  💡 Choose "Both Tokens" for complete withdrawal, or select specific tokens for rebalancing
                </p>
              </div>

              {/* Position Selection */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-medium text-white">Select Positions</h4>
                    <InfoTooltip
                      content={
                        <div className="space-y-2">
                          <p className="font-medium">Your Liquidity Positions</p>
                          <p>Select which positions you want to remove liquidity from. Each position represents a range of bins where you've provided liquidity.</p>
                        </div>
                      }
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAll}
                    className="text-xs"
                  >
                    {formData.selectedPositions.length === filteredPositions.length ? 'Deselect All' : 'Select All'}
                  </Button>
                </div>

                {filteredPositions.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <Info className="h-8 w-8 mx-auto mb-3" />
                    <p>No positions found in the specified range</p>
                    {formData.removeMode === 'partial' && (
                      <p className="text-xs mt-1">Try adjusting your bin range or switch to complete removal</p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {filteredPositions.map((position) => (
                      <div
                        key={position.positionMint}
                        className={`p-3 border rounded-lg transition-colors cursor-pointer ${
                          formData.selectedPositions.includes(position.positionMint)
                            ? 'border-red-500 bg-red-500/10'
                            : 'border-gray-600 bg-gray-700 hover:border-gray-500'
                        }`}
                        onClick={() => handlePositionToggle(position.positionMint)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-white text-sm">
                              Bins {position.lowerBinId} - {position.upperBinId}
                            </div>
                            <div className="text-xs text-gray-400">
                              Position: {position.positionMint.slice(0, 8)}...{position.positionMint.slice(-4)}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-gray-400">
                              Token X: {parseFloat(position.totalLiquidityX).toFixed(6)}
                            </div>
                            <div className="text-xs text-gray-400">
                              Token Y: {parseFloat(position.totalLiquidityY).toFixed(6)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Estimated Removal Amounts */}
              {formData.selectedPositions.length > 0 && (
                <div className="p-4 bg-gray-700 rounded-lg">
                  <h5 className="font-medium text-white mb-3 flex items-center gap-2">
                    <Percent className="h-4 w-4" />
                    Estimated Removal
                  </h5>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-gray-400">Token X Amount</div>
                      <div className="font-mono text-white">{parseFloat(estimatedAmounts.x).toFixed(6)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400">Token Y Amount</div>
                      <div className="font-mono text-white">{parseFloat(estimatedAmounts.y).toFixed(6)}</div>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    💡 These are estimates. Actual amounts may vary based on pool state and fees.
                  </p>
                </div>
              )}
            </>
          )}

          {/* No Positions Message */}
          {!isLoadingPositions && userPositions.length === 0 && formData.poolAddress && connected && (
            <div className="text-center py-8 text-gray-400">
              <Trash2 className="h-8 w-8 mx-auto mb-3" />
              <p>No liquidity positions found in this pool</p>
              <p className="text-xs mt-1">Make sure you've provided liquidity to this pool before</p>
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
              <p className="text-blue-200 font-medium mb-1">How Liquidity Removal Works</p>
              <p className="text-blue-300/80">
                When you remove liquidity, you'll receive your deposited tokens plus any earned trading fees. 
                You can choose to remove specific tokens or your entire position.
              </p>
            </div>
          </div>

          {/* Remove Liquidity Button */}
          <Button
            onClick={validateAndRemoveLiquidity}
            disabled={!connected || isLoading || formData.selectedPositions.length === 0}
            className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Removing Liquidity...
              </>
            ) : !connected ? (
              'Connect Wallet to Remove Liquidity'
            ) : formData.selectedPositions.length === 0 ? (
              'Select Positions to Remove'
            ) : (
              `Remove Liquidity from ${formData.selectedPositions.length} Position${formData.selectedPositions.length > 1 ? 's' : ''}`
            )}
          </Button>

        </CardContent>
      </Card>
    </div>
  );
}