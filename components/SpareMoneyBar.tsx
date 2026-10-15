import type { ResidentResult } from "@/lib/engine";
import { spareBar } from "@/lib/format";

// The bar takes 80% of the track; the rest is room for the below-zero hazard spill.
const BAR = 80;

// Monthly spare money, with the part the policy eats shaded red or the part it adds shaded green,
// a faint tick at the 10% "feels it" line, and a hazard spill past the end below zero.
export function SpareMoneyBar({ result }: { result: ResidentResult | null }) {
  const bar = spareBar(result);
  const shade = bar.tone === "gain" ? "bg-better" : "bg-hard";
  const stripes = bar.tone === "gain" ? "oneoff-stripes" : "oneoff-stripes oneoff-stripes-loss";

  return (
    <div className="relative h-3 w-full" aria-hidden>
      <div className="absolute inset-y-0 left-0 flex overflow-hidden rounded-sm" style={{ width: `${BAR}%` }}>
        <div className="h-full bg-ink/25 transition-[width] duration-300 motion-reduce:transition-none" style={{ width: `${bar.keep}%` }} />
        {bar.solid > 0 && <div className={`h-full ${shade}`} style={{ width: `${bar.solid}%` }} />}
        {bar.striped > 0 && <div className={`h-full ${stripes}`} style={{ width: `${bar.striped}%` }} />}
      </div>
      {bar.spill > 0 && (
        <div
          className="hazard-stripes absolute inset-y-0 rounded-r-sm"
          style={{ left: `${BAR}%`, width: `${(bar.spill / 100) * BAR}%` }}
        />
      )}
      {bar.tick && <div className="absolute -inset-y-1 w-0.5 bg-ink/70" style={{ left: `${BAR * 0.9}%` }} />}
    </div>
  );
}
