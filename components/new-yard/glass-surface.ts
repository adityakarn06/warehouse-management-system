/**
 * The one material this page is made of.
 *
 * `/new-yard` puts every panel over a photographic render rather than over the
 * app background, so the usual `bg-card` + `border-border` surface reads as an
 * opaque patch cut out of the image. This replaces it with a restrained glass:
 * mostly the card colour, blurred, with two small cues — a touch of the render
 * showing through, and a faint highlight along the top edge — that say the
 * panel is floating without turning it into a gradient pane.
 *
 * Deliberately stops short of full glassmorphism. These panels are for reading
 * numbers off, and the app's own surfaces elsewhere are flat, so anything more
 * would read as a different product bolted onto this route.
 *
 * Shared so the stat chips, the floating summaries and the bottom panels are
 * visibly the same surface.
 */
export const glassSurface =
  "rounded-xl border border-white/60 bg-card/88 shadow-[inset_0_1px_0_0_rgb(255_255_255/0.55),0_12px_36px_-16px_rgb(0_0_0/0.35)] backdrop-blur-xl dark:border-white/10 dark:bg-card/80 dark:shadow-[inset_0_1px_0_0_rgb(255_255_255/0.08),0_12px_36px_-16px_rgb(0_0_0/0.6)]";

/**
 * The inset rows nested inside a glass panel. `bg-muted/40` goes muddy once
 * there is an image behind it; this stays a lighter step against the card.
 */
export const glassRow = "rounded-md bg-background/70 dark:bg-background/45";
