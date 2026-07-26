export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="flex flex-col items-center justify-center py-16">
        {/* Pulsing title skeleton */}
        <div className="mb-4 h-7 w-48 animate-pulse rounded-sm bg-muted" />
        <div className="mb-8 h-4 w-64 animate-pulse rounded-sm bg-muted" />

        {/* News card skeletons */}
        <div className="w-full space-y-3">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="flex gap-4 rounded-sm border border-border p-4"
            >
              <div className="hidden h-24 w-24 shrink-0 animate-pulse rounded-sm bg-muted sm:block" />
              <div className="min-w-0 flex-1 space-y-3">
                <div className="flex gap-2">
                  <div className="h-5 w-16 animate-pulse rounded-full bg-muted" />
                  <div className="h-5 w-20 animate-pulse rounded-full bg-muted" />
                </div>
                <div className="h-4 w-full animate-pulse rounded-sm bg-muted" />
                <div className="h-4 w-3/4 animate-pulse rounded-sm bg-muted" />
                <div className="flex gap-3">
                  <div className="h-3 w-24 animate-pulse rounded-sm bg-muted" />
                  <div className="h-3 w-16 animate-pulse rounded-sm bg-muted" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
