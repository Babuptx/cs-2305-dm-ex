# Discrete Mathematics Companion

A lightweight static companion to the full supplied Rosen eighth-edition textbook: 13 chapters and 72 numbered sections, with end-of-chapter material, appendices, and reference entries. Front Matter is omitted at the owner's request. Section 1.1, Propositional Logic, is **complete** with eleven teaching units. Section 1.2, Applications of Propositional Logic, is **available for review** with ten teaching units covering translations, specifications, searches, puzzles, and circuits. Section 1.3, Propositional Equivalences, is **available for review** with twelve units covering equivalence laws, proofs, satisfiability, and puzzle encodings. Sections 5.1 and 5.2 cover mathematical induction, strong induction, and well-ordering in fourteen and eleven teaching units. Sections 5.3 and 5.4 add recursive definitions, structural induction, and recursive algorithms in fourteen teaching units each. Section 5.5 adds twelve units on program correctness, and Chapter 5 end-of-chapter material adds fourteen review and practice units. All Chapter 5 entries are now available. Section 6.1 begins counting with fifteen teaching units and two original diagrams. Sections 6.2 and 6.3 add fourteen units each on the pigeonhole principle and permutations and combinations, with three original diagrams. Section 6.4 adds fourteen units on binomial coefficients and identities; Section 6.5 adds sixteen units on generalized permutations and combinations. The pair adds three original diagrams. The fourteen published lessons include original worked examples and expandable checks. All other unwritten entries show **Not yet available.**

Live site: https://Babuptx.github.io/cs-2305-dm-ex/

## Development

Use Node.js 22 or newer:

```sh
npm ci
npm run validate
npm test
npm run build
npm start
```

Open http://127.0.0.1:8081. The server serves only `dist/`, binds to loopback, and uses `PORT` to override the port. Rebuild after changes. To check browser behavior, install Chromium with `npx playwright install chromium`, then run `npm run test:browser`. The test starts and stops its own server. `TEST_URL` can target the live site for verification; fixture tests still use local manifest data.

Publication freshness: the build adds a content-derived version to interface asset URLs. The reader revalidates manifest and lesson JSON with the server and refreshes availability when navigating. Unavailable entries also offer “Check for updates.” Browser checks include a real HTTP server with a ten-minute cache policy to cover returning readers with stale navigation and lesson data. If an old tab predates this behavior, open the site with a new query value before its section hash, such as `?refresh=1#1.1`, to load the current document and versioned assets.

## Structure and authoring

Navigation: `data/manifest.json`. Future lessons: `data/lessons/<section>.json`. Interface: `index.html`, `styles.css`, and `js/`. See [the lesson contract](docs/content-schema.md), [teaching style](docs/teaching-style.md), and [progress record](docs/progress.md).

Source PDFs and saved analysis are private local references. `.local/` contains the source index and verified page mappings on the author's workstation; it is ignored. `refer/`, PDFs, development tools, and analysis are excluded from Git and the build. The build uses an explicit allowlist of the interface, public JSON, and original SVG assets. Never put source extracts or private paths in those files. The existing quiz repository is read-only and separate.

Work only on the section or small teaching unit requested by the owner. On October 12, 2026, the owner approved finalizing Section 1.1 and explicitly authorized processing and publishing Section 1.2. Section 1.1 is complete; Section 1.2 remains in progress pending owner review. Validate JSON and mathematical examples, update availability accurately, and preserve stable URLs. Automated checks and editorial review serve different purposes; see the [Section 1.1 review record](docs/review-1.1.md) and [Section 1.2 review record](docs/review-1.2.md). The owner subsequently authorized building and publishing Section 1.3; see its [review record](docs/review-1.3.md). The owner then requested completing and publishing Sections 5.1 and 5.2; see the [Chapter 5 review record](docs/review-5.1-5.2.md). The owner subsequently requested Sections 5.3 and 5.4; see their [review record](docs/review-5.3-5.4.md). The owner then requested the final two Chapter 5 entries; see the [Section 5.5 and chapter review record](docs/review-5.5-end.md). The owner then requested Section 6.1; see its [review record](docs/review-6.1.md). The owner then explicitly requested processing and publishing Sections 6.2 and 6.3; see their [review record](docs/review-6.2-6.3.md). The owner then requested processing and publishing Sections 6.4 and 6.5; see their [review record](docs/review-6.4-6.5.md). Await feedback; do not start Section 6.6 or other unwritten sections automatically.

## Publication

The owner authorized publishing the shell to `Babuptx/cs-2305-dm-ex`. GitHub Pages uses GitHub Actions. On a push to `main`, `.github/workflows/pages.yml` installs dependencies, validates content, runs unit and desktop/mobile browser checks, builds the public allowlist, uploads `dist/`, and deploys it. Pull requests validate without deploying. Repository Pages settings use the GitHub Actions source.

After authorized changes: run checks, commit, push, inspect the workflow result, and verify the live homepage and section URLs. Later lessons require owner approval of their content before this publication sequence unless the owner explicitly requests publishing a draft for review, as for Section 1.1. Do not add textbook text, private source analysis, or credentials to commits. No license has been chosen by the owner.
