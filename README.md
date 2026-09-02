# My AI — Step 1: bare-bones chat

A minimal personal chat assistant. Next.js frontend + backend, Google Gemini
free-tier API as the brain. No memory or tools yet — that's step 2 and 3.

## Setup (do this in VS Code's terminal)

1. **Get a free Gemini API key** (no credit card): go to
   https://aistudio.google.com/app/apikey and click "Create API key".

2. **Install dependencies:**
   ```
   npm install
   ```

3. **Add your key:**
   ```
   cp .env.local.example .env.local
   ```
   Then open `.env.local` and paste your real key in place of `your_key_here`.

4. **Run it:**
   ```
   npm run dev
   ```
   Open http://localhost:3000 — you should see the chat screen and be able
   to talk to it.

## Where things live

- `app/page.tsx` — the chat screen (frontend)
- `app/api/chat/route.ts` — the backend endpoint the frontend calls
- `lib/gemini.ts` — the only file that actually talks to Google's API
- `lib/personality.ts` — edit this to change how your assistant talks/behaves
- `.env.local` — your API key (never gets committed to git, listed in .gitignore)

## Deploying to the web (free)

When you're ready to put this online instead of just running it locally:
1. Push this project to a GitHub repo.
2. Go to vercel.com, sign in with GitHub, import the repo.
3. Add `GEMINI_API_KEY` as an environment variable in Vercel's project settings
   (same value as your `.env.local`).
4. Deploy. Vercel's free tier covers this comfortably for personal use.

## Map & Spotify setup

- **Map**: uses Google's Photorealistic 3D Tiles (`google.maps.maps3d`) for
  the Earth-style flyover, plus the Geocoding API to resolve place names.
  Needs `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (browser) and `GOOGLE_MAPS_API_KEY`
  (server) — see the setup steps Claude walked through in chat.
- **Spotify**: needs `SPOTIFY_CLIENT_ID` / `SPOTIFY_CLIENT_SECRET`.
- **Memory**: persists chat history to Supabase — needs `SUPABASE_URL` and
  `SUPABASE_SERVICE_ROLE_KEY`.
