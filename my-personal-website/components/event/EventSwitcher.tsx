"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "motion/react"
import type { EventRow } from "@/lib/types"

interface Props {
  currentEvent: EventRow
  events: EventRow[]
}

export default function EventSwitcher({ currentEvent, events }: Props) {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  return (
    <div className="fixed top-4 left-4 z-50">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 bg-black/70 backdrop-blur-sm border border-white/10 text-white text-sm px-3 py-1.5 rounded-full hover:bg-white/10 transition"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
        {currentEvent.name}
        <span className="text-white/40">↕</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mt-2 bg-black/90 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden min-w-52"
          >
            {events
              .filter((e) => e.slug !== currentEvent.slug)
              .map((e) => (
                <button
                  key={e.id}
                  onClick={() => {
                    router.push(`/event/${e.slug}/wall`)
                    setOpen(false)
                  }}
                  className="w-full flex items-center justify-between px-4 py-3 text-sm text-white hover:bg-white/10 transition"
                >
                  <span>{e.name}</span>
                  <span className="text-white/30 text-xs">
                    {e.uploads?.[0]?.count ?? 0} photos
                  </span>
                </button>
              ))}
            <a
              href="/events"
              className="block px-4 py-3 text-xs text-white/30 border-t border-white/10 hover:text-white/60 transition"
            >
              View all events →
            </a>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
