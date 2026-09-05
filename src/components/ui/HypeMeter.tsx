import { useId } from "react";
import { cn } from "@/lib/cn";
import type { HypeTier } from "@/lib/hype";

const ORDER: HypeTier[] = ["D", "C", "B", "A", "S", "SS", "SSS"];

interface Palette {
  from: string;
  mid: string;
  to: string;
  text: string;
  glow: string;
  holo?: boolean;
}

export const GRADE_PALETTE: Record<HypeTier, Palette> = {
  D: { from: "#4A4740", mid: "#3A3830", to: "#2C2C33", text: "#B9B3A6", glow: "rgba(0,0,0,0)" },
  C: { from: "#8E897E", mid: "#6E6A5F", to: "#4F4B43", text: "#F1ECE1", glow: "rgba(142,137,126,0.25)" },
  B: { from: "#BFD8FF", mid: "#6F9BD8", to: "#3A5C93", text: "#0A0A0C", glow: "rgba(111,155,216,0.45)" },
  A: { from: "#E6C7FF", mid: "#B784F0", to: "#6B3FB0", text: "#0A0A0C", glow: "rgba(183,132,240,0.5)" },
  S: { from: "#FFF4C8", mid: "#EAD27A", to: "#B8891A", text: "#0A0A0C", glow: "rgba(234,210,122,0.55)" },
  SS: { from: "#FFD36B", mid: "#FF7A45", to: "#C9263A", text: "#FFFFFF", glow: "rgba(255,122,69,0.6)" },
  SSS: { from: "#FF5E7E", mid: "#FFD86B", to: "#6BF0FF", text: "#FFFFFF", glow: "rgba(255,216,107,0.7)", holo: true },
};

function GradeGradient({ id, p }: { id: string; p: Palette }) {
  if (p.holo) {
    return (
      <linearGradient id={id} x1="0" y1="0" x2="0.5" y2="0" spreadMethod="repeat">
        <stop offset="0" stopColor={p.from} />
        <stop offset="0.33" stopColor={p.mid} />
        <stop offset="0.66" stopColor={p.to} />
        <stop offset="1" stopColor={p.from} />
        <animateTransform attributeName="gradientTransform" type="translate" from="0 0" to="0.5 0" dur="2.4s" repeatCount="indefinite" />
      </linearGradient>
    );
  }
  return (
    <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stopColor={p.from} />
      <stop offset="0.5" stopColor={p.mid} />
      <stop offset="1" stopColor={p.to} />
    </linearGradient>
  );
}

export interface GradeEmblemProps {
  tier: HypeTier;
  label?: string;
  size?: number;
  className?: string;
  title?: string;
}

export function GradeEmblem({ tier, label, size = 24, className, title }: GradeEmblemProps) {
  const text = label ?? tier;
  const id = useId().replace(/:/g, "");
  const p = GRADE_PALETTE[tier];
  const gid = `ge${id}`;
  const hid = `gh${id}`;
  const fontSize = text.length === 3 ? 34 : text.length === 2 ? 44 : 56;
  return (
    <svg
      width={size * 1.15}
      height={size}
      viewBox="0 0 115 100"
      className={cn("shrink-0 select-none overflow-visible", className)}
      role="img"
      aria-label={title ?? `Community grade ${tier}`}
      style={{ filter: `drop-shadow(0 0 ${Math.max(3, size / 5)}px ${p.glow})` }}
    >
      <defs>
        <GradeGradient id={gid} p={p} />
        <linearGradient id={hid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.5" />
          <stop offset="0.5" stopColor="#FFFFFF" stopOpacity="0.04" />
          <stop offset="1" stopColor="#000000" stopOpacity="0.3" />
        </linearGradient>
      </defs>
      <polygon points="18,4 97,4 111,50 97,96 18,96 4,50" fill={`url(#${gid})`} />
      <polygon points="18,4 97,4 111,50 97,96 18,96 4,50" fill={`url(#${hid})`} />
      <polygon points="26,14 89,14 100,50 89,86 26,86 15,50" fill="#0A0A0C" fillOpacity="0.82" />
      <polygon points="26,14 89,14 100,50 89,86 26,86 15,50" fill="none" stroke="#FFFFFF" strokeOpacity="0.12" strokeWidth="1.5" />
      <text
        x="57.5"
        y="52"
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="'Bebas Neue', Anton, Impact, sans-serif"
        fontSize={fontSize}
        letterSpacing="0.05em"
        fill="#FFFFFF"
        style={{ filter: `drop-shadow(0 0 3px ${p.glow})` }}
      >
        {text}
      </text>
    </svg>
  );
}

export interface HypeMeterProps {
  tier: HypeTier;
  score?: number;
  size?: "sm" | "md";
  showLetter?: boolean;
  className?: string;
}

export function HypeMeter({ tier, score, size = "sm", showLetter = true, className }: HypeMeterProps) {
  const id = useId().replace(/:/g, "");
  const p = GRADE_PALETTE[tier];
  const rank = ORDER.indexOf(tier);
  const h = size === "sm" ? 18 : 28;
  const gap = size === "sm" ? 3 : 4;
  const tickW = size === "sm" ? 3 : 4;
  const ticks = ORDER.length;
  const ticksW = ticks * tickW + (ticks - 1) * gap;
  const gid = `gm${id}`;
  return (
    <span className={cn("inline-flex items-center gap-2", className)} title={score != null ? `${score} / 100` : undefined}>
      {showLetter ? <GradeEmblem tier={tier} size={h + 4} /> : null}
      <svg width={ticksW} height={h} viewBox={`0 0 ${ticksW} ${h}`} className="shrink-0 overflow-visible" aria-hidden="true">
        <defs>
          <GradeGradient id={gid} p={p} />
        </defs>
        {ORDER.map((_, i) => {
          const on = i <= rank;
          const x = i * (tickW + gap);
          const th = Math.round(h * (0.35 + (i / (ticks - 1)) * 0.65));
          const y = h - th;
          return <polygon key={i} points={`${x},${h} ${x},${y + 1.5} ${x + 1.5},${y} ${x + tickW},${y} ${x + tickW},${h}`} fill={on ? `url(#${gid})` : "#2C2C33"} />;
        })}
      </svg>
    </span>
  );
}
