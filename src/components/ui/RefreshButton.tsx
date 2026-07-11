'use client'

export default function RefreshButton() {
  return (
    <button
      onClick={() => window.location.reload()}
      className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
    >
      새로고침
    </button>
  )
}