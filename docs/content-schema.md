# Lesson data contract

`data/manifest.json` is navigation, independent of interface code. It has `schemaVersion: 1`, a title, textbook identification, and ordered chapter groups. Each group has a stable `id`, `number` (string or null), `title`, and `children`. Each entry has those identity fields plus `status`, `path`, and recursive `children`. Preserve the PDF's titles and order. The interface supports nested entries if a future supplied contents lists them; the current PDF lists no subsections in its contents.

Entry statuses are `unavailable`, `in-progress`, and `complete`. Unavailable entries have `path: null`, no lesson file, and show “Not yet available.” Available entries use `data/lessons/<id>.json`; numbered sections therefore use `data/lessons/1.1.json`, etc. Lesson files load only on selection. Hash URLs such as `#1.1` support static hosting, refreshes, history, and bookmarks.

Owner preference, October 12, 2026: keep editorial statuses as data for validation and authoring only. Do not display Complete, In progress, draft banners, unit status badges, or status tooltips anywhere in the reader interface or homepage. Report editorial progress in chat. Unwritten entries retain their explanatory empty state. Front Matter and its four children are intentionally omitted from navigation.

`data/lesson.schema.json` is the strict draft-07 JSON Schema. A lesson has `schemaVersion: 1`, `id`, `title`, `status` (`in-progress` or `complete`), `references` (section-reference strings), and `units`. Each unit has a unique stable `id`, `title`, `status`, and nonempty `blocks`. Keep later units of a long section in the same file. Mark a complete section only when all its units are complete. Partial units must explicitly carry `in-progress` status.

Supported blocks:

| Type | Fields | Display |
| --- | --- | --- |
| heading | level (2–4), text | Heading |
| paragraph | text | Plain text paragraph |
| math | notation, description | Unicode mathematical notation with accessible description |
| diagram | title, src, description | Original SVG with descriptive alternative text and a scrollable frame |
| definition | title, blocks | Definition panel |
| example | title, blocks | Worked example panel |
| table | headers, rows | Comparison table; equal column counts required |
| callout | title, blocks | Highlighted explanation |
| check | prompt, explanation (blocks) | Check with expandable explanation |

Text is rendered using textContent; embedded HTML is not supported. Use readable Unicode notation (e.g. `p → q`), not unprocessed TeX. Introduce notation in the lesson prose. Nested blocks use the same schema. No lesson fixture is deployed in Phase 1.

Diagram sources must be local paths matching `assets/<lowercase-name>.svg`. The validator requires a standalone SVG without scripts, embedded foreign content, event handlers, external references, or entities. Original diagram assets are included in the public build and its content fingerprint. Mobile readers can scroll diagrams horizontally; alternative text explains the full circuit.

`npm run validate` validates lesson JSON with Ajv and checks cross-field invariants with the shared runtime validator: metadata matches navigation, unit IDs are unique, table rows are rectangular, complete lessons have complete units, paths are safe and registered, and private source paths are absent from public data. Unit and browser tests use temporary or intercepted fixtures to verify the contract without publishing lessons. These tests verify data and UI behavior; they are not mathematical or editorial approval of future lessons.
