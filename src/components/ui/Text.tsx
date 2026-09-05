import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export type Tone = "bone" | "ash" | "gold" | "smoke" | "signal" | "obsidian";

export const TONE: Record<Tone, string> = {
  bone: "text-bone",
  ash: "text-ash",
  gold: "text-gold",
  smoke: "text-smoke",
  signal: "text-signal",
  obsidian: "text-obsidian",
};

export interface LabelProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
  children: ReactNode;
}

export function Label({ tone = "ash", className, children, ...rest }: LabelProps) {
  return (
    <span className={cn("label", TONE[tone], className)} {...rest}>
      {children}
    </span>
  );
}

export type DisplaySize = "d1" | "d2" | "d3";

const SIZE: Record<DisplaySize, string> = { d1: "text-d1", d2: "text-d2", d3: "text-d3" };

export interface DisplayProps extends HTMLAttributes<HTMLElement> {
  size?: DisplaySize;
  tone?: Tone;
  as?: "h1" | "h2" | "h3" | "span" | "p" | "div";
  tabular?: boolean;
  children: ReactNode;
}

export function Display({ size = "d3", tone = "bone", as: Tag = "span", tabular = false, className, children, ...rest }: DisplayProps) {
  return (
    <Tag className={cn("display", SIZE[size], TONE[tone], tabular && "tabular", className)} {...rest}>
      {children}
    </Tag>
  );
}

export interface BodyProps extends HTMLAttributes<HTMLParagraphElement> {
  tone?: Tone;
  small?: boolean;
  children: ReactNode;
}

export function Body({ tone = "bone", small = false, className, children, ...rest }: BodyProps) {
  return (
    <p className={cn(small ? "text-small" : "text-body", TONE[tone], className)} {...rest}>
      {children}
    </p>
  );
}
