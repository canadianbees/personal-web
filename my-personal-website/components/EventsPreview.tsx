import { createServerSupabaseClient } from "@/lib/supabase-server"

export default async function EventsPreview() {
  const supabase = await createServerSupabaseClient()
  const { data: latest } = await supabase
    .from("events")
    .select("name, slug, uploads(thumb_url, count)")
    .order("created_at", { ascending: false })
    .limit(1)
    .single()

  if (!latest) return null

  const thumbs: string[] = (latest.uploads as { thumb_url: string | null }[])
    .slice(0, 4)
    .map((u) => u.thumb_url)
    .filter(Boolean) as string[]

  const count = (latest.uploads as { count: number }[])[0]?.count ?? 0

  return (
    <div className="flex flex-col items-center gap-6 text-center">
      {/* 2×2 thumbnail grid */}
      <div className="grid grid-cols-2 gap-1 w-64 h-64 rounded-2xl overflow-hidden">
        {thumbs.map((src, i) => (
          <img key={i} src={src.startsWith("http") ? src : `/api/event_file?path=${encodeURIComponent(src)}`} alt="" className="w-full h-full object-cover" />
        ))}
        {Array.from({ length: Math.max(0, 4 - thumbs.length) }).map((_, i) => (
          <div key={`empty-${i}`} className="bg-white/5" />
        ))}
      </div>

      <div>
        <p className="text-white/40 text-xs tracking-widest uppercase mb-1">latest event</p>
        <h2 className="text-white text-2xl font-serif">{latest.name}</h2>
        <p className="text-white/40 text-sm mt-1">{count} photos uploaded</p>
      </div>

      <a
        href="/events"
        className="text-white/60 text-sm border border-white/20 px-4 py-2 rounded-full hover:bg-white/10 transition"
      >
        View all events →
      </a>
    </div>
  )
}
