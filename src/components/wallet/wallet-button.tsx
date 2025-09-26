'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

export function WalletButton() {
  return (
    <WalletMultiButton
      className="!bg-purple-600 hover:!bg-purple-700 !rounded-lg !font-semibold !text-white !border-0 !transition-colors !px-4 !py-2"
    />
  );
}

export function WalletStatus() {
  const { connected, connecting, publicKey } = useWallet();

  if (connecting) {
    return (
      <div className="flex items-center gap-2 text-yellow-400 text-sm">
        <div className="w-4 h-4 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
        Connecting...
      </div>
    );
  }

  if (connected && publicKey) {
    return (
      <div className="text-green-400 text-sm">
        Connected: {publicKey.toString().slice(0, 4)}...{publicKey.toString().slice(-4)}
      </div>
    );
  }

  return (
    <div className="text-gray-400 text-sm">
      Not connected
    </div>
  );
}