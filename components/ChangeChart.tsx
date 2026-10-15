import type { ResidentResult, Verdict } from "@/lib/engine";
import type { Expression } from "@/lib/expressions";
import { chartRows, VERDICT_LABELS, type ChartRow } from "@/lib/format";
import type { Resident } from "@/lib/schemas";
import { ResidentAvatar } from "./ResidentAvatar";
import { VERDICT_STYLES } from "./verdictStyles";

// The longest bar reaches --max-bar from the zero line: half the row minus a fixed 4rem,
// so its amount label always fits beside it, at any width.
const LEGEND_ORDER: Verdict[] = ["hard_hit", "feels_it", "barely_affected", "better_off"];

interface Segment {
  from: number; // dollars a month, signed; 0 is the zero line
  to: number;
  striped: boolean;
}

// Solid monthly part from zero; the one-off share continues it, or starts at zero if it points the other way.
function segments(row: ChartRow): Segment[] {
  const parts: Segment[] = [];
  if (row.monthly !== 0) parts.push({ from: 0, to: row.monthly, striped: false });
  if (row.oneOffShare !== 0) {
    const start = Math.sign(row.monthly) === Math.sign(row.oneOffShare) ? row.monthly : 0;
    parts.push({ from: start, to: start + row.oneOffShare, striped: true });
  }
  return parts;
}

// One bar per resident, in card order, from a zero line: losses left, gains right (prd.md > Monthly Change Chart).
export function ChangeChart({ residents, results, faces }: { residents: Resident[]; results: ResidentResult[]; faces: Record<string, Expression> }) {
  const rows = chartRows(results);
  const extents = rows.flatMap((row) => segments(row).flatMap((s) => [Math.abs(s.from), Math.abs(s.to)]));
  const scale = Math.max(1, ...extents);
  // A position on the row: 50% is the zero line; ±scale dollars sit --max-bar either side of it.
  const at = (dollars: number, plus = "0px") => `calc(50% + ${dollars / scale} * var(--max-bar) + ${plus})`;

  const verdictsShown = LEGEND_ORDER.filter((v) => rows.some((row) => row.verdict === v));
  const hasOneOff = rows.some((row) => row.oneOffShare !== 0);

  return (
    <figure className="rounded-lg border border-ink/15 bg-white p-5">
      <figcaption className="font-display text-2xl font-black font-stretch-condensed">Monthly change, person by person</figcaption>

      <ul className="mt-4 [--max-bar:calc(50%-4rem)]">
        {rows.map((row) => {
          const resident = residents.find((r) => r.id === row.id)!;
          const parts = segments(row);
          const high = Math.max(0, ...parts.map((s) => Math.max(s.from, s.to)));
          const low = Math.min(0, ...parts.map((s) => Math.min(s.from, s.to)));
          const net = row.monthly + row.oneOffShare;
          // The label sits just past the bar's far end, on the side the person's money moves.
          const labelStyle = net < 0 ? { right: at(-low, "6px") } : { left: at(high, "6px") };

          return (
            <li key={row.id} className="grid grid-cols-[7.5rem_1fr] items-center gap-3 py-1 sm:grid-cols-[8.75rem_1fr]">
              <span className="flex min-w-0 items-center gap-1.5">
                <ResidentAvatar id={row.id} expression={faces[row.id] ?? "neutral"} size={26} className="shrink-0" />
                <span className="truncate text-sm font-semibold">{resident.shortName}</span>
              </span>
              <div className="relative h-7">
                <div className="absolute inset-y-0 left-1/2 w-px bg-ink" aria-hidden />
                {parts.map((s, i) => (
                  <div
                    key={i}
                    aria-hidden
                    className={`absolute inset-y-1 rounded-sm transition-[left,width] duration-300 motion-reduce:transition-none ${
                      s.striped
                        ? `oneoff-stripes ${s.to < s.from ? "oneoff-stripes-loss" : ""} border ${s.to < s.from ? "border-hard" : "border-better"}`
                        : VERDICT_STYLES[row.verdict].band
                    }`}
                    style={{
                      left: at(Math.min(s.from, s.to)),
                      width: `calc(${Math.abs(s.to - s.from) / scale} * var(--max-bar))`,
                    }}
                  />
                ))}
                <span className="absolute top-1/2 -translate-y-1/2 whitespace-nowrap text-sm font-semibold tabular-nums" style={labelStyle}>
                  <span className="sr-only">{resident.shortName}: </span>
                  {row.label}
                </span>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-2 grid grid-cols-[7.5rem_1fr] gap-3 text-xs text-ink/50 sm:grid-cols-[8.75rem_1fr]" aria-hidden>
        <span />
        <div className="flex justify-between">
          <span>← loses money</span>
          <span>gains money →</span>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-ink/70">
        {verdictsShown.map((v) => (
          <span key={v} className="inline-flex items-center gap-1.5">
            <span className={`inline-block h-3 w-3 rounded-sm ${VERDICT_STYLES[v].swatch}`} aria-hidden />
            {VERDICT_LABELS[v]}
          </span>
        ))}
        {hasOneOff && (
          <span className="inline-flex items-center gap-1.5">
            <span className="oneoff-stripes inline-block h-3 w-5 rounded-sm border border-better" aria-hidden />
            one-off, spread over 12 months
          </span>
        )}
      </div>
    </figure>
  );
}
