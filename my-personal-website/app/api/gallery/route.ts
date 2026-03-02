// app/api/gallery/route.ts
import { NextResponse } from "next/server";
import { GoogleAuth } from "google-auth-library";

const PHOTO_BUCKET = process.env.PHOTO_BUCKET;
const GCS_SERVICE_ACCOUNT_KEY = process.env.GCS_SERVICE_ACCOUNT_KEY;

export async function GET() {
  try {
    if (!GCS_SERVICE_ACCOUNT_KEY)
      return NextResponse.json(
        { error: "No service key specified" },
        { status: 400 },
      );
    const credentials = JSON.parse(GCS_SERVICE_ACCOUNT_KEY);

    const auth = new GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/devstorage.read_only"],
    });

    const client = await auth.getClient();
    const token = await client.getAccessToken();

    const listRes = await fetch(
      `https://storage.googleapis.com/storage/v1/b/${PHOTO_BUCKET}/o?fields=items(name)`,
      { headers: { Authorization: `Bearer ${token.token}` } },
    );
    const listData = await listRes.json();

    const images = (listData.items ?? [])
      .filter((item: { name: string }) =>
        /\.(jpe?g|png|gif|webp)$/i.test(item.name),
      )
      .map((item: { name: string }) => {
        const fileName = item.name;
        return {
          id: fileName,
          url: `/api/gallery_file?name=${encodeURIComponent(fileName)}`,
          title: fileName.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " "),
          subtitle: "Collection",
        };
      });

    return NextResponse.json({ images });
  } catch (error) {
    console.error("GCS gallery error:", error);
    return NextResponse.json(
      { images: [], error: "Failed to load gallery" },
      { status: 500 },
    );
  }
}
