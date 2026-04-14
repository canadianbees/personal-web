import { notFound } from "next/navigation"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import UploadForm from "./UploadForm"

interface Props {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ token?: string }>
}

export default async function UploadPage({ params, searchParams }: Props) {
  const { slug } = await params
  const { token } = await searchParams

  const supabase = await createServerSupabaseClient()
  const { data: event } = await supabase
    .from("events")
    .select("id, name, upload_token, is_demo")
    .eq("slug", slug)
    .single()

  if (!event || (!event.is_demo && event.upload_token !== token)) {
    notFound()
  }

  return <UploadForm eventId={event.id} eventName={event.name} eventSlug={slug} />
}
