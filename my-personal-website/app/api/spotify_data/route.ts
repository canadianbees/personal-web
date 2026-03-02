import { NextRequest, NextResponse } from "next/server"
import { GoogleAuth } from "google-auth-library"

export async function GET(req: NextRequest) {
  const fileName = req.nextUrl.searchParams.get("name")
  if (!fileName) return NextResponse.json({ error: "No file specified" }, { status: 400 })

  try {
    const credentials = JSON.parse(process.env.GCS_SERVICE_ACCOUNT_KEY!)
    const bucketName = process.env.BUCKET_NAME!

    const auth = new GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/devstorage.read_only"],
    })

    const client = await auth.getClient()
    const token = await client.getAccessToken()

    const res = await fetch(
      `https://storage.googleapis.com/storage/v1/b/${bucketName}/o/${encodeURIComponent(fileName)}?alt=media`,
      { headers: { Authorization: `Bearer ${token.token}` } }
    )

    const data = await res.json()
    return NextResponse.json(data)
  } catch (e) {
    console.error("GCS proxy error:", e)
    return NextResponse.json([], { status: 500 })
  }
}