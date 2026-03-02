import {
  LoyalArtist,
  MonthlyObsession,
  ProcessedData,
  StreamEntry,
} from "../utils/types";

const HOUR_LABELS = [
  "12am",
  "1am",
  "2am",
  "3am",
  "4am",
  "5am",
  "6am",
  "7am",
  "8am",
  "9am",
  "10am",
  "11am",
  "12pm",
  "1pm",
  "2pm",
  "3pm",
  "4pm",
  "5pm",
  "6pm",
  "7pm",
  "8pm",
  "9pm",
  "10pm",
  "11pm",
];

const ARTIST_COLORS: Record<string, string> = {
  "Ariana Grande": "#f472b6",
  BROCKHAMPTON: "#fb923c",
  "Tyler, The Creator": "#4ade80",
  "Tame Impala": "#a78bfa",
  Drake: "#60a5fa",
  Logic: "#facc15",
  "Kali Uchis": "#f87171",
  "Omar Apollo": "#34d399",
  "Steve Lacy": "#e879f9",
  SZA: "#38bdf8",
  "Victoria Monét": "#fb7185",
  PinkPantheress: "#c084fc",
  "Mac Miller": "#fdba74",
  Gorillaz: "#86efac",
  "Madison Beer": "#f0abfc",
  "Nicki Minaj": "#fbbf24",
  "khai dreams": "#67e8f9",
  "Billy Lemos": "#a3e635",
  NJOMZA: "#f9a8d4",
  "LEE.": "#6ee7b7",
  Pond: "#93c5fd",
};

export function processData(tracks: StreamEntry[]): ProcessedData {
  const artistPlays: Record<string, number> = {};
  const artistMs: Record<string, number> = {};
  const trackPlays: Record<
    string,
    { name: string; artist: string; plays: number }
  > = {};
  const yearMs: Record<string, number> = {};
  const hourMins: Record<number, number> = {};

  const filtered = tracks.filter(
    (t) => t.master_metadata_track_name && t.ms_played > 30000,
  );

  // get skip data first
  let totalSkips = 0;
  const skipsByHourMap: Record<number, number> = {};
  const artistSkipCounts: Record<string, { skips: number; total: number }> = {};

  for (const t of tracks) {
    const isSkip = t.reason_end === "fwdbtn";
    const hour = parseInt(t.ts.slice(11, 13));
    const artist = t.master_metadata_album_artist_name;

    if (isSkip) totalSkips++;

    // Track skips by hour
    skipsByHourMap[hour] = (skipsByHourMap[hour] || 0) + (isSkip ? 1 : 0);

    // Track skips by artist (only if artist name exists)
    if (artist) {
      if (!artistSkipCounts[artist])
        artistSkipCounts[artist] = { skips: 0, total: 0 };
      artistSkipCounts[artist].total++;
      if (isSkip) artistSkipCounts[artist].skips++;
    }
  }

  // Calculate most skipped artist (min 10 total plays to be significant)
  const mostSkippedArtist =
    Object.entries(artistSkipCounts)
      .filter(([, stats]) => stats.total > 10)
      .sort(
        (a, b) => b[1].skips / b[1].total - a[1].skips / a[1].total,
      )[0]?.[0] || "None";

  for (const t of filtered) {
    const artist = t.master_metadata_album_artist_name;
    const track = t.master_metadata_track_name!;
    const uri = (t as any).spotify_track_uri || track;
    const year = t.ts.slice(0, 4);
    const hour = parseInt(t.ts.slice(11, 13));

    if (artist) {
      artistPlays[artist] = (artistPlays[artist] || 0) + 1;
      artistMs[artist] = (artistMs[artist] || 0) + t.ms_played;
    }

    if (!trackPlays[uri])
      trackPlays[uri] = { name: track, artist: artist || "Unknown", plays: 0 };
    trackPlays[uri].plays++;

    yearMs[year] = (yearMs[year] || 0) + t.ms_played;
    hourMins[hour] = (hourMins[hour] || 0) + Math.round(t.ms_played / 60000);
  }

  const topArtists = Object.entries(artistPlays)
    .sort((artistOne, artistTwo) => artistTwo[1] - artistOne[1])
    .slice(0, 10)
    .map(([artistName, playCount]) => ({
      name: artistName,
      plays: playCount,
      hours: Math.round((artistMs[artistName] || 0) / 3600000),
      spotifyUrl: `https://open.spotify.com/search/${encodeURIComponent(artistName)}/artists`,
      appleMusicUrl: `https://music.apple.com/us/search?term=${encodeURIComponent(artistName)}`,
    }));

  const topTracks = Object.entries(trackPlays)
    .sort((trackOne, trackTwo) => trackTwo[1].plays - trackOne[1].plays)
    .slice(0, 10)
    .map(([uri, { name, artist, plays }]) => ({ name, artist, plays, uri }));

  const yearlyData = Object.entries(yearMs)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([year, ms]) => ({ year, hours: Math.round(ms / 3600000) }));

  const hourlyData = HOUR_LABELS.map((hour, i) => ({
    hour,
    mins: hourMins[i] || 0,
  }));

  const skipsByHour = HOUR_LABELS.map((hour, i) => ({
    hour,
    skipCount: skipsByHourMap[i] || 0,
  }));

  const totalMs = filtered.reduce((sum, t) => sum + t.ms_played, 0);
  const years = [...new Set(filtered.map((t) => t.ts.slice(0, 4)))];

  console.log("artistPlays keys:", Object.keys(artistPlays).length);
  console.log("trackPlays keys:", Object.keys(trackPlays).length);
  console.log("filtered length:", filtered.length);

  const { loyalArtists, allYears } = computeLoyalArtists(filtered)


  return {
    topArtists,
    topTracks,
    yearlyData,
    hourlyData,
    totalStats: {
      totalHours: Math.round(totalMs / 3600000),
      totalPlays: filtered.length,
      topArtist: topArtists[0]?.name || "—",
      topTrack: topTracks[0]?.name || "—",
      yearsActive: years.length,
    },
    monthlyObsessions: computeMonthlyObsessions(filtered),
    skipStats: {
      totalSkips,
      skipRate: Math.round((totalSkips / tracks.length) * 100),
      mostSkippedArtist,
    },
    skipsByHour,
    loyalArtists,
    allYears,
  };
}


export function computeLoyalArtists(tracks: {
  ts: string
  ms_played: number
  master_metadata_track_name: string | null
  master_metadata_album_artist_name: string | null
}[]): { loyalArtists: LoyalArtist[]; allYears: string[] } {
  const filtered = tracks.filter(
    (track) => track.master_metadata_track_name && track.ms_played > 30000
  )

  const artistYearlyPlays: Record<string, Record<string, number>> = {}
  const artistTotalPlays: Record<string, number> = {}

  for (const track of filtered) {
    const artist = track.master_metadata_album_artist_name
    const year = track.ts.slice(0, 4)
    if (!artist) continue
    if (!artistYearlyPlays[artist]) artistYearlyPlays[artist] = {}
    artistYearlyPlays[artist][year] = (artistYearlyPlays[artist][year] || 0) + 1
    artistTotalPlays[artist] = (artistTotalPlays[artist] || 0) + 1
  }

  const allYears = [...new Set(filtered.map((track) => track.ts.slice(0, 4)))].sort()

  const loyalArtists = Object.entries(artistYearlyPlays)
    .filter(([, yearlyPlays]) => {
      const total = Object.values(yearlyPlays).reduce((sum, plays) => sum + plays, 0)
      return total >= 1000
    })
    .map(([name, yearlyPlays]) => {
      const activeYears = Object.keys(yearlyPlays).sort()
      return {
        name,
        yearsActive: activeYears.length,
        firstYear: activeYears[0],
        lastYear: activeYears[activeYears.length - 1],
        yearlyPlays,
        totalPlays: artistTotalPlays[name] || 0,
      }
    })
    .sort((artistA, artistB) => {
      if (artistB.yearsActive !== artistA.yearsActive) return artistB.yearsActive - artistA.yearsActive
      return artistB.totalPlays - artistA.totalPlays
    })

  return { loyalArtists, allYears }
}

export function computeMonthlyObsessions(
  tracks: {
    ts: string;
    ms_played: number;
    master_metadata_track_name: string | null;
    master_metadata_album_artist_name: string | null;
  }[],
): MonthlyObsession[] {
  const filtered = tracks.filter(
    (t) => t.master_metadata_track_name && t.ms_played > 30000,
  );

  const monthlyArtistPlays: Record<string, Record<string, number>> = {};

  for (const track of filtered) {
    const artist = track.master_metadata_album_artist_name;
    const month = track.ts.slice(0, 7);
    if (!artist) continue;
    if (!monthlyArtistPlays[month]) monthlyArtistPlays[month] = {};
    monthlyArtistPlays[month][artist] =
      (monthlyArtistPlays[month][artist] || 0) + 1;
  }

  return Object.entries(monthlyArtistPlays)
    .sort(([monthA], [monthB]) => monthA.localeCompare(monthB))
    .map(([month, artistPlays]) => {
      const topArtist = Object.entries(artistPlays).sort(
        ([, playsA], [, playsB]) => playsB - playsA,
      )[0];
      return {
        month,
        artist: topArtist[0],
        plays: topArtist[1],
      };
    });
}

export const getArtistColor = (artist: string) => {
  if (ARTIST_COLORS[artist]) return ARTIST_COLORS[artist];
  // Generate a consistent color for unknown artists
  let hash = 0;
  for (let i = 0; i < artist.length; i++) {
    hash = artist.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 70%, 65%)`;
};

export const formatMonth = (monthStr: string) => {
  const [year, month] = monthStr.split("-");
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
};
const DISPLAY_COUNT = 5

export const pickRandom = (artists: LoyalArtist[]): LoyalArtist[] => {
  return [...artists].sort(() => Math.random() - 0.5).slice(0, DISPLAY_COUNT)
}