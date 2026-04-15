import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"

const GCS_SERVICE_ACCOUNT_KEY = process.env.GCS_SERVICE_ACCOUNT_KEY
const GCS_EVENT_BUCKET = process.env.GCS_EVENT_BUCKET

function makeSignedUrl(
  bucket: string,
  object: string,
  credentials: { client_email: string; private_key: string }
): string {
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
  if (!path) return NextResponse.json({ error: "No path" }, { status: 400 })
  if (!GCS_SERVICE_ACCOUNT_KEY) return NextResponse.json({ error: "No service key" }, { status: 500 })

  const credentials = JSON.parse(GCS_SERVICE_ACCOUNT_KEY)
  const url = makeSignedUrl(GCS_EVENT_BUCKET!, path, credentials)
  return NextResponse.json({ url })
}
