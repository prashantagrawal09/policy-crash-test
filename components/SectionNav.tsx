// A sticky nav for the long page (prd.md > Page Order and Navigation): one tap to each part of
// the result. Targets carry scroll-margin so they land just below the nav.

export const SECTIONS = [
  { id: "summary", label: "Summary" },
  { id: "people", label: "People" },
  { id: "town", label: "Town" },
  { id: "month", label: "Month" },
] as const;

export function SectionNav() {
  function jump(id: string) {
    const target = document.getElementById(id);
    if (!target) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  }

  return (
    <nav aria-label="Sections" className="sticky top-0 z-40 -mx-4 mt-6 border-b border-ink/10 bg-paper/95 px-4 py-2 backdrop-blur sm:-mx-6 sm:px-6">
      <ul className="flex gap-1.5 overflow-x-auto">
        {SECTIONS.map((section) => (
          <li key={section.id}>
            <a
              href={`#${section.id}`}
              onClick={(event) => {
                event.preventDefault();
                jump(section.id);
              }}
              className="block whitespace-nowrap rounded-full border-2 border-ink/15 bg-white px-3 py-1 text-sm font-semibold transition-colors hover:border-ink hover:bg-hazard"
            >
              {section.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
