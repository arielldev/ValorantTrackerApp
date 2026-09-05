import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

const ICONS = {
  vp: "https://media.valorant-api.com/currencies/85ad13f7-3d1b-5128-9eb2-7cd8ee0b5741/displayicon.png",
  rp: "https://media.valorant-api.com/currencies/e59aa87c-4cbf-517a-5983-6e81511be9b7/displayicon.png",
  kc: "https://media.valorant-api.com/currencies/85ca954a-41f2-ce94-9b45-8ca3dd39a00d/displayicon.png",
};

const LABEL = { vp: "VP", rp: "RP", kc: "KC" };

const loaded = new Map<string, boolean>();

function useImageOk(src: string): boolean | null {
  const [ok, setOk] = useState<boolean | null>(loaded.get(src) ?? null);
  useEffect(() => {
    if (loaded.has(src)) {
      setOk(loaded.get(src)!);
      return;
    }
    let alive = true;
    const img = new Image();
    img.onload = () => {
      loaded.set(src, true);
      if (alive) setOk(true);
    };
    img.onerror = () => {
      loaded.set(src, false);
      if (alive) setOk(false);
    };
    img.src = src;
    return () => {
      alive = false;
    };
  }, [src]);
  return ok;
}

export interface CurrencyIconProps {
  kind: keyof typeof ICONS;
  size?: number;
  className?: string;
}

export function CurrencyIcon({ kind, size = 16, className }: CurrencyIconProps) {
  const src = ICONS[kind];
  const ok = useImageOk(src);
  if (ok === false) return <span className={cn("label", className)}>{LABEL[kind]}</span>;
  const mask = `url("${src}")`;
  return (
    <span
      role="img"
      aria-label={LABEL[kind]}
      className={cn("inline-block shrink-0 select-none", className)}
      style={{
        width: size,
        height: size,
        background: "currentColor",
        WebkitMaskImage: mask,
        maskImage: mask,
        WebkitMaskSize: "contain",
        maskSize: "contain",
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
        opacity: ok ? 1 : 0,
      }}
    />
  );
}

export function TierIcon({ src, name, size = 20, className }: { src: string | null | undefined; name?: string; size?: number; className?: string }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setFailed(false);
  }, [src]);
  if (!src || failed) return null;
  return (
    <img
      src={src}
      alt={name ?? ""}
      title={name}
      width={size}
      height={size}
      draggable={false}
      onError={() => setFailed(true)}
      className={cn("inline-block shrink-0 select-none", className)}
      style={{ width: size, height: size }}
    />
  );
}
