import { motion } from 'motion/react';
import { ProcessedData } from '../utils/types';

const StatCard = ({ label, value, sub }: { label: string; value: string; sub?: string }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-white/5 border border-white/10 rounded-xl p-4 font-mono backdrop-blur-lg"
        >
            <p className="text-white/40 text-xs uppercase tracking-widest mb-1">{label}</p>
            <p className="text-yellow-300 text-2xl font-bold truncate">{value}</p>
            {sub && <p className="text-white/40 text-xs mt-1">{sub}</p>}
        </motion.div>
    )
}


const StatCards = ({ data }: { data: ProcessedData }) => {
    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10 max-w-6xl mx-auto">
            <StatCard label="total hours" value={data.totalStats.totalHours.toLocaleString()} sub="of music" />
            <StatCard label="total streams" value={`${Math.round(data.totalStats.totalPlays / 1000)}k+`} sub="songs played" />
            <StatCard label="top artist" value={data.totalStats.topArtist} sub={`${data.topArtists[0]?.plays.toLocaleString()} plays`} />
            <StatCard label="top track" value={data.totalStats.topTrack} sub={`${data.topTracks[0]?.plays} plays`} />
        </div>
    )
}

export default StatCards
