import { cn } from "@/lib/cn";

export interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return <div className={cn("bg-graphite", className)} aria-hidden="true" />;
}
