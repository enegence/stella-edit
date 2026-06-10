import React, { useEffect, useRef, useState } from 'react';

export function BlockToolbar({ onAction, dragHandleProps }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    function closeOnOutsidePointer(event) {
      if (!ref.current?.contains(event.target)) setOpen(false);
    }
    function closeOnEscape(event) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('pointerdown', closeOnOutsidePointer);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePointer);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  function selectAction(action) {
    setOpen(false);
    onAction(action);
  }

  return (
    <div className="se-block-toolbar" ref={ref}>
      <button type="button" className="se-gutter-button" aria-label="Insert block below" title="Insert block below" onMouseDown={(event) => event.preventDefault()} onClick={() => selectAction('insert')}>+</button>
      <button type="button" className="se-gutter-button se-drag-handle" aria-label="Drag block" title="Drag block" {...dragHandleProps}>::</button>
      <button type="button" className="se-gutter-button" aria-label="Block options" title="Block options" aria-expanded={open} onMouseDown={(event) => event.preventDefault()} onClick={() => setOpen((value) => !value)}>...</button>
      {open ? (
        <div className="se-block-menu" role="menu">
          <button type="button" role="menuitem" onMouseDown={(event) => event.preventDefault()} onClick={() => selectAction('up')}>Move up</button>
          <button type="button" role="menuitem" onMouseDown={(event) => event.preventDefault()} onClick={() => selectAction('down')}>Move down</button>
          <button type="button" role="menuitem" onMouseDown={(event) => event.preventDefault()} onClick={() => selectAction('duplicate')}>Duplicate</button>
          <button type="button" role="menuitem" onMouseDown={(event) => event.preventDefault()} onClick={() => selectAction('delete')}>Delete</button>
        </div>
      ) : null}
    </div>
  );
}
