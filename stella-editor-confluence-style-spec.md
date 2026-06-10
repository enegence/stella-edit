# Stella Editor — Confluence-Style Document Editor Spec

**Project name:** Stella Editor  
**Primary host app:** Elite Recall  
**Initial implementation target:** React 18 + Vite 5 + JavaScript  
**Long-term goal:** Reusable, platform-agnostic editor/viewer component for Stella Viae projects  
**Canonical document format:** Structured JSON, not Markdown  
**Document status:** Coding-agent handoff spec

---

## 0. Coding Agent Instruction Summary

Build **Stella Editor** as a reusable, Confluence-style document editor and document viewer that can replace the planned use of MDXEditor inside Elite Recall.

This is **not** a Markdown editor. Markdown is only an import/export format. The editor must use a structured JSON document model as its source of truth.

### Non-negotiables

1. Do **not** use MDXEditor.
2. Do **not** build the editor around Markdown or MDX as the persistence format.
3. Do **not** make the editor depend on Elite Recall-specific concepts such as tenants, packs, courses, R2, billing, user quotas, or roles.
4. Do **not** implement backend storage, file storage, page trees, real-time collaboration, or application-specific blocks in v1.
5. Do build a reusable editor/viewer module with a clean public API.
6. Do build a Confluence-like editing experience: page canvas, slash menu, block insertion, inline toolbar, rich blocks, tables, panels, expand sections, links, and host-controlled media placeholders.
7. Do route permissions, internal links, file/media handling, and scoping through host-provided adapters.
8. Do write tests before or alongside implementation. Use the red/green validation section in this file.

### Practical implementation direction

Implement Stella Editor inside the current frontend codebase first:

```txt
/web/src/stella-editor/
```

Structure the code so it can later be extracted into its own package, but do not prematurely create a separate package unless the host project already supports that cleanly.

Use JavaScript first, with TypeScript-compatible JSDoc typedefs and explicit object contracts. The goal is to avoid blocking Elite Recall on a broader TypeScript migration while still keeping the editor easy to convert later.

---

## 1. Product Goal

Stella Editor is a reusable React document editor and renderer that provides a **Confluence-like rich document editing experience** without relying on MDXEditor or Markdown-first architecture.

It should feel like a native page editor, not a text box, Markdown editor, or bolted-on third-party widget.

The initial use case is Elite Recall, but the editor must be generic enough to embed later in other Stella Viae products.

### One-sentence definition

> Stella Editor is a structured-document React editor and viewer that replaces Markdown-first editors like MDXEditor with a Confluence-like editing surface, host-controlled integrations, and JSON-first persistence.

---

## 2. Relationship to MDXEditor

The prior implementation plan targeted MDXEditor. Stella Editor replaces that plan.

### What Stella Editor replaces

Stella Editor should replace the embedded rich editor role that MDXEditor would have filled:

```jsx
// Old direction — do not implement as the core path
<MDXEditor markdown={markdown} onChange={setMarkdown} />
```

New direction:

```jsx
<StellaEditor value={docJson} onChange={setDocJson} />
```

### Not API-compatible by default

Stella Editor does **not** need to be API-compatible with MDXEditor.

A compatibility wrapper may be added later, but it should not define the core architecture.

Optional future bridge:

```jsx
<StellaMarkdownCompatEditor
  markdown={markdown}
  onChangeMarkdown={setMarkdown}
/>
```

This wrapper would internally convert Markdown to StellaDoc JSON, edit the structured document, then export Markdown. It will be lossy for rich Confluence-style blocks and is not part of v1.

### Core distinction

| Concern | MDXEditor-style approach | Stella Editor approach |
|---|---|---|
| Source of truth | Markdown/MDX string | Structured JSON document |
| UX goal | Rich Markdown authoring | Confluence-like document editing |
| Rich blocks | Constrained by Markdown/MDX | First-class structured nodes |
| Host integration | Plugin/config-driven | Explicit host adapters |
| Export | Native Markdown | Markdown as derived export |
| Renderer | Markdown/MDX render path | StellaDoc viewer/render path |

---

## 3. Scope Boundary

### Stella Editor is responsible for

- Document JSON schema
- Document normalization
- Document validation
- Rich document editor component
- Read-only viewer component
- Inline text formatting
- Block insertion and transformation
- Slash command menu
- Floating inline toolbar
- Block toolbar / plus insertion
- Basic block movement controls
- Tables
- Panels/callouts
- Code blocks
- Expand/collapse sections
- Task lists
- Links
- Scoped internal-link protocol
- Host-controlled media placeholders
- Export to Markdown
- Export to HTML
- Plain-text extraction for search indexing
- Paste sanitization/conversion
- Undo/redo within the editor session
- Theme-friendly CSS variables

### Stella Editor is not responsible for

- Backend document persistence
- Database schema
- File/object storage
- Upload quotas
- Virus scanning
- Tenant authorization
- User roles
- Page trees/folders/spaces
- App-specific document grouping
- Real-time collaboration
- Comments in v1
- Mentions in v1
- Custom app-specific blocks in v1
- Full Markdown/MDX runtime behavior
- Server-side rendering requirements in v1

### Confluence-like means editor UX, not full Confluence product scope

Stella Editor should copy the useful editing behaviors of Confluence:

- Page-like canvas
- Slash insertion
- Block-adjacent insertion
- Floating inline toolbar
- Rich blocks
- Panels/callouts
- Tables
- Expand sections
- Code blocks
- Links
- Media placeholders
- Keyboard-first behavior

Stella Editor should **not** clone Confluence spaces, organizations, permissions, comments, macros, or collaboration system in v1.

---

## 4. Recommended Initial File Structure

Implement inside the frontend as:

```txt
/web/src/stella-editor/
  index.js

  core/
    schema.js
    ids.js
    document.js
    normalize.js
    validate.js
    selection.js
    commands.js
    transforms.js
    history.js
    sanitizePaste.js
    importHtml.js
    importMarkdown.js
    exportMarkdown.js
    exportHtml.js
    extractText.js

  react/
    StellaEditor.jsx
    StellaViewer.jsx
    EditableCanvas.jsx
    ViewerCanvas.jsx
    BlockRenderer.jsx
    EditableBlock.jsx
    InlineToolbar.jsx
    BlockToolbar.jsx
    SlashMenu.jsx
    LinkPopover.jsx
    TableControls.jsx
    DragHandle.jsx
    UnsupportedBlock.jsx

  blocks/
    paragraph.js
    heading.js
    list.js
    taskList.js
    quote.js
    codeBlock.js
    panel.js
    divider.js
    table.js
    expand.js
    media.js
    embed.js
    linkCard.js

  adapters/
    defaultAdapters.js
    permissionsAdapter.js
    scopeAdapter.js
    linkResolverAdapter.js
    assetAdapter.js
    autocompleteAdapter.js

  styles/
    stella-editor.css

  __tests__/
    schema.test.js
    normalize.test.js
    validate.test.js
    commands.test.js
    exportMarkdown.test.js
    exportHtml.test.js
    extractText.test.js
    adapters.test.js
    sanitizePaste.test.js
    viewer.test.jsx
    editor-smoke.test.jsx
```

If the existing project has a different test folder convention, use it, but preserve the same test categories.

---

## 5. Public API

The editor module should export a stable surface from:

```txt
/web/src/stella-editor/index.js
```

Required exports:

```js
export { StellaEditor } from './react/StellaEditor';
export { StellaViewer } from './react/StellaViewer';

export {
  STELLA_DOC_VERSION,
  createEmptyDocument,
  createParagraphBlock,
  normalizeDocument,
  validateDocument,
  extractText,
  exportMarkdown,
  exportHtml,
  sanitizePaste
} from './core';

export { createDefaultAdapters } from './adapters/defaultAdapters';
```

### Primary editor API

```jsx
<StellaEditor
  value={doc}
  onChange={handleChange}
  context={hostContext}
  adapters={adapters}
  readOnly={false}
  autoFocus={false}
  placeholder="Start writing..."
/>
```

### Primary viewer API

```jsx
<StellaViewer
  value={doc}
  context={hostContext}
  adapters={adapters}
/>
```

### Editor props

```js
{
  value: StellaDoc,
  onChange: (nextDoc, changeMeta) => void,
  context?: HostContext,
  adapters?: StellaAdapters,
  readOnly?: boolean,
  autoFocus?: boolean,
  placeholder?: string,
  className?: string,
  style?: Object,
  onSaveRequest?: (doc) => void,
  onDirtyChange?: (dirty) => void,
  onPermissionDenied?: (event) => void,
  onValidationError?: (errors) => void
}
```

### Viewer props

```js
{
  value: StellaDoc,
  context?: HostContext,
  adapters?: StellaAdapters,
  className?: string,
  style?: Object,
  onUnsupportedBlock?: (block) => void
}
```

---

## 6. Dependency and Licensing Policy

Stella Editor exists partly to avoid being strategically beholden to a third-party editor product, its licensing constraints, or its architectural assumptions.

### Disallowed as core dependencies

Do not use these as the foundation of Stella Editor:

- MDXEditor
- Other Markdown-first editor packages
- Editor frameworks that take over the document model
- Editor frameworks that make their own schema the true persistence format
- Packages with proprietary, noncommercial, source-available-only, or unclear licensing
- Copyleft dependencies unless explicitly approved
- Large optional feature dependencies wired into the core bundle

### Allowed with review

Small dependencies are acceptable if they are:

- MIT, Apache-2.0, BSD, or similarly permissive
- Small and replaceable
- Not responsible for the editor's canonical model
- Not responsible for host permissions or storage
- Isolated behind utility modules where practical

Potentially acceptable examples:

- ID generation utility, if already present
- HTML sanitizer, if permissively licensed
- Small keyboard utility, if permissively licensed
- Test utilities

### Dependency validation requirement

Before adding any dependency, the coding agent should check:

```txt
Package name
Direct license
Transitive dependency risk
Bundle size impact
Whether it controls the document model
Whether it can be removed later without a rewrite
```

If uncertain, do not add it.

---

## 7. Canonical Document Model

The canonical format is **StellaDoc JSON**.

Markdown is not the persistence model.

### Root document

```js
{
  version: 1,
  type: 'doc',
  meta: {
    title: 'Untitled',
    createdAt: '2026-05-11T00:00:00.000Z',
    updatedAt: '2026-05-11T00:00:00.000Z'
  },
  content: [
    {
      id: 'block_abc123',
      type: 'paragraph',
      attrs: {},
      content: [
        {
          type: 'text',
          text: 'Hello world',
          marks: []
        }
      ]
    }
  ]
}
```

### JSDoc typedefs

Every core type should be documented with JSDoc.

```js
/**
 * @typedef {Object} StellaDoc
 * @property {number} version
 * @property {'doc'} type
 * @property {StellaDocMeta} meta
 * @property {StellaBlock[]} content
 */

/**
 * @typedef {Object} StellaBlock
 * @property {string} id
 * @property {string} type
 * @property {Object} attrs
 * @property {Array<StellaBlock|StellaInline|StellaText>} content
 */

/**
 * @typedef {Object} StellaText
 * @property {'text'} type
 * @property {string} text
 * @property {StellaMark[]} marks
 */
```

---

## 8. Node Types

### Root

| Type | Purpose |
|---|---|
| `doc` | Root document |

### Block nodes

| Type | Required v1 | Notes |
|---|---:|---|
| `paragraph` | Yes | Default text block |
| `heading` | Yes | Levels 1-4 |
| `bullet_list` | Yes | Contains list items |
| `ordered_list` | Yes | Contains list items |
| `task_list` | Yes | Contains task items |
| `blockquote` | Yes | Quote block |
| `code_block` | Yes | Text code, optional language |
| `panel` | Yes | Info/note/success/warning/error/custom |
| `divider` | Yes | Horizontal rule |
| `table` | Yes | Basic rows/cells |
| `expand` | Yes | Collapsible section |
| `media` | Yes | Host-owned asset reference |
| `embed` | Later | External embed placeholder, optional after v1 |
| `link_card` | Later | Rich link preview, optional after v1 |
| `unsupported` | Yes | Safe fallback for unknown nodes |

### Inline nodes / marks

Prefer marks for simple formatting.

| Type | Required v1 | Implementation |
|---|---:|---|
| Bold | Yes | Mark |
| Italic | Yes | Mark |
| Underline | Yes | Mark |
| Strike | Yes | Mark |
| Inline code | Yes | Mark |
| Link | Yes | Mark with attrs |
| Text color | Later | Mark |
| Highlight | Later | Mark |
| Emoji | Later | Inline node |
| Date | Later | Inline node |
| Mention | No | Explicitly excluded from v1 |

### Mark example

```js
{
  type: 'text',
  text: 'important',
  marks: [
    { type: 'bold', attrs: {} },
    { type: 'link', attrs: { kind: 'external_url', href: 'https://example.com' } }
  ]
}
```

---

## 9. Required Block Schemas

### 9.1 Paragraph

```js
{
  id: 'block_1',
  type: 'paragraph',
  attrs: {},
  content: []
}
```

### 9.2 Heading

```js
{
  id: 'block_2',
  type: 'heading',
  attrs: { level: 2 },
  content: [
    { type: 'text', text: 'Overview', marks: [] }
  ]
}
```

Valid heading levels:

```txt
1
2
3
4
```

### 9.3 List

```js
{
  id: 'block_list_1',
  type: 'bullet_list',
  attrs: {},
  content: [
    {
      id: 'item_1',
      type: 'list_item',
      attrs: {},
      content: [
        {
          id: 'para_1',
          type: 'paragraph',
          attrs: {},
          content: [{ type: 'text', text: 'First item', marks: [] }]
        }
      ]
    }
  ]
}
```

### 9.4 Task list

```js
{
  id: 'task_list_1',
  type: 'task_list',
  attrs: {},
  content: [
    {
      id: 'task_item_1',
      type: 'task_item',
      attrs: { checked: false },
      content: [
        {
          id: 'task_para_1',
          type: 'paragraph',
          attrs: {},
          content: [{ type: 'text', text: 'Review policy', marks: [] }]
        }
      ]
    }
  ]
}
```

### 9.5 Code block

```js
{
  id: 'code_1',
  type: 'code_block',
  attrs: {
    language: 'javascript'
  },
  content: [
    {
      type: 'text',
      text: 'console.log("hello");',
      marks: []
    }
  ]
}
```

Rules:

- Code blocks do not allow rich inline marks.
- Slash menu should not open inside code blocks.
- Viewer mode should show a copy button.

### 9.6 Panel

```js
{
  id: 'panel_1',
  type: 'panel',
  attrs: {
    variant: 'info',
    title: null
  },
  content: [
    {
      id: 'panel_para_1',
      type: 'paragraph',
      attrs: {},
      content: []
    }
  ]
}
```

Valid variants:

```txt
info
note
success
warning
error
custom
```

### 9.7 Divider

```js
{
  id: 'divider_1',
  type: 'divider',
  attrs: {},
  content: []
}
```

### 9.8 Expand

```js
{
  id: 'expand_1',
  type: 'expand',
  attrs: {
    title: 'More details',
    defaultOpen: false
  },
  content: [
    {
      id: 'expand_para_1',
      type: 'paragraph',
      attrs: {},
      content: []
    }
  ]
}
```

### 9.9 Table

```js
{
  id: 'table_1',
  type: 'table',
  attrs: {
    headerRow: true,
    headerColumn: false
  },
  content: [
    {
      id: 'row_1',
      type: 'table_row',
      attrs: {},
      content: [
        {
          id: 'cell_1',
          type: 'table_cell',
          attrs: {},
          content: [
            {
              id: 'cell_para_1',
              type: 'paragraph',
              attrs: {},
              content: [{ type: 'text', text: 'Name', marks: [] }]
            }
          ]
        }
      ]
    }
  ]
}
```

V1 table requirements:

- Insert table with default dimensions.
- Add row.
- Delete row.
- Add column.
- Delete column.
- Toggle header row.
- Toggle header column.
- Edit text inside cells.
- Use Tab and Shift+Tab to navigate cells.

Not required in first pass:

- Cell merge/split.
- Column resizing.
- Cell background color.
- Table sorting.
- Complex nested rich blocks inside cells beyond paragraph text.

### 9.10 Media

Media is a host-owned asset reference. Stella Editor does not store, upload, quota, sign, or delete files directly.

```js
{
  id: 'media_1',
  type: 'media',
  attrs: {
    assetId: 'asset_123',
    kind: 'image',
    alt: '',
    caption: '',
    width: 'full'
  },
  content: []
}
```

Valid `kind` values:

```txt
image
file
video
audio
unknown
```

The host app resolves `assetId` through the asset adapter.

---

## 10. Host Context and Adapters

Stella Editor must be host-agnostic. The host app provides context and adapters.

### Host context example

```js
const context = {
  app: 'elite-recall',
  documentId: 'doc_123',
  userId: 'user_456',
  tenantId: 'tenant_789',
  workspaceId: null,
  mode: 'edit'
};
```

Stella Editor may pass this context to adapters, but it must not inspect app-specific fields except for generic existence checks.

### Adapter object

```js
const adapters = {
  permissions,
  scope,
  links,
  assets,
  autocomplete
};
```

If an adapter is missing, Stella Editor must fail safely.

Default rule:

```txt
Read/render actions may proceed with safe fallbacks.
Write, upload, internal link, and privileged actions fail closed.
```

---

## 11. Permissions Adapter

The host app owns permissions.

Stella Editor asks what the user may do. It does not decide.

```js
const permissions = {
  canEditDocument(context) {},
  canInsertBlock(blockType, context) {},
  canUseFormatting(formatType, context) {},
  canUploadAsset(assetKind, context) {},
  canLinkToTarget(target, context) {},
  canExport(format, context) {}
};
```

Return shape:

```js
{ allowed: true }
```

Denied return shape:

```js
{
  allowed: false,
  reason: 'Uploads are not enabled for this workspace.'
}
```

UI behavior:

- If editing is denied, render viewer mode or read-only editor mode.
- If block insertion is denied, hide or disable that command.
- If upload is denied, do not show upload UI.
- If export is denied, hide or disable export controls.
- On attempted denied action, call `onPermissionDenied` if provided.

---

## 12. Scope Adapter

The scope adapter controls internal reference boundaries.

This is critical because Elite Recall and future host apps may have tenant, workspace, product, course, or document visibility rules.

```js
const scope = {
  getCurrentScope(context) {},
  canResolveReference(reference, context) {},
  normalizeReference(rawReference, context) {},
  isReferenceVisible(reference, context) {}
};
```

Example scope return:

```js
{
  app: 'elite-recall',
  tenantId: 'tenant_123',
  workspaceId: 'workspace_456',
  documentId: 'doc_789',
  allowedReferenceTypes: [
    'document',
    'asset',
    'external_url'
  ]
}
```

Rules:

1. Internal links must pass through scope validation.
2. Viewer must not render internal references the host marks invisible.
3. Search/autocomplete must only show scoped results from the host.
4. Stella Editor must not invent or infer cross-tenant visibility.

---

## 13. Link Resolver Adapter

The link resolver handles internal and external links.

```js
const links = {
  searchLinkTargets(query, context) {},
  resolveLink(reference, context) {},
  getHref(reference, context) {},
  getDisplayLabel(reference, context) {},
  getPreview(reference, context) {}
};
```

Supported link kinds:

```txt
external_url
document
asset
custom_reference
```

External URL mark:

```js
{
  type: 'link',
  attrs: {
    kind: 'external_url',
    href: 'https://example.com',
    label: 'Example'
  }
}
```

Internal document link mark:

```js
{
  type: 'link',
  attrs: {
    kind: 'document',
    reference: {
      type: 'document',
      id: 'doc_123'
    },
    href: null,
    label: 'Training Policy'
  }
}
```

Rules:

- Do not render `javascript:` URLs.
- Do not render unknown protocols unless explicitly allowed by the host.
- Internal links should store references, not hard-coded app URLs.
- Viewer resolves display hrefs through the host link adapter.

---

## 14. Asset Adapter

The asset adapter handles all file/media actions.

Stella Editor never owns files.

```js
const assets = {
  canUpload(assetKind, context) {},
  pickAsset(options, context) {},
  uploadAsset(file, options, context) {},
  resolveAsset(assetId, context) {},
  getAssetPreview(assetId, context) {},
  removeAssetReference(assetId, context) {}
};
```

Upload flow:

```txt
User drops/pastes/selects file
Editor asks permissions.canUploadAsset()
Editor asks assets.canUpload()
Editor calls assets.uploadAsset()
Host validates quota/storage/security
Host returns asset reference
Editor inserts media block with assetId
```

Example upload result:

```js
{
  assetId: 'asset_123',
  kind: 'image',
  filename: 'diagram.png',
  mimeType: 'image/png',
  width: 1200,
  height: 800
}
```

Document stores only:

```js
{ assetId: 'asset_123' }
```

Do not store signed URLs in the document unless the host explicitly chooses that strategy.

---

## 15. Autocomplete Adapter

Autocomplete supports slash commands, link search, and asset search.

```js
const autocomplete = {
  searchCommands(query, context) {},
  searchReferences(query, context) {},
  searchAssets(query, context) {}
};
```

The editor has built-in commands. The host may append command suggestions later, but application-specific custom blocks are not v1.

---

## 16. Editor UX Requirements

### Overall feel

The editor should feel like a rich page canvas.

It should not feel like:

- A Markdown textarea
- A code editor
- A form field
- A generic contenteditable div with a toolbar bolted on

### Required v1 UX

- Page-like editing surface
- Placeholder text in empty document
- Block hover controls
- Slash command menu
- Floating inline toolbar
- Link popover
- Block insertion menu
- Basic block move up/down
- Keyboard shortcuts
- Undo/redo
- Read-only mode
- Viewer mode
- Light/dark theme support

---

## 17. Slash Menu

Typing `/` in an editable text block opens the slash menu.

Default commands:

```txt
Text
Heading 1
Heading 2
Heading 3
Heading 4
Bullet list
Numbered list
Task list
Quote
Code block
Info panel
Note panel
Success panel
Warning panel
Error panel
Divider
Table
Expand
Image/media
```

Behavior requirements:

- Filter commands as user types.
- Keyboard navigation with ArrowUp/ArrowDown.
- Select with Enter.
- Close with Escape.
- Close when selection moves away.
- Replace the slash query text with the inserted block.
- If current paragraph is empty, replace the paragraph with the selected block where appropriate.
- Do not open inside code blocks.
- Do not show commands denied by permissions adapter.

---

## 18. Inline Toolbar

Selecting text opens a floating toolbar.

Required actions:

```txt
Bold
Italic
Underline
Strike
Inline code
Link
Clear formatting
```

Behavior requirements:

- Toolbar appears near selection.
- Toolbar does not appear in read-only mode.
- Toolbar does not appear inside code blocks except for copy/select behavior.
- Buttons reflect active mark state.
- Link button opens link popover.

---

## 19. Block Toolbar / Plus Menu

Each block should expose hover controls similar to Confluence-style block editing.

Required v1 controls:

```txt
Insert block above
Insert block below
Move block up
Move block down
Duplicate block
Delete block
Change block type
```

Drag-and-drop block reordering can be deferred to v1.1.

---

## 20. Keyboard Shortcuts

Required shortcuts:

```txt
Mod+B          Toggle bold
Mod+I          Toggle italic
Mod+U          Toggle underline
Mod+K          Open link popover
Mod+Z          Undo
Mod+Shift+Z    Redo
/              Open slash menu
Escape         Close active popover/menu
Enter          Split block or select menu item
Backspace      Merge/delete block when at start
Tab            Indent list item or move table cell
Shift+Tab      Outdent list item or move previous table cell
```

Where `Mod` means Command on macOS and Control on Windows/Linux.

---

## 21. Editing Engine Architecture

The editor should be organized around a command/transform model.

```txt
DOM/input layer
Selection interpreter
Command dispatcher
Document transform layer
Normalizer
History manager
Renderer
Exporters
Adapters
```

### Source of truth rule

The canonical StellaDoc JSON is the source of truth.

The DOM is an editing projection, not the persistence model.

### Command pattern

All edits should go through commands.

Example command API:

```js
editor.commands.toggleMark('bold');
editor.commands.setBlockType(blockId, 'heading', { level: 2 });
editor.commands.insertBlockAfter(blockId, createPanelBlock({ variant: 'info' }));
editor.commands.deleteBlock(blockId);
editor.commands.insertTable({ rows: 3, cols: 3 });
editor.commands.addTableRow(tableId, rowIndex);
editor.commands.addTableColumn(tableId, colIndex);
```

Core command function shape:

```js
function applyCommand(doc, selection, command) {
  return {
    doc: nextDoc,
    selection: nextSelection,
    meta: {
      reason: command.type,
      changed: true
    }
  };
}
```

### Transform rules

- Transforms should be pure functions where practical.
- Transforms should not mutate the original doc object unless explicitly documented.
- Every transform should return normalized output or be followed by normalization.
- Invalid commands should return the original doc with an error meta object, not crash the editor.

---

## 22. Normalization Rules

The document must always be valid after normalization.

Required rules:

1. Root must be `{ type: 'doc', version: 1 }`.
2. Root content must be an array.
3. Root content must contain at least one block.
4. Every block must have a stable `id`.
5. Text nodes cannot exist directly under root.
6. Inline marks must be known or stripped.
7. Unknown blocks become `unsupported` blocks.
8. Panels must contain at least one paragraph.
9. Expands must contain at least one paragraph.
10. Tables must contain at least one row.
11. Table rows must contain at least one cell.
12. Table cells must contain at least one paragraph.
13. Media blocks without `assetId` should render as unresolved media placeholders.
14. Links with unsafe hrefs should be stripped or marked invalid.

Unsupported block fallback:

```js
{
  id: 'unsupported_1',
  type: 'unsupported',
  attrs: {
    originalType: 'legacy_widget',
    originalAttrs: {}
  },
  content: []
}
```

---

## 23. Viewer Requirements

`StellaViewer` must be a separate read-only rendering component.

Viewer must:

- Render the same StellaDoc model as the editor.
- Use the same block renderers where safe.
- Resolve internal links through the link adapter.
- Resolve assets through the asset adapter.
- Respect scope visibility checks.
- Render code blocks with copy button.
- Render expand sections as collapsible details.
- Render unsupported blocks safely.
- Never execute raw HTML from document content.
- Avoid editing affordances.

The viewer is important because host apps need to display documents as native content, not as an editor iframe or Markdown blob.

---

## 24. Styling and Theme Integration

Stella Editor should ship default CSS, but it must inherit host aesthetics through CSS variables.

Use semantic variables:

```css
.stella-editor,
.stella-viewer {
  --se-bg: var(--color-surface, #ffffff);
  --se-text: var(--color-text, #111827);
  --se-muted: var(--color-muted, #6b7280);
  --se-border: var(--color-border, #e5e7eb);
  --se-accent: var(--color-accent, #2563eb);
  --se-panel-info-bg: var(--color-info-soft, #eff6ff);
  --se-panel-warning-bg: var(--color-warning-soft, #fffbeb);
  --se-panel-error-bg: var(--color-error-soft, #fef2f2);
  --se-code-bg: var(--color-code-bg, #f3f4f6);
}
```

Rules:

- Do not hard-code Elite Recall theme values directly in core editor components.
- Do not require Tailwind classes inside core rendering logic.
- It is acceptable to use class names that Elite Recall can style.
- Avoid global CSS leakage.
- Support light and dark themes.

---

## 25. Security Requirements

Document content is untrusted.

Required protections:

- Never render raw HTML from document JSON.
- Sanitize pasted HTML before converting it to StellaDoc.
- Strip script tags.
- Strip event-handler attributes.
- Strip dangerous URLs such as `javascript:`.
- Strip unknown attributes from pasted HTML.
- Treat unknown blocks as unsupported, not executable.
- Route assets through asset adapter.
- Route internal links through scope/link adapters.
- Do not put untrusted HTML into `dangerouslySetInnerHTML`.

Disallowed output examples:

```html
<script>alert(1)</script>
<img src="x" onerror="alert(1)">
<a href="javascript:alert(1)">Click</a>
```

These must not survive paste/import/render.

---

## 26. Import and Export

### Export formats required in v1

```txt
Markdown
HTML
Plain text
```

### Markdown export rules

Markdown export is lossy and acceptable.

Mapping:

| Stella block | Markdown output |
|---|---|
| Paragraph | Plain paragraph |
| Heading | `#`, `##`, etc. |
| Bullet list | `- item` |
| Ordered list | `1. item` |
| Task list | `- [ ]` / `- [x]` |
| Quote | `>` blockquote |
| Code block | fenced code block |
| Divider | `---` |
| Panel | admonition-like block or blockquote fallback |
| Expand | heading/details fallback |
| Table | Markdown table when simple |
| Media | image/link if host resolver provides URL |
| Internal link | resolved URL if host provides one; otherwise label fallback |

### HTML export rules

HTML export should be more faithful than Markdown.

Exporter should accept resolver hooks:

```js
exportHtml(doc, {
  resolveAssetUrl(assetId) {},
  resolveLinkHref(reference) {}
});
```

HTML export must sanitize generated output and should not include executable scripts.

### Plain text extraction

Plain text extraction is used for search indexing and previews.

```js
extractText(doc)
```

Output should include readable text from:

- Headings
- Paragraphs
- List items
- Task items
- Panels
- Table cells
- Expand titles/content
- Code blocks, unless configured otherwise
- Media captions and alt text

---

## 27. Paste Handling

Supported paste inputs:

```txt
Plain text
Basic rich HTML
Links
Markdown-ish shortcuts
Tables copied from spreadsheets
Images/files through asset adapter
```

Paste behavior:

- Plain text becomes paragraphs.
- Sanitized HTML converts to known StellaDoc nodes.
- Unknown HTML converts to plain text.
- Spreadsheet-style tabular paste should create a table when reasonable.
- Image/file paste asks permissions and asset adapters first.
- If upload is denied, do not insert the file.
- If paste includes unsafe links, strip or neutralize them.

---

## 28. Autosave and Persistence Contract

Stella Editor does not save documents directly.

The host app owns persistence.

Editor emits changes:

```js
onChange(nextDoc, {
  reason: 'insert_block',
  dirty: true,
  changedAt: '2026-05-11T00:00:00.000Z',
  selection: nextSelection
});
```

Host app decides:

- Whether to autosave.
- When to save.
- Where to save.
- Whether to keep draft/published states.
- Whether to create versions.
- Whether the current user may save.

---

## 29. Initial Elite Recall Integration Pattern

Although Stella Editor is host-agnostic, the first integration will likely occur inside Elite Recall.

Recommended integration shape:

```txt
Elite Recall document feature/page
  loads document record
  maps DB content_json to StellaDoc
  passes host context and adapters to StellaEditor
  receives onChange events
  autosaves through Elite Recall API
  displays published/read-only content through StellaViewer
```

Recommended persistence shape in the host app, not inside Stella Editor:

```txt
document.content_json       Canonical StellaDoc JSON
document.content_text       Extracted plain text for search
document.content_markdown   Optional generated export/cache only
document.updated_at         Host-owned timestamp
```

Do not make Stella Editor assume these exact database fields.

---

## 30. V1 Feature Checklist

### Required for v1

- [ ] `StellaEditor` component
- [ ] `StellaViewer` component
- [ ] StellaDoc v1 schema
- [ ] `createEmptyDocument()`
- [ ] `normalizeDocument()`
- [ ] `validateDocument()`
- [ ] Paragraph block
- [ ] Heading block
- [ ] Bullet list
- [ ] Ordered list
- [ ] Task list
- [ ] Blockquote
- [ ] Code block
- [ ] Panel/callout
- [ ] Divider
- [ ] Expand block
- [ ] Basic table block
- [ ] Media placeholder block
- [ ] Inline bold
- [ ] Inline italic
- [ ] Inline underline
- [ ] Inline strike
- [ ] Inline code
- [ ] Link mark
- [ ] External URL handling
- [ ] Internal link reference handling
- [ ] Slash command menu
- [ ] Inline toolbar
- [ ] Link popover
- [ ] Block toolbar/plus controls
- [ ] Undo/redo
- [ ] Keyboard shortcuts
- [ ] Paste sanitization
- [ ] Markdown export
- [ ] HTML export
- [ ] Plain text extraction
- [ ] Permission adapter
- [ ] Scope adapter
- [ ] Link resolver adapter
- [ ] Asset adapter
- [ ] Theme-friendly CSS
- [ ] Unit tests
- [ ] Component smoke tests

### Explicitly not required for v1

- [ ] Real-time collaborative editing
- [ ] Comments
- [ ] Mentions
- [ ] App-specific custom blocks
- [ ] Page tree
- [ ] Backend document API
- [ ] Database migration
- [ ] File storage implementation
- [ ] Drag-and-drop block reordering
- [ ] Cell merge/split in tables
- [ ] Markdown compatibility wrapper
- [ ] MDX rendering/importing

---

## 31. Implementation Phases

### Phase 0 — Remove MDXEditor assumption from the plan

Goal: make sure the code path and design are StellaDoc-first.

Tasks:

- [ ] Create `/web/src/stella-editor/` module.
- [ ] Export placeholder `StellaEditor` and `StellaViewer`.
- [ ] Confirm no new MDXEditor implementation work is added.
- [ ] Add this spec or a summary to the project docs.

Acceptance:

- The project can import from `stella-editor`.
- There is no architectural dependency on Markdown as the editor state.

### Phase 1 — Core schema, normalization, validation, viewer

Tasks:

- [ ] Implement schema constants.
- [ ] Implement ID helpers.
- [ ] Implement `createEmptyDocument()`.
- [ ] Implement block factory helpers.
- [ ] Implement `normalizeDocument()`.
- [ ] Implement `validateDocument()`.
- [ ] Implement `extractText()`.
- [ ] Implement `StellaViewer` for paragraph, heading, lists, quote, code, panel, divider, expand, table, media placeholder, unsupported.

Acceptance:

- Valid StellaDoc renders in viewer.
- Invalid/partial StellaDoc normalizes safely.
- Unknown blocks do not crash viewer.

### Phase 2 — Basic editable canvas

Tasks:

- [ ] Implement `StellaEditor` shell.
- [ ] Implement editable paragraph and heading blocks.
- [ ] Implement text editing events.
- [ ] Implement selection tracking sufficient for basic editing.
- [ ] Implement `onChange` emission.
- [ ] Implement basic undo/redo stack.
- [ ] Implement read-only mode.

Acceptance:

- User can type in a blank document.
- User can edit paragraph text.
- User can edit heading text.
- `onChange` receives normalized StellaDoc.
- Undo/redo works for basic text edits.

### Phase 3 — Inline formatting and links

Tasks:

- [ ] Implement mark toggling.
- [ ] Implement inline toolbar.
- [ ] Implement keyboard shortcuts for marks.
- [ ] Implement link popover.
- [ ] Implement safe external URL insertion.
- [ ] Implement internal link insertion through adapters.

Acceptance:

- Bold/italic/underline/strike/inline code can be applied and removed.
- Links render safely in viewer.
- Unsafe links are rejected or stripped.
- Internal links use adapter references.

### Phase 4 — Slash menu and block controls

Tasks:

- [ ] Implement slash menu trigger.
- [ ] Implement command filtering.
- [ ] Implement keyboard navigation in slash menu.
- [ ] Implement block insertion.
- [ ] Implement block conversion.
- [ ] Implement block toolbar/plus controls.
- [ ] Implement move up/down, duplicate, delete.

Acceptance:

- Typing `/` opens the menu.
- Selecting `Heading 2` creates a heading.
- Selecting `Info panel` creates a panel.
- Denied commands are hidden/disabled.

### Phase 5 — Rich blocks

Tasks:

- [ ] Implement lists.
- [ ] Implement task lists.
- [ ] Implement blockquote.
- [ ] Implement code block.
- [ ] Implement panels.
- [ ] Implement divider.
- [ ] Implement expand block.
- [ ] Implement basic table editing.
- [ ] Implement media placeholder insertion through asset adapter.

Acceptance:

- All required v1 blocks can be inserted, edited, normalized, rendered, and exported.

### Phase 6 — Paste/import/export hardening

Tasks:

- [ ] Implement paste sanitizer.
- [ ] Implement HTML-to-StellaDoc conversion for common elements.
- [ ] Implement table paste from spreadsheet-like content.
- [ ] Implement Markdown export.
- [ ] Implement HTML export.
- [ ] Harden plain text extraction.

Acceptance:

- Unsafe pasted content is neutralized.
- Common rich text paste produces valid StellaDoc.
- Export tests pass.

### Phase 7 — Final polish and integration readiness

Tasks:

- [ ] Theme polish.
- [ ] Accessibility pass.
- [ ] Keyboard regression tests.
- [ ] Empty state polish.
- [ ] Error boundaries.
- [ ] Viewer/editor parity check.
- [ ] Integration example component.

Acceptance:

- Editor can be embedded in Elite Recall without looking bolted on.
- Viewer can display saved content cleanly.
- Tests pass.
- No MDXEditor dependency is required.

---

## 32. Red/Green Test Plan

Use this section as a direct test-writing guide.

If the project does not already have a frontend test stack, add a minimal one appropriate for Vite:

```txt
vitest
@testing-library/react
@testing-library/jest-dom
jsdom
```

Do not add a large E2E stack in the first pass unless the project already uses one.

### 32.1 Schema tests

File:

```txt
/web/src/stella-editor/__tests__/schema.test.js
```

#### RED: empty document factory is missing

Test:

```js
it('creates a valid empty StellaDoc', () => {
  const doc = createEmptyDocument();
  expect(doc.version).toBe(1);
  expect(doc.type).toBe('doc');
  expect(Array.isArray(doc.content)).toBe(true);
  expect(doc.content).toHaveLength(1);
  expect(doc.content[0].type).toBe('paragraph');
});
```

#### GREEN criteria

- `createEmptyDocument()` returns a normalized doc.
- First block is an empty paragraph.
- IDs are stable strings.

---

### 32.2 Normalization tests

File:

```txt
/web/src/stella-editor/__tests__/normalize.test.js
```

Test cases:

```js
it('adds an empty paragraph to an empty doc', () => {});
it('adds missing block ids', () => {});
it('wraps invalid root content safely', () => {});
it('converts unknown blocks to unsupported blocks', () => {});
it('ensures panel has at least one paragraph', () => {});
it('ensures expand has at least one paragraph', () => {});
it('ensures table has at least one row and cell', () => {});
it('strips unknown marks', () => {});
it('strips unsafe link hrefs', () => {});
```

GREEN criteria:

- Normalizer never throws for malformed but object-like input.
- Normalizer produces a valid StellaDoc.
- Unknown blocks renderable as `unsupported`.

---

### 32.3 Validation tests

File:

```txt
/web/src/stella-editor/__tests__/validate.test.js
```

Test cases:

```js
it('returns no errors for a normalized empty document', () => {});
it('returns errors for invalid root type', () => {});
it('returns warnings for unsupported blocks', () => {});
it('returns errors for table rows without cells', () => {});
it('returns errors for unsafe external links', () => {});
```

GREEN criteria:

- Validation returns structured results:

```js
{
  valid: false,
  errors: [],
  warnings: []
}
```

---

### 32.4 Command tests

File:

```txt
/web/src/stella-editor/__tests__/commands.test.js
```

Test cases:

```js
it('toggles bold mark on selected text', () => {});
it('sets paragraph block to heading level 2', () => {});
it('inserts a panel after the current block', () => {});
it('deletes a block but leaves at least one paragraph', () => {});
it('moves a block up', () => {});
it('moves a block down', () => {});
it('duplicates a block with new ids', () => {});
it('inserts a 3x3 table', () => {});
it('adds and removes table rows', () => {});
it('adds and removes table columns', () => {});
```

GREEN criteria:

- Every command returns normalized document output.
- Commands do not mutate the original input doc unexpectedly.
- Deleting the last block leaves a valid empty paragraph.

---

### 32.5 Adapter tests

File:

```txt
/web/src/stella-editor/__tests__/adapters.test.js
```

Test cases:

```js
it('fails closed for upload when no asset adapter exists', () => {});
it('fails closed for internal links when no scope adapter exists', () => {});
it('allows read-only rendering without permissions adapter', () => {});
it('hides denied slash commands', () => {});
it('does not insert media when upload permission is denied', () => {});
it('does not insert internal link when scope denies reference', () => {});
```

GREEN criteria:

- Missing adapters do not crash the editor/viewer.
- Privileged operations fail closed.
- Viewer has safe fallbacks.

---

### 32.6 Sanitization tests

File:

```txt
/web/src/stella-editor/__tests__/sanitizePaste.test.js
```

Test cases:

```js
it('removes script tags from pasted HTML', () => {});
it('removes event handler attributes', () => {});
it('removes javascript hrefs', () => {});
it('preserves safe paragraphs and headings', () => {});
it('converts simple pasted tables into table blocks', () => {});
it('converts unknown HTML into safe text', () => {});
```

Input examples:

```html
<script>alert(1)</script><p>Hello</p>
<img src="x" onerror="alert(1)">
<a href="javascript:alert(1)">Bad</a>
```

GREEN criteria:

- No script/event-handler/dangerous URL survives.
- Safe text survives.
- Output is normalized StellaDoc or safe fragment nodes.

---

### 32.7 Viewer tests

File:

```txt
/web/src/stella-editor/__tests__/viewer.test.jsx
```

Test cases:

```js
it('renders paragraph and heading text', () => {});
it('renders panels with variant class names', () => {});
it('renders code blocks without executing content', () => {});
it('renders expand blocks collapsed by default', () => {});
it('renders table cells', () => {});
it('renders unsupported blocks safely', () => {});
it('resolves asset previews through asset adapter', () => {});
it('does not render invisible scoped references', () => {});
it('does not render unsafe external hrefs', () => {});
```

GREEN criteria:

- Viewer renders valid content.
- Viewer does not crash on unsupported content.
- Viewer does not expose unsafe links.

---

### 32.8 Editor smoke tests

File:

```txt
/web/src/stella-editor/__tests__/editor-smoke.test.jsx
```

Test cases:

```js
it('renders an editable empty document', () => {});
it('calls onChange when text is edited', () => {});
it('opens slash menu when slash is typed', () => {});
it('inserts a heading from the slash menu', () => {});
it('opens inline toolbar when text is selected', () => {});
it('opens link popover for Mod+K', () => {});
it('respects readOnly mode', () => {});
```

GREEN criteria:

- Basic editor flow works in jsdom/component tests.
- Read-only mode does not emit content-changing events.

---

### 32.9 Export tests

File:

```txt
/web/src/stella-editor/__tests__/exportMarkdown.test.js
/web/src/stella-editor/__tests__/exportHtml.test.js
/web/src/stella-editor/__tests__/extractText.test.js
```

Markdown tests:

```js
it('exports headings as markdown headings', () => {});
it('exports bullet and ordered lists', () => {});
it('exports task lists', () => {});
it('exports code blocks as fenced code', () => {});
it('exports simple tables', () => {});
it('exports panels with safe fallback syntax', () => {});
it('does not include raw unsafe HTML', () => {});
```

HTML tests:

```js
it('exports paragraphs and headings', () => {});
it('exports panels with semantic classes', () => {});
it('exports expand blocks as details/summary', () => {});
it('exports links with safe hrefs', () => {});
it('does not export script tags', () => {});
```

Plain text tests:

```js
it('extracts readable text from all standard blocks', () => {});
it('includes media alt text and captions', () => {});
it('includes table cell text', () => {});
it('does not include unsupported raw JSON', () => {});
```

---

## 33. Manual Validation Checklist

After automated tests pass, manually validate these flows in the browser.

### Basic editing

- [ ] Open empty editor.
- [ ] Type a paragraph.
- [ ] Add headings.
- [ ] Apply bold/italic/underline/strike.
- [ ] Add an external link.
- [ ] Remove a link.
- [ ] Undo/redo edits.

### Slash menu

- [ ] Type `/` in empty paragraph.
- [ ] Filter commands by typing.
- [ ] Insert heading.
- [ ] Insert panel.
- [ ] Insert table.
- [ ] Press Escape to close.
- [ ] Verify slash menu does not open inside code block.

### Rich blocks

- [ ] Add panel.
- [ ] Change panel variant.
- [ ] Add code block.
- [ ] Add divider.
- [ ] Add expand section.
- [ ] Add task list and toggle checkbox.
- [ ] Add table and edit cells.
- [ ] Add/remove table row.
- [ ] Add/remove table column.

### Host controls

- [ ] Deny upload permission and confirm media upload UI is hidden/disabled.
- [ ] Deny internal link scope and confirm link is not inserted.
- [ ] Provide mock asset adapter and confirm media preview renders.
- [ ] Provide mock link resolver and confirm internal link renders.

### Viewer

- [ ] Render saved document in viewer.
- [ ] Confirm viewer has no editing controls.
- [ ] Confirm expand blocks collapse/expand.
- [ ] Confirm code copy button works.
- [ ] Confirm broken media renders safe placeholder.
- [ ] Confirm unsupported block renders safe fallback.

### Theme

- [ ] Check light mode.
- [ ] Check dark mode.
- [ ] Confirm editor inherits host font and colors.
- [ ] Confirm no obvious global CSS leakage.

### Security

- [ ] Paste `<script>alert(1)</script>` and confirm it is stripped.
- [ ] Paste `<img onerror="alert(1)">` and confirm handler is stripped.
- [ ] Insert `javascript:alert(1)` link and confirm it is rejected/neutralized.

---

## 34. Definition of Done for Stella Editor v1

Stella Editor v1 is complete when:

1. The host app can import `StellaEditor` and `StellaViewer`.
2. The editor accepts and emits StellaDoc JSON.
3. Markdown is not used as internal state.
4. The editor supports the required v1 blocks and marks.
5. The viewer renders the same document model safely.
6. Host-controlled permissions, scope, assets, and links are respected.
7. Unsafe pasted/rendered content is sanitized or rejected.
8. Markdown, HTML, and plain-text exports work.
9. The editor works in light and dark themes.
10. Automated tests pass.
11. Manual validation checklist passes.
12. No MDXEditor dependency is required.
13. The module is isolated enough to extract later.

---

## 35. Implementation Notes for the Coding Agent

### Prefer incremental commits/patches

Do not attempt to build the entire editor in one massive pass.

Preferred order:

1. Scaffolding and exports.
2. Schema and document utilities.
3. Viewer.
4. Basic editor.
5. Commands.
6. Slash/toolbar UX.
7. Rich blocks.
8. Adapters.
9. Paste/export hardening.
10. Tests and polish.

### Keep host boundaries clean

Inside `/web/src/stella-editor/`, avoid imports from app-specific modules such as Elite Recall routes, API clients, tenant utilities, billing utilities, pack utilities, or R2 helpers.

Allowed:

- React
- Local Stella Editor modules
- CSS
- Small approved utilities

Host integration should happen outside the editor module by passing props/adapters.

### Do not overbuild v1

Do not implement these unless explicitly requested later:

- Real-time collaboration
- Comment anchors
- Full drag/drop block reorder
- Nested arbitrary custom blocks
- Page tree
- Built-in backend
- File manager
- MDX runtime
- Application-specific embeds

### Preserve future extraction path

Even though the first implementation lives inside Elite Recall, write it as though it may later become:

```txt
@stella/editor-core
@stella/editor-react
```

That means:

- Clean public exports.
- No app-specific imports.
- Explicit adapters.
- JSDoc types.
- Stable schema version.
- Test coverage around schema/commands/exporters.

---

## 36. Open Questions to Defer

These should not block v1:

1. Whether Stella Editor eventually becomes open-source.
2. Whether to package it separately under `/packages`.
3. Whether to migrate to TypeScript.
4. Whether to support full Markdown import fidelity.
5. Whether to support comments.
6. Whether to support collaborative editing.
7. Whether to add application-specific custom blocks.
8. Whether to support advanced table features.

The v1 architecture should not prevent these, but it should not implement them yet.

---

## 37. Final Alignment Statement

Stella Editor is aligned if the implementation produces this outcome:

```txt
A host-agnostic, React-based, Confluence-style document editor/viewer that uses structured JSON as its source of truth and can replace MDXEditor in Elite Recall without importing MDXEditor, depending on Markdown persistence, or embedding Elite Recall-specific business logic.
```

If implementation work starts drifting toward a Markdown editor, an app-specific document feature, or a backend document system, it is out of alignment with this spec.
