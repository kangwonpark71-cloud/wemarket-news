'use client'

import React from 'react'

interface SchedulerErrorBoundaryProps {
  children: React.ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

interface SchedulerErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
}

export class SchedulerErrorBoundary extends React.Component<
  SchedulerErrorBoundaryProps,
  SchedulerErrorBoundaryState
> {
  constructor(props: SchedulerErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error: Error): SchedulerErrorBoundaryState {
    return { hasError: true, error, errorInfo: null }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo })
    
    // Log error to console for debugging
    console.error('[Scheduler Error Boundary]', error, errorInfo)
    
    // Call onError callback if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-red-600">⚠️</span>
            <h3 className="text-red-800 font-semibold">스케줄러 오류</h3>
          </div>
          <p className="text-red-700 text-sm mb-3">
            스케줄러에서 오류가 발생했습니다. 다시 시도해 주세요.
          </p>
          {this.state.error && (
            <details className="mb-3">
              <summary className="text-red-600 text-xs cursor-pointer hover:text-red-800">
                오류 상세 정보
              </summary>
              <pre className="mt-2 p-2 bg-red-100 rounded text-xs text-red-800 overflow-auto">
                {this.state.error.message}
                {this.state.errorInfo?.componentStack && (
                  <>
                    {'\n\n'}
                    {this.state.errorInfo.componentStack}
                  </>
                )}
              </pre>
            </details>
          )}
          <button
            onClick={this.handleRetry}
            className="px-3 py-1.5 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
          >
            다시 시도
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
