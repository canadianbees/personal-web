"use client"
import { useState, useRef, useCallback, useEffect } from "react"
import { supabase } from "@/lib/supabase"

interface Props {
  eventId: string
  eventName: string
  eventSlug: string
}

type UploadState = "idle" | "uploading" | "processing" | "done" | "error"

type JobStatus = {
  id: string
  status: "processing" | "done" | "failed"
  error?: string
}

const MAX_FILES = 10

export default function UploadForm({ eventId, eventName, eventSlug }: Props) {
  const [files, setFiles] = useState<File[]>([])
  const [state, setState] = useState<UploadState>("idle")
  const [jobs, setJobs] = useState<JobStatus[]>([])
  const [dragging, setDragging] = useState(false)
  const [limitWarning, setLimitWarning] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const addFiles = useCallback((incoming: File[]) => {
    const valid = incoming.filter(
      (f) => f.type.startsWith("image/") || f.type.startsWith("video/")
    )
    setFiles((prev) => {
      const merged = [...prev, ...valid].slice(0, MAX_FILES)
      if (prev.length + valid.length > MAX_FILES) setLimitWarning(true)
      return merged
    })
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    addFiles(Array.from(e.dataTransfer.files))
  }, [addFiles])

  // Subscribe to processing_jobs UPDATE events via Supabase Realtime
  useEffect(() => {
    if (!jobs.length) return

    const ids = jobs.map((j) => j.id)

    const ch = supabase
      .channel(`jobs-${eventId}-${ids[0]}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "processing_jobs", filter: `event_id=eq.${eventId}` },
        (payload) => {
          const r = payload.new as { id: string; status: "processing" | "done" | "failed"; error?: string }
          if (!ids.includes(r.id)) return
          setJobs((prev) => prev.map((j) => j.id === r.id ? { ...j, status: r.status, error: r.error } : j))
        }
      )
      .subscribe()

    // One-shot fetch to catch jobs that settled before the channel connected
    supabase.from("processing_jobs").select("id, status, error").in("id", ids)
      .then(({ data }) => {
        if (!data) return
        setJobs((prev) =>
          prev.map((j) => {
            const u = (data as JobStatus[]).find((r) => r.id === j.id)
            return u ? { ...j, status: u.status, error: u.error } : j
          })
        )
      })

    return () => { supabase.removeChannel(ch) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobs.map((j) => j.id).join(",")])

  // Transition state once all jobs have settled
  useEffect(() => {
    if (!jobs.length) return
    const settled = jobs.every((j) => j.status === "done" || j.status === "failed")
    if (settled) {
      const anyFailed = jobs.some((j) => j.status === "failed")
      setState(anyFailed ? "error" : "done")
    }
  }, [jobs])

  const handleSubmit = async () => {
    if (!files.length) return
    setState("uploading")

    try {
      // Step 1: batch-init — get signed GCS URLs for all files at once
      const initRes = await fetch(`/api/upload?action=batch-init`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_slug: eventSlug,
          event_id: eventId,
          files: files.map((f) => ({ content_type: f.type || "application/octet-stream" })),
        }),
      })
      if (!initRes.ok) throw new Error(await initRes.text())
      const { results } = await initRes.json() as { results: { signed_url: string; gcs_path: string }[] }

      // Step 2: PUT directly to GCS in parallel
      const putResults = await Promise.allSettled(
        files.map((file, i) => {
          const contentType = file.type || "application/octet-stream"
          return fetch(results[i].signed_url, {
            method: "PUT",
            headers: { "Content-Type": contentType },
            body: file,
          }).then((r) => {
            if (!r.ok) throw new Error(`GCS upload failed: ${r.status}`)
            return { gcs_path: results[i].gcs_path, content_type: contentType }
          })
        })
      )

      // Step 3: batch-process — trigger processing for all successful PUTs at once
      const processFiles = putResults
        .map((r) => r.status === "fulfilled" ? r.value : null)
        .filter(Boolean) as { gcs_path: string; content_type: string }[]

      let uploadIds: string[] = []
      if (processFiles.length > 0) {
        const processRes = await fetch(`/api/upload?action=batch-process`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ event_slug: eventSlug, event_id: eventId, files: processFiles }),
        })
        if (!processRes.ok) throw new Error(await processRes.text())
        const data = await processRes.json() as { upload_ids: string[] }
        uploadIds = data.upload_ids
      }

      // Build job list — failed PUTs get a synthetic failed entry
      let successIdx = 0
      const newJobs: JobStatus[] = putResults.map((r) =>
        r.status === "fulfilled"
          ? { id: uploadIds[successIdx++], status: "processing" as const }
          : { id: crypto.randomUUID(), status: "failed" as const, error: (r.reason as Error)?.message ?? "upload failed" }
      )

      setJobs(newJobs)
      setState(newJobs.every((j) => j.status === "failed") ? "error" : "processing")
    } catch (err) {
      setJobs([{ id: crypto.randomUUID(), status: "failed", error: (err as Error)?.message ?? "upload failed" }])
      setState("error")
    }

    setFiles([])
    if (inputRef.current) inputRef.current.value = ""
  }

  const doneCount = jobs.filter((j) => j.status === "done").length
  const failedCount = jobs.filter((j) => j.status === "failed").length
  const processingCount = jobs.filter((j) => j.status === "processing").length

  return (
    <>
    <div className="fixed inset-0 bg-black -z-10" />
    <main className="relative z-10 min-h-screen bg-transparent flex flex-col items-center justify-center p-6 gap-6 text-center">
      <div>
        <p className="text-white/40 text-xs tracking-widest uppercase mb-1">uploading to</p>
        <h1 className="text-white text-2xl font-serif">{eventName}</h1>
      </div>

      {state === "processing" && (
        <div className="flex flex-col items-center gap-4">
          <div className="flex flex-col items-center gap-3">
            <p className="text-white/60 text-sm">processing{processingCount > 0 ? ` ${processingCount} file${processingCount !== 1 ? "s" : ""}` : ""}…</p>
            <div className="flex gap-1">
              {jobs.map((j) => (
                <span
                  key={j.id}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    j.status === "done" ? "bg-green-400" :
                    j.status === "failed" ? "bg-red-400" :
                    "bg-white/30 animate-pulse"
                  }`}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => { setState("idle"); setJobs([]) }}
              className="text-white/60 border border-white/20 px-4 py-2 rounded-full text-sm hover:bg-white/10 transition"
            >
              upload more
            </button>
            <a
              href={`/event/${eventSlug}/wall`}
              className="text-white/60 border border-white/20 px-4 py-2 rounded-full text-sm hover:bg-white/10 transition"
            >
              view wall →
            </a>
          </div>
        </div>
      )}

      {state === "done" && (
        <div className="flex flex-col items-center gap-4">
          <p className="text-green-400 text-lg">ready ✓</p>
          <p className="text-white/40 text-sm">{doneCount} file{doneCount !== 1 ? "s" : ""} on the wall</p>
          <div className="flex gap-3">
            <button
              onClick={() => { setState("idle"); setJobs([]) }}
              className="text-white/60 border border-white/20 px-4 py-2 rounded-full text-sm hover:bg-white/10 transition"
            >
              upload more
            </button>
            <a
              href={`/event/${eventSlug}/wall`}
              className="text-white/60 border border-white/20 px-4 py-2 rounded-full text-sm hover:bg-white/10 transition"
            >
              view wall →
            </a>
          </div>
        </div>
      )}

      {(state === "idle" || state === "uploading" || state === "error") && (
        <>
          <label
            className="flex flex-col items-center gap-3 cursor-pointer w-full max-w-xs"
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
          >
            <div className={`w-full border-2 border-dashed rounded-2xl p-8 transition ${dragging ? "border-white/70 bg-white/5" : "border-white/20 hover:border-white/40"}`}>
              {files.length > 0 ? (
                <p className="text-white text-sm">{files.length} / {MAX_FILES} files selected</p>
              ) : (
                <p className="text-white/40 text-sm">{dragging ? "drop to add" : "tap or drop photos / videos"}</p>
              )}
            </div>
            {limitWarning && (
              <p className="text-yellow-400/80 text-xs">max {MAX_FILES} files at a time — first {MAX_FILES} kept</p>
            )}
            <input
              ref={inputRef}
              type="file"
              multiple
              accept="image/*,video/*"
              className="hidden"
              onChange={(e) => { setLimitWarning(false); addFiles(Array.from(e.target.files ?? [])) }}
            />
          </label>

          {state === "error" && (
            <div className="flex flex-col items-center gap-2">
              <p className="text-red-400 text-sm">
                {failedCount > 0
                  ? `${failedCount} file${failedCount !== 1 ? "s" : ""} failed to process`
                  : "something went wrong — try again"}
              </p>
              {jobs.filter((j) => j.status === "failed" && j.error).map((j) => (
                <p key={j.id} className="text-red-400/60 text-xs max-w-xs truncate">{j.error}</p>
              ))}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={!files.length || state === "uploading"}
            className="bg-white text-black font-medium px-8 py-3 rounded-full hover:bg-white/90 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {state === "uploading" ? "uploading..." : "Drop it 📸"}
          </button>
        </>
      )}
    </main>
    </>
  )
}
