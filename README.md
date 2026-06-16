# Vozinha Live Follower Count

A public, single-page live counter for the Instagram followers of **Vozinha**
([@vozinha1](https://www.instagram.com/vozinha1/)) — Cape Verde's 40-year-old
goalkeeper who was Man of the Match in their 0–0 World Cup draw with Spain and
went viral (~50k → millions of followers in a day).

The number ticks up smoothly in the browser while a single server polls
Instagram on a timer and caches the result.

## How it works

```
external cron ──▶ GET /api/poll ──▶ FollowerProvider ──▶ Instagram (web_profile_info)
                       │
                       ▼
                  Redis snapshot ◀────────────────────────────┐
                       │                                       │
 browser ──poll 7s──▶ GET /api/count ──▶ snapshot JSON ──▶ rAF interpolation ──▶ counter
```

- **One writer.** Only `/api/poll` (triggered by cron) ever touches Instagram.
- **Everyone reads cache.** `/api/count` serves a CDN-cached snapshot, so a viral
  traffic spike hits the edge, not Instagram.
- **The browser fakes "live."** It derives followers/sec from the last two real
  samples and projects the number forward every animation frame
  (`lib/interpolation.ts`), capping growth once data goes stale.

## Local development

```bash
npm install
cp .env.example .env.local   # optional; defaults work for local dev
npm run dev                  # http://localhost:3000
```

With no Upstash creds set, the app uses an in-memory store. The first page load
(or a manual `GET /api/poll`) triggers one live fetch. Then:

```bash
curl http://localhost:3000/api/poll      # refresh the cached count
curl http://localhost:3000/api/count     # see the snapshot JSON
npm test                                 # interpolation unit tests
```

## Deploy (Vercel + Upstash, free tier)

1. Push to GitHub and import the repo in Vercel.
2. Add **Upstash Redis** (Vercel Marketplace) — it injects
   `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`.
3. Set env vars: `CRON_SECRET` (long random string), `TARGET_USERNAME=vozinha1`,
   `NEXT_PUBLIC_SITE_URL=https://<your-app>.vercel.app`.
4. Deploy.
5. Create a free 1-minute schedule at **cron-job.org** hitting
   `https://<your-app>.vercel.app/api/poll` with header
   `Authorization: Bearer <CRON_SECRET>`. (Vercel's own cron is daily-only on the
   free tier; `vercel.json` keeps a daily run as a backstop.)

## ⚠️ The one real risk: datacenter IP blocking

Instagram aggressively blocks datacenter IPs (which Vercel runs on). The free
`direct` scrape works from a home IP but **may return `null` from Vercel**. When
that happens the site keeps serving the last good number and the badge shows
"last verified X ago" — it degrades, it doesn't break.

Switching the data source is **one env var** (`FOLLOWER_PROVIDER`):

| Value    | Source                              | Notes                                  |
| -------- | ----------------------------------- | -------------------------------------- |
| `direct` | Free unauthenticated scrape         | Default. Best from a residential IP.   |
| `proxy`  | Same scrape via `PROXY_URL`         | Needs `npm i undici` + a residential proxy. |
| `apify`  | Apify Instagram Profile Scraper     | Needs `APIFY_TOKEN`. Most reliable (~$11/mo). |

## Legal / ToS

Unofficial, non-commercial fan/educational project. Not affiliated with
Instagram, Meta, the FCF, or Vozinha. Reads only public profile data at minimal
volume (one server, cached) and stores nothing but a follower count. No
Instagram branding is used. Be prepared to switch to a sanctioned source or take
it down if Instagram objects.
