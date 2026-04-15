import { NextRequest, NextResponse } from "next/server"
import { GoogleAuth } from "google-auth-library"

const GCS_SERVICE_ACCOUNT_KEY = process.env.GCS_SERVICE_ACCOUNT_KEY
const GCS_EVENT_BUCKET = process.env.GCS_EVENT_BUCKET

export async function GET(req: NextRequest) {
  const path = req.nextUrl.searchParams.get("path")
  if (!path) return NextResponse.json({ error: "No path" }, { status: 400 })
  if (!GCS_SERVICE_ACCOUNT_KEY) return NextResponse.json({ error: "No service key" }, { status: 500 })

  const credentials = JSON.parse(GCS_SERVICE_ACCOUNT_KEY)
  const auth = new GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/devstorage.read_only"],
  })
  const client = await auth.getClient()
  const token = await client.getAccessToken()

  const gcsUrl = `https://storage.googleapis.com/storage/v1/b/${GCS_EVENT_BUCKET}/o/${encodeURIComponent(path)}?alt=media`

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token.token}`,
  }
  const range = req.headers.get("range")
  if (range) headers["Range"] = range

  const upstream = await fetch(gcsUrl, { headers })

  if (!upstream.ok && upstream.status !== 206) {
    return NextResponse.json({ error: "GCS fetch failed" }, { status: upstream.status })
  }

  const responseHeaders: Record<string, string> = {
    "Content-Type": upstream.headers.get("content-type") ?? "video/mp4",
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, max-age=3600",
  }

  const contentRange = upstream.headers.get("content-range")
  if (contentRange) responseHeaders["Content-Range"] = contentRange

  const contentLength = upstream.headers.get("content-length")
  if (contentLength) responseHeaders["Content-Length"] = contentLength

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  })
}
