import Image from "next/image";

/**
 * The isometric yard render, filling the page's content area edge to edge with
 * the working UI floating over it.
 *
 * Decorative, not data: this is a fixed illustration of a dock, never a live
 * view of one, so it carries an empty `alt` and no truck ever renders onto it.
 *
 * Served through `next/image` deliberately — the source PNG is ~2.4 MB, and the
 * optimiser hands back a viewport-sized WebP instead. `priority` because it is
 * the page's LCP element.
 */
export function YardBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <Image
        src="/dock-background.png"
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover object-center"
      />
      {/* Just enough of a wash to sit the panels on something, and no more —
          the render is the point, and anything heavier greys it out. Dark mode
          takes a real one: a bright daylight render under a dark UI is the
          opposite problem. */}
      <div className="absolute inset-0 bg-background/15 dark:bg-background/55" />
    </div>
  );
}
