import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Display } from "./Text";

export interface HeroRuleProps {
  title: string;
  meta?: ReactNode;
  className?: string;
}

export function HeroRule({ title, meta, className }: HeroRuleProps) {
  return (
    <div className={cn("-mr-4 flex items-center gap-3", className)}>
      <Display as="h2" size="d3">
        {title}
      </Display>
      <div className="h-px flex-1 bg-gold/80" />
      {meta ? <div className="pr-4">{meta}</div> : null}
    </div>
  );
}
