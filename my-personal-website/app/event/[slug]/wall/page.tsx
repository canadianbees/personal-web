import { notFound } from "next/navigation"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import MosaicWall from "@/components/event/MosaicWall"
import EventSwitcher from "@/components/event/EventSwitcher"
import type { EventRow } from "@/lib/types"

interface Props {
  params: Promise<{ slug: string }>
}

export default async function WallPage({ params }: Props) {
  const { slug } = await params
  const supabase = await createServerSupabaseClient()

  const [{ data: current }, { data: allEvents }] = await Promise.all([
    supabase.from("events").select("*").eq("slug", slug).single(),
    supabase
      .from("events")
      .select("id, name, slug, cover_url, created_at, uploads(count)")
      .order("created_at", { ascending: false }),
  ])

  if (!current) notFound()

  return (
    <div className="relative min-h-screen bg-black">
      <EventSwitcher
        currentEvent={current as EventRow}
        events={(allEvents as EventRow[]) ?? []}
      />
      <MosaicWall eventId={current.id} />
    </div>
  )
}
