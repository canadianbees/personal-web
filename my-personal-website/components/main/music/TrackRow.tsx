import { motion } from 'motion/react'
import React, { useEffect, useRef, useState } from 'react'

const TrackRow = ({ name, artist, plays, index, currentlyPlayingId, onPlay }: {
    name: string; artist: string; plays: number; index: number
    currentlyPlayingId: string | null
    onPlay: (id: string | null) => void
}) => {

    const trackId = `${name}-${artist}` // unique ID for this track
    const playing = currentlyPlayingId === trackId  // ← derived, not state

    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    const audioRef = useRef<HTMLAudioElement | null>(null)

    // Stop audio when another track takes over
    useEffect(() => {
        if (currentlyPlayingId !== trackId && audioRef.current) {
            audioRef.current.pause()
            audioRef.current.currentTime = 0
        }
    }, [currentlyPlayingId, trackId])

    const fetchPreview = async () => {
        if (previewUrl) return
        try {
            const res = await fetch(
                `https://itunes.apple.com/search?term=${encodeURIComponent(`${name} ${artist}`)}&media=music&limit=1`
            )
            const data = await res.json()
            if (data.results?.[0]?.previewUrl) {
                setPreviewUrl(data.results[0].previewUrl)
            }
        } catch { }
    }

    const togglePlay = async (e: React.MouseEvent) => {
        e.stopPropagation()
        await fetchPreview()
        if (!audioRef.current) return

        if (playing) {
            audioRef.current.pause()
            onPlay(null)
        } else {
            audioRef.current.play()
            onPlay(trackId)
            audioRef.current.onended = () => onPlay(null)
        }
    }

    useEffect(() => {
        if (previewUrl && audioRef.current) {
            audioRef.current.src = previewUrl
        }
    }, [previewUrl])

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.05 }}
            className="relative h-10.5 flex items-center gap-3 py-2 border-b border-white/5 group hover:border-yellow-300/20 transition-colors"
        >
            <audio ref={audioRef} />
            <button
                onClick={togglePlay}
                className="text-white/20 hover:text-yellow-300 transition-colors shrink-0 w-5 flex items-center justify-center"
            >
                {playing ? (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                        <rect x="2" y="1" width="3" height="10" rx="1" />
                        <rect x="7" y="1" width="3" height="10" rx="1" />
                    </svg>
                ) : (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                        <path d="M2 1.5l9 4.5-9 4.5V1.5z" />
                    </svg>
                )}
            </button>
            <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-mono truncate group-hover:text-yellow-300 transition-colors">{name}</p>
                <p className="text-white/40 text-xs font-mono truncate">{artist}</p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
                <div className="w-1 h-1 rounded-full bg-yellow-300/40" />
                <span className="text-white/40 text-xs font-mono">{plays}</span>
            </div>
        </motion.div>
    )

}

export default TrackRow
