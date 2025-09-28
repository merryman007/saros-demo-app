'use client';

import { ClientOnly } from '../common/client-only';
import { WalletButton, WalletStatus } from './wallet-button';

export function ClientOnlyWalletButton() {
  return (
    <ClientOnly
      fallback={
        <div className="wallet-adapter-dropdown">
          <button 
            className="wallet-adapter-button wallet-adapter-button-trigger !bg-purple-600 hover:!bg-purple-700 !rounded-lg !font-semibold !text-white !border-0 !transition-colors !px-4 !py-2" 
            type="button"
            disabled={false}
          >
            <i className="wallet-adapter-button-start-icon" />
            Select Wallet
          </button>
        </div>
      }
    >
      <WalletButton />
    </ClientOnly>
  );
}

export function ClientOnlyWalletStatus() {
  return (
    <ClientOnly
      fallback={
        <div className="text-gray-400 text-sm">
          Not connected
        </div>
      }
    >
      <WalletStatus />
    </ClientOnly>
  );
}