"use client";

import { useState } from "react";
import { ChevronDown, Search, X } from "lucide-react";

interface Token {
  symbol: string;
  name: string;
  mintAddress: string;
  decimals: number;
  logoURI?: string;
}

interface TokenSelectorProps {
  selectedToken: Token | null;
  availableTokens: Token[];
  onSelect: (token: Token) => void;
  placeholder?: string;
}

export function TokenSelector({
  selectedToken,
  availableTokens,
  onSelect,
  placeholder = "Select token"
}: TokenSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredTokens = availableTokens.filter(token =>
    token.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
    token.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelect = (token: Token) => {
    onSelect(token);
    setIsOpen(false);
    setSearchTerm("");
  };

  return (
    <div className="relative">
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 px-3 py-2 bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded-lg text-white font-medium transition-colors min-w-[140px]"
      >
        {selectedToken ? (
          <>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xs font-bold">
                {selectedToken.symbol.charAt(0)}
              </div>
              <span>{selectedToken.symbol}</span>
            </div>
          </>
        ) : (
          <span className="text-gray-400">{placeholder}</span>
        )}
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Modal */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/20 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown Content */}
          <div className="absolute top-full left-0 mt-2 w-80 bg-gray-800 border border-gray-700 rounded-lg shadow-2xl z-50 max-h-96 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <h3 className="text-white font-medium">Select a token</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Search */}
            <div className="p-4 border-b border-gray-700">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search tokens..."
                  className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 outline-none focus:border-purple-500"
                />
              </div>
            </div>

            {/* Token List */}
            <div className="flex-1 overflow-y-auto">
              {filteredTokens.length === 0 ? (
                <div className="p-4 text-center text-gray-400">
                  {searchTerm ? 'No tokens found' : 'No tokens available'}
                </div>
              ) : (
                <div className="p-2">
                  {filteredTokens.map((token) => (
                    <button
                      key={token.mintAddress}
                      onClick={() => handleSelect(token)}
                      className="w-full flex items-center gap-3 p-3 hover:bg-gray-700 rounded-lg transition-colors text-left"
                    >
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-sm font-bold flex-shrink-0">
                        {token.symbol.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-white font-medium">{token.symbol}</div>
                        <div className="text-gray-400 text-sm truncate">{token.name}</div>
                      </div>
                      {selectedToken?.mintAddress === token.mintAddress && (
                        <div className="w-2 h-2 bg-purple-500 rounded-full flex-shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-700">
              <div className="text-xs text-gray-400 text-center">
                {filteredTokens.length} token{filteredTokens.length !== 1 ? 's' : ''} available
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}