# Stella Editor — Host Integration Guide

Stella Editor is a self-contained, Confluence-style React document editor and viewer. Its source of truth is **StellaDoc JSON** — Markdown and HTML are derived exports only. This guide defines everything a host application (or a coding agent integrating it) needs: the drop-in procedure, the component props, the document shape, the adapter contracts, the persistence contract, and theming.

The first target host is Elite Recall, but nothing in this module knows about Elite Recall. All host concerns (permissions, storage, links, uploads, search) flow through adapters you provide.

---

## 1. Requirements and drop-in

**Runtime dependencies:** React 18+ and React DOM. Nothing else — no editor framework, no icon library, no CSS framework.

**Drop-in procedure:** copy this entire folder (`stella-editor/`) into your source tree and import from its `index.js`. There is no build step, no package install, no peer-dependency dance.

```txt
your-app/
  src/
    stella-editor/        <- copy this whole folder
      index.js            <- the only import surface you should use
      core/               <- schema, normalize, validate, commands, exporters
      react/              <- StellaEditor, StellaViewer, UI internals
      adapters/           <- createDefaultAdapters + adapter modules
      styles/stella-editor.css
      __tests__/          <- vitest + testing-library suite (optional to keep)
```

The module uses plain JS with JSDoc typedefs (see `core/schema.js`). It works under any bundler that handles JSX (`.jsx` files) — Vite, Next.js, webpack, esbuild.

### 1.1 Vite (React SPA — e.g. Elite Recall web workspace)

```jsx
import { StellaEditor, StellaViewer, createEmptyDocument } from './stella-editor';
import './stella-editor/styles/stella-editor.css';
```

Nothing else needed. `@vitejs/plugin-react` already compiles the JSX.

### 1.2 Next.js (App Router)

The editor uses `window`, `document`, `DOMParser`, and `contentEditable` — it is **client-only**. Wrap it:

```jsx
// app/components/DocumentEditor.jsx
'use client';
import { StellaEditor } from '@/src/stella-editor';
import '@/src/stella-editor/styles/stella-editor.css';

export default function DocumentEditor({ doc, onChange, adapters, context }) {
  return <StellaEditor value={doc} onChange={onChange} adapters={adapters} context={context} />;
}
```

If the page itself is a server component, load the editor without SSR:

```jsx
import dynamic from 'next/dynamic';
const DocumentEditor = dynamic(() => import('@/app/components/DocumentEditor'), { ssr: false });
```

`StellaViewer` is also client-rendered in v1. For SEO-critical read-only pages, render `exportHtml(doc, resolvers)` on the server instead (Section 7) — the output is sanitized, static HTML.

The pure-core utilities (`normalizeDocument`, `validateDocument`, `extractText`, `exportMarkdown`, `exportHtml`) are DOM-free and safe in server code, API routes, and Node scripts. Only `sanitizePaste` prefers `DOMParser` (it degrades to plain-text parsing without it).

### 1.3 Tailwind CSS hosts

The editor ships its own scoped stylesheet; it neither needs nor uses Tailwind classes.

- **Preflight:** Tailwind's reset removes default list/heading styling globally. The editor restores everything it needs under `.stella-editor` / `.stella-viewer`, but verify lists and headings render inside `StellaViewer` after install. If preflight strips list markers in the viewer, add a small scoped restore:

  ```css
  .stella-viewer ul { list-style: disc; padding-left: 1.5rem; }
  .stella-viewer ol { list-style: decimal; padding-left: 1.5rem; }
  ```

- **Theming:** map your Tailwind design tokens onto the editor's CSS variables (Section 8) instead of restyling internals.
- The stylesheet is plain CSS — import it once at app level or in the page that mounts the editor.

---

## 2. Quick start

```jsx
import { useState } from 'react';
import { StellaEditor, StellaViewer, createEmptyDocument } from './stella-editor';
import './stella-editor/styles/stella-editor.css';

function PageEditor() {
  const [doc, setDoc] = useState(() => createEmptyDocument({ title: 'New page' }));
  return <StellaEditor value={doc} onChange={(nextDoc, meta) => setDoc(nextDoc)} />;
}

function PageView({ doc }) {
  return <StellaViewer value={doc} />;
}
```

With no adapters, the editor works for plain authoring; uploads and internal links **fail closed** (Section 5).

---

## 3. Component API

### 3.1 `<StellaEditor />`

| Prop | Type | Default | Purpose |
|---|---|---|---|
| `value` | `StellaDoc` | — | Document JSON. The editor normalizes whatever you pass; invalid input never crashes it. |
| `onChange` | `(nextDoc, changeMeta) => void` | — | Fired on every edit with the normalized document. |
| `context` | `object` | `{}` | Opaque host context (`documentId`, `userId`, `tenantId`, …). Passed verbatim to every adapter call; the editor never inspects it. |
| `adapters` | `StellaAdapters` | fail-safe defaults | Partial overrides merged over `createDefaultAdapters()` (Section 5). |
| `readOnly` | `boolean` | `false` | Renders the viewer instead of the editing surface. |
| `autoFocus` | `boolean` | `false` | Focus the first block on mount. |
| `placeholder` | `string` | `'Start writing...'` | Empty-document placeholder. |
| `className` / `style` | — | — | Pass-through to the root element. |
| `onSaveRequest` | `(doc) => void` | — | Fired on `Mod+S`. Wire to your save action. |
| `onDirtyChange` | `(dirty) => void` | — | Fired with `true` on first edit. The host owns resetting its dirty state after save. |
| `onPermissionDenied` | `({ action, reason }) => void` | — | Fired when an upload/link/insert is blocked by adapters. Show a toast. |
| `onValidationError` | `(errors) => void` | — | Fired if an incoming `value` fails validation (it is still normalized and rendered). |

`changeMeta` shape:

```js
{
  reason: 'text_input' | 'split_block' | 'paste' | 'insert_table' | ...,
  dirty: true,
  changedAt: '2026-06-09T00:00:00.000Z',
  selection: { blockId: 'paragraph_ab12' }
}
```

**Controlled-value note:** the editor tracks the last document it emitted, so feeding `onChange`'s `nextDoc` straight back into `value` (the normal pattern) does not reset editor state or caret. Passing a *different* object (e.g. one loaded from the server) replaces the document.

### 3.2 `<StellaViewer />`

| Prop | Type | Purpose |
|---|---|---|
| `value` | `StellaDoc` | Document to render (normalized internally). |
| `context` | `object` | Passed to adapters for link/asset resolution. |
| `adapters` | `StellaAdapters` | Needs `links`, `scope`, `assets` overrides if the doc contains internal links or media. |
| `className` / `style` | — | Pass-through. |
| `onUnsupportedBlock` | `(block) => void` | Called for each unknown block (rendered as a safe placeholder). |

The viewer never renders editing controls, never executes document content, strips unsafe hrefs, hides internal references the scope adapter does not mark visible, and opens external links with `target="_blank" rel="noopener noreferrer"`.

---

## 4. StellaDoc JSON shape

### 4.1 Root

```js
{
  version: 1,
  type: 'doc',
  meta: {
    title: 'Page title',
    emoji: '',            // optional page icon (max 3 chars)
    coverUrl: '',         // optional cover image URL
    width: 'fixed',       // 'fixed' (920px) | 'full'
    createdAt: '2026-06-09T00:00:00.000Z',
    updatedAt: '2026-06-09T00:00:00.000Z'
  },
  content: [ /* StellaBlock[] */ ]
}
```

Every block: `{ id: string, type: string, attrs: object, content: array }`. IDs are stable strings generated by the editor; preserve them across saves so history/diffing works.

### 4.2 Block types and attrs

| Type | `attrs` | `content` |
|---|---|---|
| `paragraph` | `{ align? }` | text nodes |
| `heading` | `{ level: 1-6, align? }` | text nodes |
| `blockquote` | `{ align? }` | text nodes |
| `code_block` | `{ language: '' }` | one text node, no marks |
| `bullet_list` / `ordered_list` | `{}` | `list_item[]` (each wraps a paragraph) |
| `task_list` | `{}` | `task_item[]` with `attrs.checked: boolean` |
| `panel` | `{ variant: 'info'\|'note'\|'success'\|'warning'\|'error'\|'custom', title: string\|null }` | blocks (≥1 paragraph guaranteed) |
| `divider` | `{}` | `[]` |
| `expand` | `{ title: string, defaultOpen: boolean }` | blocks (≥1 paragraph guaranteed) |
| `status` | `{ text: string (≤40), color: 'blue'\|'green'\|'yellow'\|'red'\|'gray'\|'coral' }` | `[]` |
| `table` | `{ headerRow, headerColumn, columnWidths: (number\|null)[] }` | `table_row[]` → `table_cell[]` → paragraph; cells may carry `attrs.background` (hex) |
| `layout` | `{ variant: '50-50'\|'33-33-33'\|'70-30' }` | `layout_column[]` of blocks |
| `media` | `{ assetId: string\|null, kind: 'image'\|'file'\|'video'\|'audio'\|'unknown', alt, caption, width: 'small'\|'medium'\|'wide'\|'full' }` | `[]` |
| `unsupported` | `{ originalType, originalAttrs }` | `[]` — safe fallback for unknown input |

### 4.3 Text nodes and marks

```js
{ type: 'text', text: 'important', marks: [
  { type: 'bold', attrs: {} },
  { type: 'link', attrs: { kind: 'external_url', href: 'https://example.com' } }
] }
```

Marks: `bold`, `italic`, `underline`, `strike`, `code`, `color` (`attrs.color` hex), `link`.

Link mark attrs — external: `{ kind: 'external_url', href, label? }`. Internal: `{ kind: 'document', reference: { type: 'document', id: 'doc_123' }, href: null, label }`. Internal links store **references, never URLs**; the host resolves them at render time via the link adapter.

### 4.4 Normalization guarantees

`normalizeDocument(anything)` always returns a valid doc: missing IDs added, unknown blocks → `unsupported`, unknown marks stripped, unsafe hrefs (e.g. `javascript:`) stripped, containers (panel/expand/table cells) guaranteed non-empty, root guaranteed ≥1 paragraph. Both components normalize input, so you can hand them untrusted JSON. Still run `validateDocument(doc)` (`{ valid, errors, warnings }`) before persisting documents from untrusted sources.

---

## 5. Adapters — the host integration surface

Build adapters with `createDefaultAdapters(overrides)` or pass partial overrides straight to the `adapters` prop (they merge over the defaults). **Defaults fail safe:** reading/rendering works, but uploads, asset picking, internal-link insertion, and scoped reference visibility are denied until you provide implementations.

Permission-style methods return `{ allowed: true }` or `{ allowed: false, reason: 'human-readable reason' }`.

```js
const adapters = {
  permissions: {
    canEditDocument(context) {},            // false → editor renders as viewer
    canInsertBlock(blockType, context) {},  // false → command hidden from slash/insert menus
    canUseFormatting(formatType, context) {},
    canUploadAsset(kind, context) {},       // gate before assets.uploadAsset
    canLinkToTarget(reference, context) {}, // gate before internal link insert
    canExport(format, context) {}
  },
  scope: {
    getCurrentScope(context) {},                     // host's visibility boundary descriptor
    canResolveReference(reference, context) {},      // gate for inserting internal references
    normalizeReference(rawReference, context) {},
    isReferenceVisible(reference, context) {}        // viewer hides links when false
  },
  links: {
    searchLinkTargets(query, context) {},   // [{ type:'document', id, label }] for the link popover
    resolveLink(reference, context) {},
    getHref(reference, context) {},         // reference -> URL at render time
    getDisplayLabel(reference, context) {},
    getPreview(reference, context) {}
  },
  assets: {
    canUpload(kind, context) {},
    pickAsset(options, context) {},         // open host picker -> { assetId, kind, alt? } | null
    uploadAsset(file, options, context) {}, // -> { assetId, kind, filename?, alt? } | null
    resolveAsset(assetId, context) {},
    getAssetPreview(assetId, context) {},   // -> previewUrl string or { url } (used by media blocks)
    removeAssetReference(assetId, context) {}
  },
  autocomplete: {
    searchCommands(query, context) {},      // append host commands to the slash menu
    searchReferences(query, context) {},    // fallback for link search
    searchAssets(query, context) {}
  }
};
```

Async is supported where it matters: `pickAsset`, `uploadAsset`, `searchLinkTargets`, and `searchReferences` may return promises.

**Upload flow:** file drop/paste → `permissions.canUploadAsset(kind)` → `assets.canUpload(kind)` → `assets.uploadAsset(file)` → host stores the file and returns `{ assetId, kind }` → editor inserts a `media` block holding only the `assetId`. The document never stores file bytes or signed URLs.

### 5.1 Example: minimal fetch-based host adapter set

```js
function createHostAdapters(api) {
  return {
    permissions: {
      canEditDocument: () => ({ allowed: true }),
      canUploadAsset: () => ({ allowed: true }),
      canLinkToTarget: () => ({ allowed: true })
    },
    scope: {
      canResolveReference: (ref) => ({ allowed: ref?.type === 'document' }),
      isReferenceVisible: () => true
    },
    links: {
      searchLinkTargets: async (query) =>
        (await api.searchDocuments(query)).map((d) => ({ type: 'document', id: d.id, label: d.title })),
      getHref: (ref) => (ref?.type === 'document' ? `/docs/${ref.id}` : null)
    },
    assets: {
      canUpload: () => ({ allowed: true }),
      uploadAsset: async (file) => {
        const uploaded = await api.uploadFile(file);          // host validates quota/type/virus
        return { assetId: uploaded.id, kind: uploaded.kind, filename: file.name };
      },
      getAssetPreview: (assetId) => api.assetUrl(assetId)      // string URL is fine
    }
  };
}
```

---

## 6. Persistence contract

Stella Editor never saves. The host decides when/where/whether. Recommended host-side document record (names are suggestions, not a requirement of the editor):

```txt
content_json       canonical StellaDoc JSON   (the only authoritative field)
content_text       extractText(doc)           regenerated on save, for search indexing
content_markdown   exportMarkdown(doc)        optional derived cache, lossy
updated_at         host-owned timestamp
```

Debounced autosave pattern:

```jsx
function AutosaveEditor({ initialDoc, save }) {
  const [doc, setDoc] = useState(initialDoc);
  const timer = useRef(null);

  function handleChange(nextDoc) {
    setDoc(nextDoc);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const { valid } = validateDocument(nextDoc);
      if (valid) save({ content_json: nextDoc, content_text: extractText(nextDoc) });
    }, 1200);
  }

  return <StellaEditor value={doc} onChange={handleChange} onSaveRequest={(d) => save({ content_json: d, content_text: extractText(d) })} />;
}
```

---

## 7. Import / export utilities

All exported from the module root and DOM-free unless noted:

| Function | Signature | Notes |
|---|---|---|
| `createEmptyDocument` | `({ title? }) => StellaDoc` | Normalized doc with one empty paragraph. |
| `normalizeDocument` | `(any) => StellaDoc` | Never throws on object-like input. |
| `validateDocument` | `(doc) => { valid, errors, warnings }` | Run before persisting untrusted docs. |
| `extractText` | `(doc) => string` | Plain text for search/previews (headings, lists, tables, panels, captions). |
| `exportMarkdown` | `(doc) => string` | Lossy by design (panels → blockquote-style fallback, layouts flattened). |
| `exportHtml` | `(doc, { resolveAssetUrl?, resolveLinkHref? }) => string` | Sanitized static HTML; semantic classes `stella-panel-*`, `stella-status-*`, etc. Good for SSR/read views/email. |
| `sanitizePaste` | `({ html?, text? }) => StellaDoc` | Strips scripts/handlers/`javascript:`; converts spreadsheet-style TSV to tables. Prefers `DOMParser` (browser). |
| `importMarkdown` | `(markdown) => StellaDoc` | Minimal v1: headings + paragraphs only. |
| `applyCommand` | `(doc, selection, command) => { doc, meta }` | Headless document transforms (used internally; usable for migrations/scripting). |
| Block factories | `createParagraphBlock`, `createHeadingBlock`, `createPanelBlock`, `createCodeBlock`, `createTableBlock`, `createListBlock`, `createExpandBlock`, `createMediaBlock`, `createStatusBlock`, `createLayoutBlock`, `createDividerBlock`, `createText` | Programmatic document construction. |

```js
const html = exportHtml(doc, {
  resolveAssetUrl: (assetId) => `/api/assets/${assetId}/raw`,
  resolveLinkHref: (reference) => (reference?.type === 'document' ? `/docs/${reference.id}` : null)
});
```

---

## 8. Theming

The editor inherits the host font (`font: inherit`) and themes via CSS variables read from your existing tokens, with fallbacks:

| Editor variable | Reads host variable | Fallback |
|---|---|---|
| `--se-bg` | `--color-surface` | `#ffffff` |
| `--se-text` | `--color-text` | `#111827` |
| `--se-muted` | `--color-muted` | `#6b7280` |
| `--se-border` | `--color-border` | `#d8d3cc` |
| `--se-accent` | `--color-accent` | `#CC785C` |
| `--se-code-bg` | `--color-code-bg` | `#f5f1ec` |
| `--se-panel-*-bg` | `--color-info-soft`, `--color-warning-soft`, … | soft pastels |

Override at any scope:

```css
.stella-editor, .stella-viewer {
  --color-accent: theme('colors.indigo.600');   /* Tailwind example */
  --color-surface: theme('colors.white');
}
```

Dark mode: the stylesheet ships a `prefers-color-scheme: dark` block using the same host variables; class-based dark-mode hosts should set the `--color-*` variables under their dark class. All styles are scoped under `.stella-editor` / `.stella-viewer` (including text selection color) — no global leakage.

---

## 9. Editing surface reference

What hosts get out of the box: page canvas with title/cover/icon and fixed-vs-full width toggle; slash menu (`/`) anchored to the active block with filterable, described commands; markdown-style input shortcuts (`#`, `##`, `-`, `1.`, `[]`, `>`, ```` ``` ````); floating inline toolbar on selection (bold/italic/underline/strike/code/color/align/link/clear); per-block hover gutter (insert below, drag to reorder, options menu with move up/down, duplicate, delete); tables with header toggles, add/remove rows/columns, column resize, cell background; panels, expands, status pills, layouts, task lists; paste sanitization including spreadsheet → table; file drop/paste through the asset adapter; undo/redo.

Keyboard shortcuts (`Mod` = Cmd on macOS / Ctrl elsewhere):

```txt
Mod+B / Mod+I / Mod+U   bold / italic / underline
Mod+K                   link popover
Mod+Z / Mod+Shift+Z / Mod+Y    undo / redo
Mod+S                   onSaveRequest
/                       slash menu (not in code blocks)
Enter                   split block / select menu item / exit list on empty item
Backspace at start      merge with previous block
Tab / Shift+Tab         next / previous table cell
Escape                  close menus/popovers
```

---

## 10. Security model

Document content is treated as untrusted everywhere:

- No document content is ever rendered through `dangerouslySetInnerHTML`.
- Paste/import strips `<script>`, event-handler attributes, and `javascript:` URLs.
- `normalizeDocument` strips unsafe link hrefs from any loaded document.
- Unknown blocks render as inert `unsupported` placeholders.
- Media renders only through host-resolved URLs that pass a URL-safety check.
- `exportHtml` escapes all text and attribute output.

Host responsibilities: validate/scan uploads (the editor only ever sees `assetId`s), enforce authorization in adapters (the editor enforces UI behavior, not access control), and validate docs server-side before persisting.

---

## 11. Elite Recall integration recipe

Target: `eliterecall-site/web` (Vite + React 18 + Tailwind 3 + react-router 6).

1. Copy `stella-editor/` to `web/src/stella-editor/`. Delete `__tests__/` or keep it (vitest + testing-library are already in the workspace; tests should pass as-is).
2. Import the stylesheet once (e.g. in `web/src/index.css` via `@import './stella-editor/styles/stella-editor.css';` after Tailwind directives, or in the page component).
3. Map Elite Recall theme tokens to `--color-surface`, `--color-text`, `--color-border`, `--color-accent` on a wrapper class.
4. Implement adapters against the Elite Recall server API (Section 5.1): document search for link targets, asset upload to host storage returning stable `assetId`s, `getHref` mapping document references to react-router paths.
5. Persist per Section 6: `content_json` (canonical), `content_text` (search), optional `content_markdown`.
6. Render published pages with `StellaViewer` (same adapters, read-only context), or server-side via `exportHtml`.
7. Pass `context = { documentId, userId, tenantId }` so server-side authorization in adapter endpoints can use it.

Out of scope for the editor (host owns): page trees, versioning/drafts, comments, mentions, realtime collaboration, storage quotas, roles.

---

## 12. v1 limitations worth knowing

- Inline marks are fully supported in paragraph/heading/quote blocks; list items, table cells, panels, and expand bodies edit as plain text in v1 (marks inside them still render in the viewer if present in the JSON).
- One level of list nesting; no drag-reorder between layout columns.
- No cell merge/split; column resize and background color are supported.
- `importMarkdown` is intentionally minimal (headings + paragraphs); rich Markdown import is a later phase.
- Undo history is per-mounted-session, capped only by memory.
