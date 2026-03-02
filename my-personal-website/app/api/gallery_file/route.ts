import { NextRequest, NextResponse } from "next/server";
import { GoogleAuth } from "google-auth-library";
import sharp from "sharp";

const GCS_SERVICE_ACCOUNT_KEY = process.env.GCS_SERVICE_ACCOUNT_KEY;

export async function GET(req: NextRequest) {
  const fileName = req.nextUrl.searchParams.get("name");
  if (!fileName)
    return NextResponse.json({ error: "No file specified" }, { status: 400 });

  if (!GCS_SERVICE_ACCOUNT_KEY)
    return NextResponse.json(
      { error: "No service key specified" },
      { status: 400 },
    );

  const width = 800;

  try {
    const credentials = JSON.parse(GCS_SERVICE_ACCOUNT_KEY);

    const auth = new GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/devstorage.read_only"],
    });

    const client = await auth.getClient();
    const token = await client.getAccessToken();

    const gcsUrl = `https://storage.googleapis.com/storage/v1/b/${process.env.PHOTO_BUCKET}/o/${encodeURIComponent(fileName)}?alt=media`;
    const res = await fetch(gcsUrl, {
      headers: { Authorization: `Bearer ${token.token}`, cache: "no-store" },
    });

    const buffer = Buffer.from(await res.arrayBuffer());

    if (!res.ok || buffer.length === 0) {
      return NextResponse.json(
        { error: "Failed to fetch from GCS" },
        { status: 500 },
      );
    }

    const optimized = await sharp(buffer)
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();

    return new NextResponse(optimized as unknown as BodyInit, {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("GCS gallery-file error:", error);
    return NextResponse.json(
      { error: "Failed to load image" },
      { status: 500 },
    );
  }
}
