# DLMM Analytics Dashboard

Production analytics dashboard for Saros Finance DLMM (Dynamic Liquidity Market Maker) pools, built with Next.js and TypeScript.

## 🎯 What's New

**Enhanced Token Resolution System** - Automatically resolves contract addresses to real token symbols (e.g., `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v` → `USDC`)

**Smart Data Fetching** - Only fetches and resolves tokens that actually exist in DLMM pools (not the entire Solana ecosystem)

**Improved Rate Limiting** - Exponential backoff (1s → 2s → 4s → 8s) for reliable API calls

## Features

**Pool Performance Analytics**
- Real-time TVL trends and historical data
- Volume and fee tracking across time periods
- APR analysis and yield projections
- Pool comparison and ranking metrics

**Liquidity Distribution Analytics**
- Bin utilization efficiency visualization
- Liquidity concentration analysis
- Price impact assessment with cumulative depth
- Detailed bin-level performance tables

**Market Analytics**
- Token price trends across multiple pairs
- Trading activity patterns (24h/7d/30d views)
- Fee generation analytics with rate tracking
- Market share analysis by pool

## Tech Stack

- **Framework**: Next.js 15 with TypeScript
- **Styling**: Tailwind CSS 4
- **Charts**: Recharts with custom configurations
- **UI Components**: Radix UI primitives
- **SDK**: Saros Finance DLMM SDK integration
- **State Management**: React hooks with caching

## Implementation Choices

**Enhanced DLMM Data Integration**
- **Smart Token Discovery**: Scans pools to find unique token addresses, then resolves only those
- **Multi-Source Token Resolution**: Priority tokens → Solana Token Registry → Fallback generation
- **Real Pool Data**: Live reserves, trading fees, and token metadata from Helius RPC
- **Rate-Limited Fetching**: Exponential backoff with 800ms delays to respect API limits
- **Comprehensive Analytics**: Enhanced pools database with token metadata and analytics

**Chart Design**
- Dual Y-axis charts for volume/trades correlation
- Responsive containers with proper margin handling
- Color-coded axes and interactive tooltips
- Gradient fills and dashed lines for visual clarity

**Component Structure**
- Tabbed interface for feature organization
- Reusable chart configurations with TypeScript types
- Error boundaries and loading states
- Mobile-responsive grid layouts

**Performance Optimizations**
- Cached API responses with timestamp validation
- Reduced data point generation for smoother charts
- Controlled variance algorithms for stable visualizations
- Lazy loading and code splitting ready

## Getting Started

```bash
# Install dependencies
npm install

# Fetch enhanced DLMM pool data with smart token resolution
npm run fetch_pools

# Fetch detailed bin data for liquidity distribution analytics (optional)
npm run fetch_bins

# Start development server
npm run dev

# Build for production
npm run build

# Run linting
npm run lint
```

Open [http://localhost:3000](http://localhost:3000) and navigate to the Analytics tab.

## 🚀 Enhanced Data Fetching System

### Quick Start
```bash
npm run fetch_pools  # Enhanced fetcher with token resolution
```

### What the Enhanced Fetcher Does

**Phase 1: Smart Token Discovery**
- Samples 30 pools to discover unique token addresses
- Finds ~20-40 unique tokens (instead of loading 20,000+ tokens)
- Rate-limited scanning with 800ms delays between requests

**Phase 2: Targeted Token Resolution**
```
Priority Tokens (SOL, USDC, SAROS) → Solana Token Registry → Smart Fallbacks
```

**Phase 3: Comprehensive Pool Processing**
- Processes all pools with enhanced token metadata
- Generates detailed analytics with real token symbols
- Creates multiple output formats for different use cases

### Output Files Generated
- `public/enhanced_pools.json` - Complete database with token registry
- `public/pools_analytics.jsonl` - Detailed pool records (one per line)
- `public/pools_summary.txt` - Human-readable summary report

### Bin Data Files (Optional)
- `public/bins_data.json` - Real DLMM bin liquidity data for selected pools
- `public/bins_summary.txt` - Bin data summary report

### Rate Limiting & Performance
- **Exponential Backoff**: 1s → 2s → 4s → 8s retry delays
- **Batch Processing**: 2 pools per batch, 5s delays between batches
- **Smart Sampling**: Only processes tokens found in actual pools
- **API-Friendly**: Respects Helius RPC rate limits

## 📊 Real Bin Data Fetching

### Enhanced Liquidity Analytics
For the most accurate liquidity distribution charts, run the optional bin data fetcher:

```bash
npm run fetch_bins        # Fetch top 10 pools (default)
npm run fetch_bins 20     # Fetch top 20 pools by TVL
```

### What the Bin Fetcher Does
**Real DLMM Bin Analysis**
- Fetches actual bin liquidity states from active pools
- Gets real reserve amounts (tokenX/tokenY) for each bin
- Determines active/inactive bin status based on current trading
- Calculates precise price ranges using bin step mathematics
- Processes top pools by TVL for maximum impact

**Smart Fallback System**
```
Real Bin Data (if available) → Simulated Data (enhanced) → Basic Analytics
```

### Output Structure
```json
{
  "metadata": {
    "fetchedAt": "2025-09-26T10:30:00.000Z",
    "poolCount": 10
  },
  "pools": [{
    "poolAddress": "...",
    "tokenPair": "SOL/USDC",
    "activeBinId": 8388608,
    "bins": [{
      "binId": 8388588,
      "price": 147.23,
      "reserveXAmount": 1234.56,
      "reserveYAmount": 182047.89,
      "totalLiquidity": 183282.45,
      "isActive": true
    }]
  }]
}
```

### Performance Considerations
- **1 pool per batch** with 3s delays (more intensive than pool fetching)
- **Retry logic**: Same exponential backoff as pool fetcher
- **Selective processing**: Only active pools with >$1k TVL
- **Rate limit friendly**: Designed for long-running background jobs

## 🔧 Developer Guide

### Adding New Tokens
Priority tokens are hardcoded in `fetch_pools.js` for reliability:
```javascript
const PRIORITY_TOKENS = {
  "So11111111111111111111111111111111111111112": {
    symbol: "SOL", name: "Solana", decimals: 9
  },
  // Add your tokens here
};
```

### Understanding Token Resolution
```javascript
// Before: Contract addresses everywhere
"EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/So11111111111111111111111111111111111111112"

// After: Clean token symbols
"USDC/SOL"
```

### Customizing Rate Limits
Edit constants in `fetch_pools.js`:
```javascript
const BATCH_SIZE = 2;                 // Pools per batch
const DELAY_BETWEEN_BATCH_MS = 5000;  // 5s between batches
const RETRY_BASE_DELAY_MS = 1000;     // 1s → 2s → 4s → 8s
```

### Debugging Data Issues
```bash
# Check what tokens were discovered
cat public/pools_summary.txt

# Examine detailed pool data
head public/pools_analytics.jsonl | jq '.'

# View token resolution stats
npm run fetch_pools | grep "Token sources"
```

## 📁 Key Files

### Data Fetching & Processing
- `fetch_pools.js` - **Enhanced fetcher with smart token resolution**
- `fetch_bins.js` - **Real DLMM bin data fetcher for liquidity analytics**
- `src/lib/pools.ts` - Pool data management with enhanced/real pool fallbacks
- `src/lib/enhanced-pool-adapter.ts` - Processes enhanced pool database
- `src/lib/real-pool-adapter.ts` - Fallback adapter for basic pool data
- `src/lib/bin-data-adapter.ts` - Real bin data loader with fallback to simulated data
- `src/lib/token-metadata.ts` - Static token metadata definitions

### Frontend Components
- `src/components/analytics/` - Main analytics components
- `src/lib/analytics-data.ts` - Analytics algorithms using real pool characteristics
- `src/lib/dlmm.ts` - DLMM SDK integration and bin data management

## 🏗️ Enhanced Architecture

### New Data Flow
```
1. Pool Discovery → Finds all DLMM pool addresses via SDK

2. Token Discovery → Samples pools to find unique token addresses
   ├── Scans 30 pools with rate limiting
   └── Discovers ~20-40 unique tokens

3. Token Resolution → Resolves addresses to symbols/names
   ├── Priority tokens (hardcoded)
   ├── Solana Token Registry (external API)
   └── Smart fallbacks (address truncation)

4. Pool Processing → Processes all pools with resolved tokens
   ├── Enhanced metadata with token info
   ├── Real TVL, volume, APR calculations
   └── Comprehensive analytics generation

5. Multi-Format Output
   ├── enhanced_pools.json (structured database)
   ├── pools_analytics.jsonl (detailed records)
   └── pools_summary.txt (human-readable)
```

### Frontend Integration
```javascript
// src/lib/pools.ts - Enhanced data loading
fetchAllPools() → loadEnhancedPools() → loadRealPools() → fallback

// Components get clean data
{
  name: "SOL/USDC",           // Instead of contract addresses
  tokenX: { symbol: "SOL" },  // Resolved token info
  tokenY: { symbol: "USDC" }, // With decimals, names, etc.
  tvl: 1234567.89            // Real calculated TVL
}
```

### Rate Limiting Strategy
- **Discovery Phase**: 800ms delays, sample 30 pools
- **Processing Phase**: 2 pools per batch, 5s between batches
- **Retry Logic**: Exponential backoff 1s → 2s → 4s → 8s
- **API Respect**: Built for Helius RPC rate limits

Production-ready analytics platform for the Saros Finance DLMM ecosystem with intelligent token resolution and rate-limited data fetching.

## 🚧 Future Improvements

### Real-Time Data Integration
Currently, the dashboard uses locally stored data fetched via `npm run fetch_pools` to avoid API rate limiting. Planned improvements include:

**Automated Data Refresh**
- Background cron job or scheduled task to run `fetch_pools.js` periodically
- Configurable refresh intervals (hourly, daily, etc.)
- Notification system for successful/failed data updates

**Real-Time Data Button**
- UI button for manual data refresh directly from the dashboard
- Progress indicator with batch processing status
- Fallback to cached data during rate limit scenarios
- Smart refresh that only updates changed pools

**Hybrid Architecture**
```
Cached Data (Fast) → Real-Time Fetch (Selective) → Rate Limit Protection
```

**Technical Implementation Options**
- Server-side API route for controlled data fetching
- WebSocket connection for live updates on critical pools
- Queue system with Redis for batch processing
- Rate limit monitoring with exponential backoff

**Why Current Local Storage Approach**
- Prevents API rate limit violations (Helius RPC limits)
- Ensures consistent dashboard performance
- Reduces infrastructure costs
- Allows offline development and testing

The current static approach prioritizes reliability over real-time data, but future versions will support both modes based on user preference and API quota availability.