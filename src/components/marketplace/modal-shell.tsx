// TechPivo Market shared modal shell (CLIENT) — consistent overlay, Escape,
// outside-click, scroll-lock, focus restore for cart popup, Quick View, and
// checkout modal. No business logic here.

import { useEffect, useRef } from "react"
import { X } from "lucide-react"

export function ModalShell({
  label,
  onClose,
  children,
  wide,
  fullOnMobile,
}: {
  label: string
  onClose: () => void
  children: React.ReactNode
  /** wider panel for the checkout modal on desktop */
  wide?: boolean
  /** full-screen sheet on mobile (checkout) */
  fullOnMobile?: boolean
}) {
  const panelRef = useRef<HTMLDivElement>(null)
  const restoreRef = useRef<Element | null>(null)

  useEffect(() => {
    restoreRef.current = document.activeElement
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    panelRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)
    return () => {
      document.body.style.overflow = prevOverflow
      document.removeEventListener("keydown", onKey)
      if (restoreRef.current instanceof HTMLElement) restoreRef.current.focus()
    }
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/55 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={label}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        className={`w-full bg-white shadow-2xl outline-none ${
          fullOnMobile
            ? "max-h-[96vh] rounded-t-2xl sm:rounded-2xl"
            : "max-h-[92vh] rounded-t-2xl sm:rounded-2xl"
        } flex flex-col overflow-hidden ${
          wide ? "sm:max-w-3xl" : "sm:max-w-md"
        } max-w-full focus-visible:ring-2 focus-visible:ring-[#F59E0B]`}
      >
        <div className="flex items-center justify-between border-b border-[#E2E8F0] px-4 py-3">
          <h2 className="text-base font-extrabold text-[#0F172A]">{label}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-[#0F172A]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}
