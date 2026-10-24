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

## Timers and settings
Each game has its own house rules, saved on the device that hosts:
- **Card study time** (Off to 1 min, default 30 sec): phones get time to study their cards, then the round starts by itself.
- **10-second countdown** before the talking starts, so nobody has to press Start.
- **Each player's turn** (Off to 2 min): every player gets their own turn in a random order; the clock moves on by itself, and the speaker can tap "I'm done" on their phone.
- **Open talk / debate timer** after the turns.
- Every stretch has **Skip** and **+30 sec** on the TV.
- Also per game: number of Flaugers or Copycats (6+ players), Glitch details changed (1 to 3), Rulebreakers word/number mode and guesses (1 to 3).

## Music
Game Show Grind plays on the home screen. Cuts from Lofi Gameshow, Spin the Wreck, Spin the Wreck 2 and Gravity Glitch (in `music/`) play under the lobby, the deal, the talking, voting and results, with short stingers for the deal, "go", votes and wins. Music only plays on the TV, never on phones.

## Intro, transitions and ratings
- First visit each session plays the Adventures with the Johnsons logo scene (tap or any key skips), then the home screen.
- Red, gold and green bars sweep between screens, with title cards for each step: round, clues/debate, vote, reveal, and the next game.
- 5-star rating for each game, on its tile on the home screen, on players' phones after a round, and after one-phone rounds. One rating per device per game; stored in `gamenight_game_ratings`. The best-rated game gets a "Top rated" ribbon and a line under the title.
