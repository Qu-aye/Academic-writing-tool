# Academic Writing Assistant

A free full-stack academic writing assistant with:

- a React writing interface built on Tiptap
- a Node.js + Express backend for academic source search
- automatic citation insertion after selected text
- a live bibliography that reformats when the citation style changes
- document import for PDF, Word, ODT, RTF, HTML, Markdown, and text files
- multi-format export with in-text citations preserved and bibliography separated onto a new page

## Stack

- Frontend: React, Vite, Tiptap, Citation.js
- Backend: Node.js, Express
- Academic sources: Semantic Scholar, Crossref, PubMed, Google Scholar

## Project structure

```text
.
|-- apps
|   |-- client
|   |   |-- src
|   |   |   |-- api
|   |   |   |-- components
|   |   |   |-- context
|   |   |   |-- editor
|   |   |   `-- lib
|   |   `-- package.json
|   `-- server
|       |-- src
|       |   |-- routes
|       |   `-- services
|       `-- package.json
`-- package.json
```

## Core flow

1. Write or upload a draft into the editor.
2. Select a sentence or paragraph.
3. The selection pop-up calls `GET /api/search?q=...`.
4. The backend queries Semantic Scholar, Crossref, PubMed, and Google Scholar in parallel.
5. Picking a result inserts an inline citation token after the selected text.
6. The bibliography updates instantly from centralized citation state.
7. Changing the style reformats the bibliography globally.
8. Export the draft as DOC, DOCX, RTF, PDF, HTML, Markdown, or TXT with the bibliography appended on a new page/section.

## Style support

- Default: Harvard (`Cite Them Right`-style via a Citation.js Harvard template alias)
- APA
- MLA
- Vancouver

If you need exact institutional CSL output, swap the template mapping in
`apps/client/src/lib/citationFormatting.ts` for your preferred CSL style file.

## Run locally

```bash
npm install
npm run dev
```

Client:

- http://localhost:5173

Server:

- http://localhost:4000

## Supported document uploads

- Word: `.doc`, `.docx`
- Documents: `.pdf`, `.odt`, `.rtf`, `.html`, `.htm`
- Text formats: `.txt`, `.text`, `.md`, `.markdown`, `.csv`, `.tsv`, `.json`, `.xml`, `.yaml`, `.yml`

Upload parsing is handled by `POST /api/documents/parse`, which converts imported files into editor-ready HTML before loading them into Tiptap.

## Supported exports

- Word `.docx`
- Word `.doc`
- Rich text `.rtf`
- PDF `.pdf`
- HTML `.html`
- Markdown `.md`
- Plain text `.txt`

Exports preserve the inline citation text already present in the draft. The bibliography is appended after a forced page break for PDF, DOCX, and printable HTML, and after a form-feed section break for Markdown and plain text exports.

## API contract

`GET /api/search?q=your selected text`

Response:

```json
{
  "query": "selected sentence",
  "results": [
    {
      "id": "10.1038/example",
      "provider": "crossref",
      "title": "Example Paper",
      "authors": [{ "given": "Ada", "family": "Lovelace" }],
      "year": 2024,
      "containerTitle": "Journal of Examples",
      "doi": "10.1038/example",
      "url": "https://doi.org/10.1038/example"
    }
  ]
}
```

## Notes

- The search backend uses free/public academic sources and APIs.
- Google Scholar search is best-effort and may be rate-limited by Google.
- No premium features or paywalled integrations are required.
- Existing inline citation labels are refreshed when the style changes.
