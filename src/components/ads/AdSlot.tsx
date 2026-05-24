interface AdSlotProps {
  slot: string
  width: number
  height: number
  className?: string
}

export function AdSlot({ slot, width, height, className }: AdSlotProps) {
  return (
    <div className={"relative flex flex-col items-center justify-center py-4 " + (className || "")}>
      <span className="text-[10px] uppercase tracking-wider text-[#9CA3AF] mb-2">Advertisement</span>
      <div className="flex items-center justify-center bg-[#111827] border border-dashed border-[#1F2937] rounded-lg"
        style={{ width: width + "px", height: height + "px", maxWidth: "100%" }}>
        <div className="text-center">
          <p className="text-xs text-[#9CA3AF]">{width} x {height}</p>
          <p className="text-[10px] text-[#6B7280] mt-1">Ad Slot</p>
        </div>
      </div>
    </div>
  )
}
