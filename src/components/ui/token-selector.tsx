"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronDown, Search, Check } from "lucide-react";
import { Token, TokenService } from "@/lib/token-service";

interface TokenSelectorProps {
  selectedToken?: Token;
  onTokenSelect: (token: Token) => void;
  placeholder?: string;
  label?: string;
}

export function TokenSelector({
  selectedToken,
  onTokenSelect,
  placeholder = "Search or select token",
  label,
}: TokenSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [tokens, setTokens] = useState<Token[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadTokens = async () => {
      setIsLoading(true);
      await TokenService.loadTokenRegistry();
      setTokens(TokenService.getPopularTokens());
      setIsLoading(false);
    };
    loadTokens();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isLoading) {
      const results = TokenService.searchTokens(searchQuery);
      setTokens(results);
    }
  }, [searchQuery, isLoading]);

  const handleTokenSelect = (token: Token) => {
    onTokenSelect(token);
    setIsOpen(false);
    setSearchQuery("");
  };

  const handleInputClick = () => {
    setIsOpen(true);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const displayValue = selectedToken 
    ? `${selectedToken.symbol} - ${selectedToken.name}`
    : "";

  return (
    <div className="relative" ref={dropdownRef}>
      {label && (
        <label className="block text-sm font-medium text-white mb-2">
          {label}
        </label>
      )}
      
      <div 
        className="relative cursor-pointer"
        onClick={handleInputClick}
      >
        <input
          ref={inputRef}
          type="text"
          value={isOpen ? searchQuery : displayValue}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={placeholder}
          className="w-full px-3 py-2 pr-10 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none cursor-pointer"
          readOnly={!isOpen}
        />
        
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
          {isOpen ? (
            <Search className="h-4 w-4 text-gray-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-400" />
          )}
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-gray-800 border border-gray-600 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {isLoading ? (
            <div className="px-4 py-3 text-center text-gray-400">
              Loading tokens...
            </div>
          ) : tokens.length === 0 ? (
            <div className="px-4 py-3 text-center text-gray-400">
              No tokens found
            </div>
          ) : (
            <div className="py-1">
              {tokens.map((token) => (
                <div
                  key={token.address}
                  onClick={() => handleTokenSelect(token)}
                  className="px-4 py-3 hover:bg-gray-700 cursor-pointer flex items-center gap-3 group"
                >
                  {token.logoURI && (
                    <img
                      src={token.logoURI}
                      alt={token.symbol}
                      className="w-6 h-6 rounded-full"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white">
                        {token.symbol}
                      </span>
                      {token.verified ? (
                        <span className="text-xs bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded">
                          ✓
                        </span>
                      ) : token.symbol.includes('...') ? (
                        <span className="text-xs bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded">
                          Custom
                        </span>
                      ) : null}
                    </div>
                    <div className="text-sm text-gray-400 truncate">
                      {token.name}
                    </div>
                    <div className="text-xs text-gray-500 font-mono">
                      {token.address.slice(0, 8)}...{token.address.slice(-4)}
                    </div>
                  </div>

                  {selectedToken?.address === token.address && (
                    <Check className="h-4 w-4 text-purple-400" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}