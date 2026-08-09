"use client"

// Catches any render/hydration crash inside the editor so the user gets a
// recoverable dialog instead of the scary full-page "500" error boundary.
import { Component, type ReactNode } from "react"

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

export class EditorErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error) {
    console.error("Post editor crashed:", error)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex items-center justify-center min-h-[60vh] px-4">
          <div className="text-center max-w-md bg-white dark:bg-[#111827] border-2 border-red-200 dark:border-[#374151] rounded-2xl p-8 shadow-sm">
            <div className="text-4xl mb-3">⚠️</div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Editor hit a problem</h2>
            <p className="text-sm text-gray-500 dark:text-[#9CA3AF] mb-5">
              This is usually caused by a corrupted autosaved draft. Clear it and reload to continue.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => {
                  try {
                    localStorage.removeItem("techpivo-editor-draft")
                  } catch {}
                  this.setState({ error: null })
                  window.location.reload()
                }}
                className="px-4 py-2 bg-[#F59E0B] hover:bg-[#D97706] text-white text-sm font-semibold rounded-lg transition-colors"
              >
                Clear draft &amp; reload
              </button>
              <button
                onClick={() => this.setState({ error: null })}
                className="px-4 py-2 text-sm font-semibold text-gray-600 dark:text-gray-300 border-2 border-gray-300 dark:border-[#374151] rounded-lg hover:border-[#F59E0B] transition-colors"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
