"use client"
// RLS policies required (run in Supabase SQL editor):
// create policy "events: auth insert" on events for insert with check (auth.role() = 'authenticated');
// create policy "events: auth delete" on events for delete using (auth.role() = 'authenticated');
// create policy "uploads: auth delete" on uploads for delete using (auth.role() = 'authenticated');
import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import type { EventRow, UploadRow } from "@/lib/types"

export default function AdminPage() {
  const [name, setName] = useState("")
  const [link, setLink] = useState("")
  const [events, setEvents] = useState<EventRow[]>([])
  const [creating, setCreating] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null)
  const [eventUploads, setEventUploads] = useState<Record<string, UploadRow[]>>({})
  const [confirmDeleteUpload, setConfirmDeleteUpload] = useState<string | null>(null)
  const [deletingUpload, setDeletingUpload] = useState<string | null>(null)

  useEffect(() => {
    supabase
      .from("events")
      .select("id, name, slug, upload_token, created_at, uploads(count)")
      .order("created_at", { ascending: false })
      .then(({ data }) => setEvents((data as EventRow[]) ?? []))
  }, [])

  const createEvent = async () => {
    if (!name.trim()) return
    setCreating(true)

    const slug =
      name.toLowerCase().replace(/\s+/g, "-") + "-" + new Date().getFullYear()

    const { data } = await supabase
      .from("events")
      .insert({ name, slug })
      .select()
      .single()

    if (data) {
      const url = `${window.location.origin}/event/${slug}/upload?token=${data.upload_token}`
      setLink(url)
      setEvents((prev) => [{ ...data, uploads: [{ count: 0 }] }, ...prev])
    }

    setName("")
    setCreating(false)
  }

  const toggleUploads = async (eventId: string) => {
    if (expandedEvent === eventId) {
      setExpandedEvent(null)
      return
    }
    setExpandedEvent(eventId)
    if (!eventUploads[eventId]) {
      const { data } = await supabase
        .from("uploads")
        .select("id, media_type, thumb_url, uploaded_at")
        .eq("event_id", eventId)
        .order("uploaded_at", { ascending: false })
      setEventUploads((prev) => ({ ...prev, [eventId]: (data as UploadRow[]) ?? [] }))
    }
  }

  const deleteUpload = async (uploadId: string, eventId: string) => {
    setDeletingUpload(uploadId)
    await fetch(`/api/admin/delete-upload?id=${uploadId}`, { method: "DELETE" })
    setEventUploads((prev) => ({
      ...prev,
      [eventId]: prev[eventId].filter((u) => u.id !== uploadId),
    }))
    setEvents((prev) =>
      prev.map((e) =>
        e.id === eventId
          ? { ...e, uploads: [{ count: Math.max(0, (e.uploads?.[0]?.count ?? 1) - 1) }] }
          : e
      )
    )
    setConfirmDeleteUpload(null)
    setDeletingUpload(null)
  }

  const deleteEvent = async (id: string) => {
    await supabase.from("events").delete().eq("id", id)
    setEvents((prev) => prev.filter((e) => e.id !== id))
    setConfirmDelete(null)
  }

  const copyToClipboard = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const el = document.createElement("textarea")
      el.value = text
      document.body.appendChild(el)
      el.select()
      document.execCommand("copy")
      document.body.removeChild(el)
    }
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <main className="relative z-10 min-h-screen bg-black/90 backdrop-blur-sm">
      <div className="max-w-2xl mx-auto p-6 sm:p-8">
      <h1 className="text-white text-3xl font-serif mb-8">admin</h1>

      {/* Create event */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-8">
        <h2 className="text-white/60 text-xs tracking-widest uppercase mb-4">new event</h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && createEvent()}
            placeholder="Sabrina Carpenter 2025"
            className="flex-1 bg-white/5 text-white placeholder-white/30 px-4 py-2 rounded-lg border border-white/10 focus:outline-none focus:border-white/30"
          />
          <button
            onClick={createEvent}
            disabled={creating || !name.trim()}
            className="bg-white/10 text-white px-5 py-2 rounded-lg hover:bg-white/20 transition disabled:opacity-40"
          >
            {creating ? "..." : "Generate ✨"}
          </button>
        </div>

        {link && (
          <div className="mt-4 p-4 bg-white/5 rounded-lg">
            <p className="text-white/40 text-xs mb-2">share this upload link:</p>
            <div className="flex items-center gap-3">
              <code className="text-white/80 text-sm flex-1 truncate font-mono">{link}</code>
              <button
                onClick={() => copyToClipboard(link, "generated")}
                className="text-xs text-white/60 border border-white/20 px-3 py-1 rounded hover:bg-white/10 transition shrink-0"
              >
                {copied === "generated" ? "Copied ✓" : "Copy 📋"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Past events */}
      <div>
        <h2 className="text-white/60 text-xs tracking-widest uppercase mb-4">past events</h2>
        <div className="flex flex-col gap-3">
          {events.map((e) => (
            <div
              key={e.id}
              className="flex flex-col gap-3 p-4 bg-white/5 border border-white/10 rounded-xl"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="text-white font-medium">{e.name}</p>
                <p className="text-white/40 text-sm">
                  {e.uploads?.[0]?.count ?? 0} uploads ·{" "}
                  {new Date(e.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => toggleUploads(e.id)}
                  className="flex-1 sm:flex-none text-xs text-white/50 hover:text-white border border-white/10 px-3 py-2 rounded transition"
                >
                  {expandedEvent === e.id ? "hide media" : "media"}
                </button>
                <a
                  href={`/event/${e.slug}/wall`}
                  className="flex-1 sm:flex-none text-center text-xs text-white/50 hover:text-white border border-white/10 px-3 py-2 rounded transition"
                >
                  wall →
                </a>
                <button
                  onClick={() =>
                    copyToClipboard(
                      `${window.location.origin}/event/${e.slug}/upload?token=${e.upload_token}`,
                      e.slug
                    )
                  }
                  className="flex-1 sm:flex-none text-xs text-white/50 hover:text-white border border-white/10 px-3 py-2 rounded transition"
                >
                  {copied === e.slug ? "Copied ✓" : "copy link"}
                </button>
                {confirmDelete === e.id ? (
                  <>
                    <button
                      onClick={() => deleteEvent(e.id)}
                      className="flex-1 sm:flex-none text-xs text-red-400 hover:text-red-300 border border-red-500/40 px-3 py-2 rounded transition"
                    >
                      confirm
                    </button>
                    <button
                      onClick={() => setConfirmDelete(null)}
                      className="flex-1 sm:flex-none text-xs text-white/30 hover:text-white/60 border border-white/10 px-3 py-2 rounded transition"
                    >
                      cancel
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setConfirmDelete(e.id)}
                    className="flex-1 sm:flex-none text-xs text-white/30 hover:text-red-400 border border-white/10 px-3 py-2 rounded transition"
                  >
                    delete
                  </button>
                )}
              </div>
              </div>

              {/* Expanded uploads grid */}
              {expandedEvent === e.id && (
                <div className="pt-2 border-t border-white/10">
                  {!eventUploads[e.id] ? (
                    <p className="text-white/30 text-xs py-2">loading...</p>
                  ) : eventUploads[e.id].length === 0 ? (
                    <p className="text-white/30 text-xs py-2">no uploads yet</p>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {eventUploads[e.id].map((u) => (
                        <div key={u.id} className="relative group aspect-square">
                          <img
                            src={u.thumb_url?.startsWith("http") ? u.thumb_url : `/api/event_file?path=${encodeURIComponent(u.thumb_url ?? "")}`}
                            alt=""
                            className="w-full h-full object-cover rounded-lg"
                          />
                          {u.media_type === "video" && (
                            <div className="absolute top-1 left-1 bg-black/60 rounded px-1 text-white/70 text-[10px]">▶</div>
                          )}
                          {confirmDeleteUpload === u.id ? (
                            <div className="absolute inset-0 flex flex-col gap-1 items-center justify-center bg-black/80 rounded-lg p-1">
                              <button
                                onClick={() => deleteUpload(u.id, e.id)}
                                disabled={deletingUpload === u.id}
                                className="w-full text-[11px] text-red-400 border border-red-500/40 rounded py-1 hover:bg-red-500/20 transition disabled:opacity-50"
                              >
                                {deletingUpload === u.id ? "..." : "delete"}
                              </button>
                              <button
                                onClick={() => setConfirmDeleteUpload(null)}
                                className="w-full text-[11px] text-white/40 border border-white/10 rounded py-1 hover:bg-white/10 transition"
                              >
                                cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmDeleteUpload(u.id)}
                              className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 bg-black/70 text-white/70 hover:text-red-400 rounded w-6 h-6 flex items-center justify-center text-xs transition"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
    </main>
  )
}
