import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
    const term = req.nextUrl.searchParams.get("term")
    if (!term) return NextResponse.json({ error: "missing term" }, { status: 400 })

    try {
        const res = await fetch(
            `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&media=music&limit=1`,
            { redirect: "follow" }
        )
        const data = await res.json()
        return NextResponse.json(data)
    } catch {
        return NextResponse.json({ results: [] }, { status: 200 })
    }
}
