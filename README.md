# Cellweave

[Open Cellweave](https://cellweave-three.vercel.app)

Move small tables between notes, spreadsheets and documents. Edit the cells, leave the pipe syntax behind, and take the complete table with you.

Cellweave is a browser-local **plain-text table workbench**. Import one Markdown table or a tab-separated spreadsheet range, reorder it, and export literal Markdown, TSV, HTML or an editable JSON project. No account or upload endpoint.

## What you can do

- Edit cells in a labeled grid, with the header always visible and 12 body rows per page.
- Add, remove and move rows or columns. Column moves carry their alignment.
- Sort by case-sensitive text order while keeping the header, or transpose the complete matrix.
- Undo or redo up to 30 changes, including imports.
- Import rectangular tables without silent truncation or padding.
- Decode escaped pipes, punctuation escapes and a small documented set of character references.
- Copy or download **all rows**, including rows outside the current page.
- Save exact cell text and alignment in a versioned JSON project.
- Keep formula-like TSV values behind an optional, enabled-by-default apostrophe prefix.

## Example exports

The repository includes real, reproducible [Markdown](examples/table.md), [TSV](examples/table.tsv), [HTML](examples/table.html) and [JSON](examples/table.json) outputs. Run `npm run example` to regenerate them.

The example's cell matrix is:

| Delivery | Owner | Status |
| --- | --- | --- |
| Design review | Mina | Ready |
| API \| docs | Tao | In progress |
| Launch checklist | Rae | Next |

These are output examples, **not editor screenshots**. An actual application screenshot and native browser visual checks have not been captured.

## Run locally

Use Node.js 22 or 24 and npm.

```sh
npm ci --ignore-scripts --no-audit --no-fund
npm test
npm run build
npm run dev
```

Open `http://127.0.0.1:4193`. The preview server serves only allowlisted files from `dist/` and binds to localhost. Stop it with Ctrl+C. Production build uses Node built-ins; jsdom is a development-only test dependency.

## Use it

1. Choose **Markdown table** or **Spreadsheet / TSV**, paste source, and select **Import table**. Or open a UTF-8 text file in the selected format. A `.json` file is always treated as a Cellweave project.
2. Edit a cell and Tab away to commit it. Use the row and column selectors for structural edits. Undo restores a previous table after a successful import.
3. Select the output format. Copy the generated text or download the file. **Save editable project** keeps exact values and alignment independently of the selected output format.
4. For spreadsheet handoff, paste TSV into the destination or use its tab-delimited import. Review the result: destination apps can interpret dates, leading zeros, numbers and formulas differently.

Files that fail parsing, exceed limits, contain malformed UTF-8, or finish reading after a newer edit are not applied. Do not close the tab before saving: there is no automatic persistence or recovery.

## Plain text is a deliberate boundary

This is **not a Markdown renderer or rich-text converter**.

Markdown import splits one rectangular pipe table, trims syntactic whitespace, and decodes ASCII punctuation backslash escapes, numeric references, and `amp`, `lt`, `gt`, `quot`, `apos`, `nbsp` named references. Decoding happens once. It does not implement all HTML named references or full GFM document parsing.

Other inline source stays visible as text: `**bold**`, links, code-span backticks and raw HTML are not rendered or stripped. Exporting an imported rich table therefore changes its presentation to literal text. Markdown source formatting, original whitespace around separators and line endings are not retained.

Literal Markdown output encodes ASCII punctuation and spaces as numeric character references. This keeps pipes, HTML-like text, backslashes and formatting punctuation inside their cells instead of treating them as markup. Its source is verbose; padding is capped at 60 source characters and is not Unicode display-width alignment. HTML export escapes text and contains a plain semantic table, with no scripts or linked assets.

## Limits

| Boundary | Value |
| --- | --- |
| Total rows, including header | 1–100 |
| Columns | 1–24 |
| Cell size | 1,000 UTF-16 code units |
| Total cell text | 100,000 UTF-16 code units |
| Source input / project text | 1,500,000 UTF-16 code units |
| File size | 6,000,000 bytes, UTF-8 |
| Body rows per editor page | 12 |
| Undo snapshots | 30 |
| Transpose | At most 24 input rows; alignment resets |

Cells must be single-line and exclude C0 controls, DEL, Unicode line separators and unpaired surrogates. TSV supports quoted fields and doubled quotes, but embedded tabs or newlines inside a cell are rejected. First row is always the header. Ragged rows fail explicitly even though some Markdown renderers would pad or truncate them. Paste only the table, without document prose, fences or blank body lines.

No XLSX/CSV import, formulas, numeric sorting, merged cells, collaboration, account integration, Unicode normalization or installed/offline cache is provided. Operations happen locally after the app assets load, but revisiting without a network connection is not guaranteed.

The TSV guard checks values beginning with optional whitespace followed by `=`, `+`, `-` or `@`, then prefixes an apostrophe. It changes the handoff text, including some harmless negative values. **It is not a universal spreadsheet injection defense or exact-value import guarantee.** JSON is the exact project format; keep a copy before using another app.

## Project format

```json
{
  "schema": "cellweave-table-v1",
  "cells": [["Task", "Owner"], ["Review", "Mina"]],
  "align": ["left", "none"]
}
```

Only these fields and this schema version are accepted. Alignment values are `none`, `left`, `center`, `right`. History, source text and the current page are not saved.

## Checks and verification

`npm test` runs parser, model, editing, export and real application-handler checks in **simulated DOM** using jsdom. Coverage includes every printable ASCII character, 60 varied rectangular fixtures, maximal-size roundtrips, failed-import preservation, complete paginated exports, stale file reads, exact project saves, Blob content and URL-attribute replacement, and inert HTML-like labels.

CI runs tests and build on Windows/Linux with Node 22/24. These tests do not establish native browser rendering, assistive-technology behavior, clipboard permissions, actual spreadsheet compatibility or native download destinations. Responsive visual checks and a real editor screenshot remain unverified.

## Deploy on Vercel

Import this repository as a new project:

- Framework: **Other**
- Root directory: repository root
- Node.js: **24.x**
- Build command: `npm run build`
- Output directory: `dist`
- Install command: leave empty / override with no command

No environment variables, server functions, storage, paid integrations or APIs are needed. `vercel.json` supplies static build settings and security headers. Use the URL returned by your own deployment; no domain purchase is necessary.

## Privacy

Table contents stay in memory in this tab until you choose a copy/download operation. No browser storage, cookies, analytics, external fonts or application data requests are used. The host still serves assets and may retain ordinary request metadata. Input is inserted as text or input values, never executable HTML.

MIT licensed; see [LICENSE](LICENSE).
