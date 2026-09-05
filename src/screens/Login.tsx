import { Bell, Eye, LogIn, ShieldCheck, Star } from "lucide-react";
import type { AppError } from "@/lib/types";
import { Button, Display, Label, Logo } from "@/components/ui";

export interface LoginProps {
  busy: boolean;
  error: AppError | null;
  expired: boolean;
  onLogin: () => void;
}

const POINTS = [
  { Icon: Eye, title: "View only", text: "Never buys or equips anything." },
  { Icon: Star, title: "Wishlist", text: "Flagged the day a skin rotates in." },
  { Icon: Bell, title: "Daily alert", text: "At rotation, in your timezone." },
  { Icon: ShieldCheck, title: "Riot sign-in", text: "On auth.riotgames.com. No password seen." },
];

export function Login({ busy, error, expired, onLogin }: LoginProps) {
  return (
    <div className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden safe-top safe-bottom">
      <div className="pointer-events-none absolute -top-24 left-1/2 h-112 w-md -translate-x-1/2 rounded-full bg-gold/15 blur-3xl" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px gold-gradient-h opacity-60" />

      <div className="relative mx-auto flex w-full max-w-md flex-1 flex-col justify-between px-6 pb-4 pt-2 md:justify-center md:gap-10 md:pb-16">
        <div className="flex min-h-0 flex-col gap-5 md:gap-8">
          <div className="flex items-center gap-4 animate-rise">
            <Logo size={56} />
            <div className="flex flex-col">
              <Label tone="gold">For VALORANT</Label>
              <Display as="h1" size="d2">
                Valo<span className="text-gold">Store</span>
              </Display>
            </div>
          </div>

          <div className="flex flex-col gap-1 animate-rise" style={{ animationDelay: "60ms" }}>
            <Display as="h2" size="d1" className="text-[2.75rem] leading-[0.9] md:text-[3.25rem]">
              Your shop.
              <br />
              <span className="text-gold">Every day.</span>
            </Display>
            <p className="max-w-xs pt-1 text-small text-ash md:text-body">Know what dropped before you open the game.</p>
          </div>

          <ul className="flex flex-col animate-rise" style={{ animationDelay: "120ms" }}>
            {POINTS.map(({ Icon, title, text }) => (
              <li key={title} className="flex items-center gap-3 border-t border-hairline py-2.5 last:border-b md:py-3.5">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center chamfer-sm bg-graphite text-gold md:h-8 md:w-8">
                  <Icon size={15} strokeWidth={1.5} />
                </span>
                <span className="flex min-w-0 flex-1 items-baseline justify-between gap-3">
                  <span className="label text-bone">{title}</span>
                  <span className="truncate text-micro text-ash md:text-small">{text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col gap-2 pt-4 animate-rise" style={{ animationDelay: "180ms" }}>
          {expired ? <Label tone="gold">Session expired. Sign in again.</Label> : null}
          {error ? <Label tone="signal" className="normal-case tracking-normal">{error.message}</Label> : null}
          <Button full loading={busy} onClick={onLogin} sound="confirm" size="lg" icon={<LogIn strokeWidth={2.2} />}>
            Sign in with Riot
          </Button>
          <p className="text-center text-micro text-smoke">Not affiliated with or endorsed by Riot Games.</p>
        </div>
      </div>
    </div>
  );
}
