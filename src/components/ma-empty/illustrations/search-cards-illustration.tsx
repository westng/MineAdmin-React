/**
 * Adapted from ReUI c-empty-16 (MIT), Copyright (c) 2025 Keenthemes Inc.
 * Source revision: 6e433ddaba3a4be38182c8c8883b6cc335183c42.
 * See ../README.md for the source link and THIRD_PARTY_NOTICES.md for the license.
 */
export function SearchCardsIllustration() {
  return (
    <div className="relative h-32 w-56 max-w-full" aria-hidden="true" data-slot="ma-empty-search-illustration">
      <div className="absolute right-6 bottom-4 left-6 flex h-12 items-center gap-2.5 rounded-lg border border-border/40 bg-muted/50 px-3 dark:bg-muted/25">
        <div className="size-5 shrink-0 rounded bg-muted-foreground/10" />
        <div className="flex flex-1 flex-col gap-1">
          <div className="h-2 w-full rounded bg-muted-foreground/10" />
          <div className="h-2 w-2/3 rounded bg-muted-foreground/8" />
        </div>
      </div>
      <div className="absolute right-3 bottom-8 left-3 flex h-12 items-center gap-2.5 rounded-lg border border-border/50 bg-muted/70 px-3 dark:bg-muted/40">
        <div className="size-5 shrink-0 rounded bg-muted-foreground/12" />
        <div className="flex flex-1 flex-col gap-1">
          <div className="h-2 w-full rounded bg-muted-foreground/12" />
          <div className="h-2 w-3/4 rounded bg-muted-foreground/10" />
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-12 flex h-14 items-center gap-3 rounded-lg border border-border bg-background px-3.5 shadow-sm">
        <div className="size-7 shrink-0 rounded bg-muted" />
        <div className="flex flex-1 flex-col gap-1.5">
          <div className="h-2.5 w-full rounded bg-muted" />
          <div className="h-2 w-3/5 rounded bg-muted/70" />
        </div>
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-linear-to-b from-background/0 to-background" />
    </div>
  )
}
