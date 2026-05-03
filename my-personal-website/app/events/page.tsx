import Link from "next/link"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import type { EventRow } from "@/lib/types"
import { eventFileUrl } from "@/lib/utils"

export default async function EventsPage() {
  const supabase = await createServerSupabaseClient()
  const { data: events } = await supabase
    .from("events")
    .select("id, name, slug, cover_url, created_at, uploads(count)")
    .order("created_at", { ascending: false })

  return (
    <main className="min-h-screen bg-black p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-white text-3xl font-serif">events</h1>
        <Link href="/" className="text-white/40 text-sm hover:text-white transition">← home</Link>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {(events as EventRow[] ?? []).map((event) => (
          <a
            key={event.id}
            href={`/event/${event.slug}/wall`}
            className="group relative rounded-xl overflow-hidden aspect-square bg-white/5 hover:ring-2 ring-white/20 transition"
          >
            {event.cover_url && (
              <img
                src={eventFileUrl(event.cover_url)}
                alt={event.name}
                className="absolute inset-0 w-full h-full object-cover opacity-90 group-hover:opacity-100 transition"
              />
            )}
            <div className="absolute inset-0 flex flex-col justify-end p-4 bg-gradient-to-t from-black/80 to-transparent">
              <p className="text-white font-medium">{event.name}</p>
              <p className="text-white/40 text-xs mt-0.5">
                {event.uploads?.[0]?.count ?? 0} photos ·{" "}
                {new Date(event.created_at).toLocaleDateString()}
              </p>
            </div>
          </a>
        ))}
      </div>
    </main>
  )
}
