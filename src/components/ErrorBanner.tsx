import { useApp } from "@/lib/store";
import { Banner, Progress } from "@/components/ui";

export function ErrorBanner() {
  const error = useApp((s) => s.storeError);
  const catalog = useApp((s) => s.catalog);
  if (!error) return null;
  if (error.kind === "content") {
    const p = catalog ?? { progress: 0, total: 8, state: "loading" as const };
    return (
      <div className="-mx-4 flex flex-col gap-2 bg-graphite px-4 py-3 md:mx-0">
        <div className="flex items-center justify-between">
          <span className="label text-gold">Downloading skin catalog</span>
          <span className="label tabular">{p.progress} / {p.total}</span>
        </div>
        <Progress fraction={p.total ? p.progress / p.total : 0} />
        <span className="text-micro text-ash">First run only. Usually under a minute on Wi-Fi.</span>
      </div>
    );
  }
  if (error.kind === "offline") {
    return (
      <Banner tone="offline" className="-mx-4 md:mx-0">
        Can&apos;t reach Riot right now. Pull to retry.
      </Banner>
    );
  }
  return (
    <Banner tone="error" className="-mx-4 md:mx-0">
      {error.message}
    </Banner>
  );
}
