-- ============================================================
-- Event Media Wall — Supabase Schema Migration
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================


-- ── 1. EVENTS ───────────────────────────────────────────────
-- One row per concert / trip / night out.
-- upload_token  → short-lived, gates who can upload (48h after event)
-- view_token    → long-lived, gates full-size asset access & downloads
-- is_demo       → skips all token checks; used for the public portfolio demo
create table if not exists events (
                                      id           uuid        not null default gen_random_uuid() primary key,
    slug         text        not null unique,
    name         text        not null,
    cover_url    text,                          -- auto-set on first upload
    upload_token text        not null default substr(md5(random()::text), 1, 12),
    view_token   text        not null default substr(md5(random()::text), 1, 16),
    expires_at   timestamptz not null default (now() + interval '7 days'),
    is_demo      boolean     not null default false,
    created_at   timestamptz not null default now()
    );


-- ── 2. GUESTS ───────────────────────────────────────────────
-- Phone numbers entered by the admin at event creation.
-- FastAPI texts each guest the view URL via Twilio when the event is saved.
-- texted_at stays null until SMS is confirmed sent.
create table if not exists guests (
                                      id         uuid        not null default gen_random_uuid() primary key,
    event_id   uuid        not null references events(id) on delete cascade,
    phone      text        not null,   -- E.164 format: +15551234567
    texted_at  timestamptz,            -- null = not yet texted
    created_at timestamptz not null default now()
    );


-- ── 3. UPLOADS ──────────────────────────────────────────────
-- One row per photo or video uploaded to an event.
-- thumb_url   → public, low-res (safe to embed on mosaic wall)
-- full_url    → GCS object path, NOT a public URL (served via token-gated API)
-- preview_url → video only: 6-second muted loop for the mosaic tile
create table if not exists uploads (
                                       id          uuid        not null default gen_random_uuid() primary key,
    event_id    uuid        not null references events(id) on delete cascade,
    media_type  text        not null check (media_type in ('image', 'video')),
    thumb_url   text,
    full_url    text        not null,
    preview_url text,                  -- video only
    width       integer,
    height      integer,
    size_kb     float,
    uploaded_at timestamptz not null default now()
    );


-- ── 4. COMMENTS ─────────────────────────────────────────────
-- Per-tile comment threads. Scoped to a single upload.
-- author is optional — defaults to 'anonymous' in the UI.
create table if not exists comments (
                                        id          uuid        not null default gen_random_uuid() primary key,
    upload_id   uuid        not null references uploads(id) on delete cascade,
    content     text        not null check (char_length(content) <= 200),
    author      text        not null default 'anonymous',
    created_at  timestamptz not null default now()
    );


-- ── 5. ASSET_CONVERSIONS ────────────────────────────────────
-- Tracks compression metrics per upload (codec, before/after size, % reduction).
-- Displayed as a badge inside TileOverlay — "H264 · −68% compressed".
-- Doubles as a live metrics dashboard for the portfolio demo.
create table if not exists asset_conversions (
                                                 id            uuid        not null default gen_random_uuid() primary key,
    upload_id     uuid        not null references uploads(id) on delete cascade,
    asset_name    text        not null,  -- e.g. "full.mp4", "thumb.webp"
    source        text        not null,  -- e.g. "video_processor_v1"
    before_kb     float       not null,
    after_kb      float       not null,
    reduction_pct float       not null,
    codec         text        not null,  -- e.g. "h264", "webp"
    processed_at  timestamptz not null default now()
    );


-- ── INDEXES ─────────────────────────────────────────────────
-- Speeds up the most common queries: fetching uploads/comments by event,
-- and looking up guests by event for SMS dispatch.
create index if not exists idx_uploads_event_id
    on uploads(event_id);

create index if not exists idx_uploads_uploaded_at
    on uploads(uploaded_at desc);

create index if not exists idx_comments_upload_id
    on comments(upload_id);

create index if not exists idx_comments_created_at
    on comments(created_at desc);

create index if not exists idx_guests_event_id
    on guests(event_id);

create index if not exists idx_asset_conversions_upload_id
    on asset_conversions(upload_id);


-- ── REALTIME ────────────────────────────────────────────────
-- Enables Supabase Realtime push for live mosaic wall updates
-- and per-tile comment threads.
alter publication supabase_realtime add table uploads;
alter publication supabase_realtime add table comments;


-- ── ROW LEVEL SECURITY ──────────────────────────────────────
-- The anon key is exposed in the browser bundle — RLS is the
-- only thing standing between the public and your data.
-- Rule of thumb:
--   public read  = fine (mosaic wall is public)
--   public insert = comments only (open annotation)
--   everything else = service role only (FastAPI uses SUPABASE_SERVICE_KEY)

alter table events           enable row level security;
alter table guests           enable row level security;
alter table uploads          enable row level security;
alter table comments         enable row level security;
alter table asset_conversions enable row level security;

-- events: public read, no direct client insert/update
create policy "events: public read"
  on events for select
                           using (true);

-- guests: no anon access at all (phone numbers — service role only)
-- (no policies = deny all for anon key)

-- uploads: public read; inserts handled by FastAPI via service role
create policy "uploads: public read"
  on uploads for select
                            using (true);

-- comments: public read + insert (open annotation, 200-char limit enforced above)
create policy "comments: public read"
  on comments for select
                             using (true);

create policy "comments: public insert"
  on comments for insert
  with check (true);

-- asset_conversions: public read (used for compression badges in TileOverlay)
create policy "asset_conversions: public read"
  on asset_conversions for select
                                             using (true);


-- ── SEED: DEMO EVENT ────────────────────────────────────────
-- A permanent public event for your portfolio.
-- is_demo = true bypasses all token checks on the wall and gallery routes.
-- Upload stock content via: /event/demo/upload?token=demo-upload-token
-- Portfolio link: /event/demo/wall (no token required, always accessible)
insert into events (name, slug, is_demo, upload_token, view_token, expires_at)
values (
           'Demo — Live Event Wall',
           'demo',
           true,
           'demo-upload-token',
           'demo-view-token',
           '2099-01-01 00:00:00+00'   -- effectively never expires
       )
    on conflict (slug) do nothing;


-- ── DONE ────────────────────────────────────────────────────
-- Next step: FastAPI ingest service (Step 3)
-- Verify setup in Supabase: Table Editor → confirm 5 tables exist
-- Check Realtime: Database → Replication → confirm uploads + comments listed