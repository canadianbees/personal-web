import { NextResponse } from "next/server"
import { GoogleAuth } from "google-auth-library"

export async function GET() {
  try {
    const credentials = JSON.parse(process.env.GCS_SERVICE_ACCOUNT_KEY!)
    const bucketName = process.env.BUCKET_NAME!

    const auth = new GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/devstorage.read_only"],
    })

    const client = await auth.getClient()
    const token = await client.getAccessToken()

    // List files in bucket
    const listRes = await fetch(
      `https://storage.googleapis.com/storage/v1/b/${bucketName}/o?fields=items(name)`,
      { headers: { Authorization: `Bearer ${token.token}` } }
    )
    const listData = await listRes.json()

    const fileNames: string[] = (listData.items ?? [])
      .map((item: { name: string }) => item.name)
      .filter((name: string) => name.endsWith(".json"))

    // Generate signed URLs for each file (1 hour expiry)
    const signedUrls = await Promise.all(
      fileNames.map(async (fileName) => {
        const signRes = await fetch(
          `https://storage.googleapis.com/storage/v1/b/${bucketName}/o/${encodeURIComponent(fileName)}?alt=media`,
          { headers: { Authorization: `Bearer ${token.token}` } }
        )
        // Return a proxied URL through our own API instead of signed URLs
        return `/api/spotify_data?name=${encodeURIComponent(fileName)}`
      })
    )

    return NextResponse.json({ files: signedUrls })
  } catch (e) {
    console.error("GCS error:", e)
    return NextResponse.json({ files: [] })
  }
}