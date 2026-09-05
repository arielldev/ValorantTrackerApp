import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

export interface ImgProps {
  src: string | null | undefined;
  alt: string;
  className?: string;
  imgClassName?: string;
  vignette?: boolean;
  dim?: boolean;
}

export function Img({ src, alt, className, imgClassName, vignette = true, dim = false }: ImgProps) {
  const [failed, setFailed] = useState<string | null>(null);
  useEffect(() => {
    setFailed(null);
  }, [src]);
  const show = !!src && failed !== src;
  return (
    <div className={cn("relative flex items-center justify-center overflow-hidden bg-charcoal", vignette && "vignette", className)}>
      {show ? (
        <img
          key={src}
          src={src!}
          alt={alt}
          loading="lazy"
          decoding="async"
          draggable={false}
          onError={() => setFailed(src!)}
          className={cn("h-full w-full object-contain", dim && "opacity-60", imgClassName)}
        />
      ) : (
        <div className="h-3/4 w-3/4 bg-graphite" aria-hidden="true" />
      )}
    </div>
  );
}
