// app/api/gallery/route.ts
import { NextResponse } from "next/server";
import {promises as fs} from "fs";
import path from "path";

export async function GET() {
  // Path to your images folder relative to the project root
  const galleryDir = path.join(process.cwd(), "public/gallery");

  try {
const files = await fs.readdir(galleryDir);    // Filter for image extensions only
    const images = files
      .filter((file) => /\.(jpe?g|png|gif|webp)$/i.test(file))
      .map((file) => ({
        id: file,
        // The URL needs to be relative to the 'public' folder
        url: `/gallery/${file}`,
        // Clean up filename for the title (e.g., "album_art.jpg" -> "Album Art")
        title: file.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " "),
        subtitle: "Local Collection",
      }));

    return NextResponse.json({ images });
  } catch (error) {
    return NextResponse.json(
      { images: [], error: "Folder not found" },
      { status: 500 },
    );
  }
}
