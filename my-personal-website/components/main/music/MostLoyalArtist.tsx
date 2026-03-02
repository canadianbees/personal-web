"use client"
import { AnimatePresence, motion } from "motion/react"
import { LoyalArtist } from "../utils/types"
import { useState } from "react"
import { pickRandom } from "./music_utils"

interface MostLoyalArtistProps {
  loyalArtists: LoyalArtist[]
  allYears: string[]
}

const MAX_SELECTED = 5

const ArtistRow = ({
  artist,
  index,
  allYears,
  maxYearlyPlays,
}: {
  artist: LoyalArtist
  index: number
  allYears: string[]
  maxYearlyPlays: number
}) => (
  <motion.div
    layout
    key={artist.name}
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: 20 }}
    transition={{ delay: index * 0.04 }}
    className="group rounded-xl p-3 border border-yellow-300/10 bg-yellow-300/3"
  >
    {/* Artist name row */}
    <div className="flex items-center justify-between mb-2">
      <span className="text-white text-sm font-mono group-hover:text-yellow-300 transition-colors">
        {artist.name}
      </span>
      <div className="flex items-center gap-3">
        <span className="text-white/30 text-xs font-mono">
          {artist.totalPlays.toLocaleString()} plays
        </span>
        <span className="text-white/80 text-xs font-mono font-bold">
          {artist.yearsActive}y
        </span>
      </div>
    </div>

    {/* Year bars */}
    <div className="flex gap-1 items-end h-10">
      {allYears.map((year) => {
        const plays = artist.yearlyPlays[year] || 0
        const heightPercent = plays > 0 ? Math.max(8, (plays / maxYearlyPlays) * 100) : 0

        return (
          <div
            key={year}
            className="relative flex-1 flex flex-col justify-end h-full group/cell"
          >
            {plays > 0 && (
              <div className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 hidden group-hover/cell:flex flex-col items-center z-50 pointer-events-none">
                <div className="bg-black/90 border border-white/10 rounded-md px-2 py-1 text-xs font-mono whitespace-nowrap">
                  <p className="text-yellow-300 font-bold">{plays} plays</p>
                  <p className="text-white/40">{year}</p>
                </div>
                <div className="w-1 h-1 bg-black/90 rotate-45 -mt-0.5 border-r border-b border-white/10" />
              </div>
            )}
            <div
              style={{ height: plays > 0 ? `${heightPercent}%` : "12%" }}
              className={`w-full rounded-sm transition-all ${plays > 0
                ? "bg-yellow-300 group-hover/cell:bg-yellow-200"
                : "bg-white/5"
                }`}
            />
            <p className="text-white/20 text-[9px] font-mono text-center mt-0.5 leading-none">
              {year.slice(2)}
            </p>
          </div>
        )
      })}
    </div>
  </motion.div>
)

export default function MostLoyalArtist({ loyalArtists, allYears }: MostLoyalArtistProps) {
  const [displayed, setDisplayed] = useState<LoyalArtist[]>(() => pickRandom(loyalArtists))

  const maxYearlyPlays = Math.max(
    ...loyalArtists.flatMap((artist) => Object.values(artist.yearlyPlays))
  )

  const reroll = () => setDisplayed(pickRandom(loyalArtists))

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-lg mt-15"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <p className="text-white/40 text-xs uppercase tracking-widest">artist loyalty</p>
          <p className="text-white/20 text-xs font-mono mt-1">bar height = plays that year</p>
        </div>
        <button
          onClick={reroll}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-yellow-300/10 border border-yellow-300/20 text-yellow-300 text-xs font-mono hover:bg-yellow-300/20 transition-all"
        >
          🎲
        </button>
      </div>

      <AnimatePresence mode="popLayout">
        <div className="flex flex-col gap-2">
          {displayed.map((artist, index) => (
            <ArtistRow
              key={artist.name}
              artist={artist}
              index={index}
              allYears={allYears}
              maxYearlyPlays={maxYearlyPlays}
            />
          ))}
        </div>
      </AnimatePresence>
    </motion.div>
  )
}

