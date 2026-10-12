# Discrete Mathematics Companion

A lightweight static companion to the full supplied Rosen eighth-edition textbook. The first release is the navigation shell only: 13 chapters and 72 numbered sections, with end-of-chapter material, appendices, front matter, and reference entries. All unwritten entries honestly show **Not yet available.** No lessons or sample worked examples are published.

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

## Structure and authoring

Navigation: `data/manifest.json`. Future lessons: `data/lessons/<section>.json`. Interface: `index.html`, `styles.css`, and `js/`. See [the lesson contract](docs/content-schema.md), [teaching style](docs/teaching-style.md), and [progress record](docs/progress.md).

Source PDFs and saved analysis are private local references. `.local/` contains the source index and verified page mappings on the author's workstation; it is ignored. `refer/`, PDFs, development tools, and analysis are excluded from Git and the build. The build uses an explicit allowlist of the interface and public JSON. Never put source extracts or private paths in those files. The existing quiz repository is read-only and separate.

Draft only the section or small teaching unit requested by the owner. Before publication, review the draft with the owner, obtain content approval, validate the JSON and mathematical examples, update availability accurately, and preserve stable URLs. Automated checks and editorial review serve different purposes; record both. The teaching-style sample has been received; await the Section 1.1 drafting request.

## Publication

The owner authorized publishing the shell to `Babuptx/cs-2305-dm-ex`. GitHub Pages uses GitHub Actions. On a push to `main`, `.github/workflows/pages.yml` installs dependencies, validates content, runs unit and desktop/mobile browser checks, builds the public allowlist, uploads `dist/`, and deploys it. Pull requests validate without deploying. Repository Pages settings use the GitHub Actions source.

After authorized changes: run checks, commit, push, inspect the workflow result, and verify the live homepage and section URLs. Later lessons require owner approval of their content before this publication sequence. Do not add textbook text, private source analysis, or credentials to commits. No license has been chosen by the owner.
