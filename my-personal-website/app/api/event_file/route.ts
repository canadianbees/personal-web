import { NextRequest, NextResponse } from "next/server"
import { GoogleAuth } from "google-auth-library"
import crypto from "crypto"

const GCS_SERVICE_ACCOUNT_KEY = process.env.GCS_SERVICE_ACCOUNT_KEY
const GCS_EVENT_BUCKET = process.env.GCS_EVENT_BUCKET

// Generates a V4 signed URL using the service account private key (no extra packages).
function signedUrl(bucket: string, object: string, credentials: { client_email: string; private_key: string }): string {
  const now = new Date()
  const dateTime = now.toISOString().replace(/[:\-]/g, "").split(".")[0] + "Z"
  const date = dateTime.slice(0, 8)
  const expiry = 3600

  const credential = `${credentials.client_email}/${date}/auto/storage/goog4_request`
  const canonicalUri = `/${bucket}/${object.split("/").map(encodeURIComponent).join("/")}`
  const canonicalHeaders = "host:storage.googleapis.com\n"
  const signedHeaders = "host"

  const query = [
    `X-Goog-Algorithm=GOOG4-RSA-SHA256`,
    `X-Goog-Credential=${encodeURIComponent(credential)}`,
    `X-Goog-Date=${dateTime}`,
    `X-Goog-Expires=${expiry}`,
    `X-Goog-SignedHeaders=${signedHeaders}`,
  ].join("&")

  const canonicalRequest = ["GET", canonicalUri, query, canonicalHeaders, signedHeaders, "UNSIGNED-PAYLOAD"].join("\n")
  const hashedRequest = crypto.createHash("sha256").update(canonicalRequest).digest("hex")
  const stringToSign = ["GOOG4-RSA-SHA256", dateTime, `${date}/auto/storage/goog4_request`, hashedRequest].join("\n")

  const sign = crypto.createSign("RSA-SHA256")
  sign.update(stringToSign)
  const signature = sign.sign(credentials.private_key, "hex")

  return `https://storage.googleapis.com${canonicalUri}?${query}&X-Goog-Signature=${signature}`
}

export async function GET(req: NextRequest) {
  const path = req.nextUrl.searchParams.get("path")
  if (!path) return NextResponse.json({ error: "No path specified" }, { status: 400 })
  if (!GCS_SERVICE_ACCOUNT_KEY) return NextResponse.json({ error: "No service key" }, { status: 500 })

  try {
    const credentials = JSON.parse(GCS_SERVICE_ACCOUNT_KEY)

    // Videos: redirect to a signed URL so the browser can stream natively with range requests
    if (path.includes("/full/") || path.includes("/preview/")) {
      const url = signedUrl(GCS_EVENT_BUCKET!, path, credentials)
      return NextResponse.redirect(url)
    }

    // Images/thumbs: proxy directly (small, no range requests needed)
    const auth = new GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/devstorage.read_only"],
    })
    const client = await auth.getClient()
    const token = await client.getAccessToken()

    const gcsUrl = `https://storage.googleapis.com/storage/v1/b/${GCS_EVENT_BUCKET}/o/${encodeURIComponent(path)}?alt=media`
    const res = await fetch(gcsUrl, { headers: { Authorization: `Bearer ${token.token}` } })

    if (!res.ok) return NextResponse.json({ error: "Failed to fetch from GCS" }, { status: res.status })

    const buffer = Buffer.from(await res.arrayBuffer())
    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        "Content-Type": res.headers.get("content-type") ?? "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    })
  } catch (error) {
    console.error("event_file error:", error)
    return NextResponse.json({ error: "Failed to load file" }, { status: 500 })
  }
}
