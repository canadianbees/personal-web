import { NextRequest, NextResponse } from "next/server"

const EVENT_WALL_API_URL = process.env.EVENT_WALL_API_URL
const EVENT_WALL_API_SECRET = process.env.EVENT_WALL_API_SECRET

const headers = () => ({ "api-secret": EVENT_WALL_API_SECRET! })

export async function POST(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const action = searchParams.get("action")

  try {
    if (action === "init") {
      // Step 1: get a signed GCS upload URL
      const eventSlug = searchParams.get("event_slug")!
      const eventId = searchParams.get("event_id")!
      const contentType = searchParams.get("content_type")!

      const res = await fetch(
        `${EVENT_WALL_API_URL}/upload/init?event_slug=${encodeURIComponent(eventSlug)}&event_id=${encodeURIComponent(eventId)}&content_type=${encodeURIComponent(contentType)}`,
        { method: "POST", headers: headers() }
      )
      if (!res.ok) return NextResponse.json({ error: await res.text() }, { status: res.status })
      return NextResponse.json(await res.json())
    }

    if (action === "process") {
      // Step 3: trigger processing after the file is in GCS
      const eventSlug = searchParams.get("event_slug")!
      const eventId = searchParams.get("event_id")!
      const gcsPath = searchParams.get("gcs_path")!
      const contentType = searchParams.get("content_type")!

      const res = await fetch(
        `${EVENT_WALL_API_URL}/upload/process?event_slug=${encodeURIComponent(eventSlug)}&event_id=${encodeURIComponent(eventId)}&gcs_path=${encodeURIComponent(gcsPath)}&content_type=${encodeURIComponent(contentType)}`,
        { method: "POST", headers: headers() }
      )
      if (!res.ok) return NextResponse.json({ error: await res.text() }, { status: res.status })
      return NextResponse.json(await res.json())
    }

    if (action === "batch-init") {
      const body = await req.json()
      const res = await fetch(`${EVENT_WALL_API_URL}/upload/batch-init`, {
        method: "POST",
        headers: { ...headers(), "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) return NextResponse.json({ error: await res.text() }, { status: res.status })
      return NextResponse.json(await res.json())
    }

    if (action === "batch-process") {
      const body = await req.json()
      const res = await fetch(`${EVENT_WALL_API_URL}/upload/batch-process`, {
        method: "POST",
        headers: { ...headers(), "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) return NextResponse.json({ error: await res.text() }, { status: res.status })
      return NextResponse.json(await res.json())
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 })
  } catch (error) {
    console.error("Upload proxy error:", error)
    return NextResponse.json({ error: "Upload failed" }, { status: 500 })
  }
}
