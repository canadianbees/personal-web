import { NextResponse } from "next/server";
import { GoogleAuth } from "google-auth-library";
import { CACHE_PRIVATE_1Y } from "@/lib/cache";

const GCS_SERVICE_ACCOUNT_KEY = process.env.GCS_SERVICE_ACCOUNT_KEY;

export async function GET() {
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

    const gcsUrl = `https://storage.googleapis.com/storage/v1/b/${process.env.PHOTO_BUCKET}/o/${encodeURIComponent("project_assets/resume.pdf")}?alt=media`;
    const res = await fetch(gcsUrl, {
      headers: { Authorization: `Bearer ${token.token}` },
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "Failed to fetch resume from GCS" },
        { status: 500 },
      );
    }

    const buffer = Buffer.from(await res.arrayBuffer());

    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="Celina_Alzenor_Resume.pdf"',
        "Cache-Control": CACHE_PRIVATE_1Y,
      },
    });
  } catch (error) {
    console.error("GCS resume error:", error);
    return NextResponse.json(
      { error: "Failed to load resume" },
      { status: 500 },
    );
  }
}
