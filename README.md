# Every Star Was You

A little universe for Nurulain: eleven websites, the real stars of Aquila and Lyra, and a bridge across the Milky Way. The complete creative contract is [DESIGN.md](DESIGN.md).

## Run locally

```sh
npm install
npm run dev
```

React 18, TypeScript, Vite, GSAP/ScrollTrigger and a canvas sky. Fonts are self-hosted through Fontsource. No backend or analytics.

In the restricted Windows sandbox, native esbuild cannot traverse a denied ancestor directory during development dependency optimisation. `npm run build` and `npm run preview` work there; the smoke suite starts and closes its own production preview. Normal local development uses `npm run dev`.

## Generate and verify

```sh
npm run stats
npm run capture
npm run assets
npm run build
npm run test:smoke
```

`stats` reads the eleven sibling Git repositories, falling back to `gh api` when a checkout is unavailable. Its JSON output ships with the site, so CI needs no sibling repositories.

`capture` visits each project's public landing screen without opening gates or dismissing introductions. It writes mobile and desktop WebP previews plus metadata and explicit failures in `src/data/scraped.json`. It requires network access and a Playwright Chromium installation. Existing successful previews remain usable when a later capture fails.

`assets` generates the seal halves, envelope, paper plane, monogram copy, icons, manifest and Playwright-rendered OG image. It reads the original monogram in `../our_flight/public/`.

Playwright tests cover the seal, letter, plane, dialogs, navigation, persistence, reduced motion, responsive layouts and accessibility. Reports and QA screenshots are ignored under `.qa/`, `test-results/` and `playwright-report/`. With a local preview running, `npm run audit` checks the contract's Lighthouse mobile performance and accessibility targets for the seal and sky.

## Deployment configuration

The supplied GitHub Pages Actions workflow builds the checked-in data and assets. The custom domain is `aleemxnurul.love`; Vite uses `base: '/'`. The page requests `noindex`. The workflow is configured only: no repository creation, push or deployment is performed by these scripts.

## The lock

Only Nurulain can open this site: the seal asks a question, and her answer is the key
that decrypts every word of the story (see DESIGN.md §8). To change the words or the
answer, edit `private/content.json` or `private/answer.txt` (both gitignored, keep a
backup), run `npm run vault`, and commit `src/data/vault.json`.
