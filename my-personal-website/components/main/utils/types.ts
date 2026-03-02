export interface MonthlyObsession {
  month: string
  artist: string
  plays: number
}


export interface LoyalArtist {
  name: string
  yearsActive: number
  firstYear: string
  lastYear: string
  yearlyPlays: Record<string, number>
  totalPlays: number
}

export interface StreamEntry {
  ts: string
  ms_played: number
  master_metadata_track_name: string | null
  master_metadata_album_artist_name: string | null
  spotify_track_uri: string | null
  reason_end: string | null
}

export interface ProcessedData {
  topArtists: {
    name: string; plays: number; hours: number; spotifyUrl: string;
    appleMusicUrl: string
  }[]
  topTracks: { name: string; artist: string; plays: number; uri: string }[]
  yearlyData: { year: string; hours: number }[]
  hourlyData: { hour: string; mins: number }[]
  totalStats: {
    totalHours: number
    totalPlays: number
    topArtist: string
    topTrack: string
    yearsActive: number
  }
  monthlyObsessions?: MonthlyObsession[]
  
  skipStats: {
    totalSkips: number;
    skipRate: number;
    mostSkippedArtist: string;
  };
  skipsByHour: { hour: string; skipCount: number }[];

  loyalArtists: LoyalArtist[]
allYears: string[]
}


