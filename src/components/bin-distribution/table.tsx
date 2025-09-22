import { BinLiquidityData } from "@/lib/types";
import { formatNumber } from "@/lib/utils";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const ITEMS_PER_PAGE = 10;

export function BinDistributionTable({
  binData,
}: {
  binData: BinLiquidityData[];
}) {
  const [currentPage, setCurrentPage] = useState(1);

  if (binData.length === 0) {
    return null;
  }

  const sortedBinData = [...binData].sort((a, b) => a.binId - b.binId);
  const totalPages = Math.ceil(sortedBinData.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentData = sortedBinData.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  return (
    <div className="space-y-4">
      <div className="bg-gray-950 rounded-lg border border-gray-800">
        <div className="flex items-center justify-between py-3 px-4 border-b border-gray-800 bg-gray-900/50">
          <div className="text-gray-400 text-sm font-medium">Bin #</div>
          <div className="text-gray-400 text-sm font-medium">Price</div>
          <div className="text-gray-400 text-sm font-medium">Total Liquidity</div>
          <div className="text-gray-400 text-sm font-medium">Base Reserve</div>
          <div className="text-gray-400 text-sm font-medium">Quote Reserve</div>
          <div className="text-gray-400 text-sm font-medium">Status</div>
        </div>

        {currentData.map((bin, index) => (
          <div
            key={bin.binId}
            className="flex items-center justify-between py-3 px-4 border-b border-gray-800 hover:bg-gray-900/30 transition-colors last:border-b-0"
          >
            <div className="text-white font-medium">
              #{startIndex + index + 1}
            </div>
            <div className="text-white">
              ${bin.price?.toFixed(6) || "0.000000"}
            </div>
            <div className="text-white font-medium">
              ${formatNumber(bin.totalLiquidity)}
            </div>
            <div className="text-gray-300 text-sm">
              {formatNumber(bin.reserveXAmount)}
              <div className="text-xs text-gray-500">
                {bin.poolMetadata?.tokenX.symbol || "Base"}
              </div>
            </div>
            <div className="text-gray-300 text-sm">
              {formatNumber(bin.reserveYAmount)}
              <div className="text-xs text-gray-500">
                {bin.poolMetadata?.tokenY.symbol || "Quote"}
              </div>
            </div>
            <div className="text-right">
              <span
                className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                  bin.isActive
                    ? "bg-green-900/30 text-green-400 border border-green-800"
                    : "bg-gray-900/30 text-gray-400 border border-gray-700"
                }`}
              >
                {bin.isActive ? "Active" : "Inactive"}
              </span>
            </div>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-400">
            Showing {startIndex + 1} to {Math.min(endIndex, sortedBinData.length)} of{" "}
            {sortedBinData.length} bins
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-2 rounded-lg border border-gray-700 hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                if (
                  page === 1 ||
                  page === totalPages ||
                  (page >= currentPage - 1 && page <= currentPage + 1)
                ) {
                  return (
                    <button
                      key={page}
                      onClick={() => goToPage(page)}
                      className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                        page === currentPage
                          ? "bg-purple-600 text-white"
                          : "text-gray-400 hover:bg-gray-800"
                      }`}
                    >
                      {page}
                    </button>
                  );
                } else if (
                  page === currentPage - 2 ||
                  page === currentPage + 2
                ) {
                  return (
                    <span key={page} className="px-1 text-gray-500">
                      ...
                    </span>
                  );
                }
                return null;
              })}
            </div>

            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg border border-gray-700 hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}