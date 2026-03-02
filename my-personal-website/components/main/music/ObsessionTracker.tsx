"use client"
import { motion } from "motion/react"
import { MonthlyObsession } from "../utils/types"
import { getArtistColor, formatMonth } from "./music_utils"
import { useState } from "react"


interface ObsessionTrackerProps {
  monthlyObsessions: MonthlyObsession[] | undefined
  className?: string
}

const Legend = ({ obsessions }: { obsessions: MonthlyObsession[] }) => {
  const uniqueArtists = [...new Set(obsessions.map((o) => o.artist))]
  return (
    <div className="flex flex-wrap gap-2 mt-4">
      {uniqueArtists.map((artist) => (
        <div key={artist} className="flex items-center gap-1.5">
          <div
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: getArtistColor(artist) }}
          />
          <span className="text-white/40 text-xs font-mono">{artist}</span>
        </div>
      ))}
    </div>
  )
}

export default function ObsessionTracker({ monthlyObsessions, className = "" }: ObsessionTrackerProps) {

  const [show, setShow] = useState(false);

  if (!monthlyObsessions) {
    return
  }

  const maxPlays = Math.max(...monthlyObsessions.map((o) => o.plays))

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className={`bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-lg ${className}`}
    >
      <div className="mb-4">
        <p className="text-white/40 text-xs uppercase tracking-widest">obsession tracker</p>
        <p className="text-white/20 text-xs font-mono mt-1">dominant artist each month</p>
      </div>

      {/* Timeline wrapper */}
      <div className="overflow-x-auto">

        <div className="flex flex-col min-w-max">

          {/* Bars row */}
          <div className="flex items-end gap-0.75 h-32">
            {monthlyObsessions.map((obsession, index) => {
              const color = getArtistColor(obsession.artist)
              const heightPercent = (obsession.plays / maxPlays) * 100

              return (
                <motion.div
                  key={obsession.month}
                  initial={{ height: 0, opacity: 0 }}
                  whileInView={{ height: "100%", opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.01, duration: 0.4 }}
                  className="relative min-w-[8px] w-[8px] flex items-end group cursor-pointer"
                >
                  {/* Tooltip */}
                  <div className={`absolute mb-15 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center z-100 pointer-events-none`}
                  >
                    <div className="bg-black/90 border border-white/10 rounded-lg px-2 py-1.5 text-xs font-mono whitespace-nowrap">
                      <p style={{ color }} className="font-bold">{obsession.artist}</p>
                      <p className="text-white/60">{formatMonth(obsession.month)}</p>
                      <p className="text-white/40">{obsession.plays} plays</p>
                    </div>
                    <div className="w-1.5 h-1.5 bg-black/90 rotate-45 -mt-1 border-r border-b border-white/10" />
                  </div>

                  {/* Bar */}
                  <div
                    className="w-full rounded-t-sm transition-opacity group-hover:opacity-100 opacity-80"
                    style={{
                      height: `${heightPercent}%`,
                      backgroundColor: color,
                      minHeight: "4px",
                    }}
                  />
                </motion.div>
              )
            })}
          </div>

          {/* Year markers row */}
          <div className="flex gap-[3px] mt-1">
            {monthlyObsessions.map((obsession) => {
              const isJanuary = obsession.month.endsWith("-01")
              return (
                <div key={obsession.month} className="min-w-[8px] w-[8px]">
                  {isJanuary && (
                    <p className="text-white/20 text-[9px] font-mono">
                      {obsession.month.slice(0, 4)}
                    </p>
                  )}
                </div>
              )
            })}
          </div>

        </div>
      </div>
    </motion.div>
  )
}
