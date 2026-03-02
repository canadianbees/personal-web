import React from 'react'
import { ResponsiveContainer, BarChart, XAxis, YAxis, Tooltip, Bar } from 'recharts'
import CustomTooltip from './Utils'
import { ProcessedData } from '../utils/types'

interface ChartsProps {
    data: ProcessedData
    peakHour: { hour: string; mins: number }
    className?: string
}

const Charts = ({ data, peakHour, className = "" }: ChartsProps) => {
    // Find the hour with the most skips for the label
    const peakSkipHour = data.skipsByHour.reduce(
        (max, h) => (h.skipCount > max.skipCount ? h : max),
        data.skipsByHour[0]
    )
    
    return (
        <div className={`flex flex-col gap-6 ${className}`}>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-lg">
                <p className="text-white/40 text-xs uppercase tracking-widest mb-4">
                    hours listened per year
                </p>
                <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={data.yearlyData} barSize={28}>
                        <XAxis
                            dataKey="year"
                            tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11, fontFamily: "monospace" }}
                            axisLine={false}
                            tickLine={false}
                        />
                        <YAxis hide />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                        <Bar dataKey="hours" fill="#fde047" radius={[4, 4, 0, 0]} name="hours" />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-lg">
                <p className="text-white/40 text-xs uppercase tracking-widest mb-4">
                    when i listen — by hour
                </p>
                <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={data.hourlyData} barSize={8}>
                        <XAxis
                            dataKey="hour"
                            tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 9, fontFamily: "monospace" }}
                            axisLine={false}
                            tickLine={false}
                            interval={3}
                        />
                        <YAxis hide />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                        <Bar
                            dataKey="mins"
                            name="mins"
                            radius={[2, 2, 0, 0]}
                            fill="#fde047"
                        />
                        
                    </BarChart>
                </ResponsiveContainer>
                <p className="text-white/50 text-xs mt-2 text-center">
                    peak listening: {peakHour.hour} 🎧
                </p>
    
            </div>
        </div>
    )
}

export default Charts