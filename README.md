# Johnson Family Game Night

Party games on the TV, played on everyone's phones. Open the site on a TV or laptop, pick a game, and everyone joins with a 4-letter PIN or by scanning the QR code. No accounts, no app.

## Games

- **Flaugin** (Memphis slang for lying, fronting, faking it). Everyone gets the secret word except whoever is flaugin'. One-word clues, then vote. TV or one phone.
- **Copycat**. Everyone gets a secret mission for a debate; the Copycat's mission is a little different. TV or one phone.
- **The Glitch**. Everyone reads the same case file, except one file has two details changed and nobody knows whose. TV or one phone.
- **Secret Agenda**. A family decision with four choices; everyone has a hidden goal. Secret first pick, debate, final vote. TV.
- **Rulebreakers**. The gate has a secret rule. Test words or numbers, watch ACCEPTED/REJECTED, pick the rule (2 guesses). TV.

Content for every game lives in `content.js`.

## How it works

- `index.html` + `app.js`: static site, served by GitHub Pages.
- Live rooms use Supabase Realtime (broadcast + presence) on the PFLX Applications project.
- Secret cards come from the `gamenight` Supabase edge function, so each phone only receives its own card. The word and Flaugin list never reach other phones until the reveal.
- Data lives in `gamenight_rooms` / `gamenight_players` (RLS on, no browser access). Rooms older than a day are cleaned up automatically.

## Sound

- Theme music: "Game Show Grind" (`theme.mp3`), supplied by the Johnsons.
- Announcer: Kenney Voiceover Pack #1 by Kenney Vleugels (kenney.nl), CC0, the same female/male voice clips PFLX uses in X-Live and Battle Arena (`announcer/`).
- Sound effects are synthesized in the browser (`fx.js`), so there are no extra files.
