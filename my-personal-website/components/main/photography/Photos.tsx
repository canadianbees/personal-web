"use client"
import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "motion/react"
import Image from "next/image"

interface PhotoItem {
    id: string
    url: string
    title: string
    subtitle: string
}

export default function PhotoGallery({ initialItems = [] }: { initialItems?: PhotoItem[] }) {
    const [items, setItems] = useState<PhotoItem[]>(initialItems)
    const [selectedId, setSelectedId] = useState<string | null>(null)
    const [loading, setLoading] = useState(initialItems.length === 0)
    const [visibleItems, setVisibleItems] = useState(7);

    useEffect(() => {
        const fetchImages = async () => {
            try {
                const res = await fetch("/api/gallery")
                const data = await res.json()
                console.log("API Data:", data);
                setItems(data.images)
            } catch (e) {
                console.error("Failed to load gallery images", e)
            } finally {
                setLoading(false)
            }
        }
        fetchImages()
    }, [])

    const selectedItem = items.find((item) => item.id === selectedId)

    return (
        <div className="flex flex-col  gap-10 w-full min-h-screen font-mono py-20 px-4 md:px-10">
            <div className="max-w-6xl mx-auto">
                <h2 className="text-white/20 text-xs uppercase tracking-widest mb-10 text-center">
                    Photo Gallery
                </h2>

                {loading ? (
                    <div className="flex items-center justify-center h-96 text-yellow-300 text-sm">
                        scanning images...
                    </div>
                ) : (
                    <div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
                        {items.slice(0, visibleItems).map((item) => (
                            <motion.div
                                key={item.id}
                                layoutId={item.id}
                                onClick={() => setSelectedId(item.id)}
                                className="relative break-inside-avoid cursor-pointer group rounded-xl overflow-hidden border border-white/10 bg-white/5"
                                whileHover={{ y: -5 }}
                            >
                                <Image
                                    src={item.url}
                                    alt={item.title}
                                    width={500}
                                    height={500}
                                    className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-105"
                                />

                                {/* Hover Overlay */}
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                                    <p className="text-white font-bold text-xs truncate">{item.title}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>

            {/* Lightbox / Modal */}
            <motion.div>
                {selectedId && selectedItem && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-10">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedId(null)}
                            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                        />

                        <motion.div
                            layoutId={selectedId}
                            className="relative max-w-4xl w-full bg-[#121212] border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
                        >
                            <div className="flex flex-col md:flex-row">
                                <div className="w-full md:w-2/3 bg-black flex items-center justify-center p-2">
                                    <img
                                        src={selectedItem.url}
                                        alt={selectedItem.title}
                                        className="max-h-[70vh] w-auto object-contain rounded-2xl"
                                    />
                                </div>

                                <div className="w-full md:w-1/3 p-8 flex flex-col justify-center">
                                    <h2 className="text-xl font-bold text-white mb-2 tracking-tight">{selectedItem.title}</h2>
                                    <p className="text-white/40 uppercase tracking-widest text-[10px] mb-6">
                                        {selectedItem.subtitle}
                                    </p>

                                    <button
                                        onClick={() => setSelectedId(null)}
                                        className="mt-auto px-6 py-2 border border-white/20 text-white/60 hover:text-white hover:border-white transition-colors rounded-full text-xs"
                                    >
                                        CLOSE
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </motion.div>
            <button
                className="self-center backdrop-blur-lg flex items-center gap-1.5 px-6 py-2 rounded-full bg-yellow-300/10 border border-yellow-300/20 text-yellow-300 text-xs font-mono hover:bg-yellow-300/20 transition-all"
                onClick={() => setVisibleItems(prev => prev + 20)}
            >
                load more
            </button>
        </div>
    )
}