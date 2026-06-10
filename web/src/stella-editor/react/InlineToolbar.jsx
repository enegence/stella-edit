import React from 'react';

export function InlineToolbar({ visible, position, activeMarks = [], onMark, onAlign, onClear, onLink }) {
  if (!visible) return null;
  const active = new Set(activeMarks);
  const style = position ? { left: position.left, top: Math.max(8, position.top - 48) } : undefined;
  return (
    <div className="se-inline-toolbar" role="toolbar" style={style}>
      <button type="button" aria-label="Bold" data-active={active.has('bold') || undefined} onMouseDown={(event) => event.preventDefault()} onClick={() => onMark('bold')}>B</button>
      <button type="button" aria-label="Italic" data-active={active.has('italic') || undefined} onMouseDown={(event) => event.preventDefault()} onClick={() => onMark('italic')}>I</button>
      <button type="button" aria-label="Underline" data-active={active.has('underline') || undefined} onMouseDown={(event) => event.preventDefault()} onClick={() => onMark('underline')}>U</button>
      <button type="button" aria-label="Strikethrough" data-active={active.has('strike') || undefined} onMouseDown={(event) => event.preventDefault()} onClick={() => onMark('strike')}>S</button>
      <button type="button" aria-label="Inline code" data-active={active.has('code') || undefined} onMouseDown={(event) => event.preventDefault()} onClick={() => onMark('code')}>Code</button>
      <button type="button" aria-label="Coral text color" onMouseDown={(event) => event.preventDefault()} onClick={() => onMark('color', { color: '#CC785C' })}>Color</button>
      <button type="button" aria-label="Align left" onMouseDown={(event) => event.preventDefault()} onClick={() => onAlign('left')}>Left</button>
      <button type="button" aria-label="Align center" onMouseDown={(event) => event.preventDefault()} onClick={() => onAlign('center')}>Center</button>
      <button type="button" aria-label="Align right" onMouseDown={(event) => event.preventDefault()} onClick={() => onAlign('right')}>Right</button>
      <button type="button" aria-label="Link" onMouseDown={(event) => event.preventDefault()} onClick={onLink}>Link</button>
      <button type="button" aria-label="Clear formatting" onMouseDown={(event) => event.preventDefault()} onClick={onClear}>Clear</button>
    </div>
  );
}
