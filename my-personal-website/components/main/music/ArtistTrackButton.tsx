import { Dispatch, SetStateAction } from 'react'

const ArtistTrackButton = ({ activeTab, setActiveTab }: { activeTab: string, setActiveTab: Dispatch<SetStateAction<"artists" | "tracks">> }) => {
    return (
        <div className="flex gap-2 mb-5">
            {(["artists", "tracks"] as const).map((tab) => (
                <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-1.5 rounded-full text-xs font-mono transition-all ${activeTab === tab
                        ? "bg-yellow-300 text-black"
                        : "bg-white/5 text-white/40 hover:text-white hover:cursor-pointer"
                        }`}
                >
                    top {tab}
                </button>
            ))}
        </div>
    )
}

export default ArtistTrackButton
