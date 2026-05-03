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

  const { data: current } = await supabase.from("events").select("*").eq("slug", slug).single()

  if (!current) notFound()

  return (
    <div className="relative min-h-screen bg-black">
      <EventSwitcher currentEvent={current as EventRow} />
      <MosaicWall eventId={current.id} />
    </div>
  )
}
