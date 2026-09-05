import { Star } from "lucide-react";
import { Body } from "./Text";

export interface EmptyStateProps {
  text: string;
}

export function EmptyState({ text }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-4 py-16">
      <Star size={32} strokeWidth={1.5} className="text-gold" />
      <Body tone="ash">{text}</Body>
    </div>
  );
}
