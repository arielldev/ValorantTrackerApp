import { useEffect, useState } from "react";
import { Copy, Minus, Square, X } from "lucide-react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { cn } from "@/lib/cn";
import { canHover, sfx } from "@/lib/sfx";
import { Logo, Wordmark } from "@/components/ui";

function Control({ label, danger, onClick, children }: { label: string; danger?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      aria-label={label}
      onClick={() => {
        sfx.play("click");
        onClick();
      }}
      onPointerEnter={() => canHover && sfx.play("hover")}
      className={cn(
        "flex h-9 w-11 items-center justify-center text-ash transition-colors",
        danger ? "hover:bg-signal hover:text-bone" : "hover:bg-graphite hover:text-bone",
      )}
    >
      {children}
    </button>
  );
}

export function TitleBar() {
  const [maximized, setMaximized] = useState(false);
  const win = getCurrentWindow();

  useEffect(() => {
    let alive = true;
    void win.isMaximized().then((m) => alive && setMaximized(m));
    const unlisten = win.onResized(async () => {
      if (alive) setMaximized(await win.isMaximized());
    });
    return () => {
      alive = false;
      void unlisten.then((u) => u());
    };
  }, [win]);

  return (
    <div data-tauri-drag-region className="flex h-9 shrink-0 select-none items-center justify-between border-b border-hairline bg-charcoal">
      <div data-tauri-drag-region className="flex h-full items-center gap-2 pl-3">
        <Logo size={18} className="pointer-events-none" />
        <Wordmark className="pointer-events-none relative top-px text-[15px] leading-none" />
      </div>
      <div className="flex">
        <Control label="Minimize" onClick={() => void win.minimize()}>
          <Minus size={14} strokeWidth={1.5} />
        </Control>
        <Control label={maximized ? "Restore" : "Maximize"} onClick={() => void win.toggleMaximize()}>
          {maximized ? <Copy size={12} strokeWidth={1.5} /> : <Square size={12} strokeWidth={1.5} />}
        </Control>
        <Control label="Close to tray" danger onClick={() => void win.close()}>
          <X size={16} strokeWidth={1.5} />
        </Control>
      </div>
    </div>
  );
}
