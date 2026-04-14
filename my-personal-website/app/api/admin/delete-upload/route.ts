import { NextRequest, NextResponse } from "next/server"
import { GoogleAuth } from "google-auth-library"
import { createServerSupabaseClient } from "@/lib/supabase-server"

const GCS_EVENT_BUCKET = process.env.GCS_EVENT_BUCKET
const GCS_SERVICE_ACCOUNT_KEY = process.env.GCS_SERVICE_ACCOUNT_KEY

async function deleteFromGCS(path: string) {
  if (!GCS_SERVICE_ACCOUNT_KEY || !GCS_EVENT_BUCKET) return
  try {
    const credentials = JSON.parse(GCS_SERVICE_ACCOUNT_KEY)
    const auth = new GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/devstorage.full_control"],
    })
    const client = await auth.getClient()
    const token = await client.getAccessToken()
    await fetch(
      `https://storage.googleapis.com/storage/v1/b/${GCS_EVENT_BUCKET}/o/${encodeURIComponent(path)}`,
      { method: "DELETE", headers: { Authorization: `Bearer ${token.token}` } }
    )
  } catch (e) {
    console.error("GCS delete failed for", path, e)
  }
}

export async function DELETE(req: NextRequest) {
  const supabase = await createServerSupabaseClient()

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const uploadId = req.nextUrl.searchParams.get("id")
  if (!uploadId) return NextResponse.json({ error: "Missing id" }, { status: 400 })

  const { data: upload } = await supabase
    .from("uploads")
    .select("thumb_url, full_url, preview_url")
    .eq("id", uploadId)
    .single()

  if (!upload) return NextResponse.json({ error: "Not found" }, { status: 404 })

  // Delete GCS files — non-fatal, don't block on failure
  const paths = [upload.thumb_url, upload.full_url, upload.preview_url].filter(Boolean) as string[]
  await Promise.all(paths.map(deleteFromGCS))

  const { error } = await supabase.from("uploads").delete().eq("id", uploadId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
