export interface EventRow {
  id: string
  slug: string
  name: string
  cover_url: string | null
  upload_token: string
  created_at: string
  uploads?: { count: number }[]
}

export interface UploadRow {
  id: string
  event_id: string
  media_type: 'image' | 'video'
  thumb_url: string | null
  full_url: string
  preview_url: string | null
  width: number | null
  height: number | null
  size_kb: number | null
  uploaded_at: string
  comments?: CommentRow[]
}

export interface CommentRow {
  id: string
  upload_id: string
  content: string
  author: string | null
  created_at: string
}

export interface AssetConversionRow {
  id: string
  upload_id: string
  asset_name: string
  source: string
  before_kb: number
  after_kb: number
  reduction_pct: number
  codec: string
  processed_at: string
}
