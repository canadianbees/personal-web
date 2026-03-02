import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"

export async function GET() {
const dir = path.join(process.cwd(), "public/my_spotify_data/spotify_extended_history")
  
  try {
    const files = fs.readdirSync(dir)
      .filter((f) => f.startsWith("Streaming_History_Audio") && f.endsWith(".json"))
      .map((f) => `/my_spotify_data/spotify_extended_history/${f}`)
    
    return NextResponse.json({ files })
  } catch {
    return NextResponse.json({ files: [] })
  }
}