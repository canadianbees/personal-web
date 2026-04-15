"use client"
import { useEffect, useState } from "react"
import { MessageCircle } from "lucide-react"
import { supabase } from "@/lib/supabase"
import type { UploadRow } from "@/lib/types"
import TileOverlay from "./TileOverlay"

function eventFileUrl(path: string | null | undefined): string {
  if (!path) return ""
  if (path.startsWith("http")) return path
  return `/api/event_file?path=${encodeURIComponent(path)}`
}

function getAr(upload: UploadRow) {
  return upload.width && upload.height ? upload.width / upload.height : 16 / 9
}

// Justified row layout: pack tiles into rows at targetH, scale each row to fill viewportW exactly.
type Row = { uploads: UploadRow[]; height: number }

function buildRows(uploads: UploadRow[], viewportW: number, targetH: number): Row[] {
  const rows: Row[] = []
  let row: UploadRow[] = []
  let rowW = 0

  for (const u of uploads) {
    const tileW = targetH * getAr(u)
    if (rowW + tileW > viewportW && row.length > 0) {
      const scale = viewportW / rowW
      rows.push({ uploads: row, height: targetH * scale })
      row = []
      rowW = 0
    }
    row.push(u)
    rowW += tileW
  }

  // Last row: scale to fill too so there's no partial row
  if (row.length > 0) {
    const scale = viewportW / rowW
    rows.push({ uploads: row, height: targetH * scale })
  }

  return rows
}

interface Props { eventId: string }

export default function MosaicWall({ eventId }: Props) {
  const [uploads,   setUploads]   = useState<UploadRow[]>([])
  const [counts,    setCounts]    = useState<Record<string, number>>({})
  const [selected,  setSelected]  = useState<UploadRow | null>(null)
  const [viewportW, setViewportW] = useState(1280)

  useEffect(() => {
    const update = () => setViewportW(window.innerWidth)
    update()
    window.addEventListener("resize", update)
    return () => window.removeEventListener("resize", update)
  }, [])

  useEffect(() => {
    supabase
      .from("uploads").select("*").eq("event_id", eventId).not("thumb_url", "is", null).order("uploaded_at")
      .then(({ data }) => {
        const arr = (data as UploadRow[]) ?? []
        for (let i = arr.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [arr[i], arr[j]] = [arr[j], arr[i]]
        }
        setUploads(arr)
      })

    const ch = supabase
      .channel(`wall-${eventId}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "uploads", filter: `event_id=eq.${eventId}` },
        (payload) => setUploads((prev) => [...prev, payload.new as UploadRow])
      )
      .on("postgres_changes",
        { event: "UPDATE", schema: "public", table: "uploads", filter: `event_id=eq.${eventId}` },
        (payload) => {
          const updated = payload.new as UploadRow
          setUploads((prev) => prev.map((u) => u.id === updated.id ? updated : u))
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(ch) }
  }, [eventId])

  useEffect(() => {
    if (!uploads.length) return
    supabase.from("comments").select("upload_id")
      .in("upload_id", uploads.map((u) => u.id))
      .then(({ data }) => {
        const map: Record<string, number> = {}
        ;(data ?? []).forEach((row: { upload_id: string }) => {
          map[row.upload_id] = (map[row.upload_id] ?? 0) + 1
        })
        setCounts(map)
      })
  }, [uploads])

  // Target ~2 rows visible at a time
  const targetH = typeof window !== "undefined" ? window.innerHeight * 0.5 : 400
  const readyUploads = uploads.filter((u) => u.thumb_url)
  const pendingUploads = uploads.filter((u) => !u.thumb_url)
  const rows = buildRows(readyUploads, viewportW, targetH)

  return (
    <>
      <div className="w-screen overflow-y-auto p-1 gap-1 flex flex-col">
        {rows.map((row, ri) => (
          <div key={ri} className="flex w-full gap-1" style={{ height: row.height }}>
            {row.uploads.map((upload) => (
              <div
                key={upload.id}
                className="relative overflow-hidden cursor-pointer flex-shrink-0 rounded-xl group/tile"
                style={{ width: row.height * getAr(upload) - 4, height: row.height }}
                onClick={() => setSelected(upload)}
              >
                {upload.media_type === "image" ? (
                  <img
                    src={eventFileUrl(upload.thumb_url ?? upload.full_url)}
                    alt=""
                    className="w-full h-full object-cover transition-[filter] duration-200 group-hover/tile:brightness-110"
                  />
                ) : (
                  <div className="w-full h-full">
                    <img
                      src={eventFileUrl(upload.thumb_url)}
                      alt=""
                      className="w-full h-full object-cover absolute inset-0 group-hover/tile:opacity-0 transition-opacity duration-200"
                    />
                    <video
                      src={eventFileUrl(upload.preview_url ?? upload.full_url)}
                      autoPlay loop muted playsInline
                      className="w-full h-full object-cover opacity-0 group-hover/tile:opacity-100 transition-opacity duration-200"
                    />
                  </div>
                )}
                {/* Hover border — inset so it's not clipped by overflow-hidden */}
                <div className="absolute inset-0 rounded-xl shadow-[inset_0_0_0_0px_rgba(255,255,255,0)] group-hover/tile:shadow-[inset_0_0_0_3px_rgba(255,255,255,0.75)] transition-all duration-200 pointer-events-none" />
                {(counts[upload.id] ?? 0) > 0 && (
                  <div className="absolute top-2 right-2 flex items-center gap-0.5 bg-black/50 backdrop-blur-sm rounded-full pl-1.5 pr-2 py-0.5">
                    <MessageCircle size={12} className="text-white/80 fill-white/20" />
                    <span className="text-white text-xs font-medium leading-none">{counts[upload.id]}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
        {pendingUploads.length > 0 && (
          <div className="flex gap-1">
            {pendingUploads.map((u) => (
              <div
                key={u.id}
                className="rounded-xl bg-white/10 animate-pulse flex-shrink-0"
                style={{ width: targetH * (16 / 9), height: targetH }}
              />
            ))}
          </div>
        )}
      </div>

      {selected && (
        <TileOverlay upload={selected} onClose={() => setSelected(null)} />
      )}
    </>
  )
}
