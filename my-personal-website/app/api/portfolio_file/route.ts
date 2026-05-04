import { NextRequest, NextResponse } from "next/server";
import { GoogleAuth } from "google-auth-library";
import sharp from "sharp";
import { CACHE_PRIVATE_1Y } from "@/lib/cache";

const VIDEO_EXTENSIONS = [".mp4", ".webm", ".mov", ".m4v"];

const GCS_SERVICE_ACCOUNT_KEY = process.env.GCS_SERVICE_ACCOUNT_KEY;

export async function GET(req: NextRequest) {
  const path = req.nextUrl.searchParams.get("path");
  if (!path)
    return NextResponse.json({ error: "No path specified" }, { status: 400 });

  if (!GCS_SERVICE_ACCOUNT_KEY)
    return NextResponse.json(
      { error: "No service key specified" },
      { status: 400 },
    );

  try {
    const credentials = JSON.parse(GCS_SERVICE_ACCOUNT_KEY);

    const auth = new GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/devstorage.read_only"],
    });

    const client = await auth.getClient();
    const token = await client.getAccessToken();

    const gcsUrl = `https://storage.googleapis.com/storage/v1/b/${process.env.PHOTO_BUCKET}/o/${encodeURIComponent(path)}?alt=media`;
    const res = await fetch(gcsUrl, {
      headers: { Authorization: `Bearer ${token.token}` },
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "Failed to fetch from GCS" },
        { status: 500 },
      );
    }

    const isVideo = VIDEO_EXTENSIONS.some((ext) => path.toLowerCase().endsWith(ext));

    if (isVideo) {
      // Stream video directly — no Sharp processing
      const contentType = res.headers.get("Content-Type") ?? "video/mp4";
      const buffer = Buffer.from(await res.arrayBuffer());
      return new NextResponse(buffer as unknown as BodyInit, {
        headers: {
          "Content-Type": contentType,
          "Cache-Control": CACHE_PRIVATE_1Y,
        },
      });
    }

    const buffer = Buffer.from(await res.arrayBuffer());

    if (buffer.length === 0) {
      return NextResponse.json(
        { error: "Empty response from GCS" },
        { status: 500 },
      );
    }

    const optimized = await sharp(buffer)
      .resize({ width: 1200, withoutEnlargement: true })
      .webp({ quality: 90 })
      .toBuffer();

    return new NextResponse(optimized as unknown as BodyInit, {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": CACHE_PRIVATE_1Y,
      },
    });
  } catch (error) {
    console.error("GCS portfolio-file error:", error);
    return NextResponse.json(
      { error: "Failed to load asset" },
      { status: 500 },
    );
  }
}
