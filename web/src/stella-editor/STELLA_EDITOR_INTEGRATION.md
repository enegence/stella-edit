# Stella Editor Integration Handoff

Stella Editor is a reusable React document editor/viewer that persists structured JSON. Host systems should store the StellaDoc JSON directly and treat Markdown/HTML as derived exports only.

## Public React API

```jsx
import { StellaEditor, StellaViewer, createEmptyDocument } from './stella-editor';

<StellaEditor
  value={doc}
  onChange={(nextDoc, meta) => saveDraft(nextDoc, meta)}
  context={{ workspaceId, userId }}
  adapters={hostAdapters}
/>

<StellaViewer value={doc} context={context} adapters={hostAdapters} />
```

## Host Responsibilities

- Persist and version the StellaDoc JSON.
- Provide adapter implementations for permissions, link resolution, asset picking/upload, autocomplete, and scope checks when defaults are not sufficient.
- Store file/media assets outside the editor and return stable `assetId` values.
- Resolve internal document links through host routing.
- Run `validateDocument(doc)` before saving documents received from untrusted sources.

## Document Model

Root shape:

```js
{
  version: 1,
  type: 'doc',
  meta: {
    title: 'Page title',
    emoji: '',
    coverUrl: '',
    width: 'fixed', // or 'full'
    createdAt: 'ISO timestamp',
    updatedAt: 'ISO timestamp'
  },
  content: []
}
```

First-class block types include `paragraph`, `heading`, `blockquote`, `code_block`, `bullet_list`, `ordered_list`, `task_list`, `panel`, `expand`, `status`, `table`, `layout`, `media`, and `divider`.

Inline marks include `bold`, `italic`, `underline`, `strike`, `code`, `color`, and `link`.

## Confluence-Like Features

- Page header with title, optional cover image, icon, and fixed/full-width canvas toggle.
- Slash command insertion for headings 1-6, lists, tables, quotes, code, info panels, expands, status pills, dividers, media, and multi-column layouts.
- Markdown input rules for headings, lists, quotes, and code blocks.
- Floating text selection menu for inline marks, text color, alignment, links, and clearing formatting.
- Block drag handle, duplicate/delete menu, and insert-below control.
- Macro blocks: info panels, expands, status pills, tables, and multi-column layouts.

## Adapter Contract

Use `createDefaultAdapters(overrides)` and override only the integration points the host owns:

- `permissions.canEditDocument(context)`
- `permissions.canInsertBlock(blockType, context)`
- `permissions.canUploadAsset(kind, context)`
- `permissions.canLinkToTarget(reference, context)`
- `assets.pickAsset(options, context)`
- `assets.uploadAsset(file, options, context)`
- `assets.resolveAsset(assetId, context)`
- `links.searchLinkTargets(query, context)`
- `links.getHref(reference, context)`
- `scope.canResolveReference(reference, context)`
- `scope.isReferenceVisible(reference, context)`
- `autocomplete.searchCommands(query, context)`
- `autocomplete.searchReferences(query, context)`

Adapters should return plain serializable values where possible. Permission methods should return `{ allowed: true }` or `{ allowed: false, reason: '...' }`.

## Export

- `exportMarkdown(doc)` is intended for plain-text portability and may be lossy for rich layout/table styling.
- `exportHtml(doc, options)` renders host-resolved links/assets when passed `resolveLinkHref` and `resolveAssetUrl`.
- `extractText(doc)` returns searchable plain text.

## Styling

The editor uses CSS variables and the required active/focus color `#CC785C`. Host apps can theme via `--color-surface`, `--color-text`, `--color-muted`, `--color-border`, and `--color-accent`, but should preserve accessible contrast.
