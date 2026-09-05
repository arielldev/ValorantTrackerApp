import { navigate } from "@/lib/router";
import { Body, Button, Display, Label, Logo } from "@/components/ui";

export function NotFound({ path }: { path: string }) {
  return (
    <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center gap-6 px-8 text-center safe-top safe-bottom">
      <div className="pointer-events-none absolute inset-0 vignette" />
      <Logo size={96} className="opacity-70" />
      <div className="flex flex-col items-center gap-2">
        <Display as="h1" size="d1" tone="gold">
          404
        </Display>
        <Display size="d3">Nothing here</Display>
        <Body tone="ash" small>
          <Label className="normal-case tracking-normal">/{path}</Label> is not a place in ValoStore.
        </Body>
      </div>
      <Button variant="ghost" onClick={() => navigate("shop")}>
        Back to shop
      </Button>
    </div>
  );
}
