import type { AppError } from "@/lib/types";
import { Body, Button, Display, Label, Logo } from "@/components/ui";

export function Boot({ error, onRetry }: { error: AppError | null; onRetry: () => void }) {
  return (
    <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center gap-8 px-8 text-center safe-top safe-bottom">
      <div className="pointer-events-none absolute inset-0 vignette" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px gold-gradient-h opacity-50" />
      {error ? (
        <>
          <Logo size={120} className="opacity-80" />
          <div className="flex flex-col gap-2">
            <Display as="h1" size="d2">
              Could not start
            </Display>
            <Body tone="ash" small>
              {error.message}
            </Body>
          </div>
          <Button variant="ghost" onClick={onRetry}>
            Try again
          </Button>
        </>
      ) : (
        <>
          <Logo size={140} className="animate-breathe" />
          <div className="flex flex-col items-center gap-2">
            <Display size="d3">
              Valo<span className="text-gold">Store</span>
            </Display>
            <Label className="animate-blink">Checking your shop</Label>
          </div>
        </>
      )}
    </div>
  );
}
