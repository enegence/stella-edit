import React, { useEffect, useMemo, useState } from 'react';

// A suggestion either carries a typed `reference` (passed through to the link
// mark untouched), or a `type`/`id` pair / `href` that is submitted as text.
function suggestionKey(suggestion, index) {
  const ref = suggestion.reference;
  if (ref) return `ref:${ref.type}:${ref.id ?? JSON.stringify(ref)}:${index}`;
  return `${suggestion.type || suggestion.kind}:${suggestion.id || suggestion.href}:${index}`;
}

function suggestionLabel(suggestion) {
  return suggestion.label || suggestion.title || suggestion.href || suggestion.id || suggestion.reference?.id || '';
}

// Suggestions keep adapter order; a `group` string clusters them under a heading
// in first-seen order.
function groupSuggestions(suggestions) {
  const groups = [];
  const byName = new Map();
  suggestions.forEach((suggestion, index) => {
    const name = suggestion.group || '';
    if (!byName.has(name)) {
      const group = { name, items: [] };
      byName.set(name, group);
      groups.push(group);
    }
    byName.get(name).items.push({ suggestion, index });
  });
  return groups;
}

export function LinkPopover({ open, suggestions = [], onSearch, onSubmit, onClose }) {
  const [href, setHref] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  useEffect(() => {
    if (open) onSearch?.('');
  }, [open]);
  useEffect(() => {
    setActiveIndex(-1);
  }, [suggestions]);
  const groups = useMemo(() => groupSuggestions(suggestions), [suggestions]);
  if (!open) return null;

  function pick(suggestion) {
    if (suggestion.reference) {
      onSubmit({ reference: suggestion.reference, label: suggestionLabel(suggestion) });
    } else {
      onSubmit(suggestion.href || `${suggestion.type}:${suggestion.id}`);
    }
    setHref('');
  }

  function handleKeyDown(event) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      if (!suggestions.length) return;
      event.preventDefault();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setActiveIndex((current) => {
        if (current < 0) return step > 0 ? 0 : suggestions.length - 1;
        return (current + step + suggestions.length) % suggestions.length;
      });
    } else if (event.key === 'Enter' && activeIndex >= 0 && suggestions[activeIndex]) {
      event.preventDefault();
      pick(suggestions[activeIndex]);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      onClose?.();
    }
  }

  const listId = 'se-link-suggestions';
  return (
    <form className="se-link-popover" onSubmit={(event) => { event.preventDefault(); onSubmit(href); setHref(''); }}>
      <input
        aria-label="Link URL"
        aria-controls={suggestions.length ? listId : undefined}
        aria-activedescendant={activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined}
        value={href}
        onChange={(event) => { setHref(event.target.value); onSearch?.(event.target.value); }}
        onKeyDown={handleKeyDown}
        placeholder="Search, or paste a URL"
      />
      {suggestions.length ? (
        <div className="se-link-suggestions" id={listId} role="listbox" aria-label="Link suggestions">
          {groups.map((group) => (
            <div className="se-link-group" key={group.name || '_'} role="group" aria-label={group.name || undefined}>
              {group.name ? <div className="se-link-group-label" aria-hidden="true">{group.name}</div> : null}
              {group.items.map(({ suggestion, index }) => (
                <button
                  key={suggestionKey(suggestion, index)}
                  id={`${listId}-${index}`}
                  type="button"
                  role="option"
                  aria-selected={index === activeIndex}
                  className={index === activeIndex ? 'is-active' : undefined}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => pick(suggestion)}
                >
                  <span className="se-link-suggestion-label">{suggestionLabel(suggestion)}</span>
                  {suggestion.description ? <span className="se-link-suggestion-description">{suggestion.description}</span> : null}
                </button>
              ))}
            </div>
          ))}
        </div>
      ) : null}
      <div className="se-link-actions">
        <button type="submit">Apply</button>
        <button type="button" onClick={onClose}>Cancel</button>
      </div>
    </form>
  );
}
