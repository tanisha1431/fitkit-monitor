export function TopBar({ title }: { title: string }) {
  return (
    <header className="sticky top-0 z-40 flex h-14 items-center border-b border-border bg-background/80 backdrop-blur-sm px-6">
      <h2 className="text-lg font-semibold">{title}</h2>
    </header>
  )
}
