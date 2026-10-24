// Johnson Family Game Night server: room codes, player tokens, each phone's private card, and star ratings per game.
// Deployed as the `gamenight` edge function on the PFLX Applications Supabase project.
// Auth is per-room tokens (host token, per-player token), so verify_jwt is off.
// Tables: public.gamenight_rooms / gamenight_players / gamenight_game_ratings (RLS on, no browser access).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const ROOMS = "gamenight_rooms", PLAYERS = "gamenight_players", RATINGS = "gamenight_game_ratings";
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const PIN = "ABCDEFGHJKMNPQRSTUVWXYZ";
// Games whose private cards the TV builds (everything except Flaugin, which the server deals itself).
const GAMES = ["copycat", "glitch", "agenda", "rules", "taboo", "wave", "mafia", "spades", "uno", "escape"];
const ALL_GAMES = ["flaugin", ...GAMES];
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...CORS, "Content-Type": "application/json" } });
const err = (msg: string, status = 400) => json({ error: msg }, status);
const tok = () => { const a = new Uint8Array(18); crypto.getRandomValues(a); return btoa(String.fromCharCode(...a)).replace(/[^A-Za-z0-9]/g, ""); };
const rint = (n: number) => { const a = new Uint32Array(1); crypto.getRandomValues(a); return a[0] % n; };
const cleanCode = (c: unknown) => String(c ?? "").toUpperCase().replace(/[^A-Z]/g, "").slice(0, 4);
const cleanDevice = (d: unknown) => { const s = String(d ?? "").toLowerCase(); return /^[a-z0-9]{12,48}$/.test(s) ? s : ""; };

// Weighted pick without replacement. The TV sends fairness weights for the whole night
// (fewer turns so far and not picked recently = more likely). Without them, last round's fakers are less likely.
function pickFakers(ids: string[], count: number, last: string[], weights: Record<string, unknown> | null) {
  const wOf = (id: string) => {
    const w = weights ? Number(weights[id]) : NaN;
    if (Number.isFinite(w) && w > 0) return Math.min(1, Math.max(0.01, w));
    return last.includes(id) ? 0.2 : 1;
  };
  const pool = ids.map((id) => ({ id, w: wOf(id) }));
  const out: string[] = [];
  while (out.length < count && pool.length) {
    const total = pool.reduce((t, x) => t + x.w, 0);
    let r = (rint(1_000_000) / 1_000_000) * total, k = 0;
    for (; k < pool.length - 1; k++) { r -= pool[k].w; if (r < 0) break; }
    out.push(pool[k].id); pool.splice(k, 1);
  }
  return out;
}

async function hostRoom(code: string, hostToken: unknown) {
  const { data } = await db.from(ROOMS).select("*").eq("code", code).maybeSingle();
  if (!data || data.host_token !== hostToken) return null;
  return data;
}

async function validPlayers(code: string, ids: string[]) {
  const { data: ps } = await db.from(PLAYERS).select("id").eq("room", code).in("id", ids);
  return !!ps && ps.length === ids.length;
}

// Per game: average, count and this device's own rating. "top" is the best average (more ratings breaks a tie).
async function ratingSummary(device: string) {
  const { data, error } = await db.from(RATINGS).select("device,game,stars").limit(50000);
  if (error) throw error;
  const games: Record<string, { count: number; avg: number; mine: number | null }> = {};
  for (const g of ALL_GAMES) {
    const rows = (data ?? []).filter((r) => r.game === g);
    const count = rows.length;
    const avg = count ? rows.reduce((t, r) => t + Number(r.stars), 0) / count : 0;
    const mine = device ? (rows.find((r) => r.device === device)?.stars ?? null) : null;
    games[g] = { count, avg: Math.round(avg * 100) / 100, mine };
  }
  let top: string | null = null;
  for (const g of ALL_GAMES) {
    const x = games[g];
    if (!x.count) continue;
    if (!top || x.avg > games[top].avg || (x.avg === games[top].avg && x.count > games[top].count)) top = g;
  }
  return { games, top };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return err("POST only", 405);
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return err("Bad JSON"); }
  const action = String(body.action ?? "");
  try {
    if (action === "create") {
      await db.from(ROOMS).delete().lt("updated_at", new Date(Date.now() - 86400000).toISOString());
      for (let i = 0; i < 12; i++) {
        let code = ""; for (let k = 0; k < 4; k++) code += PIN[rint(PIN.length)];
        const hostToken = tok();
        const { error } = await db.from(ROOMS).insert({ code, host_token: hostToken });
        if (!error) return json({ code, hostToken });
      }
      return err("Couldn't find a free room code. Try again.", 503);
    }

    if (action === "join") {
      const code = cleanCode(body.code);
      const name = String(body.name ?? "").trim().replace(/\s+/g, " ").slice(0, 14);
      if (code.length !== 4) return err("That PIN should be 4 letters.");
      if (!name) return err("Type your name.");
      const { data: room } = await db.from(ROOMS).select("code").eq("code", code).maybeSingle();
      if (!room) return err("No game with PIN " + code + ". Check the big screen.", 404);
      const { count } = await db.from(PLAYERS).select("id", { count: "exact", head: true }).eq("room", code);
      if ((count ?? 0) >= 60) return err("This room is full.", 409);
      const token = tok();
      const { data, error } = await db.from(PLAYERS).insert({ room: code, name, token }).select("id").single();
      if (error) throw error;
      return json({ playerId: data.id, token, name });
    }

    // Keeps a room alive while the TV is open (rooms untouched for a day are cleaned up).
    if (action === "touch") {
      const code = cleanCode(body.code);
      const room = await hostRoom(code, body.hostToken);
      if (!room) return err("Not the host of this room.", 403);
      await db.from(ROOMS).update({ updated_at: new Date().toISOString() }).eq("code", code);
      return json({ ok: true });
    }

    // Flaugin: the server picks the word, the Flauger(s) and the optional Troll, so even the TV can't see them until the reveal.
    if (action === "deal") {
      const code = cleanCode(body.code);
      const room = await hostRoom(code, body.hostToken);
      if (!room) return err("Not the host of this room.", 403);
      const ids = Array.isArray(body.playerIds) ? [...new Set(body.playerIds.map(String))] : [];
      if (ids.length < 3 || ids.length > 30) return err("Need 3 to 30 players.");
      if (!(await validPlayers(code, ids))) return err("Some players aren't in this room.");
      const words = Array.isArray(body.words) ? body.words.map((w) => String(w).trim().slice(0, 40)).filter(Boolean) : [];
      if (!words.length) return err("No words in this pack.");
      const word = words[rint(words.length)];
      const nFib = Number(body.fibs) === 2 && ids.length >= 6 ? 2 : 1;
      const weights = body.weights && typeof body.weights === "object" ? body.weights as Record<string, unknown> : null;
      const fib = pickFakers(ids, nFib, room.game === "flaugin" ? (room.fib ?? []).map(String) : [], weights);
      // The Troll (column "clown") knows the word but wants to be voted out. Needs at least 4 players.
      const others = ids.filter((id) => !fib.includes(id));
      const clown = body.clown === true && ids.length >= 4 && others.length >= 3 ? others[rint(others.length)] : null;
      const round = (room.round ?? 0) + 1;
      const { error } = await db.from(ROOMS).update({ game: "flaugin", cards: null, round, word, pack: String(body.pack ?? "").slice(0, 40), hint: body.hint !== false, fib, clown, updated_at: new Date().toISOString() }).eq("code", code);
      if (error) throw error;
      return json({ round, fibCount: nFib, clown: !!clown });
    }

    // Other games: the TV builds each player's private card and the server hands each phone only its own.
    // Starts a new round (phones refetch their card when the round changes).
    if (action === "dealCards") {
      const code = cleanCode(body.code);
      const room = await hostRoom(code, body.hostToken);
      if (!room) return err("Not the host of this room.", 403);
      const game = String(body.game ?? "");
      if (!GAMES.includes(game)) return err("Unknown game.");
      const cards = body.cards && typeof body.cards === "object" ? body.cards as Record<string, unknown> : null;
      if (!cards) return err("No cards.");
      const ids = Object.keys(cards);
      if (ids.length < 2 || ids.length > 30) return err("Need 2 to 30 players.");
      if (JSON.stringify(cards).length > 60000) return err("Cards too large.");
      if (!(await validPlayers(code, ids))) return err("Some players aren't in this room.");
      const round = (room.round ?? 0) + 1;
      const { error } = await db.from(ROOMS).update({ game, cards, round, word: null, fib: [], clown: null, updated_at: new Date().toISOString() }).eq("code", code);
      if (error) throw error;
      return json({ round });
    }

    // Change some players' cards in the middle of a round (a new hand, a private result), without starting a new round.
    if (action === "setCards") {
      const code = cleanCode(body.code);
      const room = await hostRoom(code, body.hostToken);
      if (!room) return err("Not the host of this room.", 403);
      if (String(body.game ?? "") !== room.game || Number(body.round) !== room.round) return err("That round is over.", 409);
      const patch = body.cards && typeof body.cards === "object" ? body.cards as Record<string, unknown> : null;
      if (!patch) return err("No cards.");
      const ids = Object.keys(patch);
      if (!ids.length || ids.length > 30) return err("Bad cards.");
      if (!(await validPlayers(code, ids))) return err("Some players aren't in this room.");
      const cards = { ...((room.cards ?? {}) as Record<string, unknown>), ...patch };
      if (JSON.stringify(cards).length > 60000) return err("Cards too large.");
      const { error } = await db.from(ROOMS).update({ cards, updated_at: new Date().toISOString() }).eq("code", code);
      if (error) throw error;
      return json({ ok: true });
    }

    if (action === "card") {
      const code = cleanCode(body.code);
      const { data: p } = await db.from(PLAYERS).select("id,token").eq("id", String(body.playerId ?? "")).eq("room", code).maybeSingle();
      if (!p || p.token !== body.token) return err("Not a player in this room.", 403);
      const { data: room } = await db.from(ROOMS).select("round,word,pack,hint,fib,clown,game,cards").eq("code", code).maybeSingle();
      if (!room || !room.round) return err("No cards dealt yet.", 404);
      if (room.game && room.game !== "flaugin") {
        const card = room.cards ? (room.cards as Record<string, unknown>)[p.id] : null;
        if (!card) return err("You're not in this round. Wait for the next one.", 404);
        return json({ round: room.round, game: room.game, card });
      }
      const isFib = (room.fib ?? []).includes(p.id);
      const isClown = !isFib && room.clown === p.id;
      return json({ round: room.round, game: "flaugin", isFib, isClown, word: isFib ? null : room.word, pack: isFib && !room.hint ? null : room.pack, twoFibs: (room.fib ?? []).length > 1 });
    }

    if (action === "reveal") {
      const code = cleanCode(body.code);
      const room = await hostRoom(code, body.hostToken);
      if (!room) return err("Not the host of this room.", 403);
      return json({ round: room.round, word: room.word, fib: room.fib ?? [], clown: room.clown ?? null });
    }

    // Star ratings for each game: one per device per game (rating again replaces it).
    if (action === "ratings") {
      return json(await ratingSummary(cleanDevice(body.device)));
    }
    if (action === "rate") {
      const device = cleanDevice(body.device);
      const game = String(body.game ?? "");
      const stars = Math.round(Number(body.stars));
      if (!device) return err("Bad device.");
      if (!ALL_GAMES.includes(game)) return err("Unknown game.");
      if (!(stars >= 1 && stars <= 5)) return err("Pick 1 to 5 stars.");
      const { error } = await db.from(RATINGS).upsert({ device, game, stars, updated_at: new Date().toISOString() }, { onConflict: "device,game" });
      if (error) throw error;
      return json(await ratingSummary(device));
    }

    return err("Unknown action");
  } catch (e) {
    console.error(e);
    return err("Server error. Try again.", 500);
  }
});
