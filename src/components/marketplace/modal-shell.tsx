// TechPivo Market shared modal shell (CLIENT) — consistent overlay, Escape,
// outside-click, scroll-lock, focus restore for cart popup, Quick View, and
// checkout modal. No business logic here.

import { useEffect, useRef } from "react"
import { X } from "lucide-react"

export function ModalShell({
  label,
  onClose,
  children,
  size,
  fullOnMobile,
}: {
  label: string
  onClose: () => void
  children: React.ReactNode
  /** md = portrait dialog · lg = landscape (cart, quick view) · xl = roomy landscape (checkout) */
  size?: "md" | "lg" | "xl"
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
      className="fixed inset-0 z-[80] flex items-end justify-center bg-[#0B0F19]/60 p-0 backdrop-blur-[3px] animate-[fadeIn_0.2s_ease-out] sm:items-center sm:p-4"
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
        className={`w-full bg-white shadow-[0_32px_90px_rgba(11,15,25,0.4)] outline-none animate-[slideUp_0.3s_cubic-bezier(0.22,1,0.36,1)] ${
          fullOnMobile
            ? "max-h-[96vh] rounded-t-3xl sm:rounded-3xl"
            : "max-h-[92vh] rounded-t-3xl sm:rounded-3xl"
        } flex flex-col overflow-hidden ${
          size === "xl" ? "sm:max-w-4xl" : size === "lg" ? "sm:max-w-2xl" : "sm:max-w-md"
        } max-w-full focus-visible:ring-2 focus-visible:ring-[#0B0F19]`}
      >
        <div className="flex items-center justify-between px-4 py-3.5 sm:px-5">
          <h2 className="text-[15px] font-extrabold tracking-tight text-[#0B0F19]">{label}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F6F7F9] text-[#64748B] transition-colors hover:bg-[#E9EBF1] hover:text-[#0B0F19]"
          >
            <X className="h-4 w-4" strokeWidth={2.5} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}
