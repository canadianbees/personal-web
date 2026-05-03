"use client"
import type { EventRow } from "@/lib/types"

interface Props {
  currentEvent: EventRow
}

export default function EventSwitcher({ currentEvent }: Props) {
  return (
    <div className="fixed top-4 left-4 z-50">
      <div className="flex items-center gap-2 bg-black/70 backdrop-blur-sm border border-white/10 text-white text-sm px-3 py-1.5 rounded-full">
        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
        {currentEvent.name}
      </div>
    </div>
  )
}
