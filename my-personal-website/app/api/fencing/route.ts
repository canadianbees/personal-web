import { NextResponse } from "next/server"
import * as cheerio from "cheerio"
import { CACHE_PRIVATE_1D } from "@/lib/cache"

const BASE_URL = "https://fencingtracker.com/p/100317525/Celina-Alzenor"
const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
}

export interface FencingRating {
  weapon: string
  rating: string
  date: string
}

export interface FencingResult {
  date: string
  dateValue: string // YYYYMMDD — used for sorting
  tournament: string
  event: string
  placement: string
  eventClass: string
}

export interface WLRow {
  label: string
  values: string[]
}

export interface FencingData {
  club: string
  ratings: FencingRating[]
  results: FencingResult[]
  wlSeasons: string[]
  wlRows: WLRow[]
}

export async function GET() {
  try {
    // Fetch both pages in parallel
    const [summaryRes, historyRes] = await Promise.all([
      fetch(BASE_URL, { headers: HEADERS, next: { revalidate: 86400 } }),
      fetch(`${BASE_URL}/history`, { headers: HEADERS, next: { revalidate: 86400 } }),
    ])

    if (!summaryRes.ok || !historyRes.ok) {
      return NextResponse.json({ error: "Failed to fetch fencing data" }, { status: 502 })
    }

    const [summaryHtml, historyHtml] = await Promise.all([
      summaryRes.text(),
      historyRes.text(),
    ])

    const $s = cheerio.load(summaryHtml)
    const $h = cheerio.load(historyHtml)

    // Club name
    const club = $s("a.person-hero__club-link").first().text().trim()

    // Ratings — rows whose data-ranking-search starts with "rating"
    const ratings: FencingRating[] = []
    $s("tr[data-ranking-search]").each((_, el) => {
      const search = $s(el).attr("data-ranking-search") ?? ""
      if (!search.toLowerCase().startsWith("rating")) return
      const tds = $s(el).find("td")
      ratings.push({
        weapon: $s(tds[0]).text().trim(),
        rating: $s(tds[1]).text().trim(),
        date: $s(tds[2]).text().trim(),
      })
    })

    // Tournament results
    const results: FencingResult[] = []
    $s("table.person-summary__results-table tr[data-ranking-search]").each((_, el) => {
      const tds = $s(el).find("td")
      const dateValue = $s(tds[0]).attr("data-ranking-value") ?? ""
      const year = dateValue.slice(0, 4)
      const dateText = $s(tds[0]).text().trim()
      results.push({
        date: year ? `${dateText} ${year}` : dateText,
        dateValue,
        tournament: $s(tds[1]).text().trim(),
        event: $s(tds[2]).find("a").attr("title") ?? $s(tds[2]).text().trim(),
        placement: $s(tds[3]).text().trim(),
        eventClass: $s(tds[5]).attr("data-ranking-text") ?? "",
      })
    })
    results.sort((a, b) => Number(b.dateValue) - Number(a.dateValue))

    // Win/loss stats from /history — first table is "Win/loss statistics"
    const wlTable = $h("table.person-history__stats-table").first()
    const wlSeasons: string[] = []
    wlTable.find("thead th.person-history__season-heading").each((_, el) => {
      wlSeasons.push($h(el).text().trim())
    })
    const wlRows: WLRow[] = []
    wlTable.find("tbody tr").each((_, el) => {
      const label = $h(el).find("th[scope='row']").text().trim()
      if (!label) return
      const values: string[] = []
      $h(el).find("td").each((_, td) => {
        values.push($h(td).text().trim())
      })
      wlRows.push({ label, values })
    })

    const data: FencingData = { club, ratings, results, wlSeasons, wlRows }

    return new NextResponse(JSON.stringify(data), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": CACHE_PRIVATE_1D,
      },
    })
  } catch (error) {
    console.error("Fencing scrape error:", error)
    return NextResponse.json({ error: "Failed to load fencing data" }, { status: 500 })
  }
}
