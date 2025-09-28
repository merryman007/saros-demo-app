'use client';

import React, { useMemo } from 'react';
import {
  ConnectionProvider,
  WalletProvider,
} from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
} from '@solana/wallet-adapter-wallets';
import {
  WalletModalProvider,
} from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl } from '@solana/web3.js';

// Import wallet adapter CSS
import '@solana/wallet-adapter-react-ui/styles.css';

export function WalletProviders({ children }: { children: React.ReactNode }) {
  const network = WalletAdapterNetwork.Mainnet;

  // Use custom RPC or fallback to Helius RPC, then public endpoint
  const endpoint = useMemo(() => {
    const heliusRPC = "https://mainnet.helius-rpc.com/?api-key=25eb7563-a303-4783-8e62-535586261018";
    const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || heliusRPC;
    console.log('🌐 Wallet using RPC endpoint:', rpcUrl);
    return rpcUrl;
  }, []);

  // Configure wallets - Phantom first as it's most popular on Solana
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
      // Add more wallets as needed
    ],
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider
        wallets={wallets}
        autoConnect={true}
        localStorageKey="saros-wallet-preference"
      >
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}