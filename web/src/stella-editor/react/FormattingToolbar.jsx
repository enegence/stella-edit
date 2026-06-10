import React from 'react';

export function FormattingToolbar({ blockType, headingLevel, pageWidth, onBlockType, onInsert, onQuickInsert, onLink, onUndo, onRedo, onWidthToggle }) {
  const value = blockType === 'heading' ? `heading:${headingLevel || 1}` : blockType || 'paragraph';

  return (
    <div className="se-format-toolbar" role="toolbar" aria-label="Editor page actions">
      <button type="button" aria-label="Undo" onMouseDown={(event) => event.preventDefault()} onClick={onUndo}>Undo</button>
      <button type="button" aria-label="Redo" onMouseDown={(event) => event.preventDefault()} onClick={onRedo}>Redo</button>
      <span className="se-toolbar-divider" />
      <select aria-label="Block style" value={value} onChange={(event) => onBlockType(event.target.value)}>
        <option value="paragraph">Paragraph</option>
        <option value="heading:1">Heading 1</option>
        <option value="heading:2">Heading 2</option>
        <option value="heading:3">Heading 3</option>
        <option value="heading:4">Heading 4</option>
        <option value="heading:5">Heading 5</option>
        <option value="heading:6">Heading 6</option>
        <option value="blockquote">Quote</option>
        <option value="code_block">Code</option>
      </select>
      <span className="se-toolbar-divider" />
      <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={onInsert}>Insert</button>
      <button type="button" aria-label="Link" onMouseDown={(event) => event.preventDefault()} onClick={onLink}>Link</button>
      <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => onQuickInsert({ id: 'bullet_list', type: 'bullet_list' })}>Bullet list</button>
      <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => onQuickInsert({ id: 'ordered_list', type: 'ordered_list' })}>Numbered list</button>
      <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => onQuickInsert({ id: 'table', type: 'table' })}>Table</button>
      <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => onQuickInsert({ id: 'panel_info', type: 'panel', attrs: { variant: 'info' } })}>Panel</button>
      <span className="se-toolbar-divider" />
      <button type="button" aria-label="Toggle page width" onMouseDown={(event) => event.preventDefault()} onClick={onWidthToggle}>{pageWidth === 'full' ? 'Fixed width' : 'Full width'}</button>
    </div>
  );
}
