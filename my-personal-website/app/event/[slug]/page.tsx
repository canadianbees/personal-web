import { notFound } from "next/navigation"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import EventGalleryClient from "./EventGalleryClient"
import type { UploadRow } from "@/lib/types"

interface Props {
  params: Promise<{ slug: string }>
}

export default async function EventGallery({ params }: Props) {
  const { slug } = await params
  const supabase = await createServerSupabaseClient()

  const { data: event } = await supabase
    .from("events")
    .select("id, name, slug, uploads(*, comments(*))")
    .eq("slug", slug)
    .single()

  if (!event) notFound()

  return (
    <main className="min-h-screen bg-black p-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <p className="text-white/40 text-xs tracking-widest uppercase mb-1">gallery</p>
          <h1 className="text-white text-3xl font-serif">{event.name}</h1>
          <p className="text-white/40 text-sm mt-1">
            {event.uploads?.length ?? 0} photos · <a href={`/event/${slug}/wall`} className="hover:text-white/70 transition">open live wall →</a>
          </p>
        </div>
        <EventGalleryClient uploads={(event.uploads as UploadRow[]) ?? []} />
      </div>
    </main>
  )
}
