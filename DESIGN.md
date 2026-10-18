# aleemxnurul.love — "Every Star Was You"

The front door to everything Aleem has built for Nurulain. When she opens
`https://aleemxnurul.love` she should feel, in this order: **curious → touched →
delighted → loved.** It is a gift first and a portfolio second.

Design and frontend direction: Claude. Implementation, scraping, build scripts and
generated assets: Codex. This document is the contract between them.

---

## 1. The concept

Every website Aleem made for Nurul is a **star** in the real sky's best-known love
story: **the Weaver Girl and the Cowherd** (Qixi / 七夕). Vega (the Weaver Girl, in
Lyra) and Altair (the Cowherd, in Aquila) are lovers separated by the Silver River,
the Milky Way. Once a year, magpies build a bridge so they can meet.

Aquila's 5 stars + Lyra's 6 stars = **exactly 11, one per site.** In the order they
were made (June → October 2026), the path starts at **Altair** (Aleem's star, the
confession), climbs through Aquila, crosses the Milky Way, and ends at **Vega**
(Nurul's star, the newest site): *every site I built was a step across the river
toward you.* Star lines draw in as she visits them.

The **twelfth star is Deneb**, the bridge. It stays unlit until she has visited all
eleven. Then magpies fly up out of the Milky Way, form a bridge between Altair and
Vega, Deneb ignites, the **Summer Triangle** (Vega–Altair–Deneb) draws itself, and
the finale opens. The bridge is the wedding, 21 August 2027.

### Star map (use real J2000 RA/Dec, projected, so it matches the actual sky)
| # | Site | Star | Constellation |
|---|---|---|---|
| 1 | confession | **Altair** (α Aql) | Aquila |
| 2 | for_her | Tarazed (γ Aql) | Aquila |
| 3 | rsvp *(draft)* | Alshain (β Aql) | Aquila |
| 4 | wymm | δ Aquilae | Aquila |
| 5 | return_to_me | ζ Aquilae (Okab) | Aquila |
| 6 | our_journey *(draft)* | Sheliak (β Lyr) | Lyra |
| 7 | our_flight | Sulafat (γ Lyr) | Lyra |
| 8 | our_gallery | δ² Lyrae | Lyra |
| 9 | sort_of_us | ζ¹ Lyrae | Lyra |
| 10 | our_hearts | ε Lyrae (the Double Double) | Lyra |
| 11 | our_miles | **Vega** (α Lyr) | Lyra |
| 12 | *the bridge* | **Deneb** (α Cyg) | Cygnus |

Draw the standard figure lines for each constellation (Lyra's parallelogram + Vega/ε/ζ
triangle; Aquila's spine Alshain–Altair–Tarazed plus δ and ζ). Rotate/scale the
projection so Altair sits lower-left, Vega upper-right, the Milky Way runs diagonally
between them, and the whole figure fits a 390×844 portrait screen with labels.
Each project card shows its star: `★ Tarazed · γ Aquilae`. Vega and Altair are
rendered larger and brighter than the rest, as they are in the real sky.

A small **paper plane** (borrowed from Our Flight) is her cursor through the sky: it
carries the opening letter, leaves the dotted trail that becomes the constellation,
and flies to whichever star she taps.

## 2. Scenes (single page, no router)

### Scene 0 — The seal (first visit only; skippable on return)
- Deep night sky (canvas starfield, slow twinkle, pointer/gyro parallax).
- Center: a cream envelope, champagne wax seal stamped with the A&N monogram
  (`public/brand/monogram.png`, copied from `our_flight/public/monogram-a-and-n.png`).
- Kicker (mono, small caps): `FOR NURULAIN · OPEN WHEN READY`
- Interaction: **press and hold** the seal (≈900 ms). A champagne ring fills around it;
  on release before full, it springs back with a tiny wobble. On full: seal cracks into
  two halves (SVG halves rotate apart), flap opens, letter slides up. Keyboard: Enter/Space
  holds. Reduced motion: single tap opens.
- Returning visitors (`localStorage` flag) land straight in the sky with a "read the
  letter again" link.

### Scene 1 — The letter
Cream paper card, handwriting font for the body, revealed line by line (≈ 60 ms/char,
tap to skip). Copy in `content.ts → letter`. Ending CTA button: **"Show me ✦"**.
On click the letter folds (two quick folds, GSAP) into the paper plane, which takes off,
loops once, and drags a dashed champagne trail that settles into the constellation path.

### Scene 2 — The sky (the hub)
- Full viewport. Lyra + Aquila centred with a soft, slowly drifting **Milky Way** band
  (layered canvas noise + dense dust stars, blush/champagne tint) running diagonally
  between them; sized to fit a 390×844 phone in portrait with room for labels; larger
  and airier on desktop. Small italic labels "the Weaver Girl" near Vega and "the
  Cowherd" near Altair.
- **(i) button** (top-right, 44 px tap target, champagne ring): opens an "About this
  sky" sheet (same sheet component as the project card). Content in
  `content.ts → constellationInfo`, see §6. Includes a mini legend: bright star = live
  site, dashed silver = draft, star with a heart = visited, unlit Deneb = the bridge.
- 11 stars, each a `<button>` (accessible name = project title + month). Star = soft
  radial glow + 4-point sparkle, gentle pulse with randomised phase.
  - **Live** projects: champagne glow.
  - **Drafts** (`rsvp`, `our_journey`): dimmer silver-blue, dashed ring, label suffix
    "draft". These are honoured, not hidden.
  - **Visited** (localStorage): fills solid, small heart replaces the sparkle,
    connecting line to previous visited neighbour draws in.
- Label under each star: title in Instrument Serif italic + month in mono
  (`JUN '26`).
- Header (top-left): small monogram + "aleemxnurul.love". Top-right: progress
  `3 / 11 stars visited` as tiny heart pips, and a **list view** toggle (accessible,
  also great on tiny screens).
- Hover / focus on a star: plane banks toward it, label lifts, preview thumb peeks.
- Tap a star: plane flies along the constellation lines to it (≈ 700 ms), then the **project
  card** opens.
- Ambient: occasional shooting star (every 8–14 s); tapping a shooting star spawns
  a burst of tiny hearts and a random line from `content.ts → whispers`.
- Tap on empty sky anywhere → 3–5 little hearts pop and float up (cap active count).

### Scene 3 — The project card
Bottom sheet on mobile (drag down to dismiss), centred dialog on desktop. Focus trapped,
Esc closes, returns focus to the star.
- Phone-frame screenshot of the site (scraped, see §5), slight 3D tilt following
  pointer/gyro. Tap screenshot = same as Enter.
- Eyebrow: `NO. 04 · JUL 2026` (+ `DRAFT · NEVER SENT` badge for drafts).
- Title (display serif), one-line "what it is".
- **"Why I made it"** — Aleem's note in handwriting font. This is the heart of the card.
- Stat chips from `stats.json`: `22 commits`, `73 days of love`, plus one custom
  fact (e.g. `803 story nodes`).
- Primary CTA **"Step inside →"**. Transition: a circle in the project's accent colour
  expands from the button to fill the screen, the project title flashes centred for a
  beat, then `location.href = url` (same tab, so her back button returns to the sky).
  Mark visited *before* navigating.
- Secondary: "Next star →" / "← Previous" to walk the timeline without closing.
- Gate hints where relevant (`hint` field), e.g. Our Flight: "You'll need your
  boarding code, you already know it ✈".

### Scene 4 — Below the sky (scroll)
1. **The numbers**, counted up when scrolled into view:
   `11 websites` · `{totalCommits} commits` · `{daysSince 2026-06-22} days of building
   you things` · `∞ reasons` (the ∞ draws itself as an SVG path).
2. **"How much do I love you?"** slider. Track says `a little ↔ a lot`. As she drags
   past ~90 % the thumb pushes *through* the end of the track, the track stretches, the
   label cycles (`a lot` → `more than that` → `the slider can't hold it` → `okay it broke
   💥`), and on release hearts burst from the thumb. Never actually lets her pick less.
3. **Countdown** to the wedding: `21 August 2027` (Nikah) with days/hours/min, styled
   as a departure board flap display (nod to Our Flight).
4. **The twelfth star.** Closing line, centred, a single faint unlit star (Deneb)
   above it: "Eleven websites. And the twelfth star? That one's the bridge, our whole
   life, still being written." When all 11 are visited this star lights up, the
   magpie bridge forms in the sky above, the Summer Triangle draws, and a hidden note
   (`content.ts → finale`) unfolds.
5. Footer: "made by Aleem, for Nurulain, one commit at a time ♡"

### Easter eggs
- Typing `nurul` anywhere (or tapping the monogram 5×) → it rains hearts for 4 s.
- Long-press any visited star → plays its note back as a "voice-memo style" text bubble.

## 3. Visual language

Shares the wedding brand (Our Flight / Our Gallery) so the apex domain feels like home,
then warms it up with blush.

| Token | Value | Use |
|---|---|---|
| `--night-0` | `#04121D` | deepest sky (top) |
| `--night-1` | `#033A4E` | brand navy (horizon glow) |
| `--champagne` | `#D9B472` | stars, lines, accents |
| `--champagne-soft` | `#F1DDB0` | glows, highlights |
| `--blush` | `#F4B6C2` | hearts, love moments |
| `--rose` | `#E07A93` | heart fills, CTA hover |
| `--paper` | `#FFF6E9` | letter, cards |
| `--ink` | `#2A2233` | text on paper |
| `--draft` | `#9FB4C7` | draft stars |

- Sky gradient: radial from bottom centre `--night-1` → `--night-0`, faint aurora
  band of blush at 6 % opacity drifting slowly.
- Type: **Instrument Serif** (display, often italic) · **IBM Plex Mono** (eyebrows,
  dates, numbers) · **Caveat** (handwriting: letter + notes) · system sans for UI.
  Self-host via `@fontsource/*`.
- Grain: subtle SVG noise overlay at 4 % for warmth.
- Corners: cards 24 px, chips full-round. Shadows are glows, not drop shadows.
- Every project also has an `accent` (its own brand colour) used for its card's
  top hairline, its CTA, and its exit wipe.

## 4. Motion rules
- Library: GSAP (+ ScrollTrigger) for timelines, canvas 2D for stars/particles.
- Easing: `power3.out` for entrances, `back.out(1.6)` for playful pops, `expo.inOut`
  for the exit wipe. Nothing linear except twinkle.
- Durations: micro 150–250 ms, UI 350–500 ms, scene 900–1400 ms.
- 60 fps on a mid-range Android: cap particles (≤ 120 stars on mobile, ≤ 40 hearts),
  pause canvas when tab hidden or sky offscreen, DPR cap 2.
- `prefers-reduced-motion`: no parallax, no flight path, fades only, seal opens on
  tap, canvas renders a static frame.

## 5. Data, scraping & assets (Codex)

### `src/content.ts` — copy, filled in from the vault after unlock (§8)
```ts
type Project = {
  id: string; title: string; subtitle: string; url: string;
  month: string;            // "JUN '26"
  started: string; ended: string; // ISO dates (from git; editable)
  status: 'live' | 'draft';
  accent: string;           // project brand hex
  note: string;             // "why I made it"
  fact?: string;            // custom stat chip
  hint?: string;            // gate hint
  repo: string;             // folder name under ../ for stats
}
```

### `scripts/stats.mjs` (`npm run stats`)
Reads each sibling repo in `../<repo>` (and falls back to `gh api` if missing) to
produce `src/data/stats.json`: commits, first/last commit dates, days active. Committed
output so CI never needs the other repos.

### `scripts/capture.mjs` (`npm run capture`)
Playwright (Chromium) visits each live URL at 390×844 @2x and 1440×900, waits for
network idle + 2.5 s for intro animations, dismisses nothing, saves
`public/previews/<id>-mobile.webp` (~ 780 px wide, q≈78) and `<id>-desktop.webp`.
Also records each site's `<meta name="theme-color">`, OG image URL and `<title>` into
`src/data/scraped.json` (used as accent fallback, never to override `content.ts`).
Respect gated sites: just capture their landing screen.

### Generated assets (SVG in code, raster via script with sharp/Playwright)
- `wax-seal.svg` (two halves for the crack), `paper-plane.svg`, `envelope.svg`.
- Favicon: champagne 4-point star with a tiny heart, SVG + 32/180/192/512 PNGs.
- OG image `public/og.png` 1200×630: night sky, Lyra + Aquila across the Milky Way, "For Nurulain —
  every star was you". Render from an HTML template with Playwright.
- `manifest.webmanifest` (name "Every Star Was You", theme `#04121D`).

## 6. Copy

All of Aleem's words (the letter, each star's "why I made it" note, the whispers, the
legend in the (i) sheet and the finale) are private. They live in
`private/content.json` on Aleem's laptop and ship only as AES-256-GCM ciphertext in
`src/data/vault.json`. See §8.

## 7. Tech

- Vite + React 18 + TypeScript, GSAP, `@fontsource/*`. No backend, no analytics, no
  cookies. `localStorage` only for: `seen-letter`, `visited[]` (wrapped in try/catch).
- `base: '/'`, `public/CNAME` = `aleemxnurul.love`, `.github/workflows/deploy.yml`
  (GitHub Pages via Actions). `<meta name="robots" content="noindex">` (it's for her).
- Mobile-first: 390×844 is the hero viewport. Test 360, 390, 768, 1440.
- Lighthouse: performance ≥ 90 mobile, a11y ≥ 95. All stars and controls reachable by
  keyboard; list view mirrors the sky for screen readers.
- Playwright smoke test: open seal → letter → sky → open a card → "Step inside"
  navigates; reduced-motion path works; visited state persists.

## 8. The lock

The site is for Nurulain only. The seal asks a question only she can answer. Her answer
(normalised: lower-case, letters and digits only) is stretched with PBKDF2-SHA256
(600,000 iterations, random salt) into an AES-256-GCM key that decrypts
`src/data/vault.json`. A wrong answer decrypts nothing, so nothing private exists in the
repository, the build or the page until she answers. On success the derived key is kept
in `localStorage` so the seal opens with a hold on her devices afterwards.

- `private/content.json` — readable copy plus the question (gitignored).
- `private/answer.txt` — the answer, first line (gitignored).
- `npm run vault` — re-seals `src/data/vault.json`. Run it after editing either file, then
  commit `vault.json`.
