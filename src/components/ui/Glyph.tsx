import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

export interface GlyphProps {
  src: string | null | undefined;
  alt: string;
  className?: string;
  tone?: "gold" | "bone" | "smoke";
}

const FILL: Record<NonNullable<GlyphProps["tone"]>, string> = {
  gold: "linear-gradient(160deg, #F3E3A0 0%, #EAD27A 18%, #C9A227 48%, #8A6D14 82%, #5E4A0C 100%)",
  bone: "linear-gradient(160deg, #F1ECE1 0%, #B9B3A6 100%)",
  smoke: "linear-gradient(160deg, #6B675E 0%, #3A3830 100%)",
};

export function Glyph({ src, alt, className, tone = "gold" }: GlyphProps) {
  const [ok, setOk] = useState<boolean | null>(null);
  useEffect(() => {
    if (!src) {
      setOk(false);
      return;
    }
    let alive = true;
    const img = new Image();
    img.onload = () => alive && setOk(true);
    img.onerror = () => alive && setOk(false);
    img.src = src;
    return () => {
      alive = false;
    };
  }, [src]);

  if (!src || ok === false) {
    return <div className={cn("bg-graphite", className)} aria-label={alt} role="img" />;
  }
  const mask = `url("${src}")`;
  const maskStyle = {
    WebkitMaskImage: mask,
    maskImage: mask,
    WebkitMaskSize: "contain",
    maskSize: "contain",
    WebkitMaskRepeat: "no-repeat",
    maskRepeat: "no-repeat",
    WebkitMaskPosition: "center",
    maskPosition: "center",
  } as const;
  return (
    <div className={cn("relative", className)} role="img" aria-label={alt}>
      <div className="absolute inset-0 translate-y-[3px] opacity-60 blur-[3px]" style={{ ...maskStyle, background: "#000" }} />
      <div className="absolute inset-0" style={{ ...maskStyle, background: FILL[tone] }} />
      <div
        className="absolute inset-0 mix-blend-screen opacity-70"
        style={{ ...maskStyle, background: "linear-gradient(115deg, transparent 35%, rgba(255,255,255,0.55) 50%, transparent 65%)" }}
      />
    </div>
  );
}
