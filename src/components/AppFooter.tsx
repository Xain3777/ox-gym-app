// Tiny credit line shown at the bottom of every page.
// Mounted in the root layout. Pointer-events disabled so it never
// intercepts taps on overlapping content (mobile bottom nav, etc.).
export function AppFooter() {
  return (
    <footer
      className="
        fixed bottom-1 left-0 right-0 z-[10]
        text-center text-white/15 text-[10px] font-mono tracking-[0.08em]
        pointer-events-none select-none
      "
    >
      Made by Computer Engineers Zein Haidar
    </footer>
  );
}
