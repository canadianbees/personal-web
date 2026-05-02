// Centralized cache-control headers for API routes.
//
// Use `private` so Netlify's CDN does not cache responses — without this,
// the CDN serves the first cached response for all requests to the same path
// regardless of query params, causing all tiles to show the same image.
// The browser still caches normally.

export const CACHE_PRIVATE_1D  = "private, max-age=86400"   // browser: 1 day
export const CACHE_PRIVATE_1H  = "private, max-age=3600"    // browser: 1 hour
export const CACHE_NO_STORE    = "no-store"                  // nothing cached
