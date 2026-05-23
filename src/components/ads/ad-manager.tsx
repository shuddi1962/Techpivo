"use client"

import type { ReactNode } from "react"
import { AdSlot } from "./ad-slot"
import type { AdPosition } from "@/types/database"
import { cn } from "@/lib/utils"

interface AdPlacement {
  position: AdPosition
  afterIndex?: number
  afterSelector?: string
  className?: string
}

interface AdManagerProps {
  children: ReactNode
  placements?: AdPlacement[]
  className?: string
}

const defaultPlacements: AdPlacement[] = [
  { position: "home_top_banner", afterIndex: 0, className: "my-6" },
  { position: "home_infeed_1", afterIndex: 3, className: "my-8" },
  { position: "home_infeed_2", afterIndex: 6, className: "my-8" },
  { position: "home_sidebar_top", afterSelector: "[data-sidebar]", className: "mb-6" },
  { position: "post_in_content_1", afterIndex: 4, className: "my-8" },
  { position: "post_in_content_2", afterIndex: 8, className: "my-8" },
]

export function AdManager({ children, placements = defaultPlacements, className }: AdManagerProps) {
  return (
    <div className={cn("ad-manager", className)}>
      <div data-content>
        {children}
      </div>

      {placements.map((placement) => (
        <div
          key={placement.position}
          data-ad-placement={placement.position}
          className={placement.className}
        >
          <AdSlot position={placement.position} />
        </div>
      ))}

      <AdSlot position="global_exit_intent" />
    </div>
  )
}
