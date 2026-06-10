import React, { useEffect, useState } from 'react';

export function LinkPopover({ open, suggestions = [], onSearch, onSubmit, onClose }) {
  const [href, setHref] = useState('');
  useEffect(() => {
    if (open) onSearch?.('');
  }, [open]);
  if (!open) return null;
  return (
    <form className="se-link-popover" onSubmit={(event) => { event.preventDefault(); onSubmit(href); setHref(''); }}>
      <input aria-label="Link URL" value={href} onChange={(event) => { setHref(event.target.value); onSearch?.(event.target.value); }} placeholder="https://example.com or document:doc_123" />
      {suggestions.length ? (
        <div className="se-link-suggestions">
          {suggestions.map((suggestion) => (
            <button key={`${suggestion.type || suggestion.kind}:${suggestion.id || suggestion.href}`} type="button" onClick={() => {
              onSubmit(suggestion.href || `${suggestion.type}:${suggestion.id}`);
              setHref('');
            }}>{suggestion.label || suggestion.title || suggestion.href || suggestion.id}</button>
          ))}
        </div>
      ) : null}
      <button type="submit">Apply</button>
      <button type="button" onClick={onClose}>Cancel</button>
    </form>
  );
}
