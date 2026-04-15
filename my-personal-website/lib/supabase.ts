import { createBrowserClient } from '@supabase/ssr'

// Singleton browser client — safe to import in any "use client" component
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
