'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="flex flex-col items-center justify-center rounded-sm border-2 border-dashed border-danger/30 bg-danger-light/10 py-16 text-center">
        <span className="mb-4 text-5xl">⚠️</span>
        <h1 className="mb-2 text-xl font-bold text-foreground">오류가 발생했습니다</h1>
        <p className="mb-6 max-w-md text-sm text-muted-foreground">
          페이지를 불러오는 중 예기치 않은 오류가 발생했습니다.
          {error.digest && (
            <span className="mt-2 block text-xs text-muted-foreground/60">
              오류 ID: {error.digest}
            </span>
          )}
        </p>
        <button
          onClick={reset}
          className="rounded-sm bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          다시 시도
        </button>
      </div>
    </div>
  )
}
