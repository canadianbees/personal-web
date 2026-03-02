"use client"
import { useState, useEffect, useRef } from "react"
import { motion } from "motion/react"
import { ProcessedData, StreamEntry } from "../utils/types"
import StatCards from "./StatCard"
import Header from "./Header"
import Charts from "./Charts"
import ArtistBar from "./ArtistBar"
import { processData } from "./music_utils"
import TrackRow from "./TrackRow"
import ArtistTrackButton from "./ArtistTrackButton"
import ObsessionTracker from "./ObsessionTracker"
import MostLoyalArtist from "./MostLoyalArtist"

export default function SpotifySection() {
  const [data, setData] = useState<ProcessedData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"artists" | "tracks">("artists")
  const [currentlyPlayingId, setCurrentlyPlayingId] = useState<string | null>(null)


  useEffect(() => {
    const load = async () => {
      try {
        const { files } = await fetch("/api/spotify_files").then((r) => r.json())
        console.log("files found:", files.length)

        const results = await Promise.allSettled(
          files.map((f: string) => fetch(f).then((r) => r.json()))
        )

        const succeeded = results.filter((r) => r.status === "fulfilled")
        const failed = results.filter((r) => r.status === "rejected")
        console.log("succeeded:", succeeded.length, "failed:", failed.length)

        const all: StreamEntry[] = (succeeded as PromiseFulfilledResult<StreamEntry[]>[])
          .flatMap((r) => r.value)

        console.log("total entries:", all.length)
        console.log("sample entry:", all[0])

        setData(processData(all))
      } catch (e) {
        console.error("Failed to load Spotify data", e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])
  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center font-mono">
        <motion.div
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="text-yellow-300 text-sm"
        >
          loading listening history...
        </motion.div>
      </div>
    )
  }

  if (!data) return null

  const maxPlays = data.topArtists[0]?.plays || 1
  const peakHour = data.hourlyData.reduce((max, h) => (h.mins > max.mins ? h : max), data.hourlyData[0])
  const startYear = data.yearlyData[0]?.year || ""
  const endYear = data.yearlyData[data.yearlyData.length - 1]?.year || ""

  return (
    <div className="min-h-screen w-full font-mono py-20 px-4 md:px-10">
      <Header startYear={startYear} endYear={endYear} data={data} />
      <StatCards data={data} />
      <div className="grid grid-cols-1 lg:grid-cols-2 lg:grid-rows-3 gap-6 max-w-6xl mx-auto">
        <div className="row-span-2 bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-lg h-129">
          <ArtistTrackButton activeTab={activeTab} setActiveTab={setActiveTab} />
          {activeTab === "artists" ? (
            <div className=" gap-3">
              {data.topArtists.map((a, i) => (
                <ArtistBar key={a.name} {...a} max={maxPlays} index={i} spotifyUrl={a.spotifyUrl} appleMusicUrl={a.appleMusicUrl} />
              ))}
            </div>
          ) : (
              <div className="">
              {data.topTracks.map((t, i) => (
                <TrackRow
                  key={t.name}
                  {...t}
                  index={i}
                  currentlyPlayingId={currentlyPlayingId}
                  onPlay={setCurrentlyPlayingId}
                />
              ))}

            </div>
          )}
        </div>
        <Charts className="hidden sm:flex row-span-2" data={data} peakHour={peakHour} />
        <ObsessionTracker className="col-span-2 row-start-3" monthlyObsessions={data.monthlyObsessions}  />
      </div>
      <MostLoyalArtist loyalArtists={data.loyalArtists} allYears={data.allYears} />
    </div>
  )
}
