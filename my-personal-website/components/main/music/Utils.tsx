import React from 'react'

const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null
    return (
        <div className="bg-black/80 border border-yellow-300/20 rounded-lg px-3 py-2 text-xs font-mono">
            <p className="text-yellow-300">{label}</p>
            <p className="text-white">{payload[0].value.toLocaleString()} {payload[0].name}</p>
        </div>
    )
}

export default CustomTooltip
