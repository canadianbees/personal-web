"use client"
import { useState, useEffect } from "react"
import { motion } from "motion/react"
import Link from "next/link"
import type { FencingData } from "@/app/api/fencing/route"

// USFA letter ratings highest → lowest: A B C D E U
const RATING_COLORS: Record<string, string> = {
  A: "text-yellow-300 border-yellow-300/40",
  B: "text-slate-300 border-slate-300/40",
  C: "text-amber-600 border-amber-600/40",
  D: "text-emerald-400 border-emerald-400/40",
  E: "text-sky-400 border-sky-400/40",
  U: "text-white/40 border-white/20",
}

const WEAPON_ICONS: Record<string, string> = {
  Foil: "⚔",
  Epee: "🤺",
  Saber: "🗡",
}

function ratingColor(r: string) {
  return RATING_COLORS[r] ?? RATING_COLORS["U"]
}

export default function FencingPage() {
  const [data, setData] = useState<FencingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/fencing")
      .then((r) => r.json())
      .then((d: FencingData & { error?: string }) => {
        if (d.error) throw new Error(d.error)
        setData(d)
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen w-full font-mono py-20 px-4 md:px-10">
      {/* Back link — springs in from the right, bounces at rest */}
      <motion.div
        initial={{ x: 120, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{
          x: { type: "spring", stiffness: 220, damping: 7, mass: 1.4 },
          opacity: { duration: 0.1 },
        }}
        className="inline-block mb-10"
      >
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-white/40 hover:text-yellow-300 transition-colors text-xs"
        >
          ← back
        </Link>
      </motion.div>

      {/* Header */}
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-10"
        >
          <h1 className="text-4xl md:text-6xl font-bold text-yellow-300 mb-2">fencing</h1>
          {data?.club && (
            <p className="text-white/40 text-sm">{data.club}</p>
          )}
          <p className="text-white/25 text-xs mt-1">
            via{" "}
            <a
              href="https://fencingtracker.com/p/100317525/Celina-Alzenor"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white/60 transition-colors underline underline-offset-2"
            >
              fencingtracker.com
            </a>
          </p>
        </motion.div>

        {/* Loading */}
        {loading && (
          <motion.div
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="text-yellow-300 text-sm"
          >
            loading fencing stats...
          </motion.div>
        )}

        {/* Error */}
        {error && (
          <p className="text-red-400 text-sm">failed to load: {error}</p>
        )}

        {data && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="space-y-8"
          >
            {/* Weapon Ratings */}
            <section>
              <h2 className="text-xs text-white/30 uppercase tracking-widest mb-4">
                current ratings
              </h2>
              <div className="grid grid-cols-3 gap-3 max-w-md">
                {data.ratings.map((r) => (
                  <div
                    key={r.weapon}
                    className={`bg-white/5 border rounded-2xl p-4 backdrop-blur-lg flex flex-col items-center gap-1 ${ratingColor(r.rating)}`}
                  >
                    <span className="text-lg" aria-hidden="true">
                      {WEAPON_ICONS[r.weapon] ?? "⚔"}
                    </span>
                    <span className="text-[10px] text-white/40">{r.weapon}</span>
                    <span className={`text-3xl font-bold ${ratingColor(r.rating).split(" ")[0]}`}>
                      {r.rating}
                    </span>
                    <span className="text-[9px] text-white/25">{r.date}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* Win / Loss Stats */}
            {(data.wlRows?.length ?? 0) > 0 && (
              <section>
                <h2 className="text-xs text-white/30 uppercase tracking-widest mb-4">
                  win / loss statistics
                </h2>
                <div className="bg-white/5 border border-white/10 rounded-2xl backdrop-blur-lg overflow-x-auto max-w-6xl">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/10 text-[10px] text-white/30 uppercase tracking-widest">
                        <th className="text-left px-5 py-3 font-normal w-36"></th>
                        {data.wlSeasons.map((s) => (
                          <th key={s} className="text-right px-4 py-3 font-normal whitespace-nowrap">
                            {s}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.wlRows.map((row) => {
                        const isRatio = row.label.toLowerCase().includes("ratio")
                        return (
                          <tr
                            key={row.label}
                            className={`border-b border-white/5 last:border-0 ${isRatio ? "bg-white/[0.03]" : ""}`}
                          >
                            <td className={`px-5 py-2.5 whitespace-nowrap ${isRatio ? "text-white/50" : "text-white/70"}`}>
                              {row.label}
                            </td>
                            {row.values.map((v, i) => (
                              <td
                                key={i}
                                className={`px-4 py-2.5 text-right tabular-nums whitespace-nowrap ${
                                  v === "-" ? "text-white/20" : isRatio ? "text-yellow-300/80" : "text-white/80"
                                }`}
                              >
                                {v}
                              </td>
                            ))}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* Tournament Results */}
            <section>
              <h2 className="text-xs text-white/30 uppercase tracking-widest mb-4">
                tournament results
              </h2>
              <div className="bg-white/5 border border-white/10 rounded-2xl backdrop-blur-lg overflow-hidden max-w-6xl">
                {/* Desktop table */}
                <table className="w-full text-sm hidden sm:table">
                  <thead>
                    <tr className="border-b border-white/10 text-[10px] text-white/30 uppercase tracking-widest">
                      <th className="text-left px-5 py-3 font-normal">date</th>
                      <th className="text-left px-5 py-3 font-normal">tournament</th>
                      <th className="text-left px-5 py-3 font-normal">event</th>
                      <th className="text-right px-5 py-3 font-normal">place</th>
                      <th className="text-right px-5 py-3 font-normal">class</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.results.map((r, i) => (
                      <tr
                        key={`${r.dateValue}-${i}`}
                        className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors"
                      >
                        <td className="px-5 py-3 text-white/40 whitespace-nowrap">{r.date}</td>
                        <td className="px-5 py-3 text-white/80">{r.tournament}</td>
                        <td className="px-5 py-3 text-white/50">{r.event}</td>
                        <td className="px-5 py-3 text-right text-white/80 whitespace-nowrap tabular-nums">
                          {r.placement}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <span className={`text-xs font-bold ${ratingColor(r.eventClass).split(" ")[0]}`}>
                            {r.eventClass || "—"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Mobile cards */}
                <div className="sm:hidden divide-y divide-white/5">
                  {data.results.map((r, i) => (
                    <div key={`${r.dateValue}-${i}`} className="px-4 py-3 space-y-1">
                      <div className="flex justify-between items-start gap-2">
                        <span className="text-white/80 text-sm">{r.tournament}</span>
                        <span className={`text-xs font-bold shrink-0 ${ratingColor(r.eventClass).split(" ")[0]}`}>
                          {r.eventClass || "—"}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs text-white/40">
                        <span>{r.event}</span>
                        <span className="tabular-nums">{r.placement}</span>
                      </div>
                      <p className="text-[10px] text-white/25">{r.date}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </motion.div>
        )}
      </div>
    </div>
  )
}
