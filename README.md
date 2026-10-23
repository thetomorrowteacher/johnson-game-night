# Johnson Family Game Night

Party games on the TV, played on everyone's phones. Open the site on a TV or laptop, pick a game, and everyone joins with a 4-letter PIN or by scanning the QR code. No accounts, no app.

## Games

- **Flaugin** (Memphis slang for lying, fronting, faking it). Everyone gets the secret word except whoever is flaugin'. Give one-word clues, sniff out the faker, vote them out. 3 to 30 players. Also has a one-phone pass-and-play mode.

## How it works

- `index.html` + `app.js`: static site, served by GitHub Pages.
- Live rooms use Supabase Realtime (broadcast + presence).
- Secret cards come from the `flaudjer` Supabase edge function, so each phone only receives its own card. The word and Flaugin list never reach other phones until the reveal.
- Data lives in `flaudjer_rooms` / `flaudjer_players` (RLS on, no browser access). Rooms older than a day are cleaned up automatically.
