
"use client";

import * as React from "react";
import { LucideProps } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./tooltip";

interface IconWithTooltipProps extends LucideProps {
  icon: React.ComponentType<LucideProps>;
  tooltip?: string;
}

export function IconWithTooltip({ icon: Icon, tooltip, ...props }: IconWithTooltipProps) {
  if (!tooltip) {
    return <Icon {...props} />;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex">
            <Icon {...props} />
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p>{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
