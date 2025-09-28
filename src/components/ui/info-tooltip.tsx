"use client";

import { HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./tooltip";

interface InfoTooltipProps {
  content: React.ReactNode;
  side?: "top" | "right" | "bottom" | "left";
}

export function InfoTooltip({ content, side = "top" }: InfoTooltipProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button type="button" className="inline-flex items-center justify-center">
            <HelpCircle className="h-4 w-4 text-gray-400 hover:text-gray-300 transition-colors" />
          </button>
        </TooltipTrigger>
        <TooltipContent 
          side={side}
          className="max-w-xs bg-gray-800 border-gray-700 text-gray-200 p-3"
        >
          {content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}