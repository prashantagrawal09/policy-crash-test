// Slim footer pinned to the bottom of the screen, always visible (prd.md > Disclaimer).
export function Disclaimer() {
  return (
    <footer className="fixed inset-x-0 bottom-0 z-20 bg-ink text-paper">
      <div className="hazard-stripes h-1" aria-hidden />
      <p className="mx-auto max-w-[1200px] px-4 py-2 text-center text-xs sm:text-sm">
        Fictional residents, illustrative numbers. Not financial advice or a forecast.
      </p>
    </footer>
  );
}
