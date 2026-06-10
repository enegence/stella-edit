# Stella Editor

Open-source, Confluence-style React document editor and viewer. Structured **StellaDoc JSON** is the source of truth; Markdown/HTML are derived exports. Built to be dropped into existing systems (Vite SPAs, Next.js apps, Tailwind hosts) with zero dependencies beyond React, and wired to the host through explicit adapters for permissions, links, assets, scope, and autocomplete.

First target host: Elite Recall. The editor module itself is host-agnostic.

## Layout

```txt
stella-editor-confluence-style-spec.md       Product spec / coding-agent handoff PRD
web/                                         Vite demo app + the editor module
  src/stella-editor/                         The distributable module (copy this folder)
    STELLA_EDITOR_INTEGRATION.md             Full host integration guide (props, JSON shape, adapters, theming)
```

## Quick start (this repo)

```bash
cd web
npm install
npm run dev        # demo: editor + live viewer side by side
npm test           # vitest suite (schema, normalize, commands, sanitize, exports, smoke)
npm run build
```

## Integrating into your app

Copy `web/src/stella-editor/` into your source tree and follow
[`STELLA_EDITOR_INTEGRATION.md`](web/src/stella-editor/STELLA_EDITOR_INTEGRATION.md) — it defines:

- drop-in steps for Vite, Next.js (App Router / SSR caveats), and Tailwind hosts
- the full `StellaEditor` / `StellaViewer` props contract
- the StellaDoc JSON schema (blocks, marks, attrs)
- adapter contracts with a fetch-based example implementation
- the persistence/autosave contract and recommended storage fields
- theming via CSS variables, dark mode, and the security model

```jsx
import { StellaEditor, createEmptyDocument } from './stella-editor';
import './stella-editor/styles/stella-editor.css';

<StellaEditor value={doc} onChange={setDoc} adapters={hostAdapters} context={{ documentId, userId }} />
```
