export function TopBar({ title }: { title: string }) {
  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between gap-6 border-b border-border bg-background/80 backdrop-blur-sm px-6">
      <h2 className="text-lg font-semibold">{title}</h2>
      <form action="/lookup" method="get" className="flex items-center gap-2">
        <input
          type="text"
          name="q"
          placeholder="Lookup execution_id / user_id / org_id (UUID)…"
          className="h-9 w-[380px] rounded-md border border-border bg-background px-3 text-sm placeholder:text-muted-foreground focus:border-emerald-500/50 focus:outline-none"
        />
        <button
          type="submit"
          className="h-9 rounded-md border border-border bg-accent/30 px-3 text-sm hover:bg-accent"
        >
          Lookup
        </button>
      </form>
    </header>
  )
}
