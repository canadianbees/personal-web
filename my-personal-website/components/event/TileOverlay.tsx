"use client"
import { useEffect, useRef, useState } from "react"
import { motion, AnimatePresence } from "motion/react"
import { supabase } from "@/lib/supabase"
import type { CommentRow, UploadRow, AssetConversionRow } from "@/lib/types"

function eventFileUrl(path: string | null | undefined): string {
  if (!path) return ""
  if (path.startsWith("http")) return path
  return `/api/event_file?path=${encodeURIComponent(path)}`
}

interface Props {
  upload: UploadRow
  onClose: () => void
}

type Particle = {
  x: number; y: number
  vx: number; vy: number
  life: number; maxLife: number
  size: number; color: string
}

const FALLBACK_COLORS = ["#ff5050", "#ffd93d", "#7c3cff", "#ff80ab", "#00e5ff"]

export default function TileOverlay({ upload, onClose }: Props) {
  const videoRef      = useRef<HTMLVideoElement>(null)
  const overlayRef    = useRef<HTMLDivElement>(null)
  const mediaPanelRef = useRef<HTMLDivElement>(null)
  const barsCanvasRef  = useRef<HTMLCanvasElement>(null)
  const rafRef        = useRef<number>(0)
  const lastBeat      = useRef<number>(0)
  const particles     = useRef<Particle[]>([])

  const [comments, setComments]  = useState<CommentRow[]>([])
  const [stats, setStats]        = useState<Pick<AssetConversionRow, "reduction_pct" | "codec"> | null>(null)
  const [draft, setDraft]        = useState({ content: "", author: "" })
  const [submitting, setSubmitting] = useState(false)
  const [videoSrc, setVideoSrc]  = useState<string | null>(null)

  // Load comments + compression stats
  useEffect(() => {
    supabase
      .from("comments")
      .select("*")
      .eq("upload_id", upload.id)
      .order("created_at")
      .then(({ data }) => setComments((data as CommentRow[]) ?? []))

    supabase
      .from("asset_conversions")
      .select("reduction_pct, codec")
      .eq("upload_id", upload.id)
      .single()
      .then(({ data }) => { if (data) setStats(data as Pick<AssetConversionRow, "reduction_pct" | "codec">) })

    const ch = supabase
      .channel(`comments-${upload.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "comments", filter: `upload_id=eq.${upload.id}` },
        (payload) => setComments((prev) => [...prev, payload.new as CommentRow])
      )
      .subscribe()

    return () => { supabase.removeChannel(ch) }
  }, [upload.id])

  // Same-origin stream proxy — no CORS restriction for Web Audio API
  useEffect(() => {
    if (upload.media_type !== "video" || !upload.full_url) return
    setVideoSrc(`/api/event_file/stream?path=${encodeURIComponent(upload.full_url)}`)
  }, [upload.id, upload.media_type, upload.full_url])

  // Size canvas to its container
  useEffect(() => {
    const canvas = barsCanvasRef.current
    if (!canvas) return
    const resize = () => {
      const rect = canvas.parentElement!.getBoundingClientRect()
      canvas.width  = rect.width
      canvas.height = rect.height
    }
    resize()
    window.addEventListener("resize", resize)
    return () => window.removeEventListener("resize", resize)
  }, [])

  // Audio visualizer
  useEffect(() => {
    const video      = videoRef.current
    const overlay    = overlayRef.current
    const mediaPanel = mediaPanelRef.current
    const barsCanvas = barsCanvasRef.current
    if (!video || !overlay || !mediaPanel || !barsCanvas || upload.media_type !== "video" || !videoSrc) return

    let isMounted = true
    let audioCtx: AudioContext
    let source: MediaElementAudioSourceNode
    let analyser: AnalyserNode

    async function setup() {
      audioCtx = new AudioContext()
      if (!isMounted) { audioCtx.close(); return }

      // Chrome requires a user gesture to resume AudioContext
      const onPlay = () => { if (audioCtx.state === "suspended") audioCtx.resume() }
      video!.addEventListener("play", onPlay)

      try {
        source = audioCtx.createMediaElementSource(video!)
      } catch {
        video!.removeEventListener("play", onPlay)
        audioCtx.close()
        return
      }

      analyser = audioCtx.createAnalyser()
      analyser.fftSize = 512
      source.connect(analyser)
      analyser.connect(audioCtx.destination)

      const data     = new Uint8Array(analyser.frequencyBinCount)
      const prevData = new Uint8Array(analyser.frequencyBinCount)
      const BAR_COUNT = 48
      let envelope   = 0
      let avgFlux    = 0
      let frameCount = 0

      // Live palette
      let palette: string[] = [...FALLBACK_COLORS]
      let paletteRgb:       Array<[number, number, number]> = [[255,80,80],[100,40,255]]
      let targetPaletteRgb: Array<[number, number, number]> = [[255,80,80],[100,40,255]]

      const offscreen = document.createElement("canvas")
      offscreen.width = 32; offscreen.height = 32
      const offCtx = offscreen.getContext("2d", { willReadFrequently: true })!

      function samplePalette() {
        if (video!.readyState < 2) return
        offCtx.drawImage(video!, 0, 0, 32, 32)
        const { data: px } = offCtx.getImageData(0, 0, 32, 32)
        type RGB = [number, number, number]
        const candidates: Array<{ rgb: RGB; vividness: number }> = []
        for (let i = 0; i < px.length; i += 4) {
          const r = px[i], g = px[i + 1], b = px[i + 2]
          const max = Math.max(r, g, b), min = Math.min(r, g, b)
          const sat = max === 0 ? 0 : (max - min) / max
          const bright = max / 255
          if (sat > 0.25 && bright > 0.2) candidates.push({ rgb: [r, g, b], vividness: sat * bright })
        }
        if (candidates.length < 4) return
        candidates.sort((a, b) => b.vividness - a.vividness)
        const picked: RGB[] = []
        for (const c of candidates) {
          const tooClose = picked.some((p) => {
            const dr = c.rgb[0]-p[0], dg = c.rgb[1]-p[1], db = c.rgb[2]-p[2]
            return Math.sqrt(dr*dr + dg*dg + db*db) < 60
          })
          if (!tooClose) picked.push(c.rgb)
          if (picked.length >= 5) break
        }
        if (picked.length >= 2) targetPaletteRgb = picked
      }

      const avg = (s: number, e: number) =>
        data.slice(s, e).reduce((a, b) => a + b, 0) / (e - s)

      function spawnParticles(cx: number, cy: number, count: number) {
        const color = palette[Math.floor(Math.random() * palette.length)]
        for (let i = 0; i < count; i++) {
          const angle = Math.random() * Math.PI * 2
          const speed = 4 + Math.random() * 12
          particles.current.push({
            x: cx, y: cy,
            vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
            life: 80 + Math.random() * 40, maxLife: 120,
            size: 2 + Math.random() * 4, color,
          })
        }
      }

      function drawBars(ctx: CanvasRenderingContext2D, W: number, H: number) {
        const sliceSize = Math.floor(data.length * 0.5 / BAR_COUNT)
        const barW = (W / 2) / BAR_COUNT
        const n    = paletteRgb.length
        for (let i = 0; i < BAR_COUNT; i++) {
          let sum = 0
          for (let j = 0; j < sliceSize; j++) sum += data[i * sliceSize + j]
          const val  = (sum / sliceSize) / 255
          const barH = val * H * 0.22
          const t = i / (BAR_COUNT - 1)
          const idx = t * (n - 1)
          const lo = Math.floor(idx), hi = Math.min(lo + 1, n - 1)
          const f = idx - lo
          const [r1,g1,b1] = paletteRgb[lo], [r2,g2,b2] = paletteRgb[hi]
          const r = Math.round(r1 + (r2-r1)*f)
          const g = Math.round(g1 + (g2-g1)*f)
          const b = Math.round(b1 + (b2-b1)*f)
          const gradient = ctx.createLinearGradient(0, H, 0, H - barH)
          gradient.addColorStop(0, `rgba(${r},${g},${b},0.85)`)
          gradient.addColorStop(1, `rgba(${r},${g},${b},0.0)`)
          ctx.fillStyle = gradient
          const gap = 2
          ctx.fillRect(W / 2 + i * barW + gap, H - barH, barW - gap, barH)
          ctx.fillRect(W / 2 - (i + 1) * barW, H - barH, barW - gap, barH)
        }
      }

      function drawParticles(ctx: CanvasRenderingContext2D) {
        const ps = particles.current
        for (let i = ps.length - 1; i >= 0; i--) {
          const p = ps[i]
          p.x += p.vx; p.y += p.vy
          p.vy += 0.25; p.vx *= 0.98
          p.life -= 2
          if (p.life <= 0) { ps.splice(i, 1); continue }
          const alpha = p.life / p.maxLife
          ctx.globalAlpha = alpha
          ctx.fillStyle = p.color
          ctx.shadowColor = p.color
          ctx.shadowBlur = 8
          ctx.beginPath()
          ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.globalAlpha = 1
        ctx.shadowBlur  = 0
      }

      function tick() {
        analyser.getByteFrequencyData(data)
        frameCount++

        if (frameCount % 15 === 0) samplePalette()

        // Lerp palette
        const n = Math.min(paletteRgb.length, targetPaletteRgb.length)
        for (let i = 0; i < n; i++) {
          paletteRgb[i] = paletteRgb[i].map(
            (c, j) => c + (targetPaletteRgb[i][j] - c) * 0.08
          ) as [number, number, number]
        }
        palette = paletteRgb.map(([r,g,b]) => `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`)

        const bass = avg(0, 8) / 255
        const mid  = avg(8, 40) / 255
        envelope   = Math.max(bass, envelope * 0.68)

        // Spectral flux beat detection — measures how much spectrum changes frame-to-frame
        // Works consistently throughout loud music, not just at start
        let flux = 0
        for (let i = 0; i < data.length; i++) {
          const diff = data[i] - prevData[i]
          if (diff > 0) flux += diff
        }
        flux /= data.length
        prevData.set(data)
        avgFlux   = avgFlux * 0.85 + flux * 0.15

        // Glow on overlay
        const [r1,g1,b1] = paletteRgb[0] ?? [255,60,60]
        const [r2,g2,b2] = paletteRgb[1] ?? [100,40,255]
        mediaPanel!.style.boxShadow = [
          `inset 0 0 ${40 + envelope * 160}px rgba(${r1},${g1},${b1},${envelope * 0.35})`,
          `inset 0 0 ${20 + mid * 60}px rgba(${r2},${g2},${b2},${mid * 0.25})`,
        ].join(", ")
        mediaPanel!.style.background =
          `radial-gradient(ellipse at center, rgba(255,255,255,${envelope * 0.08}) 0%, rgba(0,0,0,0.9) 60%)`

        const bCtx = barsCanvas!.getContext("2d")!
        const BW = barsCanvas!.width, BH = barsCanvas!.height
        bCtx.clearRect(0, 0, BW, BH)
        drawBars(bCtx, BW, BH)
        drawParticles(bCtx)

        // Beat: spectral flux spike above rolling average
        const now  = performance.now()
        const beat = flux > 2 && flux > avgFlux * 1.4
        if (beat && now - lastBeat.current > 220) {
          lastBeat.current = now
          for (let i = 0; i < 5; i++) {
            spawnParticles(BW / 2 + (Math.random() - 0.5) * BW * 0.8, BH - 20, 12)
          }
        }

        rafRef.current = requestAnimationFrame(tick)
      }

      rafRef.current = requestAnimationFrame(tick)
    }

    setup().catch((e) => console.warn("Audio setup failed:", e))

    return () => {
      isMounted = false
      cancelAnimationFrame(rafRef.current)
      particles.current = []
      source?.disconnect()
      analyser?.disconnect()
      if (audioCtx && audioCtx.state !== "closed") audioCtx.close()
    }
  }, [upload.id, upload.media_type, videoSrc])

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [onClose])

  const submit = async () => {
    if (!draft.content.trim()) return
    setSubmitting(true)
    const { error } = await supabase.from("comments").insert({
      upload_id: upload.id,
      content: draft.content,
      author: draft.author || "anonymous",
    })
    if (error) {
      console.error("Comment insert failed:", error)
      alert(`Failed to post comment: ${error.message}`)
    } else {
      setDraft({ content: "", author: "" })
    }
    setSubmitting(false)
  }

  return (
    <div
      ref={overlayRef}
      style={{ background: "rgba(0,0,0,0.25)" }}
      className="fixed inset-0 z-50 flex"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      {/* Media panel */}
      <div ref={mediaPanelRef} className="relative z-[52] flex-1 flex flex-col items-center justify-center p-8 gap-3 min-w-0 overflow-hidden">
        {/* Video */}
        <div className="relative z-[2] flex flex-col items-center gap-3">
          {upload.media_type === "video" ? (
            <video
              ref={videoRef}
              src={videoSrc ?? undefined}
              controls
              loop
              className="max-h-[80vh] max-w-full rounded-xl"
            />
          ) : (
            <img
              src={eventFileUrl(upload.full_url)}
              alt=""
              className="max-h-[80vh] max-w-full rounded-xl object-contain"
            />
          )}
          {stats && (
            <div className="flex items-center gap-2 text-xs text-white/50 font-mono">
              <span className="bg-white/10 px-2 py-0.5 rounded">{stats.codec.toUpperCase()}</span>
              <span className="text-green-400">−{Math.round(stats.reduction_pct)}% compressed</span>
            </div>
          )}
        </div>

        {/* Bars + particles canvas — above video */}
        <canvas ref={barsCanvasRef} className="absolute inset-0 pointer-events-none z-[3]" />
      </div>

      {/* Comments panel */}
      <div className="relative z-[52] w-80 bg-gray-950/90 flex flex-col border-l border-white/10 shrink-0">
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
          <AnimatePresence initial={false}>
            {comments.map((c) => (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/5 rounded-lg p-3 text-sm"
              >
                <p className="text-white">{c.content}</p>
                <p className="text-white/30 text-xs mt-1">— {c.author ?? "anonymous"}</p>
              </motion.div>
            ))}
          </AnimatePresence>
          {comments.length === 0 && (
            <p className="text-white/20 text-sm text-center mt-8">no notes yet</p>
          )}
        </div>

        <div className="p-4 border-t border-white/10 flex flex-col gap-2">
          <textarea
            placeholder="leave a note..."
            maxLength={200}
            value={draft.content}
            onChange={(e) => setDraft((d) => ({ ...d, content: e.target.value }))}
            className="bg-white/5 text-white text-sm p-2 rounded resize-none h-16 placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-white/20"
          />
          <input
            placeholder="your name (optional)"
            value={draft.author}
            onChange={(e) => setDraft((d) => ({ ...d, author: e.target.value }))}
            className="bg-white/5 text-white text-sm p-2 rounded placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-white/20"
          />
          <button
            onClick={submit}
            disabled={submitting || !draft.content.trim()}
            className="bg-white/10 text-white py-2 rounded hover:bg-white/20 transition disabled:opacity-40"
          >
            post it ✓
          </button>
        </div>
      </div>

      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white/50 hover:text-white text-xl z-[60]"
      >
        ✕
      </button>
    </div>
  )
}
