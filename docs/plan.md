# Sarmal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Phone-first Taboo-style party game with a spiral board, playable on one phone or many phones via a local server.

**Architecture:** Pure rules engine (`public/game.js`, UMD) used by both the browser (single-phone) and the zero-dependency Node server (multi-phone, SSE + POST /act, same pattern as PetekDiyari). Client renders `Game.view()` output; the board is inline SVG with rAF pawn hops.

**Tech Stack:** Node ≥18 (built-in http, fetch, node:test), vanilla JS (classic scripts so the page also works from `file://`), WebAudio.

**Spec:** `docs/tasarim.md`

## Global Constraints
- No npm dependencies. All UI copy Turkish.
- BASE = 60 s; 15 Kelime ×2 = 120 s; others ×1.
- Scores: Doğru +1, Tabu −1, Pas 0; 3 passes/turn in Anlat & Pandomim; 15 Kelime: unlimited passes, each pass costs 1 word, 15 words/turn, turn ends at 15.
- Çiz: no live scoring; "Sonraki kart" during the turn; Doğru/Ceza counts entered after time is up.
- Sound: silent during the turn, tick each second for the last 5 s, buzzer at the end.
- Board: 40 squares (0 = start, outer) + square 40 = center finish; squares 0..39 carry only selected modes.
- Teams 2..6, each ≥2 players.

## Review Focus
- Describer's phone disconnects mid-turn → host can still press every describer button; server timer still ends the turn.
- Two phones press Doğru at the same instant → second press lands on the next card, never on a finished turn (server serializes; act rejects outside `play`).
- Negative net score at position 0 → pawn stays at 0.
- Deck runs out → reshuffle used cards, game continues.
- Page refresh in single-phone mode → game restored from localStorage.

---

### Task 1: Word sources
**Files:** Create `public/words.js`, `public/yedek.js`; Test `test.js`
**Interfaces — Produces:** `Words.SOURCES: {url, pick(json) -> [[word, forbidden[]]]}[]`; `Words.merge(lists: [[word, forbidden[]]][]) -> Card[]` where `Card = {w: string, t: string[] (≤5)}`, deduped by `toLocaleLowerCase('tr')`, cards with <3 taboo words dropped; `YEDEK: Card[]` (nejdetkadir MIT list).
- [ ] Test: merge dedupes "Kedi"/"KEDİ", trims to 5 taboo words, drops a card with 2 taboo words.
- [ ] Implement, run `node --test test.js` → PASS.

### Task 2: Rules engine
**Files:** Create `public/game.js`; Test `test.js`
**Interfaces — Produces:**
- `Game.MODES = {anlat, ciz, limit, mime}` each `{name, icon, mult, opts}`; `Game.BASE = 60`, `Game.N = 40`.
- `Game.newGame({teams:[{name, color, players:[{id, name}]}], modes:string[], deck:Card[]}, rnd?) -> G`
- `Game.act(G, m, now, who) -> string|undefined` (error text). `who = null` → single phone (all rights) or `{id, host}`. Moves: `start`, `ok`, `pass`, `tabu`, `word`, `next`, `score {ok, ceza}`, `timeup`.
- `Game.view(G, now, who) -> {phase, teams, board, turn, card|null, role, last, winner, endsAt}`; `role ∈ describer|rival|mate|all`.
- [ ] Tests: anlat scoring (+1/−1/0, 4th pass rejected); limit (pass costs a word, 15th word ends turn, endsAt = now+120000); ciz (ok/pass rejected, `score` moves pawn); pawn clamps at 0; reaching 40 → `over` with winner; describer rotates within team; mate view has `card === null`; board only contains selected modes; `timeup` before endsAt rejected; deck reshuffles when exhausted.
- [ ] Implement, run tests → PASS.

### Task 3: Server
**Files:** Create `server.js`, `.claude/launch.json`
**Interfaces — Consumes:** Game, Words, YEDEK. **Produces:** `GET /events?t=<token>` SSE of `{room, me, lobby|game view, urls, now}`; `POST /act {t, a, ...}` → `{err}`; `GET /kelimeler.json`.
- Lobby moves: `create {name}`, `enter {room}`, `join {name}`, `leave`, `team+`, `team-`, `assign {pid, team}` (−1 = pool), `modes {list}`, `start`, `lobby` (host: back to lobby). Game moves forwarded to `Game.act`; per-room setTimeout fires `timeup` at `endsAt`.
- Words: fetch SOURCES at startup, merge, write `kelimeler.json`; else read it; else YEDEK.
- [ ] Smoke: start on 3001, curl `/`, `/kelimeler.json` count > 500, create+join via curl.

### Task 4: Client
**Files:** Create `public/index.html`, `style.css`, `client.js`, `sound.js`
- Screens: home (Tek telefon / Oda kur / Odaya katıl / Nasıl oynanır), lobby (pool + team zones, pointer drag + tap-select, modes, start), ready (SVG spiral board, pawns animate on position change, next team/describer/mode, last summary, Başla), play (timer, card, buttons per mode/role), score (Çiz steppers), over.
- Single phone: same renderers fed by local `Game`; state saved to localStorage after each act.
- No server (`file://` or `/events` unreachable) → multi-phone buttons disabled with note.
- Sound: `sfx('tick')`, `sfx('end')`; mute toggle.
- [ ] Verify in browser at 375×812: full single-phone game round per mode; two tabs as two phones in a room.
