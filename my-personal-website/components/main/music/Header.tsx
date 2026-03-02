import { motion } from 'motion/react'
import { ProcessedData } from '../utils/types'

const Header = ({ startYear, endYear, data }: { startYear: string, endYear: string, data: ProcessedData }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: -20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
        >
            <p className="text-white/30 text-xs uppercase tracking-[0.3em] mb-2">
                {startYear} — {endYear}
            </p>
            <h2 className="text-4xl md:text-6xl font-bold text-yellow-300">my listening history</h2>
            <p className="text-white/40 text-sm mt-2">
                {data.totalStats.totalPlays.toLocaleString()} streams across {data.totalStats.yearsActive} years
            </p>
        </motion.div>
    )
}

export default Header
