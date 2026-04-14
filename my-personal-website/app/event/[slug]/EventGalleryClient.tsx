"use client"
import { useState } from "react"
import type { UploadRow } from "@/lib/types"
import TileOverlay from "@/components/event/TileOverlay"

function eventFileUrl(path: string | null | undefined): string {
  if (!path) return ""
  if (path.startsWith("http")) return path
  return `/api/event_file?path=${encodeURIComponent(path)}`
}

interface Props {
  uploads: UploadRow[]
}

export default function EventGalleryClient({ uploads }: Props) {
  const [selected, setSelected] = useState<UploadRow | null>(null)

  return (
    <>
      <div className="columns-2 md:columns-3 gap-2 space-y-2">
        {uploads.map((upload) => (
          <div
            key={upload.id}
            className="relative cursor-pointer break-inside-avoid rounded-lg overflow-hidden group"
            onClick={() => setSelected(upload)}
          >
            <img
              src={eventFileUrl(upload.thumb_url ?? upload.full_url)}
              alt=""
              className="w-full group-hover:opacity-80 transition"
            />
            {upload.comments && upload.comments.length > 0 && (
              <span className="absolute top-2 right-2 bg-purple-500 text-white text-xs px-2 py-0.5 rounded-full">
                💬 {upload.comments.length}
              </span>
            )}
            {upload.media_type === "video" && (
              <span className="absolute inset-0 flex items-center justify-center text-white/70 text-3xl pointer-events-none">
                ▶
              </span>
            )}
          </div>
        ))}
      </div>

      {selected && (
        <TileOverlay upload={selected} onClose={() => setSelected(null)} />
      )}
    </>
  )
}
