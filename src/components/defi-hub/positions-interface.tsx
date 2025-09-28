"use client";

import { useState, useEffect } from "react";
import { useWallet } from '@solana/wallet-adapter-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  TrendingUp, 
  AlertCircle, 
  Loader2, 
  DollarSign, 
  Target, 
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Info,
  RefreshCw,
  Filter,
  Grid,
  List
} from "lucide-react";
import { 
  positionManagementService, 
  DetailedPosition, 
  PortfolioSummary, 
  PoolPositionGroup 
} from "@/lib/position-management-service";
import { InfoTooltip } from "@/components/ui/info-tooltip";

interface PositionsInterfaceProps {
  onNavigateToTab?: (tab: string) => void;
}

export function PositionsInterface({ onNavigateToTab }: PositionsInterfaceProps) {
  const { connected, publicKey } = useWallet();
  
  const [positions, setPositions] = useState<DetailedPosition[]>([]);
  const [positionGroups, setPositionGroups] = useState<PoolPositionGroup[]>([]);
  const [portfolioSummary, setPortfolioSummary] = useState<PortfolioSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [filterStatus, setFilterStatus] = useState<'all' | 'in-range' | 'out-of-range'>('all');
  const [sortBy, setSortBy] = useState<'value' | 'apy' | 'fees'>('value');
  const [lastUpdated, setLastUpdated] = useState<number>(0);

  // Load positions when wallet connects
  useEffect(() => {
    if (connected && publicKey) {
      loadPositions();
    } else {
      // Clear data when wallet disconnects
      setPositions([]);
      setPositionGroups([]);
      setPortfolioSummary(null);
    }
  }, [connected, publicKey]);

  const loadPositions = async () => {
    if (!publicKey || !connected) return;
    
    setIsLoading(true);
    try {
      console.log('📊 Loading portfolio positions...');
      
      // Load all positions
      const allPositions = await positionManagementService.getAllUserPositions(publicKey.toString());
      setPositions(allPositions);
      
      // Group positions by pool
      const groups = await positionManagementService.groupPositionsByPool(allPositions);
      setPositionGroups(groups);
      
      // Calculate portfolio summary
      const summary = await positionManagementService.getPortfolioSummary(allPositions);
      setPortfolioSummary(summary);
      
      setLastUpdated(Date.now());
      console.log(`✅ Loaded ${allPositions.length} positions across ${groups.length} pools`);
      
    } catch (error) {
      console.error('❌ Error loading positions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshPositions = () => {
    if (connected && publicKey) {
      loadPositions();
    }
  };

  // Filter and sort positions
  const getFilteredPositions = () => {
    let filtered = [...positions];
    
    // Apply status filter
    if (filterStatus === 'in-range') {
      filtered = filtered.filter(p => p.isInRange);
    } else if (filterStatus === 'out-of-range') {
      filtered = filtered.filter(p => !p.isInRange);
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'value':
          return parseFloat(b.totalValue) - parseFloat(a.totalValue);
        case 'apy':
          return (b.performance.apy || 0) - (a.performance.apy || 0);
        case 'fees':
          return parseFloat(b.feesEarned.totalUsd || "0") - parseFloat(a.feesEarned.totalUsd || "0");
        default:
          return 0;
      }
    });
    
    return filtered;
  };

  const formatCurrency = (value: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  };

  const formatPercentage = (value: number | undefined) => {
    if (value === undefined) return 'N/A';
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  const formatTimeAgo = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  if (!connected) {
    return (
      <div className="space-y-6">
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <TrendingUp className="h-5 w-5 text-blue-400" />
              My Positions
            </CardTitle>
            <CardDescription className="text-gray-400">
              Monitor your liquidity positions and performance across all DLMM pools
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center py-12">
            <TrendingUp className="h-16 w-16 mx-auto mb-4 text-gray-600" />
            <h3 className="text-lg font-medium text-white mb-2">Connect Your Wallet</h3>
            <p className="text-gray-400 mb-6 max-w-md mx-auto">
              Connect your wallet to view your liquidity positions, track performance, and manage your portfolio.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Portfolio Summary Cards */}
      {portfolioSummary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-400">Total Value</p>
                  <p className="text-2xl font-bold text-white">
                    {formatCurrency(portfolioSummary.totalValueUsd)}
                  </p>
                  <p className="text-xs text-green-400 flex items-center gap-1 mt-1">
                    <ArrowUpRight className="h-3 w-3" />
                    {formatPercentage(portfolioSummary.performanceData.daily.change)}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-400">Fees Earned</p>
                  <p className="text-2xl font-bold text-white">
                    {formatCurrency(portfolioSummary.totalFeesEarnedUsd)}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    ${portfolioSummary.performanceData.daily.fees} today
                  </p>
                </div>
                <Activity className="h-8 w-8 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-400">Active Positions</p>
                  <p className="text-2xl font-bold text-white">{portfolioSummary.totalPositions}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {portfolioSummary.positionsInRange} in range
                  </p>
                </div>
                <Target className="h-8 w-8 text-purple-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-400">Avg APY</p>
                  <p className="text-2xl font-bold text-white">
                    {portfolioSummary.averageApy ? formatPercentage(portfolioSummary.averageApy) : 'N/A'}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {portfolioSummary.activePools} pools
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-yellow-400" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Positions Interface */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-white">
                <TrendingUp className="h-5 w-5 text-blue-400" />
                My Positions
                {lastUpdated > 0 && (
                  <span className="text-xs text-gray-400 font-normal ml-2">
                    Updated {formatTimeAgo(lastUpdated)}
                  </span>
                )}
              </CardTitle>
              <CardDescription className="text-gray-400">
                Monitor and manage your liquidity positions across all pools
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={refreshPositions}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-400" />
                <p className="text-white font-medium">Loading your positions...</p>
                <p className="text-gray-400 text-sm">This may take a moment as we scan all pools</p>
              </div>
            </div>
          ) : positions.length === 0 ? (
            <div className="text-center py-12">
              <Target className="h-16 w-16 mx-auto mb-4 text-gray-600" />
              <h3 className="text-lg font-medium text-white mb-2">No Positions Found</h3>
              <p className="text-gray-400 mb-6 max-w-md mx-auto">
                You don't have any active liquidity positions yet. Create your first position by adding liquidity to a pool.
              </p>
              <Button 
                className="bg-purple-600 hover:bg-purple-700 text-white"
                onClick={() => onNavigateToTab?.("add-liquidity")}
              >
                Add Your First Liquidity Position
              </Button>
            </div>
          ) : (
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-3 bg-gray-900 border border-gray-800">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="positions">All Positions</TabsTrigger>
                <TabsTrigger value="pools">By Pool</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6 mt-6">
                {/* Performance Overview */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <Card className="bg-gray-700">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-gray-300">24H Performance</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-400">Fees</span>
                          <span className="text-sm text-white">
                            {portfolioSummary ? formatCurrency(portfolioSummary.performanceData.daily.fees) : '$0'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-400">Volume</span>
                          <span className="text-sm text-white">
                            {portfolioSummary ? formatCurrency(portfolioSummary.performanceData.daily.volume) : '$0'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-400">Change</span>
                          <span className={`text-sm ${portfolioSummary && portfolioSummary.performanceData.daily.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {portfolioSummary ? formatPercentage(portfolioSummary.performanceData.daily.change) : '0%'}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gray-700">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-gray-300">7D Performance</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-400">Fees</span>
                          <span className="text-sm text-white">
                            {portfolioSummary ? formatCurrency(portfolioSummary.performanceData.weekly.fees) : '$0'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-400">Volume</span>
                          <span className="text-sm text-white">
                            {portfolioSummary ? formatCurrency(portfolioSummary.performanceData.weekly.volume) : '$0'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-400">Change</span>
                          <span className={`text-sm ${portfolioSummary && portfolioSummary.performanceData.weekly.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {portfolioSummary ? formatPercentage(portfolioSummary.performanceData.weekly.change) : '0%'}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gray-700">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-gray-300">30D Performance</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-400">Fees</span>
                          <span className="text-sm text-white">
                            {portfolioSummary ? formatCurrency(portfolioSummary.performanceData.monthly.fees) : '$0'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-400">Volume</span>
                          <span className="text-sm text-white">
                            {portfolioSummary ? formatCurrency(portfolioSummary.performanceData.monthly.volume) : '$0'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-400">Change</span>
                          <span className={`text-sm ${portfolioSummary && portfolioSummary.performanceData.monthly.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {portfolioSummary ? formatPercentage(portfolioSummary.performanceData.monthly.change) : '0%'}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Top Performing Positions */}
                <Card className="bg-gray-700">
                  <CardHeader>
                    <CardTitle className="text-white">Top Performing Positions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {getFilteredPositions().slice(0, 5).map((position, index) => (
                        <div key={position.positionMint} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                              {index + 1}
                            </div>
                            <div>
                              <p className="text-white font-medium">{position.tokenX.symbol}/{position.tokenY.symbol}</p>
                              <p className="text-xs text-gray-400">
                                Bins {position.lowerBinId} - {position.upperBinId}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-white font-medium">{formatCurrency(position.totalValue)}</p>
                            <p className="text-xs text-green-400">
                              {formatPercentage(position.performance.apy)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="positions" className="space-y-4 mt-6">
                {/* Filters and Controls */}
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Filter className="h-4 w-4 text-gray-400" />
                      <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value as any)}
                        className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white text-sm focus:border-blue-500 focus:outline-none"
                      >
                        <option value="all">All Positions</option>
                        <option value="in-range">In Range</option>
                        <option value="out-of-range">Out of Range</option>
                      </select>
                    </div>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white text-sm focus:border-blue-500 focus:outline-none"
                    >
                      <option value="value">Sort by Value</option>
                      <option value="apy">Sort by APY</option>
                      <option value="fees">Sort by Fees</option>
                    </select>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant={viewMode === 'list' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setViewMode('list')}
                    >
                      <List className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={viewMode === 'grid' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setViewMode('grid')}
                    >
                      <Grid className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Positions List */}
                <div className={viewMode === 'grid' ? 'grid grid-cols-1 lg:grid-cols-2 gap-4' : 'space-y-4'}>
                  {getFilteredPositions().map((position) => (
                    <Card key={position.positionMint} className="bg-gray-700 border-gray-600">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h3 className="text-white font-medium">
                              {position.tokenX.symbol}/{position.tokenY.symbol}
                            </h3>
                            <p className="text-xs text-gray-400">
                              Pool: {position.poolAddress.slice(0, 8)}...{position.poolAddress.slice(-4)}
                            </p>
                          </div>
                          <div className={`px-2 py-1 rounded text-xs font-medium ${
                            position.isInRange 
                              ? 'bg-green-500/20 text-green-400' 
                              : 'bg-red-500/20 text-red-400'
                          }`}>
                            {position.isInRange ? 'In Range' : 'Out of Range'}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs text-gray-400">Total Value</p>
                            <p className="text-white font-medium">{formatCurrency(position.totalValue)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400">APY</p>
                            <p className="text-white font-medium">
                              {formatPercentage(position.performance.apy)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400">Fees Earned</p>
                            <p className="text-white font-medium">
                              {formatCurrency(position.feesEarned.totalUsd || "0")}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400">Range</p>
                            <p className="text-white font-medium">
                              {position.lowerBinId} - {position.upperBinId}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 pt-4 border-t border-gray-600">
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-400">Utilization</span>
                            <span className="text-white">{(position.utilizationRate * 100).toFixed(1)}%</span>
                          </div>
                          <div className="w-full bg-gray-600 rounded-full h-2 mt-1">
                            <div 
                              className="bg-blue-500 h-2 rounded-full" 
                              style={{ width: `${position.utilizationRate * 100}%` }}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="pools" className="space-y-4 mt-6">
                {positionGroups.map((group) => (
                  <Card key={group.poolAddress} className="bg-gray-700 border-gray-600">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-white">
                            {group.tokenX.symbol}/{group.tokenY.symbol}
                          </CardTitle>
                          <CardDescription className="text-gray-400">
                            {group.positionCount} position{group.positionCount > 1 ? 's' : ''} • 
                            Pool: {group.poolAddress.slice(0, 8)}...{group.poolAddress.slice(-4)}
                          </CardDescription>
                        </div>
                        <div className="text-right">
                          <p className="text-white font-medium">{formatCurrency(group.combinedValue)}</p>
                          <p className="text-xs text-gray-400">
                            {formatCurrency(group.combinedFees)} fees earned
                          </p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {group.positions.map((position) => (
                          <div key={position.positionMint} className="p-4 bg-gray-800 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs text-gray-400">
                                Bins {position.lowerBinId}-{position.upperBinId}
                              </span>
                              <span className={`text-xs px-2 py-1 rounded ${
                                position.isInRange 
                                  ? 'bg-green-500/20 text-green-400' 
                                  : 'bg-red-500/20 text-red-400'
                              }`}>
                                {position.isInRange ? 'In Range' : 'Out of Range'}
                              </span>
                            </div>
                            <p className="text-white font-medium">{formatCurrency(position.totalValue)}</p>
                            <p className="text-xs text-gray-400">
                              {formatPercentage(position.performance.apy)} APY
                            </p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
}