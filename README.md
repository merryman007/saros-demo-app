# DLMM Analytics Dashboard

Production analytics dashboard for Saros Finance DLMM (Dynamic Liquidity Market Maker) pools, built with Next.js and TypeScript.

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

**Real DLMM Data Integration**
- Direct integration with Saros Finance DLMM SDK via `fetch_pools.js`
- Real pool reserves, trading fees, and token metadata from blockchain
- Automatic fallback to demo data if real data unavailable
- 1-minute caching layer for performance optimization

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

# Fetch real DLMM pool data (optional, falls back to demo data)
npm run fetch_pools

# Start development server
npm run dev

# Build for production
npm run build

# Run linting
npm run lint
```

Open [http://localhost:3000](http://localhost:3000) and navigate to the Analytics tab.

## Real Data Setup

**For Live DLMM Data:**
1. Run `npm run fetch_pools` to pull real pool data from Saros DLMM
2. This creates `pools.jsonl` with actual pool reserves and metadata
3. The app automatically uses this real data for analytics

**Data Sources:**
- **Primary**: Live DLMM pools via Helius RPC (SOL/USDC, SAROS/USDC, JUP/SOL, etc.)
- **Fallback**: Local pool data if blockchain data temporarily unavailable

## Key Files

- `/src/components/analytics/` - Main analytics components
- `/src/lib/analytics-data.ts` - Analytics algorithms using real pool characteristics
- `/src/lib/real-pool-adapter.ts` - Converts DLMM SDK data to analytics format
- `/src/lib/pools.ts` - Pool data management with blockchain data integration
- `/fetch_pools.js` - DLMM SDK integration script for data fetching

## Architecture

**Data Flow:**
1. `fetch_pools.js` → Fetches real DLMM pools via SDK
2. `pools.jsonl` → Stores pool reserves, fees, token metadata
3. `real-pool-adapter.ts` → Converts to analytics format
4. Analytics components → Render real pool data with interactive charts

**Chart Interactivity:**
- Click on data points to explore details
- Real-time feedback with selected data highlighting
- Responsive design with proper scaling

Production-ready analytics platform for the Saros Finance DLMM ecosystem with real-time blockchain data integration.