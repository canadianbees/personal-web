import { Applemusic, Spotify } from '@styled-icons/simple-icons';
import { motion } from 'motion/react';
import React from 'react'

const ArtistBar = ({ name, plays, hours, max, index, spotifyUrl, appleMusicUrl }: {
  name: string; plays: number; hours: number; max: number; index: number
  spotifyUrl: string; appleMusicUrl: string
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.05 }}
      className="flex items-center gap-2 group w-full"
    >
      <span className="text-white/20 text-xs font-mono w-4 shrink-0">{index + 1}</span>
      <div className="flex-1 min-w-0 ">
        <div className="flex items-center justify-between mb-1 gap-2 ">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-white text-xs font-mono group-hover:text-yellow-300 transition-colors truncate">
              {name}
            </span>
            <a href={spotifyUrl} target="_blank" rel="noopener noreferrer"
              className="text-white/20 hover:text-[#1DB954] transition-colors shrink-0">
              <Spotify size={10} />
            </a>
            <a href={appleMusicUrl} target="_blank" rel="noopener noreferrer"
              className="text-white/20 hover:text-[#FC3C44] transition-colors shrink-0">
              <Applemusic size={10} />
            </a>
          </div>
          <span className="text-white/40 text-xs font-mono shrink-0">{plays.toLocaleString()}</span>
        </div>
        <div className="h-1 bg-white/5 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            whileInView={{ width: `${(plays / max) * 100}%` }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.05 + 0.2, duration: 0.6 }}
            className="h-full bg-yellow-300 rounded-full"
          />
        </div>
      </div>
      <span className="text-white/30 text-xs font-mono w-10 text-right shrink-0">{hours}h</span>
    </motion.div>
  )
}

export default ArtistBar
